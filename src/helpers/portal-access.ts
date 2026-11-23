import axios from "axios";
import { API_BASE_URL } from "./api-url";

export function portalSession() {
  try {
    return JSON.parse(sessionStorage.getItem("authUser") || "null");
  } catch {
    return null;
  }
}

export const hasPermission = (permission: string): boolean =>
  portalSession()?.data?.effectivePermissions?.includes(permission) === true;

const routes: [string, string][] = [
  ["/supplier-credits", "credits.read"],
  ["/users/document-order", "documents.configure_order"],
  ["/users", "access.manage"], ["/documents/edit", "documents.edit"],
  ["/documents/order-c", "orders.create"], ["/documents", "documents.read"],
  ["/document-details", "documents.report"], ["/document-programation", "schedule.read"],
  ["/purchase-order-details", "orders.read"], ["/pre-orders/new", "preorders.create"],
  ["/pre-orders/edit", "preorders.edit"], ["/pre-orders", "preorders.read"],
  ["/suppliers", "suppliers.read"], ["/expedientes", "expedients.read"],
  ["/gestor-vehicular", "vehicles.read"], ["/procesamiento-archivos", "documents.import_read"],
  ["/travel-expenses/my-schedule", "travel.read"], ["/travel-expenses/reports", "travel.report"],
  ["/reports/rendiciones", "travel.report"], ["/travel-expenses/trips", "travel.all"],
  ["/travel-expenses/requests", "travel.all"], ["/travel-expenses/anticipos", "travel.all"],
];

export const canVisit = (path: string): boolean => {
  const route = routes.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return !route || hasPermission(route[1]);
};

export function firstAllowedRoute(): string {
  return ["/documents", "/document-details", "/purchase-order-details", "/pre-orders", "/expedientes", "/supplier-credits",
    "/procesamiento-archivos", "/travel-expenses/my-schedule", "/suppliers", "/gestor-vehicular",
    "/document-programation", "/reports/rendiciones", "/users", "/users/document-order", "/profile"].find(canVisit) || "/profile";
}

function isPortalApi(url: string) {
  const destination = new URL(url, window.location.href);
  const api = new URL(API_BASE_URL, window.location.href);
  return destination.origin === api.origin && destination.pathname.startsWith(api.pathname);
}

export function installPortalSessionHeaders() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    const token = portalSession()?.token;
    if (!token || !isPortalApi(url)) return originalFetch(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set("Authorization", `Bearer ${token}`);
    return originalFetch(input, { ...init, headers });
  };
  axios.interceptors.request.use((config) => {
    const token = portalSession()?.token;
    if (token && isPortalApi(axios.getUri(config))) config.headers.set("Authorization", `Bearer ${token}`);
    return config;
  });
}
