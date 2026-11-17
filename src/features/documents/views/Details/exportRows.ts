import moment from "moment";
import type { DocumentDetailsRow } from "../../types/details.types";

const numericCell = (value: number | string | null | undefined) => {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const buildDocumentDetailExportRows = (documents: DocumentDetailsRow[]) => {
  const includedDocuments = new Set<number>();

  return documents.map((doc) => {
    const hasDetail = doc.detail_id != null || (doc.detail_id === undefined && doc.total_value != null);
    const base = numericCell(hasDetail ? doc.total_value : doc.amount);
    const tax = numericCell(hasDetail ? doc.tax_value : doc.taxamount);
    const total = hasDetail
      ? base != null && tax != null ? Math.round((base + tax) * 100) / 100 : null
      : numericCell(doc.totalamount);
    const firstRow = doc.source_document_id != null && !includedDocuments.has(doc.source_document_id);
    if (doc.source_document_id != null) includedDocuments.add(doc.source_document_id);
    const date = moment(doc.documentdate);

    return [
      doc.order_number || "", date.isValid() ? date.format("DD/MM/YYYY") : "",
      "", doc.documenttype || "", doc.documentserial || "", "", doc.documentnumber || "",
      "", doc.suppliernumber || "", doc.suppliername || "",
      doc.description?.replace(/<[^>]*>/g, "") || "", doc.unit_measure_description || "",
      base, base, tax, total, "", "", "", "", "", doc.currency || "", "",
      doc.payment_condition || "", doc.centro_costo_1?.centrocodigo || "",
      doc.centro_costo_2?.centrocodigo || "", base && tax != null ? tax / base : null,
      numericCell(doc.quantity), numericCell(doc.unit_value), doc.accounting_code || "",
      doc.driver || "", doc.extracted_plate || doc.vehicle_nro || "", doc.centercost || "",
      firstRow ? numericCell(doc.amount) : null,
      firstRow ? numericCell(doc.taxamount) : null,
      firstRow ? numericCell(doc.totalamount) : null,
    ];
  });
};
