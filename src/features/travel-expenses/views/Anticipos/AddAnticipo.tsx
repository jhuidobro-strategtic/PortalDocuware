import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  FormGroup,
  Input,
  Label,
  Row,
} from "reactstrap";
import BreadCrumb from "../../../../components/common/BreadCrumb";

const AddAnticipo = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId?: string }>();

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title={t("Nuevo Anticipo")} pageTitle={t("Anticipos")} />

        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h2 className="mb-1 fw-bold text-dark">Generar Anticipo</h2>
            <p className="text-muted mb-0">Completa la información para registrar el pago del viático</p>
          </div>
          <div className="d-flex gap-2">
            <Button color="light" outline className="px-4" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button color="primary" className="px-4 shadow-sm fw-medium d-flex align-items-center gap-1">
              <i className="ri-save-line fs-5"></i> Registrar Anticipo
            </Button>
          </div>
        </div>

        <Row>
          {/* COLUMNA IZQUIERDA: Datos Principales */}
          <Col lg={7}>
            <Card className="border-0 shadow-sm mb-4">
              <CardHeader className="bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                <h5 className="card-title mb-0 fw-bold">
                  <i className="ri-file-list-3-line me-2 text-primary"></i>Datos de la Solicitud
                </h5>
              </CardHeader>
              <CardBody className="p-4">
                <Row className="g-4">
                  <Col md={12}>
                    <FormGroup className="mb-0">
                      <Label className="fw-medium text-muted small text-uppercase">Solicitud de Gastos <span className="text-danger">*</span></Label>
                      <Input type="select" defaultValue={requestId || ""} className="form-select-lg fs-6 bg-light border-0">
                        <option value="" disabled>Seleccionar solicitud vinculada...</option>
                        {requestId && <option value={requestId}>Solicitud #{requestId}</option>}
                        <option value="REQ-001">REQ-001 - Viaje a Piura</option>
                        <option value="REQ-002">REQ-002 - Capacitación Lima</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup className="mb-0">
                      <Label className="fw-medium text-muted small text-uppercase">DNI del Beneficiario</Label>
                      <Input type="text" placeholder="Ej: 12345678" />
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup className="mb-0">
                      <Label className="fw-medium text-muted small text-uppercase">Centro de Costo</Label>
                      <Input type="text" placeholder="Ej: Operaciones" />
                    </FormGroup>
                  </Col>
                </Row>
              </CardBody>
            </Card>

            <Card className="border-0 shadow-sm mb-4">
              <CardHeader className="bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                <h5 className="card-title mb-0 fw-bold">
                  <i className="ri-money-dollar-circle-line me-2 text-primary"></i>Monto y Fecha
                </h5>
              </CardHeader>
              <CardBody className="p-4">
                <Row className="g-4">
                  <Col md={4}>
                    <FormGroup className="mb-0">
                      <Label className="fw-medium text-muted small text-uppercase">Moneda</Label>
                      <Input type="select" className="form-select-lg fs-6">
                        <option value="PEN">PEN (S/)</option>
                        <option value="USD">USD ($)</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md={4}>
                    <FormGroup className="mb-0">
                      <Label className="fw-medium text-muted small text-uppercase">Monto <span className="text-danger">*</span></Label>
                      <Input type="number" placeholder="0.00" step="0.01" className="form-control-lg fs-6 border-primary" style={{backgroundColor: "#f4f7ff"}} />
                    </FormGroup>
                  </Col>
                  <Col md={4}>
                    <FormGroup className="mb-0">
                      <Label className="fw-medium text-muted small text-uppercase">Fecha de Entrega <span className="text-danger">*</span></Label>
                      <Input type="date" defaultValue="2026-05-27" className="form-control-lg fs-6" />
                    </FormGroup>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>

          {/* COLUMNA DERECHA: Datos de Pago y Aprobación */}
          <Col lg={5}>
            <Card className="border-0 shadow-sm mb-4" style={{ backgroundColor: "#fafbfc" }}>
              <CardHeader className="bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                <h5 className="card-title mb-0 fw-bold">
                  <i className="ri-bank-card-line me-2 text-primary"></i>Datos de Pago
                </h5>
              </CardHeader>
              <CardBody className="p-4">
                <Row className="g-4">
                  <Col md={12}>
                    <FormGroup className="mb-0">
                      <Label className="fw-medium text-muted small text-uppercase">Forma de Pago <span className="text-danger">*</span></Label>
                      <Input type="select" defaultValue="Transferencia Bancaria">
                        <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Cheque">Cheque</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup className="mb-0">
                      <Label className="fw-medium text-muted small text-uppercase">Banco</Label>
                      <Input type="select">
                        <option value="">Seleccionar...</option>
                        <option value="BCP">BCP</option>
                        <option value="BBVA">BBVA</option>
                        <option value="Scotiabank">Scotiabank</option>
                        <option value="Interbank">Interbank</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup className="mb-0">
                      <Label className="fw-medium text-muted small text-uppercase">Tipo Cuenta</Label>
                      <Input type="select">
                        <option value="Ahorros">Ahorros</option>
                        <option value="Corriente">Corriente</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md={12}>
                    <FormGroup className="mb-0">
                      <Label className="fw-medium text-muted small text-uppercase">N° de Cuenta</Label>
                      <Input type="text" placeholder="XXX-XXXXXXXX-X-XX" />
                    </FormGroup>
                  </Col>
                  <Col md={12}>
                    <FormGroup className="mb-0">
                      <Label className="fw-medium text-muted small text-uppercase">CCI (Interbancario)</Label>
                      <Input type="text" placeholder="00X XXXXXXXXXXXXXX XX" />
                    </FormGroup>
                  </Col>
                  <Col md={12}>
                    <FormGroup className="mb-0">
                      <Label className="fw-medium text-muted small text-uppercase">N° de Operación / Voucher</Label>
                      <Input type="text" placeholder="Código de la transacción" />
                    </FormGroup>
                  </Col>
                </Row>
              </CardBody>
            </Card>

            <Card className="border-0 shadow-sm mb-4">
              <CardHeader className="bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                <h5 className="card-title mb-0 fw-bold">
                  <i className="ri-user-star-line me-2 text-primary"></i>Autorización
                </h5>
              </CardHeader>
              <CardBody className="p-4">
                <Row className="g-4">
                  <Col md={12}>
                    <FormGroup className="mb-0">
                      <Label className="fw-medium text-muted small text-uppercase">Aprobado por</Label>
                      <Input type="text" placeholder="Nombre del responsable" />
                    </FormGroup>
                  </Col>
                  <Col md={12}>
                    <FormGroup className="mb-0">
                      <Label className="fw-medium text-muted small text-uppercase">Observaciones</Label>
                      <Input type="textarea" rows="3" placeholder="Agrega notas adicionales..." />
                    </FormGroup>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AddAnticipo;
