import React, { useEffect, useState } from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import {
  Alert,
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

import BreadCrumb from "../../Components/Common/BreadCrumb";
import { buildApiUrl } from "../../helpers/api-url";
import { getNumberLocale } from "../../common/locale";
import { Document } from "../Documents/types";
import { generatePurchaseOrderPdf } from "./purchaseOrderPdf";

interface PurchaseOrderDetail {
  purchaseDetailID: number;
  descriptionItem: string;
  quantity: number;
  unitPrice: string;
  total: string;
  createdBy: number;
  createAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
  purchaseOrderID: number;
}

interface PurchaseOrder {
  purchaseOrderID: number;
  orderNo: string;
  supplierID: number;
  documentAssociatedType: number;
  documentAssociatedNo: string;
  paymentCondition: number;
  currency: number;
  guideNo: string;
  store: number;
  purchaseState: number;
  createdBy: number;
  createAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
  details: PurchaseOrderDetail[];
}

const getDocumentAssociatedNo = (document: Document) =>
  [document.documentserial, document.documentnumber].filter(Boolean).join("-");

const getCurrencyMeta = (currency: number, t: (key: string) => string) => {
  switch (currency) {
    case 1:
      return {
        label: "PEN",
        alt: "Peru",
        imageUrl: "https://flagcdn.com/w40/pe.png",
      };
    case 2:
      return {
        label: "USD",
        alt: "USA",
        imageUrl: "https://flagcdn.com/w40/us.png",
      };
    default:
      return {
        label: String(currency ?? "-"),
        alt: t("Currency"),
        imageUrl: null,
      };
  }
};

const getPurchaseStateMeta = (
  purchaseState: number,
  t: (key: string) => string
) => {
  switch (purchaseState) {
    case 1:
      return {
        label: t("Approved"),
        className:
          "badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        icon: "ri-checkbox-circle-line",
      };
    case 2:
      return {
        label: t("Rejected"),
        className:
          "badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        icon: "ri-close-circle-line",
      };
    case 0:
    default:
      return {
        label: t("Pending"),
        className:
          "badge rounded-pill bg-warning-subtle text-warning border border-warning-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        icon: "ri-time-line",
      };
  }
};

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
      return parsedDate.format("DD/MM/YYYY").toLowerCase().includes(term);
    }
  }

  return false;
};

