import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import type { OrderAssistantAnswer, RefundRequestDetails } from "../../api/types";
import { DecisionBadge } from "../../components/DecisionBadge";

interface AssistantMessage {
  id: string;
  role: "SUPPORT" | "ASSISTANT";
  text: string;
  source?: OrderAssistantAnswer["source"];
}

interface RequestDrawerProps {
  request: RefundRequestDetails;
  onClose(): void;
  onResolve(decision: "APPROVED" | "DENIED", note: string): void;
  onAsk(question: string): Promise<OrderAssistantAnswer>;
  isResolving: boolean;
  resolutionError: string | null;
}

export function RequestDrawer({ request, onClose, onResolve, onAsk, isResolving, resolutionError }: RequestDrawerProps) {
  const rules = JSON.parse(request.triggered_rules_json) as string[];
  const flags = request.ai_suspicion_flags_json ? JSON.parse(request.ai_suspicion_flags_json) as string[] : [];
  const [reviewNote, setReviewNote] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const canResolve = request.decision === "ESCALATED";
  const hasValidNote = reviewNote.trim().length >= 5;

  async function askOrderAssistant(questionToAsk: string) {
    const nextQuestion = questionToAsk.trim();
    if (nextQuestion.length < 3 || isAsking) return;

    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "SUPPORT", text: nextQuestion }]);
    setQuestion("");
    setAssistantError(null);
    setIsAsking(true);
    try {
      const answer = await onAsk(nextQuestion);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "ASSISTANT", text: answer.answer, source: answer.source }]);
    } catch {
      setAssistantError("We could not answer that question. Try a question about this order only.");
    } finally {
      setIsAsking(false);
    }
  }

  return <div className="fixed inset-0 z-10 bg-slate-950/15" onMouseDown={onClose}>
    <aside className="absolute top-0 right-0 h-screen w-full max-w-105 overflow-y-auto border-l border-stone-200 bg-white p-5 shadow-[-16px_0_35px_rgba(24,25,35,.09)] sm:p-8" role="dialog" aria-modal="true" aria-label="Refund request detail" onMouseDown={(event) => event.stopPropagation()}>
      <button className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-stone-100 text-xl text-slate-600" onClick={onClose} aria-label="Close request details">×</button>
      <p className="flex items-center gap-2 pr-12 text-[10px] font-extrabold tracking-[.1em] text-slate-500 uppercase"><span className="size-2 rounded-full bg-indigo-500" />Request detail</p>
      <div className="mt-7 flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-xl font-bold tracking-[-.05em]">{request.order_number ?? "Unmatched order"}</h2><p className="mt-1 text-xs text-slate-500">{request.customer_name ?? request.request_email}</p></div><DecisionBadge decision={request.decision} /></div>
      <DrawerSection label="Customer request"><p className="rounded-lg bg-stone-50 p-3 text-sm leading-relaxed text-slate-600">{request.details}</p></DrawerSection>
      <DrawerSection label="Policy outcome"><p className="text-sm leading-relaxed text-slate-600">{request.decision_explanation}</p><TagList tags={rules} /></DrawerSection>
      <DrawerSection label="AI assistance"><p className="text-sm text-slate-600"><strong>{request.ai_reason_category ?? "Not run"}</strong> classification</p>{flags.length > 0 && <TagList tags={flags} warning />}<p className="mt-3 text-xs leading-relaxed text-slate-500 italic">{request.note}</p><OrderAssistant question={question} messages={messages} isAsking={isAsking} error={assistantError} onQuestionChange={setQuestion} onAsk={askOrderAssistant} /></DrawerSection>
      <DrawerSection label="Human review">{canResolve ? <><p className="text-sm leading-relaxed text-slate-600">This request needs a final support decision. Add an internal note before approving or denying it.</p><textarea className="mt-3 min-h-24 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={1000} placeholder="Why are you approving or denying this request?" disabled={isResolving} /><div className="mt-3 grid gap-2 sm:grid-cols-2"><button className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-xs font-extrabold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={!hasValidNote || isResolving} onClick={() => onResolve("DENIED", reviewNote.trim())}>{isResolving ? "Saving decision…" : "Deny request"}</button><button className="rounded-lg bg-emerald-600 px-3 py-3 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={!hasValidNote || isResolving} onClick={() => onResolve("APPROVED", reviewNote.trim())}>{isResolving ? "Saving decision…" : "Approve refund"}</button></div>{resolutionError && <p className="mt-3 text-xs font-medium text-rose-700" role="alert">{resolutionError}</p>}</> : request.human_review_decision ? <div className="rounded-lg bg-indigo-50 p-3"><p className="text-sm font-bold text-indigo-900">Resolved: {formatLabel(request.human_review_decision)}</p><p className="mt-1 text-xs text-indigo-800">{request.reviewed_by_email} · {request.reviewed_at ? formatDate(request.reviewed_at) : ""}</p><p className="mt-3 text-sm leading-relaxed text-slate-700">{request.human_review_note}</p></div> : <p className="text-sm leading-relaxed text-slate-500">This request was resolved automatically by the refund policy and cannot be overridden here.</p>}</DrawerSection>
    </aside>
  </div>;
}

