import React, { useEffect, useRef, useState } from "react";
import Select from "react-select";
import { Button, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader, Spinner } from "reactstrap";
import type { Document } from "../documents/types/list.types";
import type { PreOrder } from "./types";
import { api, actOnPreOrder, getPreOrders, uploadPreOrderInvoice } from "./services";

interface Props { row: PreOrder; userId: number; onClose: () => void; onConverted: (row: PreOrder) => Promise<void>; onUpdate: (row: PreOrder) => void; }
const LinkInvoice = ({ row, userId, onClose, onConverted, onUpdate }: Props) => {
  const [invoices, setInvoices] = useState<Document[]>([]); const [selected, setSelected] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    api<Document[]>("documents/").then((rows) => { if (alive.current) setInvoices(rows.filter((invoice) => invoice.suppliernumber.trim() === row.supplier_ruc.trim() && !invoice.hasActiveOrder)); })
      .catch((failure) => { if (alive.current) setError(failure.message); }).finally(() => { if (alive.current) setLoading(false); });
    return () => { alive.current = false; };
  }, [row.supplier_ruc]);
  const submit = async () => {
    if (!file && !selected) { setError("Seleccione un comprobante registrado o cargue su PDF."); return; }
    setBusy(true); setError("");
    try {
      let converted: PreOrder;
      if (file) {
        const uploaded = await uploadPreOrderInvoice(row.id, userId, file); onUpdate(uploaded);
        setMessage("Leyendo el comprobante. Al terminar se generará automáticamente la OC/OS.");
        let latest = uploaded;
        for (let count = 0; count < 100 && alive.current; count++) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          if (!alive.current) return;
          latest = (await getPreOrders(userId)).find((item) => item.id === row.id) || latest; onUpdate(latest);
          if (latest.status === "CONVERTED") break;
          if (latest.invoice_job?.error || latest.invoice_job?.status.startsWith("failed")) throw new Error(latest.invoice_job?.error || "No fue posible leer el comprobante.");
        }
        if (latest.status !== "CONVERTED") {
          setMessage("El procesamiento continúa en segundo plano. Puede cerrar esta ventana y revisar el resultado en Pre-Órdenes o Procesamiento de Archivos."); return;
        }
        converted = latest;
      } else converted = await actOnPreOrder(row.id, "convert", userId, { document_id: selected });
      onUpdate(converted); await onConverted(converted); onClose();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible vincular el comprobante."); }
    finally { if (alive.current) setBusy(false); }
  };
  const choices = invoices.map((invoice) => ({ value: invoice.documentid, label: `${invoice.documentserial}-${invoice.documentnumber} · ${invoice.currency} ${invoice.totalamount}` }));
  return <Modal isOpen centered size="lg" toggle={busy ? undefined : onClose} backdrop={busy ? "static" : true} keyboard={!busy}>
    <ModalHeader toggle={busy ? undefined : onClose}>Agregar comprobante · {row.tracking_number}</ModalHeader><ModalBody>
      <p>Se generará una <strong>{row.order_type === "C" ? "Orden de Compra" : "Orden de Servicio"}</strong> con el siguiente correlativo vigente y la firma Senior de esta preorden.</p>
      <p className="text-muted">Proveedor: {row.supplier_ruc} · {row.supplier_name}</p>
      {error && <div className="alert alert-danger" role="alert" style={{ whiteSpace: "pre-line" }}>{error}</div>}
      {message && <div className="alert alert-info" role="status">{busy && <Spinner size="sm" className="me-2" />}{message}</div>}
      <Label htmlFor="pre-invoice-existing">Comprobante registrado sin OC/OS vigente</Label>
      <Select inputId="pre-invoice-existing" isSearchable isClearable isDisabled={busy || loading || !!file} isLoading={loading}
        options={choices} value={choices.find((item) => item.value === selected) ?? null} placeholder="Seleccione un comprobante..."
        onChange={(option: { value: number; label: string } | null) => setSelected(option?.value ?? null)} />
      <Label htmlFor="pre-invoice-upload" className="mt-4">O cargar una factura, boleta o recibo por honorarios (PDF)</Label>
      <Input id="pre-invoice-upload" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setSelected(null); }} />
      <small className="text-muted">El comprobante debe corresponder al mismo proveedor. Una factura solo puede generar una OC/OS vigente.</small>
    </ModalBody><ModalFooter><Button color="light" disabled={busy} onClick={onClose}>Cerrar</Button><Button color="primary" disabled={busy || (!file && !selected)} onClick={submit}>
      {busy && <Spinner size="sm" className="me-2" />}Agregar comprobante y generar {row.order_type === "C" ? "OC" : "OS"}
    </Button></ModalFooter>
  </Modal>;
};
export default LinkInvoice;
