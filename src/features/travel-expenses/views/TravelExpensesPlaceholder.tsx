import React from "react";
import { Card, CardBody, Container } from "reactstrap";
import { useTranslation } from "react-i18next";

import BreadCrumb from "../../../components/common/BreadCrumb";

interface TravelExpensesPlaceholderProps {
  titleKey: string;
}

const TravelExpensesPlaceholder: React.FC<TravelExpensesPlaceholderProps> = ({
  titleKey,
}) => {
  const { t } = useTranslation();

  document.title = `${t(titleKey)} | Docuware`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title={titleKey} pageTitle="Travel Expenses" />

        <Card className="border-0 shadow-sm">
          <CardBody className="p-4">
            <h5 className="mb-1">{t(titleKey)}</h5>
            <p className="text-muted mb-0">
              {t("This view is ready for the next implementation step.")}
            </p>
          </CardBody>
        </Card>
      </Container>
    </div>
  );
};

export default TravelExpensesPlaceholder;
