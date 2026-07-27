import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
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
  Table,
} from "reactstrap";

import BreadCrumb from "../../../../../components/common/BreadCrumb";
import {
  ExpenseRequestListItem,
  getExpenseRequestsForReport,
  getRendicionReport,
  openRendicionReportPdf,
  RendicionReportData,
} from "../services/rendicionReport.service";
import "./RendicionReport.css";

const formatAmount = (val?: string | number) => {
  if (!val) return "0.00";
  const num = typeof val === "number" ? val : parseFloat(val);
  return isNaN(num) ? "0.00" : num.toFixed(2);
};

const RendicionReportView = () => {
  const { t } = useTranslation();

  const [requests, setRequests] = useState<ExpenseRequestListItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [expandedRequests, setExpandedRequests] = useState<Record<number, boolean>>({});
  const [reportsData, setReportsData] = useState<Record<number, RendicionReportData>>({});
  const [loadingReports, setLoadingReports] = useState<Record<number, boolean>>({});
  const [loadingPdfs, setLoadingPdfs] = useState<Record<number, boolean>>({});

  const fetchRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      setError(null);
      const data = await getExpenseRequestsForReport();
      setRequests(data);
    } catch (err: any) {
      setError(err?.message || "Error al cargar las solicitudes de gastos.");
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const toggleRequestExpand = async (requestId: number) => {
    const isCurrentlyExpanded = Boolean(expandedRequests[requestId]);
    const nextState = !isCurrentlyExpanded;

    setExpandedRequests((prev) => ({ ...prev, [requestId]: nextState }));

    if (nextState && !reportsData[requestId]) {
      setLoadingReports((prev) => ({ ...prev, [requestId]: true }));
      try {
        const report = await getRendicionReport(requestId);
        if (report) {
          setReportsData((prev) => ({ ...prev, [requestId]: report }));
        }
      } catch (err: any) {
        console.error(`Error loading report for request #${requestId}:`, err);
      } finally {
        setLoadingReports((prev) => ({ ...prev, [requestId]: false }));
      }
    }
  };

  const handleOpenPdf = async (e: React.MouseEvent, requestId: number) => {
    e.stopPropagation();
    setLoadingPdfs((prev) => ({ ...prev, [requestId]: true }));
    try {
      await openRendicionReportPdf(requestId);
    } catch (err: any) {
      alert(err?.message || "Error al abrir el PDF del reporte.");
    } finally {
      setLoadingPdfs((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const filteredRequests = useMemo(() => {
    if (!searchTerm.trim()) return requests;
    const lower = searchTerm.toLowerCase();
    return requests.filter(
      (r) =>
        (r.request_number && r.request_number.toLowerCase().includes(lower)) ||
        (r.reason && r.reason.toLowerCase().includes(lower)) ||
        (r.trip?.driver?.fullName && r.trip.driver.fullName.toLowerCase().includes(lower))
    );
  }, [requests, searchTerm]);

  const getStatusBadge = (statusObj?: { descripcion?: string }) => {
    const desc = statusObj?.descripcion || "PENDIENTE";
    const st = desc.toLowerCase();
    if (st.includes("pendiente")) return <Badge color="warning" className="px-2 py-1">{desc}</Badge>;
    if (st.includes("aprobado")) return <Badge color="success" className="px-2 py-1">{desc}</Badge>;
    if (st.includes("rechazado")) return <Badge color="danger" className="px-2 py-1">{desc}</Badge>;
    return <Badge color="secondary" className="px-2 py-1">{desc}</Badge>;
  };

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title={t("Reporte de rendiciones")} pageTitle={t("Reportes")} />

        <Row className="align-items-center mb-4">
          <Col md={8}>
            <h3 className="mb-1 fw-bold text-dark">Reporte de Rendiciones</h3>
            <p className="text-muted mb-0 fs-14">
              Visualiza el desglose completo de rendiciones, viáticos y comprobantes de cada solicitud de viaje.
            </p>
          </Col>
          <Col md={4} className="text-md-end mt-3 mt-md-0">
            <Button color="light" className="btn-icon btn-soft-secondary me-2" onClick={fetchRequests} title="Actualizar">
              <i className="ri-refresh-line"></i>
            </Button>
          </Col>
        </Row>

        <div className="mb-4" style={{ maxWidth: "380px" }}>
          <InputGroup>
            <InputGroupText className="bg-white border-end-0">
              <i className="ri-search-line text-muted"></i>
            </InputGroupText>
            <Input
              type="text"
              className="border-start-0"
              placeholder="Buscar por solicitud, motivo o conductor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </div>

        {error ? <Alert color="danger">{error}</Alert> : null}

        {loadingRequests ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
            <p className="text-muted mt-2">Cargando solicitudes de rendición...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="shadow-sm border-0 p-5 text-center">
            <div className="text-muted">
              <i className="ri-file-chart-line display-4 d-block mb-2 text-primary"></i>
              <h5 className="fw-bold">No se encontraron solicitudes</h5>
              <p className="mb-0">No hay rendiciones disponibles para el criterio de búsqueda.</p>
            </div>
          </Card>
        ) : (
          <div className="d-flex flex-column gap-3 mb-5">
            {filteredRequests.map((reqItem) => {
              const reqId = reqItem.id_request;
              const isExpanded = Boolean(expandedRequests[reqId]);
              const report = reportsData[reqId];
              const isLoadingReport = Boolean(loadingReports[reqId]);
              const isLoadingPdf = Boolean(loadingPdfs[reqId]);

              return (
                <div key={reqId} className={`rendicion-card ${isExpanded ? "expanded" : ""}`}>
                  {/* Cabecera de Solicitud */}
                  <div className="rendicion-header d-flex align-items-center justify-content-between flex-wrap gap-3" onClick={() => toggleRequestExpand(reqId)}>
                    <div className="d-flex align-items-center me-3">
                      <span className="rendicion-toggle-btn">{isExpanded ? "-" : "+"}</span>
                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                          <h5 className="mb-0 fw-bold text-dark">{reqItem.request_number || `SV-2026-${reqId}`}</h5>
                          {getStatusBadge(reqItem.status_data)}
                          {reqItem.reason ? <span className="text-muted small">· {reqItem.reason}</span> : null}
                        </div>
                        <div className="text-muted small">
                          <i className="ri-user-line me-1 align-middle"></i>
                          <span className="fw-medium text-dark">{reqItem.trip?.driver?.fullName || reqItem.requester_name || "Conductor Beneficiario"}</span>
                          {reqItem.total_budget ? (
                            <span className="ms-3 text-primary fw-semibold">
                              Presupuesto: S/ {formatAmount(reqItem.total_budget)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        color="danger"
                        outline
                        size="sm"
                        className="d-flex align-items-center gap-1 shadow-sm px-3 fw-medium"
                        onClick={(e) => handleOpenPdf(e, reqId)}
                        disabled={isLoadingPdf}
                      >
                        {isLoadingPdf ? <Spinner size="sm" /> : <i className="ri-file-pdf-2-line fs-5"></i>}
                        <span>Ver reporte PDF</span>
                      </Button>
                    </div>
                  </div>

                  {/* Detalle Expandido */}
                  <Collapse isOpen={isExpanded}>
                    <div className="p-4 bg-white border-top">
                      {isLoadingReport ? (
                        <div className="text-center py-4">
                          <Spinner size="sm" color="primary" />
                          <span className="ms-2 small text-muted">Cargando detalle de rendición...</span>
                        </div>
                      ) : report ? (
                        <div>
                          {/* Resumen Financiero KPIs */}
                          <Row className="g-3 mb-4">
                            <Col lg={2} md={4} sm={6}>
                              <div className="p-3 bg-light rounded text-center border">
                                <div className="text-muted small mb-1">Presupuesto Total</div>
                                <h6 className="mb-0 fw-bold text-dark">S/ {formatAmount(report.summary?.total_budget)}</h6>
                              </div>
                            </Col>
                            <Col lg={2} md={4} sm={6}>
                              <div className="p-3 bg-primary-subtle rounded text-center border border-primary-subtle">
                                <div className="text-primary small mb-1 fw-medium">Anticipos Entregados</div>
                                <h6 className="mb-0 fw-bold text-primary">S/ {formatAmount(report.summary?.total_advances)}</h6>
                              </div>
                            </Col>
                            <Col lg={3} md={4} sm={6}>
                              <div className="p-3 bg-info-subtle rounded text-center border border-info-subtle">
                                <div className="text-info small mb-1 fw-medium">Total Rendido (Comprobantes)</div>
                                <h6 className="mb-0 fw-bold text-info">S/ {formatAmount(report.summary?.total_reported)}</h6>
                              </div>
                            </Col>
                            <Col lg={2} md={6} sm={6}>
                              <div className="p-3 bg-warning-subtle rounded text-center border border-warning-subtle">
                                <div className="text-warning-emphasis small mb-1 fw-medium">Saldo Anticipo</div>
                                <h6 className="mb-0 fw-bold text-warning-emphasis">S/ {formatAmount(report.summary?.advance_balance)}</h6>
                              </div>
                            </Col>
                            <Col lg={3} md={6} sm={6}>
                              <div className="p-3 bg-success-subtle rounded text-center border border-success-subtle">
                                <div className="text-success small mb-1 fw-medium">Saldo Presupuesto</div>
                                <h6 className="mb-0 fw-bold text-success">S/ {formatAmount(report.summary?.budget_balance)}</h6>
                              </div>
                            </Col>
                          </Row>

                          {/* Sección Anticipos Registrados */}
                          {report.advances && report.advances.length > 0 ? (
                            <div className="mb-4">
                              <h6 className="fw-bold text-dark mb-2">
                                <i className="ri-hand-coin-line me-1 text-primary"></i> Anticipos Abonados ({report.advances.length})
                              </h6>
                              <div className="table-responsive">
                                <Table size="sm" className="align-middle table-nowrap mb-0 border">
                                  <thead className="table-light text-muted small text-uppercase">
                                    <tr>
                                      <th>N° Anticipo</th>
                                      <th>Monto</th>
                                      <th>Fecha</th>
                                      <th>Banco</th>
                                      <th>Tipo Cuenta</th>
                                      <th>N° Cuenta / CCI</th>
                                      <th>Operación</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {report.advances.map((adv) => (
                                      <tr key={adv.expense_advance_id}>
                                        <td className="fw-bold text-primary">{adv.anticipo_number}</td>
                                        <td className="fw-bold">{adv.currency || "PEN"} {formatAmount(adv.amount)}</td>
                                        <td>{adv.delivery_date}</td>
                                        <td>{adv.bank_data?.descripcion || "-"}</td>
                                        <td>{adv.account_type_data?.descripcion || "-"}</td>
                                        <td className="small">{adv.account_number || "-"} {adv.cci ? `(CCI: ${adv.cci})` : ""}</td>
                                        <td className="font-monospace small">{adv.operation_number || "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </Table>
                              </div>
                            </div>
                          ) : null}

                          {/* Sección Conceptos y Comprobantes */}
                          {report.details && report.details.length > 0 ? (
                            <div>
                              <h6 className="fw-bold text-dark mb-3">
                                <i className="ri-receipt-line me-1 text-primary"></i> Desglose de Rendición por Concepto y Comprobantes
                              </h6>
                              <div className="d-flex flex-column gap-3">
                                {report.details.map((detail) => (
                                  <Card key={detail.expense_detail_id} className="border shadow-none mb-0 bg-light-subtle">
                                    <CardBody className="p-3">
                                      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                                        <div className="d-flex align-items-center gap-2">
                                          <Badge color="primary" className="fs-12 px-3 py-1">
                                            {detail.concept?.nombre_concepto || "CONCEPTO"}
                                          </Badge>
                                          <span className="text-muted small">
                                            Presupuesto Concepto: <strong className="text-dark">S/ {formatAmount(detail.budgeted_amount)}</strong>
                                          </span>
                                        </div>
                                        <span className="badge bg-soft-info text-info border border-info-subtle">
                                          {detail.vouchers?.length || 0} Comprobante(s)
                                        </span>
                                      </div>

                                      {detail.vouchers && detail.vouchers.length > 0 ? (
                                        <div className="table-responsive bg-white rounded border mt-2">
                                          <Table size="sm" className="align-middle table-nowrap mb-0">
                                            <thead className="table-light text-muted small">
                                              <tr>
                                                <th>Tipo Doc</th>
                                                <th>RUC Emisor</th>
                                                <th>Serie - Número</th>
                                                <th>Monto</th>
                                                <th>Comprobante / Foto</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {detail.vouchers.map((v) => (
                                                <tr key={v.expense_voucher_id}>
                                                  <td>
                                                    <span className="badge bg-light text-dark border">
                                                      {v.document_type_data?.tipo || "FACTURA"}
                                                    </span>
                                                  </td>
                                                  <td className="font-monospace small">{v.supplier_ruc || "-"}</td>
                                                  <td className="fw-semibold">
                                                    {v.series_number ? `${v.series_number}-${v.voucher_number}` : v.voucher_number || "-"}
                                                  </td>
                                                  <td className="fw-bold text-success">S/ {formatAmount(v.amount)}</td>
                                                  <td>
                                                    {v.photo_url ? (
                                                      <a
                                                        href={v.photo_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="voucher-thumbnail-link"
                                                      >
                                                        <i className="ri-external-link-line"></i> Ver comprobante
                                                      </a>
                                                    ) : (
                                                      <span className="text-muted small">Sin adjunto</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </Table>
                                        </div>
                                      ) : (
                                        <p className="text-muted fst-italic small mb-0 mt-1">
                                          No se han adjuntado comprobantes para este concepto.
                                        </p>
                                      )}
                                    </CardBody>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="text-muted small py-3">No hay información detallada disponible para esta solicitud.</div>
                      )}
                    </div>
                  </Collapse>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
};

export default RendicionReportView;
