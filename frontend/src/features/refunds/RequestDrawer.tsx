import { useEffect, useState, type ReactNode } from "react";
import type { RefundRequestDetails } from "../../api/types";
import { DecisionBadge } from "../../components/DecisionBadge";

export function RequestDrawer({ request, onClose, onResolve, isResolving, resolutionError }: { request: RefundRequestDetails; onClose(): void; onResolve(decision: "APPROVED" | "DENIED", note: string): void; isResolving: boolean; resolutionError: string | null }) {
  const rules = JSON.parse(request.triggered_rules_json) as string[];
  const flags = request.ai_suspicion_flags_json ? JSON.parse(request.ai_suspicion_flags_json) as string[] : [];
  const [reviewNote, setReviewNote] = useState("");
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const canResolve = request.decision === "ESCALATED";
  const hasValidNote = reviewNote.trim().length >= 5;

  return <div className="fixed inset-0 z-10 bg-slate-950/15" onMouseDown={onClose}><aside className="absolute top-0 right-0 h-screen w-full max-w-105 overflow-y-auto border-l border-stone-200 bg-white p-5 shadow-[-16px_0_35px_rgba(24,25,35,.09)] sm:p-8" role="dialog" aria-modal="true" aria-label="Refund request detail" onMouseDown={(event) => event.stopPropagation()}><button className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-stone-100 text-xl text-slate-600" onClick={onClose} aria-label="Close request details">×</button><p className="flex items-center gap-2 pr-12 text-[10px] font-extrabold tracking-[.1em] text-slate-500 uppercase"><span className="size-2 rounded-full bg-indigo-500" />Request detail</p><div className="mt-7 flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-xl font-bold tracking-[-.05em]">{request.order_number ?? "Unmatched order"}</h2><p className="mt-1 text-xs text-slate-500">{request.customer_name ?? request.request_email}</p></div><DecisionBadge decision={request.decision} /></div><DrawerSection label="Customer request"><p className="rounded-lg bg-stone-50 p-3 text-sm leading-relaxed text-slate-600">{request.details}</p></DrawerSection><DrawerSection label="Policy outcome"><p className="text-sm leading-relaxed text-slate-600">{request.decision_explanation}</p><TagList tags={rules} /></DrawerSection><DrawerSection label="AI assistance"><p className="text-sm text-slate-600"><strong>{request.ai_reason_category ?? "Not run"}</strong> classification</p>{flags.length > 0 && <TagList tags={flags} warning />}<p className="mt-3 text-xs leading-relaxed text-slate-500 italic">{request.note}</p></DrawerSection><DrawerSection label="Human review">{canResolve ? <><p className="text-sm leading-relaxed text-slate-600">This request needs a final support decision. Add an internal note before approving or denying it.</p><textarea className="mt-3 min-h-24 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={1000} placeholder="Why are you approving or denying this request?" disabled={isResolving} /><div className="mt-3 grid gap-2 sm:grid-cols-2"><button className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-xs font-extrabold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={!hasValidNote || isResolving} onClick={() => onResolve("DENIED", reviewNote.trim())}>{isResolving ? "Saving decision…" : "Deny request"}</button><button className="rounded-lg bg-emerald-600 px-3 py-3 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={!hasValidNote || isResolving} onClick={() => onResolve("APPROVED", reviewNote.trim())}>{isResolving ? "Saving decision…" : "Approve refund"}</button></div>{resolutionError && <p className="mt-3 text-xs font-medium text-rose-700" role="alert">{resolutionError}</p>}</> : request.human_review_decision ? <div className="rounded-lg bg-indigo-50 p-3"><p className="text-sm font-bold text-indigo-900">Resolved: {formatLabel(request.human_review_decision)}</p><p className="mt-1 text-xs text-indigo-800">{request.reviewed_by_email} · {request.reviewed_at ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(request.reviewed_at)) : ""}</p><p className="mt-3 text-sm leading-relaxed text-slate-700">{request.human_review_note}</p></div> : <p className="text-sm leading-relaxed text-slate-500">This request was resolved automatically by the refund policy and cannot be overridden here.</p>}</DrawerSection></aside></div>;
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
