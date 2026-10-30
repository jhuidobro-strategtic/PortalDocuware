import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useColumnWidths } from "../../../helpers/use-column-widths";
import { Button, Card, CardBody, Container, Input, InputGroup, InputGroupText, Modal, ModalBody, ModalFooter, ModalHeader, Spinner, Table } from "reactstrap";
import BreadCrumb from "../../../components/common/BreadCrumb";
import AppPagination from "../../../components/common/Pagination";
import FloatingAlerts from "../../../components/common/FloatingAlerts";
import TableActionsMenu from "../../../components/common/TableActionsMenu";
import ResizableHeader from "../../documents/components/ResizableHeader";
import { getCurrentSessionUser } from "../../documents/hooks/orderC.form";
import type { CentroCosto } from "../../documents/types/list.types";
import { downloadBlob } from "../../../helpers/download-blob";
import { loadVehicleData, saveVehicle, setVehicleActive } from "../services";
import type { Vehicle, VehicleDraft } from "../types";
import VehicleForm from "../VehicleForm";
import "./Vehicles.css";

const VehicleManager = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [centers1, setCenters1] = useState<CentroCosto[]>([]);
  const [centers2, setCenters2] = useState<CentroCosto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ vehicle: Vehicle | null } | null>(null);
  const [stateOrder, setStateOrder] = useState<Vehicle | null>(null);
  const [changingState, setChangingState] = useState(false);
  const [stateError, setStateError] = useState("");
  const [success, setSuccess] = useState("");
  const [exporting, setExporting] = useState(false);
  const [widths, setWidths] = useColumnWidths("vehicles", { name: 240, plate: 110, type: 150, center1: 300, center2: 300, status: 100, actions: 90 });
  const pageSize = 20;

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setLoadError("");
    try {
      const [rows, firstCenters, secondCenters] = await loadVehicleData(signal);
      if (!signal?.aborted) { setVehicles(rows); setCenters1(firstCenters); setCenters2(secondCenters); }
    } catch (failure) {
      if (!signal?.aborted) setLoadError(failure instanceof Error ? failure.message : "No fue posible cargar los vehículos.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    document.title = "Gestor Vehicular | Docuware";
    const controller = new AbortController(); load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const centerLabel = (center: CentroCosto | null) => center ? `${center.centrocodigo} - ${center.descripcion}` : "-";
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es-PE");
    return vehicles.filter((vehicle) => (status === "all" || vehicle.activo === (status === "active")) &&
      [vehicle.no_vehiculo, vehicle.placa, vehicle.tipo, vehicle.descripcion, centerLabel(vehicle.centro_costo_1), centerLabel(vehicle.centro_costo_2)]
        .some((value) => String(value || "").toLocaleLowerCase("es-PE").includes(term)))
      .sort((left, right) => right.idvehiculo - left.idvehiculo);
  }, [vehicles, search, status]);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const replaceVehicle = (updated: Vehicle) => setVehicles((previous) => previous.some((item) => item.idvehiculo === updated.idvehiculo)
    ? previous.map((item) => item.idvehiculo === updated.idvehiculo ? updated : item) : [updated, ...previous]);
  const submit = async (draft: VehicleDraft) => {
    const updated = await saveVehicle(draft, Number(getCurrentSessionUser().id), form?.vehicle?.idvehiculo);
    replaceVehicle(updated); setForm(null); setPage(1);
    setSuccess(form?.vehicle ? "Vehículo actualizado correctamente." : "Vehículo registrado correctamente.");
  };
  const changeState = async () => {
    if (!stateOrder) return;
    setChangingState(true); setStateError("");
    try {
      const updated = await setVehicleActive(stateOrder.idvehiculo, !stateOrder.activo, Number(getCurrentSessionUser().id));
      replaceVehicle(updated); setStateOrder(null); setSuccess(updated.activo ? "Vehículo activado." : "Vehículo desactivado.");
    } catch (failure) { setStateError(failure instanceof Error ? failure.message : "No fue posible cambiar el estado."); }
    finally { setChangingState(false); }
  };
  const exportExcel = async () => {
    setExporting(true);
    try {
      const { Workbook } = await import("exceljs");
      const workbook = new Workbook(); const sheet = workbook.addWorksheet("Vehículos");
      sheet.columns = [{ header: "Identificador / nombre", key: "name", width: 32 }, { header: "Placa", key: "plate", width: 15 },
        { header: "Tipo", key: "type", width: 24 }, { header: "Descripción", key: "description", width: 45 },
        { header: "Centro de costo 1", key: "center1", width: 45 }, { header: "Centro de costo 2", key: "center2", width: 45 },
        { header: "Estado", key: "status", width: 14 }];
      filtered.forEach((vehicle) => sheet.addRow({ name: vehicle.no_vehiculo, plate: vehicle.placa || "", type: vehicle.tipo || "",
        description: vehicle.descripcion || "", center1: centerLabel(vehicle.centro_costo_1), center2: centerLabel(vehicle.centro_costo_2), status: vehicle.activo ? "Activo" : "Inactivo" }));
      sheet.getRow(1).font = { bold: true };
      await downloadBlob(new Blob([await workbook.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Vehiculos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch { setLoadError("No fue posible exportar el listado de vehículos."); }
    finally { setExporting(false); }
  };
  const columns: Array<{ key: keyof typeof widths; label: string }> = [{ key: "name", label: "Identificador / nombre" },
    { key: "plate", label: "Placa" }, { key: "type", label: "Tipo" }, { key: "center1", label: "Centro de costo 1" },
    { key: "center2", label: "Centro de costo 2" }, { key: "status", label: "Estado" }, { key: "actions", label: "Acciones" }];

  return <div className="page-content"><Container fluid>
    <BreadCrumb title="Gestor Vehicular" pageTitle="Vehículos" />
    <FloatingAlerts alerts={[
      ...(loadError ? [{ id: "vehicle-error", type: "danger" as const, message: loadError }] : []),
      ...(success ? [{ id: "vehicle-success", type: "success" as const, message: success, autoDismissMs: 5000 }] : []),
    ]} onRemove={(id) => id === "vehicle-error" ? setLoadError("") : setSuccess("")} />
    <Card><CardBody>
      <h4 className="mb-3">Gestor Vehicular</h4>
      <div className="vehicle-manager-toolbar mb-4">
        <div className="d-flex flex-wrap gap-2">
          <InputGroup className="vehicle-manager-search"><InputGroupText><i className="ri-search-line" /></InputGroupText>
            <Input aria-label="Buscar vehículos" placeholder="Buscar placa, nombre o centro de costo..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></InputGroup>
          <Input type="select" aria-label="Filtrar por estado" className="vehicle-manager-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="all">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
          </Input>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {loadError && <Button color="light" disabled={loading} onClick={() => load()}>Volver a cargar</Button>}
          <Button color="success" disabled={loading || exporting || !filtered.length} onClick={exportExcel}>
            {exporting ? <Spinner size="sm" className="me-1" /> : <i className="ri-file-excel-2-line me-1" />}Exportar Excel
          </Button>
          <Button color="primary" disabled={loading} onClick={() => setForm({ vehicle: null })}><i className="ri-add-line me-1" />Nuevo vehículo</Button>
        </div>
      </div>
      {loading ? <div className="vehicle-manager-loading" aria-busy="true"><Spinner color="primary" /></div> : <>
        <div className="table-responsive"><Table className="table table-nowrap align-middle mb-0 vehicle-manager-table"
          style={{ width: Object.values(widths).reduce((total, width) => total + width, 0) }}>
          <thead className="table-light"><tr>{columns.map((column) => <ResizableHeader key={column.key} width={widths[column.key]}
            onResize={(width) => setWidths((previous) => ({ ...previous, [column.key]: width }))}>{column.label}</ResizableHeader>)}</tr></thead>
          <tbody>{rows.length === 0 ? <tr><td colSpan={7} className="text-center py-4">No se encontraron vehículos.</td></tr> : rows.map((vehicle) => <tr key={vehicle.idvehiculo}>
            <td className="text-truncate" title={vehicle.descripcion || vehicle.no_vehiculo}>{vehicle.no_vehiculo}</td><td>{vehicle.placa || "-"}</td>
            <td className="text-truncate" title={vehicle.tipo || ""}>{vehicle.tipo || "-"}</td>
            <td className="text-truncate" title={centerLabel(vehicle.centro_costo_1)}>{centerLabel(vehicle.centro_costo_1)}</td>
            <td className="text-truncate" title={centerLabel(vehicle.centro_costo_2)}>{centerLabel(vehicle.centro_costo_2)}</td>
            <td><span className={`badge ${vehicle.activo ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary"}`}>{vehicle.activo ? "Activo" : "Inactivo"}</span></td>
            <td className="text-center"><TableActionsMenu items={[
              { id: `edit-${vehicle.idvehiculo}`, label: "Editar", icon: "ri-edit-line", tone: "neutral", onClick: () => setForm({ vehicle }) },
              { id: `state-${vehicle.idvehiculo}`, label: vehicle.activo ? "Desactivar" : "Activar", icon: vehicle.activo ? "ri-forbid-line" : "ri-checkbox-circle-line", tone: vehicle.activo ? "danger" : "success",
                onClick: () => { setStateError(""); setStateOrder(vehicle); } },
            ]} /></td>
          </tr>)}</tbody>
        </Table></div>
        <div className="text-muted small mt-3">{filtered.length} vehículo(s)</div>
        <AppPagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={pageSize} onPageChange={setPage} />
      </>}
    </CardBody></Card>
    {form && <VehicleForm vehicle={form.vehicle} centers1={centers1} centers2={centers2} onSave={submit} onClose={() => setForm(null)} />}
    <Modal isOpen={!!stateOrder} centered toggle={changingState ? undefined : () => setStateOrder(null)} backdrop={changingState ? "static" : true} keyboard={!changingState}>
      <ModalHeader toggle={changingState ? undefined : () => setStateOrder(null)}>{stateOrder?.activo ? "Desactivar" : "Activar"} vehículo</ModalHeader>
      <ModalBody><p>{stateOrder?.no_vehiculo} {stateOrder?.placa ? `(${stateOrder.placa})` : ""}</p>
        <p className="mb-0">{stateOrder?.activo ? "Dejará de aparecer para nuevas selecciones. Su historial se conservará." : "Volverá a estar disponible en los catálogos del sistema."}</p>
        {stateError && <div className="alert alert-danger mt-3 mb-0" role="alert" style={{ whiteSpace: "pre-line" }}>{stateError}</div>}
      </ModalBody><ModalFooter><Button color="light" disabled={changingState} onClick={() => setStateOrder(null)}>Cancelar</Button>
        <Button color={stateOrder?.activo ? "danger" : "primary"} disabled={changingState} onClick={changeState}>{changingState ? <Spinner size="sm" /> : "Confirmar"}</Button>
      </ModalFooter>
    </Modal>
  </Container></div>;
};
export default VehicleManager;
