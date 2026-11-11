import { buildApiUrl } from "../../../helpers/api-url";

export interface AccountingAccount { code: string; name: string; }
export interface TaxOption { id: string; kind: "retention" | "detraction"; label: string; rate: number; threshold_reference?: number; }
export interface AccountingCatalog { accounts: AccountingAccount[]; tax_options: TaxOption[]; }
export interface AccountingAdjustment {
  option_id: string; kind?: "retention" | "detraction"; concept?: string;
  rate?: string; base?: string; amount?: string; net?: string; application?: string;
}

let catalogRequest: Promise<AccountingCatalog> | undefined;
export const fetchAccountingCatalog = (): Promise<AccountingCatalog> => {
  if (!catalogRequest) catalogRequest = fetch(buildApiUrl("accounting-catalog/"))
    .then(async (response) => {
      if (!response.ok) throw new Error("No se pudo cargar el catálogo contable. Reintente la carga.");
      return response.json() as Promise<AccountingCatalog>;
    }).catch((error) => { catalogRequest = undefined; throw error; });
  return catalogRequest;
};

export const adjustmentPreview = (total: string, rate: number) => {
  const amount = Math.round((Number(total || 0) * rate / 100 + Number.EPSILON) * 100) / 100;
  return { amount, net: Math.round((Number(total || 0) - amount) * 100) / 100 };
};
