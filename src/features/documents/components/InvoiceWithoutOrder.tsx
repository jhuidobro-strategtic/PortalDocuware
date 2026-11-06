import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input, Label, Offcanvas, OffcanvasBody, OffcanvasHeader, Spinner, Table } from "reactstrap";
import { buildApiUrl } from "../../../helpers/api-url";
import { getApiErrorMessage } from "../../../helpers/api-error-message";
import { getPreferenceUserId } from "../../../helpers/ui-preferences";
import type { Document } from "../types/list.types";

interface Note { documentid: number; kind: "NC" | "ND"; code: string; date: string; supplier_name: string; currency: string; total: string; }
interface Props { document: Document; onClose: () => void; }

const InvoiceWithoutOrder = ({ document, onClose }: Props) => {
  const [kind, setKind] = useState(""); const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Note[]>([]); const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [result, setResult] = useState<{ expedienteid: number; reference_code: string } | null>(null);
  const userID = getPreferenceUserId();
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(""); setSelected(null);
    const timer = window.setTimeout(async () => {
      try {
        const query = new URLSearchParams({ userID: String(userID), documentID: String(document.documentid), kind, search });
        const response = await fetch(buildApiUrl(`expedientes/notas-disponibles/?${query}`), { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(getApiErrorMessage(payload, "No fue posible cargar las notas."));
        if (!controller.signal.aborted) setRows(payload.data || []);
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "No fue posible cargar las notas."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [document.documentid, userID, kind, search]);
  const submit = async () => {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(buildApiUrl("expedientes/factura-sin-orden/"), { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentID: document.documentid, noteID: selected, userID: Number(userID) }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(getApiErrorMessage(payload, "No fue posible vincular la nota."));
      setResult(payload.data);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible vincular la nota."); }
    finally { setBusy(false); }
  };
  return <Offcanvas isOpen direction="end" toggle={busy ? undefined : onClose} backdrop={busy ? "static" : true} keyboard={!busy} style={{ width: "min(900px, 96vw)" }}>
    <OffcanvasHeader toggle={busy ? undefined : onClose}>Factura sin orden</OffcanvasHeader>
    <OffcanvasBody>
      <p className="fw-semibold">Factura {document.documentserial}-{document.documentnumber} · {document.suppliername}</p>
      {result ? <><div className="alert alert-success" role="status">Factura y nota vinculadas en el expediente <strong>{result.reference_code}</strong>. Se anexaron ambos PDF sin generar OC/OS.</div><Link to="/expedientes" className="btn btn-primary">Ver Expedientes</Link></> : <>
        <p className="text-muted">Seleccione una nota de crédito o débito del mismo proveedor y moneda. Se usará la información guardada de la factura.</p>
        <div className="d-flex flex-wrap gap-3 mb-3">
          <div><Label htmlFor="note-kind">Tipo de nota</Label><Input id="note-kind" type="select" disabled={busy} value={kind} onChange={(event) => setKind(event.target.value)}><option value="">Crédito y débito</option><option value="NC">Nota de crédito (NC)</option><option value="ND">Nota de débito (ND)</option></Input></div>
          <div className="flex-grow-1"><Label htmlFor="note-search">Buscar nota</Label><Input id="note-search" placeholder="Serie o número de la nota..." value={search} disabled={busy} onChange={(event) => setSearch(event.target.value)} /></div>
        </div>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {loading ? <div className="text-center py-5" aria-busy="true"><Spinner /></div> : !error && <div className="table-responsive"><Table className="align-middle"><thead><tr><th>Vincular</th><th>Tipo</th><th>Nota</th><th>Fecha</th><th>Importe</th></tr></thead><tbody>
          {!rows.length && <tr><td colSpan={5} className="text-center py-4">No hay notas disponibles. Registre primero la nota en Gestión de documentos.</td></tr>}
          {rows.map((note) => <tr key={note.documentid}><td><Input type="radio" name="selected-note" aria-label={`Vincular ${note.code}`} disabled={busy} checked={selected === note.documentid} onChange={() => setSelected(note.documentid)} /></td><td>{note.kind}</td><td>{note.code}</td><td>{note.date}</td><td>{note.currency} {note.total}</td></tr>)}
        </tbody></Table></div>}
        <div className="d-flex justify-content-end gap-2 mt-3"><Button color="light" disabled={busy} onClick={onClose}>Cancelar</Button><Button color="primary" disabled={busy || loading || !selected} onClick={submit}>{busy && <Spinner size="sm" className="me-2" />}Vincular y enviar a Expedientes</Button></div>
      </>}
    </OffcanvasBody>
  </Offcanvas>;
};
export default InvoiceWithoutOrder;
