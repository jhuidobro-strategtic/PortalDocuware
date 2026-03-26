import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import {
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
  Table,
} from "reactstrap";

import BreadCrumb from "../../Components/Common/BreadCrumb";
import FloatingAlerts from "../../Components/Common/FloatingAlerts";
import type { FloatingAlertItem } from "../../Components/Common/FloatingAlerts";
import { buildApiUrl } from "../../helpers/api-url";
import { buildSunatUrl, getSunatToken } from "../../helpers/external-api";
import { Document } from "../Documents/types";

const DOCUMENTS_FLASH_NOTIFICATION_KEY = "documents-flash-notification";

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

interface SunatSearchValues {
  tipoComprobante: string;
  serie: string;
  numero: string;
}

type OrderCFieldName = keyof OrderCFormValues;

interface OrderCFieldConfig {
  name: OrderCFieldName;
  labelKey: string;
  placeholderKey: string;
  type?: "text" | "number";
  readOnly?: boolean;
  helperTextKey?: string;
}

interface FeedbackState {
  type: "success" | "danger" | "info";
  message: string;
}

interface CatalogoItem {
  id: number;
  descripcion: string;
}

interface SupplierApiItem {
  supplierid: number;
  supplierno?: string;
  suppliername?: string;
}

interface SupplierOptionItem {
  supplierID: number;
  supplierNo: string;
  supplierName: string;
}

type SelectOption = { value: string; label: string; flagUrl?: string };

const CATALOG_ENDPOINTS: Record<string, string> = {
  paymentCondition: "PAYMENT_CONDITION",
  currency: "MONEY",
  store: "STORE_WAREHOUSE",
  purchaseState: "STATE_OF_PURCHASE_ORDER",
};

const fetchCatalog = async (tipo: string): Promise<SelectOption[]> => {
  const response = await fetch(buildApiUrl(`catalogos/?tipo_catalogo=${tipo}`));
  const data = await response.json();
  if (!data.success || !Array.isArray(data.data)) return [];
  return (data.data as CatalogoItem[]).map((item) => ({
    value: String(item.id),
    label: item.descripcion,
  }));
};

const fetchSuppliers = async (): Promise<SupplierOptionItem[]> => {
  const response = await fetch(buildApiUrl("proveedores"));
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success || !Array.isArray(data?.data)) {
    throw new Error(data?.message || "Error loading suppliers");
  }

  return (data.data as SupplierApiItem[]).map((item) => ({
    supplierID: item.supplierid,
    supplierNo: item.supplierno ?? "",
    supplierName: item.suppliername ?? "",
  }));
};

const getCurrencyMeta = (currencyValue: unknown, currencyLabel?: string) => {
  const normalizedValue = String(currencyValue ?? "").trim().toUpperCase();

  switch (normalizedValue) {
    case "1":
    case "3":
    case "PEN":
    case "SOL":
    case "SOLES":
    case "SOLES(S/.)":
      return {
        normalizedValue: "3",
        shortLabel: "PEN",
        label: currencyLabel || "SOLES(S/.)",
        alt: "Peru",
        imageUrl: "https://flagcdn.com/w40/pe.png",
      };
    case "2":
    case "4":
    case "USD":
    case "DOLAR":
    case "DÓLAR":
    case "DOLARES":
    case "DÓLARES":
    case "USD($)":
      return {
        normalizedValue: "4",
        shortLabel: "USD",
        label: currencyLabel || "USD($)",
        alt: "USA",
        imageUrl: "https://flagcdn.com/w40/us.png",
      };
    default:
      return {
        normalizedValue,
        shortLabel: normalizedValue,
        label: currencyLabel || normalizedValue,
        alt: "Currency",
        imageUrl: null,
      };
  }
};

const withCurrencyFlags = (options: SelectOption[]) =>
  options.map((option) => ({
    ...option,
    flagUrl: getCurrencyMeta(option.value, option.label).imageUrl || undefined,
  }));

interface SunatInvoiceItem {
  descripcion?: string;
  cantidad?: number | string;
  valor_unitario?: number | string;
  precio_unitario?: number | string;
}

interface SunatInvoicePayload {
  detalle?: {
    codigo_moneda?: string;
    fecha_emision?: string;
    serie?: string;
    numero?: string;
  };
  emisor?: {
    ruc?: string;
    razon_social?: string;
    nombre_o_razon_social?: string;
    nombre_razon_social?: string;
  };
  items?: SunatInvoiceItem[];
}

