/**
 * Optional local PIN lock.
 *
 * No cloud login: the operator sets a 4–8 digit PIN on this PC, the PIN is
 * stretched with PBKDF2-SHA256 (150k iterations) and only the hash is kept.
 * Forgetting it means clearing the app's site data — the certificates
 * themselves are never encrypted, so a backup file always restores them.
 */

export type PinRecord = {
  salt: string; // base64
  hash: string; // base64
  iterations: number;
};

const ITERATIONS = 150_000;

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    key,
    256
  );
  return toB64(bits);
}

export async function createPinRecord(pin: string): Promise<PinRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, ITERATIONS);
  return { salt: toB64(salt.buffer), hash, iterations: ITERATIONS };
}

export async function verifyPin(pin: string, record: PinRecord): Promise<boolean> {
  try {
    const hash = await derive(pin, fromB64(record.salt), record.iterations);
    // constant-ish time compare
    if (hash.length !== record.hash.length) return false;
    let diff = 0;
    for (let i = 0; i < hash.length; i += 1) diff |= hash.charCodeAt(i) ^ record.hash.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

const UNLOCK_KEY = "mtc:unlocked";

export function markUnlocked() {
  try {
    sessionStorage.setItem(UNLOCK_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function lockNow() {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* ignore */
  }
}
