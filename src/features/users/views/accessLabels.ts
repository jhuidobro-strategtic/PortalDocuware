export const modules: Record<string, string> = {
  reference: "Catálogos de consulta", documents: "Documentos e importaciones",
  orders: "Órdenes de compra y servicio", preorders: "Preórdenes", expedients: "Expedientes",
  suppliers: "Proveedores", vehicles: "Vehículos y conductores", schedule: "Programación diaria",
  travel: "Gastos de viaje",
};
const actions: Record<string, string> = {
  read: "Consultar", edit: "Editar", delete: "Eliminar", report: "Consultar reportes y exportar",
  import: "Importar comprobantes", import_read: "Consultar lotes", import_retry: "Reintentar importaciones",
  import_review: "Revisar comprobantes importados", create: "Crear", sign: "Firmar según facultad y asignación",
  reject: "Rechazar", cancel: "Anular", link: "Vincular comprobante", status: "Cambiar estado operativo",
  replace_invoice: "Sustituir factura comercial", attach: "Adjuntar archivos",
  remove_attachment: "Retirar adjuntos", link_note: "Vincular notas de ajuste",
  close: "Cerrar", reopen: "Reabrir según la regla de cierre", pay: "Marcar como pagado",
  configure: "Configurar gastos de viaje", schedule: "Programar viajes", request: "Gestionar solicitudes",
  approve: "Cambiar estado de solicitudes", advance: "Gestionar anticipos", voucher: "Gestionar comprobantes",
  all: "Acceder a todos los viajes y solicitudes",
};

export const permissionLabel = (key: string) =>
  key === "preorders.all" ? "Consultar todas las preórdenes" : actions[key.split(".")[1]] ?? key;

export const roleNames: Record<string, string> = {
  SUPERADMIN: "Superadmin", ADMINISTRADOR: "Administrador",
  "GESTOR DE DOCUMENTOS": "Gestor de documentos", TRANSPORTISTA: "Transportista",
};
export const roleName = (name: string) => roleNames[name.trim().toUpperCase()] ?? name;
export const searchable = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
