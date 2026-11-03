"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { CertificateData } from "@/lib/certificate-schema";

/**
 * BIS Annexure-I "Test Certificate for Grey Iron Castings" (IS 210:2009),
 * laid out to match the printed BIS form on one A4 landscape sheet.
 *
 * The sheet is a fixed 297mm x 210mm box. The content inside is measured after
 * every render and, if it would overflow, scaled down (never up) by the
 * smallest factor that keeps it inside the printable area. That is what makes
 * "one sheet, every time" a property of the component rather than a hope about
 * how many order rows someone typed.
 */

const COL_WIDTHS = [
  "12%", "5.6%", "7.2%", "5.8%", "6.6%", "6.4%", "9.6%",
  "6.2%", "6%", "6.8%", "7%", "6.4%", "7.4%", "7%",
];

export function CertificateSheet({
  data,
  onFit,
  className,
}: {
  data: CertificateData;
  onFit?: (info: { scale: number; overflow: boolean }) => void;
  className?: string;
}) {
  const { issuer, header, rows, chemistry, micro, footer } = data;
  const sheetRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const fit = useCallback(() => {
    const sheet = sheetRef.current;
    const body = bodyRef.current;
    if (!sheet || !body) return;

    const cs = getComputedStyle(sheet);
    const availH =
      sheet.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const availW =
      sheet.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (availH <= 0 || availW <= 0) return;

    body.style.transform = "none";
    body.style.width = "100%";

    // Damped fixed point: body is laid out at 100/s % so that after scaling by
    // s it is exactly the printable width. Widening the layout makes text wrap
    // less, which changes the height the scale has to satisfy — hence iterate.
    let s = 1;
    for (let i = 0; i < 7; i += 1) {
      body.style.width = `${(100 / s).toFixed(3)}%`;
      body.style.transform = "none";
      const naturalH = body.scrollHeight;
      const fitted = Math.min(1, availH / Math.max(naturalH, 1));
      const next = Math.max(0.5, Math.min(1, s + (fitted - s) * 0.7));
      if (Math.abs(next - s) < 0.004) {
        s = next;
        break;
      }
      s = next;
    }

    s = Math.max(0.5, Math.min(1, s));
    body.style.transform = `scale(${s.toFixed(4)})`;
    body.style.width = `${(100 / s).toFixed(3)}%`;
    setScale(s);
    onFit?.({ scale: s, overflow: s < 0.999 });
  }, [onFit]);

  useEffect(() => {
    fit();
    const ro = new ResizeObserver(() => fit());
    if (sheetRef.current) ro.observe(sheetRef.current);
    if (bodyRef.current) ro.observe(bodyRef.current);
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => fit()).catch(() => {});
    }
    const t = window.setTimeout(fit, 120);
    return () => {
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, [fit, data]);

  const dash = "\u2014";

  return (
    <div ref={sheetRef} id="certificate-sheet" className={`mtc-sheet ${className ?? ""}`}>
      <div ref={bodyRef} className="mtc-body" data-scale={scale.toFixed(3)}>
        {/* ---------------- annexure header + ISI box ---------------- */}
        <div className="mtc-head">
          <div />
          <div className="mtc-head-center">
            <div className="mtc-annex">Annexure-I</div>
            <div className="mtc-annex-sub">(Para 4 of the Scheme of Inspection and Testing)</div>
            <div className="mtc-company">{issuer.companyName || dash}</div>
            <div className="mtc-company-addr">{issuer.registeredAddress || dash}</div>
            {issuer.worksAddress ? (
              <div className="mtc-company-addr">{issuer.worksAddress}</div>
            ) : null}
          </div>
          <div className="mtc-isi">
            <div className="mtc-isi-title">ISI Mark</div>
            <div>With IS No. {issuer.isNo || dash}</div>
            <div>and CM/L no. {issuer.cmlNo || "\u00a0".repeat(10)}</div>
          </div>
        </div>

        {/* ---------------- title ---------------- */}
        <div className="mtc-title">
          <div className="mtc-title-main">Test Certificate for Grey Iron Castings</div>
          <div className="mtc-title-sub">According to {issuer.isNo || "IS 210:2009"}</div>
          <div className="mtc-tcno">
            <span>TEST CERTIFICATE NO.</span>
            <span className="mtc-tcno-value">{header.tcNo || "\u00a0"}</span>
          </div>
        </div>

        {/* ---------------- To M/s + Dated ---------------- */}
        <div className="mtc-toms">
          <div>
            <div className="mtc-line">
              <span>To M/s</span>
              <span className="mtc-line-fill">{header.toMs || "\u00a0"}</span>
            </div>
            {header.toMsAddress ? (
              <div className="mtc-cust-addr">{header.toMsAddress}</div>
            ) : null}
            {header.customerGstin || header.customerContact ? (
              <div className="mtc-cust-meta">
                {header.customerGstin ? `GSTIN: ${header.customerGstin}` : ""}
                {header.customerGstin && header.customerContact ? "   |   " : ""}
                {header.customerContact ? `Contact: ${header.customerContact}` : ""}
              </div>
            ) : null}
          </div>
          <div className="mtc-line">
            <span>Dated</span>
            <span className="mtc-line-fill mtc-line-dated">{header.dated || "\u00a0"}</span>
          </div>
        </div>

        {/* ---------------- certification paragraph ---------------- */}
        <p className="mtc-cert-para">
          It is certified that the material described below fully conforms to{" "}
          {issuer.isNo || "IS 210:2009"} Chemical composition and Physical properties of the
          product, as tested in accordance with the Scheme of Inspection and Testing contained in
          the BIS Certification Marks Licence No. CM/L{" "}
          <span className="mtc-blank mtc-blank-sm">{issuer.cmlNo || "\u00a0"}</span> are as
          indicated below against each order No.
        </p>

        <p className="mtc-ref">
          (PLEASE REFER TO {issuer.isNo || "IS 210:2009"} FOR DETAILS OF SPECIFICATION
          REQUIREMENTS)
        </p>
        <p className="mtc-results-title">TEST RESULTS</p>

        {/* ---------------- BIS results table ---------------- */}
        <table className="mtc-table">
          <colgroup>
            {COL_WIDTHS.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2}>Order No. &amp; Date</th>
              <th rowSpan={2}>Nom Size</th>
              <th rowSpan={2}>Control Unit No.</th>
              <th rowSpan={2}>Grade</th>
              <th rowSpan={2}>
                Tolerances<sup>@</sup>
              </th>
              <th rowSpan={2}>Quantity (in tonnes)</th>
              <th rowSpan={2}>
                Chemical Composition<sup>@</sup>
              </th>
              <th colSpan={3}>Mechanical Properties</th>
              <th rowSpan={2}>
                Hydrostatic test<sup>#</sup>
              </th>
              <th rowSpan={2}>
                Micro structure<sup>#</sup>
              </th>
              <th rowSpan={2}>
                Condition of delivery<sup>@</sup>
              </th>
              <th rowSpan={2}>Remarks</th>
            </tr>
            <tr>
              <th>Tensile Test</th>
              <th>Hardness</th>
              <th>
                Transverse test<sup>#</sup>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="c">{r.orderNoDate || "\u00a0"}</td>
                <td className="c">{r.nomSize || "\u00a0"}</td>
                <td className="c">{r.controlUnitNo || "\u00a0"}</td>
                <td className="c">{r.grade || "\u00a0"}</td>
                <td className="c">{r.tolerances || "\u00a0"}</td>
                <td className="c">{r.quantityTonnes || "\u00a0"}</td>
                <td className="c">{r.chemicalComposition || "\u00a0"}</td>
                <td className="c">{r.tensileTest || "\u00a0"}</td>
                <td className="c">{r.hardness || "\u00a0"}</td>
                <td className="c">{r.transverseTest || "\u00a0"}</td>
                <td className="c">{r.hydrostaticTest || "\u00a0"}</td>
                <td className="c">{r.microStructure || "\u00a0"}</td>
                <td className="c">{r.conditionOfDelivery || "\u00a0"}</td>
                <td className="c">{r.remarks || "\u00a0"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mtc-notes">
          <div># If required by purchaser</div>
          <div>@ As agreed between the purchaser and the manufacturer</div>
        </div>

        {/* ---------------- EXTRA: Table A + Table B ---------------- */}
        <div className="mtc-extras">
          <div>
            <div className="mtc-mini-title">
              Table A &mdash; Chemical Composition (%)
              <span className="mtc-mini-note"> &nbsp;upper row: specified, lower row: actual</span>
            </div>
            <table className="mtc-mini">
              <colgroup>
                <col style={{ width: "19%" }} />
                {(chemistry[0]?.elements ?? []).map((el) => (
                  <col key={el.key} style={{ width: `${81 / Math.max(chemistry[0]?.elements.length ?? 8, 1)}%` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th>Control Unit No.</th>
                  {(chemistry[0]?.elements ?? []).map((el) => (
                    <th key={el.key}>{el.unit}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chemistry.map((block) => (
                  <Fragment key={block.id}>
                    <tr>
                      <td className="cu" rowSpan={2}>
                        {block.controlUnitNo || "\u00a0"}
                      </td>
                      {block.elements.map((el) => (
                        <td key={`${block.id}-${el.key}-s`} className="spec">
                          {el.min || el.max ? `${el.min || ""}${el.min && el.max ? "\u2013" : ""}${el.max || ""}` : "\u00a0"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      {block.elements.map((el) => (
                        <td key={`${block.id}-${el.key}-a`} className="act">
                          {el.actual || "\u00a0"}
                        </td>
                      ))}
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <div className="mtc-mini-title">Table B &mdash; Microstructure</div>
            <table className="mtc-mini">
              <colgroup>
                <col style={{ width: "22%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Control Unit No.</th>
                  <th>Graphite Type</th>
                  <th>Flake Size</th>
                  <th>Pearlite</th>
                  <th>Ferrite</th>
                  <th>Carbides</th>
                </tr>
              </thead>
              <tbody>
                {micro.map((m) => (
                  <tr key={m.id}>
                    <td className="cu">{m.controlUnitNo || "\u00a0"}</td>
                    <td>{m.graphiteType || "\u00a0"}</td>
                    <td>{m.flakeSize || "\u00a0"}</td>
                    <td>{m.pearlite || "\u00a0"}</td>
                    <td>{m.ferrite || "\u00a0"}</td>
                    <td>{m.carbides || "\u00a0"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {footer.complianceStatement ? (
          <p className="mtc-attest">{footer.complianceStatement}</p>
        ) : null}

        <div className="mtc-spacer" />

        {/* ---------------- despatch + sign-off ---------------- */}
        <div className="mtc-foot">
          <div className="mtc-despatch">
            <div className="mtc-line">
              <span>Remarks</span>
              <span className="mtc-line-fill">{footer.remarks || "\u00a0"}</span>
            </div>
            <div className="mtc-line">
              <span>Wagon No.</span>
              <span className="mtc-line-fill">{footer.wagonNo || "\u00a0"}</span>
            </div>
            <div className="mtc-line">
              <span>Truck No.</span>
              <span className="mtc-line-fill">{footer.truckNo || "\u00a0"}</span>
            </div>
          </div>

          <div>
            <div className="mtc-for">For {issuer.companyName || dash}</div>
            <div className="mtc-signs">
              <div className="mtc-sign">
                <div className="mtc-sign-role">Prepared By</div>
                <div>{footer.preparedByName || "\u00a0"}</div>
                <div>{footer.preparedByDate || "\u00a0"}</div>
              </div>
              <div className="mtc-sign">
                <div className="mtc-sign-role">Approved By</div>
                <div>{footer.approvedByName || "\u00a0"}</div>
                <div>{footer.approvedByDate || "\u00a0"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
