import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";

import BreadCrumb from "../../Components/Common/BreadCrumb";
import { buildApiUrl } from "../../helpers/api-url";
import { Document } from "../Documents/types";

interface OrderCFormValues {
  suppliernumber: string;
  suppliername: string;
  orderNo: string;
  supplierID: string;
  documentAssociatedType: string;
  documentAssociatedNo: string;
  paymentCondition: string;
  currency: string;
  guideNo: string;
  store: string;
  purchaseState: string;
  createdBy: string;
  createdByName: string;
}

interface OrderCDetailFormValues {
  id: string;
  descriptionItem: string;
  quantity: string;
  unitPrice: string;
}

type OrderCFieldName = keyof OrderCFormValues;
type OrderCDetailFieldName = keyof Omit<OrderCDetailFormValues, "id">;

interface OrderCFieldConfig {
  name: OrderCFieldName;
  label: string;
  placeholder: string;
  type?: "text" | "number";
  readOnly?: boolean;
  helperText?: string;
}

interface FeedbackState {
  type: "success" | "danger" | "info";
  message: string;
}

const ORDER_C_FIELDS: OrderCFieldConfig[] = [
  {
    name: "suppliernumber",
    label: "RUC",
    placeholder: "Autocompletado desde el documento",
    readOnly: true,
    helperText: "Se completa automaticamente con el RUC del registro.",
  },
  {
    name: "suppliername",
    label: "Razon Social",
    placeholder: "Autocompletado desde el documento",
    readOnly: true,
    helperText: "Se completa automaticamente con la razon social del registro.",
  },
  {
    name: "orderNo",
    label: "Numero de Orden",
    placeholder: "Ej. OC-0002",
  },
  {
    name: "supplierID",
    label: "Supplier ID",
    placeholder: "Ingrese el identificador del proveedor",
    type: "number",
  },
  {
    name: "documentAssociatedType",
    label: "Tipo Documento Asociado",
    placeholder: "Ej. 2",
    type: "number",
  },
  {
    name: "documentAssociatedNo",
    label: "Numero Documento Asociado",
    placeholder: "Ej. FAC-1001",
  },
  {
    name: "paymentCondition",
    label: "Condicion de Pago",
    placeholder: "Ej. 1",
    type: "number",
  },
  {
    name: "currency",
    label: "Moneda",
    placeholder: "Ej. 1",
    type: "number",
  },
  {
    name: "guideNo",
    label: "Numero de Guia",
    placeholder: "Ej. GUIA-01",
  },
  {
    name: "store",
    label: "Almacen",
    placeholder: "Ej. 3",
    type: "number",
  },
  {
    name: "purchaseState",
    label: "Estado de Compra",
    placeholder: "Ej. 1",
    type: "number",
  },
  {
    name: "createdByName",
    label: "Creado por",
    placeholder: "Autocompletado desde la sesion",
    readOnly: true,
  },
];

const createDetailRow = (): OrderCDetailFormValues => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  descriptionItem: "",
  quantity: "1",
  unitPrice: "",
});

const getCurrentSessionUser = () => {
  try {
    const authUser = sessionStorage.getItem("authUser");
    if (!authUser) {
      return { id: "", name: "" };
    }

    const parsedUser = JSON.parse(authUser);
    const sessionData = parsedUser?.data || {};

    return {
      id: String(
        sessionData?.userID ?? sessionData?.id ?? sessionData?.profileID ?? ""
      ),
      name:
        sessionData?.fullname ||
        sessionData?.first_name ||
        sessionData?.username ||
        sessionData?.email ||
        "",
    };
  } catch {
    return { id: "", name: "" };
  }
};

const getDocumentTypeId = (document: Document | null) => {
  if (!document?.documenttype) {
    return "";
  }

  if (typeof document.documenttype === "number") {
    return String(document.documenttype);
  }

  return String(document.documenttype.tipoid ?? "");
};

const getDocumentAssociatedNo = (document: Document | null) => {
  if (!document) {
    return "";
  }

  const parts = [document.documentserial, document.documentnumber].filter(Boolean);
  return parts.join("-");
};

const createInitialValues = (document: Document | null): OrderCFormValues => {
  const sessionUser = getCurrentSessionUser();

  return {
  suppliernumber: document?.suppliernumber ?? "",
  suppliername: document?.suppliername ?? "",
  orderNo: "",
  supplierID: "",
  documentAssociatedType: getDocumentTypeId(document),
  documentAssociatedNo: getDocumentAssociatedNo(document),
  paymentCondition: "",
  currency: "",
  guideNo: "",
  store: "",
  purchaseState: "1",
  createdBy: sessionUser.id,
  createdByName: sessionUser.name,
  };
};

const getFieldLabel = (fieldName: OrderCFieldName) =>
  ORDER_C_FIELDS.find((field) => field.name === fieldName)?.label || fieldName;

