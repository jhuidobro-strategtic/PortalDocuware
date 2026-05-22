import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Select from "react-select";
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
  Row,
  Spinner,
  Table,
} from "reactstrap";

import AppPagination from "../../../components/common/Pagination";
import BreadCrumb from "../../../components/common/BreadCrumb";
import FloatingAlerts from "../../../components/common/FloatingAlerts";
import type { FloatingAlertItem } from "../../../components/common/FloatingAlerts";
import TableActionsMenu from "../../../components/common/TableActionsMenu";
import { buildApiUrl } from "../../../helpers/api-url";
import { downloadBlob } from "../../../helpers/download-blob";
import LogoDocuware from "../../../assets/images/LogoDocuware.png";

type SelectOption = { value: string; label: string };

interface UserProfileReference {
  profileID: number;
  profileName: string;
}

interface UserItem {
  userID: number;
  userName: string;
  fullName: string;
  status: boolean;
  profileID: number;
  profile: UserProfileReference | null;
}

interface UserFormValues {
  username: string;
  fullname: string;
  password: string;
  profileId: string;
}

type UserFormField = keyof UserFormValues;
type UserFormErrors = Partial<Record<UserFormField, string>>;

interface FeedbackState {
  type: "success" | "danger" | "info";
  message: string;
}

const ITEMS_PER_PAGE = 10;
const DEFAULT_PROFILE_OPTIONS: SelectOption[] = [
  { value: "1", label: "SUPERADMIN" },
  { value: "2", label: "ADMINISTRADOR" },
  { value: "3", label: "GESTOR DE DOCUMENTOS" },
];

const createEmptyUserForm = (): UserFormValues => ({
  username: "",
  fullname: "",
  password: "",
  profileId: "",
});

const mapApiUser = (item: any): UserItem => ({
  userID: Number(item.userID ?? item.userid ?? 0),
  userName: String(item.userName ?? item.username ?? "").trim(),
  fullName: String(item.fullName ?? item.fullname ?? "").trim(),
  status: Boolean(item.status),
  profileID: Number(item.profileID ?? item.profile_id ?? item.profile?.profileID ?? 0),
  profile: item.profile
    ? {
        profileID: Number(item.profile.profileID ?? item.profile.profile_id ?? 0),
        profileName: String(item.profile.profileName ?? item.profile.profile_name ?? "").trim(),
      }
    : null,
});

const getStatusMeta = (
  status: boolean,
  t: (key: string) => string
) =>
  status
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

const buildRegisterPayload = (formValues: UserFormValues) => ({
  username: formValues.username.trim(),
  fullname: formValues.fullname.trim(),
  password: formValues.password,
  profile_id: Number(formValues.profileId),
});

const buildProfileOptions = (users: UserItem[]): SelectOption[] => {
  const profilesMap = new Map<string, string>();

  users.forEach((user) => {
    const profileId = String(user.profileID || user.profile?.profileID || "");
    const profileLabel =
      user.profile?.profileName || (profileId ? `Perfil ${profileId}` : "");

    if (profileId && profileLabel && !profilesMap.has(profileId)) {
      profilesMap.set(profileId, profileLabel);
    }
  });

  const resolvedOptions = Array.from(profilesMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label, "es"));

  return resolvedOptions.length > 0 ? resolvedOptions : DEFAULT_PROFILE_OPTIONS;
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

  return String(value).toLowerCase().includes(term);
};

