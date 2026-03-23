import React, { useMemo } from "react";
import { Button, Card, CardBody } from "reactstrap";
import { useTranslation } from "react-i18next";
import { Document } from "../Documents/types";
import { getViewerUrl } from "../Documents/document-utils";

interface DocumentEditPreviewPanelProps {
  document: Document;
  previewUrl: string;
  downloadUrl: string;
  rotation: number;
  onRotateLeft: () => void;
  onRotateRight: () => void;
}

const DocumentEditPreviewPanel: React.FC<DocumentEditPreviewPanelProps> = ({
  document,
  previewUrl,
  downloadUrl,
  rotation,
  onRotateLeft,
  onRotateRight,
}) => {
  const { t } = useTranslation();
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const viewerUrl = useMemo(() => getViewerUrl(previewUrl), [previewUrl]);

  return (
    <Card className="border-0 shadow-sm document-edit-preview-card">
      <CardBody className="p-0">
        <div className="document-edit-preview-header">
          <h4 className="document-edit-preview-title">
            {t("Document #{{id}}", { id: document.documentid })}
          </h4>

          <div className="document-edit-preview-actions">
            <a
              href={previewUrl}
              className="btn btn-sm btn-light border"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ri-external-link-line me-1" />
              {t("View")}
            </a>
            <a
              href={downloadUrl}
              className="btn btn-sm btn-success"
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ri-download-2-line me-1" />
              {t("Download")}
            </a>
            <Button
              size="sm"
              color="light"
              className="border"
              onClick={onRotateLeft}
              title={t("Rotate left")}
            >
              <i className="ri-arrow-go-back-line me-1" />
              {t("Rotate left")}
            </Button>
            <Button
              size="sm"
              color="light"
              className="border"
              onClick={onRotateRight}
              title={t("Rotate right")}
            >
              <i className="ri-arrow-go-forward-line me-1" />
              {t("Rotate right")}
            </Button>
          </div>
        </div>

        <div className="document-edit-preview-stage">
          <div className="document-edit-preview-stage-bar">
            <span className="small fw-semibold">
              {t("PDF Viewer {{serial}}-{{number}}", {
                serial: document.documentserial,
                number: document.documentnumber,
              })}
            </span>
            <span className="small text-muted">
              {t("Rotation: {{value}} deg", { value: normalizedRotation })}
            </span>
          </div>
          <div className="document-edit-preview-surface">
            {viewerUrl ? (
              <div
                className="document-edit-preview-paper"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <iframe
                  src={viewerUrl}
                  title={t("Document preview")}
                  className="document-edit-preview-iframe"
                />
              </div>
            ) : (
              <div className="document-edit-preview-empty">
                <i className="ri-file-warning-line" />
                <h6 className="mb-2">{t("Document preview")}</h6>
                <p className="mb-0">
                  {t("Preview is not available for this file.")}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default DocumentEditPreviewPanel;
