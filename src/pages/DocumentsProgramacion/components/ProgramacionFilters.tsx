import React from "react";
import { Button, Input, InputGroup, InputGroupText } from "reactstrap";

interface ProgramacionFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onCreate: () => void;
}

const ProgramacionFilters: React.FC<ProgramacionFiltersProps> = ({
  searchTerm,
  onSearchTermChange,
  onCreate,
}) => (
  <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
    <h4 className="card-title mb-0">Programación Diaria</h4>
    <div className="d-flex gap-2 align-items-center">
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
      <Button color="primary" onClick={onCreate}>
        <i className="ri-add-line align-bottom me-1" />
        Nuevo
      </Button>
    </div>
  </div>
);

export default ProgramacionFilters;
