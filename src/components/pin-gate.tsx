"use client";

import { useEffect, useState } from "react";
import { getMeta } from "@/lib/db";
import { isUnlocked, markUnlocked, verifyPin, type PinRecord } from "@/lib/pin";

/**
 * Optional PIN lock. If no PIN is set the app opens straight up; if one is set
 * the operator unlocks once per browser session. Certificates stay on this
 * device either way — the PIN only stops a passer-by from browsing them.
 */
export function PinGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "open" | "locked">("loading");
  const [pinRecord, setPinRecord] = useState<PinRecord | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMeta<PinRecord | null>("pin", null)
      .then((rec) => {
        setPinRecord(rec);
        setState(!rec || isUnlocked() ? "open" : "locked");
      })
      .catch(() => setState("open"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pinRecord || busy) return;
    setBusy(true);
    const ok = await verifyPin(pin, pinRecord);
    setBusy(false);
    if (ok) {
      markUnlocked();
      setState("open");
    } else {
      setError(true);
      setPin("");
    }
  }

  if (state === "loading") {
    return <div className="p-10 text-sm text-slate-400">Loading…</div>;
  }

  if (state === "open") return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-base font-semibold text-slate-900">SGM Foundry — MTC</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the PIN for this computer.</p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
          className={`mt-4 w-full rounded-md border px-3 py-2 text-center text-lg tracking-[0.4em] outline-none ${
            error ? "border-red-400 ring-1 ring-red-300" : "border-slate-300 focus:border-slate-500"
          }`}
          placeholder="••••"
        />
        {error ? <p className="mt-2 text-xs text-red-600">Wrong PIN. Try again.</p> : null}
        <button
          type="submit"
          disabled={busy || pin.length < 4}
          className="mt-4 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
          Certificates are stored on this computer. If the PIN is lost, clearing the site data in
          the browser resets the lock — restore a backup file to get the data back.
        </p>
      </form>
    </div>
  );
}
