import React from "react";
import { Card, CardBody, Container } from "reactstrap";

import BreadCrumb from "../../Components/Common/BreadCrumb";

const PurchaseOrderDetails = () => {
  document.title = "Detalle de Orden de Compra | Docuware";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            title="Detalle de Orden de Compra"
            pageTitle="Ordenes de Compra"
          />

          <Card className="border-0 shadow-sm">
            <CardBody className="py-5 text-center">
              <div className="mx-auto" style={{ maxWidth: "520px" }}>
                <div className="avatar-md mx-auto mb-4">
                  <div className="avatar-title bg-light text-primary rounded-circle fs-2">
                    <i className="ri-file-list-3-line" />
                  </div>
                </div>
                <h4 className="mb-2">Vista lista para configurar</h4>
                <p className="text-muted mb-0">
                  Esta pantalla quedo creada y preparada para que agreguemos la
                  estructura de Detalle de Orden de Compra en el siguiente paso.
                </p>
              </div>
            </CardBody>
          </Card>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default PurchaseOrderDetails;
