export interface OrderCFormValues {
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
  orderType: string;
  signedBy: string;
  createdBy: string;
  createdByName: string;
}

export interface OrderCDetailFormValues {
  id: string;
  descriptionItem: string;
  quantity: string;
  unitPrice: string;
}

export interface SunatSearchValues {
  tipoComprobante: string;
  serie: string;
  numero: string;
}

export type OrderCFieldName = keyof OrderCFormValues;

export interface OrderCFieldConfig {
  name: OrderCFieldName;
  labelKey: string;
  placeholderKey: string;
  type?: "text" | "number";
  readOnly?: boolean;
  helperTextKey?: string;
  options?: SelectOption[];
}

export interface FeedbackState {
  type: "success" | "danger" | "info";
  message: string;
}

export interface CatalogoItem {
  id: number;
  descripcion: string;
}

export interface SupplierApiItem {
  supplierid: number;
  supplierno?: string;
  suppliername?: string;
}

export interface SupplierOptionItem {
  supplierID: number;
  supplierNo: string;
  supplierName: string;
}

export interface SignerApiItem {
  userID: number;
  userName?: string;
  fullName?: string;
  status?: boolean;
}

export interface OrderCSummaryValues {
  subtotal: string;
  igv: string;
  total: string;
}

export type SelectOption = { value: string; label: string; flagUrl?: string };

export interface SunatInvoiceItem {
  descripcion?: string;
  cantidad?: number | string;
  valor_unitario?: number | string;
  precio_unitario?: number | string;
}

export interface SunatInvoicePayload {
  detalle?: {
    codigo_moneda?: string;
    fecha_emision?: string;
    serie?: string;
    numero?: string;
  };
  totales?: {
    total_grav_oner?: number | string;
    total_igv?: number | string;
    monto_total_general?: number | string;
  };
  emisor?: {
    ruc?: string;
    razon_social?: string;
    nombre_o_razon_social?: string;
    nombre_razon_social?: string;
  };
  items?: SunatInvoiceItem[];
}
