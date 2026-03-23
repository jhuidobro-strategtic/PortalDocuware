import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, Card, CardBody, Col, Container, Row, Spinner } from "reactstrap";
import { useTranslation } from "react-i18next";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import Notifications from "../Documents/components/Notifications";
import DocumentEditorForm from "../Documents/components/DocumentEditorForm";
import { buildApiUrl } from "../../helpers/api-url";
import {
  buildFactilizaUrl,
  buildSunatUrl,
  getFactilizaToken,
  getSunatToken,
} from "../../helpers/external-api";
import {
  CentroCosto,
  Document,
  DocumentDetail,
  Notification,
  TipoDocumento,
} from "../Documents/types";
import {
  DOCUMENTS_FLASH_NOTIFICATION_KEY,
  getDownloadUrl,
  getPreviewUrl,
} from "../Documents/document-utils";
import DocumentEditPreviewPanel from "./DocumentEditPreviewPanel";
import DocumentInvoiceDetails from "./DocumentInvoiceDetails";
import "./DocumentsEdit.css";

interface LocationState {
  document?: Document;
}

const DocumentEditPage: React.FC = () => {
  const { documentId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  const [editDoc, setEditDoc] = useState<Document | null>(
    locationState?.document ?? null
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

  const addNotification = (type: Notification["type"], message: string) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);
  };

  const syncIgvPercent = (documentData: Document) => {
    const amount = parseFloat(documentData.amount || "0");
    const tax = parseFloat(documentData.taxamount || "0");
    setEditIgvPercent(
      amount > 0 && tax > 0 ? Math.round((tax / amount) * 100) : 0
    );
  };

  const fetchDetailsByValues = async (
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
    return Array.isArray(payload) ? payload : [];
  };

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

        setEditDoc(resolvedDocument);
        syncIgvPercent(resolvedDocument);

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
            resolvedDocument.suppliernumber,
            resolvedDocument.documentserial,
            resolvedDocument.documentnumber
          );
          setDocDetails(details);
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
  }, [documentId, t]);

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

    const sunatToken = getSunatToken();
    if (!sunatToken) {
      addNotification(
        "danger",
        t("SUNAT token is not configured in the environment")
      );
      return;
    }

    setLoadingDocument(true);
    try {
      const existingDetails = await fetchDetailsByValues(
        editDoc.suppliernumber,
        editDoc.documentserial,
        editDoc.documentnumber
      );

      if (existingDetails.length > 0) {
        setDocDetails(existingDetails);
        addNotification(
          "info",
          t("Details already exist. SUNAT was not queried.")
        );
        return;
      }

      const tipoComprobante =
        typeof editDoc.documenttype === "object" && editDoc.documenttype !== null
          ? String(editDoc.documenttype.tipoid).padStart(2, "0")
          : String(editDoc.documenttype).padStart(2, "0");

      if (!tipoComprobante || !editDoc.documentserial || !editDoc.documentnumber) {
        addNotification(
          "warning",
          t("Complete Type, Series and Number before querying SUNAT")
        );
        return;
      }

      const response = await fetch(buildSunatUrl("sunat/comprobante"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sunatToken}`,
        },
        body: JSON.stringify({
          tipo_comprobante: tipoComprobante,
          ruc_emisor: editDoc.suppliernumber,
          serie: editDoc.documentserial,
          numero: editDoc.documentnumber,
        }),
      });

      const payload = await response.json();

      if (!payload.success) {
        addNotification("danger", t("Error fetching invoice data from SUNAT"));
        return;
      }

      const sunatPayload = payload.payload;
      const { detalle, totales, items } = sunatPayload;
      const currency = detalle.codigo_moneda || "PEN";
      const subtotal = parseFloat(totales.total_grav_oner || 0).toFixed(2);
      const tax = parseFloat(totales.total_igv || 0).toFixed(2);
      const total = parseFloat(totales.monto_total_general || 0).toFixed(2);
      const issueDate = detalle.fecha_emision || editDoc.documentdate;

      const nextDocument = {
        ...editDoc,
        currency,
        amount: subtotal,
        taxamount: tax,
        totalamount: total,
        documentdate: issueDate,
      };

      setEditDoc(nextDocument);
      syncIgvPercent(nextDocument);

      const round2 = (value: unknown) => Number(parseFloat(String(value)).toFixed(2));
      const itemsToRegister = items || [];

      for (const item of itemsToRegister) {
        let text = item.descripcion || "";
        let cleanText = text
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        let match = cleanText.match(/PLACA[:\s-]*([A-Z0-9-]{5,8})\b/i);
        if (!match) {
          const possibleMatches = cleanText.match(/\b[A-Z0-9-]{5,8}\b/g);
          if (possibleMatches) {
            match =
              possibleMatches.find(
                (candidate: string) =>
                  /[A-Z]/i.test(candidate) && /\d/.test(candidate)
              ) || null;
          }
        }

        let plate = null;
        if (match) {
          const candidate = (typeof match === "string" ? match : match[1])
            .toUpperCase()
            .replace(/-/g, "");
          if (
            candidate.length >= 5 &&
            candidate.length <= 7 &&
            /[A-Z]/.test(candidate) &&
            /\d/.test(candidate)
          ) {
            plate = candidate;
          }
        }

        await fetch(buildApiUrl("documents-detail/"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentserial: detalle.serie,
            documentnumber: detalle.numero,
            suppliernumber: sunatPayload.emisor.ruc,
            unit_measure_description: item.unidad_medida_descripcion,
            description: item.descripcion,
            vehicle_no: plate,
            quantity: round2(item.cantidad),
            unit_value: round2(item.valor_unitario),
            tax_value: round2(item.impuesto_valor),
            total_value: round2(item.precio_unitario),
            status: false,
            created_by: 1,
            created_at: new Date().toISOString(),
          }),
        });
      }

      const refreshedDetails = await fetchDetailsByValues(
        nextDocument.suppliernumber,
        nextDocument.documentserial,
        nextDocument.documentnumber
      );

      if (refreshedDetails.length > 0) {
        setDocDetails(refreshedDetails);
        addNotification("success", t("Details loaded successfully from SUNAT"));
      } else {
        addNotification("warning", t("No details found in SUNAT"));
      }
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
          onRemove={(id) =>
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

        <Row className="g-4 align-items-start">
          <Col lg={6}>
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

          <Col lg={6}>
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
