import React, { useEffect, useState } from "react";
import moment from "moment";
import {
  Alert,
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

const formatAmount = (value: string | number) =>
  Number(value || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getOrderTotal = (details: PurchaseOrderDetail[]) =>
  details.reduce((sum, detail) => sum + Number(detail.total || 0), 0);

const getCurrencyMeta = (currency: number) => {
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
        alt: "Moneda",
        imageUrl: null,
      };
  }
};

const getPurchaseStateMeta = (purchaseState: number) => {
  switch (purchaseState) {
    case 1:
      return {
        label: "APROBADO",
        className:
          "badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        icon: "ri-checkbox-circle-line",
      };
    case 2:
      return {
        label: "RECHAZADO",
        className:
          "badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 d-inline-flex align-items-center gap-1",
        icon: "ri-close-circle-line",
      };
    case 0:
    default:
      return {
        label: "PENDIENTE",
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
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;
  const filteredPurchaseOrders = purchaseOrders.filter((purchaseOrder) => {
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
      return true;
    }

    return (
      matchesSearchValue(purchaseOrder, term) ||
      getCurrencyMeta(purchaseOrder.currency).label.toLowerCase().includes(term) ||
      getPurchaseStateMeta(purchaseOrder.purchaseState).label
        .toLowerCase()
        .includes(term)
    );
  });

  const totalPages = Math.ceil(filteredPurchaseOrders.length / itemsPerPage);
  const paginatedPurchaseOrders = filteredPurchaseOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    document.title = "Detalle de Orden de Compra | Docuware";

    const fetchPurchaseOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch(buildApiUrl("purchase-orders"));
        const data = await response.json();

        if (!data?.success || !Array.isArray(data?.data)) {
          throw new Error(
            data?.message || "No fue posible obtener las ordenes de compra."
          );
        }

        setPurchaseOrders(data.data);
      } catch (fetchError: any) {
        setError(
          fetchError?.message ||
            "Ocurrio un error al cargar el detalle de ordenes de compra."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseOrders();
  }, []);

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            title="Detalle de Orden de Compra"
            pageTitle="Ordenes de Compra"
          />

          <Card className="border-0 shadow-sm">
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                  <h5 className="mb-1">Listado de Ordenes de Compra</h5>
                  <p className="text-muted mb-0">
                    Últimas ordenes registradas.
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <InputGroup style={{ maxWidth: "280px" }}>
                    <InputGroupText>
                      <i className="ri-search-line" />
                    </InputGroupText>
                    <Input
                      placeholder="Buscar..."
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

              {!loading && !error && (
                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Orden</th>
                        <th>Supplier ID</th>
                        <th>Doc. Asociado</th>
                        <th>Cond. Pago</th>
                        <th>Moneda</th>
                        <th>Guia</th>
                        <th>Almacen</th>
                        <th>Estado</th>
                        <th>Creado por</th>
                        <th>Fecha</th>
                        <th className="text-center">Items</th>
                        <th className="text-end">Total Orden</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPurchaseOrders.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="text-center">
                            No se encontraron ordenes de compra registradas.
                          </td>
                        </tr>
                      ) : (
                        paginatedPurchaseOrders.map((purchaseOrder) => {
                          const currency = getCurrencyMeta(
                            purchaseOrder.currency
                          );
                          const purchaseState = getPurchaseStateMeta(
                            purchaseOrder.purchaseState
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
