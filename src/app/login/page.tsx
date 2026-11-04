"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/db";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("next");
    if (target && target.startsWith("/")) setNext(target);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(password);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h1 className="text-base font-semibold text-slate-900">Sri Gnanamurugan Foundry</h1>
          <p className="mt-1 text-sm text-slate-500">Material Test Certificates</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Password</span>
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${
              error ? "border-red-400 ring-1 ring-red-200" : "border-slate-300 focus:border-slate-500"
            }`}
            placeholder="Foundry password"
          />
        </label>

        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="mt-4 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
          Certificates are stored in the foundry&apos;s Cloudflare database, so everyone who signs
          in sees the same records. Ask the office for the password.
        </p>
      </form>
    </div>
  );
}
