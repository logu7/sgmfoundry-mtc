"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCertificate, type StoredCertificate } from "@/lib/db";
import { EditorShell } from "@/components/certificate/editor-shell";
import { CertificateEditor } from "@/components/certificate/certificate-editor";

export default function EditCertificatePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [record, setRecord] = useState<StoredCertificate | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id || Array.isArray(id)) return;
    let cancelled = false;
    getCertificate(id).then((r) => {
      if (cancelled) return;
      if (r) setRecord(r);
      else setMissing(true);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (missing) {
    return (
      <EditorShell title="Certificate not found">
        <p className="text-sm text-slate-500">
          This certificate is not in this browser&apos;s database.{" "}
          <Link href="/" className="text-blue-600 hover:underline">
            Back to the list
          </Link>
          .
        </p>
      </EditorShell>
    );
  }

  return (
    <EditorShell title="Edit Material Test Certificate">
      {record ? (
        <CertificateEditor initial={record} />
      ) : (
        <p className="text-sm text-slate-400">Loading…</p>
      )}
    </EditorShell>
  );
}