const getOrderCFields = (): OrderCFieldConfig[] => [
  {
    name: "suppliernumber",
    labelKey: "RUC",
    placeholderKey: "Auto-filled from the document",
    readOnly: true,
    helperTextKey: "It is completed automatically with the RUC from the record.",
  },
  {
    name: "suppliername",
    labelKey: "Business Name",
    placeholderKey: "Auto-filled from the document",
    readOnly: true,
    helperTextKey:
      "It is completed automatically with the business name from the record.",
  },
  {
    name: "orderNo",
    labelKey: "Order Number",
    placeholderKey: "E.g. OC-0002",
  },
  {
    name: "supplierID",
    labelKey: "Supplier",
    placeholderKey: "Select supplier",
  },
  {
    name: "paymentCondition",
    labelKey: "Payment Condition",
    placeholderKey: "Select payment condition",
  },
  {
    name: "currency",
    labelKey: "Currency",
    placeholderKey: "Select currency",
  },
  {
    name: "guideNo",
    labelKey: "Guide Number",
    placeholderKey: "E.g. GUIA-01",
  },
  {
    name: "store",
    labelKey: "Warehouse",
    placeholderKey: "Select warehouse",
  },
  {
    name: "purchaseState",
    labelKey: "Purchase Status",
    placeholderKey: "Select purchase status",
  },
  {
    name: "createdByName",
    labelKey: "Created by",
    placeholderKey: "Auto-filled from the session",
    readOnly: true,
  },
];

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

const getSunatDocumentType = (document: Document | null) => {
  const documentTypeId = getDocumentTypeId(document);
  return documentTypeId ? documentTypeId.padStart(2, "0") : "";
};

const createInitialSunatSearchValues = (
  document: Document | null
): SunatSearchValues => ({
  tipoComprobante: getSunatDocumentType(document),
  serie: document?.documentserial ?? "",
  numero: document?.documentnumber ?? "",
});

const mapSunatCurrencyToOrderCurrency = (currencyCode: unknown) => {
  const { normalizedValue, imageUrl } = getCurrencyMeta(currencyCode);
  return imageUrl ? normalizedValue : "";
};

const formatDecimalValue = (value: unknown, fallback = "0.00") => {
  const parsedValue = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsedValue) ? parsedValue.toFixed(2) : fallback;
};

const formatQuantityValue = (value: unknown) => {
  const parsedValue = Number.parseFloat(String(value ?? ""));

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return "1";
  }

  const normalizedValue = Number.isInteger(parsedValue)
    ? String(parsedValue)
    : parsedValue.toFixed(2);

  return normalizedValue.replace(/\.?0+$/, "");
};

const getSunatSupplierName = (
  payload: SunatInvoicePayload,
  fallbackValue: string
) =>
  payload.emisor?.razon_social ||
  payload.emisor?.nombre_o_razon_social ||
  payload.emisor?.nombre_razon_social ||
  fallbackValue;

const mapSunatItemsToOrderDetails = (items: SunatInvoiceItem[] = []) => {
  const mappedItems = items
    .map((item) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      descriptionItem: String(item.descripcion ?? "").trim(),
      quantity: formatQuantityValue(item.cantidad),
      unitPrice: formatDecimalValue(
        item.valor_unitario ?? item.precio_unitario,
        ""
      ),
    }))
    .filter((item) => item.descriptionItem || item.unitPrice);

  return mappedItems;
};

const getOrderCurrencyLabel = (currencyValue: string) => {
  return getCurrencyMeta(currencyValue).label;
};

const normalizeSupplierNumber = (value: string) => value.replace(/\D/g, "");

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
    currency: mapSunatCurrencyToOrderCurrency(document?.currency),
    guideNo: "",
    store: "",
    purchaseState: "11",
    createdBy: sessionUser.id,
    createdByName: sessionUser.name,
  };
};

const getDetailTotal = (detail: OrderCDetailFormValues) => {
  const quantity = Number(detail.quantity || 0);
  const unitPrice = Number(detail.unitPrice || 0);

  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    return "0.00";
  }

  return (quantity * unitPrice).toFixed(2);
};

