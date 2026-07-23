import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditorShell } from "@/components/certificate/editor-shell";
import { CertificateEditor } from "@/components/certificate/certificate-editor";
import { parseCertificateData } from "@/lib/certificate-schema";

export const metadata = { title: "Edit Certificate — SGM Foundry" };

export default async function EditCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: record, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !record) notFound();

  return (
    <EditorShell title="Edit Certificate">
      <CertificateEditor
        id={id}
        initial={{
          certificate_no: record.certificate_no ?? "",
          invoice_no: record.invoice_no ?? "",
          certificate_date: record.certificate_date ?? "",
          heat_number: record.heat_number ?? "",
          customer_name: record.customer_name ?? "",
          data: parseCertificateData(record.data),
        }}
      />
    </EditorShell>
  );
}