const getDetailTotal = (detail: OrderCDetailFormValues) => {
  const quantity = Number(detail.quantity || 0);
  const unitPrice = Number(detail.unitPrice || 0);

  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    return "0.00";
  }

  return (quantity * unitPrice).toFixed(2);
};

const buildPurchaseOrderPayload = (
  values: OrderCFormValues,
  details: OrderCDetailFormValues[]
) => ({
  orderNo: values.orderNo.trim(),
  supplierID: Number(values.supplierID),
  documentAssociatedType: Number(values.documentAssociatedType),
  documentAssociatedNo: values.documentAssociatedNo.trim(),
  paymentCondition: Number(values.paymentCondition),
  currency: Number(values.currency),
  guideNo: values.guideNo.trim(),
  store: Number(values.store),
  purchaseState: Number(values.purchaseState),
  createdBy: Number(values.createdBy),
  details: details.map((detail) => ({
    descriptionItem: detail.descriptionItem.trim(),
    quantity: Number(detail.quantity),
    unitPrice: Number(detail.unitPrice).toFixed(2),
    total: getDetailTotal(detail),
  })),
});

const requiredFields: OrderCFieldName[] = [
  "orderNo",
  "supplierID",
  "documentAssociatedType",
  "documentAssociatedNo",
  "paymentCondition",
  "currency",
  "guideNo",
  "store",
  "purchaseState",
  "createdBy",
];

