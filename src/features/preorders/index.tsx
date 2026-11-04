import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import { Button, Card, CardBody, Container, Input, InputGroup, InputGroupText, Label, Modal, ModalBody, ModalFooter, ModalHeader, Offcanvas, Spinner, Table } from "reactstrap";
import BreadCrumb from "../../components/common/BreadCrumb";
import AppPagination from "../../components/common/Pagination";
import FloatingAlerts from "../../components/common/FloatingAlerts";
import TableActionsMenu from "../../components/common/TableActionsMenu";
import { getPreferenceUserId } from "../../helpers/ui-preferences";
import { downloadBlob } from "../../helpers/download-blob";
import { fetchCatalog, fetchCategorizedSigners, fetchSuppliers } from "../documents/services/orderC.service";
import OrderDocumentItem from "../purchase-orders/components/OrderDocumentItem";
import { actOnPreOrder, attachPreOrderFile, getPreOrders } from "./services";
import { makeConvertedOrderPdf, makePreOrderPdf } from "./pdf";
import type { PreOrderOptions } from "./PreOrderForm";
import LinkInvoice from "./LinkInvoice";
import { PreOrder, stateLabels } from "./types";
import "../expedients/views/Expedients.css";
import "./PreOrders.css";

const emptyOptions: PreOrderOptions = { suppliers: [], seniors: [], payment: [], currency: [], stores: [] };
const eventNames: Record<string, string> = { IMPORTED: "Archivo registrado automáticamente como borrador", CREATED: "Creada y enviada al Senior", UPDATED: "Actualizada y enviada al Senior", APPROVED: "Firmada por Senior",
  REJECTED: "Rechazada", CANCELLED: "Anulada", FILE_ADDED: "Sustento agregado", INVOICE_UPLOADED: "Comprobante enviado a procesamiento", CONVERTED: "Convertida en OC/OS", CONVERSION_FAILED: "Conversión pendiente de corrección" };
