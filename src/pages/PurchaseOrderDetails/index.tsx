import React, { useEffect, useState } from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardBody,
  Container,
  Input,
  InputGroup,
  InputGroupText,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Pagination,
  PaginationItem,
  PaginationLink,
  Spinner,
  Table,
} from "reactstrap";

import BreadCrumb from "../../Components/Common/BreadCrumb";
import FloatingAlerts, {
  FloatingAlertItem,
} from "../../Components/Common/FloatingAlerts";
import { buildApiUrl } from "../../helpers/api-url";
import { getNumberLocale } from "../../common/locale";
import { Document } from "../Documents/types";
import { getDownloadUrl } from "../Documents/document-utils";
import { generatePurchaseOrderPdf } from "./purchaseOrderPdf";
import PurchaseOrderPdfPreviewModal from "./PurchaseOrderPdfPreviewModal";
import {
  getPurchaseOrderPdf,
  listStoredPurchaseOrderPdfIds,
  savePurchaseOrderPdf,
} from "./purchaseOrderPdfStorage";

interface PurchaseOrderDetail {
  purchaseDetailID: number;
  descriptionItem: string;
  quantity: number;
  unitPrice: string;
  total: string;
  createdBy: number;
  createAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
  purchaseOrderID: number;
}

interface PurchaseOrder {
  purchaseOrderID: number;
  orderNo: string;
  supplierID: number;
  supplierLabel?: string;
  documentAssociatedType: number;
  documentAssociatedTypeLabel?: string;
  documentAssociatedNo: string;
  paymentCondition: number;
  paymentConditionLabel?: string;
  currency: number;
  currencyLabel?: string;
  guideNo: string;
  store: number;
  storeLabel?: string;
  purchaseState: number;
  purchaseStateLabel?: string;
  createdBy: number;
  createAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
  details: PurchaseOrderDetail[];
}

interface CatalogItem {
  id: number;
  descripcion: string;
}

interface BankReference {
  id: number;
  descripcion: string;
}

interface DocumentTypeReference {
  tipoid: number;
  tipo: string;
}

interface SupplierReference {
  supplierid: number;
  supplierno?: string;
  suppliername?: string;
  address?: string;
  phone?: string;
  email?: string;
  bank1?: BankReference | null;
  accountno1?: string;
  bank2?: BankReference | null;
  accountno2?: string;
}

interface PurchaseOrderApiItem {
  purchaseOrderID: number;
  orderNo: string;
  supplierID: number | SupplierReference;
  documentAssociatedType: number | DocumentTypeReference;
  documentAssociatedNo: string;
  paymentCondition: number | CatalogItem;
  currency: number | CatalogItem;
  guideNo: string;
  store: number | CatalogItem;
  purchaseState: number | CatalogItem;
  createdBy: number;
  createAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
  details: PurchaseOrderDetail[];
}

const getDocumentAssociatedNo = (document: Document) =>
  [document.documentserial, document.documentnumber].filter(Boolean).join("-");

const sanitizeFileNamePart = (value: unknown, fallback: string) => {
  const normalizedValue = String(value ?? "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_");

  return normalizedValue || fallback;
};

const createPdfFile = (blob: Blob, fileName: string) =>
  new File([blob], fileName, {
    type: blob.type || "application/pdf",
    lastModified: Date.now(),
  });

const buildInvoicePdfFileName = (document: Document) =>
  `${sanitizeFileNamePart(
    [document.documentserial, document.documentnumber]
      .filter(Boolean)
      .join("-") || document.documentid,
    "Factura"
  )}.pdf`;

const fetchRelatedInvoicePdfFile = async (
  document: Document
): Promise<File | null> => {
  const primaryUrl = getDownloadUrl(document.documenturl || "");
  const fallbackUrl = String(document.documenturl || "").trim();
  const candidateUrls = [primaryUrl, fallbackUrl].filter(Boolean);

  for (const candidateUrl of candidateUrls) {
    try {
      const response = await fetch(candidateUrl);

      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType && !contentType.toLowerCase().includes("pdf")) {
        continue;
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        continue;
      }

      const blobType = (blob.type || contentType).toLowerCase();
      if (blobType && !blobType.includes("pdf")) {
        continue;
      }

      return createPdfFile(blob, buildInvoicePdfFileName(document));
    } catch {
      // Try the next candidate URL.
    }
  }

  return null;
};

const buildExpedientDocumentsPayload = (
  createdBy: number,
  includeInvoiceFile: boolean
) =>
  JSON.stringify(
    [
      includeInvoiceFile
        ? {
            tipodocumentoid: 1,
            file_field: "factura_file",
            createdby: createdBy,
          }
        : null,
      {
        tipodocumentoid: 2,
        file_field: "orden_file",
        createdby: createdBy,
      },
    ].filter(Boolean)
  );

