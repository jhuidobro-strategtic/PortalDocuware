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
    <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
      <h4 className="card-title mb-0">{t("Daily Scheduling")}</h4>
      <div className="d-flex gap-2 align-items-center">
        <InputGroup style={{ maxWidth: "250px" }}>
          <InputGroupText>
            <i className="ri-search-line" />
          </InputGroupText>
          <Input
            placeholder={t("Search...")}
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
          />
        </InputGroup>
        <Button color="primary" onClick={onCreate}>
          <i className="ri-add-line align-bottom me-1" />
          {t("New")}
        </Button>
      </div>
    </div>
  );
};

export default ProgramacionFilters;
