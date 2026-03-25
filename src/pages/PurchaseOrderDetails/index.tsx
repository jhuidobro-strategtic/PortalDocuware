import React, { useEffect, useState } from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardBody,
  Container,
  Input,
  InputGroup,
  InputGroupText,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Pagination,
  PaginationItem,
  PaginationLink,
  Spinner,
  Table,
} from "reactstrap";

import BreadCrumb from "../../Components/Common/BreadCrumb";
import FloatingAlerts, {
  FloatingAlertItem,
} from "../../Components/Common/FloatingAlerts";
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

interface CatalogItem {
  id: number;
  descripcion: string;
}

interface SupplierReference {
  supplierid: number;
  supplierno?: string;
  suppliername?: string;
}

const getDocumentAssociatedNo = (document: Document) =>
  [document.documentserial, document.documentnumber].filter(Boolean).join("-");

const mapCatalogLookup = (items: CatalogItem[]) =>
  items.reduce((acc: Record<number, string>, item) => {
    acc[item.id] = item.descripcion;
    return acc;
  }, {});

const mapSupplierLookup = (items: SupplierReference[]) =>
  items.reduce((acc: Record<number, string>, item) => {
    const label =
      [item.supplierno, item.suppliername].filter(Boolean).join(" - ") ||
      String(item.supplierid);

    acc[item.supplierid] = label;
    return acc;
  }, {});

const getLookupLabel = (lookup: Record<number, string>, value: number) =>
  lookup[value] || String(value ?? "-");

