"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  blankCertificate,
  deleteCertificate,
  getMeta,
  listCertificates,
  listCustomers,
  newRecordId,
  rememberCustomer,
  saveCertificate,
  type Customer,
  type StoredCertificate,
} from "@/lib/db";
import { formatDate, nextCertificateNo, todayISO } from "@/lib/certificate-number";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import type { CertificateData } from "@/lib/certificate-schema";
import { CertificateForm } from "./certificate-form";
import { SheetPreview } from "./sheet-preview";

const DRAFT_KEY = "mtc:draft:new";

export function CertificateEditor({
  initial,
  isNew = false,
}: {
  initial?: StoredCertificate;
  isNew?: boolean;
}) {
  const router = useRouter();
  const [record, setRecord] = useState<StoredCertificate | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [existingNos, setExistingNos] = useState<string[]>([]);
  const [fit, setFit] = useState({ scale: 1, overflow: false });
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [autoNo, setAutoNo] = useState(true);
  const savedAtRef = useRef<string | null>(null);

  /* ---------------- load ---------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [issuer, numbering, defaults, stored, custs] = await Promise.all([
          getMeta("issuer", DEFAULT_SETTINGS.issuer),
          getMeta("numbering", DEFAULT_SETTINGS.numbering),
          getMeta("defaults", DEFAULT_SETTINGS.defaults),
          listCertificates(),
          listCustomers(),
        ]);
        if (cancelled) return;
        const s: Settings = { issuer, numbering, defaults };
        setSettings(s);
        setCustomers(custs);
        setExistingNos(stored.map((c) => c.certificate_no).filter(Boolean));

        if (initial) {
          setRecord(initial);
          setAutoNo(false);
        } else {
          let draft: StoredCertificate | null = null;
          try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) draft = JSON.parse(raw) as StoredCertificate;
          } catch {
            draft = null;
          }
          const base = draft ?? blankCertificate(todayISO());
          const tcNo =
            draft?.certificate_no ||
            nextCertificateNo(
              stored.map((c) => c.certificate_no),
              todayISO(),
              numbering
            );
          const fresh: StoredCertificate = {
            ...base,
            certificate_no: tcNo,
            data: {
              ...base.data,
              issuer: { ...s.issuer, ...(draft ? draft.data.issuer : {}) },
              header: {
                ...base.data.header,
                tcNo,
                dated: base.data.header.dated || formatDate(todayISO()),
              },
              footer: {
                ...base.data.footer,
                preparedByName: base.data.footer.preparedByName || s.defaults.preparedByName,
                approvedByName: base.data.footer.approvedByName || s.defaults.approvedByName,
                preparedByDate: base.data.footer.preparedByDate || formatDate(todayISO()),
                complianceStatement:
                  base.data.footer.complianceStatement || s.defaults.complianceStatement,
              },
              rows: base.data.rows.map((r) => ({
                ...r,
                grade: r.grade || s.defaults.grade,
                conditionOfDelivery: r.conditionOfDelivery || s.defaults.conditionOfDelivery,
                tolerances: r.tolerances || s.defaults.tolerances,
              })),
            },
          };
          setRecord(fresh);
          setAutoNo(true);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not load the certificate.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial]);

  /* ---------------- draft autosave (new certificates only) ---------------- */
  useEffect(() => {
    if (!record || !isNew) return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(record));
      } catch {
        /* quota — ignore */
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [record, isNew]);

  const updateData = useCallback((next: CertificateData) => {
    setRecord((r) => {
      if (!r) return r;
      // A hand-edited number stops following the automatic sequence.
      if (next.header.tcNo !== r.data.header.tcNo) setAutoNo(false);
      return { ...r, data: next };
    });
    setStatus("idle");
  }, []);

  /** Keep the rolling number following the certificate date until edited by hand. */
  useEffect(() => {
    if (!record || !autoNo || !isNew) return;
    const wanted = nextCertificateNo(
      existingNos,
      record.certificate_date || todayISO(),
      settings.numbering
    );
    if (wanted !== record.data.header.tcNo) {
      setRecord((r) =>
        r
          ? {
              ...r,
              certificate_no: wanted,
              data: {
                ...r.data,
                header: {
                  ...r.data.header,
                  tcNo: wanted,
                  dated: r.data.header.dated || formatDate(r.certificate_date),
                },
              },
            }
          : r
      );
    }
  }, [autoNo, existingNos, isNew, record?.certificate_date, settings.numbering, record]);

  const duplicates = useMemo(() => {
    if (!record) return false;
    const no = record.data.header.tcNo.trim().toLowerCase();
    if (!no) return false;
    return existingNos.some((v) => v.trim().toLowerCase() === no) && !initial;
  }, [existingNos, initial, record]);

  const persist = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!record) return null;
      setError(null);
      const data = record.data;
      if (!data.header.tcNo.trim()) {
        setError("Test Certificate No. is required.");
        return null;
      }
      if (!data.header.toMs.trim()) {
        setError("Customer name (To M/s) is required.");
        return null;
      }
      if (duplicates) {
        setError(`Certificate No. ${data.header.tcNo} already exists. Use the next number or edit it.`);
        return null;
      }
      setStatus("saving");
      try {
        const saved = await saveCertificate({
          ...record,
          certificate_no: data.header.tcNo.trim(),
          customer_name: data.header.toMs.trim(),
          heat_numbers: data.rows.map((r) => r.controlUnitNo.trim()).filter(Boolean),
        });
        savedAtRef.current = saved.updated_at;
        setRecord(saved);
        setStatus("saved");
        if (isNew) {
          try {
            localStorage.removeItem(DRAFT_KEY);
          } catch {
            /* ignore */
          }
          router.replace(`/certificates/view/?id=${saved.id}`);
        }
        setCustomers(await listCustomers());
        if (!opts?.silent) {
          const stored = await listCertificates();
          setExistingNos(stored.map((c) => c.certificate_no).filter(Boolean));
        }
        return saved;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not save on the server.");
        setStatus("idle");
        return null;
      }
    },
    [duplicates, isNew, record, router]
  );

  /* ---------------- print ---------------- */
  const printSheet = useCallback(async () => {
    if (!record) return;
    const saved = await persist({ silent: true });
    if (!saved) return;
    try {
      localStorage.setItem(
        "mtc:print",
        JSON.stringify({ data: saved.data, certificateNo: saved.certificate_no })
      );
    } catch {
      setError("Could not prepare the print job (storage full).");
      return;
    }
    window.open("/certificates/print/", "_blank", "noopener");
  }, [persist, record]);

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        void persist();
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        void printSheet();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persist, printSheet]);

  async function handleRemember() {
    if (!record) return;
    const h = record.data.header;
    if (!h.toMs.trim()) return;
    await rememberCustomer(h.toMs, h.toMsAddress, h.customerContact, h.customerGstin);
    setCustomers(await listCustomers());
    setStatus("saved");
  }

  async function handleDuplicate() {
    if (!record) return;
    const all = await listCertificates();
    const tcNo = nextCertificateNo(
      all.map((c) => c.certificate_no),
      todayISO(),
      settings.numbering
    );
    const copy: StoredCertificate = {
      ...record,
      id: newRecordId(),
      certificate_no: tcNo,
      certificate_date: todayISO(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data: {
        ...record.data,
        header: { ...record.data.header, tcNo, dated: formatDate(todayISO()), invoiceNo: "" },
      },
    };
    try {
      await saveCertificate(copy);
      router.push(`/certificates/view/?id=${copy.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not duplicate.");
    }
  }

  async function handleDelete() {
    if (!record) return;
    if (
      !confirm(
        `Delete certificate ${record.data.header.tcNo || record.certificate_no}? This cannot be undone.`
      )
    )
      return;
    try {
      await deleteCertificate(record.id);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete.");
    }
  }

  function regenerateNumber() {
    if (!record) return;
    const wanted = nextCertificateNo(
      existingNos,
      record.certificate_date || todayISO(),
      settings.numbering
    );
    setRecord({
      ...record,
      certificate_no: wanted,
      data: { ...record.data, header: { ...record.data.header, tcNo: wanted } },
    });
    setAutoNo(true);
  }

  if (!record) {
    return <p className="text-sm text-slate-500">{error ?? "Loading certificate…"}</p>;
  }

  const fitLabel = fit.scale > 0.999 ? "fits 1 sheet" : `auto-fit ${Math.round(fit.scale * 100)}%`;
  const fitTone =
    fit.scale > 0.9
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : fit.scale > 0.8
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-red-700 bg-red-50 border-red-200";

  return (
    <div className="flex flex-col xl:flex-row gap-6 min-h-0 flex-1">
      {/* ---------------- left: fields ---------------- */}
      <div className="xl:w-[470px] shrink-0 space-y-4 overflow-y-auto pb-16">
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Record</h3>
            <span className="text-[11px] text-slate-400">
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Unsaved changes"}
            </span>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">
              Certificate date
              {autoNo && isNew ? (
                <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                  numbers roll automatically
                </span>
              ) : null}
            </span>
            <div className="flex gap-2">
              <input
                type="date"
                value={record.certificate_date}
                onChange={(e) => {
                  const date = e.target.value;
                  setRecord((r) =>
                    r
                      ? {
                          ...r,
                          certificate_date: date,
                          data: { ...r.data, header: { ...r.data.header, dated: formatDate(date) } },
                        }
                      : r
                  );
                  setStatus("idle");
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
              {!autoNo || !isNew ? (
                <button
                  type="button"
                  onClick={regenerateNumber}
                  className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Next No.
                </button>
              ) : null}
            </div>
          </label>

          {duplicates ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
              This number already exists.{" "}
              <button className="underline" onClick={regenerateNumber}>
                Use the next one
              </button>
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void persist()}
              disabled={status === "saving"}
              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {status === "saving" ? "Saving…" : "Save  (Ctrl+S)"}
            </button>
            <button
              onClick={() => void printSheet()}
              className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Print / PDF  (Ctrl+P)
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDuplicate}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              Duplicate
            </button>
            {!isNew ? (
              <button
                onClick={handleDelete}
                className="rounded-md border border-red-200 px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <CertificateForm
          data={record.data}
          settings={settings}
          customers={customers}
          onChange={updateData}
          onRememberCustomer={() => void handleRemember()}
        />
      </div>

      {/* ---------------- right: live sheet ---------------- */}
      <div className="flex-1 min-w-0">
        <div className="sticky top-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Live preview — single A4 landscape sheet</p>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${fitTone}`}>
              {fitLabel}
            </span>
          </div>
          <SheetPreview data={record.data} onFit={setFit} />
          <p className="text-[11px] text-slate-400">
            Print dialog: A4, Landscape, Margins = None, Scale = 100% (background graphics on). The
            sheet already fits — do not use “Fit to page”, it would add white borders.
          </p>
        </div>
      </div>
    </div>
  );
}
