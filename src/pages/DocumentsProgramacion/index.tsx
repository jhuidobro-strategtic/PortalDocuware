import React from "react";
import { Container } from "reactstrap";
import { useTranslation } from "react-i18next";

import BreadCrumb from "../../Components/Common/BreadCrumb";
import AllTasks from "./AllTasks";

const DashboardDocumentsProgramacion = () => {
  const { t } = useTranslation();

  document.title = `${t("Programming")} | Docuware`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Programming" pageTitle="Dashboards" />
          <AllTasks />
        </Container>
      </div>
    </React.Fragment>
  );
};

export default DashboardDocumentsProgramacion;
