import React from "react";
import { Button, Card, CardBody } from "reactstrap";
import { Document } from "../types";

interface DocumentPreviewProps {
  document: Document;
  rotation: number;
  previewUrl: string;
  downloadUrl: string;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onClose: () => void;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document,
  rotation,
  previewUrl,
  downloadUrl,
  onRotateLeft,
  onRotateRight,
  onClose,
}) => (
  <Card>
    <CardBody>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0 small-text">Vista previa del documento</h5>
        <div className="d-flex gap-2">
          <a
            href={downloadUrl}
            download
            className="btn btn-sm btn-success"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="ri-download-2-line" />
            <span className="d-none d-md-inline"> Descargar</span>
          </a>

          <div className="d-flex gap-2">
            <Button size="sm" onClick={onRotateLeft}>
              <i className="ri-arrow-go-back-line" />
            </Button>
            <Button size="sm" onClick={onRotateRight}>
              <i className="ri-arrow-go-forward-line" />
            </Button>
          </div>
          <Button size="sm" color="danger" onClick={onClose}>
            <i className="ri-close-line" />
            <span className="d-none d-md-inline"> Cerrar</span>
          </Button>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          height: "66vh",
          overflow: "auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f8f9fa",
        }}
      >
        <div
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "center center",
            transition: "transform 0.3s ease",
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <iframe
            src={previewUrl}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            title={`Visor PDF ${document.documentserial}-${document.documentnumber}`}
          />
        </div>
      </div>
    </CardBody>
  </Card>
);

export default DocumentPreview;