const mapCatalogLookup = (items: CatalogItem[]) =>
  items.reduce((acc: Record<number, string>, item) => {
    acc[item.id] = item.descripcion;
    return acc;
  }, {});

const mapSupplierLookup = (items: SupplierReference[]) =>
  items.reduce((acc: Record<number, string>, item) => {
    const label =
      [item.supplierno, item.suppliername].filter(Boolean).join(" - ") ||
      String(item.supplierid);

    acc[item.supplierid] = label;
    return acc;
  }, {});

const mapSupplierDetailsLookup = (items: SupplierReference[]) =>
  items.reduce((acc: Record<number, SupplierReference>, item) => {
    acc[item.supplierid] = item;
    return acc;
  }, {});

const getCatalogId = (value: number | CatalogItem) =>
  typeof value === "number" ? value : Number(value?.id ?? 0);

const getCatalogLabel = (value: number | CatalogItem) =>
  typeof value === "number" ? "" : value?.descripcion ?? "";

const getSupplierId = (value: number | SupplierReference) =>
  typeof value === "number" ? value : Number(value?.supplierid ?? 0);

const getSupplierLabel = (value: number | SupplierReference) => {
  if (typeof value === "number") {
    return "";
  }

  return (
    [value.supplierno, value.suppliername].filter(Boolean).join(" - ") ||
    String(value.supplierid ?? "")
  );
};

const getDocumentTypeId = (value: number | DocumentTypeReference) =>
  typeof value === "number" ? value : Number(value?.tipoid ?? 0);

const getDocumentTypeLabel = (value: number | DocumentTypeReference) =>
  typeof value === "number" ? "" : value?.tipo ?? "";

const mapPurchaseOrder = (item: PurchaseOrderApiItem): PurchaseOrder => ({
  purchaseOrderID: item.purchaseOrderID,
  orderNo: item.orderNo,
  supplierID: getSupplierId(item.supplierID),
  supplierLabel: getSupplierLabel(item.supplierID),
  documentAssociatedType: getDocumentTypeId(item.documentAssociatedType),
  documentAssociatedTypeLabel: getDocumentTypeLabel(item.documentAssociatedType),
  documentAssociatedNo: item.documentAssociatedNo,
  paymentCondition: getCatalogId(item.paymentCondition),
  paymentConditionLabel: getCatalogLabel(item.paymentCondition),
  currency: getCatalogId(item.currency),
  currencyLabel: getCatalogLabel(item.currency),
  guideNo: item.guideNo,
  store: getCatalogId(item.store),
  storeLabel: getCatalogLabel(item.store),
  purchaseState: getCatalogId(item.purchaseState),
  purchaseStateLabel: getCatalogLabel(item.purchaseState),
  createdBy: item.createdBy,
  createAt: item.createAt,
  updatedBy: item.updatedBy,
  updatedAt: item.updatedAt,
  details: item.details ?? [],
});

const getCurrentSessionUser = () => {
  try {
    const authUser = sessionStorage.getItem("authUser");
    if (!authUser) {
      return { id: null as number | null, name: "" };
    }

    const parsedUser = JSON.parse(authUser);
    const sessionData = parsedUser?.data || {};
    const parsedId = Number(
      sessionData?.userID ?? sessionData?.id ?? sessionData?.profileID ?? ""
    );

    return {
      id: Number.isFinite(parsedId) ? parsedId : null,
      name:
        sessionData?.fullname ||
        sessionData?.first_name ||
        sessionData?.username ||
        sessionData?.email ||
        "",
    };
  } catch {
    return { id: null as number | null, name: "" };
  }
};

const getLookupLabel = (lookup: Record<number, string>, value: number) =>
  lookup[value] || String(value ?? "-");

const getCurrencyMeta = (
  currency: number,
  t: (key: string) => string,
  currencyLabel?: string
) => {
  switch (currency) {
    case 1:
    case 3:
      return {
        label: currencyLabel || "PEN",
        alt: "Peru",
        imageUrl: "https://flagcdn.com/w40/pe.png",
      };
    case 2:
    case 4:
      return {
        label: currencyLabel || "USD",
        alt: "USA",
        imageUrl: "https://flagcdn.com/w40/us.png",
      };
    default:
      return {
        label: currencyLabel || String(currency ?? "-"),
        alt: t("Currency"),
        imageUrl: null,
      };
  }
};

