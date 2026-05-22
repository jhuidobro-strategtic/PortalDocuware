import {
  OrderCFieldConfig,
  SelectOption,
  SessionUser,
} from "../types/orderC.types";

export const getOrderCFields = (
  signerOptions: SelectOption[] = []
): OrderCFieldConfig[] => {
  const requesterOptions = signerOptions.map((option) => ({
    value: option.label,
    label: option.label,
  }));

  return [
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
      name: "orderType",
      labelKey: "Service Type",
      placeholderKey: "Select service type",
      options: [
        { value: "C", label: "Compra" },
        { value: "S", label: "Servicio" },
      ],
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
      name: "requiredby",
      labelKey: "Requested by",
      placeholderKey: "Select requested by",
      options: requesterOptions,
    },
    {
      name: "signedBy",
      labelKey: "Junior Lawyer",
      placeholderKey: "Select junior lawyer",
      options: signerOptions,
    },
    {
      name: "signature2",
      labelKey: "Senior Lawyer",
      placeholderKey: "Select senior lawyer",
      options: signerOptions,
    },
    {
      name: "createdByName",
      labelKey: "Created by",
      placeholderKey: "Auto-filled from the session",
      readOnly: true,
    },
  ];
};

export const getCurrentSessionUser = (): SessionUser => {
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
