import type { CertificateData } from "./certificate-schema";
import { makeDefaultCertificateData } from "./certificate-schema";

/**
 * Local storage for certificates and customers.
 *
 * The app is single-PC / offline-first: everything lives in IndexedDB in the
 * browser profile, with a localStorage mirror as a fallback when IndexedDB is
 * unavailable (private windows, locked-down profiles). No server, no login,
 * no network round-trip — so a save either lands in the device's own database
 * or throws where the UI can show it.
 */

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
  id: string; // normalised name, acts as the key
  name: string;
  address: string;
  contact: string;
  gstin: string;
  updated_at: string;
  use_count: number;
};

export type MetaKey =
  | "issuer"
  | "numbering"
  | "defaults"
  | "pin"
  | "last_backup";

const DB_NAME = "sgm-mtc";
const DB_VERSION = 1;
type StoreName = "certificates" | "customers" | "meta";

let dbPromise: Promise<IDBDatabase> | null = null;
let idbBroken = false;

async function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  const attempt = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("certificates")) {
        const certs = db.createObjectStore("certificates", { keyPath: "id" });
        certs.createIndex("by_no", "certificate_no", { unique: false });
        certs.createIndex("by_updated", "updated_at", { unique: false });
      }
      if (!db.objectStoreNames.contains("customers")) {
        db.createObjectStore("customers", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onblocked = () => reject(new Error("IndexedDB blocked by another tab"));
  });

  dbPromise = attempt;
  try {
    return await attempt;
  } catch (err) {
    idbBroken = true;
    dbPromise = null;
    throw err;
  }
}

/* ---------------- localStorage fallback ---------------- */

