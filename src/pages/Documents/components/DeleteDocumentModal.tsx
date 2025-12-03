import React from "react";
import { Button, Modal, ModalBody, ModalFooter } from "reactstrap";

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
}) => (
  <Modal id="deleteModal" isOpen={isOpen} toggle={onClose} centered>
    <ModalBody>
      <div className="text-center">
        <i
          className="ri-error-warning-line"
          style={{ fontSize: "4rem", color: "#f06548" }}
        ></i>
        <h4 className="mt-3">¿Está seguro?</h4>
        <p className="text-muted">
          ¿Desea eliminar el documento <strong>#{documentId}</strong>?
        </p>
      </div>
    </ModalBody>
    <ModalFooter>
      <Button color="light" onClick={onClose}>
        Cancelar
      </Button>
      <Button color="danger" onClick={onConfirm}>
        Sí, Eliminar
      </Button>
    </ModalFooter>
  </Modal>
);

export default DeleteDocumentModal;
