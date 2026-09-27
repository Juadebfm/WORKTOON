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
}

export interface RefundRequestListItem {
  id: string;
  request_email: string;
  reason: RefundReason;
  decision: RefundDecision;
  decision_explanation: string;
  created_at: string;
  order_number: string | null;
}

export interface RefundRequestDetails extends RefundRequestListItem {
  details: string;
  customer_name: string | null;
  triggered_rules_json: string;
  ai_reason_category: string | null;
  ai_suspicion_flags_json: string | null;
  note: string;
}

export interface SupportSession {
  token: string;
  expiresAt: string;
  user: { email: string; role: "SUPPORT_AGENT" | "ADMIN" };
}
