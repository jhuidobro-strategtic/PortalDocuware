import React from "react";
import { Button, Modal, ModalBody, ModalFooter } from "reactstrap";
import { useTranslation } from "react-i18next";

interface DeleteDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  documentId: number | null;
}

const DeleteDocumentModal: React.FC<DeleteDocumentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  documentId,
}) => {
  const { t } = useTranslation();

  return (
    <Modal id="deleteModal" isOpen={isOpen} toggle={onClose} centered>
      <ModalBody>
        <div className="text-center">
          <i
            className="ri-error-warning-line"
            style={{ fontSize: "4rem", color: "#f06548" }}
          ></i>
          <h4 className="mt-3">{t("Are you sure?")}</h4>
          <p className="text-muted">
            {t("Do you want to delete document #{{id}}?", {
              id: documentId,
            })}
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={onClose}>
          {t("Cancel")}
        </Button>
        <Button color="danger" onClick={onConfirm}>
          {t("Yes, delete")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeleteDocumentModal;