const PurchaseOrderDetails = () => {
  const { t, i18n } = useTranslation();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [documentsByAssociatedNo, setDocumentsByAssociatedNo] = useState<
    Record<string, Document>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [generatingOrderId, setGeneratingOrderId] = useState<number | null>(
    null
  );

  const numberLocale = getNumberLocale(i18n.language);
  const formatAmount = (value: string | number) =>
    Number(value || 0).toLocaleString(numberLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getOrderTotal = (details: PurchaseOrderDetail[]) =>
    details.reduce((sum, detail) => sum + Number(detail.total || 0), 0);

  const itemsPerPage = 10;
  const filteredPurchaseOrders = purchaseOrders.filter((purchaseOrder) => {
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
      return true;
    }

    return (
      matchesSearchValue(purchaseOrder, term) ||
      getCurrencyMeta(purchaseOrder.currency, t).label.toLowerCase().includes(term) ||
      getPurchaseStateMeta(purchaseOrder.purchaseState, t).label
        .toLowerCase()
        .includes(term)
    );
  });

  const totalPages = Math.ceil(filteredPurchaseOrders.length / itemsPerPage);
  const paginatedPurchaseOrders = filteredPurchaseOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleGeneratePdf = async (purchaseOrder: PurchaseOrder) => {
    try {
      setActionError(null);
      setGeneratingOrderId(purchaseOrder.purchaseOrderID);

      await generatePurchaseOrderPdf({
        purchaseOrder,
        relatedDocument:
          documentsByAssociatedNo[purchaseOrder.documentAssociatedNo] ?? null,
        numberLocale,
      });
    } catch (generateError: any) {
      setActionError(
        generateError?.message || t("Unable to generate the PDF for this order.")
      );
    } finally {
      setGeneratingOrderId(null);
    }
  };

  useEffect(() => {
    document.title = `${t("Purchase Order Details")} | Docuware`;

    const fetchPurchaseOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        setActionError(null);

        const [purchaseOrdersResponse, documentsResponse] = await Promise.all([
          fetch(buildApiUrl("purchase-orders/")),
          fetch(buildApiUrl("documents")),
        ]);
        const purchaseOrdersData = await purchaseOrdersResponse
          .json()
          .catch(() => null);

        if (
          !purchaseOrdersResponse.ok ||
          !purchaseOrdersData?.success ||
          !Array.isArray(purchaseOrdersData?.data)
        ) {
          throw new Error(
            purchaseOrdersData?.message || t("Unable to get purchase orders.")
          );
        }

        setPurchaseOrders(purchaseOrdersData.data);

        const documentsData = await documentsResponse.json().catch(() => null);

        if (
          documentsResponse.ok &&
          documentsData?.success &&
          Array.isArray(documentsData?.data)
        ) {
          const indexedDocuments = documentsData.data.reduce(
            (acc: Record<string, Document>, document: Document) => {
              const associatedNo = getDocumentAssociatedNo(document);

              if (associatedNo) {
                acc[associatedNo] = document;
              }

              return acc;
            },
            {}
          );

          setDocumentsByAssociatedNo(indexedDocuments);
        } else {
          setDocumentsByAssociatedNo({});
        }
      } catch (fetchError: any) {
        setError(
          fetchError?.message ||
            t("An error occurred while loading purchase order details.")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseOrders();
  }, [t]);

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            title="Purchase Order Details"
            pageTitle="Purchase Orders"
          />

          <Card className="border-0 shadow-sm">
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                  <h5 className="mb-1">{t("Purchase Order List")}</h5>
                  <p className="text-muted mb-0">
                    {t("Latest registered orders.")}
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <InputGroup style={{ maxWidth: "280px" }}>
                    <InputGroupText>
                      <i className="ri-search-line" />
                    </InputGroupText>
                    <Input
                      placeholder={t("Search...")}
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </InputGroup>
                </div>
              </div>

              {loading && (
                <div className="text-center my-5">
                  <Spinner color="primary" />
                </div>
              )}

              {!loading && error && <Alert color="danger">{error}</Alert>}
              {!loading && !error && actionError && (
                <Alert color="danger">{actionError}</Alert>
              )}

              {!loading && !error && (
                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>{t("Order Number")}</th>
                        <th>{t("Supplier ID")}</th>
                        <th>{t("Associated Doc.")}</th>
                        <th>{t("Payment Cond.")}</th>
                        <th>{t("Currency")}</th>
                        <th>{t("Guide")}</th>
                        <th>{t("Warehouse")}</th>
                        <th>{t("Status")}</th>
                        <th>{t("Created by")}</th>
                        <th>{t("Date")}</th>
                        <th className="text-center">{t("Items")}</th>
                        <th className="text-end">{t("Order Total")}</th>
                        <th className="text-center">{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPurchaseOrders.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="text-center">
                            {t("No registered purchase orders were found.")}
                          </td>
                        </tr>
                      ) : (
                        paginatedPurchaseOrders.map((purchaseOrder) => {
                          const currency = getCurrencyMeta(
                            purchaseOrder.currency,
                            t
                          );
                          const purchaseState = getPurchaseStateMeta(
                            purchaseOrder.purchaseState,
                            t
                          );

                          return (
                            <tr key={purchaseOrder.purchaseOrderID}>
                              <td>#{purchaseOrder.purchaseOrderID}</td>
                              <td>{purchaseOrder.orderNo}</td>
                              <td>{purchaseOrder.supplierID}</td>
                              <td>{purchaseOrder.documentAssociatedNo}</td>
                              <td>{purchaseOrder.paymentCondition}</td>
                              <td>
                                <div className="d-inline-flex align-items-center gap-2 px-2 py-1 rounded-pill bg-light border">
                                  {currency.imageUrl && (
                                    <img
                                      src={currency.imageUrl}
                                      alt={currency.alt}
                                      width={20}
                                      height={15}
                                      className="rounded-1 flex-shrink-0"
                                    />
                                  )}
                                  <span className="fw-semibold text-body">
                                    {currency.label}
                                  </span>
                                </div>
                              </td>
                              <td>{purchaseOrder.guideNo}</td>
                              <td>{purchaseOrder.store}</td>
                              <td>
                                <span className={purchaseState.className}>
                                  <i className={purchaseState.icon} />
                                  <span>{purchaseState.label}</span>
                                </span>
                              </td>
                              <td>{purchaseOrder.createdBy}</td>
                              <td>
                                {moment(purchaseOrder.createAt).format(
                                  "DD/MM/YYYY"
                                )}
                              </td>
                              <td className="text-center">
                                {purchaseOrder.details.length}
                              </td>
                              <td className="text-end fw-semibold">
                                {formatAmount(
                                  getOrderTotal(purchaseOrder.details)
                                )}
                              </td>
                              <td className="text-center">
                                <Button
                                  color="primary"
                                  size="sm"
                                  outline
                                  disabled={
                                    generatingOrderId ===
                                    purchaseOrder.purchaseOrderID
                                  }
                                  onClick={() => handleGeneratePdf(purchaseOrder)}
                                >
                                  {generatingOrderId ===
                                  purchaseOrder.purchaseOrderID ? (
                                    <>
                                      <Spinner size="sm" className="me-2" />
                                      {t("Generating...")}
                                    </>
                                  ) : (
                                    t("Generate Order C.")
                                  )}
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </Table>
                </div>
              )}

              {!loading && !error && totalPages > 1 && (
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
            </CardBody>
          </Card>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default PurchaseOrderDetails;
