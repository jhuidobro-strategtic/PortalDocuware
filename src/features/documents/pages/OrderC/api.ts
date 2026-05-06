import { buildApiUrl } from '../../../../helpers/api-url';
import { CatalogoItem, SelectOption, SupplierApiItem, SupplierOptionItem, SignerApiItem } from './types';

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
