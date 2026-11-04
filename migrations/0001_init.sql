-- SGM Foundry MTC — Cloudflare D1 schema.
-- Applied automatically by the Worker on first request; this file exists so the
-- database can also be created/checked by hand:
--   npx wrangler d1 execute sgm-mtc --remote --file=./migrations/0001_init.sql

create table if not exists certificates (
  id text primary key,
  certificate_no text not null,
  customer_name text not null default '',
  certificate_date text,
  heat_numbers text not null default '[]',
  data text not null,
  created_at text not null,
  updated_at text not null
);

create unique index if not exists certificates_no_idx on certificates (certificate_no);
create index if not exists certificates_updated_idx on certificates (updated_at desc);

create table if not exists customers (
  id text primary key,            -- normalised name
  name text not null,
  address text not null default '',
  gstin text not null default '',
  contact text not null default '',
  use_count integer not null default 1,
  updated_at text not null
);

create table if not exists meta (
  key text primary key,           -- issuer | numbering | defaults
  value text not null
);
