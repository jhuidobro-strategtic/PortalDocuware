import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Document } from "../types/list.types";
import { buildApiUrl } from "../../../helpers/api-url";
import { buildSunatUrl, getSunatToken } from "../../../helpers/external-api";

import {
  OrderCFormValues,
  SunatSearchValues,
  OrderCDetailFormValues,
  OrderCSummaryValues,
  FeedbackState,
  SelectOption,
  SupplierOptionItem,
  SunatInvoicePayload,
} from "../types/orderC.types";

import {
  fetchCatalog,
  fetchSuppliers,
  fetchSigners,
  CATALOG_ENDPOINTS,
} from "../services/orderC.service";

import {
  withCurrencyFlags,
  createInitialValues,
  createInitialSunatSearchValues,
  normalizeSunatDocumentNumber,
  normalizeSupplierNumber,
  getDocumentTypeId,
  getDocumentAssociatedNo,
  mapSunatItemsToOrderDetails,
  mapSunatCurrencyToOrderCurrency,
  getSunatSupplierName,
  getSummaryFromSunatPayload,
  requiredFields,
  formatDecimalValue,
  areAmountsEquivalent,
  buildPurchaseOrderPayload
} from "../services/orderC.utils";
import { getCurrentSessionUser, getOrderCFields } from "./orderC.form";

const DOCUMENTS_FLASH_NOTIFICATION_KEY = "documents-flash-notification";

