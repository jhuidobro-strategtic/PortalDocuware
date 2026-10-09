import React from "react";
import {
  Button,
  Col,
  Form,
  FormGroup,
  Input,
  InputGroup,
  InputGroupText,
  Label,
  Row,
  Spinner,
} from "reactstrap";
import Flatpickr from "react-flatpickr";
import moment from "moment";
import { useTranslation } from "react-i18next";
import CurrencyDropdown from "./CurrencyDropdown";
import { Document, TipoDocumento } from "../types/list.types";

interface DocumentEditorFormProps {
  editDoc: Document | null;
  setEditDoc: React.Dispatch<React.SetStateAction<Document | null>>;
  editIgvPercent: number;
  setEditIgvPercent: (value: number) => void;
  tiposDocumento: TipoDocumento[];
  loadingRuc: boolean;
  loadingDocument: boolean;
  loadingSave: boolean;
  onSearchRuc: () => Promise<void>;
  onSearchDocument: () => Promise<void>;
  onSave: () => void;
  onCancel: () => void;
}

const normalizeDocumentNumber = (value: string) => {
  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return trimmedValue;
  }

  return trimmedValue.replace(/^0+(?=\d)/, "");
};

const DocumentEditorForm: React.FC<DocumentEditorFormProps> = ({
  editDoc,
  setEditDoc,
  editIgvPercent,
  setEditIgvPercent,
  tiposDocumento,
  loadingRuc,
  loadingDocument,
  loadingSave,
  onSearchRuc,
  onSearchDocument,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();

  if (!editDoc) {
    return null;
  }

  const handleAmountChange = (value: string) => {
    setEditDoc((prev) => {
      if (!prev) return prev;
      const amount = parseFloat(value || "0");
      const tax = parseFloat(prev.taxamount || "0");
      return {
        ...prev,
        amount: value,
        totalamount: (amount + tax).toFixed(2),
      };
    });
  };

  const handleIgvPercentChange = (percent: number) => {
    setEditIgvPercent(percent);
    setEditDoc((prev) => {
      if (!prev) return prev;
      const amount = parseFloat(prev.amount || "0");
      const newTax = (amount * percent) / 100;
      return {
        ...prev,
        taxamount: newTax.toFixed(2),
        totalamount: (amount + newTax).toFixed(2),
      };
    });
  };

  return (
    <Form
      className="document-edit-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="document-edit-form-fields">
        <Row className="g-4">
          <Col md={4}>
            <FormGroup className="mb-0">
              <Label className="form-label">RUC <span className="text-danger">*</span></Label>
              <InputGroup>
                <Input
                  value={editDoc.suppliernumber ?? ""}
                  onChange={(event) =>
                    setEditDoc({
                      ...editDoc,
                      suppliernumber: event.target.value,
                    })
                  }
                  placeholder={t("Enter RUC")}
                />
                <Button
                  color="secondary"
                  type="button"
                  onClick={onSearchRuc}
                  disabled={loadingRuc}
                >
                  {loadingRuc ? (
                    <Spinner size="sm" color="light" />
                  ) : (
                    <i className="ri-search-line" />
                  )}
                </Button>
              </InputGroup>
            </FormGroup>
          </Col>

          <Col md={8}>
            <FormGroup className="mb-0">
              <Label className="form-label">{t("Business Name")} <span className="text-danger">*</span></Label>
              <Input value={editDoc.suppliername ?? ""} disabled />
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup className="mb-0">
              <Label className="form-label">{t("Document Type")} <span className="text-danger">*</span></Label>
              <Input
                type="select"
                value={
                  editDoc.documenttype && typeof editDoc.documenttype === "object"
                    ? editDoc.documenttype.tipoid
                    : editDoc.documenttype ?? ""
                }
                onChange={(event) =>
                  setEditDoc({
                    ...editDoc,
                    documenttype: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
              >
                <option value="">{t("Select...")}</option>
                {tiposDocumento.map((tipo) => (
                  <option key={tipo.tipoid} value={tipo.tipoid}>
                    {tipo.tipo}
                  </option>
                ))}
              </Input>
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup className="mb-0">
              <Label className="form-label">{t("Series No.")} <span className="text-danger">*</span></Label>
              <Input
                value={editDoc.documentserial ?? ""}
                onChange={(event) =>
                  setEditDoc({
                    ...editDoc,
                    documentserial: event.target.value,
                  })
                }
                placeholder={t("E.g. F001")}
              />
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup className="mb-0">
              <Label className="form-label">{t("Document No.")} <span className="text-danger">*</span></Label>
              <InputGroup>
                <Input
                  value={editDoc.documentnumber ?? ""}
                  onChange={(event) =>
                    setEditDoc({
                      ...editDoc,
                      documentnumber: normalizeDocumentNumber(event.target.value),
                    })
                  }
                  placeholder={t("E.g. 000123")}
                />
                <Button
                  color="secondary"
                  type="button"
                  onClick={onSearchDocument}
                  disabled={loadingDocument}
                >
                  {loadingDocument ? (
                    <Spinner size="sm" color="light" />
                  ) : (
                    <i className="ri-search-line" />
                  )}
                </Button>
              </InputGroup>
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup className="mb-0">
              <Label className="form-label">{t("Issue date")} <span className="text-danger">*</span></Label>
              <InputGroup>
                <InputGroupText>
                  <i className="ri-calendar-line" />
                </InputGroupText>
                <Flatpickr
                  className="form-control"
                  options={{ dateFormat: "Y-m-d" }}
                  value={editDoc.documentdate || ""}
                  onChange={(dates: Date[]) =>
                    setEditDoc({
                      ...editDoc,
                      documentdate: moment(dates[0]).format("YYYY-MM-DD"),
                    })
                  }
                />
              </InputGroup>
            </FormGroup>
          </Col>

          <Col md={5}>
            <FormGroup className="mb-0">
              <Label className="form-label">{t("Buyer")}</Label>
              <Input
                value={editDoc.driver ?? ""}
                onChange={(event) =>
                  setEditDoc({
                    ...editDoc,
                    driver: event.target.value,
                  })
                }
                placeholder={t("Enter buyer name")}
              />
            </FormGroup>
          </Col>

          <Col md={3}>
            <FormGroup className="mb-0">
              <Label className="form-label">{t("Currency")}</Label>
              <CurrencyDropdown
                value={editDoc.currency || "PEN"}
                onChange={(value) =>
                  setEditDoc({
                    ...editDoc,
                    currency: value,
                  })
                }
              />
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup className="mb-0">
              <Label className="form-label">{t("Subtotal")} <span className="text-danger">*</span></Label>
              <Input
                type="number"
                value={editDoc.amount ?? ""}
                onChange={(event) => handleAmountChange(event.target.value)}
              />
            </FormGroup>
          </Col>

          <Col md={5}>
            <FormGroup className="mb-0">
              <Label className="form-label">IGV <span className="text-danger">*</span></Label>
              <InputGroup className="document-edit-igv-group">
                <Input
                  type="select"
                  className="document-edit-igv-percent"
                  value={editIgvPercent}
                  onChange={(event) =>
                    handleIgvPercentChange(parseFloat(event.target.value))
                  }
                >
                  <option value={0}>0%</option>
                  <option value={2}>2%</option>
                  <option value={8}>8%</option>
                  <option value={16}>16%</option>
                  <option value={18}>18%</option>
                </Input>
                <Input type="number" value={editDoc.taxamount || "0.00"} disabled />
              </InputGroup>
            </FormGroup>
          </Col>

          <Col md={3}>
            <FormGroup className="mb-0">
              <Label className="form-label">{t("Total")} <span className="text-danger">*</span></Label>
              <Input type="number" value={editDoc.totalamount ?? "0.00"} disabled />
            </FormGroup>
          </Col>

          <Col md={12}>
            <FormGroup className="mb-0">
              <Label className="form-label">{t("Notes")}</Label>
              <Input
                type="textarea"
                rows={3}
                value={editDoc.notes ?? ""}
                onChange={(event) =>
                  setEditDoc({
                    ...editDoc,
                    notes: event.target.value,
                  })
                }
                placeholder={t("Enter notes...")}
              />
            </FormGroup>
          </Col>
        </Row>
      </div>

      <div className="document-edit-actions">
        <Button color="light" type="button" onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button color="primary" type="submit" disabled={loadingSave}>
          {loadingSave ? (
            <>
              <Spinner size="sm" className="me-2" />
              {t("Saving...")}
            </>
          ) : (
            t("Save")
          )}
        </Button>
      </div>
    </Form>
  );
};

export default DocumentEditorForm;
