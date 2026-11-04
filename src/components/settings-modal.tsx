"use client";

import { useState } from "react";
import { setMeta } from "@/lib/db";
import { DEFAULT_DEFAULTS, DEFAULT_ISSUER, type Defaults, type Settings } from "@/lib/settings";
import { DEFAULT_NUMBERING } from "@/lib/certificate-number";

export function SettingsModal({
  settings,
  onClose,
  onSaved,
}: {
  settings: Settings;
  onClose: () => void;
  onSaved: (s: Settings) => void;
}) {
  const [issuer, setIssuer] = useState(settings.issuer ?? DEFAULT_ISSUER);
  const [numbering, setNumbering] = useState(settings.numbering ?? DEFAULT_NUMBERING);
  const [defaults, setDefaults] = useState<Defaults>(settings.defaults ?? DEFAULT_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await setMeta("issuer", issuer);
      await setMeta("numbering", numbering);
      await setMeta("defaults", defaults);
      onSaved({ issuer, numbering, defaults });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-6">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <p className="rounded-md bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
            These are shared with everyone who signs in — they live in the same Cloudflare database
            as the certificates.
          </p>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Issuer (defaults for new certificates)
            </h3>
            <Input label="Company name" value={issuer.companyName} onChange={(v) => setIssuer({ ...issuer, companyName: v })} />
            <Input label="Registered address" value={issuer.registeredAddress} onChange={(v) => setIssuer({ ...issuer, registeredAddress: v })} />
            <Input label="Second address line (works)" value={issuer.worksAddress} onChange={(v) => setIssuer({ ...issuer, worksAddress: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="IS No." value={issuer.isNo} onChange={(v) => setIssuer({ ...issuer, isNo: v })} />
              <Input label="CM/L licence no." value={issuer.cmlNo} onChange={(v) => setIssuer({ ...issuer, cmlNo: v })} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Certificate numbering
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Prefix" value={numbering.prefix} onChange={(v) => setNumbering({ ...numbering, prefix: v.toUpperCase() })} />
              <Input
                label="Digits"
                value={String(numbering.pad)}
                onChange={(v) => setNumbering({ ...numbering, pad: Math.min(6, Math.max(2, Number(v) || 3)) })}
              />
              <Input
                label="Start at"
                value={String(numbering.start)}
                onChange={(v) => setNumbering({ ...numbering, start: Math.max(1, Number(v) || 1) })}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Format:{" "}
              <span className="font-mono">
                {numbering.prefix}/26-27/{String(numbering.start).padStart(numbering.pad, "0")}
              </span>
              . The financial year runs April–March and the counter restarts at the start value each
              April.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pre-filled values
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Default grade" value={defaults.grade} onChange={(v) => setDefaults({ ...defaults, grade: v })} />
              <Input label="Default condition of delivery" value={defaults.conditionOfDelivery} onChange={(v) => setDefaults({ ...defaults, conditionOfDelivery: v })} />
              <Input label="Default tolerances" value={defaults.tolerances} onChange={(v) => setDefaults({ ...defaults, tolerances: v })} />
              <Input label="Prepared by" value={defaults.preparedByName} onChange={(v) => setDefaults({ ...defaults, preparedByName: v })} />
              <Input label="Approved by" value={defaults.approvedByName} onChange={(v) => setDefaults({ ...defaults, approvedByName: v })} />
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Attestation paragraph</span>
              <textarea
                value={defaults.complianceStatement}
                onChange={(e) => setDefaults({ ...defaults, complianceStatement: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-slate-500"
              />
            </label>
          </section>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <button
            onClick={() => {
              setIssuer(DEFAULT_ISSUER);
              setNumbering(DEFAULT_NUMBERING);
              setDefaults(DEFAULT_DEFAULTS);
            }}
            className="text-xs text-slate-500 hover:underline"
          >
            Reset to factory defaults
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={() => void save()}
              disabled={saving}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
      />
    </label>
  );
}
