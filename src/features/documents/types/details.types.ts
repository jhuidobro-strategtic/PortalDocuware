export interface DocumentDetailsRow {
  source_document_id?: number;
  detail_id?: number | null;
  order_number?: string;
  payment_condition?: string;
  accounting_code?: string;
  tax_value?: number | null;
  extracted_plate?: string;
  centro_costo_1?: { centrocodigo: string } | null;
  centro_costo_2?: { centrocodigo: string } | null;
  documenttype: string;
  suppliernumber: string;
  documentserial: string;
  documentnumber: string;
  documentdate: string;
  suppliername: string;
  description: string;
  vehicle_nro: string;
  unit_measure_description: string;
  quantity: number;
  currency: string;
  unit_value: number;
  total_value: number;
  amount: number;
  taxamount: number;
  totalamount: number;
  driver: string;
  centercost: string;
}
