import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditorShell } from "@/components/certificate/editor-shell";
import { CertificateEditor } from "@/components/certificate/certificate-editor";
import { duplicateCertificateData, parseCertificateData } from "@/lib/certificate-schema";

export const metadata = { title: "New Certificate — SGM Foundry" };

export default async function NewCertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate_from?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { duplicate_from } = await searchParams;

  let initialData;
  let noticeSourceMissing = false;
  if (duplicate_from) {
    const { data: source } = await supabase
      .from("certificates")
      .select("data")
      .eq("id", duplicate_from)
      .maybeSingle();

    if (source) {
      initialData = duplicateCertificateData(parseCertificateData(source.data));
    } else {
      // Source certificate was deleted or the link is stale — fall back to a
      // blank certificate rather than failing the page.
      noticeSourceMissing = true;
    }
  }

  return (
    <EditorShell title={duplicate_from ? "Duplicate Certificate" : "New Material Test Certificate"}>
      {noticeSourceMissing && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-4 py-2 mb-4">
          The certificate you tried to duplicate could not be found. Starting a blank certificate instead.
        </p>
      )}
      <CertificateEditor initial={initialData ? { data: initialData } : undefined} />
    </EditorShell>
  );
}
