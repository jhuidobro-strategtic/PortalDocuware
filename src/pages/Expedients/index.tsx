import React, { useEffect } from "react";
import { Card, CardBody, Container } from "reactstrap";
import { useTranslation } from "react-i18next";
import BreadCrumb from "../../Components/Common/BreadCrumb";

const Expedients = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t("Expedient List")} | Docuware`;
  }, [t]);

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Expedient List" pageTitle="Expedients" />

        <Card className="border-0 shadow-sm">
          <CardBody className="p-4">
            <h5 className="mb-2">{t("Expedient List")}</h5>
            <p className="text-muted mb-0">
              {t("This view is ready to build the expediente listing.")}
            </p>
          </CardBody>
        </Card>
      </Container>
    </div>
  );
};

export default Expedients;
