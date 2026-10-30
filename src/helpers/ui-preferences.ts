export const getPreferenceUserId = (): string | null => {
  try {
    const session = JSON.parse(sessionStorage.getItem("authUser") || "null");
    const user = session?.data ?? session;
    const id = user?.userID ?? user?.userid ?? user?.id;
    return id !== null && id !== undefined && String(id).trim() ? String(id) : null;
  } catch { return null; }
};

export const readUiPreference = (name: string): unknown => {
  try {
    const user = getPreferenceUserId();
    return user ? JSON.parse(localStorage.getItem(`docuware:ui:v1:${user}:${name}`) || "null") : null;
  } catch { return null; }
};

export const writeUiPreference = (name: string, value: unknown) => {
  try {
    const user = getPreferenceUserId();
    if (user) localStorage.setItem(`docuware:ui:v1:${user}:${name}`, JSON.stringify(value));
  } catch { /* Keep controls usable if browser storage is unavailable. */ }
};

export const restoreColumnWidths = <T extends object>(defaults: T, saved: unknown): T => {
  const widths = { ...defaults };
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return widths;
  for (const key of Object.keys(defaults) as Array<keyof T>) {
    const value = (saved as Record<keyof T, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 20 && value <= 3000) {
      widths[key] = value as T[keyof T];
    }
  }
  return widths;
};
