import React, { useState } from "react";
import Select from "react-select";
import { Button, Col, Form, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader, Row, Spinner } from "reactstrap";
import type { CentroCosto } from "../documents/types/list.types";
import type { Vehicle, VehicleDraft } from "./types";

interface Props {
  vehicle: Vehicle | null;
  centers1: CentroCosto[];
  centers2: CentroCosto[];
  onClose: () => void;
  onSave: (draft: VehicleDraft) => Promise<void>;
}
const VehicleForm = ({ vehicle, centers1, centers2, onClose, onSave }: Props) => {
  const [draft, setDraft] = useState<VehicleDraft>({ no_vehiculo: vehicle?.no_vehiculo || "", placa: vehicle?.placa || "",
    tipo: vehicle?.tipo || "", descripcion: vehicle?.descripcion || "", activo: vehicle?.activo ?? true,
    centro_costo_1_id: vehicle?.centro_costo_1?.centroid ?? null, centro_costo_2_id: vehicle?.centro_costo_2?.centroid ?? null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try { await onSave(draft); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible guardar el vehículo."); }
    finally { setSaving(false); }
  };
  const textFields = [
    { key: "no_vehiculo" as const, label: "Identificador / nombre del vehículo", maxLength: 50, required: true },
    { key: "placa" as const, label: "Placa", maxLength: 50, required: false },
    { key: "tipo" as const, label: "Tipo de vehículo", maxLength: 100, required: false },
  ];
  return <Modal isOpen centered size="lg" toggle={saving ? undefined : onClose} backdrop={saving ? "static" : true} keyboard={!saving}>
    <ModalHeader toggle={saving ? undefined : onClose}>{vehicle ? "Editar vehículo" : "Nuevo vehículo"}</ModalHeader>
    <Form onSubmit={submit}><ModalBody>
      {error && <div className="alert alert-danger" role="alert" style={{ whiteSpace: "pre-line" }}>{error}</div>}
      <fieldset disabled={saving}><Row className="g-3">
        {textFields.map((field) => <Col md={field.key === "no_vehiculo" ? 12 : 6} key={field.key}>
          <Label className="form-label" htmlFor={`vehicle-${field.key}`}>{field.label} {field.required && <span className="text-danger">*</span>}</Label>
          <Input id={`vehicle-${field.key}`} value={draft[field.key]} required={field.required} maxLength={field.maxLength}
            onChange={(event) => setDraft((previous) => ({ ...previous, [field.key]: field.key === "placa" ? event.target.value.toUpperCase() : event.target.value }))} />
          {field.key === "placa" && <small className="text-muted">Puede dejarla vacía para equipos sin placa.</small>}
        </Col>)}
        <Col xs={12}><Label className="form-label" htmlFor="vehicle-description">Descripción</Label>
          <Input id="vehicle-description" type="textarea" rows={3} maxLength={255} value={draft.descripcion}
            onChange={(event) => setDraft((previous) => ({ ...previous, descripcion: event.target.value }))} /></Col>
        {([1, 2] as const).map((number) => {
          const field = number === 1 ? "centro_costo_1_id" : "centro_costo_2_id";
          const centers = number === 1 ? centers1 : centers2;
          const options = centers.map((center) => ({ value: Number(center.centroid), label: `${center.centrocodigo} - ${center.descripcion}` }));
          const saved = number === 1 ? vehicle?.centro_costo_1 : vehicle?.centro_costo_2;
          const value = options.find((option) => option.value === draft[field]) ?? (saved && Number(saved.centroid) === draft[field]
            ? { value: Number(saved.centroid), label: `${saved.centrocodigo} - ${saved.descripcion}` } : null);
          return <Col md={6} key={field}><Label className="form-label" htmlFor={`vehicle-${field}`}>Centro de costo {number}</Label>
            <Select inputId={`vehicle-${field}`} options={options} value={value} isClearable isSearchable isDisabled={saving}
              placeholder="Seleccione un centro de costo" noOptionsMessage={() => "Sin resultados"}
              onChange={(option: { value: number; label: string } | null) => setDraft((previous) => ({ ...previous, [field]: option?.value ?? null }))}
              menuPortalTarget={document.body} menuPosition="fixed" styles={{ menuPortal: (base: React.CSSProperties) => ({ ...base, zIndex: 1100 }) }} /></Col>;
        })}
        <Col xs={12}><Label check className="d-flex align-items-center gap-2">
          <Input type="checkbox" className="m-0" checked={draft.activo} onChange={(event) => setDraft((previous) => ({ ...previous, activo: event.target.checked }))} />Activo
        </Label></Col>
      </Row></fieldset>
    </ModalBody><ModalFooter><Button color="light" type="button" disabled={saving} onClick={onClose}>Cancelar</Button>
      <Button color="primary" type="submit" disabled={saving}>{saving ? <><Spinner size="sm" className="me-2" />Guardando...</> : "Guardar vehículo"}</Button>
    </ModalFooter></Form>
  </Modal>;
};
export default VehicleForm;
