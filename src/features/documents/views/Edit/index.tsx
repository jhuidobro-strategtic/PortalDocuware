import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, Card, CardBody, Col, Container, Row, Spinner } from "reactstrap";
import { useTranslation } from "react-i18next";
import BreadCrumb from "../../../../components/common/BreadCrumb";
import Notifications from "../../components/ListNotifications";
import DocumentEditorForm from "../../components/DocumentEditorForm";
import { buildApiUrl } from "../../../../helpers/api-url";
import {
  buildFactilizaUrl,
  buildSunatUrl,
  getFactilizaToken,
  getSunatToken,
} from "../../../../helpers/external-api";
import {
  CentroCosto,
  Document,
  DocumentDetail,
  Notification,
  TipoDocumento,
} from "../../types/list.types";
import {
  DOCUMENTS_FLASH_NOTIFICATION_KEY,
  getDownloadUrl,
  getPreviewUrl,
} from "../../services/document.utils";
import DocumentEditPreviewPanel from "./DocumentEditPreviewPanel";
import DocumentInvoiceDetails from "./DocumentInvoiceDetails";
import "./DocumentsEdit.css";

interface LocationState {
  document?: Document;
}

const normalizeSunatDocumentNumber = (value: string | null | undefined) => {
  const trimmedValue = String(value ?? "").trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return trimmedValue;
  }

  return trimmedValue.replace(/^0+(?=\d)/, "");
};

const normalizeDocumentForForm = (document: Document): Document => ({
  ...document,
  documentserial: document.documentserial ?? "",
  documentnumber: normalizeSunatDocumentNumber(document.documentnumber),
  customer: document.customer ?? "",
  isDuplicated: document.isDuplicated ?? "",
  suppliernumber: document.suppliernumber ?? "",
  suppliername: document.suppliername ?? "",
  documentdate: document.documentdate ?? "",
  amount: document.amount ?? "",
  taxamount: document.taxamount ?? "",
  totalamount: document.totalamount ?? "",
  documenturl: document.documenturl ?? "",
  file_url: document.file_url ?? "",
  notes: document.notes ?? "",
  currency: document.currency ?? "",
  driver: document.driver ?? "",
});

interface SunatItem {
  unidad_medida_descripcion?: string;
  descripcion?: string;
  cantidad?: number | string;
  valor_unitario?: number | string;
  valor_venta?: number | string;
  impuesto_valor?: number | string;
}

interface SunatPayload {
  emisor?: {
    ruc?: string;
  };
  detalle?: {
    serie?: string;
    numero?: string;
    codigo_moneda?: string;
    fecha_emision?: string;
  };
  totales?: {
    total_grav_oner?: number | string;
    total_igv?: number | string;
    monto_total_general?: number | string;
  };
  items?: SunatItem[];
}

const parseAmount = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? 0).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toAmountString = (value: unknown) => parseAmount(value).toFixed(2);

const normalizeDocumentDetailsPayload = (payload: unknown): DocumentDetail[] => {
  if (Array.isArray(payload)) {
    return payload as DocumentDetail[];
  }

  if (payload && typeof payload === "object") {
    const typedPayload = payload as { data?: unknown; detailid?: number };

    if (Array.isArray(typedPayload.data)) {
      return typedPayload.data as DocumentDetail[];
    }

    if (
      typedPayload.data &&
      typeof typedPayload.data === "object" &&
      "detailid" in typedPayload.data
    ) {
      return [typedPayload.data as DocumentDetail];
    }

    if ("detailid" in typedPayload) {
      return [typedPayload as DocumentDetail];
    }
  }

  return [];
};

const extractVehiclePlate = (text: string) => {
  const cleanText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const directMatch = cleanText.match(/PLACA[:\s-]*([A-Z0-9-]{5,8})\b/i);
  let candidateSource = directMatch ? directMatch[1] : null;

  if (!candidateSource) {
    const possibleMatches = cleanText.match(/\b[A-Z0-9-]{5,8}\b/g);
    if (possibleMatches) {
      candidateSource =
        possibleMatches.find(
          (candidate: string) => /[A-Z]/i.test(candidate) && /\d/.test(candidate)
        ) || null;
    }
  }

  if (!candidateSource) {
    return null;
  }

  const candidate = candidateSource.toUpperCase().replace(/-/g, "");

  if (
    candidate.length >= 5 &&
    candidate.length <= 7 &&
    /[A-Z]/.test(candidate) &&
    /\d/.test(candidate)
  ) {
    return candidate;
  }

  return null;
};

