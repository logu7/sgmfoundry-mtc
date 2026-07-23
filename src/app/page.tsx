import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5">Certificate No.</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Heat No.</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {certificates?.length ? (
                certificates.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{c.certificate_no}</td>
                    <td className="px-4 py-3 text-slate-600">{c.customer_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{c.heat_number || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{c.certificate_date || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/certificates/${c.id}`} className="text-blue-600 hover:underline text-xs font-medium">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No certificates yet. Create your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
