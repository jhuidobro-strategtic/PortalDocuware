import React, { useEffect, useState } from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  FormFeedback,
  Input,
  InputGroup,
  InputGroupText,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Pagination,
  PaginationItem,
  PaginationLink,
  Row,
  Spinner,
  Table,
} from "reactstrap";

import BreadCrumb from "../../Components/Common/BreadCrumb";
import FloatingAlerts, {
  FloatingAlertItem,
} from "../../Components/Common/FloatingAlerts";
import {
  buildFactilizaUrl,
  getFactilizaToken,
} from "../../helpers/external-api";

const SUPPLIERS_API_URL =
  "https://docuware-api-a09ab977636d.herokuapp.com/api/proveedores";

interface BankInfo {
  id: number;
  descripcion: string;
}

interface Supplier {
  supplierID: number;
  supplierNo: string;
  supplierName: string;
  address: string;
  phone: string;
  email: string;
  bank1: BankInfo | null;
  accountNo1: string;
  bank2: BankInfo | null;
  accountNo2: string;
  createdBy: number | null;
  createdAt: string;
  updatedBy: number | null;
  updatedAt: string;
}

interface SupplierFormValues {
  supplierNo: string;
  supplierName: string;
  address: string;
  phone: string;
  email: string;
  bank1: string;
  accountNo1: string;
  bank2: string;
  accountNo2: string;
}

type SupplierFormField = keyof SupplierFormValues;

type SupplierFormErrors = Partial<Record<SupplierFormField, string>>;

interface SessionUser {
  id: number | null;
  name: string;
}

interface FeedbackState {
  type: "success" | "danger" | "info";
  message: string;
}

const createEmptySupplierForm = (): SupplierFormValues => ({
  supplierNo: "",
  supplierName: "",
  address: "",
  phone: "",
  email: "",
  bank1: "",
  accountNo1: "",
  bank2: "",
  accountNo2: "",
});

const normalizeRuc = (value: string) => value.replace(/\D/g, "").slice(0, 11);

const getCurrentSessionUser = (): SessionUser => {
  try {
    const authUser = sessionStorage.getItem("authUser");
    if (!authUser) {
      return { id: null, name: "" };
    }

    const parsedUser = JSON.parse(authUser);
    const sessionData = parsedUser?.data || {};
    const parsedId = Number(
      sessionData?.userID ?? sessionData?.id ?? sessionData?.profileID ?? ""
    );

    return {
      id: Number.isFinite(parsedId) ? parsedId : null,
      name:
        sessionData?.fullname ||
        sessionData?.first_name ||
        sessionData?.username ||
        sessionData?.email ||
        "",
    };
  } catch {
    return { id: null, name: "" };
  }
};

const mapApiSupplier = (item: any): Supplier => ({
  supplierID: item.supplierid,
  supplierNo: item.supplierno ?? "",
  supplierName: item.suppliername ?? "",
  address: item.address ?? "",
  phone: item.phone ?? "",
  email: item.email ?? "",
  bank1: item.bank1
    ? { id: item.bank1.id, descripcion: item.bank1.descripcion }
    : null,
  accountNo1: item.accountno1 ?? "",
  bank2: item.bank2
    ? { id: item.bank2.id, descripcion: item.bank2.descripcion }
    : null,
  accountNo2: item.accountno2 ?? "",
  createdBy: item.createdby ?? null,
  createdAt: item.createdat ?? "",
  updatedBy: item.updatedby ?? null,
  updatedAt: item.updatedat ?? "",
});

const buildCreatePayload = (
  formValues: SupplierFormValues,
  userId: number | null
) => ({
  supplierno: formValues.supplierNo.trim(),
  suppliername: formValues.supplierName.trim(),
  address: formValues.address.trim(),
  phone: formValues.phone.trim(),
  email: formValues.email.trim(),
  bank1_id: formValues.bank1.trim() ? Number(formValues.bank1) : null,
  accountno1: formValues.accountNo1.trim(),
  bank2_id: formValues.bank2.trim() ? Number(formValues.bank2) : null,
  accountno2: formValues.accountNo2.trim(),
  createdby: userId,
  updatedby: userId,
});

const mapSupplierToFormValues = (supplier: Supplier): SupplierFormValues => ({
  supplierNo: supplier.supplierNo,
  supplierName: supplier.supplierName,
  address: supplier.address,
  phone: supplier.phone,
  email: supplier.email,
  bank1: supplier.bank1 ? String(supplier.bank1.id) : "",
  accountNo1: supplier.accountNo1,
  bank2: supplier.bank2 ? String(supplier.bank2.id) : "",
  accountNo2: supplier.accountNo2,
});

