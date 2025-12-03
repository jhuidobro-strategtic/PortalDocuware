export interface Document {
  documentid: number;
  documentserial: string;
  documentnumber: string;
  customer: string;
  isDuplicated: string;
  suppliernumber: string;
  suppliername: string;
  documenttype: number | { tipoid: number; tipo: string } | null;
  documentdate: string;
  amount: string;
  taxamount: string;
  totalamount: string;
  documenturl: string;
  notes: string;
  status: boolean;
  created_by: number;
  created_at: string;
  updated_by?: number | null;
  updated_at?: string | null;
  currency: string;
  driver: string;
  centercost: number | { centroid: number; centrocodigo: string; descripcion: string } | null;
}

export interface TipoDocumento {
  tipoid: number;
  tipo: string;
}

export interface CentroCosto {
  centroid: number;
  centrocodigo: string;
  descripcion: string;
}

export interface DocumentDetail {
  detailid: number;
  documentserial: string;
  documentnumber: string;
  suppliernumber: string;
  unit_measure_description: string;
  description: string;
  vehicle_no: string;
  quantity: number;
  unit_value: string;
  tax_value: string;
  total_value: string;
  status: boolean;
  created_by: number;
  created_at: string;
  updated_by?: number | null;
  updated_at?: string | null;
}

export interface Notification {
  id: number;
  type: "success" | "danger" | "warning" | "info";
  message: string;
}

export type ColumnWidths = {
  id: number;
  serie: number;
  numero: number;
  ruc: number;
  razon: number;
  tipo: number;
  driver: number;
  fecha: number;
  moneda: number;
  subtotal: number;
  igv: number;
  total: number;
  estado: number;
  acciones: number;
};
