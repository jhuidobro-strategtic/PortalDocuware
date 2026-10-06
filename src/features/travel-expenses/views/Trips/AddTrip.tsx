import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import Select from "react-select";
import {
  Alert,
  Button,
  Card,
  CardBody,
  Container,
  Input,
  Spinner,
  Table,
} from "reactstrap";

import BreadCrumb from "../../../../components/common/BreadCrumb";
import { getCurrentSessionUser } from "../../my-schedule/shared/session";
import {
  BatchTripRow,
  createEmptyBatchTripRow,
  createTrip,
  createBulkTrips,
  DestinationItem,
  DriverItem,
  fetchTripById,
  fetchTripCatalogs,
  formatForDateTimeInput,
  formatIsoWithOffset,
  updateTrip,
  VEHICLE_CONFIGURATIONS,
  VehicleConfiguration,
  VehicleItem,
} from "./services/trips.service";

import tractoIcon from "../../../../assets/images/trips/tracto.png";
import semiYellowIcon from "../../../../assets/images/trips/semirremolque-yellow.png";

interface SelectOption {
  value: string;
  label: string;
}

const tableSelectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base,
    minHeight: "36px",
    height: "36px",
    fontSize: "13px",
    borderColor: "#ced4da",
    borderRadius: "0.25rem",
    boxShadow: "none",
    "&:hover": {
      borderColor: "#405189",
    },
  }),
  valueContainer: (base: Record<string, unknown>) => ({
    ...base,
    padding: "0 8px",
    height: "36px",
    whiteSpace: "nowrap",
    overflow: "hidden",
  }),
  indicatorsContainer: (base: Record<string, unknown>) => ({
    ...base,
    height: "36px",
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    zIndex: 9999,
    fontSize: "13px",
  }),
  menuPortal: (base: Record<string, unknown>) => ({
    ...base,
    zIndex: 9999,
  }),
};

