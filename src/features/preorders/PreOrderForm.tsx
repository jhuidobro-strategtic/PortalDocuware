import React, { useEffect, useState } from "react";
import Select from "react-select";
import { Button, Col, Form, Input, Label, Row, Spinner, Table } from "reactstrap";
import type { SelectOption, SupplierOptionItem } from "../documents/types/orderC.types";
import type { CentroCosto } from "../documents/types/list.types";
import { createSupplierFromRuc } from "../documents/services/orderC.service";
import { getPreferenceUserId } from "../../helpers/ui-preferences";
import type { PreOrder, PreOrderDraft } from "./types";

export interface PreOrderOptions { suppliers: SupplierOptionItem[]; juniors?: SelectOption[]; costs1?: CentroCosto[]; costs2?: CentroCosto[]; seniors: SelectOption[]; payment: SelectOption[]; currency: SelectOption[]; stores: SelectOption[]; }
interface Props { row: PreOrder | null; initialDraft?: PreOrderDraft; initialFile?: File; onPreviewChange: (url: string) => void; extractionWarnings?: string[]; options: PreOrderOptions; creatorName: string; onClose: () => void; onSave: (draft: PreOrderDraft, file: File | null) => Promise<void>; }
const PreOrderForm = ({ row, initialDraft, initialFile, onPreviewChange, extractionWarnings, options, creatorName, onClose, onSave }: Props) => {
  const [draft, setDraft] = useState<PreOrderDraft>(row ? { ...row, order_data: { ...row.order_data, details: row.order_data.details.length
    ? row.order_data.details.map((line) => ({ ...line })) : [{ descriptionItem: "", quantity: "1", unitPrice: "" }] } } : initialDraft || {
    title: "", source_kind: "COTIZACION", source_reference: "", supplier_id: 0, senior_id: 0, order_type: "C",
    order_data: { paymentCondition: 0, currency: 0, store: 0, guideNo: "", requiredby: creatorName,
      details: [{ descriptionItem: "", quantity: "1", unitPrice: "" }] },
  });
  const [suppliers, setSuppliers] = useState(options.suppliers);
  const [ruc, setRuc] = useState(row?.supplier_ruc || options.suppliers.find((item) => item.supplierID === draft.supplier_id)?.supplierNo || "");
  const [lookingUp, setLookingUp] = useState(false);
  const findSupplier = async () => {
    setError("");
    if (!/^\d{11}$/.test(ruc)) { setError("Ingrese un RUC de 11 dígitos."); return; }
    setLookingUp(true);
    try {
      const matches = suppliers.filter((item) => item.supplierNo.trim() === ruc);
      if (matches.length > 1) throw new Error("Hay varios proveedores con ese RUC; seleccione el proveedor del listado.");
      const supplier = matches[0] || await createSupplierFromRuc(ruc, Number(getPreferenceUserId()));
      setSuppliers((previous) => previous.some((item) => item.supplierID === supplier.supplierID) ? previous : [...previous, supplier]);
      setDraft((previous) => ({ ...previous, supplier_id: supplier.supplierID }));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible encontrar el proveedor."); }
    finally { setLookingUp(false); }
  };
  const [file, setFile] = useState<File | null>(initialFile || null);
  useEffect(() => {
    if (!file) { onPreviewChange(""); return; }
    const url = URL.createObjectURL(file); onPreviewChange(url);
    return () => URL.revokeObjectURL(url);
  }, [file, onPreviewChange]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const changeData = (key: string, value: unknown) => setDraft((previous) => ({ ...previous, order_data: { ...previous.order_data, [key]: value } }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (!draft.supplier_id || !draft.senior_id || !draft.order_data.paymentCondition || !draft.order_data.currency || !draft.order_data.store) {
      setError("Complete proveedor, Senior, condición de pago, moneda y almacén."); return;
    }
    if (!row && !file) { setError("Adjunte la cotización, proforma, carta u otro sustento en PDF."); return; }
    setBusy(true);
    try { await onSave(draft, file); } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  };
  const required = <span className="text-danger">*</span>;
  const select = (id: string, label: string, value: number, choices: SelectOption[], update: (id: number) => void) =>
    <Col md={6}><Label htmlFor={id}>{label} {required}</Label><Select inputId={id} isSearchable isDisabled={busy || lookingUp}
      options={choices} value={choices.find((item) => Number(item.value) === value) ?? null} placeholder="Seleccione..."
      onChange={(option: SelectOption | null) => update(Number(option?.value || 0))} menuPortalTarget={document.body}
      styles={{ menuPortal: (base: React.CSSProperties) => ({ ...base, zIndex: 1100 }) }} /></Col>;
  return <Form onSubmit={submit}>
    <h4 className="mb-4">{row?.status === "DRAFT" ? "Completar preorden" : row ? "Editar y enviar preorden" : "Nueva preorden"}</h4>
    <div>
      {error && <div className="alert alert-danger" role="alert" style={{ whiteSpace: "pre-line" }}>{error}</div>}
      {!!extractionWarnings?.length && <div className="alert alert-warning" role="status"><strong>Revise la extracción</strong><ul className="mb-0 mt-1">{extractionWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
      <fieldset disabled={busy}><Row className="g-3">
        <Col xs={12}><Label htmlFor="pre-title">Asunto {required}</Label><Input id="pre-title" required maxLength={200} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></Col>
        <Col md={6}><Label htmlFor="pre-kind">Documento de origen {required}</Label><Input id="pre-kind" type="select" value={draft.source_kind} onChange={(event) => setDraft({ ...draft, source_kind: event.target.value })}>
          <option value="COTIZACION">Cotización</option><option value="PROFORMA">Proforma</option><option value="CARTA">Carta</option><option value="OTRO">Otro sustento</option>
        </Input></Col>
        <Col md={6}><Label htmlFor="pre-reference">Referencia del documento</Label><Input id="pre-reference" maxLength={100} value={draft.source_reference} onChange={(event) => setDraft({ ...draft, source_reference: event.target.value })} /></Col>
        <Col xs={12}><Label htmlFor="pre-ruc">RUC del proveedor</Label><div className="d-flex gap-2"><Input id="pre-ruc" disabled={busy || lookingUp} inputMode="numeric" maxLength={11} value={ruc} placeholder="11 dígitos" style={{ maxWidth: 180 }} onChange={(event) => { setRuc(event.target.value.replace(/\D/g, "")); setDraft((previous) => ({ ...previous, supplier_id: 0 })); }} /><Button type="button" color="primary" disabled={busy || lookingUp} onClick={findSupplier}>{lookingUp ? <Spinner size="sm" /> : "Buscar por RUC"}</Button></div></Col>
        {select("pre-supplier", "Proveedor", draft.supplier_id, suppliers.map((supplier) => ({ value: String(supplier.supplierID), label: `${supplier.supplierNo} - ${supplier.supplierName}` })), (id) => { setDraft({ ...draft, supplier_id: id }); setRuc(suppliers.find((item) => item.supplierID === id)?.supplierNo || ""); })}
        <Col md={6}><Label htmlFor="pre-junior">Firmante Junior</Label><Select inputId="pre-junior" isClearable isDisabled={busy} options={options.juniors || []} value={options.juniors?.find((item) => Number(item.value) === draft.junior_id) || null} placeholder="Opcional" onChange={(option: SelectOption | null) => setDraft({ ...draft, junior_id: option ? Number(option.value) : null })} /></Col>
        {select("pre-senior", "Firmante Senior", draft.senior_id, options.seniors, (id) => setDraft({ ...draft, senior_id: id }))}
        <Col md={6}><Label htmlFor="pre-type">Tipo de orden futura {required}</Label><Input id="pre-type" type="select" value={draft.order_type} onChange={(event) => setDraft({ ...draft, order_type: event.target.value as "C" | "S" })}><option value="C">Orden de compra</option><option value="S">Orden de servicio</option></Input></Col>
        {select("pre-currency", "Moneda", draft.order_data.currency, options.currency, (id) => changeData("currency", id))}
        {select("pre-payment", "Condición de pago", draft.order_data.paymentCondition, options.payment, (id) => changeData("paymentCondition", id))}
        {select("pre-store", "Almacén", draft.order_data.store, options.stores, (id) => changeData("store", id))}
        <Col md={6}><Label htmlFor="pre-required">Solicitante {required}</Label><Input id="pre-required" required value={draft.order_data.requiredby} onChange={(event) => changeData("requiredby", event.target.value)} /></Col>
        <Col md={6}><Label htmlFor="pre-guide">Guía / referencia adicional</Label><Input id="pre-guide" maxLength={20} value={draft.order_data.guideNo} onChange={(event) => changeData("guideNo", event.target.value)} /></Col>
        <Col md={6}><Label htmlFor="pre-source-date">Fecha del documento</Label><Input id="pre-source-date" type="date" value={draft.order_data.source_date || ""} onChange={(event) => changeData("source_date", event.target.value)} /></Col>
        <Col md={6}><Label htmlFor="pre-payment-terms">Condiciones extraídas</Label><Input id="pre-payment-terms" maxLength={200} value={draft.order_data.payment_terms || ""} onChange={(event) => changeData("payment_terms", event.target.value)} /></Col>
        <Col xs={12}><Label htmlFor="pre-file">Documento de sustento PDF {!row && required}</Label><Input id="pre-file" type="file" accept="application/pdf,.pdf" required={!row && !initialFile} onChange={(event) => setFile(event.target.files?.[0] ?? initialFile ?? null)} />
          {file && <div className="small mt-1">Archivo adjunto: {file.name}</div>}
          <small className="text-muted">Este módulo es para documentos que no son comprobantes de pago.</small></Col>
      </Row>
      <div className="d-flex justify-content-between align-items-center mt-4 mb-2"><h5 className="mb-0">Detalles {required}</h5>
        <Button type="button" color="light" onClick={() => changeData("details", [...draft.order_data.details, { descriptionItem: "", quantity: "1", unitPrice: "" }])}>+ Agregar línea</Button></div>
      <div className="table-responsive"><Table className="align-middle"><thead><tr><th>Descripción</th><th>Cantidad</th><th>Precio unitario</th><th>Centro de Costo 1</th><th>Centro de Costo 2</th><th>Total</th><th>Acciones</th></tr></thead>
        <tbody>{draft.order_data.details.map((line, index) => <tr key={index}>
          {(["descriptionItem", "quantity", "unitPrice"] as const).map((field) => <td key={field} style={{ minWidth: field === "descriptionItem" ? 280 : 120 }}>
            <Input aria-label={`${field === "descriptionItem" ? "Descripción" : field === "quantity" ? "Cantidad" : "Precio unitario"} línea ${index + 1}`} required
              type={field === "descriptionItem" ? "text" : "number"} min={field === "quantity" ? "0.000001" : "0"} step={field === "quantity" ? "0.000001" : "0.01"}
              maxLength={field === "descriptionItem" ? 1000 : undefined} value={line[field]} onChange={(event) => changeData("details", draft.order_data.details.map((item, position) => position === index ? { ...item, [field]: event.target.value } : item))} />
          </td>)}{([1, 2] as const).map((level) => {
            const field = level === 1 ? "centro_costo_1_id" : "centro_costo_2_id";
            const choices = (level === 1 ? options.costs1 : options.costs2) || [];
            return <td key={field} style={{ minWidth: 240 }}><Select aria-label={`Centro de Costo ${level} línea ${index + 1}`} isClearable isDisabled={busy} options={choices.map((cost) => ({ value: cost.centroid, label: `${cost.centrocodigo} - ${cost.descripcion}` }))} value={choices.filter((cost) => cost.centroid === line[field]).map((cost) => ({ value: cost.centroid, label: `${cost.centrocodigo} - ${cost.descripcion}` }))[0] || null} onChange={(option: { value: number; label: string } | null) => changeData("details", draft.order_data.details.map((item, position) => position === index ? { ...item, [field]: option?.value || null } : item))} menuPortalTarget={document.body} styles={{ menuPortal: (base: React.CSSProperties) => ({ ...base, zIndex: 1100 }) }} /></td>;
          })}<td>{(Number(line.quantity) * Number(line.unitPrice)).toFixed(2)}</td><td><Button type="button" color="light" disabled={draft.order_data.details.length === 1}
            aria-label={`Eliminar línea ${index + 1}`} onClick={() => changeData("details", draft.order_data.details.filter((_, position) => position !== index))}><i className="ri-delete-bin-line text-danger" /></Button></td>
        </tr>)}</tbody></Table></div>
      <Row className="justify-content-end g-3"><Col md={4}><p className="text-end fw-semibold">Subtotal: {draft.order_data.details.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice), 0).toFixed(2)}</p>
        <Label htmlFor="pre-tax">IGV / impuesto</Label><Input id="pre-tax" type="number" step="0.01" min="0" value={draft.order_data.tax_amount ?? "0.00"} onChange={(event) => changeData("tax_amount", event.target.value)} />
        <p className="text-end fw-semibold mt-2">Total: {(draft.order_data.details.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice), 0) + Number(draft.order_data.tax_amount || 0)).toFixed(2)}</p>
      </Col></Row>
      </fieldset>
    </div><div className="d-flex flex-wrap justify-content-end gap-2 border-top pt-3 mt-3"><Button type="button" color="light" disabled={busy} onClick={onClose}>Volver a Pre-Órdenes</Button><Button type="submit" color="primary" disabled={busy || lookingUp}>{busy && <Spinner size="sm" className="me-2" />}Enviar a aprobación</Button></div>
  </Form>;
};
export default PreOrderForm;
