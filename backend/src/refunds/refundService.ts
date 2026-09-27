import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

import { type AiReview, type RefundAiService } from "../ai/refundAiService.js";
import {
  evaluateRefundPolicy,
  type PolicyRule,
  type RefundDecision,
  type RefundReason,
} from "../policy/refundPolicy.js";

export interface RefundRequestInput {
  orderNumber: string;
  email: string;
  reason: RefundReason;
  details: string;
}

export interface ProcessedRefundRequest {
  id: string;
  decision: RefundDecision;
  triggeredRules: PolicyRule[];
  explanation: string;
  aiAssistance: {
    source: AiReview["source"];
    reasonCategory: AiReview["reasonCategory"];
  };
  createdAt: string;
}

export class DuplicateRefundRequestError extends Error {
  constructor() {
    super("A refund request for this order was submitted recently.");
  }
}

interface StoredOrder {
  id: string;
  customer_id: string;
  customer_email: string;
  purchased_at: string;
  total_amount_cents: number;
  has_final_sale_item: number;
}

function containsSuspiciousInstruction(details: string): boolean {
  // Escalate direct attempts to override policy before any AI integration.
  return /(ignore (?:all )?(?:previous )?(instructions|rules|policy)|bypass (the )?policy|reveal (the )?(system |hidden )?prompt|system prompt)/i.test(details);
}

function createExplanation(decision: RefundDecision, rules: PolicyRule[]): string {
  const rule = rules[0];

  if (decision === "APPROVED") return "Your request meets the refund policy and has been approved.";
  if (rule === "FINAL_SALE_ITEM") return "This order contains a final-sale item, which is not eligible for a refund.";
  if (rule === "OUTSIDE_REFUND_WINDOW") return "This order is outside the refund eligibility window.";
  if (rule === "REASON_NOT_ELIGIBLE") return "This request does not meet the refund policy eligibility criteria.";
  return "Your request needs review by a support specialist before a final outcome can be confirmed.";
}

function findOrder(database: Database.Database, orderNumber: string): StoredOrder | undefined {
  // Bind customer input as a parameter instead of interpolating it into SQL.
  return database
    .prepare(
      `SELECT orders.id, orders.customer_id, customers.email AS customer_email, orders.purchased_at,
        orders.total_amount_cents, MAX(order_items.is_final_sale) AS has_final_sale_item
       FROM orders
       JOIN customers ON customers.id = orders.customer_id
       JOIN order_items ON order_items.order_id = orders.id
       WHERE orders.order_number = ?
       GROUP BY orders.id`,
    )
    .get(orderNumber) as StoredOrder | undefined;
}

function hasRecentDuplicate(
  database: Database.Database,
  orderId: string,
  email: string,
  now: Date,
): boolean {
  const cutoff = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const match = database
    .prepare(
      "SELECT id FROM refund_requests WHERE order_id = ? AND request_email = ? AND created_at >= ? LIMIT 1",
    )
    .get(orderId, email, cutoff);

  return Boolean(match);
}

function shouldUseAi(
  order: StoredOrder | undefined,
  email: string,
  isSuspicious: boolean,
  preliminaryDecision: RefundDecision,
): boolean {
  return Boolean(order && order.customer_email === email && !isSuspicious && preliminaryDecision !== "DENIED");
}

export async function processRefundRequest(
  database: Database.Database,
  input: RefundRequestInput,
  aiService: RefundAiService,
  now = new Date(),
): Promise<ProcessedRefundRequest> {
  const order = findOrder(database, input.orderNumber);

  if (order && hasRecentDuplicate(database, order.id, input.email, now)) {
    throw new DuplicateRefundRequestError();
  }

  const directSuspicion = containsSuspiciousInstruction(input.details);
  const preliminaryResult = evaluateRefundPolicy({
    order: order
      ? {
          purchasedAt: new Date(order.purchased_at),
          refundAmountCents: order.total_amount_cents,
          hasFinalSaleItem: Boolean(order.has_final_sale_item),
        }
      : undefined,
    emailMatchesOrder: order?.customer_email === input.email,
    reason: input.reason,
    isSuspiciousOrConflicting: directSuspicion,
    requestedAt: now,
  });
  const aiReview = shouldUseAi(order, input.email, directSuspicion, preliminaryResult.decision)
    ? await aiService.review({ reason: input.reason, details: input.details })
    : {
        reasonCategory: input.reason,
        suspicionFlags: [],
        analystSummary: "AI review skipped because the request was already unsafe or unverifiable.",
        source: "FALLBACK" as const,
      };

  // The deterministic policy is authoritative for every decision.
  const result = evaluateRefundPolicy({
    order: order
      ? {
          purchasedAt: new Date(order.purchased_at),
          refundAmountCents: order.total_amount_cents,
          hasFinalSaleItem: Boolean(order.has_final_sale_item),
        }
      : undefined,
    emailMatchesOrder: order?.customer_email === input.email,
    reason: input.reason,
    isSuspiciousOrConflicting: directSuspicion || aiReview.suspicionFlags.length > 0,
    requestedAt: now,
  });
  const createdAt = now.toISOString();
  const request: ProcessedRefundRequest = {
    id: randomUUID(),
    decision: result.decision,
    triggeredRules: result.triggeredRules,
    explanation: createExplanation(result.decision, result.triggeredRules),
    aiAssistance: { source: aiReview.source, reasonCategory: aiReview.reasonCategory },
    createdAt,
  };
  // Save the customer result and audit evidence as one database transaction.
  const save = database.transaction(() => {
    database
      .prepare(
        "INSERT INTO refund_requests (id, customer_id, order_id, request_email, reason, details, decision, decision_explanation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        request.id,
        order?.customer_id ?? null,
        order?.id ?? null,
        input.email,
        input.reason,
        input.details,
        request.decision,
        request.explanation,
        createdAt,
      );
    database
      .prepare(
        "INSERT INTO refund_audit_logs (id, refund_request_id, triggered_rules_json, ai_reason_category, ai_suspicion_flags_json, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        randomUUID(),
        request.id,
        JSON.stringify(request.triggeredRules),
        aiReview.reasonCategory,
        JSON.stringify(aiReview.suspicionFlags),
        `${aiReview.source}: ${aiReview.analystSummary}`,
        createdAt,
      );
  });

  save();
  return request;
}

export function listRefundRequests(database: Database.Database): unknown[] {
  return database
    .prepare(
      `SELECT refund_requests.id, refund_requests.request_email, refund_requests.reason,
        refund_requests.decision, refund_requests.decision_explanation, refund_requests.created_at,
        orders.order_number
       FROM refund_requests
       LEFT JOIN orders ON orders.id = refund_requests.order_id
       ORDER BY refund_requests.created_at DESC`,
    )
    .all();
}

export function getRefundRequest(database: Database.Database, id: string): unknown {
  const request = database
    .prepare(
      `SELECT refund_requests.id, refund_requests.request_email, refund_requests.reason,
        refund_requests.details, refund_requests.decision, refund_requests.decision_explanation,
        refund_requests.created_at, orders.order_number, customers.full_name AS customer_name,
        refund_audit_logs.triggered_rules_json, refund_audit_logs.ai_reason_category,
        refund_audit_logs.ai_suspicion_flags_json, refund_audit_logs.note
       FROM refund_requests
       LEFT JOIN orders ON orders.id = refund_requests.order_id
       LEFT JOIN customers ON customers.id = refund_requests.customer_id
       LEFT JOIN refund_audit_logs ON refund_audit_logs.refund_request_id = refund_requests.id
       WHERE refund_requests.id = ?`,
    )
    .get(id);

  return request;
}