function lsRead<T>(store: StoreName): T[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(`mtc:${store}`);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function lsWrite<T>(store: StoreName, rows: T[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(`mtc:${store}`, JSON.stringify(rows));
}

/* ---------------- generic helpers ---------------- */

async function withStore<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest | void
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const os = tx.objectStore(store);
    let request: IDBRequest | null = null;
    try {
      request = (fn(os) as IDBRequest) ?? null;
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve((request?.result as T) ?? (undefined as T));
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

async function getAll<T>(store: StoreName): Promise<T[]> {
  if (idbBroken) return lsRead<T>(store);
  try {
    return await withStore<T[]>(store, "readonly", (s) => s.getAll());
  } catch {
    idbBroken = true;
    return lsRead<T>(store);
  }
}

async function put<T extends object>(store: StoreName, value: T, keyPath?: string) {
  if (idbBroken) {
    const rows = lsRead<Record<string, unknown>>(store);
    const key = keyPath ? String((value as Record<string, unknown>)[keyPath]) : "";
    const idx = rows.findIndex((r) => String(r[keyPath ?? "id"]) === key);
    if (idx >= 0) rows[idx] = value as Record<string, unknown>;
    else rows.push(value as Record<string, unknown>);
    lsWrite(store, rows);
    return;
  }
  try {
    await withStore<void>(store, "readwrite", (s) => {
      s.put(value);
    });
  } catch {
    idbBroken = true;
    await put(store, value, keyPath);
  }
}

async function del(store: StoreName, key: string) {
  if (idbBroken) {
    lsWrite(
      store,
      lsRead<Record<string, unknown>>(store).filter((r) => String(r.id) !== key)
    );
    return;
  }
  try {
    await withStore<void>(store, "readwrite", (s) => {
      s.delete(key);
    });
  } catch {
    idbBroken = true;
    await del(store, key);
  }
}

async function getOne<T>(store: StoreName, key: string): Promise<T | undefined> {
  const rows = await getAll<T & { id?: string }>(store);
  return rows.find((r) => r.id === key) as T | undefined;
}

/* ---------------- id ---------------- */

export function newRecordId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/* ---------------- certificates ---------------- */

export async function listCertificates(): Promise<StoredCertificate[]> {
  const rows = await getAll<StoredCertificate>("certificates");
  return rows.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export async function getCertificate(id: string): Promise<StoredCertificate | undefined> {
  return getOne<StoredCertificate>("certificates", id);
}

export async function saveCertificate(record: StoredCertificate): Promise<StoredCertificate> {
  const now = new Date().toISOString();
  const existing = await getCertificate(record.id);
  const next: StoredCertificate = {
    ...record,
    created_at: existing?.created_at ?? record.created_at ?? now,
    updated_at: now,
  };
  await put("certificates", next);
  await rememberCustomer(
    next.customer_name,
    next.data?.header?.toMsAddress ?? "",
    next.data?.header?.customerContact ?? "",
    next.data?.header?.customerGstin ?? ""
  );
  return next;
}

export async function deleteCertificate(id: string): Promise<void> {
  await del("certificates", id);
}

/* ---------------- customers (memory) ---------------- */

export async function listCustomers(): Promise<Customer[]> {
  const rows = await getAll<Customer>("customers");
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function findCustomer(name: string): Promise<Customer | undefined> {
  const key = normalizeName(name);
  if (!key) return undefined;
  const all = await listCustomers();
  return all.find((c) => c.id === key) ?? all.find((c) => c.id.includes(key));
}

export async function rememberCustomer(
  name: string,
  address: string,
  contact = "",
  gstin = ""
): Promise<void> {
  const key = normalizeName(name);
  if (!key || key.length < 2) return;
  const existing = await getOne<Customer>("customers", key);
  const next: Customer = {
    id: key,
    name: name.trim().replace(/\s+/g, " "),
    address: address.trim() || existing?.address || "",
    contact: contact.trim() || existing?.contact || "",
    gstin: gstin.trim() || existing?.gstin || "",
    updated_at: new Date().toISOString(),
    use_count: (existing?.use_count ?? 0) + 1,
  };
  await put("customers", next);
}

export async function saveCustomer(customer: Customer): Promise<void> {
  await put("customers", { ...customer, updated_at: new Date().toISOString() });
}

export async function deleteCustomer(id: string): Promise<void> {
  await del("customers", id);
}

/* ---------------- meta ---------------- */

type MetaRow = { key: string; value: unknown };

export async function getMeta<T>(key: MetaKey, fallback: T): Promise<T> {
  // Meta rows are keyed by `key`, not `id` — getOne() would never match them.
  const rows = await getAll<MetaRow>("meta");
  const row = rows.find((r) => r.key === key);
  if (!row) return fallback;
  return row.value as T;
}

export async function setMeta(key: MetaKey, value: unknown): Promise<void> {
  await put("meta", { key, value } satisfies MetaRow);
}

/* ---------------- backup / restore ---------------- */

export type BackupFile = {
  app: "sgm-mtc";
  version: 1;
  exported_at: string;
  certificates: StoredCertificate[];
  customers: Customer[];
  meta: MetaRow[];
};

export async function exportBackup(): Promise<BackupFile> {
  return {
    app: "sgm-mtc",
    version: 1,
    exported_at: new Date().toISOString(),
    certificates: await getAll<StoredCertificate>("certificates"),
    customers: await getAll<Customer>("customers"),
    meta: await getAll<MetaRow>("meta"),
  };
}

export async function importBackup(file: BackupFile, mode: "merge" | "replace"): Promise<number> {
  if (!file || file.app !== "sgm-mtc") throw new Error("Not an SGM MTC backup file.");

  if (mode === "replace") {
    for (const c of await getAll<StoredCertificate>("certificates")) await del("certificates", c.id);
    for (const c of await getAll<Customer>("customers")) await del("customers", c.id);
  }

  let imported = 0;
  for (const cert of file.certificates ?? []) {
    if (!cert?.id) continue;
    await put("certificates", cert);
    imported += 1;
  }
  for (const cust of file.customers ?? []) {
    if (!cust?.id) continue;
    await put("customers", cust);
  }
  for (const row of file.meta ?? []) {
    if (!row?.key) continue;
    await put("meta", row);
  }
  return imported;
}

/* ---------------- seed ---------------- */

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
