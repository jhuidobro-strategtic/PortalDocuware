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
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
  Table,
} from "reactstrap";
import Flatpickr from "react-flatpickr";
import moment from "moment";
import Select from "react-select";
import Draggable from "react-draggable";
import { useTranslation } from "react-i18next";
import CurrencyDropdown from "../CurrencyDropdown";
import { CentroCosto, Document, DocumentDetail, TipoDocumento } from "../types";
import { getNumberLocale } from "../../../common/locale";

type CentroOption = {
  value: string;
  label: string;
};

const selectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base,
    minHeight: "38px",
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    zIndex: 9999,
  }),
  menuPortal: (base: Record<string, unknown>) => ({
    ...base,
    zIndex: 9999,
  }),
};

interface EditDocumentModalProps {
  editDoc: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  setEditDoc: React.Dispatch<React.SetStateAction<Document | null>>;
  editIgvPercent: number;
  setEditIgvPercent: (value: number) => void;
  tiposDocumento: TipoDocumento[];
  centrosCostos: CentroCosto[];
  loadingRuc: boolean;
  loadingDocument: boolean;
  loadingDetails: boolean;
  docDetails: DocumentDetail[];
  onSearchRuc: () => Promise<void>;
  onSearchDocument: () => Promise<void>;
}

const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  editDoc,
  isOpen,
  onClose,
  onSave,
  setEditDoc,
  editIgvPercent,
  setEditIgvPercent,
  tiposDocumento,
  centrosCostos,
  loadingRuc,
  loadingDocument,
  loadingDetails,
  docDetails,
  onSearchRuc,
  onSearchDocument,
}) => {
  const { t, i18n } = useTranslation();
  const numberLocale = getNumberLocale(i18n.language);

  if (!editDoc) return null;

  const handleAmountChange = (value: string) => {
    setEditDoc((prev) => {
      if (!prev) return prev;
      const amt = parseFloat(value || "0");
      const tax = parseFloat(prev.taxamount || "0");
      return {
        ...prev,
        amount: value,
        totalamount: (amt + tax).toFixed(2),
      };
    });
  };

  const handleIgvPercentChange = (percent: number) => {
    setEditIgvPercent(percent);
    setEditDoc((prev) => {
      if (!prev) return prev;
      const amt = parseFloat(prev.amount || "0");
      const newTax = (amt * percent) / 100;
      return {
        ...prev,
        taxamount: newTax.toFixed(2),
        totalamount: (amt + newTax).toFixed(2),
      };
    });
  };

  const centroOptions: CentroOption[] = centrosCostos.map((centro) => ({
    value: String(centro.centroid),
    label: `${centro.centrocodigo} - ${centro.descripcion}`,
  }));

  const selectedCentro: CentroOption | null = (() => {
    const currentValue =
      editDoc.centercost && typeof editDoc.centercost === "object"
        ? String(editDoc.centercost.centroid)
        : editDoc.centercost
        ? String(editDoc.centercost)
        : null;

    return centroOptions.find((opt) => opt.value === currentValue) || null;
  })();

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      size="lg"
      centered={false}
      contentClassName="p-0 border-0 shadow-none bg-transparent"
    >
      <Draggable handle=".modal-header">
        <div className="modal-dialog modal-lg" style={{ margin: 0 }}>
          <div className="modal-content">
            <ModalHeader toggle={onClose} className="modal-header">
              {t("Edit Document")}
            </ModalHeader>
            <ModalBody>
              <Form>
                <Row>
                  <Col md="4">
                    <FormGroup>
                      <Label className="form-label">RUC</Label>
                      <InputGroup>
                        <Input
                          value={editDoc.suppliernumber}
                          onChange={(e) =>
                            setEditDoc({
                              ...editDoc,
                              suppliernumber: e.target.value,
                            })
                          }
                          placeholder={t("Enter RUC")}
                        />
                        <Button
                          color="secondary"
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

                  <Col md="8">
                    <FormGroup>
                      <Label className="form-label">{t("Business Name")}</Label>
                      <Input value={editDoc.suppliername} disabled />
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md="4">
                    <FormGroup>
                      <Label className="form-label">{t("Document Type")}</Label>
                      <Input
                        type="select"
                        value={
                          editDoc.documenttype &&
                          typeof editDoc.documenttype === "object"
                            ? editDoc.documenttype.tipoid
                            : editDoc.documenttype ?? ""
                        }
                        onChange={(e) =>
                          setEditDoc({
                            ...editDoc,
                            documenttype: e.target.value
                              ? Number(e.target.value)
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

                  <Col md="4">
                    <FormGroup>
                      <Label className="form-label">{t("Series No.")}</Label>
                      <Input
                        value={editDoc.documentserial}
                        onChange={(e) =>
                          setEditDoc({
                            ...editDoc,
                            documentserial: e.target.value,
                          })
                        }
                        placeholder={t("E.g. F001")}
                      />
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <Label className="form-label">{t("Document No.")}</Label>
                      <InputGroup>
                        <Input
                          value={editDoc.documentnumber}
                          onChange={(e) =>
                            setEditDoc({
                              ...editDoc,
                              documentnumber: e.target.value,
                            })
                          }
                        placeholder={t("E.g. 000123")}
                        />
                        <Button
                          color="secondary"
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
                </Row>

                <Row>
                  <Col md="3">
                    <FormGroup>
                      <Label className="form-label">{t("Issue date")}</Label>
                      <InputGroup>
                        <InputGroupText>
                          <i className="ri-calendar-line" />
                        </InputGroupText>
                        <Flatpickr
                          className="form-control"
                          options={{ dateFormat: "Y-m-d" }}
                          value={editDoc.documentdate}
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

                  <Col md={2}>
                    <FormGroup>
                      <Label>{t("Currency")}</Label>
                      <CurrencyDropdown
                        value={editDoc.currency || "PEN"}
                        onChange={(val) =>
                          setEditDoc({ ...editDoc, currency: val })
                        }
                      />
                    </FormGroup>
                  </Col>

                  <Col md={2}>
                    <FormGroup>
                      <Label>{t("Subtotal")}</Label>
                      <Input
                        type="number"
                        value={editDoc.amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                      />
                    </FormGroup>
                  </Col>

                  <Col md={3}>
                    <FormGroup>
                      <Label>IGV</Label>
                      <InputGroup>
                        <Input
                          type="select"
                          value={editIgvPercent}
                          onChange={(e) =>
                            handleIgvPercentChange(parseFloat(e.target.value))
                          }
                        >
                          <option value={0}>0%</option>
                          <option value={2}>2%</option>
                          <option value={8}>8%</option>
                          <option value={16}>16%</option>
                          <option value={18}>18%</option>
                        </Input>
                        <Input
                          type="number"
                          value={editDoc.taxamount || "0.00"}
                          disabled
                          readOnly
                        />
                      </InputGroup>
                    </FormGroup>
                  </Col>

                  <Col md={2}>
                    <FormGroup>
                      <Label>{t("Total")}</Label>
                      <Input
                        type="number"
                        value={editDoc.totalamount}
                        disabled
                        readOnly
                      />
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label className="form-label">{t("Buyer")}</Label>
                      <Input
                        value={editDoc.driver}
                        onChange={(e) =>
                          setEditDoc({ ...editDoc, driver: e.target.value })
                        }
                        placeholder={t("Enter buyer name")}
                      />
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label className="form-label">{t("Cost center")}</Label>
                      <Select
                        value={selectedCentro}
                        options={centroOptions}
                        onChange={(selected: CentroOption | null) =>
                          setEditDoc({
                            ...editDoc,
                            centercost: selected ? Number(selected.value) : null,
                          })
                        }
                        placeholder={t("Select cost center")}
                        isClearable
                        isSearchable
                        noOptionsMessage={() => t("No results")}
                        styles={selectStyles}
                        menuPortalTarget={document.body}
                      />
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md="12">
                    <FormGroup>
                      <Label className="form-label">{t("Notes")}</Label>
                      <Input
                        type="textarea"
                        rows={3}
                        value={editDoc.notes}
                        onChange={(e) =>
                          setEditDoc({ ...editDoc, notes: e.target.value })
                        }
                        placeholder={t("Enter notes...")}
                      />
                    </FormGroup>
                  </Col>
                </Row>

                <h5 className="mt-3">{t("Invoice Details")}</h5>
                {loadingDetails ? (
                  <div className="text-center my-3">
                    <Spinner color="primary" />
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: "350px",
                      overflowY: "auto",
                      border: "1px solid #dee2e6",
                      borderRadius: "0.375rem",
                    }}
                  >
                    <Table
                      className="table table-sm table-bordered mb-0"
                      style={{ borderCollapse: "collapse" }}
                    >
                      <thead
                        className="table-light"
                        style={{
                          position: "sticky",
                          top: 0,
                          zIndex: 1,
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        <tr>
                          <th className="text-center">{t("Unit")}</th>
                          <th className="text-center">{t("Description")}</th>
                          <th className="text-center">{t("Plate")}</th>
                          <th className="text-center">{t("Quantity")}</th>
                          <th className="text-center">{t("Unit Value")}</th>
                          <th className="text-center">{t("Total")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docDetails.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center">
                              {t("No details available")}
                            </td>
                          </tr>
                        ) : (
                          <>
                            {docDetails.map((d) => (
                              <tr key={d.detailid}>
                                <td className="text-center">
                                  {d.unit_measure_description}
                                </td>
                                <td className="text-center">{d.description}</td>
                                <td className="text-center">{d.vehicle_no}</td>
                                <td className="text-center">{d.quantity}</td>
                                <td className="text-end">
                                  {Number(d.unit_value).toLocaleString(numberLocale, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="text-end">
                                  {Number(d.total_value).toLocaleString(numberLocale, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                              </tr>
                            ))}

                            <tr>
                              <td colSpan={5} className="text-end fw-bold">
                                {t("Subtotal")}:
                              </td>
                              <td className="text-end fw-bold">
                                {docDetails
                                  .reduce(
                                    (sum, d) =>
                                      sum + parseFloat(d.unit_value || "0"),
                                    0
                                  )
                                  .toLocaleString(numberLocale, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={5} className="text-end fw-bold">
                                IGV:
                              </td>
                              <td className="text-end fw-bold">
                                {docDetails
                                  .reduce(
                                    (sum, d) =>
                                      sum + parseFloat(d.tax_value || "0"),
                                    0
                                  )
                                  .toLocaleString(numberLocale, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={5} className="text-end fw-bold">
                                {t("Total")}:
                              </td>
                              <td className="text-end fw-bold">
                                {docDetails
                                  .reduce(
                                    (sum, d) =>
                                      sum +
                                      parseFloat(d.unit_value || "0") +
                                      parseFloat(d.tax_value || "0"),
                                    0
                                  )
                                  .toLocaleString(numberLocale, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button color="primary" onClick={onSave}>
                {t("Save")}
              </Button>
              <Button color="secondary" onClick={onClose}>
                {t("Cancel")}
              </Button>
            </ModalFooter>
          </div>
        </div>
      </Draggable>
    </Modal>
  );
};

export default EditDocumentModal;
