import { CertificateSheet } from "@/components/certificate/certificate-sheet";
import { parseCertificateData } from "@/lib/certificate-schema";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function decodePayload(payload: string | string[] | undefined): unknown {
  const value = Array.isArray(payload) ? payload[0] : payload;
  if (!value) return undefined;

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

export default async function CertificatePrintPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const data = parseCertificateData(decodePayload(searchParams.data));

  return (
    <main className="bg-white">
      <CertificateSheet data={data} />
    </main>
  );
}