const buildDetailSignature = (
  detail: Pick<
    DocumentDetail,
    | "documentserial"
    | "documentnumber"
    | "suppliernumber"
    | "unit_measure_description"
    | "description"
    | "vehicle_no"
    | "quantity"
    | "unit_value"
  >
) =>
  [
    detail.documentserial,
    detail.documentnumber,
    detail.suppliernumber,
    detail.unit_measure_description,
    detail.description,
    detail.vehicle_no || "",
    parseAmount(detail.quantity).toFixed(2),
    parseAmount(detail.unit_value).toFixed(2),
  ].join("|");

const mapSunatItemsToDocumentDetails = (sunatPayload: SunatPayload): DocumentDetail[] =>
  (sunatPayload.items || []).map((item, index) => ({
    detailid: -(index + 1),
    documentserial: sunatPayload.detalle?.serie || "",
    documentnumber: sunatPayload.detalle?.numero || "",
    suppliernumber: sunatPayload.emisor?.ruc || "",
    unit_measure_description: item.unidad_medida_descripcion || "",
    description: item.descripcion || "",
    vehicle_no: extractVehiclePlate(item.descripcion || "") || "",
    quantity: parseAmount(item.cantidad),
    unit_value: toAmountString(item.valor_unitario),
    tax_value: toAmountString(item.impuesto_valor),
    total_value: toAmountString(item.valor_venta),
    status: false,
    created_by: 1,
    created_at: new Date().toISOString(),
    updated_by: null,
    updated_at: null,
  }));

