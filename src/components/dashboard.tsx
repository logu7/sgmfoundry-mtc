"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ApiError,
  deleteCertificate,
  exportBackup,
  getMeta,
  importBackup,
  listCertificates,
  listCustomers,
  logout,
  newRecordId,
  saveCertificate,
  type BackupFile,
  type Customer,
  type StoredCertificate,
} from "@/lib/db";
import { formatDate, nextCertificateNo, todayISO } from "@/lib/certificate-number";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { SettingsModal } from "./settings-modal";

export function Dashboard() {
  const router = useRouter();
  const [certs, setCerts] = useState<StoredCertificate[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [query, setQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, cu, issuer, numbering, defaults] = await Promise.all([
        listCertificates(),
        listCustomers(),
        getMeta("issuer", DEFAULT_SETTINGS.issuer),
        getMeta("numbering", DEFAULT_SETTINGS.numbering),
        getMeta("defaults", DEFAULT_SETTINGS.defaults),
      ]);
      setCerts(c);
      setCustomers(cu);
      setSettings({ issuer, numbering, defaults });
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load certificates.");
      setCerts([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const rows = certs ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) =>
      [c.certificate_no, c.customer_name, ...(c.heat_numbers ?? []), c.data?.header?.invoiceNo, c.data?.header?.partNo]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [certs, query]);

  async function quickPrint(cert: StoredCertificate) {
    try {
      localStorage.setItem("mtc:print", JSON.stringify({ data: cert.data, certificateNo: cert.certificate_no }));
      window.open("/certificates/print/", "_blank", "noopener");
    } catch {
      setMessage("Could not open the print view.");
    }
  }

  async function duplicate(cert: StoredCertificate) {
    const all = certs ?? [];
    const tcNo = nextCertificateNo(all.map((c) => c.certificate_no), todayISO(), settings.numbering);
    const copy: StoredCertificate = {
      ...cert,
      id: newRecordId(),
      certificate_no: tcNo,
      certificate_date: todayISO(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data: {
        ...cert.data,
        header: { ...cert.data.header, tcNo, dated: formatDate(todayISO()), invoiceNo: "" },
      },
    };
    try {
      await saveCertificate(copy);
      router.push(`/certificates/view/?id=${copy.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not duplicate.");
    }
  }

  async function remove(cert: StoredCertificate) {
    if (!confirm(`Delete certificate ${cert.certificate_no}? This cannot be undone.`)) return;
    try {
      await deleteCertificate(cert.id);
      await load();
      setMessage(`Deleted ${cert.certificate_no}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete.");
    }
  }

  async function downloadBackup() {
    try {
      setBusy(true);
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sgm-mtc-backup-${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(`Backup downloaded (${backup.certificates.length} certificates).`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Backup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onImportFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as BackupFile;
      const replace = confirm(
        "OK = replace everything in the shared database with this backup.\nCancel = merge the backup into what is already there."
      );
      setBusy(true);
      const n = await importBackup(parsed, replace ? "replace" : "merge");
      await load();
      setMessage(`Restored ${n} certificates from ${file.name}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not read that backup file.");
    } finally {
      setBusy(false);
    }
  }

  const thisMonth = (certs ?? []).filter(
    (c) => (c.certificate_date ?? "").slice(0, 7) === todayISO().slice(0, 7)
  ).length;
  const nextNo = nextCertificateNo((certs ?? []).map((c) => c.certificate_no), todayISO(), settings.numbering);

  return (
    <div className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Material Test Certificates</h1>
            <p className="text-sm text-slate-500">
              Sri Gnanamurugan Foundry — IS 210:2009 (BIS Annexure-I) · shared cloud database
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Settings
            </button>
            <Link
              href="/certificates/new/"
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              + New Certificate
            </Link>
            <button
              onClick={() => void logout()}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Certificates" value={certs ? String(certs.length) : "—"} />
          <Stat label="This month" value={certs ? String(thisMonth) : "—"} />
          <Stat label="Customers remembered" value={certs ? String(customers.length) : "—"} />
          <Stat label="Next number" value={nextNo} mono />
        </div>

        {message ? (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-700">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700">✕</button>
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">✕</button>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by number, customer, heat no., invoice or part no."
            className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
          <span className="text-xs text-slate-400">
            {certs === null ? "Loading…" : `${filtered.length} of ${certs.length}`}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => void downloadBackup()}
              disabled={busy}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Backup
            </button>
            <label className={`cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 ${busy ? "opacity-50" : ""}`}>
              Restore
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onImportFile(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Certificate No.</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Heat No.</th>
                <th className="px-4 py-2.5">Dated</th>
                <th className="px-4 py-2.5">Updated</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                    <Link href={`/certificates/view/?id=${c.id}`} className="hover:underline">
                      {c.certificate_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>{c.customer_name || "—"}</div>
                    {c.data?.header?.partDescription ? (
                      <div className="text-[11px] text-slate-400">{c.data.header.partDescription}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {(c.heat_numbers ?? []).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{formatDate(c.certificate_date)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(c.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-[11px] font-medium">
                      <button onClick={() => void quickPrint(c)} className="text-slate-700 hover:underline">
                        Print
                      </button>
                      <button onClick={() => void duplicate(c)} className="text-slate-700 hover:underline">
                        Duplicate
                      </button>
                      <Link href={`/certificates/view/?id=${c.id}`} className="text-blue-600 hover:underline">
                        Edit
                      </Link>
                      <button onClick={() => void remove(c)} className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {certs !== null && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-slate-400">
                    {certs.length === 0 ? (
                      <span>
                        No certificates yet.{" "}
                        <Link href="/certificates/new/" className="text-blue-600 hover:underline">
                          Create the first one
                        </Link>
                        .
                      </span>
                    ) : (
                      "Nothing matches that search."
                    )}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
          Records are stored in the foundry&apos;s Cloudflare D1 database and are shared by everyone
          who signs in. The Backup button downloads a JSON snapshot; keep one off-site.
        </p>
      </div>

      {showSettings ? (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSaved={(s) => {
            setSettings(s);
            setMessage("Settings saved.");
          }}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold text-slate-900 ${mono ? "font-mono text-sm" : ""}`}>
        {value}
      </div>
    </div>
  );
}
