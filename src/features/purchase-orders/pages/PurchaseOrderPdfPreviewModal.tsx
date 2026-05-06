import React from "react";
import { Button, Modal, ModalBody, ModalHeader } from "reactstrap";
import { useTranslation } from "react-i18next";

interface PurchaseOrderPdfPreviewModalProps {
  isOpen: boolean;
  fileName: string;
  previewUrl: string;
  onClose: () => void;
}

const PurchaseOrderPdfPreviewModal: React.FC<PurchaseOrderPdfPreviewModalProps> = ({
  isOpen,
  fileName,
  previewUrl,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} toggle={onClose} size="xl" centered>
      <ModalHeader toggle={onClose}>{fileName || t("Document preview")}</ModalHeader>
      <ModalBody className="p-0">
        <div
          style={{
            width: "100%",
            height: "80vh",
            background: "#f8f9fa",
          }}
        >
          <iframe
            src={previewUrl}
            title={fileName || t("Document preview")}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        </div>
        <div className="d-flex justify-content-end p-3 border-top">
          <Button color="danger" onClick={onClose}>
            {t("Close")}
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default PurchaseOrderPdfPreviewModal;
