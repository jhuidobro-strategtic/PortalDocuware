import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Table,
  Spinner,
  Alert,
  Button,
  Input,
  InputGroup,
  InputGroupText,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
} from "reactstrap";
import moment from "moment";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import Select from 'react-select';

// Interfaces
interface Vehiculo {
  idvehiculo: number;
  no_vehiculo: string;
}

interface Conductor {
  idconductor: number;
  conductor_nm: string;
}

interface Programacion {
  programacionid: number;
  programacionfecha: string;
  vehiculo: Vehiculo;
  conductor: Conductor;
}

interface NuevaProgramacion {
  programacionfecha: string;
  idvehiculo: number | null;
  idconductor: number | null;
}

const ProgramacionDiaria: React.FC = () => {
  // Estados principales
  const [programaciones, setProgramaciones] = useState<Programacion[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de registro
  const [registroModal, setRegistroModal] = useState(false);
  const [nuevaProgramacion, setNuevaProgramacion] = useState<NuevaProgramacion>({
    programacionfecha: moment().format("YYYY-MM-DD"),
    idvehiculo: null,
    idconductor: null,
  });

  // Modal de edición
  const [editModal, setEditModal] = useState(false);
  const [editProgramacion, setEditProgramacion] = useState<Programacion | null>(null);

  // Notificaciones
  const [notifications, setNotifications] = useState<
    { id: number; type: string; message: string }[]
  >([]);

  // Buscador
  const [searchTerm, setSearchTerm] = useState("");

  const addNotification = (type: string, message: string) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  // Cargar datos iniciales
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
        throw new Error("Error al obtener programaciones");
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
      console.error("Error al cargar vehículos:", error);
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
      console.error("Error al cargar conductores:", error);
    }
  };

  const handleRegistrar = async () => {
    // Validación
    if (!nuevaProgramacion.programacionfecha || !nuevaProgramacion.idvehiculo || !nuevaProgramacion.idconductor) {
      addNotification("danger", "Complete todos los campos");
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
        addNotification("success", "Programación registrada correctamente");
        setRegistroModal(false);
        fetchProgramaciones(); // Recargar la lista

        // Limpiar formulario
        setNuevaProgramacion({
          programacionfecha: moment().format("YYYY-MM-DD"),
          idvehiculo: null,
          idconductor: null,
        });
      } else {
        addNotification("danger", data.message || "Error al registrar programación");
      }
    } catch (error) {
      console.error("Error al registrar:", error);
      addNotification("danger", "Error en el proceso de registro");
    }
  };

  const handleUpdate = async () => {
    if (!editProgramacion) return;

    // Validación
    if (!editProgramacion.programacionfecha || !editProgramacion.vehiculo.idvehiculo || !editProgramacion.conductor.idconductor) {
      addNotification("danger", "Complete todos los campos");
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
        addNotification("success", "Programación actualizada correctamente");
        setEditModal(false);
        fetchProgramaciones(); // Recargar la lista
      } else {
        addNotification("danger", data.message || "Error al actualizar programación");
      }
    } catch (error) {
      console.error("Error al actualizar:", error);
      addNotification("danger", "Error en el proceso de actualización");
    }
  };

  const toggleRegistroModal = () => {
    setRegistroModal(!registroModal);
  };

  const toggleEditModal = () => {
    setEditModal(!editModal);
  };

  // Filtrar programaciones basándose en el término de búsqueda
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
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
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
      {/* Notificaciones */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 9999 }}>
        {notifications.map((notif) => (
          <Alert
            key={notif.id}
            color={notif.type}
            className="mb-2"
            toggle={() =>
              setNotifications((prev) => prev.filter((n) => n.id !== notif.id))
            }
          >
            {notif.message}
          </Alert>
        ))}
      </div>

      <Row>
        <Col lg={12}>
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="card-title mb-0">Programación Diaria</h4>
                <div className="d-flex gap-2 align-items-center">
                  <InputGroup style={{ maxWidth: "250px" }}>
                    <InputGroupText>
                      <i className="ri-search-line" />
                    </InputGroupText>
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                      }}
                    />
                  </InputGroup>
                  <Button color="primary" onClick={toggleRegistroModal}>
                    <i className="ri-add-line align-bottom me-1" />
                    Nuevo
                  </Button>
                </div>
              </div>

              {/* Tabla de Programaciones */}
              <div className="table-responsive">
                <Table className="table table-bordered table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="text-center" style={{ width: "80px" }}>ID</th>
                      <th className="text-center" style={{ width: "150px" }}>Fecha</th>
                      <th className="text-center" style={{ width: "150px" }}>Vehículo</th>
                      <th>Conductor</th>
                      <th className="text-center" style={{ width: "120px" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProgramaciones.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center">
                          {searchTerm ? "No se encontraron resultados" : "No hay programaciones registradas"}
                        </td>
                      </tr>
                    ) : (
                      filteredProgramaciones.map((prog) => (
                        <tr key={prog.programacionid}>
                          <td className="text-center">
                            <b>#{prog.programacionid}</b>
                          </td>
                          <td className="text-center">
                            {moment(prog.programacionfecha).format("DD/MM/YYYY")}
                          </td>
                          <td className="text-center">
                            {/* <span className="badge bg-primary"> */}
                            {prog.vehiculo.no_vehiculo}
                            {/* </span> */}
                          </td>
                          <td>{prog.conductor.conductor_nm}</td>
                          <td className="text-center">
                            <Button
                              size="sm"
                              color="warning"
                              outline
                              onClick={() => {
                                setEditProgramacion(prog);
                                setEditModal(true);
                              }}
                            >
                              <i className="ri-edit-box-line align-bottom" /> Editar
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Modal de Registro */}
      <Modal
        isOpen={registroModal}
        toggle={toggleRegistroModal}
        centered
        size="lg"
      >
        <ModalHeader toggle={toggleRegistroModal}>
          <h5 className="modal-title">Nueva Programación Diaria</h5>
        </ModalHeader>
        <ModalBody>
          <Form>
            {/* Fecha */}
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
                    value={nuevaProgramacion.programacionfecha}
                    onChange={(dates) => {
                      if (dates[0]) {
                        setNuevaProgramacion({
                          ...nuevaProgramacion,
                          programacionfecha: moment(dates[0]).format("YYYY-MM-DD"),
                        });
                      }
                    }}
                    options={{
                      dateFormat: "Y-m-d",
                      defaultDate: nuevaProgramacion.programacionfecha,
                    }}
                  />
                </Col>
              </Row>
            </FormGroup>

            {/* Vehículo */}
            <FormGroup>
              <Row className="align-items-center">
                <Col md="3">
                  <Label className="form-label mb-0">
                    Vehículo <span className="text-danger">*</span>
                  </Label>
                </Col>
                <Col md="9">
                  <Select
                    value={
                      nuevaProgramacion.idvehiculo
                        ? {
                          value: nuevaProgramacion.idvehiculo,
                          label: vehiculos.find(v => v.idvehiculo === nuevaProgramacion.idvehiculo)?.no_vehiculo || "",
                        }
                        : null
                    }
                    options={vehiculos.map((vehiculo) => ({
                      value: vehiculo.idvehiculo,
                      label: vehiculo.no_vehiculo,
                    }))}
                    onChange={(selected: { value: number; label: string } | null) =>
                      setNuevaProgramacion({
                        ...nuevaProgramacion,
                        idvehiculo: selected ? selected.value : null,
                      })
                    }
                    placeholder="Seleccione un vehículo"
                    isClearable
                    isSearchable
                    noOptionsMessage={() => "No hay resultados"}
                    styles={{
                      control: (base: any) => ({
                        ...base,
                        minHeight: "38px",
                      }),
                      menu: (base: any) => ({
                        ...base,
                        zIndex: 9999,
                      }),
                      menuPortal: (base: any) => ({
                        ...base,
                        zIndex: 9999,
                      }),
                    }}
                    menuPortalTarget={document.body}
                  />
                </Col>
              </Row>
            </FormGroup>

            {/* Conductor */}
            <FormGroup>
              <Row className="align-items-center">
                <Col md="3">
                  <Label className="form-label mb-0">
                    Conductor <span className="text-danger">*</span>
                  </Label>
                </Col>
                <Col md="9">
                  <Select
                    value={
                      nuevaProgramacion.idconductor
                        ? {
                          value: nuevaProgramacion.idconductor,
                          label: conductores.find(c => c.idconductor === nuevaProgramacion.idconductor)?.conductor_nm || "",
                        }
                        : null
                    }
                    options={conductores.map((conductor) => ({
                      value: conductor.idconductor,
                      label: conductor.conductor_nm,
                    }))}
                    onChange={(selected: { value: number; label: string } | null) =>
                      setNuevaProgramacion({
                        ...nuevaProgramacion,
                        idconductor: selected ? selected.value : null,
                      })
                    }
                    placeholder="Seleccione un conductor"
                    isClearable
                    isSearchable
                    noOptionsMessage={() => "No hay resultados"}
                    styles={{
                      control: (base: any) => ({
                        ...base,
                        minHeight: "38px",
                      }),
                      menu: (base: any) => ({
                        ...base,
                        zIndex: 9999,
                      }),
                      menuPortal: (base: any) => ({
                        ...base,
                        zIndex: 9999,
                      }),
                    }}
                    menuPortalTarget={document.body}
                  />
                </Col>
              </Row>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={handleRegistrar}>
            <i className="ri-save-line align-bottom me-1" />
            Registrar
          </Button>
          <Button color="secondary" onClick={toggleRegistroModal}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal de Edición */}
      <Modal
        isOpen={editModal}
        toggle={toggleEditModal}
        centered
        size="lg"
      >
        <ModalHeader toggle={toggleEditModal}>
          <h5 className="modal-title">Editar Programación Diaria</h5>
        </ModalHeader>
        <ModalBody>
          {editProgramacion && (
            <Form>
              <FormGroup>
                <Row className="align-items-center">
                  <Col md="3">
                    <Label className="form-label mb-0">Fecha de Programación <span className="text-danger">*</span></Label>
                  </Col>
                  <Col md="9">
                    <Flatpickr
                      className="form-control"
                      value={editProgramacion.programacionfecha}
                      onChange={(dates) => {
                        if (dates[0]) {
                          setEditProgramacion({
                            ...editProgramacion,
                            programacionfecha: moment(dates[0]).format("YYYY-MM-DD"),
                          });
                        }
                      }}
                      options={{
                        dateFormat: "Y-m-d",
                        defaultDate: editProgramacion.programacionfecha,
                      }}
                    />
                  </Col>
                </Row>
              </FormGroup>

              {/* Vehículo */}
              <FormGroup>
                <Row className="align-items-center">
                  <Col md="3">
                    <Label className="form-label mb-0">Vehículo <span className="text-danger">*</span></Label>
                  </Col>
                  <Col md="9">
                    <Select
                      value={{
                        value: editProgramacion.vehiculo.idvehiculo,
                        label: editProgramacion.vehiculo.no_vehiculo,
                      }}
                      options={vehiculos.map((vehiculo) => ({
                        value: vehiculo.idvehiculo,
                        label: vehiculo.no_vehiculo,
                      }))}
                      onChange={(selected: { value: number; label: string } | null) => {
                        if (selected) {
                          setEditProgramacion({
                            ...editProgramacion,
                            vehiculo: {
                              idvehiculo: selected.value,
                              no_vehiculo: selected.label,
                            },
                          });
                        }
                      }}
                      placeholder="Seleccione un vehículo"
                      isClearable
                      isSearchable
                      noOptionsMessage={() => "No hay resultados"}
                      styles={{
                        control: (base: any) => ({
                          ...base,
                          minHeight: "38px",
                        }),
                        menu: (base: any) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                        menuPortal: (base: any) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                      }}
                      menuPortalTarget={document.body}
                    />
                  </Col>
                </Row>
              </FormGroup>

              {/* Conductor */}
              <FormGroup>
                <Row className="align-items-center">
                  <Col md="3">
                    <Label className="form-label">Conductor <span className="text-danger">*</span></Label>
                  </Col>
                  <Col md="9">
                    <Select
                      value={{
                        value: editProgramacion.conductor.idconductor,
                        label: editProgramacion.conductor.conductor_nm,
                      }}
                      options={conductores.map((conductor) => ({
                        value: conductor.idconductor,
                        label: conductor.conductor_nm,
                      }))}
                      onChange={(selected: { value: number; label: string } | null) => {
                        if (selected) {
                          setEditProgramacion({
                            ...editProgramacion,
                            conductor: {
                              idconductor: selected.value,
                              conductor_nm: selected.label,
                            },
                          });
                        }
                      }}
                      placeholder="Seleccione un conductor"
                      isClearable
                      isSearchable
                      noOptionsMessage={() => "No hay resultados"}
                      styles={{
                        control: (base: any) => ({
                          ...base,
                          minHeight: "38px",
                        }),
                        menu: (base: any) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                        menuPortal: (base: any) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                      }}
                      menuPortalTarget={document.body}
                    />
                  </Col>
                </Row>
              </FormGroup>
            </Form>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={handleUpdate}>
            <i className="ri-save-line align-bottom me-1" />
            Actualizar
          </Button>
          <Button color="secondary" onClick={toggleEditModal}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
};

export default ProgramacionDiaria;