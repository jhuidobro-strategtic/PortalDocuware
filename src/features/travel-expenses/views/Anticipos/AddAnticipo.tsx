import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import Select from "react-select";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Form,
  FormFeedback,
  FormGroup,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";

import BreadCrumb from "../../../../components/common/BreadCrumb";
import { buildApiUrl } from "../../../../helpers/api-url";
import { getAuthHeaders, getCurrentSessionUser } from "../../my-schedule/shared/session";
import { createExpenseAdvance } from "./services/expenseAdvances.service";

interface ExpenseRequestOption {
  id_request: number;
  request_number: string;
  reason?: string;
  total_budget?: string;
  status?: number;
  status_data?: {
    id?: number;
  };
  requester_name?: any;
  trip?: {
    driver?: {
      fullName?: string;
    };
  };
}

interface CatalogOption {
  id: number;
  codigo: string;
  descripcion: string;
  tipo_catalogo: string;
}

interface CostCenterOption {
  centroid: number;
  centrocodigo: string;
  descripcion: string;
}

interface SelectOption {
  value: string;
  label: string;
}

const selectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base,
    minHeight: "38px",
    borderColor: "#ced4da",
    borderRadius: "0.25rem",
    boxShadow: "none",
    "&:hover": {
      borderColor: "#405189",
    },
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    zIndex: 9999,
  }),
  menuPortal: (base: Record<string, unknown>) => ({
    ...base,
    zIndex: 9999,
  }),
};

const generateAnticipoNumber = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const random4 = Math.floor(1000 + Math.random() * 9000);
  return `ANT-${yy}${mm}-${random4}`;
};

