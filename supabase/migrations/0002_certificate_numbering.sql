-- Financial-year (Apr-Mar, IST) certificate numbering.
--
-- Numbers are claimed atomically via next_certificate_number(), so two people
-- saving a new certificate at the same moment can never receive the same
-- number. The trade-off: a number is claimed when a new certificate is
-- *opened*, not when it's saved, so an abandoned draft leaves a gap in the
-- sequence rather than risking a collision. This mirrors how a physical
-- numbered certificate book works — a spoiled page is voided, not reused.

create table public.certificate_number_sequences (
  financial_year text primary key,
  last_number integer not null default 0
);
alter table public.certificate_number_sequences enable row level security;
-- No direct policies: only reachable through next_certificate_number() below.

create or replace function public.current_financial_year_label(at_time timestamptz default now())
returns text
language sql
stable
as $$
  select case
    when extract(month from (at_time at time zone 'Asia/Kolkata')) >= 4
      then to_char(at_time at time zone 'Asia/Kolkata', 'YYYY')
        || '-' || to_char((at_time at time zone 'Asia/Kolkata') + interval '1 year', 'YY')
    else to_char((at_time at time zone 'Asia/Kolkata') - interval '1 year', 'YYYY')
        || '-' || to_char(at_time at time zone 'Asia/Kolkata', 'YY')
  end;
$$;

create or replace function public.next_certificate_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  fy text := public.current_financial_year_label(now());
  seq_no integer;
begin
  insert into public.certificate_number_sequences (financial_year, last_number)
  values (fy, 1)
  on conflict (financial_year)
  do update set last_number = certificate_number_sequences.last_number + 1
  returning last_number into seq_no;

  return 'SGMF/TC/' || fy || '/' || lpad(seq_no::text, 4, '0');
end;
$$;

revoke all on function public.current_financial_year_label(timestamptz) from public, anon;
revoke all on function public.next_certificate_number() from public, anon;
grant execute on function public.next_certificate_number() to authenticated;
