import React, { useState } from "react";
import { Table } from "reactstrap";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { Programacion } from "../types/programacion.types";
import TableActionsMenu from "../../../components/common/TableActionsMenu";
import ResizableHeader from "./ResizableHeader";
import "../views/Programacion/ProgramacionTable.css";

interface ProgramacionTableProps {
  programaciones: Programacion[];
  onEdit: (item: Programacion) => void;
}

const ProgramacionTable: React.FC<ProgramacionTableProps> = ({
  programaciones,
  onEdit,
}) => {
  const { t } = useTranslation();
  const [widths, setWidths] = useState({ date: 160, vehicle: 260, driver: 380, actions: 120 });
  const resize = (column: keyof typeof widths, width: number) =>
    setWidths((previous) => ({ ...previous, [column]: width }));

  return (
    <div className="table-responsive" style={{ overflowX: "auto", whiteSpace: "nowrap" }}>
      <Table className="table align-middle table-nowrap mb-0 programacion-table"
        style={{ tableLayout: "fixed", width: "100%", minWidth: "920px" }}>
        <thead className="table-light">
          <tr style={{ textAlign: "center" }}>
            <ResizableHeader className="text-center" width={widths.date} onResize={(width) => resize("date", width)}>
              {t("Date")}
            </ResizableHeader>
            <ResizableHeader className="text-center" width={widths.vehicle} onResize={(width) => resize("vehicle", width)}>
              {t("Vehicle")}
            </ResizableHeader>
            <ResizableHeader width={widths.driver} onResize={(width) => resize("driver", width)}>
              {t("Driver")}
            </ResizableHeader>
            <ResizableHeader className="text-center" width={widths.actions} onResize={(width) => resize("actions", width)}>
              {t("Actions")}
            </ResizableHeader>
          </tr>
        </thead>
        <tbody>
          {programaciones.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-4">
                {t("No results")}
              </td>
            </tr>
          ) : (
            programaciones.map((prog) => (
              <tr key={prog.programacionid}>
                <td className="text-center">
                  {moment(prog.programacionfecha).format("DD/MM/YYYY")}
                </td>
                <td className="text-center">{prog.vehiculo.no_vehiculo}</td>
                <td>{prog.conductor.conductor_nm}</td>
                <td className="text-center">
                  <TableActionsMenu
                    items={[
                      {
                        id: `edit-${prog.programacionid}`,
                        label: t("Edit"),
                        icon: "ri-edit-line",
                        tone: "neutral",
                        onClick: () => onEdit(prog),
                      },
                    ]}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default ProgramacionTable;
