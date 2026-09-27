/** Pure policy logic with no HTTP, database, or AI dependencies. */

export const REFUND_WINDOW_DAYS = 30;
export const HUMAN_REVIEW_THRESHOLD_CENTS = 50_000;

export type RefundDecision = "APPROVED" | "DENIED" | "ESCALATED";

export type RefundReason =
  | "DAMAGED"
  | "INCORRECT_ITEM"
  | "CHANGE_OF_MIND"
  | "OTHER";

export type PolicyRule =
  | "ORDER_OR_CUSTOMER_NOT_FOUND"
  | "EMAIL_DOES_NOT_MATCH_ORDER"
  | "SUSPICIOUS_OR_CONFLICTING_REQUEST"
  | "FINAL_SALE_ITEM"
  | "OUTSIDE_REFUND_WINDOW"
  | "REFUND_ABOVE_HUMAN_REVIEW_THRESHOLD"
  | "DAMAGED_OR_INCORRECT_ITEM"
  | "REASON_NOT_ELIGIBLE";

export interface OrderFacts {
  purchasedAt: Date;
  refundAmountCents: number;
  hasFinalSaleItem: boolean;
}

export interface RefundPolicyInput {
  /** Undefined means no verified order/customer record exists. */
  order?: OrderFacts;
  /** Derived from trusted server-side data. */
  emailMatchesOrder: boolean;
  reason: RefundReason;
  /** Includes detected prompt-injection or policy-bypass attempts. */
  isSuspiciousOrConflicting: boolean;
  /** Explicit to keep evaluation deterministic. */
  requestedAt: Date;
}

export interface RefundPolicyResult {
  decision: RefundDecision;
  triggeredRules: PolicyRule[];
}

function isOlderThanRefundWindow(purchasedAt: Date, requestedAt: Date): boolean {
  const ageInMilliseconds = requestedAt.getTime() - purchasedAt.getTime();
  const refundWindowInMilliseconds = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  return ageInMilliseconds > refundWindowInMilliseconds;
}

/** Applies refund rules from highest to lowest priority. */
export function evaluateRefundPolicy(input: RefundPolicyInput): RefundPolicyResult {
  if (!input.order) {
    return {
      decision: "ESCALATED",
      triggeredRules: ["ORDER_OR_CUSTOMER_NOT_FOUND"],
    };
  }

  if (!input.emailMatchesOrder) {
    return {
      decision: "ESCALATED",
      triggeredRules: ["EMAIL_DOES_NOT_MATCH_ORDER"],
    };
  }

  if (input.isSuspiciousOrConflicting) {
    return {
      decision: "ESCALATED",
      triggeredRules: ["SUSPICIOUS_OR_CONFLICTING_REQUEST"],
    };
  }

  if (input.order.hasFinalSaleItem) {
    return {
      decision: "DENIED",
      triggeredRules: ["FINAL_SALE_ITEM"],
    };
  }

  if (isOlderThanRefundWindow(input.order.purchasedAt, input.requestedAt)) {
    return {
      decision: "DENIED",
      triggeredRules: ["OUTSIDE_REFUND_WINDOW"],
    };
  }

  if (input.order.refundAmountCents > HUMAN_REVIEW_THRESHOLD_CENTS) {
    return {
      decision: "ESCALATED",
      triggeredRules: ["REFUND_ABOVE_HUMAN_REVIEW_THRESHOLD"],
    };
  }

  if (input.reason === "DAMAGED" || input.reason === "INCORRECT_ITEM") {
    return {
      decision: "APPROVED",
      triggeredRules: ["DAMAGED_OR_INCORRECT_ITEM"],
    };
  }

  return {
    decision: "DENIED",
    triggeredRules: ["REASON_NOT_ELIGIBLE"],
  };
}
