import React, { useRef, useState } from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { getPreviewUrl } from "../../documents/services/document.utils";

interface OrderDocumentItemProps {
  name: string;
  type: string;
  url?: string;
  path?: string;
  createdAt?: string;
  loading?: boolean;
  initiallyOpen?: boolean;
  previewLabel?: string;
  onDelete?: () => Promise<void>;
  onDeleteBusyChange?: (busy: boolean) => void;
}

const OrderDocumentItem: React.FC<OrderDocumentItemProps> = ({
  name,
  type,
  url = "",
  path,
  createdAt,
  loading = false,
  initiallyOpen = false,
  previewLabel,
  onDelete, onDeleteBusyChange,
}) => {
  const { t } = useTranslation();
  const [previewOpen, setPreviewOpen] = useState(initiallyOpen);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const deleteInProgress = useRef(false);
  const deleteDocument = async () => {
    if (!onDelete || deleteInProgress.current) return;
    deleteInProgress.current = true;
    setDeleting(true); onDeleteBusyChange?.(true); setDeleteError('');
    try { await onDelete(); setConfirmDelete(false); }
    catch (error) { setDeleteError(error instanceof Error ? error.message : 'No fue posible eliminar el documento.'); }
    finally { deleteInProgress.current = false; setDeleting(false); onDeleteBusyChange?.(false); }
  };
  const displayPath = path || url || "-";

  return (
    <>
    <div className={`expedient-document-card ${previewOpen ? "is-active" : ""}`}>
      <div className="expedient-document-card-icon"><i className="ri-file-pdf-line" aria-hidden="true" /></div>
      <div className="expedient-document-card-content">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
          <h6 className="mb-0 text-body text-break">{name}</h6>
          <span className="badge rounded-pill bg-light text-body border">{type}</span>
        </div>
        {createdAt && moment(createdAt).isValid() && <div className="text-muted small mb-2">{moment(createdAt).format("DD/MM/YYYY HH:mm")}</div>}
        <div className="expedient-document-card-footer">
          <span className="expedient-document-card-path" title={displayPath}>
            {loading ? (
              <span className="d-inline-flex align-items-center gap-1 text-muted">
                <span className="spinner-border spinner-border-sm" role="status" style={{ width: "0.75rem", height: "0.75rem" }} />
                {t("Loading...")}
              </span>
            ) : (
              displayPath
            )}
          </span>
          <div className="expedient-document-card-actions">
        {onDelete && <button type="button" className="expedient-document-delete-button" disabled={deleting || loading} title="Eliminar documento" aria-label={`Eliminar documento: ${name}`} onClick={() => { setDeleteError(''); setConfirmDelete(true); }}><i className="ri-delete-bin-line" aria-hidden="true" /></button>}
        <button type="button" className={`${previewLabel ? "expedient-document-card-link btn btn-link p-0" : "expedient-document-icon-button"} ${previewOpen ? "is-active" : ""}`}
          disabled={!url || loading} onClick={() => setPreviewOpen((open) => !open)} aria-expanded={previewOpen}
          title={previewLabel || t("Preview PDF")} aria-label={`${previewLabel || t("Preview PDF")}: ${name}`}>
          {loading ? (
            <span className="spinner-border spinner-border-sm" role="status" style={{ width: "0.75rem", height: "0.75rem" }} />
          ) : (
            <i className="ri-eye-line" aria-hidden="true" />
          )}
          {previewLabel && <span className="ms-1">{previewLabel}</span>}
        </button>
        {url && !loading && !previewLabel && <a className="expedient-document-card-link" href={url} target="_blank" rel="noopener noreferrer"
          aria-label={`${t("Open PDF")}: ${name}`}>
          <i className="ri-external-link-line me-1" aria-hidden="true" />{t("Open PDF")}
        </a>}
          </div>
        </div>
      </div>
    </div>
    {confirmDelete && <div className="expedient-upload-panel mb-3" role="group" aria-label={`Confirmar eliminación de ${name}`}>
      <p>¿Eliminar definitivamente <strong>{name}</strong>? Esta acción elimina el adjunto guardado.</p>
      {deleteError && <p className="text-danger" role="alert">{deleteError}</p>}
      <div className="d-flex gap-2"><button type="button" className="btn btn-danger" disabled={deleting} onClick={() => void deleteDocument()}>{deleting ? 'Eliminando…' : 'Confirmar eliminación'}</button><button type="button" className="btn btn-light" disabled={deleting} onClick={() => setConfirmDelete(false)}>Cancelar</button></div>
    </div>}
    {previewOpen && url && <div className="expedient-inline-preview">
      <div className="expedient-inline-preview-header">
        <h6 className="mb-0 text-break">{name}</h6>
        <button type="button" className="expedient-preview-close" aria-label={t("Close")}
          onClick={() => setPreviewOpen(false)}><i className="ri-close-line" /></button>
      </div>
      <div className="expedient-preview-surface"><iframe className="expedient-preview-iframe" src={getPreviewUrl(url)} title={name} /></div>
    </div>}
    </>
  );
};

export default OrderDocumentItem;