const formatListAmount = (value: string) =>
  Number(value || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
  const { t } = useTranslation();
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
  const [sunatSearchValues, setSunatSearchValues] = useState<SunatSearchValues>(
    createInitialSunatSearchValues(locationState?.document ?? null)
  );
  const [details, setDetails] = useState<OrderCDetailFormValues[]>([]);
  const [loading, setLoading] = useState(!locationState?.document);
  const [submitting, setSubmitting] = useState(false);
  const [prefillingFromSunat, setPrefillingFromSunat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [catalogOptions, setCatalogOptions] = useState<
    Record<string, SelectOption[]>
  >({
    paymentCondition: [],
    currency: [],
    store: [],
    purchaseState: [],
  });
  const [supplierOptions, setSupplierOptions] = useState<SupplierOptionItem[]>([]);
  const orderCFields = getOrderCFields();

  useEffect(() => {
    const loadCatalogs = async () => {
      const entries: Array<[string, SelectOption[]]> = await Promise.all(
        Object.entries(CATALOG_ENDPOINTS).map(async ([field, tipo]) => [
          field,
          await fetchCatalog(tipo),
        ])
      );
      setCatalogOptions(
        Object.fromEntries(
          entries.map(([field, options]): [string, SelectOption[]] => [
            field,
            field === "currency" ? withCurrencyFlags(options) : options,
          ])
        ) as Record<string, SelectOption[]>
      );
    };
    loadCatalogs();
  }, []);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setSupplierOptions(await fetchSuppliers());
      } catch (fetchError: any) {
        setFeedback({
          type: "danger",
          message: fetchError?.message || t("Error loading suppliers"),
        });
      }
    };

    loadSuppliers();
  }, [t]);
  const getFieldLabel = (fieldName: OrderCFieldName) =>
    orderCFields.find((field) => field.name === fieldName)?.labelKey || fieldName;
  const floatingAlerts: FloatingAlertItem[] = [];
  const supplierSelectOptions: SelectOption[] = supplierOptions.map((supplier) => ({
    value: String(supplier.supplierID),
    label:
      [supplier.supplierNo, supplier.supplierName]
        .filter(Boolean)
        .join(" - ") || String(supplier.supplierID),
  }));
  const selectedCurrencyMeta = getCurrencyMeta(
    values.currency,
    catalogOptions.currency.find(
      (option) =>
        option.value === getCurrencyMeta(values.currency).normalizedValue
    )?.label
  );

  if (prefillingFromSunat) {
    floatingAlerts.push({
      id: "order-c-prefill",
      type: "info",
      dismissible: false,
      message: (
        <span className="d-inline-flex align-items-center gap-2">
          <Spinner size="sm" />
          <span>{t("Querying SUNAT with the entered document data...")}</span>
        </span>
      ),
    });
  }

  if (feedback) {
    floatingAlerts.push({
      id: "order-c-feedback",
      type: feedback.type,
      message: feedback.message,
      autoDismissMs:
        feedback.type === "success" || feedback.type === "info"
          ? 5000
          : undefined,
    });
  }

  useEffect(() => {
    window.document.title = `${t("Order C.")} | Docuware`;
  }, [t]);

  useEffect(() => {
    setValues(createInitialValues(document));
    setSunatSearchValues(createInitialSunatSearchValues(document));
    setDetails([]);
    setFeedback(null);
  }, [document]);

  useEffect(() => {
    setValues((prev) => ({
      ...prev,
      documentAssociatedType:
        sunatSearchValues.tipoComprobante.replace(/^0+/, "") ||
        getDocumentTypeId(document),
      documentAssociatedNo:
        [sunatSearchValues.serie, sunatSearchValues.numero]
          .filter(Boolean)
          .join("-") || getDocumentAssociatedNo(document),
    }));
  }, [document, sunatSearchValues]);

  useEffect(() => {
    const normalizedSupplierNumber = normalizeSupplierNumber(values.suppliernumber);

    if (!normalizedSupplierNumber || supplierOptions.length === 0) {
      return;
    }

    const matchedSupplier = supplierOptions.find(
      (supplier) =>
        normalizeSupplierNumber(supplier.supplierNo) === normalizedSupplierNumber
    );

    if (!matchedSupplier) {
      return;
    }

    setValues((prev) => {
      const nextSupplierID = String(matchedSupplier.supplierID);
      const nextSupplierNo = matchedSupplier.supplierNo || prev.suppliernumber;
      const nextSupplierName = matchedSupplier.supplierName || prev.suppliername;

      if (
        prev.supplierID === nextSupplierID &&
        prev.suppliernumber === nextSupplierNo &&
        prev.suppliername === nextSupplierName
      ) {
        return prev;
      }

      return {
        ...prev,
        supplierID: nextSupplierID,
        suppliernumber: nextSupplierNo,
        suppliername: nextSupplierName,
      };
    });
  }, [supplierOptions, values.suppliernumber]);

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
          throw new Error(t("Unable to get the selected document."));
        }

        const selectedDocument =
          data.data.find(
            (item: Document) => String(item.documentid) === String(documentId)
          ) ?? null;

        if (!selectedDocument) {
          throw new Error(t("The requested record was not found."));
        }

        setDocument(selectedDocument);
      } catch (fetchError: any) {
        setError(
          fetchError.message || t("An error occurred while loading the Order C. view.")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId, locationState?.document, t]);

  const handleChange = (field: OrderCFieldName, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSupplierChange = (selected: SelectOption | null) => {
    if (!selected) {
      setValues((prev) => ({ ...prev, supplierID: "" }));
      return;
    }

    setValues((prev) => ({
      ...prev,
      supplierID: selected.value,
    }));
  };

  const handleSunatSearchValueChange = (
    field: keyof SunatSearchValues,
    value: string
  ) => {
    setSunatSearchValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleRemoveFloatingAlert = (alertId: string | number) => {
    if (alertId === "order-c-feedback") {
      setFeedback(null);
    }
  };

  const isSunatSearchReady = [
    sunatSearchValues.tipoComprobante,
    values.suppliernumber,
    sunatSearchValues.serie,
    sunatSearchValues.numero,
  ].every((value) => String(value || "").trim());

  const handleSearchSunat = async () => {
    if (!document) {
      return;
    }

    const sunatToken = getSunatToken();
    if (!sunatToken) {
      setFeedback({
        type: "danger",
        message: t("SUNAT token is not configured in the environment"),
      });
      return;
    }

    if (!isSunatSearchReady) {
      setFeedback({
        type: "danger",
        message: t(
          "Complete Voucher Type, Series and Number before querying SUNAT"
        ),
      });
      return;
    }

    try {
      setFeedback(null);
      setPrefillingFromSunat(true);

      const response = await fetch(buildSunatUrl("sunat/comprobante"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sunatToken}`,
        },
        body: JSON.stringify({
          tipo_comprobante: sunatSearchValues.tipoComprobante.trim(),
          ruc_emisor: values.suppliernumber.trim(),
          serie: sunatSearchValues.serie.trim(),
          numero: sunatSearchValues.numero.trim(),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success || !data?.payload) {
        throw new Error(
          data?.message || t("Error fetching invoice data from SUNAT")
        );
      }

      const payload = data.payload as SunatInvoicePayload;
      const detailRows = mapSunatItemsToOrderDetails(payload.items);
      const hasSunatDetails = detailRows.some((detail) =>
        detail.descriptionItem.trim()
      );
      const currencyCode = payload.detalle?.codigo_moneda || document.currency;
      const associatedDocumentNo =
        [
          payload.detalle?.serie || sunatSearchValues.serie,
          payload.detalle?.numero || sunatSearchValues.numero,
        ]
          .filter(Boolean)
          .join("-") || getDocumentAssociatedNo(document);

      setValues((prev) => ({
        ...prev,
        suppliernumber:
          payload.emisor?.ruc || values.suppliernumber || prev.suppliernumber,
        suppliername: getSunatSupplierName(
          payload,
          document.suppliername || prev.suppliername
        ),
        documentAssociatedNo: associatedDocumentNo,
        currency: mapSunatCurrencyToOrderCurrency(currencyCode) || prev.currency,
      }));
      setSunatSearchValues((prev) => ({
        ...prev,
        serie: payload.detalle?.serie || prev.serie,
        numero: payload.detalle?.numero || prev.numero,
      }));
      setDetails(detailRows);
      setFeedback({
        type: hasSunatDetails ? "info" : "danger",
        message: hasSunatDetails
          ? t(
              "The selected document was loaded from SUNAT and the details were auto-filled."
            )
          : t("No details found in SUNAT"),
      });
    } catch (prefillError: any) {
      setFeedback({
        type: "danger",
        message:
          prefillError?.message ||
          t("Unable to query SUNAT for the selected document."),
      });
    } finally {
      setPrefillingFromSunat(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const sessionUser = getCurrentSessionUser();
    if (!sessionUser.id) {
      setFeedback({
        type: "danger",
        message: t("Unable to identify the signed-in user to complete Created by."),
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
        message: t("Complete the {{field}} field.", {
          field: t(getFieldLabel(missingField)),
        }),
      });
      return;
    }

    if (details.length === 0) {
      setFeedback({
        type: "danger",
        message: t("Load the detail lines from SUNAT before saving."),
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = buildPurchaseOrderPayload(normalizedValues, details);
      const response = await fetch(buildApiUrl("purchase-orders/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || t("Unable to register Order C.")
        );
      }

      sessionStorage.setItem(
        DOCUMENTS_FLASH_NOTIFICATION_KEY,
        JSON.stringify({
          type: "success",
          message: data?.message || t("Order C. registered successfully."),
        })
      );
      navigate("/documents");
    } catch (submitError: any) {
      setFeedback({
        type: "danger",
        message:
          submitError.message || t("An error occurred while registering Order C."),
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
          <FloatingAlerts
            alerts={[
              {
                id: "order-c-load-error",
                type: "danger",
                message: error || t("No information was found for this view."),
              },
            ]}
          />
          <BreadCrumb title="Order C." pageTitle="Documents" />
          <Button color="light" onClick={() => navigate("/documents")}>
            {t("Back to Documents")}
          </Button>
        </Container>
      </div>
    );
  }

  return (
    <div className="page-content">
      <Container fluid>
        <FloatingAlerts
          alerts={floatingAlerts}
          onRemove={handleRemoveFloatingAlert}
        />
        <BreadCrumb title="Order C." pageTitle="Documents" />

        <Card className="border-0 shadow-sm mb-4">
          <CardBody>
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
              <div>
                <h4 className="mb-1">
                  {t("Document #{{id}}", { id: document.documentid })}
                </h4>
                <p className="text-muted mb-2">
                  {t("Series {{serial}} - Number {{number}}", {
                    serial: document.documentserial,
                    number: document.documentnumber,
                  })}
                </p>
                <div className="d-flex flex-wrap gap-2 text-muted small">
                  <span className="badge bg-light text-secondary border">
                    {t("Status: {{status}}", {
                      status: document.status
                        ? t("Active status")
                        : t("Pending status"),
                    })}
                  </span>
                  <span className="badge bg-light text-secondary border">
                    <span className="d-inline-flex align-items-center gap-2">
                      {selectedCurrencyMeta.imageUrl && (
                        <img
                          src={selectedCurrencyMeta.imageUrl}
                          alt={selectedCurrencyMeta.alt}
                          width={20}
                          height={15}
                          className="rounded-1 flex-shrink-0"
                        />
                      )}
                      <span>
                        {t("Currency: {{currency}}", {
                          currency:
                            selectedCurrencyMeta.label ||
                            getOrderCurrencyLabel(values.currency) ||
                            document.currency,
                        })}
                      </span>
                    </span>
                  </span>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2">
                <Button tag={Link} to="/documents" color="light">
                  {t("Back")}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardBody className="p-4">
            <div className="mb-4">
              <h5 className="mb-1">{t("Order C. form")}</h5>
              <p className="text-muted mb-0">
                {t(
                  "Use the selected document as a base, then query SUNAT to auto-fill the general data and detail lines."
                )}
              </p>
            </div>

            <Form onSubmit={handleSubmit}>
              <div className="mb-4">
                <h6 className="text-uppercase text-muted mb-3">
                  {t("SUNAT Query")}
                </h6>
                <Row className="g-4 align-items-end">
                  <Col md={4}>
                    <Label className="form-label">{t("Voucher Type")}</Label>
                    <Input
                      value={sunatSearchValues.tipoComprobante}
                      onChange={(event) =>
                        handleSunatSearchValueChange(
                          "tipoComprobante",
                          event.target.value
                        )
                      }
                      placeholder="01"
                    />
                  </Col>
                  <Col md={4}>
                    <Label className="form-label">{t("Series")}</Label>
                    <Input
                      value={sunatSearchValues.serie}
                      onChange={(event) =>
                        handleSunatSearchValueChange("serie", event.target.value)
                      }
                      placeholder="F001"
                    />
                  </Col>
                  <Col md={4}>
                    <Label className="form-label">{t("Number")}</Label>
                    <Input
                      value={sunatSearchValues.numero}
                      onChange={(event) =>
                        handleSunatSearchValueChange("numero", event.target.value)
                      }
                      placeholder="2603"
                    />
                  </Col>
                  <Col xs={12}>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 rounded-3 border bg-light-subtle px-3 py-3">
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <small className="text-muted">
                          {t(
                            "Complete Voucher Type, Series and Number. The issuer RUC is taken from the selected record."
                          )}
                        </small>
                        <span className="badge bg-light text-secondary border">
                          {t("Issuer RUC: {{ruc}}", {
                            ruc: values.suppliernumber || "-",
                          })}
                        </span>
                      </div>

                      {isSunatSearchReady && (
                        <Button
                          type="button"
                          color="primary"
                          onClick={handleSearchSunat}
                          disabled={prefillingFromSunat}
                        >
                          {prefillingFromSunat ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              {t("Querying SUNAT...")}
                            </>
                          ) : (
                            <>
                              <i className="ri-search-line align-bottom me-1" />
                              {t("Search SUNAT")}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </Col>
                </Row>
              </div>

              <div className="mb-4">
                <h6 className="text-uppercase text-muted mb-3">
                  {t("General Data")}
                </h6>
                <Row className="g-4">
                  {orderCFields.map((field) => {
                    const isCatalogSelect = field.name in CATALOG_ENDPOINTS;
                    const isSupplierSelect = field.name === "supplierID";
                    const isCurrencySelect = field.name === "currency";
                    const selectOptions = isSupplierSelect
                      ? supplierSelectOptions
                      : catalogOptions[field.name] ?? [];
                    return (
                      <Col md={6} key={field.name}>
                        <div>
                          <Label className="form-label">
                            {t(field.labelKey)}
                          </Label>
                          {isCatalogSelect || isSupplierSelect ? (
                            <Select
                              options={selectOptions}
                              value={
                                selectOptions.find(
                                  (opt) =>
                                    opt.value ===
                                    (isCurrencySelect
                                      ? getCurrencyMeta(values[field.name]).normalizedValue
                                      : values[field.name])
                                ) ?? null
                              }
                              onChange={(selected: SelectOption | null) =>
                                isSupplierSelect
                                  ? handleSupplierChange(selected)
                                  : handleChange(
                                      field.name,
                                      selected ? selected.value : ""
                                    )
                              }
                              placeholder={t(field.placeholderKey)}
                              isClearable
                              classNamePrefix="select2-selection"
                              formatOptionLabel={
                                isCurrencySelect
                                  ? (option: SelectOption) => (
                                      <span className="d-inline-flex align-items-center gap-2">
                                        {option.flagUrl && (
                                          <img
                                            src={option.flagUrl}
                                            alt={option.label}
                                            width={20}
                                            height={15}
                                            className="rounded-1 flex-shrink-0"
                                          />
                                        )}
                                        <span>{option.label}</span>
                                      </span>
                                    )
                                  : undefined
                              }
                            />
                          ) : (
                            <Input
                              type={field.type || "text"}
                              value={values[field.name]}
                              onChange={(event) =>
                                handleChange(field.name, event.target.value)
                              }
                              placeholder={t(field.placeholderKey)}
                              readOnly={field.readOnly}
                              className={field.readOnly ? "bg-light" : ""}
                            />
                          )}
                          {field.helperTextKey && (
                            <small className="text-muted d-block mt-1">
                              {t(field.helperTextKey)}
                            </small>
                          )}
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>

              <div className="border-top pt-4">
                <div className="mb-3">
                  <h6 className="text-uppercase text-muted">{t("Details")}</h6>
                </div>

                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "72px" }}>#</th>
                        <th>{t("Item description")}</th>
                        <th style={{ width: "160px" }} className="text-center">
                          {t("Quantity")}
                        </th>
                        <th style={{ width: "180px" }} className="text-end">
                          {t("Unit price")}
                        </th>
                        <th style={{ width: "180px" }} className="text-end">
                          {t("Total")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4">
                            <div>
                              <h6 className="mb-1">
                                {t("No details found in SUNAT")}
                              </h6>
                              <p className="text-muted mb-0">
                                {t(
                                  "Query SUNAT to display the detail lines associated with the document."
                                )}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        details.map((detail, index) => (
                          <tr key={detail.id}>
                            <td className="fw-semibold text-muted">
                              {index + 1}
                            </td>
                            <td>{detail.descriptionItem || t("No description")}</td>
                            <td className="text-center">{detail.quantity}</td>
                            <td className="text-end">
                              {formatListAmount(detail.unitPrice)}
                            </td>
                            <td className="text-end fw-semibold">
                              {formatListAmount(getDetailTotal(detail))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </div>

              <div className="d-flex flex-wrap justify-content-end gap-2 mt-4">
                <Button type="button" color="light" onClick={() => navigate(-1)}>
                  {t("Cancel")}
                </Button>
                <Button type="submit" color="primary" disabled={submitting}>
                  {submitting ? t("Saving...") : t("Save")}
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
