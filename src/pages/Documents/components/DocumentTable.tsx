import React from "react";
import {
  Button,
  Pagination,
  PaginationItem,
  PaginationLink,
  Table,
} from "reactstrap";
import moment from "moment";
import { useTranslation } from "react-i18next";
import ResizableHeader from "../ResizableHeader";
import { ColumnWidths, Document } from "../types";
import {
  CurrencyBadge,
  DocumentStatusBadge,
} from "../../../Components/Common/RecordBadges";
import { getNumberLocale } from "../../../common/locale";

interface DocumentTableProps {
  columnWidths: ColumnWidths;
  onResizeColumn: (column: keyof ColumnWidths, width: number) => void;
  documents: Document[];
  getTipoDocumentoNombre: (docType: Document["documenttype"]) => string;
  onView: (doc: Document) => void;
  onOrderC: (doc: Document) => void;
  onEdit: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const highlightStyle = (doc: Document) => {
  if (doc.customer !== "20129605490" || doc.isDuplicated === "X") {
    return { backgroundColor: "#fff5a1" };
  }
  return {};
};

const DocumentTable: React.FC<DocumentTableProps> = ({
  columnWidths,
  onResizeColumn,
  documents,
  getTipoDocumentoNombre,
  onView,
  onOrderC,
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const { t, i18n } = useTranslation();
  const numberLocale = getNumberLocale(i18n.language);

  return (
    <>
      <div
        className="table-responsive"
        style={{ overflowX: "auto", whiteSpace: "nowrap" }}
      >
        <Table
          className="table align-middle table-nowrap mb-0"
          style={{ tableLayout: "fixed", width: "100%", minWidth: "1620px" }}
        >
          <thead className="table-light">
            <tr style={{ textAlign: "center" }}>
              <ResizableHeader
                width={columnWidths.id}
                onResize={(w) => onResizeColumn("id", w)}
              >
                ID
              </ResizableHeader>
              <ResizableHeader
                width={columnWidths.serie}
                onResize={(w) => onResizeColumn("serie", w)}
              >
                {t("Series")}
              </ResizableHeader>
              <ResizableHeader
                width={columnWidths.numero}
                onResize={(w) => onResizeColumn("numero", w)}
              >
                {t("Number")}
              </ResizableHeader>
              <ResizableHeader
                width={columnWidths.ruc}
                onResize={(w) => onResizeColumn("ruc", w)}
              >
                RUC
              </ResizableHeader>
              <ResizableHeader
                width={columnWidths.razon}
                onResize={(w) => onResizeColumn("razon", w)}
              >
                {t("Business Name")}
              </ResizableHeader>
              <ResizableHeader
                width={columnWidths.tipo}
                onResize={(w) => onResizeColumn("tipo", w)}
              >
                {t("Document Type")}
              </ResizableHeader>
              <ResizableHeader
                width={columnWidths.driver}
                onResize={(w) => onResizeColumn("driver", w)}
              >
                {t("Buyer")}
              </ResizableHeader>
              <ResizableHeader
                width={columnWidths.fecha}
                onResize={(w) => onResizeColumn("fecha", w)}
              >
                {t("Issue Date")}
              </ResizableHeader>
              <ResizableHeader
                width={columnWidths.moneda}
                onResize={(w) => onResizeColumn("moneda", w)}
              >
                {t("Currency")}
              </ResizableHeader>
              <ResizableHeader
                width={columnWidths.subtotal}
                onResize={(w) => onResizeColumn("subtotal", w)}
              >
                {t("Subtotal")}
              </ResizableHeader>
              <ResizableHeader
                width={columnWidths.igv}
                onResize={(w) => onResizeColumn("igv", w)}
              >
                IGV
              </ResizableHeader>
              <ResizableHeader
                width={columnWidths.total}
                onResize={(w) => onResizeColumn("total", w)}
              >
                {t("Total")}
              </ResizableHeader>
              <ResizableHeader
                width={columnWidths.estado}
                onResize={(w) => onResizeColumn("estado", w)}
              >
                {t("Status")}
              </ResizableHeader>
              <ResizableHeader
                width={columnWidths.acciones}
                onResize={(w) => onResizeColumn("acciones", w)}
              >
                {t("Actions")}
              </ResizableHeader>
            </tr>
          </thead>

          <tbody>
            {documents.length === 0 && (
              <tr>
                <td colSpan={14} className="text-center">
                  {t("No records found")}
                </td>
              </tr>
            )}
            {documents.map((doc) => {
              const style = {
                ...highlightStyle(doc),
                width: undefined,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              };

              return (
                <tr key={doc.documentid}>
                  <td
                    style={{
                      ...style,
                      width: columnWidths.id,
                      textAlign: "center",
                    }}
                  >
                    <b>#{doc.documentid}</b>
                  </td>
                  <td
                    style={{
                      ...style,
                      width: columnWidths.serie,
                      textAlign: "center",
                    }}
                  >
                    {doc.documentserial}
                  </td>
                  <td
                    style={{
                      ...style,
                      width: columnWidths.numero,
                      textAlign: "center",
                    }}
                  >
                    {doc.documentnumber}
                  </td>
                  <td
                    style={{
                      ...style,
                      width: columnWidths.ruc,
                      textAlign: "center",
                    }}
                  >
                    {doc.suppliernumber}
                  </td>
                  <td style={{ ...style, width: columnWidths.razon }}>
                    {doc.suppliername}
                  </td>
                  <td
                    style={{
                      ...style,
                      width: columnWidths.tipo,
                      textAlign: "center",
                    }}
                  >
                    {doc.documenttype
                      ? getTipoDocumentoNombre(doc.documenttype)
                      : t("Unknown")}
                  </td>
                  <td style={{ ...style, width: columnWidths.driver }}>
                    {doc.driver}
                  </td>
                  <td
                    style={{
                      ...style,
                      width: columnWidths.fecha,
                      textAlign: "center",
                    }}
                  >
                    {moment(doc.documentdate).format("DD/MM/YYYY")}
                  </td>
                  <td
                    style={{
                      ...style,
                      width: columnWidths.moneda,
                      textAlign: "center",
                    }}
                  >
                    <CurrencyBadge currency={doc.currency} />
                  </td>
                  <td
                    style={{
                      ...style,
                      width: columnWidths.subtotal,
                    }}
                    className="text-end"
                  >
                    {Number(doc.amount).toLocaleString(numberLocale, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td
                    style={{
                      ...style,
                      width: columnWidths.igv,
                    }}
                    className="text-end"
                  >
                    {Number(doc.taxamount).toLocaleString(numberLocale, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td
                    style={{
                      ...style,
                      width: columnWidths.total,
                    }}
                    className="text-end"
                  >
                    <b>
                      {Number(doc.totalamount).toLocaleString(numberLocale, {
                        minimumFractionDigits: 2,
                      })}
                    </b>
                  </td>
                  <td
                    style={{
                      ...style,
                      width: columnWidths.estado,
                      textAlign: "center",
                    }}
                  >
                    <DocumentStatusBadge status={doc.status} />
                  </td>
                  <td style={{ ...style, width: columnWidths.acciones }}>
                    <div className="d-flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        color="info"
                        outline
                        onClick={() => onView(doc)}
                      >
                        <i className="ri-eye-line align-bottom" /> {t("View")}
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        outline
                        onClick={() => onOrderC(doc)}
                      >
                        <i className="ri-file-list-3-line align-bottom" /> {t("Order C.")}
                      </Button>
                      <Button
                        size="sm"
                        color="warning"
                        outline
                        onClick={() => onEdit(doc)}
                      >
                        <i className="ri-edit-box-line align-bottom" /> {t("Edit")}
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        outline
                        onClick={() => onDelete(doc)}
                      >
                        <i className="ri-delete-bin-line align-bottom" /> {t("Delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-3">
          <Pagination>
            <PaginationItem disabled={currentPage === 1}>
              <PaginationLink
                previous
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i} active={currentPage === i + 1}>
                <PaginationLink onClick={() => onPageChange(i + 1)}>
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem disabled={currentPage === totalPages}>
              <PaginationLink
                next
                onClick={() =>
                  onPageChange(Math.min(currentPage + 1, totalPages))
                }
              />
            </PaginationItem>
          </Pagination>
        </div>
      )}
    </>
  );
};

export default DocumentTable;
