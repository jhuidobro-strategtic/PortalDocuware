import React from "react";
import { Link } from "react-router-dom";
import Select from "react-select";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  Input,
  Label,
  Row,
  Spinner,
  Table,
} from "reactstrap";

import BreadCrumb from "../../../../components/common/BreadCrumb";
import FloatingAlerts from "../../../../components/common/FloatingAlerts";
import type { FloatingAlertItem } from "../../../../components/common/FloatingAlerts";
import { useOrderC } from "../../hooks/useOrderC";
import { SelectOption } from "../../types/orderC.types";
import { CATALOG_ENDPOINTS } from "../../services/orderC.service";
import {
  getCurrencyMeta,
  getOrderCurrencyLabel,
  formatListAmount,
  getDetailTotal,
} from "../../services/orderC.utils";

const DocumentOrderC = () => {
  const {
    document,
    values,
    sunatSearchValues,
    details,
    summaryValues,
    loading,
    submitting,
    prefillingFromSunat,
    error,
    feedback,
    catalogOptions,
    supplierOptions,
    loadingSigners,
    creatingSupplier,
    orderCFields,
    numberLocale,
    t,
    navigate,
    handleChange,
    handleSupplierChange,
    handleCreateSupplier,
    handleSunatSearchValueChange,
    handleRemoveFloatingAlert,
    isSunatSearchReady,
    handleSearchSunat,
    handleSubmit,
  } = useOrderC();

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="text-center my-5">
            <Spinner color="primary" />
          </div>
        </Container>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="page-content">
        <Container fluid>
          <FloatingAlerts
            alerts={[
              {
                id: "order-c-load-error",
                type: "danger",
                message: error || t("No information was found for this view."),
              },
            ]}
          />
          <BreadCrumb title="Order C." pageTitle="Documents" />
          <Button color="light" onClick={() => navigate("/documents")}>
            {t("Back to Documents")}
          </Button>
        </Container>
      </div>
    );
  }

  const floatingAlerts: FloatingAlertItem[] = [];
  const supplierSelectOptions: SelectOption[] = supplierOptions.map((supplier) => ({
    value: String(supplier.supplierID),
    label:
      [supplier.supplierNo, supplier.supplierName]
        .filter(Boolean)
        .join(" - ") || String(supplier.supplierID),
  }));

  const selectedCurrencyMeta = getCurrencyMeta(
    values.currency,
    catalogOptions.currency.find(
      (option) =>
        option.value === getCurrencyMeta(values.currency).normalizedValue
    )?.label
  );

  if (prefillingFromSunat) {
    floatingAlerts.push({
      id: "order-c-prefill",
      type: "info",
      dismissible: false,
      message: (
        <span className="d-inline-flex align-items-center gap-2">
          <Spinner size="sm" />
          <span>{t("Querying SUNAT with the entered document data...")}</span>
        </span>
      ),
    });
  }

  if (feedback) {
    floatingAlerts.push({
      id: "order-c-feedback",
      type: feedback.type,
      message: feedback.message,
      autoDismissMs:
        feedback.type === "success" || feedback.type === "info" ? 5000 : undefined,
    });
  }

  return (
    <div className="page-content">
      <Container fluid>
        <FloatingAlerts
          alerts={floatingAlerts}
          onRemove={handleRemoveFloatingAlert}
        />
        <BreadCrumb title="Order C." pageTitle="Documents" />

        <Card className="border-0 shadow-sm mb-4">
          <CardBody>
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
              <div>
                <h4 className="mb-1">
                  {t("Document #{{id}}", { id: document.documentid })}
                </h4>
                <p className="text-muted mb-2">
                  {t("Series {{serial}} - Number {{number}}", {
                    serial: document.documentserial,
                    number: document.documentnumber,
                  })}
                </p>
                <div className="d-flex flex-wrap gap-2 text-muted small">
                  <span className="badge bg-light text-secondary border">
                    {t("Status: {{status}}", {
                      status: document.status
                        ? t("Active status")
                        : t("Pending status"),
                    })}
                  </span>
                  <span className="badge bg-light text-secondary border">
                    <span className="d-inline-flex align-items-center gap-2">
                      {selectedCurrencyMeta.imageUrl && (
                        <img
                          src={selectedCurrencyMeta.imageUrl}
                          alt={selectedCurrencyMeta.alt}
                          width={20}
                          height={15}
                          className="rounded-1 flex-shrink-0"
                        />
                      )}
                      <span>
                        {t("Currency: {{currency}}", {
                          currency:
                            selectedCurrencyMeta.label ||
                            getOrderCurrencyLabel(values.currency) ||
                            document.currency,
                        })}
                      </span>
                    </span>
                  </span>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2">
                <Button tag={Link} to="/documents" color="light">
                  {t("Back")}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardBody className="p-4">
            <div className="mb-4">
              <h5 className="mb-1">{t("Order C. form")}</h5>
              <p className="text-muted mb-0">
                {t(
                  "Use the selected document as a base, then query SUNAT to auto-fill the general data and detail lines."
                )}
              </p>
            </div>

            <Form onSubmit={handleSubmit}>
              <div className="mb-4">
                <h6 className="text-uppercase text-muted mb-3">
                  {t("SUNAT Query")}
                </h6>
                <Row className="g-4 align-items-end">
                  <Col md={4}>
                    <Label className="form-label">{t("Voucher Type")}</Label>
                    <Input
                      value={sunatSearchValues.tipoComprobante}
                      onChange={(event) =>
                        handleSunatSearchValueChange(
                          "tipoComprobante",
                          event.target.value
                        )
                      }
                      placeholder="01"
                    />
                  </Col>
                  <Col md={4}>
                    <Label className="form-label">{t("Series")}</Label>
                    <Input
                      value={sunatSearchValues.serie}
                      onChange={(event) =>
                        handleSunatSearchValueChange("serie", event.target.value)
                      }
                      placeholder="F001"
                    />
                  </Col>
                  <Col md={4}>
                    <Label className="form-label">{t("Number")}</Label>
                    <Input
                      value={sunatSearchValues.numero}
                      onChange={(event) =>
                        handleSunatSearchValueChange("numero", event.target.value)
                      }
                      placeholder="2603"
                    />
                  </Col>
                  <Col xs={12}>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 rounded-3 border bg-light-subtle px-3 py-3">
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <small className="text-muted">
                          {t(
                            "Complete Voucher Type, Series and Number. The issuer RUC is taken from the selected record."
                          )}
                        </small>
                        <span className="badge bg-light text-secondary border">
                          {t("Issuer RUC: {{ruc}}", {
                            ruc: values.suppliernumber || "-",
                          })}
                        </span>
                      </div>

                      {isSunatSearchReady && (
                        <Button
                          type="button"
                          color="primary"
                          onClick={handleSearchSunat}
                          disabled={prefillingFromSunat}
                        >
                          {prefillingFromSunat ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              {t("Querying SUNAT...")}
                            </>
                          ) : (
                            <>
                              <i className="ri-search-line align-bottom me-1" />
                              {t("Search SUNAT")}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </Col>
                </Row>
              </div>

              <div className="mb-4">
                <h6 className="text-uppercase text-muted mb-3">
                  {t("General Data")}
                </h6>
                <Row className="g-4">
                  {orderCFields.map((field) => {
                    const isCatalogSelect = field.name in CATALOG_ENDPOINTS;
                    const isSupplierSelect = field.name === "supplierID";
                    const isCurrencySelect = field.name === "currency";
                    const isSignerSelect =
                      field.name === "signedBy" || field.name === "signature2";
                    const isRequesterSelect = field.name === "requiredby";
                    const usesRawOptionLabels =
                      isSignerSelect || isRequesterSelect;
                    const isSelect = !!field.options || isCatalogSelect || isSupplierSelect;
                    const selectOptions = field.options
                      ? field.options.map((opt: SelectOption) => ({
                          ...opt,
                          label: usesRawOptionLabels ? opt.label : t(opt.label),
                        }))
                      : isSupplierSelect
                      ? supplierSelectOptions
                      : catalogOptions[field.name] ?? [];
                    return (
                      <Col md={6} key={field.name}>
                        <div>
                          <Label className="form-label">
                            {t(field.labelKey)}
                          </Label>
                          {isSelect ? (
                            isSupplierSelect ? (
                              <div className="d-flex flex-column flex-xl-row align-items-stretch gap-2">
                                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                  <Select
                                    options={selectOptions}
                                    value={
                                      selectOptions.find(
                                        (opt) =>
                                          opt.value ===
                                          values[field.name as keyof typeof values]
                                      ) ?? null
                                    }
                                    onChange={(selected: SelectOption | null) =>
                                      handleSupplierChange(selected)
                                    }
                                    placeholder={t(field.placeholderKey)}
                                    isClearable
                                    classNamePrefix="select2-selection"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  color="primary"
                                  outline
                                  className="flex-shrink-0 px-3"
                                  onClick={handleCreateSupplier}
                                  disabled={
                                    creatingSupplier ||
                                    String(values.suppliernumber || "").replace(/\D/g, "").length !== 11
                                  }
                                >
                                  {creatingSupplier ? (
                                    <>
                                      <Spinner size="sm" className="me-2" />
                                      {t("Creating supplier...")}
                                    </>
                                  ) : (
                                    <>
                                      <i className="ri-user-add-line align-bottom me-1" />
                                      {t("Create supplier")}
                                    </>
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <Select
                                options={selectOptions}
                                value={
                                  selectOptions.find(
                                    (opt) =>
                                      opt.value ===
                                      (isCurrencySelect
                                        ? getCurrencyMeta(values[field.name as keyof typeof values]).normalizedValue
                                        : values[field.name as keyof typeof values])
                                  ) ?? null
                                }
                                onChange={(selected: SelectOption | null) =>
                                  handleChange(
                                    field.name,
                                    selected ? selected.value : ""
                                  )
                                }
                                placeholder={t(field.placeholderKey)}
                                isClearable
                                isLoading={
                                  (isSignerSelect || isRequesterSelect) &&
                                  loadingSigners
                                }
                                classNamePrefix="select2-selection"
                                formatOptionLabel={
                                  isCurrencySelect
                                    ? (option: SelectOption) => (
                                        <span className="d-inline-flex align-items-center gap-2">
                                          {option.flagUrl && (
                                            <img
                                              src={option.flagUrl}
                                              alt={option.label}
                                              width={20}
                                              height={15}
                                              className="rounded-1 flex-shrink-0"
                                            />
                                          )}
                                          <span>{option.label}</span>
                                        </span>
                                      )
                                    : undefined
                                }
                              />
                            )
                          ) : (
                            <Input
                              type={field.type || "text"}
                              value={String(values[field.name as keyof typeof values] || "")}
                              onChange={(event) =>
                                handleChange(field.name as keyof typeof values, event.target.value)
                              }
                              placeholder={t(field.placeholderKey)}
                              readOnly={field.readOnly}
                              className={field.readOnly ? "bg-light" : ""}
                            />
                          )}
                          {field.helperTextKey && (
                            <small className="text-muted d-block mt-1">
                              {t(field.helperTextKey)}
                            </small>
                          )}
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>

              <div className="border-top pt-4">
                <div className="mb-3">
                  <h6 className="text-uppercase text-muted">{t("Details")}</h6>
                </div>

                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "72px" }}>#</th>
                        <th>{t("Item description")}</th>
                        <th style={{ width: "160px" }} className="text-center">
                          {t("Quantity")}
                        </th>
                        <th style={{ width: "180px" }} className="text-end">
                          {t("Unit price")}
                        </th>
                        <th style={{ width: "180px" }} className="text-end">
                          {t("Total")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4">
                            <div>
                              <h6 className="mb-1">
                                {t("No details found in SUNAT")}
                              </h6>
                              <p className="text-muted mb-0">
                                {t(
                                  "Query SUNAT to display the detail lines associated with the document."
                                )}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        details.map((detail, index) => (
                          <tr key={detail.id}>
                            <td className="fw-semibold text-muted">
                              {index + 1}
                            </td>
                            <td>{detail.descriptionItem || t("No description")}</td>
                            <td className="text-center">{detail.quantity}</td>
                            <td className="text-end">
                              {formatListAmount(detail.unitPrice, numberLocale)}
                            </td>
                            <td className="text-end fw-semibold">
                              {formatListAmount(
                                getDetailTotal(detail),
                                numberLocale
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>

                {summaryValues && (
                  <div className="d-flex justify-content-end mt-3">
                    <div className="w-100" style={{ maxWidth: "360px" }}>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                        <span className="fw-semibold">{t("Subtotal")}:</span>
                        <span>
                          {formatListAmount(summaryValues.subtotal, numberLocale)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                        <span className="fw-semibold">IGV:</span>
                        <span>
                          {formatListAmount(summaryValues.igv, numberLocale)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2">
                        <span className="fw-semibold">{t("Total")}:</span>
                        <span className="fw-bold">
                          {formatListAmount(summaryValues.total, numberLocale)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="d-flex flex-wrap justify-content-end gap-2 mt-4">
                <Button type="button" color="light" onClick={() => navigate(-1)}>
                  {t("Cancel")}
                </Button>
                <Button type="submit" color="primary" disabled={submitting}>
                  {submitting ? t("Saving...") : t("Save")}
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      </Container>
    </div>
  );
};

export default DocumentOrderC;