const getCurrencyMeta = (
  currency: number,
  t: (key: string) => string,
  currencyLabel?: string
) => {
  switch (currency) {
    case 1:
    case 3:
      return {
        label: currencyLabel || "PEN",
        alt: "Peru",
        imageUrl: "https://flagcdn.com/w40/pe.png",
      };
    case 2:
    case 4:
      return {
        label: currencyLabel || "USD",
        alt: "USA",
        imageUrl: "https://flagcdn.com/w40/us.png",
      };
    default:
      return {
        label: currencyLabel || String(currency ?? "-"),
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
  const [supplierLookup, setSupplierLookup] = useState<Record<number, string>>({});
  const [paymentConditionLookup, setPaymentConditionLookup] = useState<
    Record<number, string>
  >({});
  const [currencyLookup, setCurrencyLookup] = useState<Record<number, string>>({});
  const [storeLookup, setStoreLookup] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [generatingOrderId, setGeneratingOrderId] = useState<number | null>(null);
  const [orderModal, setOrderModal] = useState<PurchaseOrder | null>(null);
  const [selectedState, setSelectedState] = useState<0 | 1 | 2>(1);
  const [confirmingState, setConfirmingState] = useState(false);

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

    const supplierLabel = getLookupLabel(
      supplierLookup,
      purchaseOrder.supplierID
    ).toLowerCase();
    const paymentConditionLabel = getLookupLabel(
      paymentConditionLookup,
      purchaseOrder.paymentCondition
    ).toLowerCase();
    const currencyLabel = getCurrencyMeta(
      purchaseOrder.currency,
      t,
      currencyLookup[purchaseOrder.currency]
    ).label.toLowerCase();
    const storeLabel = getLookupLabel(storeLookup, purchaseOrder.store).toLowerCase();

    return (
      matchesSearchValue(purchaseOrder, term) ||
      supplierLabel.includes(term) ||
      paymentConditionLabel.includes(term) ||
      currencyLabel.includes(term) ||
      storeLabel.includes(term) ||
      getCurrencyMeta(
        purchaseOrder.currency,
        t,
        currencyLookup[purchaseOrder.currency]
      ).label.toLowerCase().includes(term) ||
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
  const floatingAlerts: FloatingAlertItem[] = [];

  if (error) {
    floatingAlerts.push({
      id: "purchase-orders-error",
      type: "danger",
      message: error,
    });
  }

  if (actionError) {
    floatingAlerts.push({
      id: "purchase-orders-action-error",
      type: "danger",
      message: actionError,
    });
  }

  const handleOpenOrderModal = (purchaseOrder: PurchaseOrder) => {
    setSelectedState(1);
    setActionError(null);
    setOrderModal(purchaseOrder);
  };

  const handleCloseOrderModal = () => {
    if (confirmingState) return;
    setOrderModal(null);
  };

  const handleRemoveFloatingAlert = (alertId: string | number) => {
    if (alertId === "purchase-orders-error") {
      setError(null);
      return;
    }

    if (alertId === "purchase-orders-action-error") {
      setActionError(null);
    }
  };

  const handleConfirmOrderState = async () => {
    if (!orderModal) return;

    try {
      setConfirmingState(true);
      setActionError(null);

      // TODO: llamar API para actualizar estado cuando esté disponible
      // await fetch(buildApiUrl(`purchase-orders/${orderModal.purchaseOrderID}/state`), {
      //   method: "PATCH",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ purchaseState: selectedState }),
      // });

      if (selectedState === 1) {
        setGeneratingOrderId(orderModal.purchaseOrderID);
        setOrderModal(null);

        await generatePurchaseOrderPdf({
          purchaseOrder: { ...orderModal, purchaseState: selectedState },
          relatedDocument:
            documentsByAssociatedNo[orderModal.documentAssociatedNo] ?? null,
          numberLocale,
        });
      } else {
        setOrderModal(null);
      }
    } catch (generateError: any) {
      setActionError(
        generateError?.message || t("Unable to generate the PDF for this order.")
      );
      setOrderModal(null);
    } finally {
      setGeneratingOrderId(null);
      setConfirmingState(false);
    }
  };

  useEffect(() => {
    document.title = `${t("Purchase Order Details")} | Docuware`;

    const fetchPurchaseOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        setActionError(null);

        const [
          purchaseOrdersResponse,
          documentsResponse,
          suppliersResponse,
          paymentConditionResponse,
          currencyResponse,
          storeResponse,
        ] = await Promise.all([
          fetch(buildApiUrl("purchase-orders/")),
          fetch(buildApiUrl("documents")),
          fetch(buildApiUrl("proveedores")),
          fetch(buildApiUrl("catalogos/?tipo_catalogo=PAYMENT_CONDITION")),
          fetch(buildApiUrl("catalogos/?tipo_catalogo=MONEY")),
          fetch(buildApiUrl("catalogos/?tipo_catalogo=STORE_WAREHOUSE")),
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
        const suppliersData = await suppliersResponse.json().catch(() => null);
        const paymentConditionData = await paymentConditionResponse
          .json()
          .catch(() => null);
        const currencyData = await currencyResponse.json().catch(() => null);
        const storeData = await storeResponse.json().catch(() => null);

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

        if (
          suppliersResponse.ok &&
          suppliersData?.success &&
          Array.isArray(suppliersData?.data)
        ) {
          setSupplierLookup(mapSupplierLookup(suppliersData.data));
        } else {
          setSupplierLookup({});
        }

        if (
          paymentConditionResponse.ok &&
          paymentConditionData?.success &&
          Array.isArray(paymentConditionData?.data)
        ) {
          setPaymentConditionLookup(mapCatalogLookup(paymentConditionData.data));
        } else {
          setPaymentConditionLookup({});
        }

        if (
          currencyResponse.ok &&
          currencyData?.success &&
          Array.isArray(currencyData?.data)
        ) {
          setCurrencyLookup(mapCatalogLookup(currencyData.data));
        } else {
          setCurrencyLookup({});
        }

        if (
          storeResponse.ok &&
          storeData?.success &&
          Array.isArray(storeData?.data)
        ) {
          setStoreLookup(mapCatalogLookup(storeData.data));
        } else {
          setStoreLookup({});
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
          <FloatingAlerts
            alerts={floatingAlerts}
            onRemove={handleRemoveFloatingAlert}
          />
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
                            t,
                            currencyLookup[purchaseOrder.currency]
                          );
                          const purchaseState = getPurchaseStateMeta(
                            purchaseOrder.purchaseState,
                            t
                          );
                          const supplierLabel = getLookupLabel(
                            supplierLookup,
                            purchaseOrder.supplierID
                          );
                          const paymentConditionLabel = getLookupLabel(
                            paymentConditionLookup,
                            purchaseOrder.paymentCondition
                          );
                          const storeLabel = getLookupLabel(
                            storeLookup,
                            purchaseOrder.store
                          );

                          return (
                            <tr key={purchaseOrder.purchaseOrderID}>
                              <td>#{purchaseOrder.purchaseOrderID}</td>
                              <td>{purchaseOrder.orderNo}</td>
                              <td>{supplierLabel}</td>
                              <td>{purchaseOrder.documentAssociatedNo}</td>
                              <td>{paymentConditionLabel}</td>
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
                              <td>{storeLabel}</td>
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
                                  onClick={() => handleOpenOrderModal(purchaseOrder)}
                                >
                                  {generatingOrderId ===
                                  purchaseOrder.purchaseOrderID ? (
                                    <>
                                      <Spinner size="sm" className="me-2" />
                                      {t("Generating...")}
                                    </>
                                  ) : (
                                    <>
                                      <i className="ri-file-text-line me-1" />
                                      {t("Generate Order C.")}
                                    </>
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
      <Modal isOpen={!!orderModal} toggle={handleCloseOrderModal} centered size="sm">
        <ModalHeader toggle={handleCloseOrderModal} className="border-bottom-0 pb-0">
          <span className="fs-6 fw-semibold">{t("Generate Order C.")}</span>
          {orderModal && (
            <div className="text-muted fw-normal" style={{ fontSize: "0.75rem" }}>
              {orderModal.orderNo}
            </div>
          )}
        </ModalHeader>

        <ModalBody className="pt-2 pb-3">
          <p className="text-muted mb-3" style={{ fontSize: "0.82rem" }}>
            {t("Select the status to assign to this purchase order.")}
          </p>

          <div className="d-flex flex-column gap-2">
            {(
              [
                {
                  value: 1 as const,
                  icon: "ri-checkbox-circle-line",
                  colorClass: "success",
                  label: t("Approved"),
                  description: t("Generates the PDF of the purchase order."),
                },
                {
                  value: 0 as const,
                  icon: "ri-time-line",
                  colorClass: "warning",
                  label: t("Pending"),
                  description: t("Leaves the order pending review."),
                },
                {
                  value: 2 as const,
                  icon: "ri-close-circle-line",
                  colorClass: "danger",
                  label: t("Rejected"),
                  description: t("Rejects the purchase order."),
                },
              ] as const
            ).map((option) => {
              const isSelected = selectedState === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedState(option.value)}
                  className={`d-flex align-items-center gap-3 rounded-3 border p-2 text-start bg-transparent w-100 transition-all ${
                    isSelected
                      ? `border-${option.colorClass} bg-${option.colorClass}-subtle`
                      : "border-light"
                  }`}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    className={`d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 ${
                      isSelected
                        ? `bg-${option.colorClass} text-white`
                        : `text-${option.colorClass} bg-${option.colorClass}-subtle`
                    }`}
                    style={{ width: 36, height: 36 }}
                  >
                    <i className={`${option.icon} fs-5`} />
                  </div>
                  <div className="flex-grow-1">
                    <div className={`fw-semibold text-${option.colorClass}`} style={{ fontSize: "0.85rem" }}>
                      {option.label}
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                      {option.description}
                    </div>
                  </div>
                  {isSelected && (
                    <i className={`ri-check-line text-${option.colorClass} fs-5 flex-shrink-0`} />
                  )}
                </button>
              );
            })}
          </div>
        </ModalBody>

        <ModalFooter className="border-top-0 pt-0 gap-2">
          <Button
            color="light"
            size="sm"
            onClick={handleCloseOrderModal}
            disabled={confirmingState}
          >
            {t("Cancel")}
          </Button>
          <Button
            color={selectedState === 1 ? "success" : selectedState === 2 ? "danger" : "warning"}
            size="sm"
            onClick={handleConfirmOrderState}
            disabled={confirmingState}
          >
            {confirmingState ? (
              <>
                <Spinner size="sm" className="me-1" />
                {t("Processing...")}
              </>
            ) : selectedState === 1 ? (
              <>
                <i className="ri-file-download-line me-1" />
                {t("Approve & Generate")}
              </>
            ) : (
              t("Confirm")
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default PurchaseOrderDetails;
