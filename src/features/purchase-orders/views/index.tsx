import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import Select from "react-select";
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
  Spinner,
  Table,
} from "reactstrap";

import AppPagination from "../../../components/common/Pagination";
import BreadCrumb from "../../../components/common/BreadCrumb";
import FloatingAlerts, {
  FloatingAlertItem,
} from "../../../components/common/FloatingAlerts";
import TableActionsMenu from "../../../components/common/TableActionsMenu";
import { API_BASE_URL, buildApiUrl } from "../../../helpers/api-url";
import { getNumberLocale } from "../../../common/locale";
import { downloadBlob } from "../../../helpers/download-blob";
import { Document } from "../../documents/types/list.types";
import { getPreviewUrl } from "../../documents/services/document.utils";
import { fetchSigners } from "../../documents/services/orderC.service";
import type { SelectOption } from "../../documents/types/orderC.types";
import { generatePurchaseOrderPdf } from "../services/purchaseOrderPdf";
import { fetchPurchaseOrderApprovals } from "../services/purchaseOrderApprovals";
import { fetchPurchaseOrderInvoiceDetails } from "../services/purchaseOrderInvoiceDetails";
import { intelligentSearch } from "../../../helpers/search-utils";
import OrderDocumentItem from "../components/OrderDocumentItem";
import OrderDocumentUpload from "../components/OrderDocumentUpload";
import LogoDocuware from "../../../assets/images/LogoDocuware.png";
import "./PurchaseOrderDetails.css";
import "../../expedients/views/Expedients.css";

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

interface OrderAttachment {
  createat?: string;
  expedientedocid: number;
  tipodocumentoid: number;
  filename: string;
  file_url?: string;
  filepath: string;
  estado: boolean;
}

type ApprovalStatus = "PENDING" | "JR_SIGNED" | "APPROVED";

interface PurchaseOrder {
  isCancelled: boolean;
  cancellationReason?: string;
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
  tipoorden: string | null;
  signature: number | null;
  signature2: number | null;
  approvalStatus: ApprovalStatus;
  hasSeniorApproval: boolean;
  canBeApprovedBy: boolean;
  requiredby?: string | null;
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
  isCancelled?: boolean;
  cancellationReason?: string;
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
  tipoorden?: string | null;
  signature?: number | null;
  signature2?: number | null;
  approvalStatus: ApprovalStatus;
  hasSeniorApproval: boolean;
  canBeApprovedBy: boolean;
  requiredby?: string | null;
  createdBy: number;
  createAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
  details: PurchaseOrderDetail[];
}

interface UserApiItem {
  userID: number;
  userName?: string;
  fullName?: string;
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

const isGoogleDriveUrl = (value: string) =>
  /(^https?:\/\/)?(www\.)?drive\.google\.com\//i.test(String(value || "").trim());

const fetchRelatedInvoicePdfFile = async (
  document: Document
): Promise<File | null> => {
  const publicFileUrl = String(document.file_url || "").trim();
  const directDocumentUrl = String(document.documenturl || "").trim();
  const candidateUrls = [publicFileUrl, directDocumentUrl]
    .filter(Boolean)
    .filter((url, index, urls) => urls.indexOf(url) === index)
    .filter((url) => !isGoogleDriveUrl(url));

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

const getDocumentSourceUrl = (document?: Document | null) =>
  String(document?.file_url || document?.documenturl || "").trim();

const getDocumentPreviewUrl = (document?: Document | null) => {
  const sourceUrl = getDocumentSourceUrl(document);
  return sourceUrl ? getPreviewUrl(sourceUrl) : "";
};

const parseAmountNumber = (value: unknown) => {
  const parsedValue = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(parsedValue) ? parsedValue : null;
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

const mapUserLookup = (items: UserApiItem[]) =>
  items.reduce((acc: Record<number, string>, item) => {
    const label =
      String(item.fullName ?? "").trim() ||
      String(item.userName ?? "").trim() ||
      String(item.userID);

    acc[item.userID] = label;
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
  isCancelled: item.isCancelled === true,
  cancellationReason: item.cancellationReason,
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
  tipoorden: item.tipoorden ?? null,
  signature:
    typeof item.signature === "number" && Number.isFinite(item.signature)
      ? item.signature
      : null,
  signature2:
    typeof item.signature2 === "number" && Number.isFinite(item.signature2)
      ? item.signature2
      : null,
  requiredby: String(item.requiredby ?? "").trim() || null,
  approvalStatus: item.approvalStatus,
  hasSeniorApproval: item.hasSeniorApproval === true,
  canBeApprovedBy: item.canBeApprovedBy === true,
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
      return { id: null as number | null, name: "", approvalRole: "" };
    }

    const parsedUser = JSON.parse(authUser);
    const sessionData = parsedUser?.data || {};
    const parsedId = Number(
      sessionData?.userID ?? sessionData?.userid ?? sessionData?.user_id ?? sessionData?.id ?? ""
    );

    return {
      id: Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null,
      approvalRole: String(sessionData.approvalRole ?? sessionData.purchase_approval_role ?? sessionData.permissions?.purchaseApprovalRole ?? "").toUpperCase(),
      name:
        sessionData?.fullname ||
        sessionData?.first_name ||
        sessionData?.username ||
        sessionData?.email ||
        "",
    };
  } catch {
    return { id: null as number | null, name: "", approvalRole: "" };
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
    normalizedLabel.includes("pagad") ||
    normalizedLabel.includes("paid")
  ) {
    return "paid" as const;
  }

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
    case "paid":
      return {
        kind: "paid" as const,
        label: purchaseStateLabel || t("Paid"),
        className:
          "badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        colorClass: "primary" as const,
        icon: "ri-secure-payment-line",
      };
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
  purchaseStateLabel?: string,
  isJunior?: boolean
) => {
  switch (getPurchaseStateKind(purchaseState, purchaseStateLabel)) {
    case "paid":
      return t("Marks the purchase order as paid.");
    case "approved":
      return isJunior
        ? t("Validates the order and forwards it for Senior approval.")
        : t("Generates the PDF of the purchase order.");
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
  const [userLookup, setUserLookup] = useState<Record<number, string>>({});
  const [purchaseStateOptions, setPurchaseStateOptions] = useState<CatalogItem[]>(
    []
  );
  const [signerOptions, setSignerOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSigners, setLoadingSigners] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [purchaseStateFilter, setPurchaseStateFilter] = useState("all");
  const [signerFilter, setSignerFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [generatingOrderId, setGeneratingOrderId] = useState<number | null>(null);
  const [orderModal, setOrderModal] = useState<PurchaseOrder | null>(null);
  const [selectedState, setSelectedState] = useState<number | null>(null);
  const [attachmentOrder, setAttachmentOrder] = useState<PurchaseOrder | null>(null);
  const [attachments, setAttachments] = useState<OrderAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const uploadingAttachmentRef = useRef(false);
  const attachmentRequest = useRef(0);
  const attachmentDrawerRef = useRef<HTMLElement | null>(null);
  const [confirmingState, setConfirmingState] = useState(false);
  const [cancelOrder, setCancelOrder] = useState<PurchaseOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [orderPreviewPdfUrl, setOrderPreviewPdfUrl] = useState<string>("");
  const [loadingOrderPreviewPdf, setLoadingOrderPreviewPdf] = useState(false);
  const orderPreviewBlobUrlRef = useRef<string>("");

  useEffect(() => {
    return () => {
      if (orderPreviewBlobUrlRef.current) {
        URL.revokeObjectURL(orderPreviewBlobUrlRef.current);
        orderPreviewBlobUrlRef.current = "";
      }
    };
  }, []);

  const sessionUser = getCurrentSessionUser();
  const isJuniorApprover =
    sessionUser.approvalRole === "JR" || sessionUser.approvalRole === "JUNIOR";
  const numberLocale = getNumberLocale(i18n.language);
  const formatAmount = (value: string | number) =>
    Number(value || 0).toLocaleString(numberLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getOrderDetailsTotal = (details: PurchaseOrderDetail[]) =>
    details.reduce((sum, detail) => sum + Number(detail.total || 0), 0);

  const getPurchaseOrderDisplayTotal = (purchaseOrder: PurchaseOrder) => {
    const relatedDocument =
      documentsByAssociatedNo[purchaseOrder.documentAssociatedNo] ?? null;
    const relatedDocumentTotal = parseAmountNumber(relatedDocument?.totalamount);

    if (relatedDocumentTotal !== null) {
      return relatedDocumentTotal;
    }

    return getOrderDetailsTotal(purchaseOrder.details);
  };

  const itemsPerPage = 10;
  const purchaseStateFilterOptions = useMemo(() => {
    const sourceOptions =
      purchaseStateOptions.length > 0
        ? purchaseStateOptions
        : Array.from(
          new Map(
            purchaseOrders.map((purchaseOrder) => [
              purchaseOrder.purchaseState,
              {
                id: purchaseOrder.purchaseState,
                descripcion:
                  purchaseOrder.purchaseStateLabel ||
                  purchaseStateLookup[purchaseOrder.purchaseState] ||
                  String(purchaseOrder.purchaseState),
              },
            ])
          ).values()
        );

    return sourceOptions.map((option) => ({
      value: String(option.id),
      label:
        getPurchaseStateMeta(option.id, t, option.descripcion).label ||
        option.descripcion,
    })).filter((option) => !option.label.toLowerCase().includes("temporal") && !option.label.toLowerCase().includes("temproral"));
  }, [purchaseOrders, purchaseStateLookup, purchaseStateOptions, t]);

  const signerFilterOptions = useMemo(() => {
    const availableSignerIds = new Set(
      purchaseOrders
        .map((purchaseOrder) => purchaseOrder.signature)
        .filter(
          (signature): signature is number =>
            typeof signature === "number" && Number.isFinite(signature)
        )
        .map((signature) => String(signature))
    );

    return signerOptions.filter((option) => availableSignerIds.has(option.value));
  }, [purchaseOrders, signerOptions]);

  const selectedSignerFilterOption =
    signerFilterOptions.find((option) => option.value === signerFilter) ?? null;

  const filteredPurchaseOrders = useMemo(
    () =>
      purchaseOrders.filter((purchaseOrder) => {
        const purchaseStateLabel =
          purchaseOrder.purchaseStateLabel ||
          purchaseStateLookup[purchaseOrder.purchaseState] ||
          "";
        const signerLabel =
          typeof purchaseOrder.signature === "number"
            ? userLookup[purchaseOrder.signature] || String(purchaseOrder.signature)
            : "";

        if (
          purchaseStateFilter !== "all" &&
          String(purchaseOrder.purchaseState) !== purchaseStateFilter
        ) {
          return false;
        }

        if (
          signerFilter !== "all" &&
          String(purchaseOrder.signature ?? "") !== signerFilter
        ) {
          return false;
        }

        if (
          orderTypeFilter !== "all" &&
          String(purchaseOrder.tipoorden ?? "").trim() !== orderTypeFilter
        ) {
          return false;
        }

        return intelligentSearch(
          {
            ...purchaseOrder,
            purchaseStateLabel,
            signerLabel,
            createdByLabel:
              userLookup[purchaseOrder.createdBy] || String(purchaseOrder.createdBy),
          },
          searchTerm
        );
      }),
    [
      purchaseOrders,
      purchaseStateFilter,
      purchaseStateLookup,
      searchTerm,
      signerFilter,
      orderTypeFilter,
      userLookup,
    ]
  );

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

  if (actionSuccess) {
    floatingAlerts.push({
      id: "purchase-orders-action-success",
      type: "success",
      message: actionSuccess,
      autoDismissMs: 5000,
    });
  }

  if (generatingOrderId !== null) {
    const generatingOrder =
      purchaseOrders.find(
        (purchaseOrder) => purchaseOrder.purchaseOrderID === generatingOrderId
      ) ?? null;

    floatingAlerts.push({
      id: "purchase-orders-action-loading",
      type: "info",
      dismissible: false,
      message: (
        <span className="d-inline-flex align-items-center gap-2">
          <Spinner size="sm" />
          <span>
            {t("Generating expedient for order {{orderNo}}...", {
              orderNo:
                generatingOrder?.orderNo || `#${String(generatingOrderId)}`,
            })}
          </span>
        </span>
      ),
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
      description: getPurchaseStateDescription(
        option.id,
        t,
        option.descripcion,
        isJuniorApprover
      ),
    };
  });
  const getAvailableModalStateOptions = (
    currentState: number,
    currentStateLabel?: string,
    order?: PurchaseOrder
  ) => {
    if (sessionUser.approvalRole === "NONE") return [];
    if (order?.isCancelled) return [];
    if (isJuniorApprover && order?.approvalStatus === "JR_SIGNED") return [];
    if (order && (!order.canBeApprovedBy || order.hasSeniorApproval || order.approvalStatus === "APPROVED")) {
      return [];
    }
    const currentStateKind = getPurchaseStateKind(currentState, currentStateLabel);

    return modalStateOptions.filter((option) => {
      const normalizedLabel = option.label.toLowerCase();
      const isTemporaryState =
        normalizedLabel.includes("temporal") ||
        normalizedLabel.includes("temproral");

      if (isTemporaryState) {
        return false;
      }

      if (order?.canBeApprovedBy && option.kind === "approved") {
        return true;
      }

      if (currentStateKind === "pending") {
        return option.kind === "approved" || option.kind === "rejected";
      }

      if (currentStateKind === "approved") {
        return option.kind === "paid";
      }

      return false;
    });
  };
  const visibleModalStateOptions = orderModal
    ? getAvailableModalStateOptions(orderModal.purchaseState, orderModal.purchaseStateLabel, orderModal)
    : [];
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
    const availableOptions = getAvailableModalStateOptions(
      purchaseOrder.purchaseState,
      purchaseOrder.purchaseStateLabel,
      purchaseOrder
    );

    if (availableOptions.length === 0) {
      return;
    }

    setSelectedState(availableOptions.length === 1 ? availableOptions[0].value : null);
    setActionError(null);
    setActionSuccess(null);
    setOrderModal(purchaseOrder);
  };

  const buildPurchaseOrderPdfBlob = async (order: PurchaseOrder) => {
    const relatedDocument =
      documentsByAssociatedNo[order.documentAssociatedNo] ?? null;

    const isApproved = Boolean(
      order.hasSeniorApproval && order.approvalStatus === "APPROVED"
    );

    const [approvals, invoiceDetails] = await Promise.all([
      fetchPurchaseOrderApprovals(order.purchaseOrderID),
      relatedDocument
        ? fetchPurchaseOrderInvoiceDetails(relatedDocument).catch(() => [])
        : Promise.resolve([]),
    ]);

    const jrApproval = approvals
      .filter(
        (a) =>
          (!a.purchaseOrderID || a.purchaseOrderID === order.purchaseOrderID) &&
          a.approvalLevel === "JR"
      )
      .sort(
        (a, b) => moment(a.signedAt).valueOf() - moment(b.signedAt).valueOf()
      )[0];

    const seniorApproval = approvals
      .filter(
        (a) =>
          (!a.purchaseOrderID || a.purchaseOrderID === order.purchaseOrderID) &&
          a.approvalLevel === "SENIOR"
      )
      .sort(
        (a, b) => moment(a.signedAt).valueOf() - moment(b.signedAt).valueOf()
      )[0];

    const solicitanteName =
      order.requiredby ||
      userLookup[order.createdBy] ||
      (order.createdBy === sessionUser.id ? sessionUser.name : "");

    const juniorSignerName =
      jrApproval?.user?.fullName ||
      jrApproval?.user?.userName ||
      (typeof order.signature === "number"
        ? userLookup[order.signature]
        : "");

    const seniorSignerName =
      seniorApproval?.user?.fullName ||
      seniorApproval?.user?.userName ||
      (typeof order.signature2 === "number"
        ? userLookup[order.signature2]
        : "");

    const generatedPdf = await generatePurchaseOrderPdf({
      approvals,
      invoiceDetails,
      purchaseOrder: order,
      relatedDocument,
      supplier: supplierDetailsLookup[order.supplierID] ?? null,
      paymentConditionLabel:
        order.paymentConditionLabel ||
        paymentConditionLookup[order.paymentCondition] ||
        "",
      currencyLabel:
        getCurrencyMeta(
          order.currency,
          t,
          order.currencyLabel || currencyLookup[order.currency]
        ).label ?? "",
      storeLabel:
        order.storeLabel || storeLookup[order.store] || "",
      documentAssociatedTypeLabel:
        order.documentAssociatedTypeLabel || "",
      requiredByName: solicitanteName,
      solicitanteName,
      juniorSignerName,
      seniorSignerName,
      executedByName: seniorSignerName,
      userLookup,
      numberLocale,
      isAuditApproved: isApproved,
    });

    return {
      url: URL.createObjectURL(generatedPdf.blob),
      fileName: generatedPdf.fileName,
      blob: generatedPdf.blob,
    };
  };

  const handleOpenAttachments = async (order: PurchaseOrder) => {
    if (uploadingAttachmentRef.current) return;
    setShowDocumentUpload(false);
    const request = ++attachmentRequest.current;
    setAttachmentOrder(order);
    setAttachments([]);
    setAttachmentError("");
    setLoadingAttachments(true);
    setLoadingOrderPreviewPdf(true);

    if (orderPreviewBlobUrlRef.current) {
      URL.revokeObjectURL(orderPreviewBlobUrlRef.current);
      orderPreviewBlobUrlRef.current = "";
    }
    setOrderPreviewPdfUrl("");

    const expedientesPromise = fetch(buildApiUrl("expedientes/"))
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.success === false) {
          throw new Error("No fue posible obtener los documentos del expediente.");
        }
        return payload?.data ?? payload;
      })
      .catch((err) => {
        console.error("Error fetching expedients:", err);
        return null;
      });

    const previewPdfPromise = buildPurchaseOrderPdfBlob(order)
      .then((res) => res.url)
      .catch((err) => {
        console.error("Error generating purchase order PDF preview:", err);
        return "";
      });

    try {
      const [expedients, previewBlobUrl] = await Promise.all([
        expedientesPromise,
        previewPdfPromise,
      ]);

      if (request !== attachmentRequest.current) {
        if (previewBlobUrl) {
          URL.revokeObjectURL(previewBlobUrl);
        }
        return;
      }

      if (previewBlobUrl) {
        orderPreviewBlobUrlRef.current = previewBlobUrl;
        setOrderPreviewPdfUrl(previewBlobUrl);
      }

      if (Array.isArray(expedients)) {
        const files: OrderAttachment[] = expedients
          .filter(
            (expedient) =>
              Number(
                expedient.ordencompraid ??
                  expedient.ordencompra?.purchaseOrderID
              ) === order.purchaseOrderID
          )
          .flatMap((expedient) => expedient.expediente_documentos ?? []);

        setAttachments(files.filter((file) => file.estado !== false));
      }
    } catch (error) {
      if (request === attachmentRequest.current) {
        setAttachmentError(
          error instanceof Error
            ? error.message
            : "No fue posible obtener los documentos."
        );
      }
    } finally {
      if (request === attachmentRequest.current) {
        setLoadingAttachments(false);
        setLoadingOrderPreviewPdf(false);
      }
    }
  };

  const closeAttachments = useCallback(() => {
    if (uploadingAttachmentRef.current) return;
    setShowDocumentUpload(false);
    attachmentRequest.current += 1;
    if (orderPreviewBlobUrlRef.current) {
      URL.revokeObjectURL(orderPreviewBlobUrlRef.current);
      orderPreviewBlobUrlRef.current = "";
    }
    setOrderPreviewPdfUrl("");
    setLoadingOrderPreviewPdf(false);
    setAttachmentOrder(null);
  }, []);

  const handleCancelOrder = async () => {
    if (!cancelOrder || !cancelReason.trim() || sessionUser.approvalRole !== "SENIOR") return;
    setCancellingOrder(true);
    setCancelError("");
    try {
      const response = await fetch(buildApiUrl("purchase-orders/cancel/"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseOrderID: cancelOrder.purchaseOrderID,
          userID: sessionUser.id, updatedBy: sessionUser.id, notes: cancelReason.trim() }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success || !result.data) {
        throw new Error(result?.message || "No fue posible anular la orden.");
      }
      const updatedOrder = mapPurchaseOrder(result.data);
      setPurchaseOrders((orders) => orders.map((order) => order.purchaseOrderID === updatedOrder.purchaseOrderID ? updatedOrder : order));
      setCancelOrder(null);
      setActionSuccess("Orden anulada. El documento está disponible para una nueva OC/OS.");
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : "No fue posible anular la orden.");
    } finally {
      setCancellingOrder(false);
    }
  };

  useEffect(() => {
    if (!attachmentOrder) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    attachmentDrawerRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAttachments();
      if (event.key === "Tab") {
        const controls = attachmentDrawerRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], iframe, [tabindex="0"]'
        );
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === attachmentDrawerRef.current)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [attachmentOrder, closeAttachments]);

  const getAttachmentUrl = (file: OrderAttachment) => {
    if (file.file_url?.trim()) return file.file_url.trim();
    const path = String(file.filepath || "").trim();
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    const normalizedPath = path.replace(/^\/+/, "");
    return new URL(`../${normalizedPath.startsWith("media/") ? normalizedPath : `media/${normalizedPath}`}`, API_BASE_URL).toString();
  };

  const handleCloseOrderModal = () => {
    if (confirmingState) return;
    setOrderModal(null);
  };

  const handleRemoveFloatingAlert = (alertId: string | number) => {
    if (alertId === "purchase-orders-error") {
      setError(null);
      return;
    }

    if (alertId === "purchase-orders-action-error") {
      setActionError(null);
      return;
    }

    if (alertId === "purchase-orders-action-success") {
      setActionSuccess(null);
    }
  };

  const exportToExcel = async () => {
    try {
      setExportingExcel(true);
      setActionError(null);

      const { Workbook } = await import("exceljs");
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet("Ordenes de Compra");

      try {
        const response = await fetch(LogoDocuware);
        const imageBuffer = await response.arrayBuffer();
        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension: "png",
        });

        worksheet.addImage(imageId, "B1:D2");
      } catch {
        // Keep the export available even if the logo cannot be embedded.
      }

      worksheet.mergeCells("E1:N2");
      const titleCell = worksheet.getCell("E1");
      titleCell.value = "REPORTE DE ÓRDENES DE COMPRA";
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      titleCell.font = { size: 14, bold: true };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "D9E1F2" },
      };

      ["A1", "A2", "B1", "C1", "D1", "B2", "C2", "D2"].forEach((cell) => {
        worksheet.getCell(cell).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "D9E1F2" },
        };
      });

      const headers = [
        "ID",
        "Número de Orden",
        "Proveedor",
        "Documento Asociado",
        "Condición de Pago",
        "Moneda",
        "Número de Guía",
        "Almacén",
        "Estado",
        "Persona Firmante",
        "Creado por",
        "Fecha",
        "Items",
        "Total Orden",
      ];

      headers.forEach((header, index) => {
        const cell = worksheet.getCell(3, index + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F2F2F2" },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      filteredPurchaseOrders.forEach((purchaseOrder) => {
        const purchaseStateLabel =
          purchaseOrder.purchaseStateLabel ||
          purchaseStateLookup[purchaseOrder.purchaseState] ||
          t("No status");
        const signerLabel =
          typeof purchaseOrder.signature === "number"
            ? userLookup[purchaseOrder.signature] || String(purchaseOrder.signature)
            : "-";
        const creatorLabel =
          userLookup[purchaseOrder.createdBy] || String(purchaseOrder.createdBy);
        const supplierLabel =
          purchaseOrder.supplierLabel ||
          getLookupLabel(supplierLookup, purchaseOrder.supplierID);
        const paymentConditionLabel =
          purchaseOrder.paymentConditionLabel ||
          getLookupLabel(paymentConditionLookup, purchaseOrder.paymentCondition);
        const currencyLabel =
          getCurrencyMeta(
            purchaseOrder.currency,
            t,
            purchaseOrder.currencyLabel || currencyLookup[purchaseOrder.currency]
          ).label || "-";
        const storeLabel =
          purchaseOrder.storeLabel ||
          getLookupLabel(storeLookup, purchaseOrder.store);
        const row = worksheet.addRow([
          purchaseOrder.purchaseOrderID,
          purchaseOrder.orderNo,
          supplierLabel,
          purchaseOrder.documentAssociatedNo,
          paymentConditionLabel,
          currencyLabel,
          purchaseOrder.guideNo || "-",
          storeLabel,
          purchaseStateLabel,
          signerLabel,
          creatorLabel,
          moment(purchaseOrder.createAt).format("DD/MM/YYYY"),
          purchaseOrder.details.length,
          getPurchaseOrderDisplayTotal(purchaseOrder),
        ]);

        row.eachCell((cell, columnNumber) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          if (columnNumber === 9) {
            const stateKind = getPurchaseStateKind(
              purchaseOrder.purchaseState,
              purchaseStateLabel
            );
            cell.font = {
              color: {
                argb:
                  stateKind === "approved"
                    ? "008000"
                    : stateKind === "rejected"
                      ? "FF0000"
                      : stateKind === "pending"
                        ? "B54708"
                        : "344054",
              },
              bold: true,
            };
          }

          if (columnNumber === 14) {
            cell.numFmt = "#,##0.00";
            cell.alignment = { horizontal: "right" };
          }
        });
      });

      worksheet.columns = [
        { width: 8 },
        { width: 20 },
        { width: 34 },
        { width: 22 },
        { width: 22 },
        { width: 14 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 28 },
        { width: 22 },
        { width: 16 },
        { width: 10 },
        { width: 16 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      await downloadBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `Ordenes_Compra_${moment().format("YYYYMMDD_HHmmss")}.xlsx`
      );
    } catch (exportError) {
      console.error("Error exporting purchase orders to Excel:", exportError);
      setActionError(t("Could not export Excel file"));
    } finally {
      setExportingExcel(false);
    }
  };

  const handleConfirmOrderState = async () => {
    if (!orderModal || selectedState === null) return;
    if (orderModal.isCancelled || !orderModal.canBeApprovedBy || orderModal.hasSeniorApproval || orderModal.approvalStatus === "APPROVED") return;

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
      setActionSuccess(null);

      if (
        getPurchaseStateKind(
          selectedState,
          purchaseStateLookup[selectedState]
        ) === "approved"
      ) {
        if (sessionUser.approvalRole === "NONE") {
          throw new Error("El usuario no tiene permisos para firmar órdenes de compra.");
        }
        const approvalResponse = await fetch(buildApiUrl("purchase-orders/approve/"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purchaseOrderID: orderModal.purchaseOrderID,
            userID: sessionUser.id,
            notes: "Aprobado",
            updatedBy: sessionUser.id,
          }),
        });
        const approvalData = await approvalResponse.json().catch(() => null);

        if (!approvalResponse.ok || approvalData?.success === false) {
          throw new Error(
            approvalData?.message || t("Unable to update purchase order status.")
          );
        }

        statusUpdated = true;

        const ordersResponse = await fetch(buildApiUrl("purchase-orders/"));
        const ordersData = await ordersResponse.json().catch(() => null);
        const signedOrder = Array.isArray(ordersData?.data)
          ? ordersData.data.find((order: PurchaseOrderApiItem) => order.purchaseOrderID === orderModal.purchaseOrderID)
          : null;
        if (!ordersResponse.ok || ordersData?.success !== true || !signedOrder) {
          throw new Error("La firma se registró, pero no fue posible consultar el estado actualizado de la orden.");
        }
        const updatedOrder = mapPurchaseOrder(signedOrder);
        setPurchaseOrders((currentOrders) => currentOrders.map((order) =>
          order.purchaseOrderID === updatedOrder.purchaseOrderID ? updatedOrder : order
        ));
        if (updatedOrder.approvalStatus === "JR_SIGNED" && !updatedOrder.hasSeniorApproval) {
          setActionSuccess("Firma JR registrada. La orden queda pendiente de aprobación Senior.");
          setOrderModal(null);
          return;
        }
        if (updatedOrder.approvalStatus !== "APPROVED" || !updatedOrder.hasSeniorApproval) {
          throw new Error("La firma se registró, pero la orden todavía no tiene aprobación final Senior.");
        }
        if (sessionUser.approvalRole !== "SENIOR") {
          throw new Error("La firma se registró. Solo el firmante Senior puede generar el PDF de la orden.");
        }

        const relatedDocument =
          documentsByAssociatedNo[orderModal.documentAssociatedNo] ?? null;

        if (!relatedDocument?.documentid) {
          throw new Error(
            t("Unable to identify the related invoice for this purchase order.")
          );
        }

        setGeneratingOrderId(orderModal.purchaseOrderID);
        setOrderModal(null);

        const [approvals, invoiceDetails] = await Promise.all([
          fetchPurchaseOrderApprovals(updatedOrder.purchaseOrderID),
          fetchPurchaseOrderInvoiceDetails(relatedDocument),
        ]);

        const jrApproval = approvals
          .filter(
            (a) =>
              (!a.purchaseOrderID || a.purchaseOrderID === updatedOrder.purchaseOrderID) &&
              a.approvalLevel === "JR"
          )
          .sort(
            (a, b) => moment(a.signedAt).valueOf() - moment(b.signedAt).valueOf()
          )[0];

        const seniorApproval = approvals
          .filter(
            (a) =>
              (!a.purchaseOrderID || a.purchaseOrderID === updatedOrder.purchaseOrderID) &&
              a.approvalLevel === "SENIOR"
          )
          .sort(
            (a, b) => moment(a.signedAt).valueOf() - moment(b.signedAt).valueOf()
          )[0];

        const solicitanteName =
          updatedOrder.requiredby ||
          orderModal.requiredby ||
          userLookup[updatedOrder.createdBy] ||
          userLookup[orderModal.createdBy] ||
          (updatedOrder.createdBy === sessionUser.id ? sessionUser.name : "") ||
          (orderModal.createdBy === sessionUser.id ? sessionUser.name : "");

        const juniorSignerName =
          jrApproval?.user?.fullName ||
          jrApproval?.user?.userName ||
          (typeof updatedOrder.signature === "number"
            ? userLookup[updatedOrder.signature]
            : "") ||
          (typeof orderModal.signature === "number"
            ? userLookup[orderModal.signature]
            : "");

        const seniorSignerName =
          seniorApproval?.user?.fullName ||
          seniorApproval?.user?.userName ||
          (sessionUser.approvalRole === "SENIOR" ? sessionUser.name : "") ||
          (typeof updatedOrder.signature2 === "number"
            ? userLookup[updatedOrder.signature2]
            : "") ||
          (typeof orderModal.signature2 === "number"
            ? userLookup[orderModal.signature2]
            : "");

        const generatedPdf = await generatePurchaseOrderPdf({
          approvals,
          invoiceDetails,
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
          requiredByName: solicitanteName,
          solicitanteName,
          juniorSignerName,
          seniorSignerName,
          executedByName: seniorSignerName || sessionUser.name,
          userLookup,
          numberLocale,
          isAuditApproved: true,
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

        setActionSuccess(
          expedienteData?.message || t("Expedient generated successfully.")
        );

      } else {
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
          throw new Error(data?.message || t("Unable to update purchase order status."));
        }
        statusUpdated = true;
        setPurchaseOrders((currentOrders) => currentOrders.filter(
          (order) => order.purchaseOrderID !== orderModal.purchaseOrderID
        ));
        setActionSuccess(data?.message || t("Purchase order status updated successfully."));
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
        setActionSuccess(null);

        setPurchaseOrders([]);
        setCurrentPage(1);
        if (!sessionUser.id) {
          throw new Error(t("Unable to identify the signed-in user to update this purchase order."));
        }

        const [
          purchaseOrdersResponse,
          documentsResponse,
          suppliersResponse,
          usersResponse,
          paymentConditionResponse,
          currencyResponse,
          storeResponse,
          purchaseStateResponse,
          signedOrdersResponse,
        ] = await Promise.all([
          isJuniorApprover || sessionUser.approvalRole === "SENIOR"
            ? fetch(buildApiUrl(`purchase-orders/pending-approvals/?userID=${sessionUser.id}`))
            : Promise.resolve(null),
          fetch(buildApiUrl("documents")),
          fetch(buildApiUrl("proveedores")),
          fetch(buildApiUrl("users/")),
          fetch(buildApiUrl("catalogos/?tipo_catalogo=PAYMENT_CONDITION")),
          fetch(buildApiUrl("catalogos/?tipo_catalogo=MONEY")),
          fetch(buildApiUrl("catalogos/?tipo_catalogo=STORE_WAREHOUSE")),
          fetch(buildApiUrl("catalogos/?tipo_catalogo=STATE_OF_PURCHASE_ORDER")),
          fetch(buildApiUrl("purchase-orders/")),
        ]);
        const purchaseOrdersData = purchaseOrdersResponse
          ? await purchaseOrdersResponse.json().catch(() => null)
          : { success: true, data: [] };

        if (
          (purchaseOrdersResponse && !purchaseOrdersResponse.ok) ||
          !purchaseOrdersData?.success ||
          !Array.isArray(purchaseOrdersData?.data)
        ) {
          throw new Error(
            purchaseOrdersData?.message || t("Unable to get purchase orders.")
          );
        }

        const inboxOrders = new Map<number, PurchaseOrder>();
        (purchaseOrdersData.data as PurchaseOrderApiItem[]).map(mapPurchaseOrder)
          .forEach((order) => inboxOrders.set(order.purchaseOrderID, order));
        if (signedOrdersResponse) {
          const signedOrdersData = await signedOrdersResponse.json().catch(() => null);
          if (!signedOrdersResponse.ok || !signedOrdersData?.success || !Array.isArray(signedOrdersData.data)) {
            throw new Error("No fue posible consultar las órdenes creadas o firmadas del usuario.");
          }
          (signedOrdersData.data as PurchaseOrderApiItem[]).map(mapPurchaseOrder)
            .filter((order) => order.createdBy === sessionUser.id || (isJuniorApprover
              ? order.signature === sessionUser.id &&
                (order.approvalStatus === "JR_SIGNED" || order.approvalStatus === "APPROVED")
              : sessionUser.approvalRole === "SENIOR" && order.signature2 === sessionUser.id && (order.isCancelled || (order.hasSeniorApproval &&
                order.approvalStatus === "APPROVED"))))
            .forEach((order) => {
              if (!inboxOrders.has(order.purchaseOrderID)) inboxOrders.set(order.purchaseOrderID, order);
            });
        }
        setPurchaseOrders(Array.from(inboxOrders.values()));

        const documentsData = await documentsResponse.json().catch(() => null);
        const suppliersData = await suppliersResponse.json().catch(() => null);
        const usersData = await usersResponse.json().catch(() => null);
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

        if (usersResponse.ok && usersData?.success && Array.isArray(usersData?.data)) {
          setUserLookup(mapUserLookup(usersData.data));
        } else {
          setUserLookup({});
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
  }, [t, sessionUser.id, sessionUser.approvalRole, isJuniorApprover]);

  useEffect(() => {
    const loadSigners = async () => {
      try {
        setLoadingSigners(true);
        setSignerOptions(await fetchSigners());
      } catch (fetchError: any) {
        setActionError(
          fetchError?.message || t("Error loading signers")
        );
      } finally {
        setLoadingSigners(false);
      }
    };

    loadSigners();
  }, [t]);

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
              <div className="purchase-order-filters-toolbar mb-4">
                <div className="purchase-order-filters-title">
                  <h5 className="mb-1">{t("Purchase Order List")}</h5>
                  <p className="text-muted mb-0">
                    {t("Latest registered orders.")}
                  </p>
                </div>
                <div className="purchase-order-filters-controls-row">
                  <div className="purchase-order-filters-controls">
                    <InputGroup className="purchase-order-filter-control purchase-order-filter-control--search">
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
                    <div className="purchase-order-filter-control purchase-order-filter-control--type">
                      <span className="purchase-order-toolbar__label">
                        {t("Type")}
                      </span>
                      <Input
                        type="select"
                        value={orderTypeFilter}
                        onChange={(event) => {
                          setOrderTypeFilter(event.target.value);
                          setCurrentPage(1);
                        }}
                        className="purchase-order-toolbar__select"
                      >
                        <option value="all">{t("All")}</option>
                        <option value="C">{t("Compra")}</option>
                        <option value="S">{t("Servicio")}</option>
                      </Input>
                    </div>

                    <div className="purchase-order-filter-control purchase-order-filter-control--status">
                      <span className="purchase-order-toolbar__label">
                        {t("Status")}
                      </span>
                      <Input
                        type="select"
                        value={purchaseStateFilter}
                        onChange={(event) => {
                          setPurchaseStateFilter(event.target.value);
                          setCurrentPage(1);
                        }}
                        className="purchase-order-toolbar__select"
                      >
                        <option value="all">{t("All")}</option>
                        {purchaseStateFilterOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Input>
                    </div>

                    <div className="purchase-order-filter-control purchase-order-filter-control--signer">
                      <span className="purchase-order-toolbar__label">
                        {t("Signer Person")}
                      </span>
                      <Select
                        options={signerFilterOptions}
                        value={selectedSignerFilterOption}
                        onChange={(selected: SelectOption | null) => {
                          setSignerFilter(selected ? selected.value : "all");
                          setCurrentPage(1);
                        }}
                        placeholder={t("Select who signed")}
                        isClearable
                        isLoading={loadingSigners}
                        classNamePrefix="select2-selection"
                        className="purchase-order-toolbar__react-select"
                      />
                    </div>
                  </div>
                  <div className="purchase-order-actions-group">
                    <Button
                      color="success"
                      onClick={exportToExcel}
                      title={t("Export Excel")}
                      className="purchase-order-action-button"
                      disabled={exportingExcel}
                    >
                      {exportingExcel ? (
                        <>
                          <Spinner size="sm" />
                          <span>{t("Processing...")}</span>
                        </>
                      ) : (
                        <>
                          <i className="ri-file-excel-2-line" />
                          <span>{t("Export Excel")}</span>
                        </>
                      )}
                    </Button>
                  </div>
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
                          style={{ minWidth: "110px", whiteSpace: "nowrap" }}
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
                          const relatedDocument =
                            documentsByAssociatedNo[purchaseOrder.documentAssociatedNo] ??
                            null;
                          const invoicePreviewUrl =
                            getDocumentPreviewUrl(relatedDocument);
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
                            getAvailableModalStateOptions(
                              purchaseOrder.purchaseState,
                              purchaseOrder.purchaseStateLabel ||
                              purchaseStateLookup[purchaseOrder.purchaseState],
                              purchaseOrder
                            ).length === 0;

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
                                {purchaseOrder.isCancelled ? <span className="badge bg-danger" title={purchaseOrder.cancellationReason}>Anulada</span> : <span className={purchaseState.className}>
                                  <i className={purchaseState.icon} />
                                  <span>{purchaseState.label}</span>
                                </span>}
                                {!purchaseOrder.isCancelled && purchaseOrder.approvalStatus === "JR_SIGNED" && !purchaseOrder.hasSeniorApproval && (
                                  <div className="small text-warning mt-1" role="status">
                                    <i className="ri-time-line me-1" />
                                    Firmado por JR · Pendiente de firma Senior
                                  </div>
                                )}
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
                                  getPurchaseOrderDisplayTotal(purchaseOrder)
                                )}
                              </td>
                              <td
                                className="text-center"
                                style={{ whiteSpace: "nowrap" }}
                              >
                                <div className="d-flex justify-content-center">
                                  <TableActionsMenu
                                    disabled={
                                      generatingOrderId === purchaseOrder.purchaseOrderID
                                    }
                                    items={[
                                      ...(!isActionBlocked
                                        ? [
                                            {
                                              id: `generate-order-${purchaseOrder.purchaseOrderID}`,
                                              label: isJuniorApprover
                                                ? t("Validate Order")
                                                : t("Generate Order C."),
                                              icon: isJuniorApprover
                                                ? "ri-checkbox-circle-line"
                                                : "ri-file-text-line",
                                              tone: "primary" as const,
                                              onClick: () =>
                                                handleOpenOrderModal(purchaseOrder),
                                            },
                                          ]
                                        : []),
                                      {
                                        id: `view-expedient-${purchaseOrder.purchaseOrderID}`,
                                        label: t("View documents"),
                                        icon: "ri-folder-open-line",
                                        tone: !isActionBlocked ? ("neutral" as const) : ("primary" as const),
                                        onClick: () =>
                                          handleOpenAttachments(purchaseOrder),
                                      },
                                      ...(sessionUser.approvalRole === "SENIOR" && purchaseOrder.signature2 === sessionUser.id && !purchaseOrder.isCancelled ? [{
                                        id: `cancel-order-${purchaseOrder.purchaseOrderID}`, label: "Anular orden",
                                        icon: "ri-close-circle-line", tone: "danger" as const,
                                        onClick: () => { setCancelOrder(purchaseOrder); setCancelReason(""); setCancelError(""); },
                                      }] : []),
                                    ]}
                                  />
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
                  <AppPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredPurchaseOrders.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </Container>
      </div>
      <Modal isOpen={!!orderModal} toggle={handleCloseOrderModal} centered size="sm">
        <ModalHeader toggle={handleCloseOrderModal} className="border-bottom-0 pb-0">
          <span className="fs-6 fw-semibold">
            {isJuniorApprover ? t("Validate Order") : t("Generate Order C.")}
          </span>
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
                  className={`d-flex align-items-center gap-3 rounded-3 border p-2 text-start bg-transparent w-100 transition-all ${isSelected
                    ? `border-${option.colorClass} bg-${option.colorClass}-subtle`
                    : "border-light"
                    }`}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    className={`d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 ${isSelected
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
                <i className={isJuniorApprover ? "ri-checkbox-circle-line me-1" : "ri-file-download-line me-1"} />
                {isJuniorApprover ? t("Validate Order") : t("Approve & Generate")}
              </>
            ) : (
              t("Confirm")
            )}
          </Button>
        </ModalFooter>
      </Modal>
      <div className={`expedient-drawer-backdrop ${attachmentOrder ? "is-visible" : ""}`}
        onClick={closeAttachments} aria-hidden="true" />
      <aside ref={attachmentDrawerRef} tabIndex={-1} role="dialog" aria-modal={attachmentOrder ? true : undefined}
        aria-hidden={!attachmentOrder} aria-labelledby="order-documents-title"
        className={`expedient-drawer ${attachmentOrder ? "is-open" : ""}`}>
        {attachmentOrder && (() => {
          const isApproved = Boolean(
            attachmentOrder.hasSeniorApproval &&
            attachmentOrder.approvalStatus === "APPROVED"
          );

          // 1. Factura
          const existingInvoiceAttachment = attachments.find(
            (file) => Number(file.tipodocumentoid) === 1
          );
          const relatedInvoiceDoc =
            documentsByAssociatedNo[attachmentOrder.documentAssociatedNo];
          const hasInvoice = Boolean(existingInvoiceAttachment || relatedInvoiceDoc);
          const invoiceName =
            existingInvoiceAttachment?.filename ||
            attachmentOrder.documentAssociatedNo ||
            t("Invoice");
          const invoiceUrl = existingInvoiceAttachment
            ? getAttachmentUrl(existingInvoiceAttachment)
            : getDocumentPreviewUrl(relatedInvoiceDoc);
          const invoiceCreatedAt =
            existingInvoiceAttachment?.createat || relatedInvoiceDoc?.created_at;

          // 2. Orden de Compra
          const existingOrderAttachment = attachments.find(
            (file) => Number(file.tipodocumentoid) === 2
          );
          const orderDocName =
            (isApproved && existingOrderAttachment?.filename) ||
            attachmentOrder.orderNo ||
            t("Purchase Order");
          const orderDocType = isApproved
            ? t("Purchase Order")
            : t("Purchase Order (Preview)");
          const orderDocUrl =
            (isApproved && existingOrderAttachment
              ? getAttachmentUrl(existingOrderAttachment)
              : "") || orderPreviewPdfUrl;
          const orderDocPath =
            (isApproved && existingOrderAttachment?.filepath) ||
            (attachmentOrder.orderNo
              ? `ordenes/${attachmentOrder.orderNo}.pdf`
              : "");
          const orderDocCreatedAt =
            existingOrderAttachment?.createat || attachmentOrder.createAt;

          // 3. Documentos de sustento adicionales
          const otherAttachments = attachments.filter(
            (file) =>
              file.expedientedocid !== existingInvoiceAttachment?.expedientedocid &&
              Number(file.tipodocumentoid) !== 2
          );

          const totalFileCount =
            (hasInvoice ? 1 : 0) + 1 + otherAttachments.length;

          return (
            <div className="expedient-drawer-shell purchase-order-documents-panel">
              <div className="expedient-drawer-header">
                <div>
                  <span className="expedient-drawer-kicker">{t("Registered Documents")}</span>
                  <h4 className="mb-1" id="order-documents-title">{attachmentOrder.orderNo}</h4>
                  <p className="text-muted mb-0">
                    {loadingAttachments
                      ? t("Loading...")
                      : `${totalFileCount} archivos disponibles.`}
                  </p>
                </div>
                <div className="expedient-drawer-header-actions">
                  <Button color="light" className="expedient-upload-toggle-button" disabled={uploadingAttachment || loadingAttachments || attachmentOrder.isCancelled}
                    onClick={() => setShowDocumentUpload((current) => !current)}>
                    <i className={`${showDocumentUpload ? "ri-close-line" : "ri-upload-2-line"} me-2`} />
                    {showDocumentUpload ? t("Hide uploader") : t("Upload document")}
                  </Button>
                <button type="button" className="expedient-drawer-close" disabled={uploadingAttachment} onClick={closeAttachments} aria-label={t("Close")}>
                  <i className="ri-close-line" />
                </button>
                </div>
              </div>
              <div className="expedient-drawer-body">
                {showDocumentUpload && <OrderDocumentUpload key={attachmentOrder.purchaseOrderID}
                  orderId={attachmentOrder.purchaseOrderID} invoiceId={relatedInvoiceDoc?.documentid}
                  userId={sessionUser.id}
                  onBusyChange={(busy) => { uploadingAttachmentRef.current = busy; setUploadingAttachment(busy); }}
                  onUploaded={async () => {
                    const response = await fetch(buildApiUrl("expedientes/"));
                    const payload = await response.json().catch(() => null);
                    const rows = payload?.data ?? payload;
                    if (!response.ok || payload?.success === false || !Array.isArray(rows)) {
                      setAttachmentError("El documento se cargó, pero no se pudo actualizar el listado. Cierre y vuelva a abrir el panel.");
                      return;
                    }
                    setAttachments(rows.filter((row) => Number(row.ordencompraid ?? row.ordencompra?.purchaseOrderID) === attachmentOrder.purchaseOrderID)
                      .flatMap((row) => row.expediente_documentos ?? []).filter((file: OrderAttachment) => file.estado !== false));
                    setAttachmentError("");
                  }} />}
                <div className="expedient-drawer-list">
                  {/* 1. Factura */}
                  {hasInvoice && (
                    <OrderDocumentItem
                      name={invoiceName}
                      type={t("Invoice")}
                      url={invoiceUrl}
                      createdAt={invoiceCreatedAt}
                    />
                  )}

                  {/* 2. Orden de Compra */}
                  <OrderDocumentItem
                    name={orderDocName}
                    type={orderDocType}
                    url={orderDocUrl}
                    path={orderDocPath}
                    createdAt={orderDocCreatedAt}
                    loading={loadingOrderPreviewPdf && !orderDocUrl}
                  />

                  {/* 3. Documentos de sustento */}
                  {loadingAttachments ? (
                    <div className="text-center py-4"><Spinner color="primary" /></div>
                  ) : attachmentError ? (
                    <p className="text-danger" role="alert">{attachmentError}</p>
                  ) : (
                    otherAttachments.map((file) => (
                      <OrderDocumentItem
                        key={file.expedientedocid}
                        name={file.filename || t("Document")}
                        type={Number(file.tipodocumentoid) === 1 ? t("Invoice") : t("Supporting Document")}
                        url={getAttachmentUrl(file)}
                        createdAt={file.createat}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </aside>
      <Modal isOpen={!!cancelOrder} toggle={() => !cancellingOrder && setCancelOrder(null)} centered>
        <ModalHeader toggle={cancellingOrder ? undefined : () => setCancelOrder(null)}>Anular {cancelOrder?.orderNo}</ModalHeader>
        <ModalBody>
          <p>La orden conservará su historial. El documento asociado quedará disponible para emitir una nueva OC/OS.</p>
          <label htmlFor="order-cancellation-reason" className="form-label">Motivo de anulación <span className="text-danger">*</span></label>
          <Input id="order-cancellation-reason" type="textarea" value={cancelReason} disabled={cancellingOrder}
            onChange={(event) => setCancelReason(event.target.value)} />
          {cancelError && <p className="text-danger mt-2" role="alert">{cancelError}</p>}
        </ModalBody>
        <ModalFooter>
          <Button color="light" disabled={cancellingOrder} onClick={() => setCancelOrder(null)}>Volver</Button>
          <Button color="danger" disabled={cancellingOrder || !cancelReason.trim()} onClick={handleCancelOrder}>
            {cancellingOrder ? <Spinner size="sm" /> : "Anular orden"}
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default PurchaseOrderDetails;
