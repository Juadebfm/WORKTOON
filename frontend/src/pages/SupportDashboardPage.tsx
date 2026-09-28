import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { ApiError, askOrderAssistant, getRefundRequest, listPolicyActivity, listRefundRequests, resolveRefundRequest, sendSupportMessage } from "../api/client";
import type { OrderAssistantAnswer, PolicyActivityEvent, RefundDecision, RefundRequestDetails, RefundRequestListItem } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { Brand } from "../components/Brand";
import { DecisionBadge } from "../components/DecisionBadge";
import { LoadingMark } from "../components/LoadingMark";
import { RequestDrawer } from "../features/refunds/RequestDrawer";

const filters = ["ALL", "ESCALATED", "APPROVED", "DENIED"] as const;

export function SupportDashboardPage() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RefundRequestListItem[]>([]);
  const [selected, setSelected] = useState<RefundRequestDetails | null>(null);
  const [filter, setFilter] = useState<RefundDecision | "ALL">("ALL");
  const [activeView, setActiveView] = useState<"REQUESTS" | "POLICY">("REQUESTS");
  const [policyEvents, setPolicyEvents] = useState<PolicyActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    Promise.all([listRefundRequests(session.token), listPolicyActivity(session.token)])
      .then(([{ requests: nextRequests }, { events }]) => {
        setRequests(nextRequests);
        setPolicyEvents(events);
      })
      .catch((loadError) => setError(loadError instanceof ApiError && loadError.status === 401 ? "Your session has expired." : "Unable to load requests."))
      .finally(() => setIsLoading(false));
  }, [session]);

  const counts = useMemo(() => ({
    APPROVED: requests.filter((item) => item.decision === "APPROVED").length,
    DENIED: requests.filter((item) => item.decision === "DENIED").length,
    ESCALATED: requests.filter((item) => item.decision === "ESCALATED").length,
  }), [requests]);
  const visibleRequests = useMemo(() => filter === "ALL" ? requests : requests.filter((item) => item.decision === filter), [filter, requests]);

  if (!session) return <Navigate to="/support/login" replace />;
  const supportToken = session.token;

  async function selectRequest(id: string) {
    try {
      setSelected((await getRefundRequest(supportToken, id)).request);
    } catch {
      setError("Unable to load request details.");
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/support/login");
  }

  async function handleResolve(decision: "APPROVED" | "DENIED", note: string) {
    if (!selected) return;
    setIsResolving(true);
    setResolutionError(null);
    try {
      const { request: resolvedRequest } = await resolveRefundRequest(supportToken, selected.id, decision, note);
      setSelected(resolvedRequest);
      setRequests((current) => current.map((item) => item.id === resolvedRequest.id ? resolvedRequest : item));
      const { events } = await listPolicyActivity(supportToken);
      setPolicyEvents(events);
    } catch (reviewError) {
      setResolutionError(reviewError instanceof ApiError && reviewError.code === "REFUND_REVIEW_NOT_ALLOWED" ? "This request can no longer be resolved." : "We could not save this review. Please try again.");
    } finally {
      setIsResolving(false);
    }
  }

  function handleAssistantQuestion(question: string): Promise<OrderAssistantAnswer> {
    if (!selected) return Promise.reject(new Error("Select a refund request first."));
    return askOrderAssistant(supportToken, selected.id, question);
  }

  async function handleSupportReply(body: string): Promise<void> {
    if (!selected) throw new Error("Select a refund request first.");
    const { request } = await sendSupportMessage(supportToken, selected.id, body);
    setSelected(request);
  }

  return <main className="flex min-h-screen bg-stone-100">
    <aside className="hidden w-61 shrink-0 flex-col bg-[#252633] p-4 text-white lg:flex">
      <Brand dark />
      <div className="mt-16 grid gap-1">
        <span className="mb-2 ml-3 text-[10px] font-extrabold tracking-[.12em] text-slate-400 uppercase">Workspace</span>
        <button className={`rounded-lg px-3 py-3 text-left text-xs font-bold ${activeView === "REQUESTS" ? "bg-white/10 text-white" : "text-slate-300"}`} onClick={() => setActiveView("REQUESTS")}>▦&nbsp;&nbsp; Refund requests</button>
        <button className={`rounded-lg px-3 py-3 text-left text-xs font-bold ${activeView === "POLICY" ? "bg-white/10 text-white" : "text-slate-300"}`} onClick={() => setActiveView("POLICY")}>◌&nbsp;&nbsp; Policy activity</button>
      </div>
      <div className="mt-auto border-t border-white/10 pt-4">
        <div className="flex items-center gap-2 p-1"><span className="grid size-8 place-items-center rounded-full bg-indigo-400 text-xs font-extrabold">{session.user.email[0].toUpperCase()}</span><div className="min-w-0"><strong className="block text-[11px]">Support workspace</strong><small className="block truncate text-[9px] text-slate-400">{session.user.email}</small></div></div>
        <button className="mt-3 flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs text-slate-300 hover:bg-white/10 hover:text-white" onClick={handleSignOut}>Sign out <span>→</span></button>
      </div>
    </aside>
    <section className="min-w-0 flex-1 p-5 sm:p-8 lg:p-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="mb-7 lg:hidden"><Brand /></div><p className="mb-3 flex items-center gap-2 text-[10px] font-extrabold tracking-[.12em] text-slate-500 uppercase"><span className="size-2 rounded-full bg-indigo-500" />Refund operations</p><h1 className="text-3xl font-bold tracking-[-.065em] sm:text-4xl">Good morning, support team.</h1><p className="mt-2 text-sm text-slate-500">Keep an eye on decisions that need a human touch.</p></div><div className="flex gap-2"><button className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 lg:hidden" onClick={handleSignOut}>Sign out</button><button className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-slate-600" onClick={() => window.location.reload()}>↻ Refresh</button></div></header>
      <div className="mt-6 flex gap-2 lg:hidden"><button className={`rounded-lg px-3 py-2 text-xs font-bold ${activeView === "REQUESTS" ? "bg-indigo-600 text-white" : "bg-white text-slate-600"}`} onClick={() => setActiveView("REQUESTS")}>Refund requests</button><button className={`rounded-lg px-3 py-2 text-xs font-bold ${activeView === "POLICY" ? "bg-indigo-600 text-white" : "bg-white text-slate-600"}`} onClick={() => setActiveView("POLICY")}>Policy activity</button></div>
      <div className="my-7 grid gap-4 sm:my-9 sm:grid-cols-2 xl:grid-cols-4"><Metric label="All requests" value={requests.length} /><Metric label="Needs review" value={counts.ESCALATED} accent="border-amber-500" detail="needs your attention" /><Metric label="Approved" value={counts.APPROVED} accent="border-emerald-500" /><Metric label="Denied" value={counts.DENIED} accent="border-rose-500" /></div>
      {activeView === "REQUESTS" ? <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-bold tracking-[-.04em]">Refund request queue</h2><p className="mt-1 text-xs text-slate-500">Open an escalated request to make the final support decision.</p></div><div className="flex flex-wrap gap-1">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-md px-2 py-1.5 text-[10px] font-extrabold capitalize ${filter === item ? "bg-indigo-50 text-indigo-700" : "text-slate-500"}`}>{item.toLowerCase()}</button>)}</div></div>{isLoading ? <Empty><LoadingMark label="Loading requests" /></Empty> : error ? <Empty>{error}</Empty> : <RequestTable requests={visibleRequests} onSelect={selectRequest} />}</section> : <PolicyActivity events={policyEvents} isLoading={isLoading} error={error} />}
    </section>
    {selected && <RequestDrawer request={selected} onClose={() => setSelected(null)} onResolve={handleResolve} onAsk={handleAssistantQuestion} onReply={handleSupportReply} isResolving={isResolving} resolutionError={resolutionError} />}
  </main>;
}

function RequestTable({ requests, onSelect }: { requests: RefundRequestListItem[]; onSelect(id: string): void }) {
  if (!requests.length) return <Empty>No requests match this filter.</Empty>;
  return <div className="border-t border-stone-100"><div className="grid grid-cols-[minmax(0,1fr)_minmax(84px,auto)_20px] gap-3 px-5 py-3 text-[9px] font-extrabold tracking-[.1em] text-slate-400 uppercase sm:grid-cols-[minmax(170px,1.5fr)_minmax(78px,.7fr)_minmax(115px,.85fr)_minmax(90px,.72fr)_20px]"><span>Customer</span><span className="hidden sm:block">Order</span><span className="hidden sm:block">Reason</span><span>Outcome</span><span /></div>{requests.map((item) => <button className="grid w-full grid-cols-[minmax(0,1fr)_minmax(84px,auto)_20px] items-center gap-3 border-t border-stone-100 px-5 py-3 text-left text-xs hover:bg-indigo-50/50 sm:grid-cols-[minmax(170px,1.5fr)_minmax(78px,.7fr)_minmax(115px,.85fr)_minmax(90px,.72fr)_20px]" key={item.id} onClick={() => onSelect(item.id)}><span className="min-w-0"><strong className="block truncate text-xs text-slate-700">{item.request_email}</strong><small className="mt-1 block text-[10px] text-slate-400 sm:hidden">{item.order_number ?? "Unmatched"} · {formatDate(item.created_at)}</small><small className="mt-1 hidden text-[10px] text-slate-400 sm:block">{formatDate(item.created_at)}</small></span><span className="hidden sm:block">{item.order_number ?? "Unmatched"}</span><span className="hidden text-slate-500 sm:block">{formatLabel(item.reason)}</span><DecisionBadge decision={item.decision} /><span className="text-base text-slate-400">→</span></button>)}</div>;
}

function PolicyActivity({ events, isLoading, error }: { events: PolicyActivityEvent[]; isLoading: boolean; error: string | null }) {
  return <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,.9fr)]"><div className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-[10px] font-extrabold tracking-[.12em] text-slate-500 uppercase">Current policy</p><h2 className="mt-2 text-xl font-bold tracking-[-.04em]">Rules the system enforces</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><PolicyRule title="Final sale" detail="Always denied" /><PolicyRule title="Refund window" detail="Orders older than 30 days are denied" /><PolicyRule title="Human review" detail="Refunds above $500 are escalated" /><PolicyRule title="Eligible reasons" detail="Damaged or incorrect items can be approved" /><PolicyRule title="Safety check" detail="Suspicious or conflicting requests are escalated" /></div></div><div className="overflow-hidden rounded-2xl border border-stone-200 bg-white"><div className="border-b border-stone-100 p-5"><p className="text-[10px] font-extrabold tracking-[.12em] text-slate-500 uppercase">Policy activity</p><h2 className="mt-2 text-xl font-bold tracking-[-.04em]">Recent decisions and reviews</h2></div>{isLoading ? <Empty><LoadingMark label="Loading activity" /></Empty> : error ? <Empty>{error}</Empty> : events.length ? <div className="divide-y divide-stone-100">{events.map((event) => <ActivityRow event={event} key={event.id} />)}</div> : <Empty>No policy activity yet.</Empty>}</div></section>;
}

