export const matchesDateRange = (value: string | null | undefined, from: string, to: string): boolean => {
  if (!from && !to) return true;
  if (from && to && from > to) return false;
  const date = value?.slice(0, 10) || "";
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && (!from || date >= from) && (!to || date <= to);
};
export const matchesName = (values: (string | null | undefined)[], query: string): boolean => {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-PE");
  const term = normalize(query.trim());
  return !term || values.some((value) => normalize(value || "").includes(term));
};
