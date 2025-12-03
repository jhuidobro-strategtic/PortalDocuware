import React from "react";
import { Button, Input, InputGroup, InputGroupText } from "reactstrap";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";

interface DocumentFiltersProps {
  searchTerm: string;
  dateRange: Date[];
  onSearchTermChange: (value: string) => void;
  onDateRangeChange: (dates: Date[]) => void;
  onExport: () => void;
}

const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  searchTerm,
  dateRange,
  onSearchTermChange,
  onDateRangeChange,
  onExport,
}) => (
  <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
    <h4 className="mb-0" style={{ fontSize: "1.2rem" }}>
      Lista Detallada de Documentos
    </h4>
    <div className="d-flex align-items-center gap-2 flex">
      <InputGroup style={{ maxWidth: "250px" }}>
        <InputGroupText>
          <i className="ri-search-line" />
        </InputGroupText>
        <Input
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
        />
      </InputGroup>

      <InputGroup style={{ maxWidth: "280px" }}>
        <InputGroupText>
          <i className="ri-calendar-line" />
        </InputGroupText>
        <Flatpickr
          className="form-control"
          options={{ mode: "range", dateFormat: "d/m/Y" }}
          value={dateRange}
          onChange={onDateRangeChange}
          placeholder="Filtrar por fecha"
        />
      </InputGroup>

      <Button color="success" onClick={onExport}>
        <i className="ri-file-excel-2-line"></i>
      </Button>
    </div>
  </div>
);

export default DocumentFilters;
