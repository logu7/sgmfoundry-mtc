import { Fragment } from "react";
import type { CertificateData } from "@/lib/certificate-schema";
import { cn } from "@/lib/utils";

/**
 * BIS Annexure-I "Test Certificate for Grey Iron Castings" (IS 210:2009),
 * rendered on a single landscape A4 sheet.
 *
 * Landscape is required by the 13-column TEST RESULTS table: the columns need
 * roughly 228mm of width, which portrait A4 (190mm usable) cannot give without
 * making values unreadable. Landscape gives 277mm usable.
 *
 * Layout is <table>-based rather than CSS Grid, deliberately: tables render
 * consistently across every print/PDF engine, including older ones that
 * silently fall back to block layout for `display: grid`.
 *
 * Height budget (A4 landscape = 210mm tall, 8mm top / 6mm bottom padding
 * => ~196mm usable):
 *   issuer header + ISI panel   ~24mm
 *   title + TC no.              ~15mm
 *   To M/s + Dated              ~10mm
 *   certification paragraph     ~12mm
 *   extras strip                 ~7mm
 *   TEST RESULTS headings        ~8mm
 *   results table (hdr + 1 row) ~24mm  (+~5mm per extra order row)
 *   footnotes                    ~6mm
 *   Tables A & B (side by side) ~30mm
 *   compliance statement         ~8mm
 *   despatch + signatures       ~28mm
 *   -------------------------------
 *   total                      ~172mm, leaving ~24mm slack
 */

const TH = "border border-slate-800 px-1 py-1 font-semibold text-center align-middle";
const TD = "border border-slate-800 px-1 py-1.5 align-top";

