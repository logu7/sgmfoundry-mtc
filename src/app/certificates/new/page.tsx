import { EditorShell } from "@/components/certificate/editor-shell";
import { CertificateEditor } from "@/components/certificate/certificate-editor";
import { AuthGate } from "@/components/auth-gate";

export const metadata = { title: "New Certificate — SGM Foundry" };

export default function NewCertificatePage() {
  return (
    <AuthGate>
      <EditorShell title="New Material Test Certificate">
        <CertificateEditor isNew />
      </EditorShell>
    </AuthGate>
  );
}
