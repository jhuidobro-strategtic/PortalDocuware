import React from "react";
import { Card, CardBody, Col, Container, Row, Spinner } from "reactstrap";
import "./Documents.css";
import FloatingAlerts from "../../../../components/common/FloatingAlerts";
import Notifications from "../../components/ListNotifications";
import DocumentFilters from "../../components/ListFilters";
import DocumentTable from "../../components/ListDocumentTable";
import DocumentPreview from "../../components/DocumentPreview";
import DeleteDocumentModal from "../../components/DeleteDocumentModal";
import { getDownloadUrl, getPreviewUrl } from "../../services/document.utils";
import { useDocumentList, getDocumentAssociatedNo } from "../../hooks/useDocumentList";

const DocumentList: React.FC = () => {
  const {
    loading, error, selectedDoc, rotation, searchTerm, statusFilter, dateRange,
    deleteModal, documentToDelete, currentPage, notifications, approvedOrderDocumentNos, columnWidths,
    setSearchTerm, setStatusFilter, setDateRange, setNotifications, setDeleteModal, setDocumentToDelete, setCurrentPage,
    paginatedDocuments, totalPages,
    handleResize, handleDelete, confirmDelete, handleViewDocument, handleClosePreview, handleOpenOrderC,
    handleEditClick, handleExtract, exportToExcel, rotateLeft, rotateRight, getTipoDocumentoNombre
  } = useDocumentList();

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner color="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Container fluid className="mt-4 small-text">
        <FloatingAlerts
          alerts={[{ id: "documents-error", type: "danger", message: error }]}
        />
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4 small-text">
      <Notifications
        notifications={notifications}
        onRemove={(id) =>
          setNotifications((prev) =>
            prev.filter((notification) => notification.id !== id)
          )
        }
      />

      <Row>
        <Col xl={12}>
          <Card>
            <CardBody>
              <DocumentFilters
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                dateRange={dateRange}
                onSearchTermChange={(value) => {
                  setSearchTerm(value);
                  setCurrentPage(1);
                }}
                onStatusChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
                onDateRangeChange={(dates) => {
                  setDateRange(dates);
                  setCurrentPage(1);
                }}
                onExtract={handleExtract}
                onExport={exportToExcel}
              />

              <DocumentTable
                columnWidths={columnWidths}
                onResizeColumn={handleResize as any}
                documents={paginatedDocuments}
                approvedOrderDocumentNos={approvedOrderDocumentNos}
                getDocumentAssociatedNo={getDocumentAssociatedNo}
                getTipoDocumentoNombre={getTipoDocumentoNombre}
                onView={handleViewDocument}
                onOrderC={handleOpenOrderC}
                onEdit={handleEditClick}
                onDelete={(doc) => handleDelete(doc.documentid)}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      {selectedDoc && (
        <DocumentPreview
          document={selectedDoc}
          rotation={rotation}
          previewUrl={getPreviewUrl(selectedDoc.documenturl)}
          downloadUrl={getDownloadUrl(selectedDoc.documenturl)}
          onRotateLeft={rotateLeft}
          onRotateRight={rotateRight}
          onClose={handleClosePreview}
        />
      )}

      <DeleteDocumentModal
        isOpen={deleteModal}
        onClose={() => {
          setDeleteModal(false);
          setDocumentToDelete(null);
        }}
        onConfirm={confirmDelete}
        documentId={documentToDelete}
      />
    </Container>
  );
};

export default DocumentList;
