import type { ReactNode } from "react";
import type { RefundRequestDetails } from "../../api/types";
import { DecisionBadge } from "../../components/DecisionBadge";

export function RequestDrawer({ request, onClose }: { request: RefundRequestDetails; onClose(): void }) {
  const rules = JSON.parse(request.triggered_rules_json) as string[];
  const flags = request.ai_suspicion_flags_json ? JSON.parse(request.ai_suspicion_flags_json) as string[] : [];
  return <aside className="fixed top-0 right-0 z-10 h-screen w-full max-w-105 overflow-y-auto border-l border-stone-200 bg-white p-8 shadow-[-16px_0_35px_rgba(24,25,35,.09)]"><button className="absolute top-5 right-5 grid size-8 place-items-center rounded-full bg-stone-100 text-xl text-slate-600" onClick={onClose} aria-label="Close request details">×</button><p className="flex items-center gap-2 text-[10px] font-extrabold tracking-[.1em] text-slate-500 uppercase"><span className="size-2 rounded-full bg-indigo-500" />Request detail</p><div className="mt-7 flex items-start justify-between border-b border-stone-200 pb-5"><div><h2 className="text-xl font-bold tracking-[-.05em]">{request.order_number ?? "Unmatched order"}</h2><p className="mt-1 text-xs text-slate-500">{request.customer_name ?? request.request_email}</p></div><DecisionBadge decision={request.decision} /></div><DrawerSection label="Customer request"><p className="rounded-lg bg-stone-50 p-3 text-sm leading-relaxed text-slate-600">{request.details}</p></DrawerSection><DrawerSection label="Policy outcome"><p className="text-sm leading-relaxed text-slate-600">{request.decision_explanation}</p><TagList tags={rules} /></DrawerSection><DrawerSection label="AI assistance"><p className="text-sm text-slate-600"><strong>{request.ai_reason_category ?? "Not run"}</strong> classification</p>{flags.length > 0 && <TagList tags={flags} warning />}<p className="mt-3 text-xs leading-relaxed text-slate-500 italic">{request.note}</p></DrawerSection></aside>;
}

function DrawerSection({ label, children }: { label: string; children: ReactNode }) {
  return <section className="border-b border-stone-200 py-5"><span className="text-[10px] font-extrabold tracking-[.1em] text-slate-500 uppercase">{label}</span><div className="mt-2">{children}</div></section>;
}

function TagList({ tags, warning = false }: { tags: string[]; warning?: boolean }) {
  return <div className="mt-3 flex flex-wrap gap-2">{tags.map((tag) => <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${warning ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`} key={tag}>{formatLabel(tag)}</span>)}</div>;
}

export function formatLabel(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
