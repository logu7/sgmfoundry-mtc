import { z } from "zod";

/**
 * Certificate schema modelled on the BIS Annexure-I format
 * ("Test Certificate for Grey Iron Castings", IS 210:2009, Para 4 of the
 * Scheme of Inspection and Testing).
 *
 * The 13 columns of the BIS TEST RESULTS table are represented by
 * `orderRowSchema`. Fields we add beyond the BIS minimum (invoice no.,
 * part details, chemical/microstructure detail tables, signatures) are
 * marked EXTRA and kept clearly separate so the BIS layout stays intact.
 */

/* ---------- issuer / licence block ---------- */

export const issuerSchema = z.object({
  companyName: z.string().default("SRI GNANAMURUGAN FOUNDRY"),
  registeredAddress: z
    .string()
    .default("Plot No. 21-C, Cosmafan Foundry Cluster Park-1, Arasur (Post), Coimbatore - 641407"),
  worksAddress: z.string().default(""),
  isNo: z.string().default("IS 210:2009"),
  cmlNo: z.string().default(""), // BIS Certification Marks Licence No. CM/L
});
export type Issuer = z.infer<typeof issuerSchema>;

/* ---------- certificate header ---------- */

export const headerSchema = z.object({
  tcNo: z.string().default(""),
  dated: z.string().default(""),
  toMs: z.string().default(""), // customer name
  toMsAddress: z.string().default(""),
  invoiceNo: z.string().default(""), // EXTRA
  partNo: z.string().default(""), // EXTRA
  partDescription: z.string().default(""), // EXTRA
});
export type Header = z.infer<typeof headerSchema>;

/* ---------- BIS TEST RESULTS row (13 columns) ---------- */

export const orderRowSchema = z.object({
  id: z.string(),
  orderNoDate: z.string().default(""),
  nomSize: z.string().default(""),
  controlUnitNo: z.string().default(""), // a.k.a. heat no.
  grade: z.string().default(""),
  tolerances: z.string().default(""), // @
  quantityTonnes: z.string().default(""),
  chemicalComposition: z.string().default("Table A"), // @ -> detail below
  tensileTest: z.string().default(""),
  hardness: z.string().default(""),
  transverseTest: z.string().default(""), // #
  hydrostaticTest: z.string().default(""), // #
  microStructure: z.string().default("Table B"), // # -> detail below
  conditionOfDelivery: z.string().default(""), // @
  remarks: z.string().default(""),
});
export type OrderRow = z.infer<typeof orderRowSchema>;

/* ---------- EXTRA: Table A, chemical composition detail ---------- */

export const elementRowSchema = z.object({
  key: z.string(),
  unit: z.string(), // "C%", "Si%", ...
  min: z.string().default(""),
  max: z.string().default(""),
  actual: z.string().default(""),
});
export type ElementRow = z.infer<typeof elementRowSchema>;

export const chemistryBlockSchema = z.object({
  id: z.string(),
  controlUnitNo: z.string().default(""),
  elements: z.array(elementRowSchema),
});
export type ChemistryBlock = z.infer<typeof chemistryBlockSchema>;

/* ---------- EXTRA: Table B, microstructure detail ---------- */

export const microBlockSchema = z.object({
  id: z.string(),
  controlUnitNo: z.string().default(""),
  graphiteType: z.string().default(""),
  flakeSize: z.string().default(""),
  pearlite: z.string().default(""),
  ferrite: z.string().default(""),
  carbides: z.string().default(""),
});
export type MicroBlock = z.infer<typeof microBlockSchema>;

/* ---------- despatch + sign-off ---------- */

export const footerSchema = z.object({
  remarks: z.string().default(""),
  wagonNo: z.string().default(""),
  truckNo: z.string().default(""),
  // EXTRA — our own attestation, in addition to the BIS certification paragraph
  complianceStatement: z.string().default(""),
  preparedByName: z.string().default(""), // EXTRA
  preparedByDate: z.string().default(""), // EXTRA
  approvedByName: z.string().default(""), // EXTRA
  approvedByDate: z.string().default(""), // EXTRA
});
export type Footer = z.infer<typeof footerSchema>;

