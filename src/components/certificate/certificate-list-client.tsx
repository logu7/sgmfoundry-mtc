"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type CertificateListRow = {
  id: string;
  certificate_no: string | null;
  customer_name: string | null;
  heat_number: string | null;
  certificate_date: string | null;
};

export function CertificateListClient({ certificates }: { certificates: CertificateListRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter((c) =>
      [c.certificate_no, c.customer_name, c.heat_number].some((field) =>
        (field ?? "").toLowerCase().includes(q)
      )
    );
  }, [certificates, query]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search certificate no., customer, or heat no."
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {query && (
          <p className="text-xs text-slate-500">
            {filtered.length} of {certificates.length} certificate{certificates.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

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
            {filtered.length ? (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.certificate_no}</td>
                  <td className="px-4 py-3 text-slate-600">{c.customer_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{c.heat_number || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.certificate_date || "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/certificates/new?duplicate_from=${c.id}`}
                      className="text-slate-500 hover:underline text-xs font-medium mr-4"
                      title="Create a new certificate pre-filled from this one (heat no. and test results are cleared)"
                    >
                      Duplicate
                    </Link>
                    <Link href={`/certificates/${c.id}`} className="text-blue-600 hover:underline text-xs font-medium">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  {certificates.length === 0
                    ? "No certificates yet. Create your first one."
                    : "No certificates match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
