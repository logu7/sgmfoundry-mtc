import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CertificateListClient } from "@/components/certificate/certificate-list-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: certificates, error } = await supabase
    .from("certificates")
    .select("id, certificate_no, customer_name, heat_number, certificate_date, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Material Test Certificates</h1>
            <p className="text-sm text-slate-500">Sri Gnanamurugan Foundry — QC records</p>
          </div>
          <Link
            href="/certificates/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            New Certificate
          </Link>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-4">
            {error.message}
          </p>
        )}

        <CertificateListClient certificates={certificates ?? []} />
      </div>
    </div>
  );
}