const getTodayDateString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const AddAnticipo = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId?: string }>();

  const [requestsOptions, setRequestsOptions] = useState<ExpenseRequestOption[]>([]);
  const [bankCatalog, setBankCatalog] = useState<CatalogOption[]>([]);
  const [accountTypeCatalog, setAccountTypeCatalog] = useState<CatalogOption[]>([]);
  const [paymentMethodCatalog, setPaymentMethodCatalog] = useState<CatalogOption[]>([]);
  const [costCenterCatalog, setCostCenterCatalog] = useState<CostCenterOption[]>([]);
  const [statusCatalog, setStatusCatalog] = useState<CatalogOption[]>([]);

  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState({
    id_request: "",
    request_number: "",
    anticipo_number: generateAnticipoNumber(),
    requester_name: "",
    requester_dni: "",
    requester_email: "",
    cost_center: "",
    amount: "",
    currency: "PEN",
    delivery_date: getTodayDateString(),
    payment_method: "",
    bank: "",
    account_type: "",
    account_number: "",
    cci: "",
    operation_number: "",
    approved_by: "",
    notes: "",
    status: "11",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const headers = getAuthHeaders();

        const [requestsRes, bankRes, accountTypeRes, paymentMethodRes, costCenterRes, statusRes] =
          await Promise.all([
            fetch(buildApiUrl("expense-requests/"), { headers }).catch(() => null),
            fetch(buildApiUrl("catalogos/?tipo_catalogo=BANK"), { headers }).catch(() => null),
            fetch(buildApiUrl("catalogos/?tipo_catalogo=ACCOUNT_TYPE"), { headers }).catch(() => null),
            fetch(buildApiUrl("catalogos/?tipo_catalogo=PAYMENT_METHOD"), { headers }).catch(() => null),
            fetch("https://docuware-api-a09ab977636d.herokuapp.com/api/centro-costo", { headers }).catch(() =>
              fetch(buildApiUrl("centro-costo")).catch(() => null)
            ),
            fetch(buildApiUrl("catalogos/?tipo_catalogo=STATE_OF_PURCHASE_ORDER"), { headers }).catch(() => null),
          ]);

        if (isMounted) {
          if (requestsRes?.ok) {
            const reqData = await requestsRes.json();
            const list = Array.isArray(reqData?.data) ? reqData.data : Array.isArray(reqData) ? reqData : [];
            setRequestsOptions(list);
          }
          if (bankRes?.ok) {
            const bankData = await bankRes.json();
            const list = Array.isArray(bankData?.data) ? bankData.data : [];
            setBankCatalog(list);
            if (list.length > 0) {
              setFormValues((prev) => ({ ...prev, bank: String(list[0].id) }));
            }
          }
          if (accountTypeRes?.ok) {
            const accData = await accountTypeRes.json();
            const list = Array.isArray(accData?.data) ? accData.data : [];
            setAccountTypeCatalog(list);
            if (list.length > 0) {
              setFormValues((prev) => ({ ...prev, account_type: String(list[0].id) }));
            }
          }
          if (paymentMethodRes?.ok) {
            const pmData = await paymentMethodRes.json();
            const list = Array.isArray(pmData?.data) ? pmData.data : [];
            setPaymentMethodCatalog(list);
            if (list.length > 0) {
              setFormValues((prev) => ({ ...prev, payment_method: String(list[0].id) }));
            }
          }
          if (costCenterRes?.ok) {
            const ccData = await costCenterRes.json();
            const list = Array.isArray(ccData) ? ccData : Array.isArray(ccData?.data) ? ccData.data : [];
            setCostCenterCatalog(list);
            if (list.length > 0) {
              setFormValues((prev) => ({ ...prev, cost_center: list[0].descripcion || String(list[0].centroid) }));
            }
          }
          if (statusRes?.ok) {
            const stData = await statusRes.json();
            const list = Array.isArray(stData?.data) ? stData.data : [];
            setStatusCatalog(list);
          }
        }
      } catch {
        // Fallback silently
      } finally {
        if (isMounted) {
          setLoadingRequests(false);
        }
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const requestSelectOptions = useMemo<SelectOption[]>(
    () =>
      requestsOptions.map((req) => ({
        value: String(req.id_request),
        label: `${req.request_number || `SG-${req.id_request}`} ${req.reason ? `- ${req.reason}` : ""} ${
          req.total_budget ? `(Presupuesto: S/ ${req.total_budget})` : ""
        }`.trim(),
      })),
    [requestsOptions]
  );

  const bankSelectOptions = useMemo<SelectOption[]>(
    () =>
      bankCatalog.map((bk) => ({
        value: String(bk.id),
        label: bk.descripcion,
      })),
    [bankCatalog]
  );

  const accountTypeSelectOptions = useMemo<SelectOption[]>(
    () =>
      accountTypeCatalog.map((acc) => ({
        value: String(acc.id),
        label: acc.descripcion,
      })),
    [accountTypeCatalog]
  );

  const paymentMethodSelectOptions = useMemo<SelectOption[]>(
    () =>
      paymentMethodCatalog.map((pm) => ({
        value: String(pm.id),
        label: pm.descripcion,
      })),
    [paymentMethodCatalog]
  );

  const costCenterSelectOptions = useMemo<SelectOption[]>(
    () =>
      costCenterCatalog.map((cc) => ({
        value: cc.descripcion,
        label: cc.centrocodigo ? `${cc.centrocodigo} - ${cc.descripcion}` : cc.descripcion,
      })),
    [costCenterCatalog]
  );

  const statusSelectOptions = useMemo<SelectOption[]>(
    () =>
      statusCatalog.length > 0
        ? statusCatalog.map((st) => ({
            value: String(st.id),
            label: st.descripcion,
          }))
        : [{ value: "11", label: "PENDIENTE" }],
    [statusCatalog]
  );

  const currencySelectOptions: SelectOption[] = [
    { value: "PEN", label: "PEN (S/)" },
    { value: "USD", label: "USD ($)" },
  ];

  const handleRequestSelect = (requestIdStr: string, optionsList = requestsOptions) => {
    const parsedId = Number(requestIdStr);
    const selected = optionsList.find((req) => req.id_request === parsedId);

    if (selected) {
      const driverName = selected.trip?.driver?.fullName || "";
      setFormValues((prev) => ({
        ...prev,
        id_request: String(selected.id_request),
        request_number: selected.request_number || `SG-${selected.id_request}`,
        amount: selected.total_budget ? String(parseFloat(selected.total_budget)) : prev.amount,
        requester_name: driverName || prev.requester_name,
      }));
    } else {
      setFormValues((prev) => ({
        ...prev,
        id_request: requestIdStr,
        request_number: requestIdStr ? `SG-${requestIdStr}` : "",
      }));
    }

    if (formErrors.id_request) {
      setFormErrors((prev) => ({ ...prev, id_request: "" }));
    }
  };

  useEffect(() => {
    if (requestId && requestsOptions.length > 0) {
      handleRequestSelect(requestId, requestsOptions);
    }
  }, [requestId, requestsOptions]);

  const handleValueChange = (field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formValues.id_request) {
      errors.id_request = "Selecciona una solicitud de gastos.";
    }
    if (!formValues.amount || parseFloat(formValues.amount) <= 0) {
      errors.amount = "Ingresa un monto válido mayor a 0.";
    }
    if (!formValues.delivery_date) {
      errors.delivery_date = "Ingresa la fecha de entrega.";
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const sessionUser = getCurrentSessionUser();
    const selectedReq = requestsOptions.find((r) => r.id_request === Number(formValues.id_request));
    const validStatusId = selectedReq?.status_data?.id || selectedReq?.status || 11;

    const payload = {
      id_request: Number(formValues.id_request),
      request_number: formValues.request_number || `SG-${formValues.id_request}`,
      anticipo_number: formValues.anticipo_number || generateAnticipoNumber(),
      requester_name: formValues.requester_name.trim() || "Conductor Beneficiario",
      requester_dni: formValues.requester_dni.trim() || "-",
      requester_email: formValues.requester_email.trim() || "-",
      cost_center: null,
      amount: String(formValues.amount).trim(),
      currency: formValues.currency,
      delivery_date: formValues.delivery_date,
      payment_method: formValues.payment_method ? Number(formValues.payment_method) : null,
      bank: formValues.bank ? Number(formValues.bank) : null,
      account_type: formValues.account_type ? Number(formValues.account_type) : null,
      account_number: formValues.account_number.trim() || "-",
      cci: formValues.cci.trim() || "-",
      operation_number: formValues.operation_number.trim() || "-",
      approved_by: formValues.approved_by.trim() || "Jefatura",
      notes: formValues.notes.trim() || "Sin observaciones",
      status: Number(validStatusId),
      created_by: sessionUser.id || 1,
    };

    setSubmitting(true);
    try {
      await createExpenseAdvance(payload);
      navigate("/travel-expenses/anticipos");
    } catch (err: any) {
      setSubmitError(err?.message || "Error al registrar el anticipo. Intente nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title={t("Nuevo Anticipo")} pageTitle={t("Anticipos")} />

        <Form onSubmit={handleSubmit}>
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
            <div>
              <h2 className="mb-1 fw-bold text-dark">Generar Anticipo</h2>
              <p className="text-muted mb-0">Completa la información para registrar el pago del viático</p>
            </div>
            <div className="d-flex gap-2">
              <Button color="light" outline className="px-4" type="button" onClick={() => navigate(-1)} disabled={submitting}>
                Cancelar
              </Button>
              <Button color="primary" type="submit" className="px-4 shadow-sm fw-medium d-flex align-items-center gap-1" disabled={submitting}>
                {submitting ? <Spinner size="sm" /> : <i className="ri-save-line fs-5"></i>}
                <span>Registrar Anticipo</span>
              </Button>
            </div>
          </div>

          {submitError ? (
            <Alert color="danger" className="mb-4">
              {submitError}
            </Alert>
          ) : null}

          <Row>
            {/* COLUMNA IZQUIERDA */}
            <Col lg={7}>
              {/* SOLICITUD Y BENEFICIARIO */}
              <Card className="border-0 shadow-sm mb-4">
                <CardHeader className="bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                  <h5 className="card-title mb-0 fw-bold">
                    <i className="ri-file-list-3-line me-2 text-primary"></i>Solicitud de Gastos y Beneficiario
                  </h5>
                </CardHeader>
                <CardBody className="p-4">
                  <Row className="g-3">
                    <Col md={12}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">
                          Solicitud de Gastos <span className="text-danger">*</span>
                        </Label>
                        {loadingRequests ? (
                          <div className="d-flex align-items-center gap-2 py-2">
                            <Spinner size="sm" color="primary" />
                            <span className="small text-muted">Cargando solicitudes...</span>
                          </div>
                        ) : (
                          <Select
                            value={requestSelectOptions.find((opt) => opt.value === formValues.id_request) || null}
                            options={requestSelectOptions}
                            onChange={(selected: SelectOption | null) => handleRequestSelect(selected?.value || "")}
                            placeholder="-- Seleccione una Solicitud de Gastos --"
                            isClearable
                            isSearchable
                            styles={selectStyles}
                            menuPortalTarget={document.body}
                          />
                        )}
                        {formErrors.id_request && (
                          <div className="text-danger small mt-1">{formErrors.id_request}</div>
                        )}
                      </FormGroup>
                    </Col>

                    <Col md={6}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">N° Anticipo Generado</Label>
                        <Input
                          type="text"
                          value={formValues.anticipo_number}
                          onChange={(e) => handleValueChange("anticipo_number", e.target.value)}
                          placeholder="ANT-2705-8477"
                        />
                      </FormGroup>
                    </Col>

                    <Col md={6}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">Nombre del Beneficiario</Label>
                        <Input
                          type="text"
                          value={formValues.requester_name}
                          onChange={(e) => handleValueChange("requester_name", e.target.value)}
                          placeholder="Nombre y Apellido del conductor"
                        />
                      </FormGroup>
                    </Col>

                    <Col md={6}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">DNI del Beneficiario</Label>
                        <Input
                          type="text"
                          value={formValues.requester_dni}
                          onChange={(e) => handleValueChange("requester_dni", e.target.value)}
                          placeholder="Ej: 65444569785"
                        />
                      </FormGroup>
                    </Col>

                    <Col md={6}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">Email del Beneficiario</Label>
                        <Input
                          type="email"
                          value={formValues.requester_email}
                          onChange={(e) => handleValueChange("requester_email", e.target.value)}
                          placeholder="conductor@ejemplo.com"
                        />
                      </FormGroup>
                    </Col>

                    <Col md={12}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">Centro de Costo</Label>
                        <Select
                          value={costCenterSelectOptions.find((opt) => opt.value === formValues.cost_center) || null}
                          options={costCenterSelectOptions}
                          onChange={(selected: SelectOption | null) => handleValueChange("cost_center", selected?.value || "")}
                          placeholder="-- Seleccionar Centro de Costo --"
                          isClearable
                          isSearchable
                          styles={selectStyles}
                          menuPortalTarget={document.body}
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {/* MONTO Y FECHA */}
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
                        <Select
                          value={currencySelectOptions.find((opt) => opt.value === formValues.currency) || null}
                          options={currencySelectOptions}
                          onChange={(selected: SelectOption | null) => handleValueChange("currency", selected?.value || "PEN")}
                          placeholder="Seleccionar Moneda"
                          isSearchable
                          styles={selectStyles}
                          menuPortalTarget={document.body}
                        />
                      </FormGroup>
                    </Col>
                    <Col md={4}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">
                          Monto <span className="text-danger">*</span>
                        </Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          className="form-control"
                          value={formValues.amount}
                          onChange={(e) => handleValueChange("amount", e.target.value)}
                          invalid={Boolean(formErrors.amount)}
                        />
                        <FormFeedback>{formErrors.amount}</FormFeedback>
                      </FormGroup>
                    </Col>
                    <Col md={4}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">
                          Fecha de Entrega <span className="text-danger">*</span>
                        </Label>
                        <Input
                          type="date"
                          className="form-control"
                          value={formValues.delivery_date}
                          onChange={(e) => handleValueChange("delivery_date", e.target.value)}
                          invalid={Boolean(formErrors.delivery_date)}
                        />
                        <FormFeedback>{formErrors.delivery_date}</FormFeedback>
                      </FormGroup>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {/* AUTORIZACIÓN Y OBSERVACIONES */}
              <Card className="border-0 shadow-sm mb-4">
                <CardHeader className="bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                  <h5 className="card-title mb-0 fw-bold">
                    <i className="ri-user-star-line me-2 text-primary"></i>Autorización y Observaciones
                  </h5>
                </CardHeader>
                <CardBody className="p-4">
                  <Row className="g-4">
                    <Col md={6}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">Aprobado por</Label>
                        <Input
                          type="text"
                          value={formValues.approved_by}
                          onChange={(e) => handleValueChange("approved_by", e.target.value)}
                          placeholder="Nombre del responsable que aprueba"
                        />
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">Estado del Anticipo</Label>
                        <Select
                          value={statusSelectOptions.find((opt) => opt.value === formValues.status) || null}
                          options={statusSelectOptions}
                          onChange={(selected: SelectOption | null) => handleValueChange("status", selected?.value || "11")}
                          placeholder="Seleccionar Estado"
                          isClearable
                          isSearchable
                          styles={selectStyles}
                          menuPortalTarget={document.body}
                        />
                      </FormGroup>
                    </Col>
                    <Col md={12}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">Observaciones</Label>
                        <Input
                          type="textarea"
                          rows="3"
                          value={formValues.notes}
                          onChange={(e) => handleValueChange("notes", e.target.value)}
                          placeholder="Agrega observaciones o notas adicionales..."
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>

            {/* COLUMNA DERECHA: Datos de Pago */}
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
                        <Label className="fw-medium text-muted small text-uppercase">
                          Forma de Pago <span className="text-danger">*</span>
                        </Label>
                        <Select
                          value={paymentMethodSelectOptions.find((opt) => opt.value === formValues.payment_method) || null}
                          options={paymentMethodSelectOptions}
                          onChange={(selected: SelectOption | null) => handleValueChange("payment_method", selected?.value || "")}
                          placeholder="Seleccionar Forma de Pago"
                          isClearable
                          isSearchable
                          styles={selectStyles}
                          menuPortalTarget={document.body}
                        />
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">Banco</Label>
                        <Select
                          value={bankSelectOptions.find((opt) => opt.value === formValues.bank) || null}
                          options={bankSelectOptions}
                          onChange={(selected: SelectOption | null) => handleValueChange("bank", selected?.value || "")}
                          placeholder="Seleccionar Banco"
                          isClearable
                          isSearchable
                          styles={selectStyles}
                          menuPortalTarget={document.body}
                        />
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">Tipo Cuenta</Label>
                        <Select
                          value={accountTypeSelectOptions.find((opt) => opt.value === formValues.account_type) || null}
                          options={accountTypeSelectOptions}
                          onChange={(selected: SelectOption | null) => handleValueChange("account_type", selected?.value || "")}
                          placeholder="Seleccionar Tipo de Cuenta"
                          isClearable
                          isSearchable
                          styles={selectStyles}
                          menuPortalTarget={document.body}
                        />
                      </FormGroup>
                    </Col>
                    <Col md={12}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">N° de Cuenta</Label>
                        <Input
                          type="text"
                          value={formValues.account_number}
                          onChange={(e) => handleValueChange("account_number", e.target.value)}
                          placeholder="987456321"
                        />
                      </FormGroup>
                    </Col>
                    <Col md={12}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">CCI (Interbancario)</Label>
                        <Input
                          type="text"
                          value={formValues.cci}
                          onChange={(e) => handleValueChange("cci", e.target.value)}
                          placeholder="1235879462"
                        />
                      </FormGroup>
                    </Col>
                    <Col md={12}>
                      <FormGroup className="mb-0">
                        <Label className="fw-medium text-muted small text-uppercase">N° de Operación / Voucher</Label>
                        <Input
                          type="text"
                          value={formValues.operation_number}
                          onChange={(e) => handleValueChange("operation_number", e.target.value)}
                          placeholder="8526"
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Form>
      </Container>
    </div>
  );
};

export default AddAnticipo;
