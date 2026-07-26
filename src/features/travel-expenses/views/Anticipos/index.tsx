import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Collapse,
  Container,
  Input,
  InputGroup,
  InputGroupText,
  Row,
  Spinner,
} from "reactstrap";

import BreadCrumb from "../../../../components/common/BreadCrumb";
import { formatAmount } from "../../my-schedule/shared/formatters";
import {
  ExpenseAdvanceItem,
  getExpenseAdvances,
} from "./services/expenseAdvances.service";
import "./Anticipos.css";

const Anticipos = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [advances, setAdvances] = useState<ExpenseAdvanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const fetchAdvances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExpenseAdvances();
      setAdvances(data);
      if (data.length > 0) {
        const firstItem = data[0];
        setExpandedId(firstItem.id || firstItem.expense_advance_id || firstItem.anticipo_number);
      }
    } catch (err: any) {
      setError(err?.message || "Error al cargar los anticipos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdvances();
  }, [fetchAdvances]);

  const toggleAccordion = (id: string | number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredAdvances = useMemo(() => {
    if (!searchTerm.trim()) {
      return advances;
    }
    const term = searchTerm.toLowerCase();
    return advances.filter((item) => {
      const searchables = [
        item.anticipo_number,
        item.request_number,
        item.requester_name,
        item.requester_dni,
        item.bank,
        item.payment_method,
        item.cost_center,
      ];
      return searchables.some((val) => val && String(val).toLowerCase().includes(term));
    });
  }, [advances, searchTerm]);

  const kpis = useMemo(() => {
    let pending = 0;
    let delivered = 0;
    let liquidated = 0;

    advances.forEach((item) => {
      const numAmount = parseFloat(item.amount || "0");
      const st = String(item.status).toLowerCase();

      if (st === "21" || st.includes("pendiente")) {
        pending += numAmount;
      } else if (st === "22" || st.includes("entregado") || st.includes("aprobado")) {
        delivered += numAmount;
      } else if (st === "23" || st.includes("liquidado")) {
        liquidated += numAmount;
      } else {
        pending += numAmount;
      }
    });

    return { pending, delivered, liquidated };
  }, [advances]);

  const getStatusBadge = (item: ExpenseAdvanceItem) => {
    const label = item.status_data?.descripcion || String(item.status || "");
    const st = label.toLowerCase();
    if (st.includes("pendiente") || st === "11" || st === "21") {
      return <Badge color="warning" className="me-3 anticipo-badge anticipo-badge-warning">{item.status_data?.descripcion || "Pendiente"}</Badge>;
    }
    if (st.includes("entregado") || st === "22") {
      return <Badge color="info" className="me-3 anticipo-badge anticipo-badge-info">{item.status_data?.descripcion || "Entregado"}</Badge>;
    }
    if (st.includes("liquidado") || st === "23") {
      return <Badge color="success" className="me-3 anticipo-badge bg-success-subtle text-success">{item.status_data?.descripcion || "Liquidado"}</Badge>;
    }
    return <Badge color="secondary" className="me-3 anticipo-badge">{label}</Badge>;
  };

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title={t("Anticipos")} pageTitle={t("Travel Expenses")} />

          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
            <div>
              <h2 className="mb-1 fw-bold text-dark">Anticipos de Viáticos</h2>
              <p className="text-muted mb-0">Control de anticipos entregados contra solicitudes de gastos</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Button
                color="light"
                className="btn-icon btn-soft-secondary"
                onClick={fetchAdvances}
                title="Actualizar"
              >
                <i className="ri-refresh-line"></i>
              </Button>
              <Button
                color="primary"
                className="d-flex align-items-center gap-1 btn-label-icon"
                onClick={() => navigate("/travel-expenses/anticipos/new")}
              >
                <i className="ri-add-line fs-5"></i> Nuevo Anticipo
              </Button>
            </div>
          </div>

          <Row className="mb-4">
            <Col md={4}>
              <Card className="shadow-sm border-0 anticipo-kpi-card mb-3 mb-md-0">
                <CardBody>
                  <div className="text-muted small mb-1">Por Entregar</div>
                  <h3 className="mb-0 text-warning fw-bold">{formatAmount(String(kpis.pending))}</h3>
                </CardBody>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="shadow-sm border-0 anticipo-kpi-card mb-3 mb-md-0">
                <CardBody>
                  <div className="text-muted small mb-1">Entregados</div>
                  <h3 className="mb-0 text-primary fw-bold">{formatAmount(String(kpis.delivered))}</h3>
                </CardBody>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="shadow-sm border-0 anticipo-kpi-card">
                <CardBody>
                  <div className="text-muted small mb-1">Liquidados</div>
                  <h3 className="mb-0 text-success fw-bold">{formatAmount(String(kpis.liquidated))}</h3>
                </CardBody>
              </Card>
            </Col>
          </Row>

          <div className="mb-4" style={{ maxWidth: "340px" }}>
            <InputGroup>
              <InputGroupText>
                <i className="ri-search-line"></i>
              </InputGroupText>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por anticipo, DNI, banco..."
              />
            </InputGroup>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
            </div>
          ) : error ? (
            <div className="alert alert-danger text-center my-4">{error}</div>
          ) : filteredAdvances.length === 0 ? (
            <Card className="shadow-sm border-0 p-5 text-center">
              <div className="text-muted">
                <i className="ri-wallet-3-line display-4 d-block mb-2"></i>
                <h5>No se encontraron anticipos registrados</h5>
                <p className="mb-3">Genera un nuevo anticipo asociado a una solicitud de gastos.</p>
                <Button
                  color="primary"
                  size="sm"
                  onClick={() => navigate("/travel-expenses/anticipos/new")}
                >
                  <i className="ri-add-line me-1"></i> Generar Anticipo
                </Button>
              </div>
            </Card>
          ) : (
            <div>
              {filteredAdvances.map((item, idx) => {
                const itemId = item.id || item.expense_advance_id || item.anticipo_number || idx;
                const isExpanded = expandedId === itemId;

                return (
                  <Card key={itemId} className="mb-3 shadow-sm border-0 anticipo-list-card">
                    <CardBody className="p-4">
                      <div
                        className="d-flex justify-content-between align-items-sm-center flex-column flex-sm-row cursor-pointer"
                        onClick={() => toggleAccordion(itemId)}
                      >
                        <div>
                          <div className="d-flex align-items-center mb-2">
                            <h5 className="mb-0 me-3 fw-bold">{item.anticipo_number || `ANT-${itemId}`}</h5>
                            {getStatusBadge(item)}
                            <span className="text-muted small fw-medium">{item.request_number || `-`}</span>
                          </div>
                          <div className="text-muted small">
                            <span className="fw-medium text-dark">{item.requester_name || "-"}</span>
                            {item.requester_dni ? ` · DNI ${item.requester_dni}` : ""}
                            {item.requester_email ? ` (${item.requester_email})` : ""}
                          </div>
                        </div>

                        <div className="text-end d-flex align-items-center mt-3 mt-sm-0">
                          <div className="me-3 text-end">
                            <h4 className="mb-1 fw-bold text-primary">
                              {item.currency || "S/"} {formatAmount(item.amount)}
                            </h4>
                            <div className="text-muted small">{item.delivery_date || "-"}</div>
                          </div>
                          <div className="ms-2">
                            <i className={`ri-arrow-${isExpanded ? "up" : "down"}-s-line fs-2 text-muted`}></i>
                          </div>
                        </div>
                      </div>

                      <Collapse isOpen={isExpanded}>
                        <hr className="my-4 border-light" />
                        <Row className="small">
                          <Col md={3} className="mb-3">
                            <div className="text-muted mb-1">Forma de Pago</div>
                            <div className="fw-medium text-dark">
                              {item.payment_method_data?.descripcion || item.payment_method || "-"}
                            </div>
                          </Col>
                          <Col md={3} className="mb-3">
                            <div className="text-muted mb-1">Banco</div>
                            <div className="fw-medium text-dark">
                              {item.bank_data?.descripcion || item.bank || "-"}
                            </div>
                          </Col>
                          <Col md={3} className="mb-3">
                            <div className="text-muted mb-1">Tipo de Cuenta</div>
                            <div className="fw-medium text-dark">
                              {item.account_type_data?.descripcion || item.account_type || "-"}
                            </div>
                          </Col>
                          <Col md={3} className="mb-3">
                            <div className="text-muted mb-1">N° de Cuenta</div>
                            <div className="fw-medium text-dark">{item.account_number || "-"}</div>
                          </Col>

                          <Col md={3} className="mb-3">
                            <div className="text-muted mb-1">CCI</div>
                            <div className="fw-medium text-dark">{item.cci || "-"}</div>
                          </Col>
                          <Col md={3} className="mb-3">
                            <div className="text-muted mb-1">N° Operación</div>
                            <div className="fw-medium text-dark">{item.operation_number || "-"}</div>
                          </Col>
                          <Col md={3} className="mb-3">
                            <div className="text-muted mb-1">Autorizado por</div>
                            <div className="fw-medium text-dark">{item.approved_by || "-"}</div>
                          </Col>
                          <Col md={3} className="mb-3">
                            <div className="text-muted mb-1">Centro de Costo</div>
                            <div className="fw-medium text-dark">
                              {item.cost_center_data?.descripcion || item.cost_center || "-"}
                            </div>
                          </Col>
                        </Row>

                        {item.notes ? (
                          <div className="fst-italic text-muted small mb-3 mt-1 bg-light p-2 rounded">
                            "{item.notes}"
                          </div>
                        ) : null}
                      </Collapse>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </Container>
      </div>
    </React.Fragment>
  );
};

export default Anticipos;
