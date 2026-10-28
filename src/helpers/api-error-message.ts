const fieldLabels: Record<string, string> = {
  supplierID: "Proveedor", documentAssociatedType: "Tipo de documento",
  documentAssociatedNo: "Documento asociado", paymentCondition: "Condición de pago",
  currency: "Moneda", guideNo: "Guía", store: "Almacén", purchaseState: "Estado de compra",
  tipoorden: "Tipo de orden", signature: "Firmante Junior", signature2: "Firmante Senior",
  requiredby: "Solicitante", createdBy: "Usuario creador", createAt: "Fecha de creación",
  details: "Detalles", descriptionItem: "Descripción", quantity: "Cantidad",
  unitPrice: "Precio unitario", total: "Total", orderNo: "Número de orden",
};

export const getApiErrorMessage = (payload: unknown, fallback: string): string => {
  const flatten = (value: unknown, path = ""): string[] => {
    if (typeof value === "string") return value.trim() ? [`${path ? `${path}: ` : ""}${value.trim()}`] : [];
    if (Array.isArray(value)) return value.flatMap((item, index) =>
      flatten(item, item && typeof item === "object" && !Array.isArray(item)
        ? `${path} ${index + 1}`.trim() : path)
    );
    if (value && typeof value === "object") return Object.entries(value).flatMap(([field, item]) =>
      flatten(item, [path, field === "non_field_errors" ? "" : fieldLabels[field] || field].filter(Boolean).join(" · "))
    );
    return [];
  };
  if (!payload || typeof payload !== "object") return fallback;
  const result = payload as Record<string, unknown>;
  const message = typeof result.message === "string" ? result.message.trim() : "";
  const details = flatten(result.data ?? result.errors ?? result.detail ?? (message ? null : result));
  return Array.from(new Set([message, ...details].filter(Boolean))).join("\n") || fallback;
};
