import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { buildApiUrl } from "../helpers/api-url";
import { canVisit, firstAllowedRoute, portalSession } from "../helpers/portal-access";

export default function AuthProtected({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [, refreshPermissions] = useState(0);
  const [error, setError] = useState("");
  const session = portalSession();
  const token = session?.token;
  const hasPermissions = Array.isArray(session?.data?.effectivePermissions);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setError("");
    void fetch(buildApiUrl("users/session/"), { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (controller.signal.aborted || portalSession()?.token !== token) return;
        if (response.status === 401) {
          sessionStorage.removeItem("authUser");
          refreshPermissions((version) => version + 1);
          return;
        }
        if (!response.ok) throw new Error("No se pudo verificar la sesión. Recarga la página.");
        const { role, permissions } = await response.json();
        const session = portalSession();
        if (controller.signal.aborted || session?.token !== token) return;
        sessionStorage.setItem("authUser", JSON.stringify({ ...session, data: {
          ...session.data, effectivePermissions: permissions, profileName: role.name,
        } }));
        refreshPermissions((version) => version + 1);
      }).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [pathname, token]);

  if (!token) return <Navigate to="/login" replace />;
  if (!hasPermissions) {
    if (error) return <p className="p-4" role="alert">{error}</p>;
    return <div className="d-flex align-items-center justify-content-center min-vh-100" role="status" aria-label="Cargando">
      <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
    </div>;
  }
  if (!canVisit(pathname)) return <Navigate to={firstAllowedRoute()} replace />;
  return <>{children}</>;
}
