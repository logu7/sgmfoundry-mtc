"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  makeDefaultCertificateData,
  parseCertificateData,
  type CertificateData,
} from "@/lib/certificate-schema";
import { formatDateDDMMYY } from "@/lib/date-format";
import { CertificateForm } from "./certificate-form";
import { CertificateSheet } from "./certificate-sheet";

export type CertificateRecordFields = {
  certificate_no: string;
  invoice_no: string;
  certificate_date: string;
  heat_number: string;
  customer_name: string;
  data: CertificateData;
};

const emptyRecord: CertificateRecordFields = {
  certificate_no: "",
  invoice_no: "",
  certificate_date: new Date().toISOString().slice(0, 10),
  heat_number: "",
  customer_name: "",
  data: makeDefaultCertificateData(),
};

export function CertificateEditor({
  id,
  initial,
}: {
  id?: string;
  initial?: Partial<CertificateRecordFields>;
}) {
  const router = useRouter();
  const isNew = !id;
  const [fields, setFields] = useState<CertificateRecordFields>({
    ...emptyRecord,
    ...initial,
    data: parseCertificateData(initial?.data ?? {}),
  });
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [assigningNumber, setAssigningNumber] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setupRanRef = useRef(false);

  function updateTopField<K extends keyof CertificateRecordFields>(
    key: K,
    value: CertificateRecordFields[K]
  ) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function updateData(next: CertificateData) {
    setFields((f) => ({ ...f, data: next }));
  }

  async function assignNewNumber() {
    setAssigningNumber(true);
    try {
      const supabase = createClient();
      const { data: rpcData, error: rpcError } = await supabase.rpc("next_certificate_number");
      if (rpcError) {
        // Leave the field as-is; the person can still type a number manually.
        console.error("Could not claim a certificate number", rpcError);
        return;
      }
      setFields((f) => ({ ...f, data: { ...f.data, header: { ...f.data.header, tcNo: rpcData as string } } }));
    } finally {
      setAssigningNumber(false);
    }
  }

  // For a brand-new certificate only: claim a certificate number and fill in
  // today's date on the fields that would otherwise print blank. Editing an
  // existing (already-issued) certificate never touches these automatically.
  useEffect(() => {
    if (!isNew || setupRanRef.current) return;
    setupRanRef.current = true;

    const today = formatDateDDMMYY();
    setFields((f) => ({
      ...f,
      data: {
        ...f.data,
        header: { ...f.data.header, dated: f.data.header.dated || today },
        footer: {
          ...f.data.footer,
          preparedByDate: f.data.footer.preparedByDate || today,
          approvedByDate: f.data.footer.approvedByDate || today,
        },
      },
    }));

    if (!fields.data.header.tcNo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: claims a number from the server-side sequence once; the setState happens after an await, not synchronously in the effect body
      void assignNewNumber();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew]);

  // Keep the searchable list columns in sync with the BIS document body.
  function derivedColumns(d: CertificateData) {
    return {
      certificate_no: d.header.tcNo,
      invoice_no: d.header.invoiceNo,
      certificate_date: fields.certificate_date,
      heat_number: d.rows[0]?.controlUnitNo ?? "",
      customer_name: d.header.toMs,
    };
  }

  async function handleSave() {
    setError(null);
    if (!fields.data.header.tcNo.trim()) {
      setError("Test Certificate No. is required.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const derived = derivedColumns(fields.data);
      const payload = {
        certificate_no: derived.certificate_no,
        invoice_no: derived.invoice_no || null,
        certificate_date: derived.certificate_date || null,
        heat_number: derived.heat_number || null,
        customer_name: derived.customer_name || null,
        data: fields.data,
      };

      const result = id
        ? await supabase.from("certificates").update(payload).eq("id", id)
        : await supabase
            .from("certificates")
            .insert({ ...payload, created_by: userRes.user?.id ?? null });

      if (result.error) {
        const isDuplicate =
          result.error.code === "23505" || /certificate_no/i.test(result.error.message);
        setError(
          isDuplicate
            ? `Certificate No. "${derived.certificate_no}" is already in use. Choose a different number, or click "New No." to get the next one in sequence.`
            : result.error.message
        );
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/certificates/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: fields.data, certificateNo: fields.data.header.tcNo }),
      });
      if (!res.ok) {
        setError("Could not generate PDF. Please try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fields.data.header.tcNo || "certificate"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-0 flex-1">
      {/* left: editable fields */}
      <div className="lg:w-[420px] shrink-0 space-y-6 overflow-y-auto pb-10">
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Record</h3>
          <TopField
            label="Filing date"
            value={fields.certificate_date}
            onChange={(v) => updateTopField("certificate_date", v)}
            type="date"
          />
          <p className="text-xs text-slate-500">
            Certificate No., customer and heat no. are taken from the certificate below.
          </p>
        </div>

        <CertificateForm
          data={fields.data}
          onChange={updateData}
          onAssignNewNumber={isNew ? assignNewNumber : undefined}
          assigningNumber={assigningNumber}
        />
      </div>

      {/* right: live preview, sticky */}
      <div className="flex-1 min-w-0">
        <div className="sticky top-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Live preview — single A4 landscape sheet</p>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {downloading ? "Generating…" : "Download PDF"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Certificate"}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <div className="overflow-auto rounded-md bg-slate-200 p-6">
            <CertificateSheet data={fields.data} className="mtc-sheet-preview shadow-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TopField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
      />
    </label>
  );
}
