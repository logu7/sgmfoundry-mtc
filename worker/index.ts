/**
 * SGM Foundry MTC — Cloudflare Worker.
 *
 * Serves the statically exported Next.js app from ./out and a small JSON API
 * backed by D1 (SQLite). One shared database, so every device that opens
 * mtc.sgmfoundry.com sees the same certificates.
 *
 * Auth: one shared password (Worker secret MTC_PASSWORD) exchanged for a signed,
 * HttpOnly session cookie. Nothing is stored client-side except the cookie.
 */

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  MTC_PASSWORD?: string;
  SESSION_SECRET?: string;
}

const COOKIE = "mtc_session";
const SESSION_DAYS = 30;

const enc = new TextEncoder();

/* ---------------- small utils ---------------- */

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

async function signToken(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64url(new Uint8Array(sig));
}

async function makeSession(secret: string): Promise<string> {
  const exp = String(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  return `${exp}.${await signToken(exp, secret)}`;
}

async function validSession(request: Request, secret: string): Promise<boolean> {
  const token = getCookie(request, COOKIE);
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  const expected = await signToken(exp, secret);
  return safeEqual(sig, expected);
}

/* ---------------- schema ---------------- */

const SCHEMA = [
  `create table if not exists certificates (
    id text primary key,
    certificate_no text not null,
    customer_name text not null default '',
    certificate_date text,
    heat_numbers text not null default '[]',
    data text not null,
    created_at text not null,
    updated_at text not null
  )`,
  `create unique index if not exists certificates_no_idx on certificates (certificate_no)`,
  `create index if not exists certificates_updated_idx on certificates (updated_at desc)`,
  `create table if not exists customers (
    id text primary key,
    name text not null,
    address text not null default '',
    gstin text not null default '',
    contact text not null default '',
    use_count integer not null default 1,
    updated_at text not null
  )`,
  `create table if not exists meta (
    key text primary key,
    value text not null
  )`,
];

let schemaReady: Promise<void> | null = null;
function ensureSchema(db: D1Database): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const sql of SCHEMA) await db.prepare(sql).run();
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

/* ---------------- row mapping ---------------- */

type CertRow = {
  id: string;
  certificate_no: string;
  customer_name: string;
  certificate_date: string | null;
  heat_numbers: string;
  data: string;
  created_at: string;
  updated_at: string;
};

