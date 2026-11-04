/**
 * Client for the MTC API (Cloudflare Worker + D1).
 *
 * All records live in the shared D1 database behind /api, so every device that
 * opens mtc.sgmfoundry.com sees the same certificates. The browser only holds
 * the session cookie set by the Worker.
 */

import type { CertificateData } from "./certificate-schema";
import { makeDefaultCertificateData } from "./certificate-schema";

export type StoredCertificate = {
  id: string;
  certificate_no: string;
  customer_name: string;
  certificate_date: string;
  heat_numbers: string[];
  data: CertificateData;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  name: string;
  address: string;
  gstin: string;
  contact: string;
  use_count: number;
  updated_at: string;
};

export type MetaKey = "issuer" | "numbering" | "defaults";

export type BackupFile = {
  app: "sgm-mtc";
  version: number;
  exported_at: string;
  certificates: StoredCertificate[];
  customers: Customer[];
  meta: Array<{ key: string; value: unknown }>;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function notifyUnauthorized() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mtc:unauthorized"));
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      ...init,
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check the internet connection.", 0);
  }

  if (res.status === 401) {
    notifyUnauthorized();
    throw new ApiError("Session expired — please sign in again.", 401);
  }

  const text = await res.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    payload = {};
  }
  if (!res.ok) {
    const message = typeof payload.error === "string" ? payload.error : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return payload as T;
}

/* ---------------- session ---------------- */

export async function checkSession(): Promise<boolean> {
  try {
    const data = await req<{ authenticated: boolean }>("/api/session");
    return !!data.authenticated;
  } catch {
    return false;
  }
}

export async function login(password: string): Promise<void> {
  // Not via req(): a 401 here means "wrong password", not "session expired".
  let res: Response;
  try {
    res = await fetch("/api/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check the internet connection.", 0);
  }
  const text = await res.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    payload = {};
  }
  if (!res.ok) {
    throw new ApiError(
      typeof payload.error === "string" ? payload.error : "Could not sign in.",
      res.status
    );
  }
}

export async function logout(): Promise<void> {
  try {
    await req<{ ok: boolean }>("/api/logout", { method: "POST" });
  } finally {
    notifyUnauthorized();
  }
}

/* ---------------- ids / helpers ---------------- */

export function newRecordId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/* ---------------- certificates ---------------- */

export async function listCertificates(): Promise<StoredCertificate[]> {
  const data = await req<{ certificates: StoredCertificate[] }>("/api/certificates");
  return data.certificates ?? [];
}

export async function getCertificate(id: string): Promise<StoredCertificate | undefined> {
  try {
    const data = await req<{ certificate: StoredCertificate }>(
      `/api/certificates/${encodeURIComponent(id)}`
    );
    return data.certificate;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export async function saveCertificate(record: StoredCertificate): Promise<StoredCertificate> {
  const data = await req<{ certificate: StoredCertificate | null }>("/api/certificates", {
    method: "POST",
    body: JSON.stringify({
      id: record.id,
      certificate_no: record.certificate_no,
      customer_name: record.customer_name,
      certificate_date: record.certificate_date,
      heat_numbers: record.heat_numbers,
      data: record.data,
    }),
  });
  return data.certificate ?? record;
}

export async function deleteCertificate(id: string): Promise<void> {
  await req<{ ok: boolean }>(`/api/certificates/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/* ---------------- customers ---------------- */

export async function listCustomers(): Promise<Customer[]> {
  const data = await req<{ customers: Customer[] }>("/api/customers");
  return data.customers ?? [];
}

export async function rememberCustomer(
  name: string,
  address: string,
  contact = "",
  gstin = ""
): Promise<void> {
  if (normalizeName(name).length < 2) return;
  await req<{ ok: boolean }>("/api/customers", {
    method: "POST",
    body: JSON.stringify({ name, address, contact, gstin }),
  });
}

export async function saveCustomer(customer: Customer): Promise<void> {
  await rememberCustomer(customer.name, customer.address, customer.contact, customer.gstin);
}

export async function deleteCustomer(id: string): Promise<void> {
  await req<{ ok: boolean }>("/api/customers", { method: "DELETE", body: JSON.stringify({ id }) });
}

/* ---------------- settings (meta) ---------------- */

let settingsCache: { at: number; value: Record<string, unknown> } | null = null;

async function allSettings(force = false): Promise<Record<string, unknown>> {
  if (!force && settingsCache && Date.now() - settingsCache.at < 5000) return settingsCache.value;
  const data = await req<{ settings: Record<string, unknown> }>("/api/settings");
  settingsCache = { at: Date.now(), value: data.settings ?? {} };
  return settingsCache.value;
}

export async function getMeta<T>(key: MetaKey, fallback: T): Promise<T> {
  try {
    const settings = await allSettings();
    return (settings[key] as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setMeta(key: MetaKey, value: unknown): Promise<void> {
  await req<{ ok: boolean }>("/api/settings", {
    method: "PUT",
    body: JSON.stringify({ [key]: value }),
  });
  settingsCache = null;
}

/* ---------------- backup / restore ---------------- */

export async function exportBackup(): Promise<BackupFile> {
  return req<BackupFile>("/api/backup");
}

export async function importBackup(file: BackupFile, mode: "merge" | "replace"): Promise<number> {
  const data = await req<{ ok: boolean; imported: number }>("/api/restore", {
    method: "POST",
    body: JSON.stringify({ mode, backup: file }),
  });
  return data.imported ?? 0;
}

/* ---------------- new record ---------------- */

export function blankCertificate(dateISO: string): StoredCertificate {
  const now = new Date().toISOString();
  return {
    id: newRecordId(),
    certificate_no: "",
    customer_name: "",
    certificate_date: dateISO,
    heat_numbers: [],
    data: makeDefaultCertificateData(),
    created_at: now,
    updated_at: now,
  };
}
