import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, CardBody, Spinner, Alert } from "reactstrap";
import moment from "moment";
import DocumentFilters from "./components/ProgramacionFilters";
import DocumentTable from "./components/ProgramacionTable";
import ProgramacionFormModal from "./components/ProgramacionFormModal";
import Notifications from "./components/Notifications";
import {
  Vehiculo,
  Conductor,
  Programacion,
  NuevaProgramacion,
  Notification,
} from "./types";

const initialProgramacion: NuevaProgramacion = {
  programacionfecha: moment().format("YYYY-MM-DD"),
  idvehiculo: null,
  idconductor: null,
};

const ProgramacionDiaria: React.FC = () => {
  const [programaciones, setProgramaciones] = useState<Programacion[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [registroModal, setRegistroModal] = useState(false);
  const [nuevaProgramacion, setNuevaProgramacion] = useState<NuevaProgramacion>(
    initialProgramacion
  );

  const [editModal, setEditModal] = useState(false);
  const [editProgramacion, setEditProgramacion] = useState<Programacion | null>(
    null
  );

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const addNotification = (type: Notification["type"], message: string) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id: number) =>
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));

  useEffect(() => {
    fetchProgramaciones();
    fetchVehiculos();
    fetchConductores();
  }, []);

  const fetchProgramaciones = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        "https://docuware-api-a09ab977636d.herokuapp.com/api/programacion-diaria"
      );
      const data = await res.json();

      if (Array.isArray(data)) {
        setProgramaciones(data);
      } else {
        throw new Error("Error fetching programaciones");
      }
    } catch (err: any) {
      setError(err.message);
      addNotification("danger", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehiculos = async () => {
    try {
      const res = await fetch(
        "https://docuware-api-a09ab977636d.herokuapp.com/api/vehiculos"
      );
      const data = await res.json();

      if (Array.isArray(data)) {
        setVehiculos(data);
      }
    } catch (error) {
      console.error("Error loading vehiculos:", error);
    }
  };

  const fetchConductores = async () => {
    try {
      const res = await fetch(
        "https://docuware-api-a09ab977636d.herokuapp.com/api/conductores"
      );
      const data = await res.json();

      if (Array.isArray(data)) {
        setConductores(data);
      }
    } catch (error) {
      console.error("Error loading conductores:", error);
    }
  };

  const handleRegistrar = async () => {
    if (
      !nuevaProgramacion.programacionfecha ||
      !nuevaProgramacion.idvehiculo ||
      !nuevaProgramacion.idconductor
    ) {
      addNotification("danger", "Complete all fields");
      return;
    }

    try {
      const response = await fetch(
        "https://docuware-api-a09ab977636d.herokuapp.com/api/programacion-diaria/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nuevaProgramacion),
        }
      );

      const data = await response.json();

      if (response.ok || data.success) {
        addNotification("success", "Programacion registrada correctamente");
        setRegistroModal(false);
        fetchProgramaciones();
        setNuevaProgramacion(initialProgramacion);
      } else {
        addNotification(
          "danger",
          data.message || "Error registering programacion"
        );
      }
    } catch (error) {
      console.error("Error registering:", error);
      addNotification("danger", "Error in registration process");
    }
  };

  const handleUpdate = async () => {
    if (!editProgramacion) return;

    if (
      !editProgramacion.programacionfecha ||
      !editProgramacion.vehiculo.idvehiculo ||
      !editProgramacion.conductor.idconductor
    ) {
      addNotification("danger", "Complete all fields");
      return;
    }

    try {
      const response = await fetch(
        "https://docuware-api-a09ab977636d.herokuapp.com/api/programacion-diaria/",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            programacionid: editProgramacion.programacionid,
            programacionfecha: editProgramacion.programacionfecha,
            idvehiculo: editProgramacion.vehiculo.idvehiculo,
            idconductor: editProgramacion.conductor.idconductor,
          }),
        }
      );

      const data = await response.json();

      if (response.ok || data.success) {
        addNotification("success", "Programacion actualizada correctamente");
        setEditModal(false);
        fetchProgramaciones();
      } else {
        addNotification(
          "danger",
          data.message || "Error updating programacion"
        );
      }
    } catch (error) {
      console.error("Error updating:", error);
      addNotification("danger", "Error in update process");
    }
  };

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
  };

  const filteredProgramaciones = programaciones.filter((prog) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      prog.programacionid.toString().includes(searchLower) ||
      prog.vehiculo.no_vehiculo.toLowerCase().includes(searchLower) ||
      prog.conductor.conductor_nm.toLowerCase().includes(searchLower) ||
      moment(prog.programacionfecha).format("DD/MM/YYYY").includes(searchLower)
    );
  });

  if (loading) {
    return (
      <Container fluid>
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: "400px" }}
        >
          <Spinner color="primary" />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid>
        <Alert color="danger">Error: {error}</Alert>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Notifications
        notifications={notifications}
        onRemove={removeNotification}
      />

      <Row>
        <Col lg={12}>
          <Card>
            <CardBody>
              <DocumentFilters
                searchTerm={searchTerm}
                onSearchTermChange={handleSearchTermChange}
                onCreate={() => setRegistroModal(true)}
              />

              <DocumentTable
                programaciones={filteredProgramaciones}
                onEdit={(prog) => {
                  setEditProgramacion(prog);
                  setEditModal(true);
                }}
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      <ProgramacionFormModal
        isOpen={registroModal}
        toggle={() => setRegistroModal((prev) => !prev)}
        title="Nueva Programacion Diaria"
        date={nuevaProgramacion.programacionfecha}
        onDateChange={(value) =>
          setNuevaProgramacion((prev) => ({ ...prev, programacionfecha: value }))
        }
        vehicleId={nuevaProgramacion.idvehiculo}
        conductorId={nuevaProgramacion.idconductor}
        onVehicleChange={(value) =>
          setNuevaProgramacion((prev) => ({ ...prev, idvehiculo: value }))
        }
        onConductorChange={(value) =>
          setNuevaProgramacion((prev) => ({ ...prev, idconductor: value }))
        }
        vehicles={vehiculos}
        conductores={conductores}
        submitLabel="Registrar"
        onSubmit={handleRegistrar}
      />

      {editProgramacion && (
        <ProgramacionFormModal
          isOpen={editModal}
          toggle={() => setEditModal((prev) => !prev)}
          title="Editar Programacion Diaria"
          date={editProgramacion.programacionfecha}
          onDateChange={(value) =>
            setEditProgramacion((prev) =>
              prev ? { ...prev, programacionfecha: value } : prev
            )
          }
          vehicleId={editProgramacion.vehiculo.idvehiculo}
          conductorId={editProgramacion.conductor.idconductor}
          onVehicleChange={(value) =>
            setEditProgramacion((prev) => {
              if (!prev || value === null) return prev;
              const vehicleName =
                vehiculos.find((v) => v.idvehiculo === value)?.no_vehiculo ??
                prev.vehiculo.no_vehiculo;
              return {
                ...prev,
                vehiculo: { idvehiculo: value, no_vehiculo: vehicleName },
              };
            })
          }
          onConductorChange={(value) =>
            setEditProgramacion((prev) => {
              if (!prev || value === null) return prev;
              const conductorName =
                conductores.find((c) => c.idconductor === value)?.conductor_nm ??
                prev.conductor.conductor_nm;
              return {
                ...prev,
                conductor: { idconductor: value, conductor_nm: conductorName },
              };
            })
          }
          vehicles={vehiculos}
          conductores={conductores}
          submitLabel="Actualizar"
          onSubmit={handleUpdate}
        />
      )}
    </Container>
  );
};

export default ProgramacionDiaria;