const AddTrip = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id, tripId } = useParams<{ id?: string; tripId?: string }>();
  const activeId = id || tripId;
  const isEditMode = Boolean(activeId);

  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [configurations, setConfigurations] = useState<VehicleConfiguration[]>(
    VEHICLE_CONFIGURATIONS
  );

  const [rows, setRows] = useState<BatchTripRow[]>([
    createEmptyBatchTripRow(1),
  ]);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [rowsToAdd, setRowsToAdd] = useState<number>(5);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load catalogs and trip data (if editing)
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setErrorMessage(null);
        setLoadingInitial(true);

        const catalogsPromise = fetchTripCatalogs();
        const tripPromise =
          isEditMode && activeId
            ? fetchTripById(Number(activeId))
            : Promise.resolve(null);

        const [catalogsData, tripData] = await Promise.all([
          catalogsPromise,
          tripPromise,
        ]);

        if (isMounted) {
          setVehicles(catalogsData.vehicles);
          setDrivers(catalogsData.drivers);
          setDestinations(catalogsData.destinations);
          if (
            catalogsData.configurations &&
            catalogsData.configurations.length > 0
          ) {
            setConfigurations(catalogsData.configurations);
          }

          if (tripData) {
            // Edit mode: single row loaded from existing trip
            const tractoVehicleId =
              (tripData.vehicle ? String(tripData.vehicle.id) : "") ||
              ((tripData as any).vehicle_id ? String((tripData as any).vehicle_id) : "");

            const driverId =
              (tripData.driver ? String(tripData.driver.id) : "") ||
              ((tripData as any).driver_id ? String((tripData as any).driver_id) : "");

            const originId =
              (tripData.origin ? String(tripData.origin.id) : "") ||
              ((tripData as any).origin ? String((tripData as any).origin) : "");

            const destinationId =
              (tripData.destination ? String(tripData.destination.id) : "") ||
              ((tripData as any).destination ? String((tripData as any).destination) : "");

            const configCode =
              tripData.configurationCode ||
              (tripData as any).configuration_data?.code ||
              (tripData as any).configuration?.code ||
              (tripData as any).configuration_code ||
              "";

            const configId =
              tripData.configurationId ||
              (tripData as any).configuration_data?.id_configuration ||
              (tripData as any).configuration?.id ||
              undefined;

            let semiPlates: string[] = tripData.semiPlates || [];
            if (semiPlates.length === 0 && Array.isArray((tripData as any).units)) {
              const trailerUnits = (tripData as any).units
                .filter(
                  (u: any) =>
                    u.unit_type === "REMOLQUE" ||
                    u.unit_type === "SEMIRREMOLQUE" ||
                    (u.position != null && u.position > 0)
                )
                .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
              semiPlates = trailerUnits.map((u: any) =>
                String(u.vehicle_id || u.vehicle?.idvehiculo || "")
              );
            }

            const editRow: BatchTripRow = {
              rowId: `edit-${tripData.idTrip}`,
              tripNumber: tripData.tripNumber,
              driverId,
              origin: originId,
              destination: destinationId,
              departureDate: formatForDateTimeInput(tripData.departureDate),
              returnDate: formatForDateTimeInput(tripData.returnDate),
              vehicleId: tractoVehicleId,
              configurationCode: configCode,
              configurationId: configId,
              semiPlates,
              foodCost: "",
              lodgingCost: "",
              costPerAxle: "",
              tollCount: "",
              notes: tripData.notes || "",
              status: tripData.status ?? true,
            };
            setRows([editRow]);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err?.message || t("Error loading trip catalogs"));
        }
      } finally {
        if (isMounted) {
          setLoadingInitial(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [activeId, isEditMode, t]);

  useEffect(() => {
    document.title = `${isEditMode ? t("Edit Trip") : t("New Trip")} | Docuware`;
  }, [isEditMode, t]);

  const vehicleOptions = useMemo<SelectOption[]>(
    () =>
      vehicles.map((v) => ({
        value: String(v.idvehiculo),
        label: v.no_vehiculo,
      })),
    [vehicles]
  );

  const driverOptions = useMemo<SelectOption[]>(
    () =>
      drivers.map((d) => ({
        value: String(d.userID),
        label:
          String(d.fullName ?? "").trim() ||
          String(d.userName ?? "").trim() ||
          String(d.userID),
      })),
    [drivers]
  );

  const destinationOptions = useMemo<SelectOption[]>(
    () =>
      destinations.map((dst) => ({
        value: String(dst.idorigen),
        label: dst.nombre_origen,
      })),
    [destinations]
  );

  const configurationOptions = useMemo<SelectOption[]>(
    () =>
      configurations.map((c) => ({
        value: c.code,
        label: c.label,
      })),
    [configurations]
  );

  // Checkbox handlers
  const allSelected =
    rows.length > 0 && selectedRowIds.size === rows.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(rows.map((r) => r.rowId)));
    }
  };

  const handleToggleSelectRow = (rowId: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  // Add Rows
  const handleAddRows = () => {
    const count = Math.max(1, rowsToAdd || 1);
    const newItems: BatchTripRow[] = [];
    for (let i = 0; i < count; i++) {
      newItems.push(createEmptyBatchTripRow(rows.length + i + 1));
    }
    setRows((prev) => [...prev, ...newItems]);
  };

  // Duplicate Selected
  const handleDuplicateSelected = () => {
    if (selectedRowIds.size === 0) return;
    const duplicated: BatchTripRow[] = [];
    rows.forEach((row, idx) => {
      if (selectedRowIds.has(row.rowId)) {
        duplicated.push({
          ...row,
          rowId: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          tripNumber: `${row.tripNumber}-C${idx + 1}`,
        });
      }
    });
    setRows((prev) => [...prev, ...duplicated]);
    setSelectedRowIds(new Set());
  };

  // Delete Selected
  const handleDeleteSelected = () => {
    if (selectedRowIds.size === 0) return;
    setRows((prev) => prev.filter((r) => !selectedRowIds.has(r.rowId)));
    setSelectedRowIds(new Set());
  };

  // Delete single row
  const handleDeleteSingleRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  };

  // Add single row directly after index
  const handleAddRowAfter = (index: number) => {
    const newRow = createEmptyBatchTripRow(rows.length + 1);
    setRows((prev) => {
      const updated = [...prev];
      updated.splice(index + 1, 0, newRow);
      return updated;
    });
  };

  // Row field update
  const handleUpdateRowField = (
    rowId: string,
    field: keyof BatchTripRow,
    value: any
  ) => {
    setRows((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, [field]: value } : row))
    );
  };

  // Semi-remolque plate update
  const handleUpdateSemiPlate = (
    rowId: string,
    semiIndex: number,
    plateValue: string
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;
        const currentPlates = [...row.semiPlates];
        currentPlates[semiIndex] = plateValue;
        return { ...row, semiPlates: currentPlates };
      })
    );
  };

  // Configuration change
  const handleConfigurationChange = (
    rowId: string,
    configCode: string
  ) => {
    if (!configCode) {
      setRows((prev) =>
        prev.map((row) => {
          if (row.rowId !== rowId) return row;
          return {
            ...row,
            configurationCode: "",
            configurationId: undefined,
            semiPlates: [],
          };
        })
      );
      return;
    }

    const config =
      configurations.find((c) => c.code === configCode) ||
      VEHICLE_CONFIGURATIONS.find((c) => c.code === configCode);

    if (!config) return;

    setRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;
        const neededUnits = config.semiUnits;
        const newPlates = Array(neededUnits).fill("");
        // Preserve any previously filled plate if exists
        for (let i = 0; i < Math.min(row.semiPlates.length, neededUnits); i++) {
          newPlates[i] = row.semiPlates[i];
        }
        return {
          ...row,
          configurationCode: configCode,
          configurationId: config.id,
          semiPlates: newPlates,
        };
      })
    );
  };

  // Submit all trips
  const handleRegisterAll = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (rows.length === 0) {
      setErrorMessage("No hay viajes para registrar. Agrega al menos una fila.");
      return;
    }

    // Validation
    const invalidRows: number[] = [];
    rows.forEach((row, index) => {
      const config = configurations.find((c) => c.code === row.configurationCode);
      const neededSemiUnits = config ? config.semiUnits : 0;
      const validSemiPlatesCount = (row.semiPlates || []).filter(
        (id) => Boolean(id && !isNaN(Number(id)))
      ).length;

      if (
        !row.driverId ||
        !row.origin ||
        !row.destination ||
        !row.departureDate ||
        !row.returnDate ||
        !row.vehicleId ||
        !row.configurationCode ||
        validSemiPlatesCount < neededSemiUnits
      ) {
        invalidRows.push(index + 1);
      }
    });

    if (invalidRows.length > 0) {
      setErrorMessage(
        `Por favor completa los campos requeridos (Conductor, Origen, Destino, Fechas, Tracto, Configuración y Semirremolques requeridos) en las filas: ${invalidRows
          .map((n) => `#${String(n).padStart(2, "0")}`)
          .join(", ")}`
      );
      return;
    }

    const sessionUser = getCurrentSessionUser();
    if (sessionUser.id === null) {
      setErrorMessage("No fue posible identificar al usuario autenticado.");
      return;
    }

    try {
      setSubmitting(true);

      if (isEditMode && activeId) {
        // Edit single trip
        const singleRow = rows[0];
        const singleConfig = configurations.find(
          (c) => c.code === singleRow.configurationCode
        );
        await updateTrip(
          Number(activeId),
          {
            tripNumber: singleRow.tripNumber,
            vehicleId: singleRow.vehicleId,
            driverId: singleRow.driverId,
            origin: singleRow.origin,
            destination: singleRow.destination,
            departureDate: singleRow.departureDate,
            returnDate: singleRow.returnDate,
            notes: singleRow.notes,
            status: singleRow.status,
            configurationId: singleRow.configurationId
              ? String(singleRow.configurationId)
              : singleConfig?.id
              ? String(singleConfig.id)
              : undefined,
            configurationCode: singleRow.configurationCode,
          },
          sessionUser.id
        );

        // If additional rows were added, register them via bulk API
        if (rows.length > 1) {
          const additionalRows = rows.slice(1);
          const bulkPayload = {
            created_by: sessionUser.id,
            rows: additionalRows.map((row, index) => ({
              row_number: index + 1,
              driver_id: Number(row.driverId),
              origin: Number(row.origin),
              destination: Number(row.destination),
              departure_date: formatIsoWithOffset(row.departureDate),
              return_date: formatIsoWithOffset(row.returnDate),
              configuration_code: row.configurationCode,
              tractor_id: Number(row.vehicleId),
              trailers: (row.semiPlates || [])
                .filter((plateId) => Boolean(plateId && !isNaN(Number(plateId))))
                .map((plateId) => ({ vehicle_id: Number(plateId) })),
              notes: (row.notes || "").trim() || "Viaje creado masivamente",
            })),
          };
          await createBulkTrips(bulkPayload);
        }

        navigate("/travel-expenses/trips", {
          state: {
            message:
              rows.length > 1
                ? `Viaje #${activeId} actualizado y ${rows.length - 1} nuevo(s) viaje(s) registrado(s).`
                : t("Trip updated successfully."),
            type: "success",
          },
        });
      } else {
        // Create multiple trips in batch using POST /api/trips/bulk/
        const bulkPayload = {
          created_by: sessionUser.id,
          rows: rows.map((row, index) => ({
            row_number: index + 1,
            driver_id: Number(row.driverId),
            origin: Number(row.origin),
            destination: Number(row.destination),
            departure_date: formatIsoWithOffset(row.departureDate),
            return_date: formatIsoWithOffset(row.returnDate),
            configuration_code: row.configurationCode,
            tractor_id: Number(row.vehicleId),
            trailers: (row.semiPlates || [])
              .filter((plateId) => Boolean(plateId && !isNaN(Number(plateId))))
              .map((plateId) => ({ vehicle_id: Number(plateId) })),
            notes: (row.notes || "").trim() || "Viaje creado masivamente",
          })),
        };

        const result = await createBulkTrips(bulkPayload);

        const createdCount = result.data?.created_rows ?? rows.length;
        navigate("/travel-expenses/trips", {
          state: {
            message:
              result.message ||
              `Se registraron exitosamente ${createdCount} viaje(s).`,
            type: "success",
          },
        });
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Ocurrió un error al procesar el registro de viajes."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb
          title={isEditMode ? t("Edit Trip") : t("New Trip")}
          pageTitle={t("Trips")}
        />

        {/* Top Control Bar */}
        <Card className="border-0 shadow-sm mb-3">
          <CardBody className="p-3">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              {/* Left Group */}
              <div className="d-flex flex-wrap align-items-center gap-2">
                {!isEditMode ? (
                  <>
                    <div className="d-flex align-items-center gap-1">
                      <span className="text-muted small">Agregar filas</span>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={rowsToAdd}
                        onChange={(e) =>
                          setRowsToAdd(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        style={{
                          width: "60px",
                          height: "36px",
                          textAlign: "center",
                          fontSize: "13px",
                        }}
                      />
                    </div>

                    <Button
                      color="light"
                      className="border bg-white"
                      style={{ height: "36px", fontSize: "13px" }}
                      onClick={handleAddRows}
                    >
                      + Agregar {rowsToAdd}
                    </Button>

                    <Button
                      color="light"
                      className="border bg-white text-muted"
                      style={{ height: "36px", fontSize: "13px" }}
                      onClick={handleDuplicateSelected}
                      disabled={selectedRowIds.size === 0}
                    >
                      Duplicar seleccionados
                    </Button>

                    <Button
                      color="light"
                      className="border"
                      style={{
                        height: "36px",
                        fontSize: "13px",
                        borderColor: "#fca5a5",
                        color: "#ef4444",
                        backgroundColor: "#fff",
                      }}
                      onClick={handleDeleteSelected}
                      disabled={selectedRowIds.size === 0}
                    >
                      Eliminar seleccionados
                    </Button>
                  </>
                ) : (
                  <span className="badge bg-primary-subtle text-primary px-3 py-2 fs-6">
                    Editando Viaje #{activeId}
                  </span>
                )}
              </div>

              {/* Right Button */}
              <div className="d-flex align-items-center gap-2">
                <Button
                  color="light"
                  className="border bg-white text-secondary"
                  type="button"
                  style={{ height: "38px", fontSize: "13px" }}
                  onClick={() => navigate("/travel-expenses/trips")}
                  disabled={submitting}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  style={{
                    backgroundColor: "#f59e0b",
                    borderColor: "#f59e0b",
                    color: "#ffffff",
                    fontWeight: 600,
                    height: "38px",
                    padding: "0 22px",
                  }}
                  onClick={handleRegisterAll}
                  disabled={submitting || loadingInitial || rows.length === 0}
                >
                  {submitting && <Spinner size="sm" className="me-2 text-white" />}
                  {isEditMode
                    ? t("Update Trip")
                    : `Registrar ${rows.length} viaje(s)`}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {errorMessage && (
          <Alert color="danger" fade={false} className="mb-3">
            <i className="ri-error-warning-line me-2 align-middle fs-5" />
            {errorMessage}
          </Alert>
        )}

        {successMessage && (
          <Alert color="success" fade={false} className="mb-3">
            <i className="ri-checkbox-circle-line me-2 align-middle fs-5" />
            {successMessage}
          </Alert>
        )}

        {/* Trips Table */}
        <Card className="border-0 shadow-sm">
          <CardBody className="p-0">
            {loadingInitial ? (
              <div className="text-center py-5">
                <Spinner color="primary" />
                <p className="text-muted mt-2 mb-0">{t("Loading...")}</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table className="table align-top mb-0" style={{ minWidth: "1600px" }}>
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "45px", minWidth: "45px" }} className="text-center align-middle">
                        <Input
                          type="checkbox"
                          className="form-check-input"
                          checked={allSelected}
                          onChange={handleToggleSelectAll}
                        />
                      </th>
                      <th style={{ width: "45px", minWidth: "45px" }} className="align-middle">
                        #
                      </th>
                      <th style={{ width: "220px", minWidth: "220px" }} className="align-middle">
                        CONDUCTOR
                      </th>
                      <th style={{ width: "170px", minWidth: "170px" }} className="align-middle">
                        ORIGEN
                      </th>
                      <th style={{ width: "170px", minWidth: "170px" }} className="align-middle">
                        DESTINO
                      </th>
                      <th style={{ width: "190px", minWidth: "190px" }} className="align-middle">
                        INICIO
                      </th>
                      <th style={{ width: "190px", minWidth: "190px" }} className="align-middle">
                        FIN
                      </th>
                      <th style={{ width: "170px", minWidth: "170px" }} className="align-middle">
                        TRACTO
                      </th>
                      <th style={{ width: "300px", minWidth: "300px" }} className="align-middle">
                        CONFIGURACIÓN Y UNIDADES
                      </th>
                      {!isEditMode && (
                        <th style={{ width: "95px", minWidth: "95px" }} className="align-middle text-center">
                          ACCIONES
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={isEditMode ? 9 : 10} className="text-center py-5 text-muted">
                          No hay viajes agregados. Usa el botón "+ Agregar" para añadir filas.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, index) => {
                        const currentConfig: VehicleConfiguration | null =
                          row.configurationCode
                            ? configurations.find(
                                (c) => c.code === row.configurationCode
                              ) || null
                            : null;

                        const selectedConfigOption = row.configurationCode
                          ? configurationOptions.find(
                              (opt) => opt.value === row.configurationCode
                            ) || null
                          : null;

                        const isChecked = selectedRowIds.has(row.rowId);

                        return (
                          <tr
                            key={row.rowId}
                            style={{
                              backgroundColor: isChecked ? "#f8fafc" : undefined,
                            }}
                          >
                            {/* Checkbox */}
                            <td style={{ width: "45px", minWidth: "45px" }} className="text-center pt-3">
                              <Input
                                type="checkbox"
                                className="form-check-input"
                                checked={isChecked}
                                onChange={() => handleToggleSelectRow(row.rowId)}
                              />
                            </td>

                            {/* Row Index */}
                            <td style={{ width: "45px", minWidth: "45px", fontSize: "13px" }} className="pt-3 text-muted fw-semibold">
                              {String(index + 1).padStart(2, "0")}
                            </td>

                            {/* Conductor */}
                            <td style={{ width: "220px", minWidth: "220px" }} className="pt-2">
                              <Select
                                value={
                                  driverOptions.find(
                                    (opt) => opt.value === row.driverId
                                  ) || null
                                }
                                options={driverOptions}
                                onChange={(selected: SelectOption | null) =>
                                  handleUpdateRowField(
                                    row.rowId,
                                    "driverId",
                                    selected?.value || ""
                                  )
                                }
                                placeholder="Seleccionar..."
                                isClearable
                                isSearchable
                                styles={tableSelectStyles}
                                menuPortalTarget={document.body}
                              />
                            </td>

                            {/* Origen */}
                            <td style={{ width: "170px", minWidth: "170px" }} className="pt-2">
                              <Select
                                value={
                                  destinationOptions.find(
                                    (opt) => opt.value === row.origin
                                  ) || null
                                }
                                options={destinationOptions}
                                onChange={(selected: SelectOption | null) =>
                                  handleUpdateRowField(
                                    row.rowId,
                                    "origin",
                                    selected?.value || ""
                                  )
                                }
                                placeholder="Origen..."
                                isClearable
                                isSearchable
                                styles={tableSelectStyles}
                                menuPortalTarget={document.body}
                              />
                            </td>

                            {/* Destino */}
                            <td style={{ width: "170px", minWidth: "170px" }} className="pt-2">
                              <Select
                                value={
                                  destinationOptions.find(
                                    (opt) => opt.value === row.destination
                                  ) || null
                                }
                                options={destinationOptions}
                                onChange={(selected: SelectOption | null) =>
                                  handleUpdateRowField(
                                    row.rowId,
                                    "destination",
                                    selected?.value || ""
                                  )
                                }
                                placeholder="Destino..."
                                isClearable
                                isSearchable
                                styles={tableSelectStyles}
                                menuPortalTarget={document.body}
                              />
                            </td>

                            {/* Inicio */}
                            <td style={{ width: "190px", minWidth: "190px" }} className="pt-2">
                              <Input
                                type="datetime-local"
                                value={row.departureDate}
                                onChange={(e) =>
                                  handleUpdateRowField(
                                    row.rowId,
                                    "departureDate",
                                    e.target.value
                                  )
                                }
                                style={{ height: "36px", fontSize: "13px", width: "100%" }}
                              />
                            </td>

                            {/* Fin */}
                            <td style={{ width: "190px", minWidth: "190px" }} className="pt-2">
                              <Input
                                type="datetime-local"
                                value={row.returnDate}
                                onChange={(e) =>
                                  handleUpdateRowField(
                                    row.rowId,
                                    "returnDate",
                                    e.target.value
                                  )
                                }
                                style={{ height: "36px", fontSize: "13px", width: "100%" }}
                              />
                            </td>

                            {/* Tracto */}
                            <td style={{ width: "170px", minWidth: "170px" }} className="pt-2">
                              <Select
                                value={
                                  vehicleOptions.find(
                                    (opt) => opt.value === row.vehicleId
                                  ) || null
                                }
                                options={vehicleOptions}
                                onChange={(selected: SelectOption | null) =>
                                  handleUpdateRowField(
                                    row.rowId,
                                    "vehicleId",
                                    selected?.value || ""
                                  )
                                }
                                placeholder="Tracto..."
                                isClearable
                                isSearchable
                                styles={tableSelectStyles}
                                menuPortalTarget={document.body}
                              />
                            </td>

                            {/* Configuración y Unidades */}
                            <td style={{ width: "300px", minWidth: "300px" }} className="pt-2">
                              <div className="d-flex flex-column gap-1">
                                {/* Configuration Select */}
                                <Select
                                  value={selectedConfigOption}
                                  options={configurationOptions}
                                  onChange={(selected: SelectOption | null) => {
                                    handleConfigurationChange(
                                      row.rowId,
                                      selected?.value || ""
                                    );
                                  }}
                                  placeholder="Configuración..."
                                  isClearable
                                  isSearchable
                                  styles={tableSelectStyles}
                                  menuPortalTarget={document.body}
                                />

                                {currentConfig && (
                                  <>
                                    {/* Visual Diagram Badges */}
                                    <div className="d-flex align-items-end my-1 ps-1" style={{ height: "24px" }}>
                                      {/* Tracto unit silhouette (black) */}
                                      {currentConfig.tractoUnits > 0 && (
                                        <img
                                          src={tractoIcon}
                                          alt="Tracto"
                                          title="Tracto"
                                          style={{
                                            height: "22px",
                                            width: "auto",
                                            objectFit: "contain",
                                          }}
                                        />
                                      )}
                                      {/* Semirremolque units silhouettes (yellow) */}
                                      {Array.from({ length: currentConfig.semiUnits }).map(
                                        (_, semiIdx) => (
                                          <img
                                            key={`semi-badge-${semiIdx}`}
                                            src={semiYellowIcon}
                                            alt={`Semirremolque ${semiIdx + 1}`}
                                            title={`Semirremolque ${semiIdx + 1}`}
                                            style={{
                                              height: "20px",
                                              width: "auto",
                                              marginLeft: "-3px",
                                              objectFit: "contain",
                                            }}
                                          />
                                        )
                                      )}
                                    </div>

                                    {/* Dynamic Semirremolques Plate Selectors */}
                                    {Array.from({ length: currentConfig.semiUnits }).map(
                                      (_, semiIdx) => {
                                        const currentSemiPlate =
                                          row.semiPlates[semiIdx] || "";
                                        const selectedOption =
                                          vehicleOptions.find(
                                            (opt) => opt.value === currentSemiPlate
                                          ) || null;

                                        return (
                                          <div
                                            key={`semi-row-${semiIdx}`}
                                            className="d-flex align-items-center gap-2 mt-1"
                                          >
                                            <span
                                              className="text-muted small text-nowrap"
                                              style={{ fontSize: "12px", width: "95px" }}
                                            >
                                              {semiIdx + 1} Semirremolque
                                            </span>
                                            <div style={{ flex: 1 }}>
                                              <Select
                                                value={selectedOption}
                                                options={vehicleOptions}
                                                onChange={(selected: SelectOption | null) =>
                                                  handleUpdateSemiPlate(
                                                    row.rowId,
                                                    semiIdx,
                                                    selected?.value || ""
                                                  )
                                                }
                                                placeholder="Placa..."
                                                isClearable
                                                isSearchable
                                                styles={tableSelectStyles}
                                                menuPortalTarget={document.body}
                                              />
                                            </div>
                                          </div>
                                        );
                                      }
                                    )}
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Acciones */}
                            {!isEditMode && (
                              <td
                                style={{ width: "95px", minWidth: "95px", verticalAlign: "top" }}
                                className="pt-2 text-center"
                              >
                                <div
                                  className="d-flex align-items-center justify-content-center gap-1"
                                  style={{ height: "36px" }}
                                >
                                  <Button
                                    color="light"
                                    className="border bg-white text-muted p-0 d-flex align-items-center justify-content-center"
                                    style={{ width: "32px", height: "32px" }}
                                    onClick={() => handleAddRowAfter(index)}
                                    title="Agregar fila debajo"
                                  >
                                    <i className="ri-add-line fs-5" />
                                  </Button>
                                  <Button
                                    color="light"
                                    className="border bg-white text-muted p-0 d-flex align-items-center justify-content-center"
                                    style={{ width: "32px", height: "32px" }}
                                    onClick={() => handleDeleteSingleRow(row.rowId)}
                                    title="Eliminar fila"
                                  >
                                    <i className="ri-close-line fs-5" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </div>
            )}
          </CardBody>
        </Card>
      </Container>
    </div>
  );
};

export default AddTrip;