const PreOrders = () => {
  const navigate = useNavigate(); const location = useLocation();
  const userId = Number(getPreferenceUserId());
  const [rows, setRows] = useState<PreOrder[]>([]); const [options, setOptions] = useState(emptyOptions);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [success, setSuccess] = useState<string>((location.state as { message?: string } | null)?.message || "");
  const [search, setSearch] = useState(""); const [status, setStatus] = useState("all"); const [page, setPage] = useState(1);
  const [linkRow, setLinkRow] = useState<PreOrder | null>(null);
  const [action, setAction] = useState<{ row: PreOrder; name: "approve" | "reject" | "cancel" } | null>(null);
  const [notes, setNotes] = useState(""); const [actionError, setActionError] = useState(""); const [busy, setBusy] = useState(false);
  const [drawerId, setDrawerId] = useState<number | null>(null); const [previewUrl, setPreviewUrl] = useState(""); const [previewLoading, setPreviewLoading] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null); const [exporting, setExporting] = useState(false);
  const previewRef = useRef(""); const previewRequest = useRef(0);
  const drawer = rows.find((row) => row.id === drawerId) ?? null;
  const update = (updated: PreOrder) => setRows((previous) => previous.some((row) => row.id === updated.id) ? previous.map((row) => row.id === updated.id ? updated : row) : [updated, ...previous]);
  const refresh = useCallback(async () => { if (!userId) throw new Error("No fue posible identificar al usuario."); setRows(await getPreOrders(userId)); }, [userId]);
  useEffect(() => {
    let alive = true; document.title = "Pre-Órdenes | Docuware";
    Promise.all([getPreOrders(userId), fetchSuppliers(), fetchCategorizedSigners(), fetchCatalog("PAYMENT_CONDITION"), fetchCatalog("MONEY"), fetchCatalog("STORE_WAREHOUSE")])
      .then(([list, suppliers, signers, payment, currency, stores]) => { if (alive) { setRows(list); setOptions({ suppliers, seniors: signers.seniorSigners, payment, currency, stores }); } })
      .catch((failure) => { if (alive) setError(failure.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);
  const processing = rows.some((row) => row.invoice_job && ["uploaded", "uploaded_local", "ocr_processing", "sunat_processing", "persisting"].includes(row.invoice_job.status));
  useEffect(() => {
    if (!processing || linkRow) return;
    const interval = window.setInterval(() => { refresh().catch((failure) => setError(failure.message)); }, 5000);
    return () => window.clearInterval(interval);
  }, [processing, linkRow, refresh]);
  const closeDrawer = () => { if (busy) return; previewRequest.current++; setDrawerId(null); setAttachment(null); setPreviewUrl(""); if (previewRef.current) URL.revokeObjectURL(previewRef.current); previewRef.current = ""; };
  useEffect(() => () => { previewRequest.current++; if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);
  const openPreview = async (row: PreOrder) => {
    const request = ++previewRequest.current; setDrawerId(row.id); setAttachment(null); setPreviewLoading(true); setPreviewUrl("");
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    try {
      const pdf = await makePreOrderPdf(row, options);
      if (request === previewRequest.current) { previewRef.current = URL.createObjectURL(pdf.blob); setPreviewUrl(previewRef.current); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible generar la vista previa."); }
    finally { if (request === previewRequest.current) setPreviewLoading(false); }
  };
  const confirm = async () => {
    if (!action) return;
    setBusy(true); setActionError("");
    try { const updated = await actOnPreOrder(action.row.id, action.name, userId, { notes }); update(updated); setAction(null);
      setSuccess(action.name === "approve" ? `Preorden firmada: ${updated.tracking_number}. Pendiente de comprobante.` : "Estado actualizado. Se conserva el historial."); }
    catch (failure) { setActionError(failure instanceof Error ? failure.message : "No fue posible actualizar."); }
    finally { setBusy(false); }
  };
  const converted = async (row: PreOrder) => {
    update(row); setSuccess(`${row.converted_order_number} generada y vinculada a ${row.tracking_number}.`);
    try { await makeConvertedOrderPdf(row, options, userId); }
    catch (failure) { setError(`La OC/OS ya está creada. Falta guardar su PDF: ${failure instanceof Error ? failure.message : "reintente desde Generar PDF OC/OS"}`); }
  };
  const orderPdf = async (row: PreOrder) => {
    setBusy(true);
    try { const pdf = await makeConvertedOrderPdf(row, options, userId); await downloadBlob(pdf.blob, pdf.fileName); setSuccess("PDF de la OC/OS guardado en el expediente."); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible generar el PDF."); }
    finally { setBusy(false); }
  };
  const filtered = rows.filter((row) => (status === "all" || row.status === status) &&
    [row.title, row.source_reference, row.tracking_number, row.supplier_name, row.supplier_ruc, row.converted_order_number, row.creator_name, row.senior_name]
      .some((value) => String(value || "").toLocaleLowerCase("es-PE").includes(search.trim().toLocaleLowerCase("es-PE"))));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 20)));
  const exportExcel = async () => {
    setExporting(true);
    try { const { Workbook } = await import("exceljs"); const workbook = new Workbook(); const sheet = workbook.addWorksheet("Pre-Órdenes");
      sheet.addRow(["Seguimiento", "Asunto", "Origen", "Referencia", "RUC", "Proveedor", "Tipo", "Estado", "Creador", "Senior", "Fecha", "OC/OS"]);
      filtered.forEach((row) => sheet.addRow([row.tracking_number || `Pendiente #${row.id}`, row.title, row.source_kind, row.source_reference, row.supplier_ruc, row.supplier_name,
        row.order_type === "C" ? "OC" : "OS", stateLabels[row.status], row.creator_name, row.senior_name, moment(row.created_at).format("DD/MM/YYYY HH:mm"), row.converted_order_number || ""]));
      sheet.getRow(1).font = { bold: true }; sheet.columns.forEach((column) => { column.width = 25; });
      await downloadBlob(new Blob([await workbook.xlsx.writeBuffer()]), `Preordenes_${moment().format("YYYYMMDD")}.xlsx`);
    } catch { setError("No fue posible exportar el listado."); } finally { setExporting(false); }
  };
  return <div className="page-content"><Container fluid><BreadCrumb title="Pre-Órdenes" pageTitle="Pre-Órdenes" />
    <FloatingAlerts alerts={[...(error ? [{ id: "pre-error", type: "danger" as const, message: error }] : []), ...(success ? [{ id: "pre-success", type: "success" as const, message: success, autoDismissMs: 7000 }] : [])]}
      onRemove={(id) => id === "pre-error" ? setError("") : setSuccess("")} />
    <Card><CardBody><h4>Pre-Órdenes</h4><p className="text-muted">Cotizaciones, proformas, cartas y otros sustentos. El Senior firma y asigna el seguimiento; al agregar el comprobante se genera la OC/OS.</p>
      <div className="preorder-toolbar mb-3"><div className="d-flex flex-wrap gap-2">
        <InputGroup className="preorder-search"><InputGroupText><i className="ri-search-line" /></InputGroupText><Input aria-label="Buscar preórdenes" placeholder="Buscar seguimiento, proveedor o asunto..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></InputGroup>
        <Input type="select" aria-label="Estado de preorden" className="preorder-state" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">Todos los estados</option>{Object.entries(stateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Input>
      </div><div className="d-flex gap-2 flex-wrap"><Button color="light" disabled={loading || busy} onClick={() => refresh().catch((failure) => setError(failure.message))}>Actualizar</Button>
        <Button color="success" disabled={loading || exporting || !filtered.length} onClick={exportExcel}>{exporting ? <Spinner size="sm" /> : <i className="ri-file-excel-2-line me-1" />}Exportar Excel</Button>
        <Button color="primary" disabled={loading || !userId} onClick={() => navigate("/pre-orders/new")}><i className="ri-add-line me-1" />Nueva preorden</Button></div></div>
      {loading ? <div className="preorder-loading"><Spinner color="primary" /></div> : <><div className="table-responsive"><Table className="align-middle table-nowrap preorder-table">
        <thead className="table-light"><tr><th>Acciones</th><th>Seguimiento</th><th>Asunto / origen</th><th>Proveedor</th><th>Tipo</th><th>Estado</th><th>Creador / Senior</th><th>Fecha</th><th>OC/OS</th></tr></thead>
        <tbody>{!filtered.length && <tr><td colSpan={9} className="text-center py-4">No se encontraron preórdenes.</td></tr>}{filtered.slice((currentPage - 1) * 20, currentPage * 20).map((row) => <tr key={row.id}>
          <td><TableActionsMenu items={[
            { id: `view-${row.id}`, label: "Ver documentos y preorden", icon: "ri-eye-line", onClick: () => openPreview(row), disabled: busy },
            ...(row.creator_id === userId && ["DRAFT", "PENDING", "REJECTED"].includes(row.status) ? [{ id: `edit-${row.id}`, label: row.status === "DRAFT" ? "Editar y completar" : "Editar y enviar", icon: "ri-edit-line", onClick: () => navigate(`/pre-orders/edit/${row.id}`) }] : []),
            ...(row.senior_id === userId && row.status === "PENDING" ? [
              { id: `approve-${row.id}`, label: "Firmar y generar seguimiento", icon: "ri-quill-pen-line", onClick: () => { setAction({ row, name: "approve" }); setNotes(""); setActionError(""); } },
              { id: `reject-${row.id}`, label: "Rechazar", icon: "ri-close-circle-line", tone: "danger" as const, onClick: () => { setAction({ row, name: "reject" }); setNotes(""); setActionError(""); } },
            ] : []),
            ...(row.status === "WAITING_INVOICE" ? [{ id: `invoice-${row.id}`, label: "Agregar comprobante y generar OC/OS", icon: "ri-file-add-line", onClick: () => setLinkRow(row) }] : []),
            ...(row.status === "CONVERTED" ? [{ id: `pdf-${row.id}`, label: "Generar PDF OC/OS", icon: "ri-file-pdf-line", onClick: () => orderPdf(row), disabled: busy }] : []),
            ...(row.senior_id === userId && !["CONVERTED", "CANCELLED"].includes(row.status) ? [{ id: `cancel-${row.id}`, label: "Anular preorden", icon: "ri-forbid-line", tone: "danger" as const, onClick: () => { setAction({ row, name: "cancel" }); setNotes(""); setActionError(""); } }] : []),
          ]} /></td>
          <td>{row.tracking_number || <span className="text-muted">Pendiente #{row.id}</span>}</td><td><div className="preorder-ellipsis" title={row.title}>{row.title}</div><small className="text-muted">{row.source_kind} {row.source_reference}</small></td>
          <td><div className="preorder-ellipsis" title={row.supplier_name}>{row.supplier_name}</div><small className="text-muted">{row.supplier_ruc}</small></td><td>{row.order_type === "C" ? "OC" : "OS"}</td>
          <td><span className={`badge ${row.status === "REJECTED" || row.status === "CANCELLED" ? "bg-danger-subtle text-danger" : row.status === "PENDING" || row.status === "DRAFT" ? "bg-warning-subtle text-warning" : "bg-success-subtle text-success"}`}>{stateLabels[row.status]}</span>
            {row.status === "DRAFT" && !!row.missing_fields?.length && <small className="d-block text-muted mt-1" style={{ whiteSpace: "normal", maxWidth: 250 }}>Completar: {row.missing_fields.join(", ")}</small>}
            {row.invoice_job && row.status !== "CONVERTED" && <small className={`d-block mt-1 ${row.invoice_job.error ? "text-danger" : "text-muted"}`}>{row.invoice_job.error || `Comprobante: ${row.invoice_job.status}`}</small>}</td>
          <td><div>{row.creator_name}</div><small className="text-muted">{row.senior_name}</small></td><td>{moment(row.created_at).format("DD/MM/YYYY")}</td>
          <td>{row.converted_order_number ? <Link to="/purchase-order-details">{row.converted_order_number}</Link> : "—"}</td>
        </tr>)}</tbody></Table></div><AppPagination currentPage={currentPage} totalPages={Math.ceil(filtered.length / 20)} totalItems={filtered.length} itemsPerPage={20} onPageChange={setPage} /></>}
    </CardBody></Card>
    {linkRow && <LinkInvoice row={linkRow} userId={userId} onClose={() => setLinkRow(null)} onConverted={converted} onUpdate={update} />}
    <Modal isOpen={!!action} centered toggle={busy ? undefined : () => setAction(null)} backdrop={busy ? "static" : true} keyboard={!busy}>
      <ModalHeader toggle={busy ? undefined : () => setAction(null)}>{action?.name === "approve" ? "Firmar preorden" : action?.name === "reject" ? "Rechazar preorden" : "Anular preorden"}</ModalHeader><ModalBody>
        <p>{action?.row.title}</p>{action?.name === "approve" && <p>Se registrará su firma Senior y se asignará un número de seguimiento. La OC/OS se generará al agregar el comprobante.</p>}
        {actionError && <div className="alert alert-danger" role="alert" style={{ whiteSpace: "pre-line" }}>{actionError}</div>}
        <Label htmlFor="pre-notes">{action?.name === "approve" ? "Observaciones" : "Motivo *"}</Label><Input id="pre-notes" type="textarea" value={notes} disabled={busy} onChange={(event) => setNotes(event.target.value)} />
      </ModalBody><ModalFooter><Button color="light" disabled={busy} onClick={() => setAction(null)}>Cancelar</Button><Button color={action?.name === "approve" ? "primary" : "danger"} disabled={busy || (action?.name !== "approve" && !notes.trim())} onClick={confirm}>{busy && <Spinner size="sm" className="me-2" />}Confirmar</Button></ModalFooter>
    </Modal>
    <Offcanvas isOpen={!!drawer} direction="end" toggle={busy ? undefined : closeDrawer} keyboard={!busy}
      backdrop={busy ? "static" : true} aria-labelledby="pre-drawer-title" style={{ width: "min(1400px, 96vw)" }}>
      {drawer && <div className="expedient-drawer-shell"><div className="expedient-drawer-header"><div><span className="expedient-drawer-kicker">Documentos de preorden</span><h4 id="pre-drawer-title">{drawer.tracking_number || `Preorden #${drawer.id}`}</h4><p className="text-muted mb-0">{drawer.title}</p></div>
        <div className="expedient-drawer-header-actions">{previewUrl && <a className="btn btn-primary" href={previewUrl} download={`${drawer.tracking_number || `Preorden_${drawer.id}`}.pdf`}>Descargar preorden</a>}<button className="expedient-drawer-close" type="button" aria-label="Cerrar" disabled={busy} onClick={closeDrawer}><i className="ri-close-line" /></button></div></div>
        <div className="expedient-drawer-body"><div className="alert alert-info">{stateLabels[drawer.status]}{drawer.converted_order_number && ` · ${drawer.converted_order_number}`}</div>
          {!["CANCELLED", "CONVERTED"].includes(drawer.status) && <div className="expedient-upload-panel"><Label htmlFor="pre-extra-file">Agregar sustento PDF</Label><div className="d-flex gap-2 flex-wrap"><Input id="pre-extra-file" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} />
            <Button color="primary" disabled={busy || !attachment} onClick={async () => { if (!attachment) return; setBusy(true); try { update(await attachPreOrderFile(drawer.id, userId, attachment)); setAttachment(null); setSuccess("Sustento agregado."); } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible adjuntar."); } finally { setBusy(false); } }}>Subir documento</Button></div></div>}
          <div className="expedient-drawer-list">{drawer.files.map((file) => <OrderDocumentItem key={file.id} name={file.filename} type={drawer.source_kind} url={file.url} createdAt={file.created_at} />)}
            <OrderDocumentItem key={`pre-pdf-${drawer.id}`} name={drawer.tracking_number || `Preorden #${drawer.id}`} type="Preorden" url={previewUrl} loading={previewLoading} initiallyOpen />
          </div><h5 className="mt-4">Historial</h5>{drawer.events.map((event) => <div key={event.id} className="border-bottom py-2"><strong>{eventNames[event.action] || event.action}</strong> · {event.actor_name}<small className="d-block text-muted">{moment(event.created_at).format("DD/MM/YYYY HH:mm")}</small>{event.notes && <p className="mb-0">{event.notes}</p>}</div>)}
        </div></div>}
    </Offcanvas>
  </Container></div>;
};
export default PreOrders;
