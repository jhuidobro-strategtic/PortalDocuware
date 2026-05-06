import React, { useState } from "react";
import {
  Button,
  Col,
  FormGroup,
  Input,
  InputGroup,
  InputGroupText,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
} from "reactstrap";
import Flatpickr from "react-flatpickr";
import { useTranslation } from "react-i18next";
import "flatpickr/dist/themes/material_blue.css";

interface DocumentFiltersProps {
  searchTerm: string;
  statusFilter: string;
  dateRange: Date[];
  onSearchTermChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDateRangeChange: (dates: Date[]) => void;
  onExport: () => void;
  onExtract?: (payload: {
    startDate: Date | null;
    endDate: Date | null;
  }) => Promise<boolean> | boolean;
}

const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  searchTerm,
  statusFilter,
  dateRange,
  onSearchTermChange,
  onStatusChange,
  onDateRangeChange,
  onExport,
  onExtract,
}) => {
  const { t } = useTranslation();
  const [extractModalOpen, setExtractModalOpen] = useState(false);
  const [extractStartDate, setExtractStartDate] = useState<Date[]>([]);
  const [extractEndDate, setExtractEndDate] = useState<Date[]>([]);
  const [extractSubmitting, setExtractSubmitting] = useState(false);

  const toggleExtractModal = () => {
    setExtractModalOpen((prev) => !prev);
  };

  const handleConfirmExtract = async () => {
    if (!onExtract) {
      setExtractModalOpen(false);
      return;
    }

    setExtractSubmitting(true);

    try {
      const shouldClose = await onExtract({
        startDate: extractStartDate[0] ?? null,
        endDate: extractEndDate[0] ?? null,
      });

      if (shouldClose !== false) {
        setExtractModalOpen(false);
        setExtractStartDate([]);
        setExtractEndDate([]);
      }
    } finally {
      setExtractSubmitting(false);
    }
  };

  return (
    <>
      <div className="document-filters-toolbar mb-4">
        <div className="document-filters-title">
          <h4 className="mb-0" style={{ fontSize: "1.2rem" }}>
            {t("Document List")}
          </h4>
        </div>
        <div className="document-filters-controls-row">
          <div className="document-filters-controls">
            <InputGroup className="document-filter-control document-filter-control--search">
              <InputGroupText>
                <i className="ri-search-line" />
              </InputGroupText>
              <Input
                placeholder={t("Search...")}
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
              />
            </InputGroup>

            <Input
              type="select"
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="document-filter-control document-filter-control--status"
            >
              <option value="all">{t("All")}</option>
              <option value="active">{t("Active")}</option>
              <option value="pending">{t("Pending")}</option>
            </Input>

            <InputGroup className="document-filter-control document-filter-control--date">
              <InputGroupText>
                <i className="ri-calendar-line" />
              </InputGroupText>
              <Flatpickr
                className="form-control"
                options={{
                  mode: "range",
                  dateFormat: "d/m/Y",
                }}
                value={dateRange}
                onChange={onDateRangeChange}
                placeholder={t("Filter by date")}
              />
            </InputGroup>
          </div>

          <div className="document-actions-group">
            <Button
              color="primary"
              onClick={toggleExtractModal}
              className="document-action-button"
            >
              <i className="ri-download-cloud-2-line" />
              <span>{t("Extract")}</span>
            </Button>

            <Button
              color="success"
              onClick={onExport}
              title={t("Export Excel")}
              className="document-action-button"
            >
              <i className="ri-file-excel-2-line" />
              <span>{t("Export Excel")}</span>
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={extractModalOpen}
        toggle={extractSubmitting ? undefined : toggleExtractModal}
        backdrop={extractSubmitting ? "static" : true}
        keyboard={!extractSubmitting}
        centered
      >
        <ModalHeader toggle={extractSubmitting ? undefined : toggleExtractModal}>
          {t("Extract")}
        </ModalHeader>
        <ModalBody>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup className="mb-0">
                <Label className="form-label">{t("Start date")}</Label>
                <Flatpickr
                  className="form-control"
                  options={{ dateFormat: "d/m/Y" }}
                  value={extractStartDate}
                  onChange={(dates) => setExtractStartDate(dates)}
                  placeholder={t("Start date")}
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup className="mb-0">
                <Label className="form-label">{t("End date")}</Label>
                <Flatpickr
                  className="form-control"
                  options={{ dateFormat: "d/m/Y" }}
                  value={extractEndDate}
                  onChange={(dates) => setExtractEndDate(dates)}
                  placeholder={t("End date")}
                />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button
            color="light"
            onClick={toggleExtractModal}
            disabled={extractSubmitting}
          >
            {t("Cancel")}
          </Button>
          <Button
            color="primary"
            onClick={handleConfirmExtract}
            disabled={extractSubmitting}
            className="d-inline-flex align-items-center gap-2"
          >
            {extractSubmitting && <Spinner size="sm" />}
            <span>{extractSubmitting ? t("Processing...") : t("Confirm")}</span>
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default DocumentFilters;
