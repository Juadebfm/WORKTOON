import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import type { OrderAssistantAnswer, RefundRequestDetails } from "../../api/types";

interface AssistantMessage { id: string; role: "SUPPORT" | "ASSISTANT"; question?: string; answer?: OrderAssistantAnswer; }
interface RequestDrawerProps { request: RefundRequestDetails; onClose(): void; onResolve(decision: "APPROVED" | "DENIED", note: string): void; onAsk(question: string): Promise<OrderAssistantAnswer>; onReply(body: string): Promise<void>; isResolving: boolean; resolutionError: string | null; }

export function RequestDrawer({ request, onClose, onResolve, onAsk, onReply, isResolving, resolutionError }: RequestDrawerProps) {
  const rules = JSON.parse(request.triggered_rules_json) as string[];
  const [activeTab, setActiveTab] = useState<"REVIEW" | "ASSISTANT">("REVIEW");
  const [reviewNote, setReviewNote] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [supportReply, setSupportReply] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const canResolve = request.decision === "ESCALATED";
  const hasValidNote = reviewNote.trim().length >= 5;

  async function askOrderAssistant(questionToAsk: string) {
    const nextQuestion = questionToAsk.trim();
    if (nextQuestion.length < 3 || isAsking) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "SUPPORT", question: nextQuestion }]);
    setQuestion("");
    setAssistantError(null);
    setIsAsking(true);
    try {
      const answer = await onAsk(nextQuestion);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "ASSISTANT", answer }]);
    } catch {
      setAssistantError("We could not answer that question. Try a question about this order only.");
    } finally {
      setIsAsking(false);
    }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (supportReply.trim().length < 3 || isReplying) return;
    setIsReplying(true);
    setReplyError(null);
    try {
      await onReply(supportReply.trim());
      setSupportReply("");
    } catch {
      setReplyError("We could not send that reply. Please try again.");
    } finally {
      setIsReplying(false);
    }
  }

  return <div className="fixed inset-0 z-10 bg-slate-950/15" onMouseDown={onClose}>
    <aside className="absolute top-0 right-0 h-screen w-full max-w-105 overflow-y-auto bg-white p-5 shadow-[-16px_0_35px_rgba(24,25,35,.09)] sm:p-8" role="dialog" aria-modal="true" aria-label="Refund request detail" onMouseDown={(event) => event.stopPropagation()}>
      <header className="sticky top-0 z-10 -mx-5 -mt-5 border-b border-stone-100 bg-white px-5 pt-5 sm:-mx-8 sm:-mt-8 sm:px-8 sm:pt-8">
        <div className="flex items-center justify-between gap-4"><p className="flex items-center gap-2 text-[10px] font-extrabold tracking-[.1em] text-slate-500 uppercase"><span className="size-2 rounded-full bg-indigo-500" />Request detail</p><button className="grid size-10 place-items-center rounded-lg border border-stone-200 bg-white text-xl text-slate-600 hover:bg-stone-50" onClick={onClose} aria-label="Close request details">×</button></div>
        <div className="mt-5 pb-5"><h2 className="text-2xl font-bold tracking-[-.05em]">{request.order_number ?? "Unmatched order"}</h2><p className="mt-1 text-sm text-slate-500">{request.customer_name ?? request.request_email}</p><OutcomeLabel decision={request.decision} /></div>
        <nav className="grid grid-cols-2" aria-label="Request detail sections"><TabButton active={activeTab === "REVIEW"} onClick={() => setActiveTab("REVIEW")}>Review request</TabButton><TabButton active={activeTab === "ASSISTANT"} onClick={() => setActiveTab("ASSISTANT")}>Order assistant</TabButton></nav>
      </header>
      {activeTab === "REVIEW" ? <div className="pt-5 pb-5"><DrawerSection label="Customer request"><p className="rounded-xl bg-stone-50 p-4 text-sm leading-relaxed text-slate-700 shadow-sm shadow-stone-200/70">{request.details}</p></DrawerSection><DrawerSection label="Decision context"><div className="rounded-xl bg-amber-50/70 p-4 shadow-sm shadow-amber-100"><p className="text-xs font-extrabold tracking-[.08em] text-amber-900 uppercase">Policy review required</p><p className="mt-2 text-sm leading-relaxed text-slate-700">{request.decision_explanation}</p><p className="mt-3 text-xs font-bold text-slate-600">Rule: {rules.map(formatLabel).join(" · ")}</p></div></DrawerSection><DrawerSection label="Make a decision">{canResolve ? <><p className="text-sm leading-relaxed text-slate-600">Use the order assistant for the facts you need, then leave a clear internal reason for your final decision.</p><textarea className="mt-3 min-h-27 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={1000} placeholder="Internal note for this decision" disabled={isResolving} /><div className="mt-3 grid gap-2 sm:grid-cols-2"><button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-xs font-extrabold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={!hasValidNote || isResolving} onClick={() => onResolve("DENIED", reviewNote.trim())}>{isResolving ? "Saving decision…" : "Deny request"}</button><button className="rounded-xl bg-emerald-600 px-3 py-3 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={!hasValidNote || isResolving} onClick={() => onResolve("APPROVED", reviewNote.trim())}>{isResolving ? "Saving decision…" : "Approve refund"}</button></div>{resolutionError && <p className="mt-3 text-xs font-medium text-rose-700" role="alert">{resolutionError}</p>}</> : request.human_review_decision ? <div className="rounded-xl bg-indigo-50 p-4"><p className="text-sm font-bold text-indigo-900">Resolved: {formatLabel(request.human_review_decision)}</p><p className="mt-1 text-xs text-indigo-800">{request.reviewed_by_email} · {request.reviewed_at ? formatDate(request.reviewed_at) : ""}</p><p className="mt-3 text-sm leading-relaxed text-slate-700">{request.human_review_note}</p></div> : <p className="text-sm leading-relaxed text-slate-500">The policy resolved this request automatically, so it cannot be overridden here.</p>}</DrawerSection><DrawerSection label="Customer conversation"><div className="grid gap-2">{request.messages.map((message) => <div className={`rounded-lg p-3 text-xs leading-relaxed ${message.sender === "CUSTOMER" ? "bg-indigo-50" : message.sender === "SUPPORT" ? "bg-emerald-50" : "bg-stone-50"}`} key={message.id}><strong className="block text-[10px] uppercase text-slate-500">{message.sender === "CUSTOMER" ? "Customer" : message.sender === "SUPPORT" ? "Support" : message.sender === "AI" ? "Order assistant" : "Request update"}</strong><p className="mt-1 whitespace-pre-line text-slate-700">{message.body}</p></div>)}</div><form className="mt-3" onSubmit={sendReply}><textarea className="min-h-24 w-full resize-y rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={supportReply} onChange={(event) => setSupportReply(event.target.value)} maxLength={1000} placeholder="Reply to the customer" /><button className="mt-2 w-full rounded-lg bg-[#272837] px-3 py-3 text-xs font-bold text-white disabled:opacity-50" type="submit" disabled={isReplying || supportReply.trim().length < 3}>{isReplying ? "Sending…" : "Send reply"}</button>{replyError && <p className="mt-2 text-xs text-rose-700">{replyError}</p>}</form></DrawerSection></div> : <div className="pt-5 pb-5"><OrderAssistant question={question} messages={messages} isAsking={isAsking} error={assistantError} onQuestionChange={setQuestion} onAsk={askOrderAssistant} /></div>}
    </aside>
  </div>;
}

function OrderAssistant({ question, messages, isAsking, error, onQuestionChange, onAsk }: { question: string; messages: AssistantMessage[]; isAsking: boolean; error: string | null; onQuestionChange(question: string): void; onAsk(question: string): void }) {
  const suggestedQuestions = ["Summarise this order.", "What are the price and delivery details?"];
  function submitQuestion(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onAsk(question); }
  return <section className="py-5"><h3 className="text-base font-bold text-slate-800">Ask about this order</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">This assistant can use only the order currently open in this drawer.</p><div className="mt-4 flex flex-wrap gap-2">{suggestedQuestions.map((suggestion) => <button className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50" type="button" key={suggestion} disabled={isAsking} onClick={() => onAsk(suggestion)}>{suggestion}</button>)}</div>{messages.length === 0 ? <div className="mt-5 rounded-xl bg-stone-50 p-4 text-xs leading-relaxed text-slate-500 shadow-sm shadow-stone-200/70">Ask about payment, fulfilment, delivery, pricing, or items before making your support decision.</div> : <div className="mt-5 grid gap-4">{messages.map((message) => message.role === "SUPPORT" ? <div className="ml-8 rounded-xl bg-slate-100 p-3 text-sm text-slate-700" key={message.id}><span className="mb-1 block text-[10px] font-extrabold tracking-[.08em] text-slate-500 uppercase">You asked</span>{message.question}</div> : <AssistantAnswer answer={message.answer!} key={message.id} />)}</div>}<form className="mt-5 flex gap-2" onSubmit={submitQuestion}><input className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={question} onChange={(event) => onQuestionChange(event.target.value)} maxLength={500} placeholder="Ask a question about this order" disabled={isAsking} /><button className="rounded-xl bg-[#272837] px-4 py-3 text-xs font-bold text-white disabled:opacity-50" type="submit" disabled={question.trim().length < 3 || isAsking}>{isAsking ? "Asking…" : "Ask"}</button></form>{error && <p className="mt-2 text-xs font-medium text-rose-700" role="alert">{error}</p>}</section>;
}

