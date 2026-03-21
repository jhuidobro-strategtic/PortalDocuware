import React from "react";
import { Table } from "reactstrap";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { DocumentDetailsRow } from "../types";
import { CurrencyBadge } from "../../../Components/Common/RecordBadges";
import { getNumberLocale } from "../../../common/locale";

interface DocumentTableProps {
  documents: DocumentDetailsRow[];
}

const DocumentTable: React.FC<DocumentTableProps> = ({ documents }) => {
  const { t, i18n } = useTranslation();
  const numberLocale = getNumberLocale(i18n.language);

  return (
    <div className="table-responsive">
      <Table className="table align-middle table-nowrap mb-0">
        <thead className="table-light">
          <tr>
            <th>{t("Document Type")}</th>
            <th>{t("Buyer")}</th>
            <th>{t("Series")}</th>
            <th>{t("Number")}</th>
            <th>{t("Date")}</th>
            <th>RUC</th>
            <th>{t("Business Name")}</th>
            <th>{t("Cost center")}</th>
            <th>{t("Description")}</th>
            <th>{t("Vehicle")}</th>
            <th>{t("Unit")}</th>
            <th className="text-end">{t("Quantity")}</th>
            <th className="text-end">{t("Unit Value")}</th>
            <th className="text-end">{t("Total")}</th>
            <th>{t("Currency")}</th>
            <th className="text-end">{t("Subtotal")}</th>
            <th className="text-end">IGV</th>
            <th className="text-end">{t("Total")}</th>
          </tr>
        </thead>
        <tbody>
          {documents.length === 0 ? (
            <tr>
              <td colSpan={18} className="text-center">
                {t("No records found")}
              </td>
            </tr>
          ) : (
            documents.map((doc, index) => (
              <tr key={`${doc.documentserial}-${doc.documentnumber}-${index}`}>
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
                <td>{doc.vehicle_nro || t("Unknown")}</td>
                <td>{doc.unit_measure_description || t("Unknown")}</td>
                <td className="text-end">
                  {(doc.quantity ?? 0).toLocaleString(numberLocale, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </td>
                <td className="text-end">
                  {(doc.unit_value ?? 0).toLocaleString(numberLocale, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="text-end">
                  {(doc.total_value ?? 0).toLocaleString(numberLocale, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td>
                  <CurrencyBadge currency={doc.currency} />
                </td>
                <td className="text-end">
                  {(doc.amount ?? 0).toLocaleString(numberLocale, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="text-end">
                  {(doc.taxamount ?? 0).toLocaleString(numberLocale, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="text-end">
                  <b>
                    {(doc.totalamount ?? 0).toLocaleString(numberLocale, {
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
};

export default DocumentTable;