export const useOrderC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { documentId } = useParams();
  const locationState = location.state as { document?: Document } | null;
  const numberLocale = i18n.language === "es" ? "es-PE" : "en-US";
  const [sessionUser] = useState(() => getCurrentSessionUser());

  const [document, setDocument] = useState<Document | null>(
    locationState?.document ?? null
  );
  const [values, setValues] = useState<OrderCFormValues>(
    createInitialValues(locationState?.document ?? null, sessionUser)
  );
  const [sunatSearchValues, setSunatSearchValues] = useState<SunatSearchValues>(
    createInitialSunatSearchValues(locationState?.document ?? null)
  );
  const [details, setDetails] = useState<OrderCDetailFormValues[]>([]);
  const [summaryValues, setSummaryValues] = useState<OrderCSummaryValues | null>(
    null
  );
  const [loading, setLoading] = useState(!locationState?.document);
  const [submitting, setSubmitting] = useState(false);
  const [prefillingFromSunat, setPrefillingFromSunat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [catalogOptions, setCatalogOptions] = useState<Record<string, SelectOption[]>>({
    paymentCondition: [],
    currency: [],
    store: [],
    purchaseState: [],
  });
  const [supplierOptions, setSupplierOptions] = useState<SupplierOptionItem[]>([]);
  const [signerOptions, setSignerOptions] = useState<SelectOption[]>([]);
  const [loadingSigners, setLoadingSigners] = useState(false);

  const orderCFields = getOrderCFields(signerOptions);

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

  useEffect(() => {
    const loadSigners = async () => {
      try {
        setLoadingSigners(true);
        setSignerOptions(await fetchSigners());
      } catch (fetchError: any) {
        setFeedback({
          type: "danger",
          message: fetchError?.message || t("Error loading signers"),
        });
      } finally {
        setLoadingSigners(false);
      }
    };
    loadSigners();
  }, [t]);

  useEffect(() => {
    window.document.title = `${t("Order C.")} | Docuware`;
  }, [t]);

  useEffect(() => {
    setValues(createInitialValues(document, sessionUser));
    setSunatSearchValues(createInitialSunatSearchValues(document));
    setDetails([]);
    setSummaryValues(null);
    setFeedback(null);
  }, [document, sessionUser]);

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

  const handleChange = (field: keyof OrderCFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSupplierChange = (selected: SelectOption | null) => {
    if (!selected) {
      setValues((prev) => ({ ...prev, supplierID: "" }));
      return;
    }
    setValues((prev) => ({ ...prev, supplierID: selected.value }));
  };

  const handleSunatSearchValueChange = (field: keyof SunatSearchValues, value: string) => {
    setSunatSearchValues((prev) => ({
      ...prev,
      [field]:
        field === "numero" ? normalizeSunatDocumentNumber(value) : value,
    }));
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
    if (!document) return;

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
        message: t("Complete Voucher Type, Series and Number before querying SUNAT"),
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
        throw new Error(data?.message || t("Error fetching invoice data from SUNAT"));
      }

      const payload = data.payload as SunatInvoicePayload;
      const detailRows = mapSunatItemsToOrderDetails(payload.items);
      const hasSunatDetails = detailRows.some((detail) => detail.descriptionItem.trim());
      const currencyCode = payload.detalle?.codigo_moneda || document.currency;
      const associatedDocumentNo =
        [
          payload.detalle?.serie || sunatSearchValues.serie,
          normalizeSunatDocumentNumber(
            payload.detalle?.numero || sunatSearchValues.numero
          ),
        ].filter(Boolean).join("-") || getDocumentAssociatedNo(document);

      setValues((prev) => ({
        ...prev,
        suppliernumber: payload.emisor?.ruc || values.suppliernumber || prev.suppliernumber,
        suppliername: getSunatSupplierName(payload, document.suppliername || prev.suppliername),
        documentAssociatedNo: associatedDocumentNo,
        currency: mapSunatCurrencyToOrderCurrency(currencyCode) || prev.currency,
      }));
      setSunatSearchValues((prev) => ({
        ...prev,
        serie: payload.detalle?.serie || prev.serie,
        numero: normalizeSunatDocumentNumber(
          payload.detalle?.numero || prev.numero
        ),
      }));
      setDetails(detailRows);
      setSummaryValues(getSummaryFromSunatPayload(payload, detailRows));
      setFeedback({
        type: hasSunatDetails ? "info" : "danger",
        message: hasSunatDetails
          ? data.message || t("The selected document was loaded from SUNAT and the details were auto-filled.")
          : t("No details found in SUNAT"),
      });
    } catch (prefillError: any) {
      setFeedback({
        type: "danger",
        message: prefillError?.message || t("Unable to query SUNAT for the selected document."),
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
      (field) => !String(normalizedValues[field as keyof OrderCFormValues] || "").trim()
    );

    if (missingField) {
      const fieldConfig = orderCFields.find((f) => f.name === missingField);
      setFeedback({
        type: "danger",
        message: t("Complete the {{field}} field.", { field: t(fieldConfig?.labelKey || missingField) }),
      });
      return;
    }

    const selectedSupplier = supplierOptions.find(
      (s) => String(s.supplierID) === String(normalizedValues.supplierID)
    );

    const recordSupplierNo = normalizeSupplierNumber(normalizedValues.suppliernumber);
    const selectedSupplierNo = normalizeSupplierNumber(selectedSupplier?.supplierNo || "");

    if (recordSupplierNo && selectedSupplierNo && recordSupplierNo !== selectedSupplierNo) {
      setFeedback({
        type: "danger",
        message: t("The selected supplier does not match the business name from the document."),
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

    if (!summaryValues) {
      setFeedback({
        type: "danger",
        message: t("Query SUNAT to validate the total amount before saving."),
      });
      return;
    }

    const documentTotalAmount = formatDecimalValue(document?.totalamount, "0.00");
    const sunatTotalAmount = formatDecimalValue(summaryValues.total, "0.00");

    if (!areAmountsEquivalent(sunatTotalAmount, documentTotalAmount)) {
      setFeedback({
        type: "danger",
        message: t("The SUNAT total ({{sunatTotal}}) does not match the total amount of the selected document ({{documentTotal}}).", {
          sunatTotal: sunatTotalAmount,
          documentTotal: documentTotalAmount,
        }),
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = buildPurchaseOrderPayload(normalizedValues, details);
      const response = await fetch(buildApiUrl("purchase-orders/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || t("Unable to register Order C."));
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
        message: submitError.message || t("An error occurred while registering Order C."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    document,
    values,
    sunatSearchValues,
    details,
    summaryValues,
    loading,
    submitting,
    prefillingFromSunat,
    error,
    feedback,
    catalogOptions,
    supplierOptions,
    signerOptions,
    loadingSigners,
    orderCFields,
    numberLocale,
    t,
    navigate,
    handleChange,
    handleSupplierChange,
    handleSunatSearchValueChange,
    handleRemoveFloatingAlert,
    isSunatSearchReady,
    handleSearchSunat,
    handleSubmit,
  };
};
