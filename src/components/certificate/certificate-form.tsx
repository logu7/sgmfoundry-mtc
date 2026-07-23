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
import { Field } from "./field";

export function CertificateForm({
  data,
  onChange,
}: {
  data: CertificateData;
  onChange: (next: CertificateData) => void;
}) {
  const setIssuer = (patch: Partial<CertificateData["issuer"]>) =>
    onChange({ ...data, issuer: { ...data.issuer, ...patch } });
  const setHeader = (patch: Partial<CertificateData["header"]>) =>
    onChange({ ...data, header: { ...data.header, ...patch } });
  const setFooter = (patch: Partial<CertificateData["footer"]>) =>
    onChange({ ...data, footer: { ...data.footer, ...patch } });

  const setRow = (id: string, patch: Partial<OrderRow>) =>
    onChange({
      ...data,
      rows: data.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  const addRow = () => onChange({ ...data, rows: [...data.rows, makeOrderRow()] });
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

  return (
    <div className="space-y-6">
      <FormSection title="Issuer & BIS licence">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company Name" value={data.issuer.companyName} onChange={(v) => setIssuer({ companyName: v })} className="col-span-2" />
          <Field label="Registered / Works Address" value={data.issuer.registeredAddress} onChange={(v) => setIssuer({ registeredAddress: v })} as="textarea" className="col-span-2" />
          <Field label="IS No." value={data.issuer.isNo} onChange={(v) => setIssuer({ isNo: v })} mono />
          <Field label="CM/L Licence No." value={data.issuer.cmlNo} onChange={(v) => setIssuer({ cmlNo: v })} mono />
        </div>
      </FormSection>

      <FormSection title="Certificate header">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Test Certificate No." value={data.header.tcNo} onChange={(v) => setHeader({ tcNo: v })} mono />
          <Field label="Dated" value={data.header.dated} onChange={(v) => setHeader({ dated: v })} placeholder="DD.MM.YY" mono />
          <Field label="To M/s (customer)" value={data.header.toMs} onChange={(v) => setHeader({ toMs: v })} className="col-span-2" />
          <Field label="Customer Address" value={data.header.toMsAddress} onChange={(v) => setHeader({ toMsAddress: v })} as="textarea" className="col-span-2" />
          <Field label="Invoice No." value={data.header.invoiceNo} onChange={(v) => setHeader({ invoiceNo: v })} mono />
          <Field label="Part No." value={data.header.partNo} onChange={(v) => setHeader({ partNo: v })} mono />
          <Field label="Part Description" value={data.header.partDescription} onChange={(v) => setHeader({ partDescription: v })} className="col-span-2" />
        </div>
      </FormSection>

      <FormSection
        title="Test results (BIS table)"
        action={<AddButton onClick={addRow} label="Add order row" />}
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
                <Field label="Grade" value={r.grade} onChange={(v) => setRow(r.id, { grade: v })} mono />
                <Field label="Tolerances @" value={r.tolerances} onChange={(v) => setRow(r.id, { tolerances: v })} />
                <Field label="Quantity (tonnes)" value={r.quantityTonnes} onChange={(v) => setRow(r.id, { quantityTonnes: v })} mono />
                <Field label="Chemical Composition @" value={r.chemicalComposition} onChange={(v) => setRow(r.id, { chemicalComposition: v })} />
                <Field label="Condition of delivery @" value={r.conditionOfDelivery} onChange={(v) => setRow(r.id, { conditionOfDelivery: v })} />
                <Field label="Tensile Test" value={r.tensileTest} onChange={(v) => setRow(r.id, { tensileTest: v })} mono />
                <Field label="Hardness" value={r.hardness} onChange={(v) => setRow(r.id, { hardness: v })} mono />
                <Field label="Transverse test #" value={r.transverseTest} onChange={(v) => setRow(r.id, { transverseTest: v })} />
                <Field label="Hydrostatic test #" value={r.hydrostaticTest} onChange={(v) => setRow(r.id, { hydrostaticTest: v })} />
                <Field label="Micro structure #" value={r.microStructure} onChange={(v) => setRow(r.id, { microStructure: v })} />
                <Field label="Remarks" value={r.remarks} onChange={(v) => setRow(r.id, { remarks: v })} />
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection
        title="Table A — Chemical composition"
        action={<AddButton onClick={addChem} label="Add heat" />}
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
              <div className="space-y-2">
                {block.elements.map((el) => (
                  <div key={el.key} className="grid grid-cols-4 gap-2 items-end">
                    <span className="text-xs font-medium text-slate-600 pb-1.5">{el.unit}</span>
                    <Field label="Min" value={el.min} onChange={(v) => setElement(block.id, el.key, { min: v })} mono />
                    <Field label="Max" value={el.max} onChange={(v) => setElement(block.id, el.key, { max: v })} mono />
                    <Field label="Actual" value={el.actual} onChange={(v) => setElement(block.id, el.key, { actual: v })} mono />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection
        title="Table B — Microstructure"
        action={<AddButton onClick={addMicro} label="Add heat" />}
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
                <Field label="Pearlite" value={m.pearlite} onChange={(v) => setMicro(m.id, { pearlite: v })} mono />
                <Field label="Ferrite" value={m.ferrite} onChange={(v) => setMicro(m.id, { ferrite: v })} mono />
                <Field label="Carbides" value={m.carbides} onChange={(v) => setMicro(m.id, { carbides: v })} mono />
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Despatch & sign-off">
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
      </FormSection>
    </div>
  );
}

function FormSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      + {label}
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
