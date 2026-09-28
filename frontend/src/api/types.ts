export type RefundReason =
  | "DAMAGED"
  | "INCORRECT_ITEM"
  | "CHANGE_OF_MIND"
  | "OTHER";
export type RefundDecision = "APPROVED" | "DENIED" | "ESCALATED";

export interface RefundResult {
  id: string;
  decision: RefundDecision;
  triggeredRules: string[];
  explanation: string;
  aiAssistance: { source: "AI" | "FALLBACK"; reasonCategory: string };
  createdAt: string;
  accessToken: string;
}

export interface RefundRequestListItem {
  id: string;
  request_email: string;
  reason: RefundReason;
  decision: RefundDecision;
  decision_explanation: string;
  created_at: string;
  order_number: string | null;
  human_review_decision: "APPROVED" | "DENIED" | null;
  reviewed_at: string | null;
}

export interface RefundRequestDetails extends RefundRequestListItem {
  details: string;
  customer_name: string | null;
  triggered_rules_json: string;
  ai_reason_category: string | null;
  ai_suspicion_flags_json: string | null;
  note: string;
  human_review_note: string | null;
  reviewed_by_email: string | null;
  messages: RefundMessage[];
}

export interface RefundMessage {
  id: string;
  sender: "CUSTOMER" | "SUPPORT" | "AI" | "SYSTEM";
  body: string;
  created_at: string;
}

export interface CustomerRefundRequest {
  id: string;
  order_number: string | null;
  reason: RefundReason;
  details: string;
  decision: RefundDecision;
  decision_explanation: string;
  created_at: string;
  reviewed_at: string | null;
  messages: RefundMessage[];
}

export interface PolicyActivityEvent {
  id: string;
  event_type: "POLICY_CHECK" | "HUMAN_REVIEW";
  created_at: string;
  order_number: string | null;
  triggered_rules_json: string | null;
  note: string;
  human_review_decision: "APPROVED" | "DENIED" | null;
  reviewed_by_email: string | null;
}

export interface OrderAssistantAnswer {
  kind: "FACTS" | "GUIDANCE";
  summary: string;
  facts: Array<{ label: string; value: string }>;
  source: "AI" | "FALLBACK" | "ORDER_RECORD";
}

export interface SupportSession {
  token: string;
  expiresAt: string;
  user: { email: string; role: "SUPPORT_AGENT" | "ADMIN" };
}
