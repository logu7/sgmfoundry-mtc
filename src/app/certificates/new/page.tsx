import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditorShell } from "@/components/certificate/editor-shell";
import { CertificateEditor } from "@/components/certificate/certificate-editor";

export const metadata = { title: "New Certificate — SGM Foundry" };

export default async function NewCertificatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <EditorShell title="New Material Test Certificate">
      <CertificateEditor />
    </EditorShell>
  );
}
