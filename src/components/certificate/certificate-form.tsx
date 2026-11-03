"use client";

import {
  makeChemistryBlock,
  makeMicroBlock,
  makeOrderRow,
  type CertificateData,
  type ChemistryBlock,
  type MicroBlock,
  type OrderRow,
} from "@/lib/certificate-schema";
import { CONDITIONS, GRADES, HARDNESS_PRESETS, TENSILE_PRESETS, type Settings } from "@/lib/settings";
import type { Customer } from "@/lib/db";
import { Field } from "./field";
import { CustomerInput } from "./customer-input";

export function CertificateForm({
  data,
  settings,
  customers,
  onChange,
  onRememberCustomer,
}: {
  data: CertificateData;
  settings: Settings;
  customers: Customer[];
  onChange: (next: CertificateData) => void;
  onRememberCustomer: () => void;
}) {
  const setIssuer = (patch: Partial<CertificateData["issuer"]>) =>
    onChange({ ...data, issuer: { ...data.issuer, ...patch } });
  const setHeader = (patch: Partial<CertificateData["header"]>) =>
    onChange({ ...data, header: { ...data.header, ...patch } });
  const setFooter = (patch: Partial<CertificateData["footer"]>) =>
    onChange({ ...data, footer: { ...data.footer, ...patch } });

  const setRow = (id: string, patch: Partial<OrderRow>) =>
    onChange({ ...data, rows: data.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const addRow = () => {
    const row = makeOrderRow();
    onChange({
      ...data,
      rows: [...data.rows, { ...row, grade: settings.defaults.grade, conditionOfDelivery: settings.defaults.conditionOfDelivery, tolerances: settings.defaults.tolerances }],
    });
  };
  const removeRow = (id: string) =>
    onChange({ ...data, rows: data.rows.filter((r) => r.id !== id) });

  const setChem = (id: string, patch: Partial<ChemistryBlock>) =>
    onChange({
      ...data,
      chemistry: data.chemistry.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  const setElement = (
    blockId: string,
    key: string,
    patch: Partial<{ min: string; max: string; actual: string }>
  ) =>
    onChange({
      ...data,
      chemistry: data.chemistry.map((c) =>
        c.id === blockId
          ? { ...c, elements: c.elements.map((e) => (e.key === key ? { ...e, ...patch } : e)) }
          : c
      ),
    });
  const addChem = () => onChange({ ...data, chemistry: [...data.chemistry, makeChemistryBlock()] });
  const removeChem = (id: string) =>
    onChange({ ...data, chemistry: data.chemistry.filter((c) => c.id !== id) });

  const setMicro = (id: string, patch: Partial<MicroBlock>) =>
    onChange({ ...data, micro: data.micro.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const addMicro = () => onChange({ ...data, micro: [...data.micro, makeMicroBlock()] });
  const removeMicro = (id: string) =>
    onChange({ ...data, micro: data.micro.filter((m) => m.id !== id) });

  /** Copy the order rows' heat numbers into Tables A and B, in order. */
  function syncHeatNumbers() {
    const heats = data.rows.map((r) => r.controlUnitNo.trim()).filter(Boolean);
    onChange({
      ...data,
      chemistry: data.chemistry.map((c, i) => ({ ...c, controlUnitNo: heats[i] ?? c.controlUnitNo })),
      micro: data.micro.map((m, i) => ({ ...m, controlUnitNo: heats[i] ?? m.controlUnitNo })),
    });
  }

  return (
    <div className="space-y-4">
      <Section title="Certificate" open>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Test Certificate No."
            value={data.header.tcNo}
            onChange={(v) => setHeader({ tcNo: v })}
            mono
            placeholder="SGM/26-27/001"
          />
          <Field
            label="Dated"
            value={data.header.dated}
            onChange={(v) => setHeader({ dated: v })}
            placeholder="DD.MM.YYYY"
            mono
          />
          <div className="col-span-2">
            <CustomerInput
              value={data.header.toMs}
              address={data.header.toMsAddress}
              customers={customers}
              onChange={(name) => setHeader({ toMs: name })}
              onPick={(c) => {
                setHeader({
                  toMs: c.name,
                  toMsAddress: c.address,
                  customerGstin: c.gstin,
                  customerContact: c.contact,
                });
              }}
            />
            <button
              type="button"
              onClick={onRememberCustomer}
              className="mt-1 text-[11px] text-blue-600 hover:underline"
            >
              Remember this name + address for next time
            </button>
          </div>
          <Field
            label="Customer Address"
            value={data.header.toMsAddress}
            onChange={(v) => setHeader({ toMsAddress: v })}
            as="textarea"
            className="col-span-2"
          />
          <Field
            label="GSTIN"
            value={data.header.customerGstin}
            onChange={(v) => setHeader({ customerGstin: v })}
            mono
          />
          <Field
            label="Contact"
            value={data.header.customerContact}
            onChange={(v) => setHeader({ customerContact: v })}
          />
          <Field
            label="Invoice No."
            value={data.header.invoiceNo}
            onChange={(v) => setHeader({ invoiceNo: v })}
            mono
          />
          <Field
            label="Part No."
            value={data.header.partNo}
            onChange={(v) => setHeader({ partNo: v })}
            mono
          />
          <Field
            label="Part Description"
            value={data.header.partDescription}
            onChange={(v) => setHeader({ partDescription: v })}
            className="col-span-2"
          />
        </div>
      </Section>

      <Section
        title={`TEST RESULTS — ${data.rows.length} order row${data.rows.length === 1 ? "" : "s"}`}
        open
        action={
          <div className="flex gap-2">
            <MiniButton onClick={syncHeatNumbers} label="Sync heat nos." />
            <MiniButton onClick={addRow} label="+ Row" />
          </div>
        }
      >
        <div className="space-y-4">
          {data.rows.map((r, i) => (
            <div key={r.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600">Order {i + 1}</span>
                {data.rows.length > 1 && <RemoveButton onClick={() => removeRow(r.id)} />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Order No. & Date" value={r.orderNoDate} onChange={(v) => setRow(r.id, { orderNoDate: v })} mono />
                <Field label="Nom Size" value={r.nomSize} onChange={(v) => setRow(r.id, { nomSize: v })} mono />
                <Field label="Control Unit No. (Heat No.)" value={r.controlUnitNo} onChange={(v) => setRow(r.id, { controlUnitNo: v })} mono />
                <Field label="Grade" value={r.grade} onChange={(v) => setRow(r.id, { grade: v })} mono list="grade-options" />
                <Field label="Tolerances @ " value={r.tolerances} onChange={(v) => setRow(r.id, { tolerances: v })} />
                <Field label="Quantity (tonnes)" value={r.quantityTonnes} onChange={(v) => setRow(r.id, { quantityTonnes: v })} mono />
                <Field label="Chemical Composition @" value={r.chemicalComposition} onChange={(v) => setRow(r.id, { chemicalComposition: v })} />
                <Field label="Condition of delivery @" value={r.conditionOfDelivery} onChange={(v) => setRow(r.id, { conditionOfDelivery: v })} list="condition-options" />
                <Field label="Tensile Test" value={r.tensileTest} onChange={(v) => setRow(r.id, { tensileTest: v })} mono list="tensile-options" placeholder="e.g. 260 MPa min" />
                <Field label="Hardness" value={r.hardness} onChange={(v) => setRow(r.id, { hardness: v })} mono list="hardness-options" placeholder="e.g. 187-241 HB" />
                <Field label="Transverse test #" value={r.transverseTest} onChange={(v) => setRow(r.id, { transverseTest: v })} />
                <Field label="Hydrostatic test #" value={r.hydrostaticTest} onChange={(v) => setRow(r.id, { hydrostaticTest: v })} />
                <Field label="Micro structure #" value={r.microStructure} onChange={(v) => setRow(r.id, { microStructure: v })} placeholder="Table B" />
                <Field label="Remarks" value={r.remarks} onChange={(v) => setRow(r.id, { remarks: v })} />
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate-500">
            Extra rows make the printer shrink the whole sheet slightly. Up to ~5 rows still prints
            on one landscape A4; the fit badge in the preview tells you the exact scale.
          </p>
        </div>
      </Section>

      <Section
        title={`Table A — Chemical composition (${data.chemistry.length} heat${data.chemistry.length === 1 ? "" : "s"})`}
        action={<MiniButton onClick={addChem} label="+ Heat" />}
      >
        <div className="space-y-4">
          {data.chemistry.map((block, i) => (
            <div key={block.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600">Heat {i + 1}</span>
                {data.chemistry.length > 1 && <RemoveButton onClick={() => removeChem(block.id)} />}
              </div>
              <Field
                label="Control Unit No."
                value={block.controlUnitNo}
                onChange={(v) => setChem(block.id, { controlUnitNo: v })}
                mono
                className="mb-3"
              />
              <div className="space-y-1.5">
                <div className="grid grid-cols-[56px_1fr_1fr_1fr] gap-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  <span />
                  <span>Spec min</span>
                  <span>Spec max</span>
                  <span>Actual</span>
                </div>
                {block.elements.map((el) => (
                  <div key={el.key} className="grid grid-cols-[56px_1fr_1fr_1fr] gap-2 items-center">
                    <span className="text-xs font-semibold text-slate-700">{el.unit}</span>
                    <CompactInput value={el.min} onChange={(v) => setElement(block.id, el.key, { min: v })} />
                    <CompactInput value={el.max} onChange={(v) => setElement(block.id, el.key, { max: v })} />
                    <CompactInput value={el.actual} onChange={(v) => setElement(block.id, el.key, { actual: v })} bold />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={`Table B — Microstructure (${data.micro.length} heat${data.micro.length === 1 ? "" : "s"})`}
        action={<MiniButton onClick={addMicro} label="+ Heat" />}
      >
        <div className="space-y-4">
          {data.micro.map((m, i) => (
            <div key={m.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600">Heat {i + 1}</span>
                {data.micro.length > 1 && <RemoveButton onClick={() => removeMicro(m.id)} />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Control Unit No." value={m.controlUnitNo} onChange={(v) => setMicro(m.id, { controlUnitNo: v })} mono />
                <Field label="Flake Size" value={m.flakeSize} onChange={(v) => setMicro(m.id, { flakeSize: v })} mono />
                <Field label="Graphite Type" value={m.graphiteType} onChange={(v) => setMicro(m.id, { graphiteType: v })} className="col-span-2" />
                <Field label="Pearlite %" value={m.pearlite} onChange={(v) => setMicro(m.id, { pearlite: v })} mono />
                <Field label="Ferrite %" value={m.ferrite} onChange={(v) => setMicro(m.id, { ferrite: v })} mono />
                <Field label="Carbides" value={m.carbides} onChange={(v) => setMicro(m.id, { carbides: v })} className="col-span-2" />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Despatch & sign-off">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Remarks" value={data.footer.remarks} onChange={(v) => setFooter({ remarks: v })} as="textarea" className="col-span-2" />
          <Field label="Wagon No." value={data.footer.wagonNo} onChange={(v) => setFooter({ wagonNo: v })} mono />
          <Field label="Truck No." value={data.footer.truckNo} onChange={(v) => setFooter({ truckNo: v })} mono />
          <Field label="Additional attestation" value={data.footer.complianceStatement} onChange={(v) => setFooter({ complianceStatement: v })} as="textarea" className="col-span-2" />
          <Field label="Prepared By — Name" value={data.footer.preparedByName} onChange={(v) => setFooter({ preparedByName: v })} />
          <Field label="Prepared By — Date" value={data.footer.preparedByDate} onChange={(v) => setFooter({ preparedByDate: v })} mono />
          <Field label="Approved By — Name" value={data.footer.approvedByName} onChange={(v) => setFooter({ approvedByName: v })} />
          <Field label="Approved By — Date" value={data.footer.approvedByDate} onChange={(v) => setFooter({ approvedByDate: v })} mono />
        </div>
      </Section>

      <Section title="Issuer & BIS licence">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company Name" value={data.issuer.companyName} onChange={(v) => setIssuer({ companyName: v })} className="col-span-2" />
          <Field label="Registered / Works Address" value={data.issuer.registeredAddress} onChange={(v) => setIssuer({ registeredAddress: v })} as="textarea" className="col-span-2" />
          <Field label="Second address line (works)" value={data.issuer.worksAddress} onChange={(v) => setIssuer({ worksAddress: v })} className="col-span-2" />
          <Field label="IS No." value={data.issuer.isNo} onChange={(v) => setIssuer({ isNo: v })} mono />
          <Field label="CM/L Licence No." value={data.issuer.cmlNo} onChange={(v) => setIssuer({ cmlNo: v })} mono />
        </div>
      </Section>

      <datalist id="grade-options">
        {GRADES.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <datalist id="condition-options">
        {CONDITIONS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="tensile-options">
        {TENSILE_PRESETS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <datalist id="hardness-options">
        {HARDNESS_PRESETS.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>
      <p className="text-[11px] text-slate-400">
        Defaults: grade {settings.defaults.grade}, delivery {settings.defaults.conditionOfDelivery}.
        Change them in Settings on the dashboard.
      </p>
    </div>
  );
}

function Section({
  title,
  action,
  open,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={open}
      className="group rounded-lg border border-slate-200 bg-white open:shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <div className="flex items-center gap-2">
          {action}
          <span className="text-slate-400 transition-transform group-open:rotate-180">▾</span>
        </div>
      </summary>
      <div className="border-t border-slate-100 p-4">{children}</div>
    </details>
  );
}

function MiniButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium text-red-600 hover:underline"
    >
      Remove
    </button>
  );
}

function CompactInput({
  value,
  onChange,
  bold,
}: {
  value: string;
  onChange: (v: string) => void;
  bold?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-[12px] outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 ${
        bold ? "font-semibold" : ""
      }`}
    />
  );
}