const DocumentEditPage: React.FC = () => {
  const { documentId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  const [editDoc, setEditDoc] = useState<Document | null>(
    locationState?.document ? normalizeDocumentForForm(locationState.document) : null
  );
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [centrosCostos, setCentrosCostos] = useState<CentroCosto[]>([]);
  const [docDetails, setDocDetails] = useState<DocumentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingRuc, setLoadingRuc] = useState(false);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [editIgvPercent, setEditIgvPercent] = useState<number>(18);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((type: Notification["type"], message: string) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);
  }, []);

  const syncIgvPercent = useCallback((documentData: Document) => {
    const amount = parseFloat(documentData.amount || "0");
    const tax = parseFloat(documentData.taxamount || "0");
    setEditIgvPercent(
      amount > 0 && tax > 0 ? Math.round((tax / amount) * 100) : 0
    );
  }, []);

  const fetchDetailsByValues = useCallback(async (
    suppliernumber: string,
    documentserial: string,
    documentnumber: string
  ) => {
    const query = new URLSearchParams({
      suppliernumber,
      documentserial,
      documentnumber,
    });

    const response = await fetch(
      buildApiUrl(`documents-detail/?${query.toString()}`),
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const payload = await response.json();
    return normalizeDocumentDetailsPayload(payload);
  }, []);

  const syncDocumentDetailsFromSunat = useCallback(
    async (
      documentData: Document,
      options: {
        existingDetails?: DocumentDetail[];
        notifySuccess?: boolean;
        notifyErrors?: boolean;
      } = {}
    ) => {
      const {
        existingDetails = [],
        notifySuccess = true,
        notifyErrors = true,
      } = options;
      const sunatToken = getSunatToken();

      if (!sunatToken) {
        if (notifyErrors) {
          addNotification(
            "danger",
            t("SUNAT token is not configured in the environment")
          );
        }
        return existingDetails;
      }

      const tipoComprobante =
        typeof documentData.documenttype === "object" &&
        documentData.documenttype !== null
          ? String(documentData.documenttype.tipoid).padStart(2, "0")
          : String(documentData.documenttype || "").padStart(2, "0");
      const normalizedDocumentNumber = normalizeSunatDocumentNumber(
        documentData.documentnumber
      );

      if (
        !tipoComprobante ||
        !documentData.documentserial?.trim() ||
        !normalizedDocumentNumber
      ) {
        if (notifyErrors) {
          addNotification(
            "warning",
            t("Complete Type, Series and Number before querying SUNAT")
          );
        }
        return existingDetails;
      }

      const response = await fetch(buildSunatUrl("sunat/comprobante"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sunatToken}`,
        },
        body: JSON.stringify({
          tipo_comprobante: tipoComprobante,
          ruc_emisor: documentData.suppliernumber,
          serie: documentData.documentserial,
          numero: normalizedDocumentNumber,
        }),
      });

      const payload = await response.json();

      if (!payload.success || !payload.payload) {
        if (notifyErrors) {
          addNotification("danger", t("Error fetching invoice data from SUNAT"));
        }
        return existingDetails;
      }

      const sunatSuccessMessage =
        typeof payload.message === "string" && payload.message.trim()
          ? payload.message.trim()
          : t("Details loaded successfully from SUNAT");
      const sunatPayload = payload.payload as SunatPayload;
      const nextDocument = {
        ...documentData,
        currency: sunatPayload.detalle?.codigo_moneda || "PEN",
        amount: toAmountString(sunatPayload.totales?.total_grav_oner),
        taxamount: toAmountString(sunatPayload.totales?.total_igv),
        totalamount: toAmountString(sunatPayload.totales?.monto_total_general),
        documentdate: sunatPayload.detalle?.fecha_emision || documentData.documentdate,
      };

      setEditDoc((prev) =>
        prev && prev.documentid === documentData.documentid ? nextDocument : prev
      );
      syncIgvPercent(nextDocument);

      const sunatDetails = mapSunatItemsToDocumentDetails(sunatPayload);
      if (sunatDetails.length === 0) {
        setDocDetails(existingDetails);
        if (notifyErrors) {
          addNotification("warning", t("No details found in SUNAT"));
        }
        return existingDetails;
      }

      setDocDetails(sunatDetails);

      const existingSignatures = new Set(
        existingDetails.map((detail) => buildDetailSignature(detail))
      );
      const missingDetails = sunatDetails.filter(
        (detail) => !existingSignatures.has(buildDetailSignature(detail))
      );
      const persistableDetails = missingDetails.filter((detail) =>
        Number.isInteger(parseAmount(detail.quantity))
      );
      const skippedDetails = missingDetails.length - persistableDetails.length;

      let failedSyncs = 0;
      for (const detail of persistableDetails) {
        const createResponse = await fetch(buildApiUrl("documents-detail/"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentserial: detail.documentserial,
            documentnumber: detail.documentnumber,
            suppliernumber: detail.suppliernumber,
            unit_measure_description: detail.unit_measure_description,
            description: detail.description,
            vehicle_no: detail.vehicle_no,
            quantity: detail.quantity,
            unit_value: detail.unit_value,
            tax_value: detail.tax_value,
            total_value: detail.total_value,
            status: detail.status,
            created_by: detail.created_by,
            created_at: detail.created_at,
          }),
        });

        if (!createResponse.ok) {
          failedSyncs += 1;
          console.error(
            "No se pudo registrar un detalle de SUNAT",
            await createResponse.text()
          );
        }
      }

      if (notifySuccess) {
        if (failedSyncs > 0 || skippedDetails > 0) {
          addNotification(
            "warning",
            `${sunatSuccessMessage}. ${t(
              "Some invoice details could not be saved because the backend only accepts whole-number quantities, but the full detail from SUNAT is shown."
            )}`
          );
        } else {
          addNotification("success", sunatSuccessMessage);
        }
      }

      return sunatDetails;
    },
    [addNotification, syncIgvPercent, t]
  );

  useEffect(() => {
    document.title = `${t("Edit Document")} | Docuware`;
  }, [t]);

  useEffect(() => {
    const loadData = async () => {
      if (!documentId) {
        setError(t("The requested record was not found."));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [documentResponse, tiposResponse, centrosResponse] = await Promise.all([
          fetch(buildApiUrl(`documents/${documentId}/`)),
          fetch(buildApiUrl("tipo-documento")),
          fetch(buildApiUrl("centro-costo")),
        ]);

        const documentPayload = await documentResponse.json();
        const tiposPayload = await tiposResponse.json();
        const centrosPayload = await centrosResponse.json();

        const resolvedDocument =
          documentPayload?.data && !Array.isArray(documentPayload.data)
            ? documentPayload.data
            : Array.isArray(documentPayload?.data)
              ? documentPayload.data[0]
              : documentPayload;

        if (!documentResponse.ok || !resolvedDocument?.documentid) {
          throw new Error(
            documentPayload?.message || t("Unable to get the selected document.")
          );
        }

        const normalizedDocument = normalizeDocumentForForm(resolvedDocument);
        setEditDoc(normalizedDocument);
        syncIgvPercent(normalizedDocument);

        if (tiposPayload?.success && Array.isArray(tiposPayload.data)) {
          setTiposDocumento(tiposPayload.data);
        } else {
          setTiposDocumento([]);
        }

        if (Array.isArray(centrosPayload)) {
          setCentrosCostos(centrosPayload);
        } else {
          setCentrosCostos([]);
        }

        setLoadingDetails(true);
        try {
          const details = await fetchDetailsByValues(
            normalizedDocument.suppliernumber,
            normalizedDocument.documentserial,
            normalizedDocument.documentnumber
          );
          setDocDetails(details);

          if (getSunatToken()) {
            try {
              await syncDocumentDetailsFromSunat(normalizedDocument, {
                existingDetails: details,
                notifySuccess: false,
                notifyErrors: false,
              });
            } catch (sunatSyncError) {
              console.error("Error sincronizando detalles desde SUNAT:", sunatSyncError);
            }
          }
        } catch (detailsError) {
          console.error("Error cargando detalles:", detailsError);
          setDocDetails([]);
        } finally {
          setLoadingDetails(false);
        }
      } catch (loadError: unknown) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : t("An error occurred while loading the Order C. view.");
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [documentId, fetchDetailsByValues, syncDocumentDetailsFromSunat, syncIgvPercent, t]);

  const handleSearchRuc = async () => {
    if (!editDoc?.suppliernumber) {
      addNotification("danger", t("Enter a valid RUC"));
      return;
    }

    const factilizaToken = getFactilizaToken();
    if (!factilizaToken) {
      addNotification(
        "danger",
        t("Factiliza token is not configured in the environment")
      );
      return;
    }

    setLoadingRuc(true);
    try {
      const response = await fetch(
        buildFactilizaUrl(`ruc/info/${editDoc.suppliernumber}`),
        {
          headers: {
            Authorization: `Bearer ${factilizaToken}`,
          },
        }
      );
      const payload = await response.json();

      if (payload.success && payload.data?.nombre_o_razon_social) {
        setEditDoc((prev) =>
          prev
            ? {
                ...prev,
                suppliername: payload.data.nombre_o_razon_social,
              }
            : prev
        );
        addNotification("success", t("RUC found successfully"));
      } else {
        addNotification("warning", t("RUC not found"));
      }
    } catch (lookupError) {
      console.error(lookupError);
      addNotification("danger", t("Error consulting RUC or SUNAT"));
    } finally {
      setLoadingRuc(false);
    }
  };

  const handleSearchDocument = async () => {
    if (!editDoc?.suppliernumber) {
      addNotification("danger", t("Enter a valid RUC"));
      return;
    }

    setLoadingDocument(true);
    try {
      const existingDetails = await fetchDetailsByValues(
        editDoc.suppliernumber,
        editDoc.documentserial,
        editDoc.documentnumber
      );
      await syncDocumentDetailsFromSunat(editDoc, { existingDetails });
    } catch (documentError) {
      console.error(documentError);
      addNotification("danger", t("Error querying SUNAT data"));
    } finally {
      setLoadingDocument(false);
    }
  };

  const handleSave = async () => {
    if (!editDoc) {
      return;
    }

    const isValid =
      editDoc.documentserial.trim() !== "" &&
      editDoc.documentnumber.trim() !== "" &&
      editDoc.suppliernumber.trim() !== "" &&
      editDoc.suppliername.trim() !== "" &&
      editDoc.documenttype !== null &&
      editDoc.centercost !== null &&
      editDoc.documentdate.trim() !== "" &&
      editDoc.driver.trim() !== "" &&
      parseFloat(editDoc.amount) > 0 &&
      parseFloat(editDoc.taxamount) >= 0 &&
      parseFloat(editDoc.totalamount) > 0;

    if (!isValid) {
      addNotification("danger", t("Complete all fields correctly"));
      return;
    }

    setLoadingSave(true);
    try {
      const documentTypeValue =
        typeof editDoc.documenttype === "object" && editDoc.documenttype !== null
          ? editDoc.documenttype.tipoid
          : editDoc.documenttype;

      const centerCostValue =
        typeof editDoc.centercost === "object" && editDoc.centercost !== null
          ? editDoc.centercost.centroid
          : editDoc.centercost;

      const updatedDocument = {
        ...editDoc,
        status: isValid,
        documenttype_id: documentTypeValue,
        centercost_id: centerCostValue,
      };

      const response = await fetch(buildApiUrl(`documents/${editDoc.documentid}/`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedDocument),
      });

      const payload = await response.json();

      if (payload.success) {
        sessionStorage.setItem(
          DOCUMENTS_FLASH_NOTIFICATION_KEY,
          JSON.stringify({
            type: "success",
            message: t("Document updated successfully"),
          })
        );
        navigate("/documents");
      } else {
        addNotification("danger", payload.message || t("Error updating"));
      }
    } catch (saveError) {
      console.error(saveError);
      addNotification("danger", t("Error during the update process"));
    } finally {
      setLoadingSave(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner color="primary" />
      </div>
    );
  }

  if (error || !editDoc) {
    return (
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Edit Document" pageTitle="Documents" />
          <Card className="border-0 shadow-sm">
            <CardBody className="p-4">
              <h5 className="mb-2">{t("Edit Document")}</h5>
              <p className="text-muted mb-4">
                {error || t("The requested record was not found.")}
              </p>
              <Button color="primary" onClick={() => navigate("/documents")}>
                <i className="ri-arrow-left-line align-bottom me-1" />
                {t("Back to Documents")}
              </Button>
            </CardBody>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="page-content">
      <Container fluid className="document-edit-page">
        <Notifications
          notifications={notifications}
          onRemove={(id: number | string) =>
            setNotifications((prev) => prev.filter((notification) => notification.id !== id))
          }
        />

        <BreadCrumb title="Edit Document" pageTitle="Documents" />

        <div className="document-edit-toolbar mb-4">
          <div>
            <h4 className="mb-1">{t("Edit Document")}</h4>
            <p className="text-muted mb-0">
              {t(
                "Update the document information while validating the PDF in parallel."
              )}
            </p>
          </div>
          <Button color="light" onClick={() => navigate("/documents")}>
            <i className="ri-arrow-left-line align-bottom me-1" />
            {t("Back to Documents")}
          </Button>
        </div>

        <Row className="g-4 document-edit-panels-row">
          <Col lg={6} className="d-flex">
            <Card className="border-0 shadow-sm document-edit-form-card">
              <CardBody className="p-4">
                <DocumentEditorForm
                  editDoc={editDoc}
                  setEditDoc={setEditDoc}
                  editIgvPercent={editIgvPercent}
                  setEditIgvPercent={setEditIgvPercent}
                  tiposDocumento={tiposDocumento}
                  centrosCostos={centrosCostos}
                  loadingRuc={loadingRuc}
                  loadingDocument={loadingDocument}
                  loadingSave={loadingSave}
                  onSearchRuc={handleSearchRuc}
                  onSearchDocument={handleSearchDocument}
                  onSave={handleSave}
                  onCancel={() => navigate("/documents")}
                />
              </CardBody>
            </Card>
          </Col>

          <Col lg={6} className="d-flex">
            <DocumentEditPreviewPanel
              document={editDoc}
              previewUrl={getPreviewUrl(editDoc.documenturl)}
              downloadUrl={getDownloadUrl(editDoc.documenturl)}
              rotation={rotation}
              onRotateLeft={() => setRotation((prev) => prev - 90)}
              onRotateRight={() => setRotation((prev) => prev + 90)}
            />
          </Col>
        </Row>

        <Row className="g-4 mt-1">
          <Col xs={12}>
            <DocumentInvoiceDetails
              loading={loadingDetails}
              details={docDetails}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default DocumentEditPage;
