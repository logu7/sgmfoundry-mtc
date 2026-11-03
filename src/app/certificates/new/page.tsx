import { EditorShell } from "@/components/certificate/editor-shell";
import { CertificateEditor } from "@/components/certificate/certificate-editor";
import { PinGate } from "@/components/pin-gate";

export const metadata = { title: "New Certificate — SGM Foundry" };

export default function NewCertificatePage() {
  return (
    <PinGate>
      <EditorShell title="New Material Test Certificate">
        <CertificateEditor isNew />
      </EditorShell>
    </PinGate>
  );
}