function rowToCert(r: CertRow) {
  return {
    id: r.id,
    certificate_no: r.certificate_no,
    customer_name: r.customer_name,
    certificate_date: r.certificate_date ?? "",
    heat_numbers: safeParse<string[]>(r.heat_numbers, []),
    data: safeParse<Record<string, unknown>>(r.data, {}),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/* ---------------- customers ---------------- */

function normalizeName(name: string): string {
  return (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

async function rememberCustomer(
  db: D1Database,
  name: string,
  address = "",
  gstin = "",
  contact = ""
): Promise<void> {
  const id = normalizeName(name);
  if (id.length < 2) return;
  const now = new Date().toISOString();
  await db
    .prepare(
      `insert into customers (id, name, address, gstin, contact, use_count, updated_at)
       values (?, ?, ?, ?, ?, 1, ?)
       on conflict(id) do update set
         name = excluded.name,
         address = case when excluded.address <> '' then excluded.address else customers.address end,
         gstin = case when excluded.gstin <> '' then excluded.gstin else customers.gstin end,
         contact = case when excluded.contact <> '' then excluded.contact else customers.contact end,
         use_count = customers.use_count + 1,
         updated_at = excluded.updated_at`
    )
    .bind(
      id,
      name.trim().replace(/\s+/g, " "),
      (address ?? "").trim(),
      (gstin ?? "").trim(),
      (contact ?? "").trim(),
      now
    )
    .run();
}

/* ---------------- API ---------------- */

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/\/+$/, "");
  const method = request.method.toUpperCase();

  if (!env.DB) return json({ error: "D1 binding DB is missing" }, 500);
  await ensureSchema(env.DB);

  const secret = env.SESSION_SECRET;
  if (!secret) return json({ error: "SESSION_SECRET is not configured" }, 500);

  /* ---- auth endpoints (no session required) ---- */
  if (path === "/api/login" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    const expected = env.MTC_PASSWORD ?? "";
    if (!expected) return json({ error: "MTC_PASSWORD is not configured" }, 500);
    if (!safeEqual(body.password ?? "", expected)) {
      await new Promise((r) => setTimeout(r, 400)); // slow down guessing
      return json({ error: "Wrong password" }, 401);
    }
    const token = await makeSession(secret);
    return json(
      { ok: true },
      200,
      {
        "set-cookie": `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${
          SESSION_DAYS * 24 * 60 * 60
        }`,
      }
    );
  }

  if (path === "/api/logout" && method === "POST") {
    return json({ ok: true }, 200, {
      "set-cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    });
  }

  if (path === "/api/session" && method === "GET") {
    return json({ authenticated: await validSession(request, secret) });
  }

  if (!(await validSession(request, secret))) {
    return json({ error: "Not signed in" }, 401);
  }

  /* ---- certificates ---- */
  if (path === "/api/certificates" && method === "GET") {
    const { results } = await env.DB.prepare(
      "select * from certificates order by updated_at desc"
    ).all<CertRow>();
    return json({ certificates: (results ?? []).map(rowToCert) });
  }

  if (path === "/api/certificates" && method === "POST") {
    const body = (await request.json().catch(() => null)) as null | {
      id?: string;
      certificate_no?: string;
      customer_name?: string;
      certificate_date?: string;
      heat_numbers?: string[];
      data?: unknown;
    };
    if (!body?.id || !body.certificate_no) return json({ error: "id and certificate_no required" }, 400);

    const now = new Date().toISOString();
    const existing = await env.DB.prepare("select created_at from certificates where id = ?")
      .bind(body.id)
      .first<{ created_at: string }>();

    try {
      await env.DB.prepare(
        `insert into certificates (id, certificate_no, customer_name, certificate_date, heat_numbers, data, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do update set
           certificate_no = excluded.certificate_no,
           customer_name = excluded.customer_name,
           certificate_date = excluded.certificate_date,
           heat_numbers = excluded.heat_numbers,
           data = excluded.data,
           updated_at = excluded.updated_at`
      )
        .bind(
          body.id,
          body.certificate_no,
          body.customer_name ?? "",
          body.certificate_date ?? "",
          JSON.stringify(body.heat_numbers ?? []),
          JSON.stringify(body.data ?? {}),
          existing?.created_at ?? now,
          now
        )
        .run();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/UNIQUE/i.test(message)) {
        return json(
          { error: `Certificate No. ${body.certificate_no} already exists on the server.` },
          409
        );
      }
      throw err;
    }

    await rememberCustomer(
      env.DB,
      body.customer_name ?? "",
      (body.data as { header?: { toMsAddress?: string; customerGstin?: string; customerContact?: string } })?.header?.toMsAddress ?? "",
      (body.data as { header?: { customerGstin?: string } })?.header?.customerGstin ?? "",
      (body.data as { header?: { customerContact?: string } })?.header?.customerContact ?? ""
    );

    const row = await env.DB.prepare("select * from certificates where id = ?")
      .bind(body.id)
      .first<CertRow>();
    return json({ certificate: row ? rowToCert(row) : null });
  }

  const certMatch = /^\/api\/certificates\/([^/]+)$/.exec(path);
  if (certMatch) {
    const id = decodeURIComponent(certMatch[1]);
    if (method === "GET") {
      const row = await env.DB.prepare("select * from certificates where id = ?").bind(id).first<CertRow>();
      if (!row) return json({ error: "Not found" }, 404);
      return json({ certificate: rowToCert(row) });
    }
    if (method === "DELETE") {
      await env.DB.prepare("delete from certificates where id = ?").bind(id).run();
      return json({ ok: true });
    }
  }

  /* ---- customers ---- */
  if (path === "/api/customers" && method === "GET") {
    const { results } = await env.DB.prepare(
      "select * from customers order by name asc"
    ).all<{ id: string; name: string; address: string; gstin: string; contact: string; use_count: number; updated_at: string }>();
    return json({ customers: results ?? [] });
  }

  if (path === "/api/customers" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      address?: string;
      gstin?: string;
      contact?: string;
    };
    if (!body.name?.trim()) return json({ error: "name required" }, 400);
    await rememberCustomer(env.DB, body.name, body.address, body.gstin, body.contact);
    return json({ ok: true });
  }

  if (path === "/api/customers" && method === "DELETE") {
    const body = (await request.json().catch(() => ({}))) as { id?: string };
    if (!body.id) return json({ error: "id required" }, 400);
    await env.DB.prepare("delete from customers where id = ?").bind(body.id).run();
    return json({ ok: true });
  }

  /* ---- settings ---- */
  if (path === "/api/settings" && method === "GET") {
    const { results } = await env.DB.prepare("select key, value from meta").all<{ key: string; value: string }>();
    const out: Record<string, unknown> = {};
    for (const row of results ?? []) out[row.key] = safeParse(row.value, null);
    return json({ settings: out });
  }

  if (path === "/api/settings" && method === "PUT") {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    for (const [key, value] of Object.entries(body)) {
      if (!["issuer", "numbering", "defaults"].includes(key)) continue;
      await env.DB.prepare(
        "insert into meta (key, value) values (?, ?) on conflict(key) do update set value = excluded.value"
      )
        .bind(key, JSON.stringify(value))
        .run();
    }
    return json({ ok: true });
  }

  /* ---- backup / restore ---- */
  if (path === "/api/backup" && method === "GET") {
    const certs = await env.DB.prepare("select * from certificates order by updated_at desc").all<CertRow>();
    const customers = await env.DB.prepare("select * from customers").all();
    const meta = await env.DB.prepare("select key, value from meta").all<{ key: string; value: string }>();
    return json({
      app: "sgm-mtc",
      version: 2,
      exported_at: new Date().toISOString(),
      certificates: (certs.results ?? []).map(rowToCert),
      customers: customers.results ?? [],
      meta: (meta.results ?? []).map((m) => ({ key: m.key, value: safeParse(m.value, null) })),
    });
  }

  if (path === "/api/restore" && method === "POST") {
    const body = (await request.json().catch(() => null)) as null | {
      mode?: "merge" | "replace";
      backup?: {
        app?: string;
        certificates?: Array<Record<string, unknown>>;
        customers?: Array<Record<string, unknown>>;
        meta?: Array<{ key: string; value: unknown }>;
      };
    };
    const backup = body?.backup;
    if (!backup || backup.app !== "sgm-mtc") return json({ error: "Not an SGM MTC backup file" }, 400);

    if (body?.mode === "replace") {
      await env.DB.prepare("delete from certificates").run();
      await env.DB.prepare("delete from customers").run();
    }

    let count = 0;
    for (const cert of backup.certificates ?? []) {
      const c = cert as unknown as {
        id?: string;
        certificate_no?: string;
        customer_name?: string;
        certificate_date?: string;
        heat_numbers?: string[];
        data?: unknown;
        created_at?: string;
        updated_at?: string;
      };
      if (!c.id || !c.certificate_no) continue;
      try {
        await env.DB.prepare(
          `insert into certificates (id, certificate_no, customer_name, certificate_date, heat_numbers, data, created_at, updated_at)
           values (?, ?, ?, ?, ?, ?, ?, ?)
           on conflict(id) do update set
             certificate_no = excluded.certificate_no, customer_name = excluded.customer_name,
             certificate_date = excluded.certificate_date, heat_numbers = excluded.heat_numbers,
             data = excluded.data, updated_at = excluded.updated_at`
        )
          .bind(
            c.id,
            c.certificate_no,
            c.customer_name ?? "",
            c.certificate_date ?? "",
            JSON.stringify(c.heat_numbers ?? []),
            JSON.stringify(c.data ?? {}),
            c.created_at ?? new Date().toISOString(),
            c.updated_at ?? new Date().toISOString()
          )
          .run();
        count += 1;
      } catch {
        // duplicate certificate_no in a merge — skip that row, keep going
      }
    }

    for (const customer of backup.customers ?? []) {
      const c = customer as unknown as {
        id?: string;
        name?: string;
        address?: string;
        gstin?: string;
        contact?: string;
        use_count?: number;
        updated_at?: string;
      };
      if (!c.id || !c.name) continue;
      await env.DB.prepare(
        `insert into customers (id, name, address, gstin, contact, use_count, updated_at)
         values (?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do update set name = excluded.name, use_count = excluded.use_count`
      )
        .bind(
          c.id,
          c.name,
          c.address ?? "",
          c.gstin ?? "",
          c.contact ?? "",
          c.use_count ?? 1,
          c.updated_at ?? new Date().toISOString()
        )
        .run();
    }

    for (const row of backup.meta ?? []) {
      if (!row?.key) continue;
      await env.DB.prepare(
        "insert into meta (key, value) values (?, ?) on conflict(key) do update set value = excluded.value"
      )
        .bind(row.key, JSON.stringify(row.value))
        .run();
    }

    return json({ ok: true, imported: count });
  }

  return json({ error: "Unknown API route" }, 404);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        console.error("API error", err);
        return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
      }
    }

    if (url.pathname === "/health") return json({ ok: true });

    const asset = await env.ASSETS.fetch(request);
    // HTML must never be cached: the app changes with every deploy.
    const type = asset.headers.get("content-type") ?? "";
    if (type.includes("text/html")) {
      const headers = new Headers(asset.headers);
      headers.set("cache-control", "no-store");
      return new Response(asset.body, { status: asset.status, headers });
    }
    return asset;
  },
};

export default worker;
