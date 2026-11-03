"use client";

import { useEffect, useState } from "react";
import { CertificateSheet } from "@/components/certificate/certificate-sheet";
import { parseCertificateData, type CertificateData } from "@/lib/certificate-schema";

/**
 * Standalone print view: the editor stages the certificate in localStorage and
 * opens this page in a new window. Only the sheet is on the page, so the
 * browser's print preview has nothing else to paginate — one A4 landscape
 * sheet, no app chrome.
 */
export default function CertificatePrintPage() {
  const [data, setData] = useState<CertificateData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mtc:print");
      if (!raw) {
        setError("Nothing to print yet — open a certificate and press Print.");
        return;
      }
      const parsed = JSON.parse(raw) as { data?: unknown };
      setData(parseCertificateData(parsed.data));
    } catch {
      setError("The print payload could not be read. Go back and press Print again.");
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    const run = async () => {
      try {
        await document.fonts.ready;
      } catch {
        /* ignore */
      }
      // let the sheet's fit pass settle before handing over to the printer
      await new Promise((r) => window.setTimeout(r, 350));
      if (cancelled) return;
      setPrinted(true);
      window.print();
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [data]);

  if (error) {
    return (
      <main style={{ padding: 40, fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#b91c1c" }}>{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ padding: 40, fontFamily: "system-ui, sans-serif", color: "#64748b" }}>
        Preparing sheet…
      </main>
    );
  }

  return (
    <>
      <div
        className="no-print"
        style={{
          padding: "10px 14px",
          fontFamily: "system-ui, sans-serif",
          fontSize: 12,
          color: "#475569",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <button
          onClick={() => window.print()}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            background: "#0f172a",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Print again
        </button>
        <span>
          A4 · Landscape · Margins: None · Scale 100%. The sheet already fits one page; “Fit to page”
          would add white borders.
        </span>
        {printed ? <span style={{ color: "#059669" }}>Print dialog opened.</span> : null}
      </div>
      <main style={{ background: "#fff" }}>
        <CertificateSheet data={data} />
      </main>
    </>
  );
}
