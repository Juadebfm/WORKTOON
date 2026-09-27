import type { RefundDecision } from "../api/types";

const colors: Record<RefundDecision, string> = {
  APPROVED: "bg-emerald-50 text-emerald-800",
  DENIED: "bg-rose-50 text-rose-700",
  ESCALATED: "bg-amber-50 text-amber-800",
};

export function DecisionBadge({ decision }: { decision: RefundDecision }) {
  return (
    <span
      className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-[0.06em] uppercase ${colors[decision]}`}
    >
      {decision.toLowerCase()}
    </span>
  );
}
