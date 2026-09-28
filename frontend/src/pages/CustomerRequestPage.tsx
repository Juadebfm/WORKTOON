import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, submitRefundRequest } from "../api/client";
import type { RefundReason } from "../api/types";
import { Brand } from "../components/Brand";
import { LoadingMark } from "../components/LoadingMark";

const reasons: Array<{
  value: RefundReason;
  title: string;
  description: string;
}> = [
  {
    value: "DAMAGED",
    title: "Damaged item",
    description: "The item arrived broken or defective.",
  },
  {
    value: "INCORRECT_ITEM",
    title: "Incorrect item",
    description: "The received item differs from the order.",
  },
  {
    value: "CHANGE_OF_MIND",
    title: "Changed my mind",
    description: "You no longer need the item.",
  },
  {
    value: "OTHER",
    title: "Something else",
    description: "Tell us what happened.",
  },
];

const examples = [
  {
    order: "WO-1001",
    email: "amina.yusuf@example.test",
    title: "Approved example",
  },
  {
    order: "WO-1002",
    email: "chinedu.okafor@example.test",
    title: "Final-sale example",
  },
  {
    order: "WO-1004",
    email: "fatima.bello@example.test",
    title: "Review example",
  },
];

const inputClass =
  "mt-2 block w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100";

export function CustomerRequestPage() {
  const navigate = useNavigate();
  const [usedDemoOrders, setUsedDemoOrders] = useState<string[]>(() => {
    try { return JSON.parse(window.localStorage.getItem("worktoon-used-demo-orders") ?? "[]") as string[]; } catch { return []; }
  });
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<RefundReason>("DAMAGED");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await submitRefundRequest({ orderNumber, email, reason, details });
      navigate(`/request/${result.accessToken}`);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError &&
          requestError.code === "DUPLICATE_REFUND_REQUEST"
          ? "We already received a recent request for this order. Please wait for the review to complete."
          : "We could not process this request. Check the order details and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function applyExample(order: string, nextEmail: string) {
    setOrderNumber(order);
    setEmail(nextEmail);
    setReason("DAMAGED");
    setDetails("The item arrived with a broken zip and cannot be used.");
    setError(null);
    const nextUsed = [...new Set([...usedDemoOrders, order])];
    window.localStorage.setItem("worktoon-used-demo-orders", JSON.stringify(nextUsed));
    setUsedDemoOrders(nextUsed);
  }

  const suggestedExamples = examples.filter((example) => !usedDemoOrders.includes(example.order));
  const demoExamples = suggestedExamples.length ? suggestedExamples : examples;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_77%_24%,#e7eaff_0,transparent_26%),#f8f7f4] px-[5vw] pb-16">
      <nav className="mx-auto flex max-w-300 items-center justify-between py-7">
        <Brand />
        <Link
          className="border-b border-slate-300 pb-1 text-xs font-bold"
          to="/support/login"
        >
          Support team ↗
        </Link>
      </nav>
      <section className="mx-auto mt-12 max-w-170 text-center sm:mt-16">
        <p className="mb-4 flex items-center justify-center gap-2 text-[11px] font-extrabold tracking-[.12em] text-slate-500 uppercase">
          <span className="size-2 rounded-full bg-indigo-500" />
          Refund support
        </p>
        <h1 className="font-display text-5xl leading-[.92] tracking-[-.07em] text-[#23232f] sm:text-6xl">
          Tell us about your order.
        </h1>
        <p className="mx-auto mt-6 max-w-130 text-base leading-relaxed text-slate-500">
          We’ll check your order against the refund policy and show you what happens next.
        </p>
      </section>
      <section className="mx-auto mt-12 grid max-w-260 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,.7fr)]">
        <form
          onSubmit={submit}
          className="rounded-3xl border border-stone-200 bg-white/95 p-6 shadow-[0_14px_34px_rgba(42,43,57,.05)] sm:p-10"
        >
          <div className="mb-9 flex gap-4">
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-xs font-extrabold text-indigo-600">
              01
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-[-.04em]">
                Tell us what happened
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                First, we’ll use your order number and email to find the right order.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Order number">
              <input
                className={inputClass}
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                placeholder="WO-1001"
                required
              />
            </Field>
            <Field label="Email used for the order">
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-stone-50 p-3">
            <span className="mr-1 text-[11px] font-bold text-slate-500">Trying the demo?</span>
            {demoExamples.map((example) => <button key={example.order} onClick={() => applyExample(example.order, example.email)} type="button" className="rounded-md bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 shadow-sm hover:text-indigo-700">{example.title}: {example.order}</button>)}
          </div>
          <fieldset className="my-6">
            <legend className="text-xs font-bold text-slate-700">
              What happened?
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {reasons.map((item) => (
                <label
                  key={item.value}
                  className={`relative min-h-20 cursor-pointer rounded-xl border p-3 pl-9 transition ${reason === item.value ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500" : "border-slate-200 bg-white hover:border-indigo-300"}`}
                >
                  <input
                    className="absolute top-3.5 left-3 size-3.5 accent-indigo-600"
                    type="radio"
                    value={item.value}
                    checked={reason === item.value}
                    onChange={() => setReason(item.value)}
                  />
                  <strong className="block text-xs">{item.title}</strong>
                  <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                    {item.description}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Briefly describe the issue">
            <textarea
              className={`${inputClass} min-h-27 resize-y leading-relaxed`}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              minLength={10}
              maxLength={1000}
              placeholder="For example: The backpack arrived with a broken zip."
              required
            />
          </Field>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-relaxed text-slate-500">
              Your request is evaluated securely. We never expose payment
              details.
            </p>
            <button
              className="rounded-lg bg-[#272837] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[#363849] disabled:cursor-wait disabled:opacity-65"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoadingMark label="Reviewing" />
              ) : (
                "Check my request"
              )}
            </button>
          </div>
          {error && (
            <p className="mt-4 text-xs font-medium text-rose-700" role="alert">
              {error}
            </p>
          )}
        </form>
        <aside className="flex flex-col gap-6">
          <>
              <div className="relative min-h-72 overflow-hidden rounded-3xl border border-[#232331] bg-[#232331] p-7 text-white">
                <div className="absolute -top-28 -right-24 size-65 rounded-full bg-[radial-gradient(circle,#6e78ff_0,transparent_68%)] opacity-45" />
                <span className="relative grid size-9 place-items-center rounded-full bg-indigo-500">
                  ✦
                </span>
                <h2 className="relative mt-5 max-w-55 text-xl font-bold tracking-[-.04em]">
                  What happens after you submit
                </h2>
                <p className="relative mt-3 max-w-72 text-sm leading-relaxed text-slate-300">
                  You will see your request outcome straight away and can continue from one private request page.
                </p>
                <div className="relative mt-5 grid gap-2 border-t border-white/15 pt-4 text-xs text-slate-200">
                  <span>1. We check the order and policy</span>
                  <span>2. You see the outcome and next step</span>
                  <span>3. Ask the assistant or message support</span>
                </div>
              </div>
          </>
        </aside>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs font-bold text-slate-700">
      {label}
      {children}
    </label>
  );
}
