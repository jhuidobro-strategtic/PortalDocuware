import React, { useState } from "react";
import {
  Button,
  FormGroup,
  Input,
  InputGroup,
  InputGroupText,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
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
  onExtract?: (payload: { startDate: Date | null; endDate: Date | null }) => void;
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

  const toggleExtractModal = () => {
    setExtractModalOpen((prev) => !prev);
  };

  const handleConfirmExtract = () => {
    onExtract?.({
      startDate: extractStartDate[0] ?? null,
      endDate: extractEndDate[0] ?? null,
    });
    setExtractModalOpen(false);
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

      <Modal isOpen={extractModalOpen} toggle={toggleExtractModal} centered>
        <ModalHeader toggle={toggleExtractModal}>{t("Extract")}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label className="form-label">{t("Start date")}</Label>
            <Flatpickr
              className="form-control"
              options={{ dateFormat: "d/m/Y" }}
              value={extractStartDate}
              onChange={(dates) => setExtractStartDate(dates)}
              placeholder={t("Start date")}
            />
          </FormGroup>

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
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={toggleExtractModal}>
            {t("Cancel")}
          </Button>
          <Button color="primary" onClick={handleConfirmExtract}>
            {t("Confirm")}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default DocumentFilters;
