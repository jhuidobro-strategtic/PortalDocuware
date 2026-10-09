import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Modal,
  ModalBody,
  ModalFooter,
  Row,
  Spinner,
} from "reactstrap";
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
  const normalizeDetail = (detail: DocumentDetail): DocumentDetail => ({
    ...detail,
    vehicle_no: detail.vehicle_no || detail.extracted_plate || "",
    originalExtractedPlate: detail.extracted_plate ?? "",
    costCenter1: detail.centro_costo_1 !== undefined ? detail.centro_costo_1?.centroid ?? null : detail.costCenter1,
    costCenter2: detail.centro_costo_2 !== undefined ? detail.centro_costo_2?.centroid ?? null : detail.costCenter2,
    originalCostCenter1: detail.centro_costo_1 !== undefined ? detail.centro_costo_1?.centroid ?? null : detail.costCenter1,
    originalCostCenter2: detail.centro_costo_2 !== undefined ? detail.centro_costo_2?.centroid ?? null : detail.costCenter2,
  });
  if (Array.isArray(payload)) {
    return (payload as DocumentDetail[]).map(normalizeDetail);
  }

  if (payload && typeof payload === "object") {
    const typedPayload = payload as { data?: unknown; detailid?: number };

    if (Array.isArray(typedPayload.data)) {
      return (typedPayload.data as DocumentDetail[]).map(normalizeDetail);
    }

    if (
      typedPayload.data &&
      typeof typedPayload.data === "object" &&
      "detailid" in typedPayload.data
    ) {
      return [normalizeDetail(typedPayload.data as DocumentDetail)];
    }

    if ("detailid" in typedPayload) {
      return [normalizeDetail(typedPayload as DocumentDetail)];
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
  const [centrosCostos2, setCentrosCostos2] = useState<CentroCosto[]>([]);
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
  const [showGenerateOrderModal, setShowGenerateOrderModal] = useState(false);
  const [savedDocumentForOrder, setSavedDocumentForOrder] = useState<Document | null>(null);

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

      const existingBySignature = new Map(existingDetails.map((detail) => [buildDetailSignature(detail), detail]));
      const sunatDetails = mapSunatItemsToDocumentDetails(sunatPayload).map((detail) => {
        const existing = existingBySignature.get(buildDetailSignature(detail));
        return existing ? { ...existing, ...detail, detailid: existing.detailid,
          costCenter1: existing.costCenter1, costCenter2: existing.costCenter2 } : detail;
      });
      if (sunatDetails.length === 0) {
        setDocDetails(existingDetails);
        if (notifyErrors) {
          addNotification("warning", t("No details found in SUNAT"));
        }
        return existingDetails;
      }

      setDocDetails([...sunatDetails]);

      if (notifySuccess) {
        addNotification("success", sunatSuccessMessage);
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
        const [documentResponse, tiposResponse, centrosResponse, centros2Response] = await Promise.all([
          fetch(buildApiUrl(`documents/${documentId}/`)),
          fetch(buildApiUrl("tipo-documento")),
          fetch(buildApiUrl("centro-costo")),
          fetch(buildApiUrl("centro-costo-2/")),
        ]);

        const documentPayload = await documentResponse.json();
        const tiposPayload = await tiposResponse.json();
        const centrosPayload = await centrosResponse.json();
        const centros2Payload = await centros2Response.json();
        setCentrosCostos2(Array.isArray(centros2Payload) ? centros2Payload : []);

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

          if (details.length === 0 && getSunatToken()) {
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

  const persistDocumentDetails = async (documentData: Document) => {
    const sunatDetails = [...docDetails];
    const normalizeCenterId = (value: number | null | undefined) => value == null ? null : Number(value);
    const changedDetails = sunatDetails.filter((detail) => {
      if (detail.detailid <= 0) return true;
      const current1 = detail.costCenter1 !== undefined ? detail.costCenter1 : documentData.centro_costo_1_id ?? null;
      const current2 = detail.costCenter2 !== undefined ? detail.costCenter2 : documentData.centro_costo_2_id ?? null;
      const original1 = detail.originalCostCenter1 !== undefined ? detail.originalCostCenter1 : documentData.centro_costo_1_id ?? null;
      const original2 = detail.originalCostCenter2 !== undefined ? detail.originalCostCenter2 : documentData.centro_costo_2_id ?? null;
      return normalizeCenterId(current1) !== normalizeCenterId(original1) ||
        normalizeCenterId(current2) !== normalizeCenterId(original2) ||
        (detail.extracted_plate ?? "") !== (detail.originalExtractedPlate ?? "");
    });
      const persistableDetails = changedDetails.filter((detail) =>
        detail.detailid > 0 || Number.isInteger(parseAmount(detail.quantity))
      );
      const skippedDetails = changedDetails.length - persistableDetails.length;

      let failedSyncs = 0;
      for (const detail of persistableDetails) {
        const costCenterPayload = {
          centro_costo_1_id: detail.costCenter1 !== undefined ? detail.costCenter1 : documentData.centro_costo_1_id ?? null,
          centro_costo_2_id: detail.costCenter2 !== undefined ? detail.costCenter2 : documentData.centro_costo_2_id ?? null,
        };
        const plateChanged = (detail.extracted_plate ?? "") !== (detail.originalExtractedPlate ?? "");
        const updatePayload = {
          ...costCenterPayload,
          ...(plateChanged ? { extracted_plate: detail.extracted_plate ?? "" } : {}),
        };
        const createResponse = await fetch(buildApiUrl(
          detail.detailid > 0 ? `documents-detail/${detail.detailid}/` : "documents-detail/"
        ), {
          method: detail.detailid > 0 ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(detail.detailid > 0 ? updatePayload : {
            ...costCenterPayload,
            extracted_plate: detail.extracted_plate ?? "",
            document: documentData.documentid,
            documentserial: detail.documentserial,
            documentnumber: detail.documentnumber,
            suppliernumber: detail.suppliernumber,
            unit_measure_description: detail.unit_measure_description,
            description: detail.description,
            vehicle_nro: detail.vehicle_no || (detail as any).vehicle_nro,
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
        } else {
          const createdDetails = normalizeDocumentDetailsPayload(await createResponse.json().catch(() => null));
          const createdDetail = createdDetails.find((item) => buildDetailSignature(item) === buildDetailSignature(detail)) ?? createdDetails[0];
          const index = sunatDetails.findIndex((item) => item.detailid === detail.detailid);
          if (index >= 0) {
            const savedCenter1 = createdDetail?.costCenter1 !== undefined ? createdDetail.costCenter1 : costCenterPayload.centro_costo_1_id;
            const savedCenter2 = createdDetail?.costCenter2 !== undefined ? createdDetail.costCenter2 : costCenterPayload.centro_costo_2_id;
            const savedPlate = createdDetail?.extracted_plate !== undefined ? createdDetail.extracted_plate : detail.extracted_plate ?? "";
            sunatDetails[index] = { ...detail, ...createdDetail,
              extracted_plate: savedPlate, originalExtractedPlate: savedPlate,
              costCenter1: savedCenter1, costCenter2: savedCenter2,
              originalCostCenter1: savedCenter1, originalCostCenter2: savedCenter2 };
          }
        }
      }

      setDocDetails([...sunatDetails]);

    if (failedSyncs > 0) {
      throw new Error("No fue posible guardar todos los detalles de la factura.");
    }
    if (skippedDetails > 0) {
      addNotification("warning", t("Some invoice details could not be saved because the backend only accepts whole-number quantities, but the full detail from SUNAT is shown."));
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
      editDoc.documentdate.trim() !== "" &&
      parseFloat(editDoc.amount) > 0 &&
      parseFloat(editDoc.taxamount) >= 0 &&
      parseFloat(editDoc.totalamount) > 0;

    if (!isValid) {
      addNotification("danger", t("Complete all fields correctly"));
      return;
    }

    const costCenter1Values = new Set(docDetails.map((detail) =>
      detail.costCenter1 !== undefined ? detail.costCenter1 : editDoc.centro_costo_1_id ?? null
    ));
    const costCenter2Values = new Set(docDetails.map((detail) =>
      detail.costCenter2 !== undefined ? detail.costCenter2 : editDoc.centro_costo_2_id ?? null
    ));
    const hasSharedCostCenter1 = costCenter1Values.size === 1;
    const hasSharedCostCenter2 = costCenter2Values.size === 1;
    const costCenter1 = hasSharedCostCenter1 ? Array.from(costCenter1Values)[0] : editDoc.centro_costo_1_id ?? null;
    const costCenter2 = hasSharedCostCenter2 ? Array.from(costCenter2Values)[0] : editDoc.centro_costo_2_id ?? null;

    setLoadingSave(true);
    try {
      const documentTypeValue =
        typeof editDoc.documenttype === "object" && editDoc.documenttype !== null
          ? editDoc.documenttype.tipoid
          : editDoc.documenttype;

      const documentFields: Document & {
        centercost_id?: number | null;
      } = { ...editDoc };
      delete documentFields.centercost_id;
      const updatedDocument = {
        ...documentFields,
        status: isValid,
        documenttype_id: documentTypeValue,
        ...(hasSharedCostCenter1 ? { centro_costo_1_id: costCenter1 } : {}),
        ...(hasSharedCostCenter2 ? { centro_costo_2_id: costCenter2 } : {}),
      };

      const response = await fetch(buildApiUrl(`documents/${editDoc.documentid}/`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedDocument),
      });

      const payload = await response.json();

      if (response.ok && payload.success) {
        await persistDocumentDetails(editDoc);
        const nextSavedDocument = {
          ...editDoc,
          centro_costo_1_id: costCenter1,
          centro_costo_2_id: costCenter2,
          ...(payload.data && typeof payload.data === "object" ? payload.data : {}),
          documenttype: editDoc.documenttype,
          centercost: editDoc.centercost,
        } as Document;

        setEditDoc(nextSavedDocument);
        setSavedDocumentForOrder(nextSavedDocument);
        setShowGenerateOrderModal(true);
      } else {
        addNotification("danger", payload.message || t("Error updating"));
      }
    } catch (saveError) {
      console.error(saveError);
      addNotification("danger", saveError instanceof Error ? saveError.message : t("Error during the update process"));
    } finally {
      setLoadingSave(false);
    }
  };

  const handleSkipOrderGeneration = () => {
    setShowGenerateOrderModal(false);
    setSavedDocumentForOrder(null);
    sessionStorage.setItem(
      DOCUMENTS_FLASH_NOTIFICATION_KEY,
      JSON.stringify({
        type: "success",
        message: t("Document updated successfully"),
      })
    );
    navigate("/documents");
  };

  const handleGenerateOrder = () => {
    const targetDocument = savedDocumentForOrder ?? editDoc;

    if (!targetDocument) {
      handleSkipOrderGeneration();
      return;
    }

    setShowGenerateOrderModal(false);
    navigate(`/documents/order-c/${targetDocument.documentid}`, {
      state: { document: targetDocument },
    });
  };

  if (loading) {
    return (
      <div className="page-content document-edit-loading" aria-busy="true">
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
              previewUrl={getPreviewUrl(editDoc.batchFile?.r2Url?.trim() || editDoc.documenturl)}
              downloadUrl={getDownloadUrl(editDoc.batchFile?.r2Url?.trim() || editDoc.documenturl)}
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
              details={docDetails.map((detail) => ({
                ...detail,
                costCenter1: detail.costCenter1 !== undefined ? detail.costCenter1 : editDoc.centro_costo_1_id ?? null,
                costCenter2: detail.costCenter2 !== undefined ? detail.costCenter2 : editDoc.centro_costo_2_id ?? null,
              }))}
              centrosCostos={centrosCostos}
              centrosCostos2={centrosCostos2}
              onDetailsChange={setDocDetails}
              disabled={loadingSave}
            />
          </Col>
        </Row>

        <Modal
          isOpen={showGenerateOrderModal}
          toggle={handleSkipOrderGeneration}
          centered
          size="sm"
        >
          <ModalBody className="text-center py-4">
            <i
              className="ri-checkbox-circle-line text-success d-inline-block mb-3"
              style={{ fontSize: "3.5rem" }}
            />
            <h5 className="mb-2">{t("Document updated successfully")}</h5>
            <p className="text-muted mb-0">
              {t(
                "The fields were saved successfully. Do you want to generate the Purchase/Service Order?"
              )}
            </p>
          </ModalBody>
          <ModalFooter className="justify-content-center">
            <Button color="light" onClick={handleSkipOrderGeneration}>
              {t("No")}
            </Button>
            <Button color="primary" onClick={handleGenerateOrder}>
              {t("Yes")}
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
    </div>
  );
};

export default DocumentEditPage;
