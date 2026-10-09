import React, { useState } from "react";
import Select from "react-select";
import { Card, CardBody, Input, Label, Spinner, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { getNumberLocale } from "../../../../common/locale";
import { CentroCosto, DocumentDetail } from "../../types/list.types";

interface DocumentInvoiceDetailsProps {
  loading: boolean;
  details: DocumentDetail[];
  centrosCostos: CentroCosto[];
  centrosCostos2: CentroCosto[];
  onDetailsChange: React.Dispatch<React.SetStateAction<DocumentDetail[]>>;
  disabled: boolean;
}

interface CostCenterOption {
  value: number;
  label: string;
}

const costCenterSelectStyles = {
  menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 9999 }),
};

const formatAmount = (value: string | number | null | undefined, locale: string) =>
  Number(value || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const DocumentInvoiceDetails: React.FC<DocumentInvoiceDetailsProps> = ({
  loading,
  details,
  centrosCostos,
  centrosCostos2,
  onDetailsChange,
  disabled,
}) => {
  const { t, i18n } = useTranslation();
  const numberLocale = getNumberLocale(i18n.language);
  const [applyAll, setApplyAll] = useState({ costCenter1: false, costCenter2: false });
  const mapCostOptions = (centers: CentroCosto[]): CostCenterOption[] => centers.map((center) => ({
    value: Number(center.centroid),
    label: `${center.centrocodigo} - ${center.descripcion}`,
  }));
  const costOptions = {
    costCenter1: mapCostOptions(centrosCostos),
    costCenter2: mapCostOptions(centrosCostos2),
  };
  const costColumns = ["costCenter1", "costCenter2"] as const;
  const getSelectedCostCenter = (detail: DocumentDetail, field: typeof costColumns[number]): CostCenterOption | null => {
    const id = detail[field];
    if (id === null || id === undefined) return null;
    const catalogOption = costOptions[field].find((option) => option.value === Number(id));
    if (catalogOption) return catalogOption;
    const savedCenter = field === "costCenter1" ? detail.centro_costo_1 : detail.centro_costo_2;
    return savedCenter && Number(savedCenter.centroid) === Number(id)
      ? { value: Number(id), label: `${savedCenter.centrocodigo} - ${savedCenter.descripcion}` }
      : { value: Number(id), label: String(id) };
  };
  const changeCostCenter = (rowIndex: number, field: typeof costColumns[number], value: number | null) => {
    onDetailsChange((rows) => rows.map((row, index) =>
      applyAll[field] || index === rowIndex ? { ...row, [field]: value } : row
    ));
  };
  const toggleApplyAll = (field: typeof costColumns[number], checked: boolean) => {
    setApplyAll((previous) => ({ ...previous, [field]: checked }));
    if (checked) {
      const firstValue = details[0]?.[field] ?? null;
      onDetailsChange((rows) => rows.map((row) => ({ ...row, [field]: firstValue })));
    }
  };

  const subtotal = details.reduce(
    (sum, detail) => sum + parseFloat(detail.total_value || "0"),
    0
  );
  const taxTotal = details.reduce(
    (sum, detail) => sum + parseFloat(detail.tax_value || "0"),
    0
  );
  const grandTotal = subtotal + taxTotal;

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
                  {costColumns.map((field, index) => (
                    <th key={field} className="document-edit-cost-column">
                      <Label className="d-flex align-items-center gap-2 mb-0">
                        <span>{t("Cost Center {{number}}", { number: index + 1 })}</span>
                        <Input type="checkbox" className="m-0" checked={applyAll[field]}
                          aria-label={`${t("Apply to all rows")}: ${t("Cost Center {{number}}", { number: index + 1 })}`}
                          disabled={disabled || details.length === 0}
                          onChange={(event) => toggleApplyAll(field, event.target.checked)} />
                      </Label>
                    </th>
                  ))}
                  <th className="text-center">{t("Unit Value")}</th>
                  <th className="text-center">{t("Total")}</th>
                </tr>
              </thead>
              <tbody>
                {details.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      {t("No details available")}
                    </td>
                  </tr>
                ) : (
                  <>
                    {details.map((detail, rowIndex) => (
                      <tr key={detail.detailid}>
                        <td className="text-center">
                          {detail.unit_measure_description}
                        </td>
                        <td>{detail.description}</td>
                        <td className="text-center">{detail.extracted_plate || "-"}</td>
                        <td className="text-center">{detail.quantity}</td>
                        {costColumns.map((field, index) => (
                          <td key={field} className="document-edit-cost-column">
                            <Select<CostCenterOption> options={costOptions[field]}
                              value={getSelectedCostCenter(detail, field)}
                              onChange={(option: CostCenterOption | null) => changeCostCenter(rowIndex, field, option?.value ?? null)}
                              isDisabled={disabled || (applyAll[field] && rowIndex > 0)}
                              isClearable isSearchable
                              aria-label={t("Cost Center {{number}}, row {{row}}", { number: index + 1, row: rowIndex + 1 })}
                              placeholder={t("Select cost center")}
                              noOptionsMessage={() => t("No results")}
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                              styles={costCenterSelectStyles} />
                          </td>
                        ))}
                        <td className="text-end">
                          {formatAmount(detail.unit_value, numberLocale)}
                        </td>
                        <td className="text-end">
                          {formatAmount(detail.total_value, numberLocale)}
                        </td>
                      </tr>
                    ))}

                    <tr>
                      <td colSpan={7} className="text-end fw-bold">
                        {t("Subtotal")}:
                      </td>
                      <td className="text-end fw-bold">
                        {formatAmount(subtotal, numberLocale)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={7} className="text-end fw-bold">
                        IGV:
                      </td>
                      <td className="text-end fw-bold">
                        {formatAmount(taxTotal, numberLocale)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={7} className="text-end fw-bold">
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
