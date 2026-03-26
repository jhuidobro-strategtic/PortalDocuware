import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Container,
  Input,
  InputGroup,
  InputGroupText,
  Pagination,
  PaginationItem,
  PaginationLink,
  Spinner,
  Table,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { API_BASE_URL, buildApiUrl } from "../../helpers/api-url";
import { getNumberLocale } from "../../common/locale";
import "./Expedients.css";

interface ExpedientDocumentType {
  tipoid: number;
  tipo: string;
}

interface ExpedientCatalogItem {
  id: number;
  tipo_catalogo: string;
  codigo: string;
  descripcion: string;
  estado: boolean;
  fecha_creacion: string;
  fecha_modificacion: string | null;
}

interface ExpedientSupplierReference {
  supplierid: number;
  supplierno?: string;
  suppliername?: string;
}

interface ExpedientInvoice {
  documentid: number;
  documenttype: ExpedientDocumentType | null;
  documentserial: string;
  documentnumber: string;
  suppliernumber: string;
  suppliername: string;
  documentdate: string;
  amount: string;
  taxamount: string;
  totalamount: string;
  documenturl: string;
  notes: string;
  currency: string;
  driver: string | null;
  status: boolean;
  created_by: number | null;
  created_at: string;
  updated_by: number | null;
  updated_at: string | null;
}

interface ExpedientPurchaseOrderDetail {
  purchaseDetailID: number;
  descriptionItem: string;
  quantity: number;
  unitPrice: string;
  total: string;
  createdBy: number | null;
  createAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
  purchaseOrderID: number;
}

interface ExpedientPurchaseOrder {
  purchaseOrderID: number;
  orderNo: string;
  supplierID: ExpedientSupplierReference | number | null;
  documentAssociatedType: ExpedientDocumentType | null;
  documentAssociatedNo: string;
  paymentCondition: ExpedientCatalogItem | number | null;
  currency: ExpedientCatalogItem | number | null;
  guideNo: string;
  store: ExpedientCatalogItem | number | null;
  purchaseState: ExpedientCatalogItem | number | null;
  createdBy: number | null;
  createAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
  details: ExpedientPurchaseOrderDetail[];
}

interface ExpedientDocument {
  expedientedocid: number;
  expedienteid: number;
  tipodocumentoid: number;
  filename: string;
  filepath: string;
  estado: boolean;
  createdby: number | null;
  createat: string;
  updatedby: number | null;
  updatedat: string | null;
}

interface Expedient {
  expedienteid: number;
  facturaid: number | null;
  factura?: ExpedientInvoice | null;
  ordencompraid: number | null;
  ordencompra?: ExpedientPurchaseOrder | null;
  estado: boolean;
  createdby: number | null;
  createat: string;
  updatedby: number | null;
  updatedat: string | null;
  expediente_documentos: ExpedientDocument[];
}

const ITEMS_PER_PAGE = 10;

const matchesSearchValue = (value: unknown, term: string): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => matchesSearchValue(item, term));
  }

  if (typeof value === "object") {
    return Object.values(value).some((item) => matchesSearchValue(item, term));
  }

  const normalizedValue = String(value).toLowerCase();
  if (normalizedValue.includes(term)) {
    return true;
  }

  if (typeof value === "string") {
    const parsedDate = moment(value, moment.ISO_8601, true);
    if (parsedDate.isValid()) {
      return parsedDate.format("DD/MM/YYYY HH:mm").toLowerCase().includes(term);
    }
  }

  return false;
};