const UsersPage = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormValues, setCreateFormValues] = useState<UserFormValues>(
    createEmptyUserForm()
  );
  const [createFormErrors, setCreateFormErrors] = useState<UserFormErrors>({});
  const [creatingUser, setCreatingUser] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editPasswordError, setEditPasswordError] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [userPendingDisable, setUserPendingDisable] = useState<UserItem | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  const profileOptions = useMemo(() => buildProfileOptions(users), [users]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch(buildApiUrl("users/"), {
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !Array.isArray(data?.data)) {
        throw new Error(data?.message || t("Error loading users"));
      }

      setUsers((data.data as any[]).map(mapApiUser));
    } catch (fetchError: any) {
      setFeedback({
        type: "danger",
        message: fetchError?.message || t("Error loading users"),
      });
    } finally {
      setLoadingUsers(false);
    }
  }, [t]);

  useEffect(() => {
    document.title = `${t("User List")} | Docuware`;
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedTerm = searchTerm.toLowerCase().trim();

    if (!normalizedTerm) {
      return users;
    }

    return users.filter((user) => matchesSearchValue(user, normalizedTerm));
  }, [searchTerm, users]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const floatingAlerts: FloatingAlertItem[] = [];

  if (feedback) {
    floatingAlerts.push({
      id: "users-feedback",
      type: feedback.type,
      message: feedback.message,
      autoDismissMs:
        feedback.type === "success" || feedback.type === "info" ? 5000 : undefined,
    });
  }

  const handleRemoveFloatingAlert = (alertId: string | number) => {
    if (alertId === "users-feedback") {
      setFeedback(null);
    }
  };

  const resetCreateForm = () => {
    setCreateFormValues(createEmptyUserForm());
    setCreateFormErrors({});
  };

  const handleOpenCreateModal = () => {
    resetCreateForm();
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    if (creatingUser) {
      return;
    }

    setIsCreateModalOpen(false);
    resetCreateForm();
  };

  const handleCreateFormValueChange = (field: UserFormField, value: string) => {
    setCreateFormValues((prev) => ({ ...prev, [field]: value }));
    setCreateFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateCreateForm = () => {
    const nextErrors: UserFormErrors = {};

    if (!createFormValues.username.trim()) {
      nextErrors.username = t("Complete the {{field}} field.", {
        field: t("Username"),
      });
    }

    if (!createFormValues.fullname.trim()) {
      nextErrors.fullname = t("Complete the {{field}} field.", {
        field: t("Full Name"),
      });
    }

    if (!createFormValues.password.trim()) {
      nextErrors.password = t("Complete the {{field}} field.", {
        field: t("Password"),
      });
    }

    if (!createFormValues.profileId.trim()) {
      nextErrors.profileId = t("Complete the {{field}} field.", {
        field: t("Profile"),
      });
    }

    return nextErrors;
  };

  const handleSubmitCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateCreateForm();

    if (Object.keys(nextErrors).length > 0) {
      setCreateFormErrors(nextErrors);
      return;
    }

    try {
      setCreatingUser(true);
      const response = await fetch(buildApiUrl("users/register/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRegisterPayload(createFormValues)),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false || data?.error) {
        throw new Error(data?.message || data?.error || t("Could not register user."));
      }

      await fetchUsers();
      setCurrentPage(1);
      setFeedback({
        type: "success",
        message: data?.message || t("User registered successfully."),
      });
      handleCloseCreateModal();
    } catch (submitError: any) {
      setFeedback({
        type: "danger",
        message: submitError?.message || t("Could not register user."),
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleOpenEditModal = (user: UserItem) => {
    setEditingUser(user);
    setEditPassword("");
    setEditPasswordError("");
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    if (updatingPassword) {
      return;
    }

    setIsEditModalOpen(false);
    setEditingUser(null);
    setEditPassword("");
    setEditPasswordError("");
  };

  const handleSubmitPasswordUpdate = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!editingUser) {
      return;
    }

    if (!editPassword.trim()) {
      setEditPasswordError(
        t("Complete the {{field}} field.", { field: t("New Password") })
      );
      return;
    }

    try {
      setUpdatingPassword(true);
      const response = await fetch(buildApiUrl("users/update-password/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userid: editingUser.userID,
          password: editPassword,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || t("Could not update the user password."));
      }

      setFeedback({
        type: "success",
        message: data?.message || t("User password updated successfully."),
      });
      handleCloseEditModal();
    } catch (submitError: any) {
      setFeedback({
        type: "danger",
        message: submitError?.message || t("Could not update the user password."),
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleOpenDisableModal = (user: UserItem) => {
    setUserPendingDisable(user);
    setIsDisableModalOpen(true);
  };

  const handleCloseDisableModal = () => {
    setIsDisableModalOpen(false);
    setUserPendingDisable(null);
  };

  const handleConfirmDisable = () => {
    setFeedback({
      type: "info",
      message: t(
        "The backend does not expose an endpoint to disable users yet. The action menu is ready to connect it when available."
      ),
    });
    handleCloseDisableModal();
  };

  const exportToExcel = async () => {
    try {
      setExportingExcel(true);
      const { Workbook } = await import("exceljs");
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet("Usuarios");

      try {
        const response = await fetch(LogoDocuware);
        const imageBuffer = await response.arrayBuffer();
        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension: "png",
        });

        worksheet.addImage(imageId, "B1:D2");
      } catch {
        // The export should remain available even if the logo cannot be embedded.
      }

      worksheet.mergeCells("E1:J2");
      const titleCell = worksheet.getCell("E1");
      titleCell.value = "REPORTE DE USUARIOS";
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      titleCell.font = { size: 14, bold: true };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "D9E1F2" },
      };

      ["A1", "A2", "B1", "C1", "D1", "B2", "C2", "D2"].forEach((cell) => {
        worksheet.getCell(cell).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "D9E1F2" },
        };
      });

      const headers = [
        "ID",
        "Usuario",
        "Nombre Completo",
        "Perfil",
        "Estado",
      ];

      headers.forEach((header, index) => {
        const cell = worksheet.getCell(3, index + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F2F2F2" },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      filteredUsers.forEach((user) => {
        const row = worksheet.addRow([
          user.userID,
          user.userName || "-",
          user.fullName || "-",
          user.profile?.profileName || `Perfil ${user.profileID || "-"}`,
          user.status ? "Activo" : "Inactivo",
        ]);

        row.eachCell((cell, columnNumber) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          if (columnNumber === 5) {
            cell.font = {
              color: { argb: user.status ? "008000" : "FF0000" },
              bold: true,
            };
          }
        });
      });

      worksheet.columns = [
        { width: 10 },
        { width: 32 },
        { width: 38 },
        { width: 24 },
        { width: 18 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      await downloadBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `Usuarios_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}.xlsx`
      );
    } catch (exportError) {
      console.error("Error exporting users to Excel:", exportError);
      setFeedback({
        type: "danger",
        message: t("Could not export Excel file"),
      });
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <FloatingAlerts
          alerts={floatingAlerts}
          onRemove={handleRemoveFloatingAlert}
        />

        <BreadCrumb title="User List" pageTitle="User Management" />

        <Card className="border-0 shadow-sm">
          <CardBody className="p-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
              <div className="flex-grow-1">
                <h5 className="mb-1">{t("User List")}</h5>
                <p className="text-muted mb-0">
                  {t("Latest registered users.")}
                </p>
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
                    placeholder={t("Search users...")}
                  />
                </InputGroup>

                <Button
                  color="success"
                  onClick={exportToExcel}
                  disabled={exportingExcel}
                  className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
                >
                  {exportingExcel ? (
                    <>
                      <Spinner size="sm" className="me-1" />
                      {t("Processing...")}
                    </>
                  ) : (
                    <>
                      <i className="ri-file-excel-2-line align-bottom me-1" />
                      {t("Export Excel")}
                    </>
                  )}
                </Button>

                <Button
                  color="primary"
                  onClick={handleOpenCreateModal}
                  className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
                >
                  <i className="ri-add-line align-bottom me-1" />
                  {t("New User")}
                </Button>
              </div>
            </div>

            {loadingUsers ? (
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
                        <th style={{ width: "320px" }}>{t("Username")}</th>
                        <th>{t("Full Name")}</th>
                        <th style={{ width: "220px" }}>{t("Profile")}</th>
                        <th style={{ width: "160px" }}>{t("Status")}</th>
                        <th style={{ width: "120px" }} className="text-center">
                          {t("Actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4">
                            {t("No users were found.")}
                          </td>
                        </tr>
                      ) : (
                        paginatedUsers.map((user) => {
                          const statusMeta = getStatusMeta(user.status, t);

                          return (
                            <tr key={user.userID}>
                              <td>#{user.userID}</td>
                              <td className="fw-semibold">
                                {user.userName || "-"}
                              </td>
                              <td>{user.fullName || "-"}</td>
                              <td>
                                <span className="badge bg-light text-secondary border px-3 py-2">
                                  {user.profile?.profileName ||
                                    `Perfil ${user.profileID || "-"}`}
                                </span>
                              </td>
                              <td>
                                <span className={statusMeta.className}>
                                  <i className={statusMeta.icon} />
                                  <span>{statusMeta.label}</span>
                                </span>
                              </td>
                              <td className="text-center">
                                <TableActionsMenu
                                  items={[
                                    {
                                      id: `edit-${user.userID}`,
                                      label: t("Edit"),
                                      icon: "ri-edit-line",
                                      tone: "neutral",
                                      onClick: () => handleOpenEditModal(user),
                                    },
                                    {
                                      id: `disable-${user.userID}`,
                                      label: t("Disable"),
                                      icon: "ri-user-unfollow-line",
                                      tone: "danger",
                                      disabled: !user.status,
                                      onClick: () => handleOpenDisableModal(user),
                                    },
                                  ]}
                                />
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
                    <AppPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>

        <Modal
          isOpen={isCreateModalOpen}
          toggle={handleCloseCreateModal}
          size="lg"
          centered
        >
          <Form onSubmit={handleSubmitCreate}>
            <ModalHeader toggle={handleCloseCreateModal}>
              {t("New User")}
            </ModalHeader>
            <ModalBody className="p-4">
              <Row className="g-4">
                <Col md={6}>
                  <Label className="form-label">{t("Username")}</Label>
                  <Input
                    value={createFormValues.username}
                    onChange={(event) =>
                      handleCreateFormValueChange("username", event.target.value)
                    }
                    invalid={Boolean(createFormErrors.username)}
                    placeholder={t("Enter username or email")}
                  />
                  {createFormErrors.username && (
                    <FormFeedback>{createFormErrors.username}</FormFeedback>
                  )}
                </Col>
                <Col md={6}>
                  <Label className="form-label">{t("Full Name")}</Label>
                  <Input
                    value={createFormValues.fullname}
                    onChange={(event) =>
                      handleCreateFormValueChange("fullname", event.target.value)
                    }
                    invalid={Boolean(createFormErrors.fullname)}
                    placeholder={t("Enter full name")}
                  />
                  {createFormErrors.fullname && (
                    <FormFeedback>{createFormErrors.fullname}</FormFeedback>
                  )}
                </Col>
                <Col md={6}>
                  <Label className="form-label">{t("Password")}</Label>
                  <Input
                    type="password"
                    value={createFormValues.password}
                    onChange={(event) =>
                      handleCreateFormValueChange("password", event.target.value)
                    }
                    invalid={Boolean(createFormErrors.password)}
                    placeholder={t("Enter password")}
                  />
                  {createFormErrors.password && (
                    <FormFeedback>{createFormErrors.password}</FormFeedback>
                  )}
                </Col>
                <Col md={6}>
                  <Label className="form-label">{t("Profile")}</Label>
                  <Select
                    options={profileOptions}
                    value={
                      profileOptions.find(
                        (option) => option.value === createFormValues.profileId
                      ) ?? null
                    }
                    onChange={(selected: SelectOption | null) =>
                      handleCreateFormValueChange(
                        "profileId",
                        selected ? selected.value : ""
                      )
                    }
                    placeholder={t("Select profile")}
                    classNamePrefix="select2-selection"
                  />
                  {createFormErrors.profileId && (
                    <div className="text-danger small mt-1">
                      {createFormErrors.profileId}
                    </div>
                  )}
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter>
              <Button color="light" type="button" onClick={handleCloseCreateModal}>
                {t("Cancel")}
              </Button>
              <Button color="primary" type="submit" disabled={creatingUser}>
                {creatingUser ? (
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

        <Modal
          isOpen={isEditModalOpen}
          toggle={handleCloseEditModal}
          centered
        >
          <Form onSubmit={handleSubmitPasswordUpdate}>
            <ModalHeader toggle={handleCloseEditModal}>
              {t("Edit User")}
            </ModalHeader>
            <ModalBody className="p-4">
              <div className="alert alert-info mb-4">
                {t(
                  "The backend currently allows updating the password from this view."
                )}
              </div>

              <Row className="g-4">
                <Col md={12}>
                  <Label className="form-label">{t("Username")}</Label>
                  <Input value={editingUser?.userName || ""} readOnly className="bg-light" />
                </Col>
                <Col md={12}>
                  <Label className="form-label">{t("Full Name")}</Label>
                  <Input value={editingUser?.fullName || ""} readOnly className="bg-light" />
                </Col>
                <Col md={12}>
                  <Label className="form-label">{t("Profile")}</Label>
                  <Input
                    value={editingUser?.profile?.profileName || ""}
                    readOnly
                    className="bg-light"
                  />
                </Col>
                <Col md={12}>
                  <Label className="form-label">{t("New Password")}</Label>
                  <Input
                    type="password"
                    value={editPassword}
                    onChange={(event) => {
                      setEditPassword(event.target.value);
                      setEditPasswordError("");
                    }}
                    invalid={Boolean(editPasswordError)}
                    placeholder={t("Enter new password")}
                  />
                  {editPasswordError && (
                    <FormFeedback>{editPasswordError}</FormFeedback>
                  )}
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter>
              <Button color="light" type="button" onClick={handleCloseEditModal}>
                {t("Cancel")}
              </Button>
              <Button color="primary" type="submit" disabled={updatingPassword}>
                {updatingPassword ? (
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

        <Modal
          isOpen={isDisableModalOpen}
          toggle={handleCloseDisableModal}
          centered
        >
          <ModalHeader toggle={handleCloseDisableModal}>
            {t("Disable User")}
          </ModalHeader>
          <ModalBody>
            <p className="mb-0">
              {t("Are you sure you want to disable user {{name}}?", {
                name:
                  userPendingDisable?.fullName ||
                  userPendingDisable?.userName ||
                  `#${String(userPendingDisable?.userID ?? "")}`,
              })}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={handleCloseDisableModal}>
              {t("Cancel")}
            </Button>
            <Button color="danger" onClick={handleConfirmDisable}>
              {t("Disable")}
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
    </div>
  );
};

export default UsersPage;