export function CertificateSheet({
  data,
  className,
}: {
  data: CertificateData;
  className?: string;
}) {
  const { issuer, header, rows, chemistry, micro, footer } = data;
  const dash = "\u2014";

  return (
    <div
      id="certificate-sheet"
      className={cn("mtc-sheet mtc-sans bg-white text-slate-900 mx-auto", className)}
    >
      {/* ---------- issuer header + ISI panel ---------- */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="w-52 shrink-0" />
        <div className="text-center leading-tight">
          <p className="text-[11px] font-bold">Annexure-I</p>
          <p className="text-[9px]">(Para 4 of the Scheme of Inspection and Testing)</p>
          <p className="text-[13px] font-bold uppercase mt-0.5">{issuer.companyName}</p>
          <p className="text-[9px]">{issuer.registeredAddress || dash}</p>
          {issuer.worksAddress ? <p className="text-[9px]">{issuer.worksAddress}</p> : null}
        </div>
        <div className="w-52 shrink-0 border border-slate-800 p-2 text-[9px] leading-snug">
          <p className="font-semibold">ISI Mark</p>
          <p>With IS No. {issuer.isNo || dash}</p>
          <p>and CM/L no. {issuer.cmlNo || dash}</p>
        </div>
      </div>

      {/* ---------- title ---------- */}
      <div className="text-center leading-tight mb-2">
        <p className="text-[12px] font-bold">Test Certificate for Grey Iron Castings</p>
        <p className="text-[11px] font-bold">According to {issuer.isNo || "IS 210:2009"}</p>
        <p className="text-[10px] mt-0.5">
          TEST CERTIFICATE NO.{" "}
          <span className="mtc-mono font-semibold underline-offset-2 underline">
            {header.tcNo || dash}
          </span>
        </p>
      </div>

      {/* ---------- To M/s + Dated ---------- */}
      <div className="flex items-start justify-between gap-6 text-[10px] mb-2">
        <p className="flex-1">
          <span className="font-semibold">To M/s</span>{" "}
          <span className="underline underline-offset-2">{header.toMs || dash}</span>
          {header.toMsAddress ? (
            <span className="block pl-9 text-[9px] text-slate-600 line-clamp-1">
              {header.toMsAddress}
            </span>
          ) : null}
        </p>
        <p className="shrink-0">
          <span className="font-semibold">Dated</span>{" "}
          <span className="mtc-mono underline underline-offset-2">{header.dated || dash}</span>
        </p>
      </div>

      {/* ---------- BIS certification paragraph ---------- */}
      <p className="text-[9.5px] leading-snug mb-2">
        It is certified that the material described below fully conforms to{" "}
        {issuer.isNo || "IS 210:2009"} Chemical composition and Physical properties of the product,
        as tested in accordance with the Scheme of Inspection and Testing contained in the BIS
        Certification Marks Licence No. CM/L{" "}
        <span className="mtc-mono font-semibold">{issuer.cmlNo || "________"}</span> are as indicated
        below against each order No.
      </p>

      {/* ---------- EXTRA: invoice / part strip ---------- */}
      <div className="flex gap-6 text-[9px] border-y border-slate-300 py-1 mb-2">
        <span>
          <span className="text-slate-500">Invoice No.</span>{" "}
          <span className="mtc-mono">{header.invoiceNo || dash}</span>
        </span>
        <span>
          <span className="text-slate-500">Part No.</span>{" "}
          <span className="mtc-mono">{header.partNo || dash}</span>
        </span>
        <span className="flex-1 line-clamp-1">
          <span className="text-slate-500">Description</span>{" "}
          {header.partDescription || dash}
        </span>
      </div>

      {/* ---------- TEST RESULTS ---------- */}
      <p className="text-center text-[9.5px] font-semibold">
        (PLEASE REFER TO {issuer.isNo || "IS 210:2009"} FOR DETAILS OF SPECIFICATION REQUIREMENTS)
      </p>
      <p className="text-center text-[11px] font-bold underline mb-1">TEST RESULTS</p>

      <table className="w-full border-collapse text-[8.5px] mb-1">
        <colgroup>
          <col style={{ width: "10%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "8%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className={TH} rowSpan={2}>Order No. &amp; Date</th>
            <th className={TH} rowSpan={2}>Nom Size</th>
            <th className={TH} rowSpan={2}>Control Unit No.</th>
            <th className={TH} rowSpan={2}>Grade</th>
            <th className={TH} rowSpan={2}>Tolerances<sup>@</sup></th>
            <th className={TH} rowSpan={2}>Quantity (in tonnes)</th>
            <th className={TH} rowSpan={2}>Chemical Composition<sup>@</sup></th>
            <th className={TH} colSpan={3}>Mechanical Properties</th>
            <th className={TH} rowSpan={2}>Hydrostatic test<sup>#</sup></th>
            <th className={TH} rowSpan={2}>Micro structure<sup>#</sup></th>
            <th className={TH} rowSpan={2}>Condition of delivery<sup>@</sup></th>
            <th className={TH} rowSpan={2}>Remarks</th>
          </tr>
          <tr>
            <th className={TH}>Tensile Test</th>
            <th className={TH}>Hardness</th>
            <th className={TH}>Transverse test<sup>#</sup></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={cn(TD, "mtc-mono")}>{r.orderNoDate || dash}</td>
              <td className={cn(TD, "mtc-mono text-center")}>{r.nomSize || dash}</td>
              <td className={cn(TD, "mtc-mono text-center font-semibold")}>
                {r.controlUnitNo || dash}
              </td>
              <td className={cn(TD, "mtc-mono text-center")}>{r.grade || dash}</td>
              <td className={cn(TD, "text-center")}>{r.tolerances || dash}</td>
              <td className={cn(TD, "mtc-mono text-center")}>{r.quantityTonnes || dash}</td>
              <td className={cn(TD, "text-center")}>{r.chemicalComposition || dash}</td>
              <td className={cn(TD, "mtc-mono text-center")}>{r.tensileTest || dash}</td>
              <td className={cn(TD, "mtc-mono text-center")}>{r.hardness || dash}</td>
              <td className={cn(TD, "text-center")}>{r.transverseTest || dash}</td>
              <td className={cn(TD, "text-center")}>{r.hydrostaticTest || dash}</td>
              <td className={cn(TD, "text-center")}>{r.microStructure || dash}</td>
              <td className={cn(TD, "text-center")}>{r.conditionOfDelivery || dash}</td>
              <td className={cn(TD, "line-clamp-2")}>{r.remarks || dash}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-[8.5px] leading-snug mb-2">
        <p># If required by purchaser</p>
        <p>@ As agreed between the purchaser and the manufacturer</p>
      </div>

      {/* ---------- EXTRA: Table A + Table B side by side ---------- */}
      <div className="flex gap-3 mb-2">
        <div className="flex-1">
          <p className="text-[9px] font-semibold mb-0.5">
            Table A &mdash; Chemical Composition (%)
          </p>
          <table className="w-full border-collapse text-[8.5px]">
            <thead>
              <tr>
                <th className={TH}>Control Unit No.</th>
                {(chemistry[0]?.elements ?? []).map((el) => (
                  <th key={el.key} className={TH}>{el.unit}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chemistry.map((block) => (
                <Fragment key={block.id}>
                  <tr>
                    <td className={cn(TD, "text-center text-slate-500")} rowSpan={2}>
                      <span className="mtc-mono font-semibold">
                        {block.controlUnitNo || dash}
                      </span>
                    </td>
                    {block.elements.map((el) => (
                      <td
                        key={`${block.id}-${el.key}-spec`}
                        className={cn(TD, "text-center text-slate-500 mtc-mono")}
                      >
                        {el.min || el.max ? `${el.min || ""}\u2013${el.max || ""}` : dash}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    {block.elements.map((el) => (
                      <td
                        key={`${block.id}-${el.key}-act`}
                        className={cn(TD, "text-center mtc-mono font-semibold")}
                      >
                        {el.actual || dash}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w-[38%] shrink-0">
          <p className="text-[9px] font-semibold mb-0.5">Table B &mdash; Microstructure</p>
          <table className="w-full border-collapse text-[8.5px]">
            <thead>
              <tr>
                <th className={TH}>Control Unit No.</th>
                <th className={TH}>Graphite Type</th>
                <th className={TH}>Flake Size</th>
                <th className={TH}>Pearlite</th>
                <th className={TH}>Ferrite</th>
                <th className={TH}>Carbides</th>
              </tr>
            </thead>
            <tbody>
              {micro.map((m) => (
                <tr key={m.id}>
                  <td className={cn(TD, "text-center mtc-mono font-semibold")}>
                    {m.controlUnitNo || dash}
                  </td>
                  <td className={cn(TD, "line-clamp-2")}>{m.graphiteType || dash}</td>
                  <td className={cn(TD, "text-center mtc-mono")}>{m.flakeSize || dash}</td>
                  <td className={cn(TD, "text-center mtc-mono")}>{m.pearlite || dash}</td>
                  <td className={cn(TD, "text-center mtc-mono")}>{m.ferrite || dash}</td>
                  <td className={cn(TD, "text-center mtc-mono")}>{m.carbides || dash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- EXTRA: our attestation ---------- */}
      {footer.complianceStatement ? (
        <p className="mtc-serif text-[9.5px] italic text-slate-700 leading-snug border-t border-slate-300 pt-1 mb-2">
          {footer.complianceStatement}
        </p>
      ) : null}

      {/* ---------- despatch + sign-off ---------- */}
      <div className="flex items-end justify-between gap-8 mt-6">
        <div className="text-[9.5px] leading-snug">
          <p>
            <span className="font-semibold">Remarks</span>{" "}
            <span className="line-clamp-1">{footer.remarks || dash}</span>
          </p>
          <p>
            <span className="font-semibold">Wagon No.</span>{" "}
            <span className="mtc-mono">{footer.wagonNo || dash}</span>
          </p>
          <p>
            <span className="font-semibold">Truck No.</span>{" "}
            <span className="mtc-mono">{footer.truckNo || dash}</span>
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-bold uppercase mb-4">
            For {issuer.companyName}
          </p>
          <div className="flex gap-8">
            <SignatureBlock
              title="Prepared By"
              name={footer.preparedByName}
              date={footer.preparedByDate}
            />
            <SignatureBlock
              title="Approved By"
              name={footer.approvedByName}
              date={footer.approvedByDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SignatureBlock({
  title,
  name,
  date,
}: {
  title: string;
  name: string;
  date: string;
}) {
  const dash = "\u2014";
  return (
    <div className="w-40 text-left pt-6">
      <div className="border-t border-slate-800 pt-0.5">
        <p className="text-[9px] font-semibold">{title}</p>
        <p className="text-[8.5px] text-slate-600">
          {name || dash} <span className="mtc-mono">{date}</span>
        </p>
      </div>
    </div>
  );
}