const getExpedientDocumentUrl = (filePath: string) => {
  const normalizedPath = String(filePath || "").trim().replace(/^\/+/, "");

  if (!normalizedPath) {
    return "";
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  const mediaPath = normalizedPath.startsWith("media/")
    ? normalizedPath
    : `media/${normalizedPath}`;

  return new URL(`../${mediaPath}`, API_BASE_URL).toString();
};

const getExpedientStatusMeta = (isActive: boolean, t: (key: string) => string) =>
  isActive
    ? {
        label: t("Active status"),
        className:
          "badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        icon: "ri-checkbox-circle-line",
      }
    : {
        label: t("Inactive"),
        className:
          "badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        icon: "ri-close-circle-line",
      };

const getInvoiceCode = (invoice?: ExpedientInvoice | null) =>
  [invoice?.documentserial, invoice?.documentnumber].filter(Boolean).join("-");

const getInvoiceTypeLabel = (invoice?: ExpedientInvoice | null) =>
  String(invoice?.documenttype?.tipo ?? "").trim();

const getPurchaseOrderSupplierLabel = (
  purchaseOrder?: ExpedientPurchaseOrder | null
) => {
  if (!purchaseOrder || !purchaseOrder.supplierID) {
    return "";
  }

  if (typeof purchaseOrder.supplierID === "number") {
    return String(purchaseOrder.supplierID);
  }

  return (
    [purchaseOrder.supplierID.supplierno, purchaseOrder.supplierID.suppliername]
      .filter(Boolean)
      .join(" - ") || String(purchaseOrder.supplierID.supplierid)
  );
};

const formatAmount = (
  value: string | number | null | undefined,
  locale: string
) =>
  Number(value || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const Expedients = () => {
  const { t, i18n } = useTranslation();
  const [expedients, setExpedients] = useState<Expedient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExpedient, setSelectedExpedient] = useState<Expedient | null>(null);
  const numberLocale = getNumberLocale(i18n.language);

  useEffect(() => {
    document.title = `${t("Expedient List")} | Docuware`;
  }, [t]);

  useEffect(() => {
    const fetchExpedients = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(buildApiUrl("expedientes/"));
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.success || !Array.isArray(payload?.data)) {
          throw new Error(
            payload?.message || t("Error loading expedients")
          );
        }

        setExpedients(payload.data as Expedient[]);
      } catch (fetchError) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : t("Error loading expedients");
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchExpedients();
  }, [t]);

  const filteredExpedients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return expedients;
    }

    return expedients.filter((expedient) => {
      const statusLabel = expedient.estado ? t("Active") : t("Inactive");

      return (
        matchesSearchValue(expedient, term) ||
        statusLabel.toLowerCase().includes(term)
      );
    });
  }, [expedients, searchTerm, t]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredExpedients.length / ITEMS_PER_PAGE)
  );

  const paginatedExpedients = filteredExpedients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!selectedExpedient) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedExpedient(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedExpedient]);

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Expedient List" pageTitle="Expedients" />

        <Card className="border-0 shadow-sm">
          <CardBody>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
              <div>
                <h5 className="mb-1">{t("Expedient List")}</h5>
                <p className="text-muted mb-0">
                  {t("Latest registered expedients.")}
                </p>
              </div>

              <InputGroup style={{ maxWidth: "280px" }}>
                <InputGroupText>
                  <i className="ri-search-line" />
                </InputGroupText>
                <Input
                  placeholder={t("Search expedients...")}
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(1);
                  }}
                />
              </InputGroup>
            </div>

            {loading && (
              <div className="text-center my-5">
                <Spinner color="primary" />
              </div>
            )}

            {!loading && error && (
              <div className="text-center py-5">
                <div className="mb-2 text-danger">
                  <i className="ri-error-warning-line fs-2" />
                </div>
                <h6 className="mb-1">{t("Error loading expedients")}</h6>
                <p className="text-muted mb-0">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <>
                <div className="table-responsive">
                  <Table
                    className="table align-middle mb-0"
                    style={{ minWidth: "1760px" }}
                  >
                    <thead className="table-light">
                      <tr>
                        <th className="text-center" style={{ minWidth: "90px" }}>
                          ID
                        </th>
                        <th className="text-center" style={{ minWidth: "150px" }}>
                          {t("Invoice ID")}
                        </th>
                        <th className="text-center" style={{ minWidth: "150px" }}>
                          {t("Document Type")}
                        </th>
                        <th className="text-center" style={{ minWidth: "260px" }}>
                          {t("Supplier")}
                        </th>
                        <th className="text-center" style={{ minWidth: "130px" }}>
                          {t("Issue Date")}
                        </th>
                        <th className="text-center" style={{ minWidth: "130px" }}>
                          {t("Total")}
                        </th>
                        <th className="text-center" style={{ minWidth: "170px" }}>
                          {t("Order Number")}
                        </th>
                        <th className="text-center" style={{ minWidth: "150px" }}>
                          {t("Status")}
                        </th>
                        <th className="text-center">{t("Files")}</th>
                        <th className="text-center" style={{ minWidth: "340px" }}>
                          {t("Registered Documents")}
                        </th>
                        <th className="text-center" style={{ minWidth: "160px" }}>
                          {t("Created")}
                        </th>
                        <th className="text-center" style={{ minWidth: "160px" }}>
                          {t("Updated")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedExpedients.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="text-center py-4">
                            {t("No registered expedients were found.")}
                          </td>
                        </tr>
                      ) : (
                        paginatedExpedients.map((expedient) => {
                          const statusMeta = getExpedientStatusMeta(
                            expedient.estado,
                            t
                          );
                          const invoiceCode = getInvoiceCode(expedient.factura);
                          const invoiceType = getInvoiceTypeLabel(expedient.factura);
                          const purchaseOrderSupplier = getPurchaseOrderSupplierLabel(
                            expedient.ordencompra
                          );

                          return (
                            <tr key={expedient.expedienteid}>
                              <td className="fw-semibold text-center">
                                #{expedient.expedienteid}
                              </td>
                              <td style={{ whiteSpace: "normal" }} className="text-center">
                                <div className="fw-semibold">
                                  #
                                  {expedient.facturaid ??
                                    expedient.factura?.documentid ??
                                    "-"}
                                </div>
                                <div className="text-muted small">
                                  {invoiceCode || "-"}
                                </div>
                              </td>
                              <td className="text-center">
                                {invoiceType ? (
                                  <span className="badge rounded-pill bg-light text-body border px-3 py-2">
                                    {invoiceType}
                                  </span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td style={{ whiteSpace: "normal" }}>
                                <div className="fw-semibold">
                                  {expedient.factura?.suppliername ||
                                    purchaseOrderSupplier ||
                                    "-"}
                                </div>
                                <div className="text-muted small">
                                  {expedient.factura?.suppliernumber || "-"}
                                </div>
                              </td>
                              <td className="text-center">
                                {expedient.factura?.documentdate ? (
                                  <div className="fw-semibold">
                                    {moment(expedient.factura.documentdate).format(
                                      "DD/MM/YYYY"
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td className="text-end">
                                {expedient.factura ? (
                                  <>
                                    <div className="fw-semibold">
                                      {formatAmount(
                                        expedient.factura.totalamount,
                                        numberLocale
                                      )}
                                    </div>
                                    <div className="text-muted small">
                                      {expedient.factura.currency || "-"}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td style={{ whiteSpace: "normal" }} className="text-center">
                                <div className="fw-semibold">
                                  {expedient.ordencompra?.orderNo ||
                                    (expedient.ordencompraid
                                      ? `#${expedient.ordencompraid}`
                                      : "-")}
                                </div>
                                {expedient.ordencompra && (
                                  <>
                                    <div className="text-muted small">
                                      {expedient.ordencompra.documentAssociatedNo || "-"}
                                    </div>
                                    <div className="text-muted small">
                                      {expedient.ordencompra.guideNo || "-"}
                                    </div>
                                  </>
                                )}
                              </td>
                              <td className="text-center">
                                <span className={statusMeta.className}>
                                  <i className={statusMeta.icon} />
                                  <span>{statusMeta.label}</span>
                                </span>
                              </td>
                              <td className="text-center">
                                <Badge
                                  color="light"
                                  className="border text-body fw-semibold px-3 py-2"
                                >
                                  {expedient.expediente_documentos?.length || 0}
                                </Badge>
                              </td>
                              <td
                                className="text-center"
                                style={{ whiteSpace: "normal" }}
                              >
                                {expedient.expediente_documentos?.length ? (
                                  <Button
                                    color="primary"
                                    outline
                                    size="sm"
                                    className="text-nowrap"
                                    onClick={() => setSelectedExpedient(expedient)}
                                  >
                                    <i className="ri-file-list-3-line me-1" />
                                    {t("View documents")}
                                  </Button>
                                ) : (
                                  <span className="text-muted">
                                    {t("No files attached")}
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="fw-semibold">
                                  {moment(expedient.createat).format(
                                    "DD/MM/YYYY HH:mm"
                                  )}
                                </div>
                                {/* <div className="text-muted small">
                                  {expedient.createdby
                                    ? `${t("Created by")} #${expedient.createdby}`
                                    : "-"}
                                </div> */}
                              </td>
                              <td>
                                {expedient.updatedat ? (
                                  <>
                                    <div className="fw-semibold">
                                      {moment(expedient.updatedat).format(
                                        "DD/MM/YYYY HH:mm"
                                      )}
                                    </div>
                                    {/* <div className="text-muted small">
                                      {expedient.updatedby
                                        ? `${t("Updated by")} #${expedient.updatedby}`
                                        : "-"}
                                    </div> */}
                                  </>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="d-flex justify-content-center mt-4">
                    <Pagination>
                      <PaginationItem disabled={currentPage === 1}>
                        <PaginationLink
                          previous
                          onClick={() =>
                            setCurrentPage((page) => Math.max(page - 1, 1))
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, index) => (
                        <PaginationItem
                          key={index}
                          active={currentPage === index + 1}
                        >
                          <PaginationLink onClick={() => setCurrentPage(index + 1)}>
                            {index + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem disabled={currentPage === totalPages}>
                        <PaginationLink
                          next
                          onClick={() =>
                            setCurrentPage((page) =>
                              Math.min(page + 1, totalPages)
                            )
                          }
                        />
                      </PaginationItem>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </Container>

      <div
        className={`expedient-drawer-backdrop ${
          selectedExpedient ? "is-visible" : ""
        }`}
        onClick={() => setSelectedExpedient(null)}
      />

      <aside
        className={`expedient-drawer ${selectedExpedient ? "is-open" : ""}`}
        aria-hidden={!selectedExpedient}
      >
        <div className="expedient-drawer-shell">
          <div className="expedient-drawer-header">
            <div>
              <span className="expedient-drawer-kicker">
                {t("Registered Documents")}
              </span>
              <h4 className="mb-1">
                {t("Expedient #{{id}}", {
                  id: selectedExpedient?.expedienteid ?? "-",
                })}
              </h4>
              <p className="text-muted mb-0">
                {selectedExpedient
                  ? t("{{count}} files linked to this expedient.", {
                      count: selectedExpedient.expediente_documentos.length,
                    })
                  : ""}
              </p>
            </div>

            <button
              type="button"
              className="expedient-drawer-close"
              onClick={() => setSelectedExpedient(null)}
              aria-label={t("Close")}
            >
              <i className="ri-close-line" />
            </button>
          </div>

          <div className="expedient-drawer-body">
            {selectedExpedient?.expediente_documentos?.length ? (
              <div className="expedient-drawer-list">
                {selectedExpedient.expediente_documentos.map((file, index) => {
                  const fileUrl = getExpedientDocumentUrl(file.filepath);

                  return (
                    <a
                      key={file.expedientedocid}
                      href={fileUrl || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="expedient-document-card"
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <div className="expedient-document-card-icon">
                        <i className="ri-file-pdf-line" />
                      </div>

                      <div className="expedient-document-card-content">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                          <h6 className="mb-0 text-body">{file.filename}</h6>
                          <span className="badge rounded-pill bg-light text-body border">
                            {t("Type")} #{file.tipodocumentoid}
                          </span>
                        </div>

                        <div className="text-muted small mb-2">
                          {moment(file.createat).format("DD/MM/YYYY HH:mm")}
                        </div>

                        <div className="expedient-document-card-footer">
                          <span className="expedient-document-card-path">
                            {file.filepath}
                          </span>
                          <span className="expedient-document-card-link">
                            <i className="ri-external-link-line" />
                            {t("Open PDF")}
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="expedient-drawer-empty">
                <i className="ri-file-warning-line" />
                <h6 className="mb-1">{t("No files attached")}</h6>
                <p className="text-muted mb-0">
                  {t("No registered documents are available for this expedient.")}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Expedients;
