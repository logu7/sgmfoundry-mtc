/**
 * API smoke test against a running instance (wrangler dev or production).
 *   BASE_URL=http://127.0.0.1:8787 MTC_PASSWORD=foundry123 node scripts/api-check.mjs
 */

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:8787";
const PASSWORD = process.env.MTC_PASSWORD ?? "foundry123";

let cookie = "";
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function call(path, init = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...(init.headers ?? {}),
    },
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

/* 1. auth */
const bad = await call("/api/login", { method: "POST", body: JSON.stringify({ password: "wrong" }) });
check("wrong password rejected", bad.status === 401, `HTTP ${bad.status}`);

const good = await call("/api/login", { method: "POST", body: JSON.stringify({ password: PASSWORD }) });
check("password accepted and cookie set", good.status === 200 && cookie.startsWith("mtc_session="), `HTTP ${good.status}`);

const session = await call("/api/session");
check("session is valid after login", session.body?.authenticated === true);

/* 2. certificates */
const cert = {
  id: `smoke-${Date.now()}`,
  certificate_no: `SMOKE/${Date.now()}`,
  customer_name: "Smoke Test Castings",
  certificate_date: "2026-11-03",
  heat_numbers: ["H-0001"],
  data: { header: { toMs: "Smoke Test Castings", toMsAddress: "Test address", tcNo: "x" }, rows: [], issuer: {}, chemistry: [], micro: [], footer: {} },
};
const created = await call("/api/certificates", { method: "POST", body: JSON.stringify(cert) });
check("create certificate", created.status === 200 && created.body?.certificate?.id === cert.id, `HTTP ${created.status}`);

const dup = await call("/api/certificates", {
  method: "POST",
  body: JSON.stringify({ ...cert, id: `${cert.id}-2` }),
});
check("duplicate certificate number rejected", dup.status === 409, `HTTP ${dup.status}`);

const list = await call("/api/certificates");
check(
  "certificate is listed",
  Array.isArray(list.body?.certificates) && list.body.certificates.some((c) => c.id === cert.id),
  `${list.body?.certificates?.length ?? 0} rows`
);

const one = await call(`/api/certificates/${cert.id}`);
check("certificate can be fetched by id", one.body?.certificate?.customer_name === "Smoke Test Castings");

/* 3. customer memory */
const customers = await call("/api/customers");
check(
  "customer was remembered from the certificate",
  customers.body?.customers?.some((c) => c.name === "Smoke Test Castings"),
  `${customers.body?.customers?.length ?? 0} customers`
);

/* 4. settings */
const settingsPut = await call("/api/settings", {
  method: "PUT",
  body: JSON.stringify({ numbering: { prefix: "SGM", pad: 3, start: 1 } }),
});
check("settings can be written", settingsPut.status === 200);
const settingsGet = await call("/api/settings");
check("settings read back", settingsGet.body?.settings?.numbering?.prefix === "SGM");

/* 5. backup */
const backup = await call("/api/backup");
check(
  "backup contains the certificate",
  backup.body?.app === "sgm-mtc" && backup.body.certificates.some((c) => c.id === cert.id)
);

/* 6. cleanup */
const del = await call(`/api/certificates/${cert.id}`, { method: "DELETE" });
check("certificate can be deleted", del.status === 200);

/* 7. logout */
const out = await call("/api/logout", { method: "POST" });
cookie = out.body ? "" : cookie;
const after = await call("/api/session");
check("logout ends the session", after.body?.authenticated === false);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