const getPurchaseStateKind = (
  purchaseState: number,
  purchaseStateLabel?: string
) => {
  const normalizedLabel = String(purchaseStateLabel ?? "").trim().toLowerCase();

  if (
    normalizedLabel.includes("aprob") ||
    normalizedLabel.includes("approv")
  ) {
    return "approved" as const;
  }

  if (
    normalizedLabel.includes("rechaz") ||
    normalizedLabel.includes("reject")
  ) {
    return "rejected" as const;
  }

  if (normalizedLabel.includes("pend")) {
    return "pending" as const;
  }

  switch (purchaseState) {
    case 12:
      return "approved" as const;
    case 13:
      return "rejected" as const;
    case 11:
      return "pending" as const;
    default:
      return "other" as const;
  }
};

const getPurchaseStateMeta = (
  purchaseState: number,
  t: (key: string) => string,
  purchaseStateLabel?: string
) => {
  switch (getPurchaseStateKind(purchaseState, purchaseStateLabel)) {
    case "approved":
      return {
        kind: "approved" as const,
        label: purchaseStateLabel || t("Approved"),
        className:
          "badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        colorClass: "success" as const,
        icon: "ri-checkbox-circle-line",
      };
    case "rejected":
      return {
        kind: "rejected" as const,
        label: purchaseStateLabel || t("Rejected"),
        className:
          "badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        colorClass: "danger" as const,
        icon: "ri-close-circle-line",
      };
    case "pending":
      return {
        kind: "pending" as const,
        label: purchaseStateLabel || t("Pending"),
        className:
          "badge rounded-pill bg-warning-subtle text-warning border border-warning-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        colorClass: "warning" as const,
        icon: "ri-time-line",
      };
    default:
      return {
        kind: "other" as const,
        label: purchaseStateLabel || t("No status"),
        className:
          "badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        colorClass: "secondary" as const,
        icon: "ri-information-line",
      };
  }
};

const getPurchaseStateDescription = (
  purchaseState: number,
  t: (key: string) => string,
  purchaseStateLabel?: string
) => {
  switch (getPurchaseStateKind(purchaseState, purchaseStateLabel)) {
    case "approved":
      return t("Generates the PDF of the purchase order.");
    case "pending":
      return t("Leaves the order pending review.");
    case "rejected":
      return t("Rejects the purchase order.");
    default:
      return (
        purchaseStateLabel || t("Select the status to assign to this purchase order.")
      );
  }
};

const matchesSearchValue = (value: unknown, term: string): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => matchesSearchValue(item, term));
  }

  if (typeof value === "object") {
    return Object.values(value).some((item) => matchesSearchValue(item, term));
  }

  const normalizedValue = String(value).toLowerCase();
  if (normalizedValue.includes(term)) {
    return true;
  }

  if (typeof value === "string") {
    const parsedDate = moment(value, moment.ISO_8601, true);
    if (parsedDate.isValid()) {
      return parsedDate.format("DD/MM/YYYY").toLowerCase().includes(term);
    }
  }

  return false;
};

const PurchaseOrderDetails = () => {
  const { t, i18n } = useTranslation();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [documentsByAssociatedNo, setDocumentsByAssociatedNo] = useState<
    Record<string, Document>
  >({});
  const [supplierLookup, setSupplierLookup] = useState<Record<number, string>>({});
  const [supplierDetailsLookup, setSupplierDetailsLookup] = useState<
    Record<number, SupplierReference>
  >({});
  const [paymentConditionLookup, setPaymentConditionLookup] = useState<
    Record<number, string>
  >({});
  const [currencyLookup, setCurrencyLookup] = useState<Record<number, string>>({});
  const [storeLookup, setStoreLookup] = useState<Record<number, string>>({});
  const [purchaseStateLookup, setPurchaseStateLookup] = useState<
    Record<number, string>
  >({});
  const [purchaseStateOptions, setPurchaseStateOptions] = useState<CatalogItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [generatingOrderId, setGeneratingOrderId] = useState<number | null>(null);
  const [orderModal, setOrderModal] = useState<PurchaseOrder | null>(null);
  const [selectedState, setSelectedState] = useState<number | null>(null);
  const [confirmingState, setConfirmingState] = useState(false);
  const [storedPdfOrderIds, setStoredPdfOrderIds] = useState<Set<number>>(
    new Set()
  );
  const [pdfPreview, setPdfPreview] = useState<{
    fileName: string;
    previewUrl: string;
  } | null>(null);

  const sessionUser = getCurrentSessionUser();
  const numberLocale = getNumberLocale(i18n.language);
  const formatAmount = (value: string | number) =>
    Number(value || 0).toLocaleString(numberLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getOrderTotal = (details: PurchaseOrderDetail[]) =>
    details.reduce((sum, detail) => sum + Number(detail.total || 0), 0);

  const itemsPerPage = 10;
  const filteredPurchaseOrders = purchaseOrders.filter((purchaseOrder) => {
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
      return true;
    }

    const supplierLabel = (
      purchaseOrder.supplierLabel ||
      getLookupLabel(supplierLookup, purchaseOrder.supplierID)
    ).toLowerCase();
    const paymentConditionLabel = (
      purchaseOrder.paymentConditionLabel ||
      getLookupLabel(paymentConditionLookup, purchaseOrder.paymentCondition)
    ).toLowerCase();
    const currencyLabel = getCurrencyMeta(
      purchaseOrder.currency,
      t,
      purchaseOrder.currencyLabel || currencyLookup[purchaseOrder.currency]
    ).label.toLowerCase();
    const storeLabel = (
      purchaseOrder.storeLabel ||
      getLookupLabel(storeLookup, purchaseOrder.store)
    ).toLowerCase();
    const purchaseStateLabel = getPurchaseStateMeta(
      purchaseOrder.purchaseState,
      t,
      purchaseOrder.purchaseStateLabel ||
        purchaseStateLookup[purchaseOrder.purchaseState]
    ).label.toLowerCase();

    return (
      matchesSearchValue(purchaseOrder, term) ||
      supplierLabel.includes(term) ||
      paymentConditionLabel.includes(term) ||
      currencyLabel.includes(term) ||
      storeLabel.includes(term) ||
      purchaseStateLabel.includes(term)
    );
  });

  const totalPages = Math.ceil(filteredPurchaseOrders.length / itemsPerPage);
  const paginatedPurchaseOrders = filteredPurchaseOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const floatingAlerts: FloatingAlertItem[] = [];

  if (error) {
    floatingAlerts.push({
      id: "purchase-orders-error",
      type: "danger",
      message: error,
    });
  }

  if (actionError) {
    floatingAlerts.push({
      id: "purchase-orders-action-error",
      type: "danger",
      message: actionError,
    });
  }

  const modalStateOptions = (
    purchaseStateOptions.length > 0
      ? purchaseStateOptions
      : [
          { id: 11, descripcion: t("Pending") },
          { id: 12, descripcion: t("Approved") },
          { id: 13, descripcion: t("Rejected") },
        ]
  ).map((option) => {
    const stateMeta = getPurchaseStateMeta(option.id, t, option.descripcion);

    return {
      value: option.id,
      label: stateMeta.label,
      icon: stateMeta.icon,
      colorClass: stateMeta.colorClass,
      kind: stateMeta.kind,
      description: getPurchaseStateDescription(option.id, t, option.descripcion),
    };
  });
  const visibleModalStateOptions = modalStateOptions.filter(
    (option) => option.kind !== "pending"
  );
  const selectedStateMeta =
    selectedState !== null
      ? getPurchaseStateMeta(
          selectedState,
          t,
          purchaseStateLookup[selectedState] ||
            modalStateOptions.find((option) => option.value === selectedState)?.label
        )
      : null;

  const handleOpenOrderModal = (purchaseOrder: PurchaseOrder) => {
    const currentStateOption = visibleModalStateOptions.find(
      (option) => option.value === purchaseOrder.purchaseState
    );
    setSelectedState(currentStateOption?.value ?? null);
    setActionError(null);
    setOrderModal(purchaseOrder);
  };

  const handleCloseOrderModal = () => {
    if (confirmingState) return;
    setOrderModal(null);
  };

  const handleClosePdfPreview = () => {
    setPdfPreview((currentPreview) => {
      if (currentPreview?.previewUrl) {
        URL.revokeObjectURL(currentPreview.previewUrl);
      }

      return null;
    });
  };

  const handlePreviewOrderPdf = async (purchaseOrderID: number) => {
    const storedPdf = await getPurchaseOrderPdf(purchaseOrderID).catch(() => null);

    if (!storedPdf) {
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(storedPdf.blob);

    setPdfPreview((currentPreview) => {
      if (currentPreview?.previewUrl) {
        URL.revokeObjectURL(currentPreview.previewUrl);
      }

      return {
        fileName: storedPdf.fileName,
        previewUrl: nextPreviewUrl,
      };
    });
  };

  const handleRemoveFloatingAlert = (alertId: string | number) => {
    if (alertId === "purchase-orders-error") {
      setError(null);
      return;
    }

    if (alertId === "purchase-orders-action-error") {
      setActionError(null);
    }
  };

  const handleConfirmOrderState = async () => {
    if (!orderModal || selectedState === null) return;

    if (!sessionUser.id) {
      setActionError(
        t("Unable to identify the signed-in user to update this purchase order.")
      );
      return;
    }

    let statusUpdated = false;

    try {
      setConfirmingState(true);
      setActionError(null);

      const response = await fetch(buildApiUrl("purchase-orders/status/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderID: orderModal.purchaseOrderID,
          purchaseState: selectedState,
          updatedBy: sessionUser.id,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message || t("Unable to update purchase order status.")
        );
      }

      statusUpdated = true;

      const updatedOrder = {
        ...orderModal,
        purchaseState: selectedState,
        purchaseStateLabel:
          purchaseStateLookup[selectedState] ||
          modalStateOptions.find((option) => option.value === selectedState)?.label,
        updatedBy: sessionUser.id,
      };

      setPurchaseOrders((currentOrders) =>
        currentOrders.map((purchaseOrder) =>
          purchaseOrder.purchaseOrderID === updatedOrder.purchaseOrderID
            ? updatedOrder
            : purchaseOrder
        )
      );

      // TODO: llamar API para actualizar estado cuando esté disponible
      // await fetch(buildApiUrl(`purchase-orders/${orderModal.purchaseOrderID}/state`), {
      //   method: "PATCH",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ purchaseState: selectedState }),
      // });

      if (
        getPurchaseStateKind(
          selectedState,
          purchaseStateLookup[selectedState]
        ) === "approved"
      ) {
        const relatedDocument =
          documentsByAssociatedNo[orderModal.documentAssociatedNo] ?? null;

        if (!relatedDocument?.documentid) {
          throw new Error(
            t("Unable to identify the related invoice for this purchase order.")
          );
        }

        setGeneratingOrderId(orderModal.purchaseOrderID);
        setOrderModal(null);

        const generatedPdf = await generatePurchaseOrderPdf({
          purchaseOrder: updatedOrder,
          relatedDocument,
          supplier: supplierDetailsLookup[orderModal.supplierID] ?? null,
          paymentConditionLabel:
            orderModal.paymentConditionLabel ||
            paymentConditionLookup[orderModal.paymentCondition] ||
            "",
          currencyLabel:
            getCurrencyMeta(
              orderModal.currency,
              t,
              orderModal.currencyLabel || currencyLookup[orderModal.currency]
            ).label ?? "",
          storeLabel:
            orderModal.storeLabel || storeLookup[orderModal.store] || "",
          documentAssociatedTypeLabel:
            orderModal.documentAssociatedTypeLabel || "",
          executedByName:
            orderModal.createdBy === sessionUser.id ? sessionUser.name : "",
          numberLocale,
        });

        const orderPdfFile = createPdfFile(
          generatedPdf.blob,
          generatedPdf.fileName
        );
        const invoicePdfFile = await fetchRelatedInvoicePdfFile(relatedDocument);
        const expedientePayload = new FormData();

        expedientePayload.append("facturaid", String(relatedDocument.documentid));
        expedientePayload.append(
          "ordencompraid",
          String(updatedOrder.purchaseOrderID)
        );
        expedientePayload.append("createdby", String(sessionUser.id));
        expedientePayload.append("orden_file", orderPdfFile);

        if (invoicePdfFile) {
          expedientePayload.append("factura_file", invoicePdfFile);
        }

        expedientePayload.append(
          "expediente_documentos",
          buildExpedientDocumentsPayload(sessionUser.id, !!invoicePdfFile)
        );

        const expedienteResponse = await fetch(buildApiUrl("expedientes/"), {
          method: "POST",
          body: expedientePayload,
        });
        const expedienteData = await expedienteResponse.json().catch(() => null);

        if (!expedienteResponse.ok || expedienteData?.success === false) {
          throw new Error(
            expedienteData?.message ||
              t("Unable to send the purchase order PDF to expedients.")
          );
        }

        try {
          await savePurchaseOrderPdf({
            purchaseOrderID: updatedOrder.purchaseOrderID,
            fileName: generatedPdf.fileName,
            blob: generatedPdf.blob,
            createdAt: new Date().toISOString(),
          });
          setStoredPdfOrderIds((currentIds) => {
            const nextIds = new Set(currentIds);
            nextIds.add(updatedOrder.purchaseOrderID);
            return nextIds;
          });
        } catch {
          // The expedient upload already succeeded; local preview storage is optional.
        }
      } else {
        setOrderModal(null);
      }
    } catch (generateError: any) {
      setActionError(
        generateError?.message ||
          t("Unable to update purchase order status.")
      );

      if (statusUpdated) {
        setOrderModal(null);
      }
    } finally {
      setGeneratingOrderId(null);
      setConfirmingState(false);
    }
  };

  useEffect(() => {
    document.title = `${t("Purchase Order Details")} | Docuware`;

    const fetchPurchaseOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        setActionError(null);

        const [
          purchaseOrdersResponse,
          documentsResponse,
          suppliersResponse,
          paymentConditionResponse,
          currencyResponse,
          storeResponse,
          purchaseStateResponse,
          storedPdfIds,
        ] = await Promise.all([
          fetch(buildApiUrl("purchase-orders/")),
          fetch(buildApiUrl("documents")),
          fetch(buildApiUrl("proveedores")),
          fetch(buildApiUrl("catalogos/?tipo_catalogo=PAYMENT_CONDITION")),
          fetch(buildApiUrl("catalogos/?tipo_catalogo=MONEY")),
          fetch(buildApiUrl("catalogos/?tipo_catalogo=STORE_WAREHOUSE")),
          fetch(buildApiUrl("catalogos/?tipo_catalogo=STATE_OF_PURCHASE_ORDER")),
          listStoredPurchaseOrderPdfIds().catch(() => []),
        ]);
        const purchaseOrdersData = await purchaseOrdersResponse
          .json()
          .catch(() => null);

        if (
          !purchaseOrdersResponse.ok ||
          !purchaseOrdersData?.success ||
          !Array.isArray(purchaseOrdersData?.data)
        ) {
          throw new Error(
            purchaseOrdersData?.message || t("Unable to get purchase orders.")
          );
        }

        setPurchaseOrders(
          (purchaseOrdersData.data as PurchaseOrderApiItem[]).map(mapPurchaseOrder)
        );
        setStoredPdfOrderIds(new Set(storedPdfIds));

        const documentsData = await documentsResponse.json().catch(() => null);
        const suppliersData = await suppliersResponse.json().catch(() => null);
        const paymentConditionData = await paymentConditionResponse
          .json()
          .catch(() => null);
        const currencyData = await currencyResponse.json().catch(() => null);
        const storeData = await storeResponse.json().catch(() => null);
        const purchaseStateData = await purchaseStateResponse
          .json()
          .catch(() => null);

        if (
          documentsResponse.ok &&
          documentsData?.success &&
          Array.isArray(documentsData?.data)
        ) {
          const indexedDocuments = documentsData.data.reduce(
            (acc: Record<string, Document>, document: Document) => {
              const associatedNo = getDocumentAssociatedNo(document);

              if (associatedNo) {
                acc[associatedNo] = document;
              }

              return acc;
            },
            {}
          );

          setDocumentsByAssociatedNo(indexedDocuments);
        } else {
          setDocumentsByAssociatedNo({});
        }

        if (
          suppliersResponse.ok &&
          suppliersData?.success &&
          Array.isArray(suppliersData?.data)
        ) {
          setSupplierLookup(mapSupplierLookup(suppliersData.data));
          setSupplierDetailsLookup(mapSupplierDetailsLookup(suppliersData.data));
        } else {
          setSupplierLookup({});
          setSupplierDetailsLookup({});
        }

        if (
          paymentConditionResponse.ok &&
          paymentConditionData?.success &&
          Array.isArray(paymentConditionData?.data)
        ) {
          setPaymentConditionLookup(mapCatalogLookup(paymentConditionData.data));
        } else {
          setPaymentConditionLookup({});
        }

        if (
          currencyResponse.ok &&
          currencyData?.success &&
          Array.isArray(currencyData?.data)
        ) {
          setCurrencyLookup(mapCatalogLookup(currencyData.data));
        } else {
          setCurrencyLookup({});
        }

        if (
          storeResponse.ok &&
          storeData?.success &&
          Array.isArray(storeData?.data)
        ) {
          setStoreLookup(mapCatalogLookup(storeData.data));
        } else {
          setStoreLookup({});
        }

        if (
          purchaseStateResponse.ok &&
          purchaseStateData?.success &&
          Array.isArray(purchaseStateData?.data)
        ) {
          setPurchaseStateLookup(mapCatalogLookup(purchaseStateData.data));
          setPurchaseStateOptions(purchaseStateData.data);
        } else {
          setPurchaseStateLookup({});
          setPurchaseStateOptions([]);
        }
      } catch (fetchError: any) {
        setError(
          fetchError?.message ||
            t("An error occurred while loading purchase order details.")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseOrders();
  }, [t]);

  useEffect(
    () => () => {
      if (pdfPreview?.previewUrl) {
        URL.revokeObjectURL(pdfPreview.previewUrl);
      }
    },
    [pdfPreview]
  );

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <FloatingAlerts
            alerts={floatingAlerts}
            onRemove={handleRemoveFloatingAlert}
          />
          <BreadCrumb
            title="Purchase Order Details"
            pageTitle="Purchase Orders"
          />

          <Card className="border-0 shadow-sm">
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                  <h5 className="mb-1">{t("Purchase Order List")}</h5>
                  <p className="text-muted mb-0">
                    {t("Latest registered orders.")}
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <InputGroup style={{ maxWidth: "280px" }}>
                    <InputGroupText>
                      <i className="ri-search-line" />
                    </InputGroupText>
                    <Input
                      placeholder={t("Search...")}
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </InputGroup>
                </div>
              </div>

              {loading && (
                <div className="text-center my-5">
                  <Spinner color="primary" />
                </div>
              )}

              {!loading && !error && (
                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>{t("Order Number")}</th>
                        <th>{t("Supplier ID")}</th>
                        <th>{t("Associated Doc.")}</th>
                        <th>{t("Payment Cond.")}</th>
                        <th>{t("Currency")}</th>
                        <th>{t("Guide")}</th>
                        <th>{t("Warehouse")}</th>
                        <th>{t("Status")}</th>
                        <th>{t("Created by")}</th>
                        <th>{t("Date")}</th>
                        <th className="text-center">{t("Items")}</th>
                        <th className="text-end">{t("Order Total")}</th>
                        <th
                          className="text-center"
                          style={{ minWidth: "245px", whiteSpace: "nowrap" }}
                        >
                          {t("Actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPurchaseOrders.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="text-center">
                            {t("No registered purchase orders were found.")}
                          </td>
                        </tr>
                      ) : (
                        paginatedPurchaseOrders.map((purchaseOrder) => {
                          const currency = getCurrencyMeta(
                            purchaseOrder.currency,
                            t,
                            purchaseOrder.currencyLabel ||
                              currencyLookup[purchaseOrder.currency]
                          );
                          const purchaseState = getPurchaseStateMeta(
                            purchaseOrder.purchaseState,
                            t,
                            purchaseOrder.purchaseStateLabel ||
                              purchaseStateLookup[purchaseOrder.purchaseState]
                          );
                          const supplierLabel =
                            purchaseOrder.supplierLabel ||
                            getLookupLabel(supplierLookup, purchaseOrder.supplierID);
                          const paymentConditionLabel =
                            purchaseOrder.paymentConditionLabel ||
                            getLookupLabel(
                              paymentConditionLookup,
                              purchaseOrder.paymentCondition
                            );
                          const storeLabel =
                            purchaseOrder.storeLabel ||
                            getLookupLabel(storeLookup, purchaseOrder.store);
                          const isActionBlocked =
                            purchaseState.kind === "approved" ||
                            purchaseState.kind === "rejected";
                          const hasStoredPdf = storedPdfOrderIds.has(
                            purchaseOrder.purchaseOrderID
                          );

                          return (
                            <tr key={purchaseOrder.purchaseOrderID}>
                              <td>#{purchaseOrder.purchaseOrderID}</td>
                              <td>{purchaseOrder.orderNo}</td>
                              <td>{supplierLabel}</td>
                              <td>{purchaseOrder.documentAssociatedNo}</td>
                              <td>{paymentConditionLabel}</td>
                              <td>
                                <div className="d-inline-flex align-items-center gap-2 px-2 py-1 rounded-pill bg-light border">
                                  {currency.imageUrl && (
                                    <img
                                      src={currency.imageUrl}
                                      alt={currency.alt}
                                      width={20}
                                      height={15}
                                      className="rounded-1 flex-shrink-0"
                                    />
                                  )}
                                  <span className="fw-semibold text-body">
                                    {currency.label}
                                  </span>
                                </div>
                              </td>
                              <td>{purchaseOrder.guideNo}</td>
                              <td>{storeLabel}</td>
                              <td>
                                <span className={purchaseState.className}>
                                  <i className={purchaseState.icon} />
                                  <span>{purchaseState.label}</span>
                                </span>
                              </td>
                              <td>{purchaseOrder.createdBy}</td>
                              <td>
                                {moment(purchaseOrder.createAt).format(
                                  "DD/MM/YYYY"
                                )}
                              </td>
                              <td className="text-center">
                                {purchaseOrder.details.length}
                              </td>
                              <td className="text-end fw-semibold">
                                {formatAmount(
                                  getOrderTotal(purchaseOrder.details)
                                )}
                              </td>
                              <td
                                className="text-center"
                                style={{ whiteSpace: "nowrap" }}
                              >
                                <div className="d-inline-flex align-items-center gap-2 flex-nowrap justify-content-center">
                                  <Button
                                    color="info"
                                    size="sm"
                                    outline
                                    className="text-nowrap"
                                    disabled={!hasStoredPdf}
                                    onClick={() =>
                                      handlePreviewOrderPdf(
                                        purchaseOrder.purchaseOrderID
                                      )
                                    }
                                  >
                                    <i className="ri-eye-line me-1" />
                                    {t("View")}
                                  </Button>
                                  <Button
                                    color="primary"
                                    size="sm"
                                    outline
                                    className="text-nowrap"
                                    disabled={
                                      generatingOrderId ===
                                        purchaseOrder.purchaseOrderID ||
                                      isActionBlocked
                                    }
                                    onClick={() =>
                                      handleOpenOrderModal(purchaseOrder)
                                    }
                                  >
                                    {generatingOrderId ===
                                    purchaseOrder.purchaseOrderID ? (
                                      <>
                                        <Spinner size="sm" className="me-2" />
                                        {t("Generating...")}
                                      </>
                                    ) : (
                                      <>
                                        <i className="ri-file-text-line me-1" />
                                        {t("Generate Order C.")}
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </Table>
                </div>
              )}

              {!loading && !error && totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <PaginationItem disabled={currentPage === 1}>
                      <PaginationLink
                        previous
                        onClick={() =>
                          setCurrentPage((page) => Math.max(page - 1, 1))
                        }
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, index) => (
                      <PaginationItem
                        key={index}
                        active={currentPage === index + 1}
                      >
                        <PaginationLink onClick={() => setCurrentPage(index + 1)}>
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem disabled={currentPage === totalPages}>
                      <PaginationLink
                        next
                        onClick={() =>
                          setCurrentPage((page) =>
                            Math.min(page + 1, totalPages)
                          )
                        }
                      />
                    </PaginationItem>
                  </Pagination>
                </div>
              )}
            </CardBody>
          </Card>
        </Container>
      </div>
      <PurchaseOrderPdfPreviewModal
        isOpen={!!pdfPreview}
        fileName={pdfPreview?.fileName || ""}
        previewUrl={pdfPreview?.previewUrl || ""}
        onClose={handleClosePdfPreview}
      />
      <Modal isOpen={!!orderModal} toggle={handleCloseOrderModal} centered size="sm">
        <ModalHeader toggle={handleCloseOrderModal} className="border-bottom-0 pb-0">
          <span className="fs-6 fw-semibold">{t("Generate Order C.")}</span>
          {orderModal && (
            <div className="text-muted fw-normal" style={{ fontSize: "0.75rem" }}>
              {orderModal.orderNo}
            </div>
          )}
        </ModalHeader>

        <ModalBody className="pt-2 pb-3">
          <p className="text-muted mb-3" style={{ fontSize: "0.82rem" }}>
            {t("Select the status to assign to this purchase order.")}
          </p>

          <div className="d-flex flex-column gap-2">
            {visibleModalStateOptions.map((option) => {
              const isSelected = selectedState === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedState(option.value)}
                  className={`d-flex align-items-center gap-3 rounded-3 border p-2 text-start bg-transparent w-100 transition-all ${
                    isSelected
                      ? `border-${option.colorClass} bg-${option.colorClass}-subtle`
                      : "border-light"
                  }`}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    className={`d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 ${
                      isSelected
                        ? `bg-${option.colorClass} text-white`
                        : `text-${option.colorClass} bg-${option.colorClass}-subtle`
                    }`}
                    style={{ width: 36, height: 36 }}
                  >
                    <i className={`${option.icon} fs-5`} />
                  </div>
                  <div className="flex-grow-1">
                    <div className={`fw-semibold text-${option.colorClass}`} style={{ fontSize: "0.85rem" }}>
                      {option.label}
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                      {option.description}
                    </div>
                  </div>
                  {isSelected && (
                    <i className={`ri-check-line text-${option.colorClass} fs-5 flex-shrink-0`} />
                  )}
                </button>
              );
            })}
          </div>
        </ModalBody>

        <ModalFooter className="border-top-0 pt-0 gap-2">
          <Button
            color="light"
            size="sm"
            onClick={handleCloseOrderModal}
            disabled={confirmingState}
          >
            {t("Cancel")}
          </Button>
          <Button
            color={selectedStateMeta?.colorClass || "primary"}
            size="sm"
            onClick={handleConfirmOrderState}
            disabled={confirmingState || selectedState === null}
          >
            {confirmingState ? (
              <>
                <Spinner size="sm" className="me-1" />
                {t("Processing...")}
              </>
            ) : selectedStateMeta?.kind === "approved" ? (
              <>
                <i className="ri-file-download-line me-1" />
                {t("Approve & Generate")}
              </>
            ) : (
              t("Confirm")
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default PurchaseOrderDetails;
