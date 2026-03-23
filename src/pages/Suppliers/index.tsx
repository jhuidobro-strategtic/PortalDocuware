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
  Table,
} from "reactstrap";

import BreadCrumb from "../../Components/Common/BreadCrumb";
import FloatingAlerts, {
  FloatingAlertItem,
} from "../../Components/Common/FloatingAlerts";

const SUPPLIERS_STORAGE_KEY = "suppliers-local-data";

interface Supplier {
  supplierID: number;
  supplierNo: string;
  supplierName: string;
  address: string;
  phone: string;
  email: string;
  bank1: number | null;
  accountNo1: string;
  bank2: number | null;
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

const buildInitialSuppliers = (createdBy: number | null): Supplier[] => [
  {
    supplierID: 1,
    supplierNo: "PRV-0001",
    supplierName: "TCC MOTORS S.A.",
    address: "Av. Javier Prado Este 410, San Isidro",
    phone: "987654321",
    email: "proveedores@tccmotors.pe",
    bank1: 1,
    accountNo1: "001-458796321",
    bank2: 2,
    accountNo2: "191-000258741",
    createdBy,
    createdAt: "2026-03-20T09:15:00.000Z",
    updatedBy: createdBy,
    updatedAt: "2026-03-20T09:15:00.000Z",
  },
  {
    supplierID: 2,
    supplierNo: "PRV-0002",
    supplierName: "Servicios Integrales del Norte S.A.C.",
    address: "Mz. B Lt. 12 Parque Industrial, Trujillo",
    phone: "944221133",
    email: "contacto@sinorte.com",
    bank1: 3,
    accountNo1: "003-987456123",
    bank2: null,
    accountNo2: "",
    createdBy,
    createdAt: "2026-03-18T14:20:00.000Z",
    updatedBy: createdBy,
    updatedAt: "2026-03-21T10:05:00.000Z",
  },
  {
    supplierID: 3,
    supplierNo: "PRV-0003",
    supplierName: "Transportes y Repuestos del Sur E.I.R.L.",
    address: "Calle Los Talleres 245, Arequipa",
    phone: "956778899",
    email: "ventas@trsureirl.pe",
    bank1: 4,
    accountNo1: "004-775544221",
    bank2: 5,
    accountNo2: "005-112233445",
    createdBy,
    createdAt: "2026-03-15T08:45:00.000Z",
    updatedBy: createdBy,
    updatedAt: "2026-03-22T16:30:00.000Z",
  },
];

const loadStoredSuppliers = (createdBy: number | null): Supplier[] => {
  try {
    const storedSuppliers = localStorage.getItem(SUPPLIERS_STORAGE_KEY);
    if (!storedSuppliers) {
      return buildInitialSuppliers(createdBy);
    }

    const parsedSuppliers = JSON.parse(storedSuppliers);
    return Array.isArray(parsedSuppliers)
      ? parsedSuppliers
      : buildInitialSuppliers(createdBy);
  } catch {
    return buildInitialSuppliers(createdBy);
  }
};

const mapSupplierToFormValues = (supplier: Supplier): SupplierFormValues => ({
  supplierNo: supplier.supplierNo,
  supplierName: supplier.supplierName,
  address: supplier.address,
  phone: supplier.phone,
  email: supplier.email,
  bank1: supplier.bank1 ? String(supplier.bank1) : "",
  accountNo1: supplier.accountNo1,
  bank2: supplier.bank2 ? String(supplier.bank2) : "",
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
  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    loadStoredSuppliers(sessionUser.id)
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formValues, setFormValues] = useState<SupplierFormValues>(
    createEmptySupplierForm()
  );
  const [formErrors, setFormErrors] = useState<SupplierFormErrors>({});
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    document.title = `${t("Supplier List")} | Docuware`;
  }, [t]);

  useEffect(() => {
    localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(suppliers));
  }, [suppliers]);

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
      autoDismissMs: feedback.type === "success" || feedback.type === "info"
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

  const handleFormValueChange = (
    field: SupplierFormField,
    value: string
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const nextErrors: SupplierFormErrors = {};
    const normalizedCode = formValues.supplierNo.trim().toLowerCase();
    const normalizedEmail = formValues.email.trim();

    if (!formValues.supplierNo.trim()) {
      nextErrors.supplierNo = t("Complete the {{field}} field.", {
        field: t("Supplier Code"),
      });
    }

    if (!formValues.supplierName.trim()) {
      nextErrors.supplierName = t("Complete the {{field}} field.", {
        field: t("Supplier Name"),
      });
    }

    const duplicatedSupplierCode = suppliers.some(
      (supplier) =>
        supplier.supplierID !== editingSupplier?.supplierID &&
        supplier.supplierNo.trim().toLowerCase() === normalizedCode
    );

    if (duplicatedSupplierCode) {
      nextErrors.supplierNo = t("A supplier with this code already exists.");
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    const now = new Date().toISOString();

    if (editingSupplier) {
      setSuppliers((prev) =>
        prev.map((supplier) =>
          supplier.supplierID === editingSupplier.supplierID
            ? {
                ...supplier,
                ...{
                  supplierNo: formValues.supplierNo.trim(),
                  supplierName: formValues.supplierName.trim(),
                  address: formValues.address.trim(),
                  phone: formValues.phone.trim(),
                  email: formValues.email.trim(),
                  bank1: parseOptionalNumber(formValues.bank1),
                  accountNo1: formValues.accountNo1.trim(),
                  bank2: parseOptionalNumber(formValues.bank2),
                  accountNo2: formValues.accountNo2.trim(),
                  updatedBy: sessionUser.id,
                  updatedAt: now,
                },
              }
            : supplier
        )
      );

      setFeedback({
        type: "success",
        message: t("Local supplier updated successfully."),
      });
    } else {
      const nextSupplierId =
        suppliers.reduce(
          (maxSupplierId, supplier) =>
            Math.max(maxSupplierId, supplier.supplierID),
          0
        ) + 1;

      const newSupplier: Supplier = {
        supplierID: nextSupplierId,
        supplierNo: formValues.supplierNo.trim(),
        supplierName: formValues.supplierName.trim(),
        address: formValues.address.trim(),
        phone: formValues.phone.trim(),
        email: formValues.email.trim(),
        bank1: parseOptionalNumber(formValues.bank1),
        accountNo1: formValues.accountNo1.trim(),
        bank2: parseOptionalNumber(formValues.bank2),
        accountNo2: formValues.accountNo2.trim(),
        createdBy: sessionUser.id,
        createdAt: now,
        updatedBy: sessionUser.id,
        updatedAt: now,
      };

      setSuppliers((prev) => [newSupplier, ...prev]);
      setFeedback({
        type: "success",
        message: t("Local supplier registered successfully."),
      });
    }

    handleCloseModal();
    setCurrentPage(1);
  };

  const renderBankCell = (bank: number | null, accountNo: string) => {
    if (!bank && !accountNo) {
      return <span className="text-muted">-</span>;
    }

    return (
      <div>
        <span className="badge bg-light text-secondary border mb-2">
          {t("Bank")}: {bank ?? "-"}
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
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
              <div>
                <h5 className="mb-1">{t("Supplier List")}</h5>
                <p className="text-muted mb-0">
                  {t(
                    "There is no supplier API yet. This screen uses local data for layout and validation."
                  )}
                </p>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-2">
                <InputGroup style={{ maxWidth: "320px" }}>
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

                <Button color="primary" onClick={handleOpenCreateModal}>
                  <i className="ri-add-line align-bottom me-1" />
                  {t("New Supplier")}
                </Button>
              </div>
            </div>

            <div className="table-responsive">
              <Table className="table align-middle table-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "90px" }}>ID</th>
                    <th style={{ width: "140px" }}>{t("Code")}</th>
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
                          <div className="fw-semibold">{supplier.supplierName}</div>
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
                        <td>{renderBankCell(supplier.bank1, supplier.accountNo1)}</td>
                        <td>{renderBankCell(supplier.bank2, supplier.accountNo2)}</td>
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
                    <Label className="form-label">{t("Supplier Code")}</Label>
                    <Input
                      value={formValues.supplierNo}
                      onChange={(event) =>
                        handleFormValueChange("supplierNo", event.target.value)
                      }
                      invalid={Boolean(formErrors.supplierNo)}
                      placeholder="PRV-0001"
                    />
                    {formErrors.supplierNo && (
                      <FormFeedback>{formErrors.supplierNo}</FormFeedback>
                    )}
                  </Col>
                  <Col md={6}>
                    <Label className="form-label">{t("Supplier Name")}</Label>
                    <Input
                      value={formValues.supplierName}
                      onChange={(event) =>
                        handleFormValueChange("supplierName", event.target.value)
                      }
                      invalid={Boolean(formErrors.supplierName)}
                      placeholder={t("Enter the supplier name")}
                    />
                    {formErrors.supplierName && (
                      <FormFeedback>{formErrors.supplierName}</FormFeedback>
                    )}
                  </Col>
                  <Col md={12}>
                    <Label className="form-label">{t("Address")}</Label>
                    <Input
                      type="textarea"
                      rows={3}
                      value={formValues.address}
                      onChange={(event) =>
                        handleFormValueChange("address", event.target.value)
                      }
                      placeholder={t("Enter the supplier address")}
                    />
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

              <div className="border-top pt-4 mb-4">
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

              <div className="border-top pt-4">
                <h6 className="text-uppercase text-muted mb-3">
                  {t("Audit Information")}
                </h6>
                <Row className="g-4">
                  <Col md={6}>
                    <Label className="form-label">{t("Created by")}</Label>
                    <Input
                      readOnly
                      className="bg-light"
                      value={
                        editingSupplier?.createdBy
                          ? `#${editingSupplier.createdBy}`
                          : sessionUser.id
                            ? `#${sessionUser.id}`
                            : "-"
                      }
                    />
                  </Col>
                  <Col md={6}>
                    <Label className="form-label">{t("Created on")}</Label>
                    <Input
                      readOnly
                      className="bg-light"
                      value={
                        editingSupplier
                          ? formatAuditDate(editingSupplier.createdAt)
                          : formatAuditDate(new Date().toISOString())
                      }
                    />
                  </Col>
                  <Col md={6}>
                    <Label className="form-label">{t("Updated by")}</Label>
                    <Input
                      readOnly
                      className="bg-light"
                      value={
                        editingSupplier?.updatedBy
                          ? `#${editingSupplier.updatedBy}`
                          : sessionUser.id
                            ? `#${sessionUser.id}`
                            : "-"
                      }
                    />
                  </Col>
                  <Col md={6}>
                    <Label className="form-label">{t("Updated on")}</Label>
                    <Input
                      readOnly
                      className="bg-light"
                      value={
                        editingSupplier
                          ? formatAuditDate(editingSupplier.updatedAt)
                          : formatAuditDate(new Date().toISOString())
                      }
                    />
                  </Col>
                </Row>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="light" type="button" onClick={handleCloseModal}>
                {t("Cancel")}
              </Button>
              <Button color="primary" type="submit">
                {t("Save")}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </Container>
    </div>
  );
};

export default SuppliersPage;
