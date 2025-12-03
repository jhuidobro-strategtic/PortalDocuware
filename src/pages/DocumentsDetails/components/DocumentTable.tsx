import React from "react";
import { Table } from "reactstrap";
import moment from "moment";
import { DocumentDetailsRow } from "../types";

interface DocumentTableProps {
  documents: DocumentDetailsRow[];
}

const DocumentTable: React.FC<DocumentTableProps> = ({ documents }) => (
  <div className="table-responsive">
    <Table className="table align-middle table-nowrap mb-0">
      <thead className="table-light">
        <tr>
          <th>Tipo</th>
          <th>Comprador</th>
          <th>Serie</th>
          <th>Nº</th>
          <th>Fecha</th>
          <th>RUC</th>
          <th>Proveedor</th>
          <th>Centro de Costo</th>
          <th>Descripción</th>
          <th>Vehículo</th>
          <th>Unidad</th>
          <th className="text-end">Cant.</th>
          <th className="text-end">V. Unit.</th>
          <th className="text-end">V. Línea</th>
          <th>Moneda</th>
          <th className="text-end">Sub Total</th>
          <th className="text-end">IGV</th>
          <th className="text-end">Total</th>
        </tr>
      </thead>
      <tbody>
        {documents.length === 0 ? (
          <tr>
            <td colSpan={18} className="text-center">
              No se encontraron registros
            </td>
          </tr>
        ) : (
          documents.map((doc, index) => (
            <tr
              key={`${doc.documentserial}-${doc.documentnumber}-${index}`}
            >
              <td>{doc.documenttype}</td>
              <td>{doc.driver}</td>
              <td>{doc.documentserial}</td>
              <td>{doc.documentnumber}</td>
              <td>{moment(doc.documentdate).format("DD/MM/YYYY")}</td>
              <td>{doc.suppliernumber}</td>
              <td>{doc.suppliername}</td>
              <td>{doc.centercost}</td>
              <td
                style={{
                  maxWidth: 300,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {doc.description.replace(/<[^>]*>/g, "")}
              </td>
              <td>{doc.vehicle_nro || "N/A"}</td>
              <td>{doc.unit_measure_description || "N/A"}</td>
              <td className="text-end">
                {(doc.quantity ?? 0).toLocaleString("es-PE", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </td>
              <td className="text-end">
                {(doc.unit_value ?? 0).toLocaleString("es-PE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="text-end">
                {(doc.total_value ?? 0).toLocaleString("es-PE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td>
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
              <td className="text-end">
                {(doc.amount ?? 0).toLocaleString("es-PE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="text-end">
                {(doc.taxamount ?? 0).toLocaleString("es-PE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="text-end">
                <b>
                  {(doc.totalamount ?? 0).toLocaleString("es-PE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </b>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  </div>
);

export default DocumentTable;
