import React from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Row,
  Col,
  Label,
  Button,
} from "reactstrap";
import Flatpickr from "react-flatpickr";
import Select from "react-select";
import moment from "moment";
import { Conductor, Vehiculo } from "../types";

interface SelectOption {
  value: number;
  label: string;
}

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

interface ProgramacionFormModalProps {
  isOpen: boolean;
  toggle: () => void;
  title: string;
  date: string;
  onDateChange: (value: string) => void;
  vehicleId: number | null;
  conductorId: number | null;
  onVehicleChange: (value: number | null) => void;
  onConductorChange: (value: number | null) => void;
  vehicles: Vehiculo[];
  conductores: Conductor[];
  submitLabel: string;
  onSubmit: () => void;
}

const ProgramacionFormModal: React.FC<ProgramacionFormModalProps> = ({
  isOpen,
  toggle,
  title,
  date,
  onDateChange,
  vehicleId,
  conductorId,
  onVehicleChange,
  onConductorChange,
  vehicles,
  conductores,
  submitLabel,
  onSubmit,
}) => {
  const vehicleOptions: SelectOption[] = vehicles.map((veh) => ({
    value: veh.idvehiculo,
    label: veh.no_vehiculo,
  }));

  const conductorOptions: SelectOption[] = conductores.map((con) => ({
    value: con.idconductor,
    label: con.conductor_nm,
  }));

  const selectedVehicle = vehicleOptions.find((opt) => opt.value === vehicleId) || null;
  const selectedConductor =
    conductorOptions.find((opt) => opt.value === conductorId) || null;

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered size="lg">
      <ModalHeader toggle={toggle}>{title}</ModalHeader>
      <ModalBody>
        <Form>
          <FormGroup>
            <Row className="align-items-center">
              <Col md="3">
                <Label className="form-label mb-0">
                  Fecha de Programación <span className="text-danger">*</span>
                </Label>
              </Col>
              <Col md="9">
                <Flatpickr
                  className="form-control"
                  value={date}
                  onChange={(dates) => {
                    if (dates[0]) {
                      onDateChange(moment(dates[0]).format("YYYY-MM-DD"));
                    }
                  }}
                  options={{
                    dateFormat: "Y-m-d",
                    defaultDate: date,
                  }}
                />
              </Col>
            </Row>
          </FormGroup>

          <FormGroup>
            <Row className="align-items-center">
              <Col md="3">
                <Label className="form-label mb-0">
                  Vehículo <span className="text-danger">*</span>
                </Label>
              </Col>
              <Col md="9">
                <Select
                  value={selectedVehicle}
                  options={vehicleOptions}
                  onChange={(selected: SelectOption | null) =>
                    onVehicleChange(selected ? selected.value : null)
                  }
                  placeholder="Seleccione un vehículo"
                  isClearable
                  isSearchable
                  noOptionsMessage={() => "No hay resultados"}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </Col>
            </Row>
          </FormGroup>

          <FormGroup>
            <Row className="align-items-center">
              <Col md="3">
                <Label className="form-label mb-0">
                  Conductor <span className="text-danger">*</span>
                </Label>
              </Col>
              <Col md="9">
                <Select
                  value={selectedConductor}
                  options={conductorOptions}
                  onChange={(selected: SelectOption | null) =>
                    onConductorChange(selected ? selected.value : null)
                  }
                  placeholder="Seleccione un conductor"
                  isClearable
                  isSearchable
                  noOptionsMessage={() => "No hay resultados"}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </Col>
            </Row>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="primary" onClick={onSubmit}>
          <i className="ri-save-line align-bottom me-1" />
          {submitLabel}
        </Button>
        <Button color="secondary" onClick={toggle}>
          Cancelar
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ProgramacionFormModal;