/* ---------- whole document ---------- */

export const certificateDataSchema = z.object({
  issuer: issuerSchema,
  header: headerSchema,
  rows: z.array(orderRowSchema),
  chemistry: z.array(chemistryBlockSchema),
  micro: z.array(microBlockSchema),
  footer: footerSchema,
});
export type CertificateData = z.infer<typeof certificateDataSchema>;

/* ---------- defaults ---------- */

export const ELEMENT_UNITS = ["C%", "Si%", "Mn%", "S%", "P%", "Cr%", "Cu%", "Mg%"] as const;

export function makeElements(): ElementRow[] {
  return ELEMENT_UNITS.map((unit) => ({
    key: unit.replace("%", "").toLowerCase(),
    unit,
    min: "",
    max: "",
    actual: "",
  }));
}

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export function makeOrderRow(): OrderRow {
  return {
    id: newId("row"),
    orderNoDate: "",
    nomSize: "",
    controlUnitNo: "",
    grade: "",
    tolerances: "",
    quantityTonnes: "",
    chemicalComposition: "Table A",
    tensileTest: "",
    hardness: "",
    transverseTest: "",
    hydrostaticTest: "",
    microStructure: "Table B",
    conditionOfDelivery: "",
    remarks: "",
  };
}

export function makeChemistryBlock(): ChemistryBlock {
  return { id: newId("chem"), controlUnitNo: "", elements: makeElements() };
}

export function makeMicroBlock(): MicroBlock {
  return {
    id: newId("micro"),
    controlUnitNo: "",
    graphiteType: "",
    flakeSize: "",
    pearlite: "",
    ferrite: "",
    carbides: "",
  };
}

export const DEFAULT_COMPLIANCE_STATEMENT =
  "We further certify that the castings supplied against the above order have been inspected and found acceptable as per the applicable drawing and purchase order requirements.";

export function makeDefaultCertificateData(): CertificateData {
  return {
    issuer: issuerSchema.parse({}),
    header: headerSchema.parse({}),
    rows: [makeOrderRow()],
    chemistry: [makeChemistryBlock()],
    micro: [makeMicroBlock()],
    footer: footerSchema.parse({ complianceStatement: DEFAULT_COMPLIANCE_STATEMENT }),
  };
}

/**
 * Tolerant parse: merges partial/legacy records over defaults rather than
 * throwing, so an older stored `data` blob still opens in the editor.
 */
export function parseCertificateData(raw: unknown): CertificateData {
  const result = certificateDataSchema.safeParse(raw);
  if (result.success) return result.data;

  const base = makeDefaultCertificateData();
  const partial = (raw ?? {}) as Partial<CertificateData>;

  return {
    issuer: { ...base.issuer, ...(partial.issuer ?? {}) },
    header: { ...base.header, ...(partial.header ?? {}) },
    rows:
      Array.isArray(partial.rows) && partial.rows.length > 0
        ? partial.rows.map((r) => ({ ...makeOrderRow(), ...r }))
        : base.rows,
    chemistry:
      Array.isArray(partial.chemistry) && partial.chemistry.length > 0
        ? partial.chemistry.map((c) => ({
            ...makeChemistryBlock(),
            ...c,
            elements:
              Array.isArray(c?.elements) && c.elements.length > 0 ? c.elements : makeElements(),
          }))
        : base.chemistry,
    micro:
      Array.isArray(partial.micro) && partial.micro.length > 0
        ? partial.micro.map((m) => ({ ...makeMicroBlock(), ...m }))
        : base.micro,
    footer: { ...base.footer, ...(partial.footer ?? {}) },
  };
}
