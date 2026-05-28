import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Badge,
  Collapse,
} from "reactstrap";

import BreadCrumb from "../../../../components/common/BreadCrumb";
import "./Advances.css";

// MOCK DATA based on the provided image
const mockAdvances = [
  {
    id: "ANT-2705-8477",
    status: "Pendiente",
    statusColor: "warning",
    reqId: "SG-2605-0001",
    name: "Carlos Mendoza",
    dni: "65444569785",
    amount: "PEN 5000.00",
    amountColor: "primary",
    date: "2026-05-27",
    paymentMethod: "Transferencia",
    bank: "BBVA",
    accountType: "Ahorros",
    accountNumber: "987456321",
    cci: "1235879462",
    opNumber: "8526",
    authorizedBy: "Jeferson",
    costCenter: "centro de costo 2",
    message: "no tengo observaciones para este registro",
  },
  {
    id: "ANT-2705-8971",
    status: "Entregado",
    statusColor: "info",
    reqId: "SG-2605-3954",
    name: "Angelo",
    dni: "12312312",
    amount: "PEN 12332.00",
    amountColor: "primary",
    date: "2026-05-27",
    paymentMethod: "Efectivo",
    bank: "-",
    accountType: "-",
    accountNumber: "-",
    cci: "-",
    opNumber: "-",
    authorizedBy: "Jeferson",
    costCenter: "centro de costo 1",
    message: "anticipo validado correctamente",
  },
];

const Advances = () => {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>("ANT-2705-8477"); // Default open first one based on image

  const toggleAccordion = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title={t("Advances")} pageTitle={t("Travel Expenses")} />

          <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
              <h2 className="mb-1 fw-bold text-dark">Anticipos de Viáticos</h2>
              <p className="text-muted mb-0">Control de anticipos entregados contra solicitudes de gastos</p>
            </div>
            <div>
              <Button color="primary" className="d-flex align-items-center gap-1 btn-label-icon">
                <i className="ri-add-line fs-5"></i> Nuevo Anticipo
              </Button>
            </div>
          </div>

          <Row className="mb-4">
            <Col md={4}>
              <Card className="shadow-sm border-0 advance-kpi-card mb-3 mb-md-0">
                <CardBody>
                  <div className="text-muted small mb-1">Por Entregar</div>
                  <h3 className="mb-0 text-orange fw-bold">S/ 5000.00</h3>
                </CardBody>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="shadow-sm border-0 advance-kpi-card mb-3 mb-md-0">
                <CardBody>
                  <div className="text-muted small mb-1">Entregados</div>
                  <h3 className="mb-0 text-primary fw-bold">S/ 12332.00</h3>
                </CardBody>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="shadow-sm border-0 advance-kpi-card">
                <CardBody>
                  <div className="text-muted small mb-1">Liquidados</div>
                  <h3 className="mb-0 text-success fw-bold">S/ 0.00</h3>
                </CardBody>
              </Card>
            </Col>
          </Row>

          <div>
            {mockAdvances.map((item) => (
              <Card key={item.id} className="mb-3 shadow-sm border-0 advance-list-card">
                <CardBody className="p-4">
                  <div 
                    className="d-flex justify-content-between align-items-sm-center flex-column flex-sm-row cursor-pointer" 
                    onClick={() => toggleAccordion(item.id)}
                  >
                    <div>
                      <div className="d-flex align-items-center mb-2">
                        <h5 className="mb-0 me-3 fw-bold">{item.id}</h5>
                        <Badge 
                          color={item.statusColor} 
                          className={`me-3 advance-badge advance-badge-${item.statusColor}`}
                        >
                          {item.status}
                        </Badge>
                        <span className="text-muted small">{item.reqId}</span>
                      </div>
                      <div className="text-muted small">
                        {item.name} · DNI {item.dni}
                      </div>
                    </div>
                    
                    <div className="text-end d-flex align-items-center mt-3 mt-sm-0">
                      <div className="me-3 text-end">
                        <h4 className={`mb-1 fw-bold text-${item.amountColor}`}>{item.amount}</h4>
                        <div className="text-muted small">{item.date}</div>
                      </div>
                      <div className="ms-2">
                        <i className={`ri-arrow-${expandedId === item.id ? 'up' : 'down'}-s-line fs-2 text-muted`}></i>
                      </div>
                    </div>
                  </div>

                  <Collapse isOpen={expandedId === item.id}>
                    <hr className="my-4 border-light" />
                    <Row className="small">
                      <Col md={3} className="mb-3">
                        <div className="text-muted mb-1">Forma de Pago</div>
                        <div className="fw-medium text-dark">{item.paymentMethod}</div>
                      </Col>
                      <Col md={3} className="mb-3">
                        <div className="text-muted mb-1">Banco</div>
                        <div className="fw-medium text-dark">{item.bank}</div>
                      </Col>
                      <Col md={3} className="mb-3">
                        <div className="text-muted mb-1">Tipo de Cuenta</div>
                        <div className="fw-medium text-dark">{item.accountType}</div>
                      </Col>
                      <Col md={3} className="mb-3">
                        <div className="text-muted mb-1">N° de Cuenta</div>
                        <div className="fw-medium text-dark">{item.accountNumber}</div>
                      </Col>

                      <Col md={3} className="mb-3">
                        <div className="text-muted mb-1">CCI</div>
                        <div className="fw-medium text-dark">{item.cci}</div>
                      </Col>
                      <Col md={3} className="mb-3">
                        <div className="text-muted mb-1">N° Operación</div>
                        <div className="fw-medium text-dark">{item.opNumber}</div>
                      </Col>
                      <Col md={3} className="mb-3">
                        <div className="text-muted mb-1">Autorizado por</div>
                        <div className="fw-medium text-dark">{item.authorizedBy}</div>
                      </Col>
                      <Col md={3} className="mb-3">
                        <div className="text-muted mb-1">Centro de Costo</div>
                        <div className="fw-medium text-dark">{item.costCenter}</div>
                      </Col>
                    </Row>
                    
                    <div className="fst-italic text-muted small mb-4 mt-2">
                      "{item.message}"
                    </div>
                    
                    <div className="d-flex gap-2">
                      <Button color="dark" outline size="sm" className="px-4 py-1 advance-action-btn">
                        Aprobar
                      </Button>
                      <Button color="danger" outline size="sm" className="px-4 py-1 advance-action-btn border-danger-subtle text-danger">
                        Anular
                      </Button>
                    </div>
                  </Collapse>
                </CardBody>
              </Card>
            ))}
          </div>

        </Container>
      </div>
    </React.Fragment>
  );
};

export default Advances;