function PolicyRule({ title, detail }: { title: string; detail: string }) { return <div className="rounded-xl bg-stone-50 p-4"><strong className="block text-sm text-slate-800">{title}</strong><span className="mt-1 block text-xs leading-relaxed text-slate-500">{detail}</span></div>; }
function ActivityRow({ event }: { event: PolicyActivityEvent }) { const rules = event.triggered_rules_json ? JSON.parse(event.triggered_rules_json) as string[] : []; return <div className="p-5"><div className="flex items-start justify-between gap-3"><div><strong className="block text-sm text-slate-800">{event.event_type === "HUMAN_REVIEW" ? `Human review: ${formatLabel(event.human_review_decision ?? "")}` : event.order_number ?? "Unmatched order"}</strong><p className="mt-1 text-xs text-slate-500">{event.event_type === "HUMAN_REVIEW" ? event.reviewed_by_email : rules.map(formatLabel).join(" · ")}</p></div><small className="shrink-0 text-[10px] text-slate-400">{formatDate(event.created_at)}</small></div><p className="mt-3 text-xs leading-relaxed text-slate-500">{event.note}</p></div>; }

function Metric({ label, value, accent = "border-transparent", detail = "in the current queue" }: { label: string; value: number; accent?: string; detail?: string }) { return <div className={`min-h-30 rounded-2xl border border-stone-200 border-b-3 bg-white p-4 ${accent}`}><span className="text-[11px] font-bold text-slate-500">{label}</span><strong className="my-1 block text-3xl tracking-[-.07em]">{value}</strong><small className="text-[10px] text-slate-400">{detail}</small></div>; }
function Empty({ children }: { children: ReactNode }) { return <div className="flex min-h-50 items-center justify-center px-5 text-sm text-slate-500">{children}</div>; }
function formatLabel(value: string): string { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }
function formatDate(value: string): string { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
