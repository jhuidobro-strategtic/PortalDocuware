import React from "react";
import { Table, Button } from "reactstrap";
import moment from "moment";
import { Programacion } from "../types";

interface ProgramacionTableProps {
  programaciones: Programacion[];
  onEdit: (item: Programacion) => void;
}

const ProgramacionTable: React.FC<ProgramacionTableProps> = ({
  programaciones,
  onEdit,
}) => (
  <div className="table-responsive">
    <Table className="table table-bordered table-hover mb-0">
      <thead className="table-light">
        <tr>
          <th className="text-center" style={{ width: "80px" }}>
            ID
          </th>
          <th className="text-center" style={{ width: "150px" }}>
            Fecha
          </th>
          <th className="text-center" style={{ width: "150px" }}>
            Vehículo
          </th>
          <th>Conductor</th>
          <th className="text-center" style={{ width: "120px" }}>
            Acciones
          </th>
        </tr>
      </thead>
      <tbody>
        {programaciones.length === 0 ? (
          <tr>
            <td colSpan={5} className="text-center">
              Sin resultados
            </td>
          </tr>
        ) : (
          programaciones.map((prog) => (
            <tr key={prog.programacionid}>
              <td className="text-center">
                <b>#{prog.programacionid}</b>
              </td>
              <td className="text-center">
                {moment(prog.programacionfecha).format("DD/MM/YYYY")}
              </td>
              <td className="text-center">{prog.vehiculo.no_vehiculo}</td>
              <td>{prog.conductor.conductor_nm}</td>
              <td className="text-center">
                <Button
                  size="sm"
                  color="warning"
                  outline
                  onClick={() => onEdit(prog)}
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
);

export default ProgramacionTable;
