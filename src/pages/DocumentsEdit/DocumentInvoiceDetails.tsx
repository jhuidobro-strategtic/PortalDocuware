import React from "react";
import { Card, CardBody, Spinner, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { getNumberLocale } from "../../common/locale";
import { DocumentDetail } from "../Documents/types";

interface DocumentInvoiceDetailsProps {
  loading: boolean;
  details: DocumentDetail[];
}

const formatAmount = (value: string | number | null | undefined, locale: string) =>
  Number(value || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const DocumentInvoiceDetails: React.FC<DocumentInvoiceDetailsProps> = ({
  loading,
  details,
}) => {
  const { t, i18n } = useTranslation();
  const numberLocale = getNumberLocale(i18n.language);

  const subtotal = details.reduce(
    (sum, detail) => sum + parseFloat(detail.unit_value || "0"),
    0
  );
  const taxTotal = details.reduce(
    (sum, detail) => sum + parseFloat(detail.tax_value || "0"),
    0
  );
  const grandTotal = details.reduce(
    (sum, detail) =>
      sum +
      parseFloat(detail.unit_value || "0") +
      parseFloat(detail.tax_value || "0"),
    0
  );

  return (
    <Card className="border-0 shadow-sm document-edit-details-card">
      <CardBody className="p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h5 className="mb-1">{t("Invoice Details")}</h5>
            <p className="text-muted mb-0">
              {t(
                "Review the lines obtained from SUNAT and validate the document totals before saving."
              )}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center my-4">
            <Spinner color="primary" />
          </div>
        ) : (
          <div className="document-edit-details-table">
            <Table className="table table-sm align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="text-center">{t("Unit")}</th>
                  <th className="text-center">{t("Description")}</th>
                  <th className="text-center">{t("Plate")}</th>
                  <th className="text-center">{t("Quantity")}</th>
                  <th className="text-center">{t("Unit Value")}</th>
                  <th className="text-center">{t("Total")}</th>
                </tr>
              </thead>
              <tbody>
                {details.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      {t("No details available")}
                    </td>
                  </tr>
                ) : (
                  <>
                    {details.map((detail) => (
                      <tr key={detail.detailid}>
                        <td className="text-center">
                          {detail.unit_measure_description}
                        </td>
                        <td>{detail.description}</td>
                        <td className="text-center">{detail.vehicle_no || "-"}</td>
                        <td className="text-center">{detail.quantity}</td>
                        <td className="text-end">
                          {formatAmount(detail.unit_value, numberLocale)}
                        </td>
                        <td className="text-end">
                          {formatAmount(detail.total_value, numberLocale)}
                        </td>
                      </tr>
                    ))}

                    <tr>
                      <td colSpan={5} className="text-end fw-bold">
                        {t("Subtotal")}:
                      </td>
                      <td className="text-end fw-bold">
                        {formatAmount(subtotal, numberLocale)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="text-end fw-bold">
                        IGV:
                      </td>
                      <td className="text-end fw-bold">
                        {formatAmount(taxTotal, numberLocale)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="text-end fw-bold">
                        {t("Total")}:
                      </td>
                      <td className="text-end fw-bold">
                        {formatAmount(grandTotal, numberLocale)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default DocumentInvoiceDetails;