function AssistantAnswer({ answer }: { answer: OrderAssistantAnswer }) { const isFactAnswer = answer.kind === "FACTS"; const sourceLabel = answer.source === "AI" ? "AI-assisted" : answer.source === "ORDER_RECORD" ? "Verified record" : "Policy-aware fallback"; return <article className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-extrabold tracking-[.08em] text-indigo-700 uppercase">{isFactAnswer ? "Order details" : "Support guidance"}</span><span className="text-[10px] font-bold text-slate-500">{sourceLabel}</span></div><p className="mt-3 text-sm leading-relaxed font-medium text-slate-800">{answer.summary}</p>{isFactAnswer && <dl className="mt-4 grid gap-2 sm:grid-cols-2">{answer.facts.map((fact) => <div className="rounded-lg bg-white/85 p-3" key={`${fact.label}-${fact.value}`}><dt className="text-[10px] font-extrabold tracking-[.06em] text-slate-500 uppercase">{fact.label}</dt><dd className="mt-1 break-words text-xs leading-relaxed text-slate-700">{fact.value}</dd></div>)}</dl>}</article>; }
function OutcomeLabel({ decision }: { decision: RefundRequestDetails["decision"] }) { const styles = { APPROVED: "bg-emerald-50 text-emerald-800 shadow-emerald-100", DENIED: "bg-rose-50 text-rose-700 shadow-rose-100", ESCALATED: "bg-amber-50 text-amber-800 shadow-amber-100" }; return <div className={`mt-4 inline-flex rounded-md px-3 py-2 text-[10px] font-extrabold tracking-[.08em] uppercase shadow-sm ${styles[decision]}`}>Current outcome: {formatLabel(decision)}</div>; }
function TabButton({ active, onClick, children }: { active: boolean; onClick(): void; children: ReactNode }) { return <button className={`border-b-2 px-2 py-3 text-xs font-bold ${active ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`} type="button" onClick={onClick} aria-pressed={active}>{children}</button>; }
function DrawerSection({ label, children }: { label: string; children: ReactNode }) { return <section className="border-b border-stone-200 py-5"><span className="text-[10px] font-extrabold tracking-[.1em] text-slate-500 uppercase">{label}</span><div className="mt-3">{children}</div></section>; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
export function formatLabel(value: string): string { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }
