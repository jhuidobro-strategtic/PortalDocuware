import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Col, Form, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader, Row, Spinner, Table } from "reactstrap";
import { buildApiUrl } from "../../../helpers/api-url";
import { getApiErrorMessage } from "../../../helpers/api-error-message";
import { getCurrentSessionUser } from "../hooks/orderC.form";
import "./SourceDocumentRegistration.css";

interface SourceItem { description: string; quantity: string; unit_value: string; total_value: string; tax_value: string; }
interface SourceDraft {
  sourceKind: "BOLETA" | "RH"; suppliernumber: string; suppliername: string;
  documentserial: string; documentnumber: string; documentdate: string; currency: string;
  totalamount: string; taxamount: string; withholdingamount: string; customer: string; items: SourceItem[];
}
const newItem = (): SourceItem => ({ description: "", quantity: "1", unit_value: "", total_value: "", tax_value: "0.00" });
const itemLabels: Record<keyof SourceItem, string> = { description: "Descripción", quantity: "Cantidad", unit_value: "Valor unitario", total_value: "Base", tax_value: "IGV" };
const emptyDraft = (): SourceDraft => ({ sourceKind: "BOLETA", suppliernumber: "", suppliername: "", documentserial: "",
  documentnumber: "", documentdate: "", currency: "PEN", totalamount: "", taxamount: "0.00", withholdingamount: "0.00", customer: "", items: [newItem()] });

const SourceDocumentRegistration = ({ onClose, jobId }: { onClose: () => void; jobId: number }) => {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<SourceDraft>(emptyDraft);
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState<"read" | "save" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    setBusy("read");
    fetch(buildApiUrl(`invoice-imports/jobs/${jobId}/review/`), { signal: abort.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) throw new Error(getApiErrorMessage(result, "No fue posible cargar el comprobante."));
        const detected = result.data?.draft || {};
        setDraft({ ...emptyDraft(), ...detected,
          items: Array.isArray(detected.items) && detected.items.length ? detected.items.map((item: SourceItem) => ({ ...newItem(), ...item })) : [newItem()],
        });
        setFileUrl(result.data?.file_url || ""); setFileName(result.data?.original_filename || "");
        setNotice("Revise los datos detectados y complete los campos faltantes antes de guardar.");
      })
      .catch((failure) => { if (!abort.signal.aborted) setError(failure.message); })
      .finally(() => { if (!abort.signal.aborted) setBusy(null); });
    return () => abort.abort();
  }, [jobId]);
  const change = (field: keyof Omit<SourceDraft, "items">, value: string) => setDraft((previous) => ({ ...previous, [field]: value }));
  const updateItem = (index: number, field: keyof SourceItem, value: string) => setDraft((previous) => ({
    ...previous, items: previous.items.map((item, row) => {
      if (row !== index) return item;
      const next = { ...item, [field]: value };
      if (field === "quantity" || field === "unit_value") next.total_value = (Number(next.quantity) * Number(next.unit_value)).toFixed(2);
      return next;
    }),
  }));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const session = getCurrentSessionUser();
    if (!session.id || !fileUrl) { setError("Espere a que cargue el archivo e ingrese con una sesión válida."); return; }
    setBusy("save"); setError("");
    try {
      const response = await fetch(buildApiUrl(`invoice-imports/jobs/${jobId}/review/`), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, created_by: Number(session.id) }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(getApiErrorMessage(result, "No fue posible registrar el comprobante."));
      navigate(`/documents/order-c/${result.data.documentid}`, { state: { document: result.data } });
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible registrar el comprobante."); }
    finally { setBusy(null); }
  };
  const fields: Array<{ key: keyof Omit<SourceDraft, "items">; label: string; type?: "text" | "date" | "number"; required?: boolean }> = [
    { key: "suppliernumber", label: "RUC del emisor", required: true }, { key: "suppliername", label: "Nombre o razón social del emisor", required: true },
    { key: "documentserial", label: "Serie", required: true }, { key: "documentnumber", label: "Número", required: true },
    { key: "documentdate", label: "Fecha de emisión", type: "date", required: true }, { key: "customer", label: "Documento del cliente (RUC/DNI)" },
    { key: "totalamount", label: "Importe total del comprobante", type: "number", required: true },
    { key: "taxamount", label: "IGV del comprobante", type: "number", required: true },
    ...(draft.sourceKind === "RH" ? [{ key: "withholdingamount" as const, label: "Retención indicada en el recibo", type: "number" as const, required: true }] : []),
  ];
  return <Modal isOpen toggle={busy ? undefined : onClose} size="xl" centered scrollable
    className="source-registration" contentClassName="source-registration-content"
    backdrop={busy ? "static" : true} keyboard={!busy}>
    <ModalHeader toggle={busy ? undefined : onClose}>Revisar boleta de venta o recibo por honorarios</ModalHeader>
    <Form onSubmit={save} className="source-registration-form">
      <ModalBody>
        <p className="text-muted">Revise el comprobante cargado en Procesamiento de Archivos y complete los datos antes de crear la orden.</p>
        {error && <div className="alert alert-danger" role="alert" style={{ whiteSpace: "pre-line" }}>{error}</div>}
        {notice && <div className="alert alert-info" role="status">{notice}</div>}
        <fieldset disabled={!!busy}>
          <Row className="g-3 mb-4">
            <Col xs={12}><Label>Archivo cargado</Label><div className="d-flex flex-wrap align-items-center gap-2">
              <span className="text-break">{fileName}</span>
              {fileUrl && <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-light btn-sm"><i className="ri-eye-line me-1" />Ver comprobante</a>}
            </div></Col>
            <Col md={6}><Label htmlFor="source-kind">Tipo de comprobante <span className="text-danger">*</span></Label>
              <Input id="source-kind" type="select" value={draft.sourceKind} onChange={(event) => {
                const kind = event.target.value as SourceDraft["sourceKind"];
                setDraft((previous) => ({ ...previous, sourceKind: kind, withholdingamount: "0.00",
                  ...(kind === "RH" ? { taxamount: "0.00", items: previous.items.map((item) => ({ ...item, tax_value: "0.00" })) } : {}) }));
              }}><option value="BOLETA">Boleta de venta</option><option value="RH">Recibo por honorarios</option></Input></Col>
            <Col md={6}><Label htmlFor="source-currency">Moneda <span className="text-danger">*</span></Label><Input id="source-currency" type="select" value={draft.currency} onChange={(event) => change("currency", event.target.value)}><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></Input></Col>
            {fields.map((field) => <Col md={6} key={field.key}><Label htmlFor={`source-${field.key}`}>{field.label} {field.required && <span className="text-danger">*</span>}</Label>
              <Input id={`source-${field.key}`} type={field.type || "text"} required={field.required} value={draft[field.key]} min={field.type === "number" ? 0 : undefined} step={field.type === "number" ? "0.01" : undefined}
                readOnly={field.key === "taxamount" && draft.sourceKind === "RH"} onChange={(event) => change(field.key, event.target.value)} /></Col>)}
          </Row>
          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-2"><h5 className="mb-0">Detalles del comprobante</h5><Button type="button" color="light" size="sm" onClick={() => setDraft((previous) => ({ ...previous, items: [...previous.items, newItem()] }))}>Agregar detalle</Button></div>
          <p className="text-muted small">Revise la base sin IGV y el impuesto de cada línea. Su suma debe coincidir con el total del comprobante.</p>
          <div className="table-responsive"><Table className="table align-middle source-registration-table"><thead className="table-light"><tr>{Object.values(itemLabels).map((label) => <th key={label}>{label} <span className="text-danger">*</span></th>)}<th>Acciones</th></tr></thead><tbody>
            {draft.items.map((item, index) => <tr key={index}>{(["description", "quantity", "unit_value", "total_value", "tax_value"] as const).map((field) => <td key={field} data-field={field} data-label={itemLabels[field]}><Input type={field === "description" ? "textarea" : "number"}
              aria-label={`${itemLabels[field]}, detalle ${index + 1}`} value={item[field]} required min={field === "quantity" ? "0.000001" : "0"} step={field === "quantity" ? "0.000001" : "0.01"}
              readOnly={field === "tax_value" && draft.sourceKind === "RH"} onChange={(event) => updateItem(index, field, event.target.value)} /></td>)}
              <td data-field="actions"><Button type="button" color="light" size="sm" aria-label={`Quitar detalle ${index + 1}`} disabled={draft.items.length === 1} onClick={() => setDraft((previous) => ({ ...previous, items: previous.items.filter((_, row) => row !== index) }))}><i className="ri-delete-bin-line" /></Button></td></tr>)}
          </tbody></Table></div>
          {draft.sourceKind === "RH" && <p className="text-end fw-semibold">Neto del recibo: {(Number(draft.totalamount || 0) - Number(draft.withholdingamount || 0)).toFixed(2)} {draft.currency}</p>}
        </fieldset>
      </ModalBody>
      <ModalFooter><Button type="button" color="light" disabled={!!busy} onClick={onClose}>Cancelar</Button><Button type="submit" color="primary" disabled={!!busy || !fileUrl}>{busy ? <><Spinner size="sm" className="me-2" />{busy === "read" ? "Leyendo PDF..." : "Guardando..."}</> : "Guardar y crear orden"}</Button></ModalFooter>
    </Form>
  </Modal>;
};
export default SourceDocumentRegistration;
