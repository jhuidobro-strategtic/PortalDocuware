import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  Container,
  FormFeedback,
  Input,
  Label,
  Spinner,
} from "reactstrap";

import BreadCrumb from "../../../../components/common/BreadCrumb";
import FloatingAlerts, {
  FloatingAlertItem,
} from "../../../../components/common/FloatingAlerts";
import { useDeviceMode } from "../hooks/useDeviceMode";
import { useMyScheduleDetailController } from "../hooks/useMyScheduleDetailController";
import { formatAmount } from "../shared/formatters";
import { CreateExpenseVoucherInput, FeedbackState } from "../shared/types";
import { scanExpenseVoucherQr } from "../utils/expenseVoucherQr";
import "../styles/myScheduleApp.scss";

interface ExpenseVoucherFormValues {
  amount: string;
  documentType: string;
  photoUrl: string;
  seriesNumber: string;
  supplierRuc: string;
  voucherNumber: string;
}

type ExpenseVoucherFormErrors = Partial<Record<keyof ExpenseVoucherFormValues, string>>;

interface VoucherQrScanState {
  message: string;
  tone: "success" | "danger" | "info";
}

const createInitialExpenseVoucherValues = (
  amount = ""
): ExpenseVoucherFormValues => ({
  amount,
  documentType: "1",
  photoUrl: "",
  seriesNumber: "",
  supplierRuc: "",
  voucherNumber: "",
});

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to process the selected image."));
    reader.readAsDataURL(file);
  });

const MyScheduleExpenseVoucherPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tripId, requestId, expenseDetailId } = useParams<{
    tripId: string;
    requestId: string;
    expenseDetailId: string;
  }>();
  const device = useDeviceMode();
  const parsedTripId = useMemo(
    () => (/^\d+$/.test(tripId || "") ? Number(tripId) : null),
    [tripId]
  );
  const parsedRequestId = useMemo(
    () => (/^\d+$/.test(requestId || "") ? Number(requestId) : null),
    [requestId]
  );
  const parsedExpenseDetailId = useMemo(
    () => (/^\d+$/.test(expenseDetailId || "") ? Number(expenseDetailId) : null),
    [expenseDetailId]
  );
  const controller = useMyScheduleDetailController(parsedTripId);
  const [formValues, setFormValues] = useState<ExpenseVoucherFormValues>(
    createInitialExpenseVoucherValues()
  );
  const [formErrors, setFormErrors] = useState<ExpenseVoucherFormErrors>({});
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState("");
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [qrScanState, setQrScanState] = useState<VoucherQrScanState | null>(null);

  const selectedRequest = useMemo(() => {
    if (!controller.trip || parsedRequestId === null) {
      return null;
    }

    return (
      controller.trip.expenseRequests.find(
        (request) => request.idRequest === parsedRequestId
      ) || null
    );
  }, [controller.trip, parsedRequestId]);

  const selectedDetail = useMemo(() => {
    if (!selectedRequest || parsedExpenseDetailId === null) {
      return null;
    }

    return (
      selectedRequest.details.find(
        (detail) => detail.expenseDetailId === parsedExpenseDetailId
      ) || null
    );
  }, [parsedExpenseDetailId, selectedRequest]);

  useEffect(() => {
    document.title = `${t("Register expense")} | Docuware`;
  }, [t]);

  useEffect(() => {
    if (!selectedDetail) {
      return;
    }

    setFormValues(createInitialExpenseVoucherValues(selectedDetail.budgetedAmount || ""));
    setFormErrors({});
    setSelectedPhoto(null);
    setSelectedPhotoPreview("");
    setIsScanningQr(false);
    setQrScanState(null);
  }, [selectedDetail]);

  const floatingAlerts: FloatingAlertItem[] = [];

  if (controller.feedback) {
    floatingAlerts.push({
      id: "my-schedule-voucher-feedback",
      type: controller.feedback.type,
      message: controller.feedback.message,
      autoDismissMs:
        controller.feedback.type === "success" || controller.feedback.type === "info"
          ? 5000
          : undefined,
    });
  }

  const backPath = parsedTripId
    ? `/travel-expenses/my-schedule/${parsedTripId}`
    : "/travel-expenses/my-schedule";

  const handleBack = () => {
    navigate(backPath);
  };

  const handleValueChange = (
    field: keyof ExpenseVoucherFormValues,
    value: string
  ) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextPhoto = event.target.files?.[0] ?? null;
    setSelectedPhoto(nextPhoto);

    if (!nextPhoto) {
      setSelectedPhotoPreview("");
      setIsScanningQr(false);
      setQrScanState(null);
      return;
    }

    try {
      const preview = await readFileAsDataUrl(nextPhoto);
      setSelectedPhotoPreview(preview);
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        photoUrl: undefined,
      }));
    } catch {
      setSelectedPhotoPreview("");
      setQrScanState({
        tone: "danger",
        message: t("Unable to read the QR code from the selected image."),
      });
      return;
    }

    setIsScanningQr(true);
    setQrScanState(null);

    try {
      const scanResult = await scanExpenseVoucherQr(nextPhoto);

      if (!scanResult) {
        setQrScanState({
          tone: "info",
          message: t("No readable QR code was detected in the selected image."),
        });
        return;
      }

      if (!scanResult.parsed) {
        setQrScanState({
          tone: "danger",
          message: t(
            "A QR code was detected, but it does not follow the expected SUNAT format."
          ),
        });
        return;
      }

      const parsedQr = scanResult.parsed;

      setFormValues((currentValues) => ({
        ...currentValues,
        supplierRuc: parsedQr.supplierRuc || currentValues.supplierRuc,
        seriesNumber: parsedQr.seriesNumber || currentValues.seriesNumber,
        voucherNumber: parsedQr.voucherNumber || currentValues.voucherNumber,
        amount: parsedQr.amount || currentValues.amount,
      }));
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        supplierRuc: undefined,
        seriesNumber: undefined,
        voucherNumber: undefined,
        amount: undefined,
        photoUrl: undefined,
      }));
      setQrScanState({
        tone: "success",
        message: t(
          "QR detected. RUC, series, number and amount were auto-filled from the voucher."
        ),
      });
    } catch {
      setQrScanState({
        tone: "danger",
        message: t("Unable to read the QR code from the selected image."),
      });
    } finally {
      setIsScanningQr(false);
    }
  };

  const validateForm = () => {
    const nextErrors: ExpenseVoucherFormErrors = {};

    if (!formValues.documentType.trim()) {
      nextErrors.documentType = t("Complete the {{field}} field.", {
        field: t("Document Type"),
      });
    }

    if (!formValues.supplierRuc.trim()) {
      nextErrors.supplierRuc = t("Complete the {{field}} field.", {
        field: t("RUC"),
      });
    } else if (!/^\d{11}$/.test(formValues.supplierRuc.trim())) {
      nextErrors.supplierRuc = t("Enter a valid RUC");
    }

    if (!formValues.seriesNumber.trim()) {
      nextErrors.seriesNumber = t("Complete the {{field}} field.", {
        field: t("Series"),
      });
    }

    if (!formValues.voucherNumber.trim()) {
      nextErrors.voucherNumber = t("Complete the {{field}} field.", {
        field: t("Number"),
      });
    }

    if (
      !formValues.amount.trim() ||
      !Number.isFinite(Number(formValues.amount)) ||
      Number(formValues.amount) <= 0
    ) {
      nextErrors.amount = t("Complete the {{field}} field.", {
        field: t("Amount"),
      });
    }

    if (!formValues.photoUrl.trim() && !selectedPhotoPreview) {
      nextErrors.photoUrl = t("Complete the {{field}} field.", {
        field: t("Photo URL"),
      });
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    if (!selectedRequest || !selectedDetail) {
      return;
    }

    const validationErrors = validateForm();
    setFormErrors(validationErrors);

    if (Object.values(validationErrors).some(Boolean)) {
      return;
    }

    const payload: CreateExpenseVoucherInput = {
      idRequest: selectedRequest.idRequest,
      expenseDetailId: selectedDetail.expenseDetailId,
      documentType: Number(formValues.documentType),
      supplierRuc: formValues.supplierRuc.trim(),
      seriesNumber: formValues.seriesNumber.trim(),
      voucherNumber: formValues.voucherNumber.trim(),
      amount: formValues.amount.trim(),
      photoUrl: formValues.photoUrl.trim() || selectedPhotoPreview,
      rejectionReason: null,
      status: 1,
    };

    const saved = await controller.submitExpenseVoucher(payload);

    if (saved) {
      navigate(backPath, {
        replace: true,
        state: {
          feedback: {
            type: "success",
            message: t("Expense voucher registered successfully."),
          } as FeedbackState,
        },
      });
    }
  };

  const formContent = selectedRequest && selectedDetail ? (
    <div className="my-schedule-app__expense-modal-stack">
      <div className="my-schedule-app__expense-modal-summary">
        <div>
          <span>{t("Budgeted Amount")}</span>
          <strong>{formatAmount(selectedDetail.budgetedAmount)}</strong>
        </div>
        <div className="my-schedule-app__expense-modal-badge">
          {selectedRequest.requestNumber}
        </div>
      </div>

      <div className="my-schedule-app__expense-modal-field">
        <Label className="form-label">{t("Expense Concept")}</Label>
        <Input type="text" value={selectedDetail.conceptLabel} readOnly />
      </div>

      <div className="my-schedule-app__expense-modal-field">
        <Label className="form-label">{t("Document Type")}</Label>
        <Input
          type="select"
          value={formValues.documentType}
          onChange={(event) => handleValueChange("documentType", event.target.value)}
          invalid={Boolean(formErrors.documentType)}
        >
          <option value="1">{t("Type 1")}</option>
          <option value="2">{t("Type 2")}</option>
        </Input>
        <FormFeedback>{formErrors.documentType}</FormFeedback>
      </div>

      <div className="my-schedule-app__expense-modal-field">
        <Label className="form-label">{t("RUC")}</Label>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={11}
          value={formValues.supplierRuc}
          onChange={(event) => handleValueChange("supplierRuc", event.target.value)}
          placeholder={t("Enter RUC")}
          invalid={Boolean(formErrors.supplierRuc)}
        />
        <FormFeedback>{formErrors.supplierRuc}</FormFeedback>
      </div>

      <div className="my-schedule-app__expense-modal-grid">
        <div className="my-schedule-app__expense-modal-field">
          <Label className="form-label">{t("Series")}</Label>
          <Input
            type="text"
            value={formValues.seriesNumber}
            onChange={(event) => handleValueChange("seriesNumber", event.target.value)}
            placeholder={t("Series")}
            invalid={Boolean(formErrors.seriesNumber)}
          />
          <FormFeedback>{formErrors.seriesNumber}</FormFeedback>
        </div>

        <div className="my-schedule-app__expense-modal-field">
          <Label className="form-label">{t("Number")}</Label>
          <Input
            type="text"
            value={formValues.voucherNumber}
            onChange={(event) => handleValueChange("voucherNumber", event.target.value)}
            placeholder={t("Number")}
            invalid={Boolean(formErrors.voucherNumber)}
          />
          <FormFeedback>{formErrors.voucherNumber}</FormFeedback>
        </div>
      </div>

      <div className="my-schedule-app__expense-modal-field">
        <Label className="form-label">{t("Amount")}</Label>
        <Input
          type="text"
          inputMode="decimal"
          value={formValues.amount}
          onChange={(event) => handleValueChange("amount", event.target.value)}
          placeholder={t("Amount")}
          invalid={Boolean(formErrors.amount)}
        />
        <FormFeedback>{formErrors.amount}</FormFeedback>
      </div>

      <div className="my-schedule-app__expense-modal-field">
        <Label className="form-label">{t("Photo URL")}</Label>
        <Input
          type="url"
          value={formValues.photoUrl}
          onChange={(event) => handleValueChange("photoUrl", event.target.value)}
          placeholder={t("Enter a public photo URL")}
          invalid={Boolean(formErrors.photoUrl)}
        />
        <FormFeedback>{formErrors.photoUrl}</FormFeedback>
      </div>

      <div className="my-schedule-app__expense-modal-field">
        <Label className="form-label d-block">{t("Photo Evidence")}</Label>
        <label className="my-schedule-app__expense-photo-field">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
          />
          <span className="my-schedule-app__expense-photo-icon" aria-hidden="true">
            <i className="ri-camera-line" />
          </span>
          <span className="my-schedule-app__expense-photo-copy">
            <strong>{t("Take or upload a photo")}</strong>
            <small>{selectedPhoto?.name || t("No file selected")}</small>
          </span>
        </label>
        {selectedPhotoPreview ? (
          <img
            src={selectedPhotoPreview}
            alt={t("Photo preview")}
            className="my-schedule-app__expense-photo-preview"
          />
        ) : null}
        {isScanningQr || qrScanState ? (
          <div
            className={`my-schedule-app__expense-qr-status my-schedule-app__expense-qr-status--${
              isScanningQr ? "info" : qrScanState?.tone || "info"
            }`}
          >
            {isScanningQr ? (
              <Spinner size="sm" />
            ) : (
              <i
                className={
                  qrScanState?.tone === "success"
                    ? "ri-checkbox-circle-line"
                    : qrScanState?.tone === "danger"
                    ? "ri-error-warning-line"
                    : "ri-information-line"
                }
                aria-hidden="true"
              />
            )}
            <span>
              {isScanningQr
                ? t("Scanning voucher QR...")
                : qrScanState?.message}
            </span>
          </div>
        ) : null}
      </div>

      <p className="my-schedule-app__expense-modal-helper">
        {t("The image field can use a public URL or the captured photo as a fallback.")}
      </p>
      <p className="my-schedule-app__expense-modal-helper">
        {t(
          "If the voucher QR is readable, RUC, Series, Number and Amount will be auto-filled."
        )}
      </p>

      <div className="d-flex justify-content-end gap-2 pt-2">
        <Button color="light" onClick={handleBack} disabled={controller.submittingVoucher}>
          {t("Cancel")}
        </Button>
        <Button
          color="primary"
          className="d-inline-flex align-items-center gap-2"
          onClick={handleSubmit}
          disabled={controller.submittingVoucher}
        >
          {controller.submittingVoucher ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" />
              <span>{t("Saving...")}</span>
            </>
          ) : (
            t("Save")
          )}
        </Button>
      </div>
    </div>
  ) : (
    <div className="my-schedule-app__mobile-empty my-schedule-app__mobile-empty--inline">
      <h2>{t("No records found")}</h2>
    </div>
  );

  const loadingState = device.isMobile ? (
    <div className="my-schedule-app__mobile-skeleton-list">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={`voucher-skeleton-${index}`}
          className="my-schedule-app__mobile-skeleton-card"
        />
      ))}
    </div>
  ) : (
    <div className="text-center py-5">
      <Spinner color="primary" />
    </div>
  );

  return (
    <div className="page-content my-schedule-app">
      <FloatingAlerts alerts={floatingAlerts} onRemove={controller.clearFeedback} />

      {device.isMobile ? (
        <section className="my-schedule-app__mobile-shell my-schedule-app__mobile-shell--detail">
          <header className="my-schedule-app__mobile-detail-hero">
            <button
              type="button"
              className="my-schedule-app__mobile-back"
              onClick={handleBack}
            >
              <i className="ri-arrow-left-line" />
            </button>

            <div className="my-schedule-app__mobile-detail-copy">
              <p className="my-schedule-app__mobile-kicker">{t("Register expense")}</p>
              <h1 className="my-schedule-app__mobile-headline">
                {selectedDetail?.conceptLabel || t("Loading...")}
              </h1>
            </div>
          </header>

          {controller.loadingDetail ? (
            loadingState
          ) : (
            <section className="my-schedule-app__mobile-section">{formContent}</section>
          )}
        </section>
      ) : (
        <Container fluid>
          <BreadCrumb title={t("Register expense")} pageTitle={t("My Schedule")} />

          <Card className="border-0 shadow-sm">
            <CardBody className="p-4">
              <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
                <div className="flex-grow-1">
                  <h5 className="mb-1">{selectedDetail?.conceptLabel || t("Register expense")}</h5>
                  <p className="text-muted mb-0">
                    {selectedRequest?.requestNumber || t("Loading...")}
                  </p>
                </div>

                <Button color="light" onClick={handleBack}>
                  <i className="ri-arrow-left-line me-1" />
                  {t("Back")}
                </Button>
              </div>

              {controller.loadingDetail ? loadingState : formContent}
            </CardBody>
          </Card>
        </Container>
      )}
    </div>
  );
};

export default MyScheduleExpenseVoucherPage;
