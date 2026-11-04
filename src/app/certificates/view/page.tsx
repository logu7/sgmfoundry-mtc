"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCertificate, ApiError, type StoredCertificate } from "@/lib/db";
import { EditorShell } from "@/components/certificate/editor-shell";
import { CertificateEditor } from "@/components/certificate/certificate-editor";
import { AuthGate } from "@/components/auth-gate";

function ViewInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const [record, setRecord] = useState<StoredCertificate | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) {
      setState("missing");
      return;
    }
    let cancelled = false;
    getCertificate(id)
      .then((r) => {
        if (cancelled) return;
        if (r) setRecord(r);
        else setState("missing");
      })
      .catch((err) => {
        if (cancelled) return;
        setMessage(err instanceof ApiError ? err.message : "Could not load this certificate.");
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state === "missing") {
    return (
      <EditorShell title="Certificate not found">
        <p className="text-sm text-slate-500">
          This certificate is not in the database.{" "}
          <Link href="/" className="text-blue-600 hover:underline">
            Back to the list
          </Link>
          .
        </p>
      </EditorShell>
    );
  }

  if (state === "error") {
    return (
      <EditorShell title="Certificate">
        <p className="text-sm text-red-600">{message}</p>
      </EditorShell>
    );
  }

  return (
    <EditorShell title="Edit Material Test Certificate">
      {record ? <CertificateEditor initial={record} /> : <p className="text-sm text-slate-400">Loading…</p>}
    </EditorShell>
  );
}

export default function CertificateViewPage() {
  return (
    <AuthGate>
      <Suspense fallback={<div className="p-10 text-sm text-slate-400">Loading…</div>}>
        <ViewInner />
      </Suspense>
    </AuthGate>
  );
}