const parseOptionalNumber = (value: string) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && value.trim() !== "" ? parsedValue : null;
};

const formatAuditDate = (value: string) =>
  value ? moment(value).format("DD/MM/YYYY HH:mm") : "-";

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

const SuppliersPage = () => {
  const { t } = useTranslation();
  const sessionUser = getCurrentSessionUser();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formValues, setFormValues] = useState<SupplierFormValues>(
    createEmptySupplierForm()
  );
  const [formErrors, setFormErrors] = useState<SupplierFormErrors>({});
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isFetchingRuc, setIsFetchingRuc] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    document.title = `${t("Supplier List")} | Docuware`;
  }, [t]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const response = await fetch(SUPPLIERS_API_URL);
        const data = await response.json();
        if (!data.success || !Array.isArray(data.data)) {
          throw new Error(data.message || t("Error loading suppliers"));
        }
        setSuppliers(data.data.map(mapApiSupplier));
      } catch {
        setFeedback({
          type: "danger",
          message: t("Error loading suppliers"),
        });
      } finally {
        setLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
  }, [t]);

  const filteredSuppliers = suppliers.filter((supplier) => {
    const term = searchTerm.toLowerCase().trim();
    return !term || matchesSearchValue(supplier, term);
  });

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const floatingAlerts: FloatingAlertItem[] = [];

  if (feedback) {
    floatingAlerts.push({
      id: "suppliers-feedback",
      type: feedback.type,
      message: feedback.message,
      autoDismissMs:
        feedback.type === "success" || feedback.type === "info"
          ? 5000
          : undefined,
    });
  }

  const handleRemoveFloatingAlert = (alertId: string | number) => {
    if (alertId === "suppliers-feedback") {
      setFeedback(null);
    }
  };

  const resetFormState = () => {
    setFormValues(createEmptySupplierForm());
    setFormErrors({});
    setEditingSupplier(null);
  };

  const handleOpenCreateModal = () => {
    resetFormState();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormValues(mapSupplierToFormValues(supplier));
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetFormState();
  };

  const handleFormValueChange = (field: SupplierFormField, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: field === "supplierNo" ? normalizeRuc(value) : value,
    }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleLookupSupplierRuc = async () => {
    const normalizedRuc = normalizeRuc(formValues.supplierNo);

    if (normalizedRuc.length !== 11) {
      setFormErrors((prev) => ({
        ...prev,
        supplierNo: t("Enter a valid RUC"),
      }));
      return;
    }

    const factilizaToken = getFactilizaToken();

    if (!factilizaToken) {
      setFeedback({
        type: "danger",
        message: t("Factiliza token is not configured in the environment"),
      });
      return;
    }

    setIsFetchingRuc(true);

    try {
      const response = await fetch(
        buildFactilizaUrl(`ruc/info/${normalizedRuc}`),
        {
          headers: {
            Authorization: `Bearer ${factilizaToken}`,
          },
        }
      );
      const result = await response.json();
      const supplierData = result?.data;

      if (
        !response.ok ||
        !result?.success ||
        !supplierData?.nombre_o_razon_social
      ) {
        throw new Error(result?.message || t("RUC not found"));
      }

      setFormValues((prev) => ({
        ...prev,
        supplierNo: normalizedRuc,
        supplierName: supplierData.nombre_o_razon_social?.trim() || "",
        address: supplierData.direccion_completa?.trim() || "",
      }));
      setFormErrors((prev) => ({
        ...prev,
        supplierNo: undefined,
        supplierName: undefined,
      }));
      setFeedback({
        type: "success",
        message: t("RUC found successfully"),
      });
    } catch {
      setFeedback({
        type: "danger",
        message: t("Error consulting RUC or SUNAT"),
      });
    } finally {
      setIsFetchingRuc(false);
    }
  };

  const validateForm = () => {
    const nextErrors: SupplierFormErrors = {};
    const normalizedRuc = normalizeRuc(formValues.supplierNo);
    const normalizedEmail = formValues.email.trim();

    if (!normalizedRuc) {
      nextErrors.supplierNo = t("Complete the {{field}} field.", {
        field: t("RUC"),
      });
    } else if (normalizedRuc.length !== 11) {
      nextErrors.supplierNo = t("Enter a valid RUC");
    }

    if (!formValues.supplierName.trim()) {
      nextErrors.supplierName = t("Complete the {{field}} field.", {
        field: t("Supplier Name"),
      });
    }

    const duplicatedSupplierCode = suppliers.some(
      (supplier) =>
        supplier.supplierID !== editingSupplier?.supplierID &&
        normalizeRuc(supplier.supplierNo) === normalizedRuc
    );

    if (duplicatedSupplierCode) {
      nextErrors.supplierNo = t("A supplier with this RUC already exists.");
    }

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      nextErrors.email = t("Enter a valid email.");
    }

    if (formValues.bank1.trim() && !formValues.accountNo1.trim()) {
      nextErrors.accountNo1 = t("Complete the {{field}} field.", {
        field: t("Account No. 1"),
      });
    }

    if (!formValues.bank1.trim() && formValues.accountNo1.trim()) {
      nextErrors.bank1 = t("Complete the {{field}} field.", {
        field: t("Bank 1"),
      });
    }

    if (formValues.bank2.trim() && !formValues.accountNo2.trim()) {
      nextErrors.accountNo2 = t("Complete the {{field}} field.", {
        field: t("Account No. 2"),
      });
    }

    if (!formValues.bank2.trim() && formValues.accountNo2.trim()) {
      nextErrors.bank2 = t("Complete the {{field}} field.", {
        field: t("Bank 2"),
      });
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    if (editingSupplier) {
      const now = new Date().toISOString();
      setSuppliers((prev) =>
        prev.map((supplier) =>
          supplier.supplierID === editingSupplier.supplierID
            ? {
                ...supplier,
                supplierNo: normalizeRuc(formValues.supplierNo),
                supplierName: formValues.supplierName.trim(),
                address: formValues.address.trim(),
                phone: formValues.phone.trim(),
                email: formValues.email.trim(),
                bank1: formValues.bank1.trim()
                  ? {
                      id: parseOptionalNumber(formValues.bank1) as number,
                      descripcion: formValues.bank1.trim(),
                    }
                  : null,
                accountNo1: formValues.accountNo1.trim(),
                bank2: formValues.bank2.trim()
                  ? {
                      id: parseOptionalNumber(formValues.bank2) as number,
                      descripcion: formValues.bank2.trim(),
                    }
                  : null,
                accountNo2: formValues.accountNo2.trim(),
                updatedBy: sessionUser.id,
                updatedAt: now,
              }
            : supplier
        )
      );
      setFeedback({
        type: "success",
        message: t("Supplier updated successfully."),
      });
      handleCloseModal();
      return;
    }

    try {
      setSubmitting(true);
      const payload = buildCreatePayload(formValues, sessionUser.id);
      const response = await fetch(`${SUPPLIERS_API_URL}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || t("Error registering supplier"));
      }

      const newSupplier = mapApiSupplier(data.data ?? data);
      setSuppliers((prev) => [newSupplier, ...prev]);
      setFeedback({
        type: "success",
        message: data?.message || t("Supplier registered successfully."),
      });
      handleCloseModal();
      setCurrentPage(1);
    } catch (err: any) {
      setFeedback({
        type: "danger",
        message: err.message || t("Error registering supplier"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderBankCell = (bank: BankInfo | null, accountNo: string) => {
    if (!bank && !accountNo) {
      return <span className="text-muted">-</span>;
    }

    return (
      <div>
        <span className="badge bg-light text-secondary border mb-2">
          {bank ? bank.descripcion : "-"}
        </span>
        <div className="text-muted small">{accountNo || "-"}</div>
      </div>
    );
  };

  const renderAuditCell = (
    dateValue: string,
    userId: number | null,
    labelKey: string
  ) => (
    <div>
      <div className="fw-medium">{formatAuditDate(dateValue)}</div>
      <div className="text-muted small">
        {t(labelKey)}: {userId ? `#${userId}` : "-"}
      </div>
    </div>
  );

  return (
    <div className="page-content">
      <Container fluid>
        <FloatingAlerts
          alerts={floatingAlerts}
          onRemove={handleRemoveFloatingAlert}
        />

        <BreadCrumb title="Supplier List" pageTitle="Suppliers" />

        <Card className="border-0 shadow-sm">
          <CardBody className="p-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
              <div className="flex-grow-1">
                <h5 className="mb-1">{t("Supplier List")}</h5>
              </div>

              <div className="d-flex flex-column flex-sm-row align-items-stretch gap-2 flex-shrink-0">
                <InputGroup style={{ width: "320px", maxWidth: "100%" }}>
                  <InputGroupText>
                    <i className="ri-search-line" />
                  </InputGroupText>
                  <Input
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={t("Search suppliers...")}
                  />
                </InputGroup>

                <Button
                  color="primary"
                  onClick={handleOpenCreateModal}
                  className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
                >
                  <i className="ri-add-line align-bottom me-1" />
                  {t("New Supplier")}
                </Button>
              </div>
            </div>

            {loadingSuppliers ? (
              <div className="text-center py-5">
                <Spinner color="primary" />
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "90px" }}>ID</th>
                        <th style={{ width: "140px" }}>{t("RUC")}</th>
                        <th>{t("Supplier")}</th>
                        <th style={{ width: "220px" }}>{t("Contact")}</th>
                        <th style={{ width: "220px" }}>{t("Bank 1")}</th>
                        <th style={{ width: "220px" }}>{t("Bank 2")}</th>
                        <th style={{ width: "190px" }}>{t("Created")}</th>
                        <th style={{ width: "190px" }}>{t("Updated")}</th>
                        <th style={{ width: "120px" }} className="text-center">
                          {t("Actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSuppliers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-4">
                            {t("No suppliers were found.")}
                          </td>
                        </tr>
                      ) : (
                        paginatedSuppliers.map((supplier) => (
                          <tr key={supplier.supplierID}>
                            <td>#{supplier.supplierID}</td>
                            <td className="fw-semibold">{supplier.supplierNo}</td>
                            <td>
                              <div className="fw-semibold">
                                {supplier.supplierName}
                              </div>
                              <div className="text-muted small">
                                {supplier.address || "-"}
                              </div>
                            </td>
                            <td>
                              <div>{supplier.phone || "-"}</div>
                              <div className="text-muted small">
                                {supplier.email || "-"}
                              </div>
                            </td>
                            <td>
                              {renderBankCell(supplier.bank1, supplier.accountNo1)}
                            </td>
                            <td>
                              {renderBankCell(supplier.bank2, supplier.accountNo2)}
                            </td>
                            <td>
                              {renderAuditCell(
                                supplier.createdAt,
                                supplier.createdBy,
                                "Created by"
                              )}
                            </td>
                            <td>
                              {renderAuditCell(
                                supplier.updatedAt,
                                supplier.updatedBy,
                                "Updated by"
                              )}
                            </td>
                            <td className="text-center">
                              <Button
                                color="warning"
                                outline
                                size="sm"
                                onClick={() => handleOpenEditModal(supplier)}
                              >
                                <i className="ri-edit-box-line align-bottom me-1" />
                                {t("Edit")}
                              </Button>
                            </td>
                          </tr>
                        ))
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
                          <PaginationLink
                            onClick={() => setCurrentPage(index + 1)}
                          >
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

        <Modal isOpen={isModalOpen} toggle={handleCloseModal} size="lg" centered>
          <Form onSubmit={handleSubmit}>
            <ModalHeader toggle={handleCloseModal}>
              {editingSupplier ? t("Edit Supplier") : t("New Supplier")}
            </ModalHeader>
            <ModalBody className="p-4">
              <div className="mb-4">
                <h6 className="text-uppercase text-muted mb-3">
                  {t("General Information")}
                </h6>
                <Row className="g-4">
                  <Col md={6}>
                    <Label className="form-label">{t("RUC")}</Label>
                    <InputGroup>
                      <Input
                        value={formValues.supplierNo}
                        onChange={(event) =>
                          handleFormValueChange("supplierNo", event.target.value)
                        }
                        invalid={Boolean(formErrors.supplierNo)}
                        placeholder="20600045521"
                        inputMode="numeric"
                        maxLength={11}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleLookupSupplierRuc();
                          }
                        }}
                      />
                      <Button
                        color="primary"
                        type="button"
                        onClick={handleLookupSupplierRuc}
                        disabled={isFetchingRuc}
                      >
                        {isFetchingRuc ? (
                          <span
                            className="spinner-border spinner-border-sm align-middle me-1"
                            aria-hidden="true"
                          />
                        ) : (
                          <i className="ri-search-line align-bottom me-1" />
                        )}
                        {isFetchingRuc ? t("Searching RUC...") : t("Search RUC")}
                      </Button>
                    </InputGroup>
                    {formErrors.supplierNo && (
                      <FormFeedback className="d-block">
                        {formErrors.supplierNo}
                      </FormFeedback>
                    )}
                    <div className="form-text">
                      {t(
                        "Use the RUC to auto-fill the supplier name and full address."
                      )}
                    </div>
                  </Col>
                  <Col md={6}>
                    <Label className="form-label">{t("Supplier Name")}</Label>
                    <Input
                      readOnly
                      className="bg-light"
                      value={formValues.supplierName}
                      invalid={Boolean(formErrors.supplierName)}
                      placeholder={t("Enter the supplier name")}
                    />
                    {formErrors.supplierName && (
                      <FormFeedback>{formErrors.supplierName}</FormFeedback>
                    )}
                    <div className="form-text">
                      {t(
                        "It is completed automatically with the supplier name returned by the RUC query."
                      )}
                    </div>
                  </Col>
                  <Col md={12}>
                    <Label className="form-label">{t("Address")}</Label>
                    <Input
                      type="textarea"
                      rows={3}
                      readOnly
                      className="bg-light"
                      value={formValues.address}
                      placeholder={t("Enter the supplier address")}
                    />
                    <div className="form-text">
                      {t(
                        "It is completed automatically with the full address returned by the RUC query."
                      )}
                    </div>
                  </Col>
                  <Col md={6}>
                    <Label className="form-label">{t("Phone")}</Label>
                    <Input
                      value={formValues.phone}
                      onChange={(event) =>
                        handleFormValueChange("phone", event.target.value)
                      }
                      placeholder={t("Enter the phone number")}
                    />
                  </Col>
                  <Col md={6}>
                    <Label className="form-label">{t("Email")}</Label>
                    <Input
                      value={formValues.email}
                      onChange={(event) =>
                        handleFormValueChange("email", event.target.value)
                      }
                      invalid={Boolean(formErrors.email)}
                      placeholder={t("Enter the email")}
                    />
                    {formErrors.email && (
                      <FormFeedback>{formErrors.email}</FormFeedback>
                    )}
                  </Col>
                </Row>
              </div>

              <div className="border-top pt-4">
                <h6 className="text-uppercase text-muted mb-3">
                  {t("Bank Accounts")}
                </h6>
                <Row className="g-4">
                  <Col md={3}>
                    <Label className="form-label">{t("Bank 1")}</Label>
                    <Input
                      type="number"
                      value={formValues.bank1}
                      onChange={(event) =>
                        handleFormValueChange("bank1", event.target.value)
                      }
                      invalid={Boolean(formErrors.bank1)}
                      placeholder="1"
                    />
                    {formErrors.bank1 && (
                      <FormFeedback>{formErrors.bank1}</FormFeedback>
                    )}
                  </Col>
                  <Col md={9}>
                    <Label className="form-label">{t("Account No. 1")}</Label>
                    <Input
                      value={formValues.accountNo1}
                      onChange={(event) =>
                        handleFormValueChange("accountNo1", event.target.value)
                      }
                      invalid={Boolean(formErrors.accountNo1)}
                      placeholder={t("Enter the account number")}
                    />
                    {formErrors.accountNo1 && (
                      <FormFeedback>{formErrors.accountNo1}</FormFeedback>
                    )}
                  </Col>
                  <Col md={3}>
                    <Label className="form-label">{t("Bank 2")}</Label>
                    <Input
                      type="number"
                      value={formValues.bank2}
                      onChange={(event) =>
                        handleFormValueChange("bank2", event.target.value)
                      }
                      invalid={Boolean(formErrors.bank2)}
                      placeholder="2"
                    />
                    {formErrors.bank2 && (
                      <FormFeedback>{formErrors.bank2}</FormFeedback>
                    )}
                  </Col>
                  <Col md={9}>
                    <Label className="form-label">{t("Account No. 2")}</Label>
                    <Input
                      value={formValues.accountNo2}
                      onChange={(event) =>
                        handleFormValueChange("accountNo2", event.target.value)
                      }
                      invalid={Boolean(formErrors.accountNo2)}
                      placeholder={t("Enter the account number")}
                    />
                    {formErrors.accountNo2 && (
                      <FormFeedback>{formErrors.accountNo2}</FormFeedback>
                    )}
                  </Col>
                </Row>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="light" type="button" onClick={handleCloseModal}>
                {t("Cancel")}
              </Button>
              <Button color="primary" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner size="sm" className="me-1" />
                    {t("Saving...")}
                  </>
                ) : (
                  t("Save")
                )}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </Container>
    </div>
  );
};

export default SuppliersPage;
