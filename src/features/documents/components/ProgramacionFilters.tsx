import React from "react";
import { Button, Input, InputGroup, InputGroupText } from "reactstrap";
import { useTranslation } from "react-i18next";

interface ProgramacionFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onCreate: () => void;
}

const ProgramacionFilters: React.FC<ProgramacionFiltersProps> = ({
  searchTerm,
  onSearchTermChange,
  onCreate,
}) => {
  const { t } = useTranslation();

  return (
    <div className="document-filters-toolbar mb-4">
      <div className="document-filters-title">
        <h4 className="mb-0" style={{ fontSize: "1.2rem" }}>{t("Daily Scheduling")}</h4>
      </div>
      <div className="document-filters-controls-row">
        <div className="document-filters-controls">
        <InputGroup className="document-filter-control document-filter-control--search">
          <InputGroupText>
            <i className="ri-search-line" />
          </InputGroupText>
          <Input
            placeholder={t("Search...")}
            aria-label={t("Search...")}
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
          />
        </InputGroup>
        </div>
        <div className="document-actions-group">
        <Button color="primary" onClick={onCreate} className="document-action-button">
          <i className="ri-add-line" />
          <span>{t("New")}</span>
        </Button>
        </div>
      </div>
    </div>
  );
};

export default ProgramacionFilters;