function OrderAssistant({ question, messages, isAsking, error, onQuestionChange, onAsk }: { question: string; messages: AssistantMessage[]; isAsking: boolean; error: string | null; onQuestionChange(question: string): void; onAsk(question: string): void }) {
  const suggestedQuestions = ["Summarise this order.", "What are the price and delivery details?"];
  function submitQuestion(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onAsk(question); }
  return <div className="mt-5 border-t border-slate-100 pt-4"><div className="flex items-center justify-between gap-3"><strong className="text-xs text-slate-800">Ask about this order</strong><span className="text-[10px] font-bold text-indigo-600">Record-scoped</span></div><p className="mt-1 text-xs leading-relaxed text-slate-500">Ask for order, payment, fulfilment, delivery, price, or item details. The assistant only receives this order’s record.</p><div className="mt-3 flex flex-wrap gap-2">{suggestedQuestions.map((suggestion) => <button className="rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50" type="button" key={suggestion} disabled={isAsking} onClick={() => onAsk(suggestion)}>{suggestion}</button>)}</div>{messages.length > 0 && <div className="mt-4 grid gap-3">{messages.map((message) => <div className={`rounded-lg p-3 text-xs leading-relaxed ${message.role === "SUPPORT" ? "bg-slate-100 text-slate-700" : "bg-indigo-50 text-slate-700"}`} key={message.id}><span className="mb-1 block text-[10px] font-extrabold tracking-[.08em] text-slate-500 uppercase">{message.role === "SUPPORT" ? "You" : message.source === "AI" ? "AI answer" : "Record summary"}</span>{message.text}</div>)}</div>}<form className="mt-3 flex gap-2" onSubmit={submitQuestion}><input className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={question} onChange={(event) => onQuestionChange(event.target.value)} maxLength={500} placeholder="Ask a question about this order" disabled={isAsking} /><button className="rounded-lg bg-[#272837] px-3 py-2 text-xs font-bold text-white disabled:opacity-50" type="submit" disabled={question.trim().length < 3 || isAsking}>{isAsking ? "Asking…" : "Ask"}</button></form>{error && <p className="mt-2 text-xs font-medium text-rose-700" role="alert">{error}</p>}</div>;
}

function DrawerSection({ label, children }: { label: string; children: ReactNode }) { return <section className="border-b border-stone-200 py-5"><span className="text-[10px] font-extrabold tracking-[.1em] text-slate-500 uppercase">{label}</span><div className="mt-2">{children}</div></section>; }
function TagList({ tags, warning = false }: { tags: string[]; warning?: boolean }) { return <div className="mt-3 flex flex-wrap gap-2">{tags.map((tag) => <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${warning ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`} key={tag}>{formatLabel(tag)}</span>)}</div>; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
export function formatLabel(value: string): string { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }
