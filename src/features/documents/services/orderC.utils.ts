import { Document } from "../types/list.types";
import {
  SelectOption,
  SunatInvoicePayload,
  SunatInvoiceItem,
  OrderCDetailFormValues,
  OrderCSummaryValues,
  OrderCFormValues,
  OrderCFieldName,
  SessionUser,
  SunatSearchValues,
} from "../types/orderC.types";

export const normalizeSunatDocumentNumber = (value: unknown) => {
  const trimmedValue = String(value ?? "").trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return trimmedValue;
  }

  return trimmedValue.replace(/^0+(?=\d)/, "");
};

export const getCurrencyMeta = (currencyValue: unknown, currencyLabel?: string) => {
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

export const withCurrencyFlags = (options: SelectOption[]) =>
  options.map((option) => ({
    ...option,
    flagUrl: getCurrencyMeta(option.value, option.label).imageUrl || undefined,
  }));

export const getDocumentTypeId = (document: Document | null) => {
  if (!document?.documenttype) {
    return "";
  }

  if (typeof document.documenttype === "number") {
    return String(document.documenttype);
  }

  return String(document.documenttype.tipoid ?? "");
};

export const getDocumentAssociatedNo = (document: Document | null) => {
  if (!document) {
    return "";
  }

  const parts = [
    document.documentserial,
    normalizeSunatDocumentNumber(document.documentnumber),
  ].filter(Boolean);
  return parts.join("-");
};

export const getSunatDocumentType = (document: Document | null) => {
  const documentTypeId = getDocumentTypeId(document);
  return documentTypeId ? documentTypeId.padStart(2, "0") : "";
};

export const createInitialSunatSearchValues = (
  document: Document | null
): SunatSearchValues => ({
  tipoComprobante: getSunatDocumentType(document),
  serie: document?.documentserial ?? "",
  numero: normalizeSunatDocumentNumber(document?.documentnumber),
});

export const mapSunatCurrencyToOrderCurrency = (currencyCode: unknown) => {
  const { normalizedValue, imageUrl } = getCurrencyMeta(currencyCode);
  return imageUrl ? normalizedValue : "";
};

export const formatDecimalValue = (value: unknown, fallback = "0.00") => {
  const parsedValue = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsedValue) ? parsedValue.toFixed(2) : fallback;
};

export const areAmountsEquivalent = (leftValue: unknown, rightValue: unknown) =>
  Math.abs(Number(formatDecimalValue(leftValue)) - Number(formatDecimalValue(rightValue))) <
  0.005;

export const formatQuantityValue = (value: unknown) => {
  const parsedValue = Number.parseFloat(String(value ?? ""));

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return "1";
  }

  const normalizedValue = Number.isInteger(parsedValue)
    ? String(parsedValue)
    : parsedValue.toFixed(2);

  return normalizedValue.replace(/\.?0+$/, "");
};

export const getSunatSupplierName = (
  payload: SunatInvoicePayload,
  fallbackValue: string
) =>
  payload.emisor?.razon_social ||
  payload.emisor?.nombre_o_razon_social ||
  payload.emisor?.nombre_razon_social ||
  fallbackValue;

export const mapSunatItemsToOrderDetails = (items: SunatInvoiceItem[] = []) => {
  const mappedItems = items
    .map((item) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      descriptionItem: String(item.descripcion ?? "").trim(),
      quantity: formatQuantityValue(item.cantidad),
      unitPrice: formatDecimalValue(
        item.valor_unitario ?? item.precio_unitario,
        ""
      ),
      storedTotal:
        item.valor_venta !== undefined || item.impuesto_valor !== undefined
          ? formatDecimalValue(
            Number(item.valor_venta ?? 0) + Number(item.impuesto_valor ?? 0)
          )
          : undefined,
    }))
    .filter((item) => item.descriptionItem || item.unitPrice);

  return mappedItems;
};

export const getOrderCurrencyLabel = (currencyValue: string) => {
  return getCurrencyMeta(currencyValue).label;
};

export const normalizeSupplierNumber = (value: string) => value.replace(/\D/g, "");

export const createInitialValues = (
  document: Document | null,
  sessionUser: SessionUser
): OrderCFormValues => {
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
    orderType: "",
    signedBy: "",
    signature2: "",
    requiredby: "",
    createdBy: sessionUser.id,
    createdByName: sessionUser.name,
  };
};

export const getDetailTotal = (detail: OrderCDetailFormValues) => {
  const quantity = Number(detail.quantity || 0);
  const unitPrice = Number(detail.unitPrice || 0);

  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    return "0.00";
  }

  return (quantity * unitPrice).toFixed(2);
};

export const getDetailStoredTotal = (detail: OrderCDetailFormValues) => {
  const parsedStoredTotal = Number.parseFloat(String(detail.storedTotal ?? ""));

  if (Number.isFinite(parsedStoredTotal)) {
    return parsedStoredTotal.toFixed(2);
  }

  return getDetailTotal(detail);
};

export const buildSummaryFromDetails = (
  details: OrderCDetailFormValues[]
): OrderCSummaryValues => {
  const subtotal = details.reduce(
    (sum, detail) => sum + Number(getDetailTotal(detail)),
    0
  );

  return {
    subtotal: subtotal.toFixed(2),
    igv: "0.00",
    total: subtotal.toFixed(2),
  };
};

export const getSummaryFromSunatPayload = (
  payload: SunatInvoicePayload,
  details: OrderCDetailFormValues[]
): OrderCSummaryValues => {
  if (payload.totales) {
    const subtotal = formatDecimalValue(payload.totales.total_grav_oner, "0.00");
    const igv = formatDecimalValue(payload.totales.total_igv, "0.00");
    const total = formatDecimalValue(
      payload.totales.monto_total_general,
      (Number(subtotal) + Number(igv)).toFixed(2)
    );

    return { subtotal, igv, total };
  }

  return buildSummaryFromDetails(details);
};

export const formatListAmount = (value: string, locale = "es-PE") =>
  Number(value || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const buildPurchaseOrderPayload = (
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
  tipoorden: values.orderType.trim(),
  signature: Number(values.signedBy),
  signature2: Number(values.signature2),
  requiredby: values.requiredby.trim(),
  createdBy: Number(values.createdBy),
  details: details.map((detail) => ({
    descriptionItem: detail.descriptionItem.trim(),
    quantity: Number(detail.quantity),
    unitPrice: Number(detail.unitPrice).toFixed(2),
    total: getDetailStoredTotal(detail),
  })),
});

export const requiredFields: OrderCFieldName[] = [
  "suppliernumber",
  "suppliername",
  "orderType",
  "supplierID",
  "documentAssociatedType",
  "documentAssociatedNo",
  "paymentCondition",
  "currency",
  "store",
  "purchaseState",
  "signedBy",
  "signature2",
  "requiredby",
  "createdBy",
];

