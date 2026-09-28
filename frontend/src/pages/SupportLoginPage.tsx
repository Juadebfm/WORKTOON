import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { Brand } from "../components/Brand";
import { LoadingMark } from "../components/LoadingMark";

const inputClass = "block w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100";

export function SupportLoginPage() {
  const { session, signIn, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (session) return <Navigate to="/support" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    try { await signIn(email, password); navigate("/support"); }
    catch (loginError) { setError(loginError instanceof ApiError && loginError.status === 401 ? "Your email or password is incorrect." : "We could not sign you in. Please try again."); }
  }

  return <main className="grid min-h-screen grid-cols-1 bg-indigo-50 lg:grid-cols-[minmax(0,1.1fr)_minmax(330px,.9fr)]"><section className="flex min-h-175 flex-col bg-stone-50 px-8 py-9 sm:px-[min(8vw,8rem)]"><Brand /><div className="my-auto max-w-117"><p className="mb-5 flex items-center gap-2 text-[11px] font-extrabold tracking-[.12em] text-slate-500 uppercase"><span className="size-2 rounded-full bg-indigo-500" />Support workspace</p><h1 className="font-display text-5xl leading-[.95] tracking-[-.065em] sm:text-7xl">See the full story behind every request.</h1><p className="mt-6 max-w-100 text-sm leading-relaxed text-slate-500">Review decisions, audit notes, and AI assistance in one protected space.</p></div><form className="grid max-w-101 gap-4" onSubmit={submit}><label className="text-xs font-bold text-slate-700">Work email<input className={`mt-2 ${inputClass}`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="support@worktoon.local" required /></label><label className="text-xs font-bold text-slate-700">Password<span className="relative mt-2 block"><input className={`${inputClass} pr-12`} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-lg text-slate-500 transition hover:text-slate-800 focus:outline-none focus-visible:ring-3 focus-visible:ring-indigo-100" type="button" onClick={() => setShowPassword((isVisible) => !isVisible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}><svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">{showPassword ? <><path d="M3 3l18 18" /><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" /><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.4 5.2 9.4 8s-1.5 4.1-3.7 5.6" /><path d="M6.2 6.2C4 7.8 2.6 10.1 2.6 12c0 2.8 3.9 8 9.4 8 1.2 0 2.3-.2 3.3-.6" /></> : <><path d="M2.6 12S6.5 4 12 4s9.4 5.2 9.4 8-3.9 8-9.4 8-9.4-5.2-9.4-8Z" /><circle cx="12" cy="12" r="3" /></>}</svg></button></span></label>{error && <p className="text-xs font-medium text-rose-700" role="alert">{error}</p>}<button className="mt-1 rounded-lg bg-[#272837] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[#363849] disabled:cursor-wait disabled:opacity-65" type="submit" disabled={isLoading}>{isLoading ? <LoadingMark label="Signing in" /> : "Enter support workspace"}</button></form></section><section className="relative flex min-h-48 items-center justify-center overflow-hidden bg-[#262837]"><div className="absolute size-150 rounded-full bg-[radial-gradient(circle,#8490ff_0,#535fcc_34%,transparent_68%)] opacity-70" /><div className="relative grid w-58 rotate-[-7deg] gap-1 rounded-2xl border border-white/15 bg-white/10 p-6 text-white backdrop-blur"><span className="text-xs text-indigo-100">Live queue</span><strong className="text-6xl tracking-[-.08em]">24</strong><small className="text-indigo-100">requests need attention</small></div></section></main>;
}
