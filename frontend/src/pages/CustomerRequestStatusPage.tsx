import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, askCustomerAssistant, getCustomerRefundRequest, sendCustomerMessage } from "../api/client";
import type { CustomerRefundRequest, RefundMessage } from "../api/types";
import { Brand } from "../components/Brand";
import { DecisionBadge } from "../components/DecisionBadge";
import { LoadingMark } from "../components/LoadingMark";

export function CustomerRequestStatusPage() {
  const { accessToken = "" } = useParams();
  const [request, setRequest] = useState<CustomerRefundRequest | null>(null);
  const [mode, setMode] = useState<"AI" | "SUPPORT">("AI");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationScrollRef = useRef<HTMLDivElement>(null);
  const shouldFollowConversation = useRef(true);

  useEffect(() => {
    getCustomerRefundRequest(accessToken)
      .then(({ request: nextRequest }) => setRequest(nextRequest))
      .catch(() => setError("We could not find this request."));
  }, [accessToken]);

  useEffect(() => {
    const conversation = conversationScrollRef.current;
    if (conversation && shouldFollowConversation.current) {
      conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
    }
  }, [request?.messages.length]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length < 3 || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const response = mode === "AI"
        ? await askCustomerAssistant(accessToken, message.trim())
        : await sendCustomerMessage(accessToken, message.trim());
      setRequest(response.request);
      setMessage("");
    } catch (requestError) {
      setError(requestError instanceof ApiError && requestError.status === 404
        ? "This request is no longer available."
        : "We could not send that message. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  if (!request && !error) {
    return <main className="grid min-h-screen place-items-center bg-stone-100"><LoadingMark label="Opening your request" /></main>;
  }

  if (!request) {
    return <main className="grid min-h-screen place-items-center bg-stone-100 p-6 text-center"><div><Brand /><h1 className="mt-8 text-2xl font-bold">Request unavailable</h1><p className="mt-2 text-sm text-slate-500">{error}</p><Link className="mt-6 inline-block rounded-lg bg-[#272837] px-4 py-3 text-xs font-bold text-white" to="/">Start a new request</Link></div></main>;
  }

  const nextStep = request.decision === "APPROVED"
    ? "You do not need to do anything right now. Ask a question or send a message if you need help."
    : request.decision === "ESCALATED"
      ? "A support specialist will review this request. You can add useful information while you wait."
      : "If you have new information, send it to the support team below.";
  const assistantQuestionIds = new Set(request.messages.flatMap((item, index) => item.sender === "CUSTOMER" && request.messages[index + 1]?.sender === "AI" ? [item.id] : []));
  const visibleMessages = mode === "SUPPORT"
    ? request.messages.filter((item) => item.sender !== "AI" && !assistantQuestionIds.has(item.id))
    : request.messages;

  return (
    <main className="min-h-screen bg-stone-100 px-5 pb-14 sm:px-8">
      <nav className="mx-auto flex max-w-190 items-center justify-between py-6">
        <Brand />
        <Link className="text-xs font-bold text-slate-600 underline underline-offset-4" to="/">Start another request</Link>
      </nav>

      <section className="mx-auto max-w-190">
        <p className="text-[10px] font-extrabold tracking-[.12em] text-slate-500 uppercase">Refund request</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-[-.06em]">{request.order_number ?? "Order request"}</h1>
            <p className="mt-2 text-sm text-slate-500">Submitted {formatDate(request.created_at)}</p>
          </div>
          <DecisionBadge decision={request.decision} />
        </div>

        <section className="mt-7 rounded-2xl bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold text-slate-500">Decision</p>
          <h2 className="mt-2 text-2xl leading-tight font-bold tracking-[-.04em] text-slate-800">{request.decision_explanation}</h2>
          <div className="mt-5 rounded-xl bg-stone-50 p-4">
            <p className="text-xs font-bold text-slate-800">What happens next</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{nextStep}</p>
          </div>
        </section>

        <section className="mt-7 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-stone-100 p-5 sm:p-7">
            <p className="text-[10px] font-extrabold tracking-[.12em] text-slate-500 uppercase">Conversation</p>
            <h2 className="mt-2 text-xl font-bold tracking-[-.04em]">How can we help?</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button className={`rounded-xl border p-4 text-left transition ${mode === "AI" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"}`} onClick={() => setMode("AI")} type="button">
                <strong className="block text-sm">Ask the order assistant</strong>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">Get an answer using your request and this order’s details.</span>
              </button>
              <button className={`rounded-xl border p-4 text-left transition ${mode === "SUPPORT" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"}`} onClick={() => setMode("SUPPORT")} type="button">
                <strong className="block text-sm">Message support</strong>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">Send more information to the team reviewing this request.</span>
              </button>
            </div>
          </div>

          <div
            ref={conversationScrollRef}
            className="max-h-120 overflow-y-auto bg-stone-50 p-5 sm:p-7"
            onScroll={(event) => {
              const conversation = event.currentTarget;
              shouldFollowConversation.current = conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight < 48;
            }}
          >
            {mode === "SUPPORT" && <p className="mb-3 rounded-lg bg-indigo-50 p-3 text-xs leading-relaxed text-indigo-800">You are now messaging the support team. Their replies will appear here. Your earlier assistant conversation is saved and will reappear when you switch back.</p>}
            <div className="grid gap-3">{visibleMessages.map((item) => <MessageItem item={item} key={item.id} />)}</div>
          </div>

          <form className="border-t border-stone-100 p-5 sm:p-7" onSubmit={submit}>
            <label className="block text-xs font-bold text-slate-700" htmlFor="customer-message">{mode === "AI" ? "Ask about your request or order" : "Write a message to support"}</label>
            <textarea className="mt-2 min-h-27 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" id="customer-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} placeholder={mode === "AI" ? "For example: What happens with the issue I reported?" : "Add any detail that would help us review your request"} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">{mode === "AI" ? "The assistant sees this request and this order only." : "Your message is saved here for the support team."}</p>
              <button className="rounded-lg bg-[#272837] px-4 py-3 text-xs font-bold text-white disabled:opacity-50" type="submit" disabled={isSending || message.trim().length < 3}>{isSending ? "Sending…" : mode === "AI" ? "Ask assistant" : "Send message"}</button>
            </div>
            {error && <p className="mt-3 text-xs text-rose-700">{error}</p>}
          </form>
        </section>
        <p className="mt-8 text-center text-xs text-slate-500">Keep this link private to return to your request.</p>
      </section>
    </main>
  );
}

function MessageItem({ item }: { item: RefundMessage }) {
  const labels = { CUSTOMER: "You", SUPPORT: "Support team", AI: "Order assistant", SYSTEM: "Request update" };
  const styles = { CUSTOMER: "ml-4 bg-indigo-50 sm:ml-16", SUPPORT: "mr-4 bg-emerald-50 sm:mr-16", AI: "mr-4 bg-white sm:mr-16", SYSTEM: "bg-amber-50" };
  return <article className={`rounded-xl p-4 shadow-sm ${styles[item.sender]}`}><div className="flex items-center justify-between gap-3"><strong className="text-xs text-slate-800">{labels[item.sender]}</strong><span className="text-[10px] text-slate-500">{formatDate(item.created_at)}</span></div><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{item.body}</p></article>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
