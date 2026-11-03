import type { Issuer } from "./certificate-schema";
import { DEFAULT_NUMBERING, type Numbering } from "./certificate-number";

/** Defaults the foundry should not have to retype on every certificate. */
export const DEFAULT_ISSUER: Issuer = {
  companyName: "SRI GNANAMURUGAN FOUNDRY",
  registeredAddress:
    "Plot No. 21-C, Cosmafan Foundry Cluster Park-1, Arasur (Post), Coimbatore - 641407",
  worksAddress: "",
  isNo: "IS 210:2009",
  cmlNo: "",
};

export type Defaults = {
  grade: string;
  conditionOfDelivery: string;
  tolerances: string;
  preparedByName: string;
  approvedByName: string;
  complianceStatement: string;
};

export const DEFAULT_DEFAULTS: Defaults = {
  grade: "FG 260",
  conditionOfDelivery: "As cast",
  tolerances: "IS 210:2009",
  preparedByName: "",
  approvedByName: "",
  complianceStatement:
    "We further certify that the castings supplied against the above order have been inspected and found acceptable as per the applicable drawing and purchase order requirements.",
};

export type Settings = {
  issuer: Issuer;
  numbering: Numbering;
  defaults: Defaults;
};

export const DEFAULT_SETTINGS: Settings = {
  issuer: DEFAULT_ISSUER,
  numbering: DEFAULT_NUMBERING,
  defaults: DEFAULT_DEFAULTS,
};

export const GRADES = [
  "FG 150",
  "FG 200",
  "FG 220",
  "FG 260",
  "FG 300",
  "FG 350",
  "FG 400",
];

export const CONDITIONS = [
  "As cast",
  "Stress relieved",
  "Annealed",
  "Normalised",
  "Shot blasted",
  "Primed",
  "Machined",
];

export const TENSILE_PRESETS = ["200 MPa", "220 MPa", "250 MPa", "260 MPa", "300 MPa", "350 MPa"];
export const HARDNESS_PRESETS = ["< 217 HB", "170–229 HB", "187–241 HB", "201–255 HB", "229–285 HB"];
