import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, Table } from "reactstrap";
import { Link } from "react-router-dom";
import BreadCrumb from "../../../components/common/BreadCrumb";
import { directRequest, DirectRequest, directStatuses } from "../directAdmission";
import DirectExpedientDrawer from "./DirectExpedientDrawer";

export default function DirectExpedientInbox({ standalone = false, onChanged }: { standalone?: boolean; onChanged?: () => void }) {
  const [rows, setRows] = useState<DirectRequest[]>([]); const [selected, setSelected] = useState<number | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setError(""); setLoading(true); try { setRows(await directRequest<DirectRequest[]>("direct-expedient-requests/?pending=1")); } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible cargar las solicitudes."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const content = <>
    <Card><CardBody><div className="d-flex flex-wrap justify-content-between gap-3"><div><h5>Envíos sin OC/OS pendientes de aprobación</h5><p className="text-muted">Los aprobados aparecen en el listado habitual de Expedientes.</p></div><Button color="light" disabled={loading} onClick={() => void load()}>Actualizar solicitudes</Button></div>
      {error && <Alert color="danger" fade={false}>{error}</Alert>}
      {loading ? <p role="status">Cargando solicitudes…</p> : !rows.length ? <p className="text-muted mb-0">No hay envíos pendientes asignados.</p> : <Table responsive><thead><tr><th>Factura / proveedor</th><th>Importe</th><th>Solicitante</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.snapshot.reference}<small className="d-block text-muted">{row.snapshot.supplier}</small></td><td>{row.snapshot.currency} {Number(row.snapshot.total).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</td><td>{row.creator}</td><td>{directStatuses[row.status]}</td><td><Button size="sm" color="primary" onClick={() => setSelected(row.id)}>Revisar envío #{row.id}</Button></td></tr>)}</tbody></Table>}
      {!standalone && <Link to="/expedientes/sin-orden">Abrir bandeja de envíos sin OC/OS</Link>}
    </CardBody></Card>
    {selected !== null && <DirectExpedientDrawer requestId={selected} onClose={() => setSelected(null)} onChanged={() => { void load(); onChanged?.(); }} />}
  </>;
  return standalone ? <div className="page-content"><div className="container-fluid"><BreadCrumb title="Envíos sin OC/OS" pageTitle="Expedientes" />{content}</div></div> : content;
}