const DocumentOrderC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { documentId } = useParams();
  const locationState = location.state as { document?: Document } | null;

  const [document, setDocument] = useState<Document | null>(
    locationState?.document ?? null
  );
  const [values, setValues] = useState<OrderCFormValues>(
    createInitialValues(locationState?.document ?? null)
  );
  const [details, setDetails] = useState<OrderCDetailFormValues[]>([
    createDetailRow(),
  ]);
  const [loading, setLoading] = useState(!locationState?.document);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    window.document.title = "Orden C. | Docuware";
  }, []);

  useEffect(() => {
    setValues(createInitialValues(document));
    setDetails([createDetailRow()]);
  }, [document]);

  useEffect(() => {
    if (locationState?.document || !documentId) {
      setLoading(false);
      return;
    }

    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await fetch(buildApiUrl("documents"));
        const data = await response.json();

        if (!data.success || !Array.isArray(data.data)) {
          throw new Error("No fue posible obtener el documento seleccionado.");
        }

        const selectedDocument =
          data.data.find(
            (item: Document) => String(item.documentid) === String(documentId)
          ) ?? null;

        if (!selectedDocument) {
          throw new Error("No se encontro el registro solicitado.");
        }

        setDocument(selectedDocument);
      } catch (fetchError: any) {
        setError(
          fetchError.message || "Ocurrio un error al cargar la vista Orden C."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId, locationState?.document]);

  const handleChange = (field: OrderCFieldName, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleDetailChange = (
    detailId: string,
    field: OrderCDetailFieldName,
    value: string
  ) => {
    setDetails((prev) =>
      prev.map((detail) =>
        detail.id === detailId ? { ...detail, [field]: value } : detail
      )
    );
  };

  const handleAddDetail = () => {
    setDetails((prev) => [...prev, createDetailRow()]);
  };

  const handleRemoveDetail = (detailId: string) => {
    setDetails((prev) =>
      prev.length === 1 ? prev : prev.filter((detail) => detail.id !== detailId)
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const sessionUser = getCurrentSessionUser();
    if (!sessionUser.id) {
      setFeedback({
        type: "danger",
        message:
          "No fue posible identificar al usuario con sesion iniciada para completar Creado por.",
      });
      return;
    }

    const normalizedValues = {
      ...values,
      createdBy: sessionUser.id,
      createdByName: sessionUser.name,
    };

    const missingField = requiredFields.find(
      (field) => !String(normalizedValues[field] || "").trim()
    );

    if (missingField) {
      setFeedback({
        type: "danger",
        message: `Complete el campo ${getFieldLabel(missingField)}.`,
      });
      return;
    }

    const invalidDetail = details.find(
      (detail) =>
        !detail.descriptionItem.trim() ||
        Number(detail.quantity) <= 0 ||
        Number(detail.unitPrice) <= 0
    );

    if (invalidDetail) {
      setFeedback({
        type: "danger",
        message:
          "Complete la seccion Detalles con descripcion, cantidad y precio unitario validos.",
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = buildPurchaseOrderPayload(normalizedValues, details);
      const response = await fetch(buildApiUrl("purchase-orders"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "No fue posible registrar la Orden C."
        );
      }

      setFeedback({
        type: "success",
        message: data?.message || "Orden C. registrada correctamente.",
      });
    } catch (submitError: any) {
      setFeedback({
        type: "danger",
        message:
          submitError.message || "Ocurrio un error al registrar la Orden C.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="text-center my-5">
            <Spinner color="primary" />
          </div>
        </Container>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Orden C." pageTitle="Documentos" />
          <Alert color="danger" className="mb-3">
            {error || "No se encontro informacion para esta vista."}
          </Alert>
          <Button color="light" onClick={() => navigate("/documents")}>
            Volver a Documentos
          </Button>
        </Container>
      </div>
    );
  }

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Orden C." pageTitle="Documentos" />

        <Card className="border-0 shadow-sm mb-4">
          <CardBody>
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
              <div>
                <h4 className="mb-1">Documento #{document.documentid}</h4>
                <p className="text-muted mb-2">
                  Serie {document.documentserial} - Numero {document.documentnumber}
                </p>
                <div className="d-flex flex-wrap gap-2 text-muted small">
                  <span className="badge bg-light text-secondary border">
                    Estado: {document.status ? "Activo" : "Pendiente"}
                  </span>
                  <span className="badge bg-light text-secondary border">
                    Moneda: {document.currency}
                  </span>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2">
                <Button tag={Link} to="/documents" color="light">
                  Volver
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardBody className="p-4">
            <div className="mb-4">
              <h5 className="mb-1">Formulario Orden C.</h5>
              <p className="text-muted mb-0">
                El formulario quedo alineado al payload de compra y mantiene
                RUC y Razon Social autocompletados desde el documento.
              </p>
            </div>

            {feedback && (
              <Alert color={feedback.type} className="mb-4">
                {feedback.message}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <div className="mb-4">
                <h6 className="text-uppercase text-muted mb-3">Datos Generales</h6>
                <Row className="g-4">
                  {ORDER_C_FIELDS.map((field) => (
                    <Col md={6} key={field.name}>
                      <div>
                        <Label className="form-label">{field.label}</Label>
                        <Input
                          type={field.type || "text"}
                          value={values[field.name]}
                          onChange={(event) =>
                            handleChange(field.name, event.target.value)
                          }
                          placeholder={field.placeholder}
                          readOnly={field.readOnly}
                          className={field.readOnly ? "bg-light" : ""}
                        />
                        {field.helperText && (
                          <small className="text-muted d-block mt-1">
                            {field.helperText}
                          </small>
                        )}
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>

              <div className="border-top pt-4">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                  <div>
                    <h6 className="text-uppercase text-muted">Detalles</h6>
                  </div>
                  <Button
                    type="button"
                    color="primary"
                    outline
                    onClick={handleAddDetail}
                  >
                    Agregar Detalle
                  </Button>
                </div>

                <Row className="g-3">
                  {details.map((detail, index) => (
                    <Col xs={12} key={detail.id}>
                      <Card className="border shadow-none mb-0">
                        <CardBody className="p-3">
                          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                            <h6 className="mb-0">Detalle {index + 1}</h6>
                            <Button
                              type="button"
                              color="danger"
                              outline
                              size="sm"
                              disabled={details.length === 1}
                              onClick={() => handleRemoveDetail(detail.id)}
                            >
                              Quitar
                            </Button>
                          </div>

                          <Row className="g-3">
                            <Col md={6}>
                              <Label className="form-label">
                                Descripcion del Item
                              </Label>
                              <Input
                                value={detail.descriptionItem}
                                onChange={(event) =>
                                  handleDetailChange(
                                    detail.id,
                                    "descriptionItem",
                                    event.target.value
                                  )
                                }
                                placeholder="Ingrese la descripcion del item"
                              />
                            </Col>
                            <Col md={2}>
                              <Label className="form-label">Cantidad</Label>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={detail.quantity}
                                onChange={(event) =>
                                  handleDetailChange(
                                    detail.id,
                                    "quantity",
                                    event.target.value
                                  )
                                }
                                placeholder="0"
                              />
                            </Col>
                            <Col md={2}>
                              <Label className="form-label">Precio Unitario</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={detail.unitPrice}
                                onChange={(event) =>
                                  handleDetailChange(
                                    detail.id,
                                    "unitPrice",
                                    event.target.value
                                  )
                                }
                                placeholder="0.00"
                              />
                            </Col>
                            <Col md={2}>
                              <Label className="form-label">Total</Label>
                              <Input
                                value={getDetailTotal(detail)}
                                readOnly
                                className="bg-light"
                              />
                            </Col>
                          </Row>
                        </CardBody>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>

              <div className="d-flex flex-wrap justify-content-end gap-2 mt-4">
                <Button type="button" color="light" onClick={() => navigate(-1)}>
                  Cancelar
                </Button>
                <Button type="submit" color="primary" disabled={submitting}>
                  {submitting ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      </Container>
    </div>
  );
};

export default DocumentOrderC;
