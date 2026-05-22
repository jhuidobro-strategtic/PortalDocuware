import { buildApiUrl } from "../../../helpers/api-url";
import {
  buildFactilizaUrl,
  getFactilizaToken,
} from "../../../helpers/external-api";
import {
  CatalogoItem,
  SelectOption,
  SupplierApiItem,
  SupplierCreationResult,
  SupplierOptionItem,
  SignerApiItem,
} from "../types/orderC.types";

export const CATALOG_ENDPOINTS: Record<string, string> = {
  paymentCondition: "PAYMENT_CONDITION",
  currency: "MONEY",
  store: "STORE_WAREHOUSE",
  purchaseState: "STATE_OF_PURCHASE_ORDER",
};

export const fetchCatalog = async (tipo: string): Promise<SelectOption[]> => {
  const response = await fetch(buildApiUrl(`catalogos/?tipo_catalogo=${tipo}`));
  const data = await response.json();
  if (!data.success || !Array.isArray(data.data)) return [];
  return (data.data as CatalogoItem[]).map((item) => ({
    value: String(item.id),
    label: item.descripcion,
  }));
};

export const fetchSuppliers = async (): Promise<SupplierOptionItem[]> => {
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

const normalizeSupplierRuc = (value: string) => value.replace(/\D/g, "").slice(0, 11);

const mapSupplierApiItem = (item: SupplierApiItem): SupplierCreationResult => ({
  supplierID: item.supplierid,
  supplierNo: item.supplierno ?? "",
  supplierName: item.suppliername ?? "",
  address: item.address ?? "",
});

const lookupSupplierByRuc = async (ruc: string) => {
  const normalizedRuc = normalizeSupplierRuc(ruc);
  const factilizaToken = getFactilizaToken();

  if (!factilizaToken) {
    throw new Error("Factiliza token is not configured in the environment");
  }

  const response = await fetch(buildFactilizaUrl(`ruc/info/${normalizedRuc}`), {
    headers: {
      Authorization: `Bearer ${factilizaToken}`,
    },
  });
  const result = await response.json().catch(() => null);
  const supplierData = result?.data;

  if (
    !response.ok ||
    !result?.success ||
    !supplierData?.nombre_o_razon_social
  ) {
    throw new Error(result?.message || "RUC not found");
  }

  return {
    supplierNo: normalizedRuc,
    supplierName: String(supplierData.nombre_o_razon_social ?? "").trim(),
    address: String(supplierData.direccion_completa ?? "").trim(),
  };
};

export const createSupplierFromRuc = async (
  ruc: string,
  userId: number
): Promise<SupplierCreationResult> => {
  const supplierData = await lookupSupplierByRuc(ruc);

  const response = await fetch(buildApiUrl("proveedores/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      supplierno: supplierData.supplierNo,
      suppliername: supplierData.supplierName,
      address: supplierData.address,
      phone: "",
      email: "",
      bank1_id: null,
      accountno1: "",
      bank2_id: null,
      accountno2: "",
      createdby: userId,
      updatedby: userId,
    }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Error registering supplier");
  }

  return mapSupplierApiItem((data?.data ?? data) as SupplierApiItem);
};

export const fetchSigners = async (): Promise<SelectOption[]> => {
  const response = await fetch(buildApiUrl("users/?profile=2"));
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success || !Array.isArray(data?.data)) {
    throw new Error(data?.message || "Error loading signers");
  }

  return (data.data as SignerApiItem[])
    .map((item) => ({
      value: String(item.userID),
      label:
        [String(item.fullName ?? "").trim()]
          .filter(Boolean)
          .join(" - ") || String(item.userID),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "es"));
};
