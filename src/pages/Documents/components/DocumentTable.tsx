import React from "react";
import {
  Button,
  Pagination,
  PaginationItem,
  PaginationLink,
  Table,
} from "reactstrap";
import moment from "moment";
import ResizableHeader from "../ResizableHeader";
import { ColumnWidths, Document } from "../types";

interface DocumentTableProps {
  columnWidths: ColumnWidths;
  onResizeColumn: (column: keyof ColumnWidths, width: number) => void;
  documents: Document[];
  getTipoDocumentoNombre: (docType: Document["documenttype"]) => string;
  onView: (doc: Document) => void;
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
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
}) => (
  <>
    <div
      className="table-responsive"
      style={{ overflowX: "auto", whiteSpace: "nowrap" }}
    >
      <Table
        className="table align-middle table-nowrap mb-0"
        style={{ tableLayout: "fixed", width: "100%", minWidth: "1500px" }}
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
              Serie
            </ResizableHeader>
            <ResizableHeader
              width={columnWidths.numero}
              onResize={(w) => onResizeColumn("numero", w)}
            >
              Número
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
              Razón Social
            </ResizableHeader>
            <ResizableHeader
              width={columnWidths.tipo}
              onResize={(w) => onResizeColumn("tipo", w)}
            >
              Tipo Documento
            </ResizableHeader>
            <ResizableHeader
              width={columnWidths.driver}
              onResize={(w) => onResizeColumn("driver", w)}
            >
              Comprador
            </ResizableHeader>
            <ResizableHeader
              width={columnWidths.fecha}
              onResize={(w) => onResizeColumn("fecha", w)}
            >
              Fecha Emisión
            </ResizableHeader>
            <ResizableHeader
              width={columnWidths.moneda}
              onResize={(w) => onResizeColumn("moneda", w)}
            >
              Moneda
            </ResizableHeader>
            <ResizableHeader
              width={columnWidths.subtotal}
              onResize={(w) => onResizeColumn("subtotal", w)}
            >
              Sub Total
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
              Total
            </ResizableHeader>
            <ResizableHeader
              width={columnWidths.estado}
              onResize={(w) => onResizeColumn("estado", w)}
            >
              Estado
            </ResizableHeader>
            <ResizableHeader
              width={columnWidths.acciones}
              onResize={(w) => onResizeColumn("acciones", w)}
            >
              Acciones
            </ResizableHeader>
          </tr>
        </thead>

        <tbody>
          {documents.length === 0 && (
            <tr>
              <td colSpan={13} className="text-center">
                No se encontraron registros
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
                    : "N/A"}
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
                  {doc.currency === "PEN" && (
                    <img
                      src="https://flagcdn.com/w40/pe.png"
                      alt="Perú"
                      width={20}
                      height={15}
                      className="me-2"
                    />
                  )}
                  {doc.currency === "USD" && (
                    <img
                      src="https://flagcdn.com/w40/us.png"
                      alt="USA"
                      width={20}
                      height={15}
                      className="me-2"
                    />
                  )}
                  {doc.currency}
                </td>
                <td
                  style={{
                    ...style,
                    width: columnWidths.subtotal,
                  }}
                  className="text-end"
                >
                  {Number(doc.amount).toLocaleString("es-PE", {
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
                  {Number(doc.taxamount).toLocaleString("es-PE", {
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
                    {Number(doc.totalamount).toLocaleString("es-PE", {
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
                  <span
                    className={`badge ${doc.status ? "bg-success" : "bg-warning"}`}
                  >
                    {doc.status ? "Activo" : "Pendiente"}
                  </span>
                </td>
                <td style={{ ...style, width: columnWidths.acciones }}>
                  <div className="hstack gap-2">
                    <Button
                      size="sm"
                      color="info"
                      outline
                      onClick={() => onView(doc)}
                    >
                      <i className="ri-eye-line align-bottom" /> Ver
                    </Button>
                    <Button
                      size="sm"
                      color="warning"
                      outline
                      onClick={() => onEdit(doc)}
                    >
                      <i className="ri-edit-box-line align-bottom" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      color="danger"
                      outline
                      onClick={() => onDelete(doc)}
                    >
                      <i className="ri-delete-bin-line align-bottom" /> Eliminar
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

export default DocumentTable;
