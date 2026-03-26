import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import {
  Badge,
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
        label: t("Active"),
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

const getPurchaseOrderStateLabel = (purchaseOrder?: ExpedientPurchaseOrder | null) => {
  if (!purchaseOrder || typeof purchaseOrder.purchaseState === "number") {
    return "";
  }

  return String(purchaseOrder.purchaseState?.descripcion ?? "").trim();
};

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

const Expedients = () => {
  const { t } = useTranslation();
  const [expedients, setExpedients] = useState<Expedient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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
                  <Table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>{t("Invoice ID")}</th>
                        <th>{t("Purchase Order ID")}</th>
                        <th>{t("Status")}</th>
                        <th className="text-center">{t("Files")}</th>
                        <th style={{ minWidth: "340px" }}>
                          {t("Registered Documents")}
                        </th>
                        <th>{t("Created")}</th>
                        <th>{t("Updated")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedExpedients.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-4">
                            {t("No registered expedients were found.")}
                          </td>
                        </tr>
                      ) : (
                        paginatedExpedients.map((expedient) => {
                          const statusMeta = getExpedientStatusMeta(
                            expedient.estado,
                            t
                          );

                          return (
                            <tr key={expedient.expedienteid}>
                              <td className="fw-semibold">
                                #{expedient.expedienteid}
                              </td>
                              <td style={{ whiteSpace: "normal" }}>
                                <div className="fw-semibold">
                                  #{expedient.facturaid ?? expedient.factura?.documentid ?? "-"}
                                </div>
                                {expedient.factura && (
                                  <>
                                    <div className="text-muted small">
                                      {[getInvoiceTypeLabel(expedient.factura), getInvoiceCode(expedient.factura)]
                                        .filter(Boolean)
                                        .join(" - ") || "-"}
                                    </div>
                                    <div className="text-muted small">
                                      {expedient.factura.suppliername || expedient.factura.suppliernumber || "-"}
                                    </div>
                                  </>
                                )}
                              </td>
                              <td style={{ whiteSpace: "normal" }}>
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
                                      {getPurchaseOrderSupplierLabel(
                                        expedient.ordencompra
                                      ) || "-"}
                                    </div>
                                    <div className="text-muted small">
                                      {getPurchaseOrderStateLabel(
                                        expedient.ordencompra
                                      ) || "-"}
                                    </div>
                                  </>
                                )}
                              </td>
                              <td>
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
                              <td style={{ whiteSpace: "normal" }}>
                                {expedient.expediente_documentos?.length ? (
                                  <div className="d-flex flex-column gap-2">
                                    {expedient.expediente_documentos.map((file) => {
                                      const fileUrl = getExpedientDocumentUrl(
                                        file.filepath
                                      );

                                      return (
                                        <a
                                          key={file.expedientedocid}
                                          href={fileUrl || undefined}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="d-inline-flex align-items-start gap-2 text-decoration-none"
                                        >
                                          <i className="ri-file-pdf-line text-danger fs-5" />
                                          <span>
                                            <span className="d-block fw-semibold text-body">
                                              {file.filename}
                                            </span>
                                          </span>
                                        </a>
                                      );
                                    })}
                                  </div>
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
                                <div className="text-muted small">
                                  {expedient.createdby
                                    ? `${t("Created by")} #${expedient.createdby}`
                                    : "-"}
                                </div>
                              </td>
                              <td>
                                {expedient.updatedat ? (
                                  <>
                                    <div className="fw-semibold">
                                      {moment(expedient.updatedat).format(
                                        "DD/MM/YYYY HH:mm"
                                      )}
                                    </div>
                                    <div className="text-muted small">
                                      {expedient.updatedby
                                        ? `${t("Updated by")} #${expedient.updatedby}`
                                        : "-"}
                                    </div>
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
    </div>
  );
};

export default Expedients;
