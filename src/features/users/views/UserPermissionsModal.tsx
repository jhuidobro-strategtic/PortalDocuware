import { useEffect, useState } from "react";
import { Alert, Button, Input, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { buildApiUrl } from "../../../helpers/api-url";
import { modules, permissionLabel, roleName, searchable, isProtectedPermission } from "./accessLabels";
import "./Roles.css";

interface UserPermissions {
  name: string;
  role: { name: string; full_access: boolean; permissions: string[] };
  permissions: string[];
  extra_permissions: string[];
  fixed_permissions?: string[];
  can_manage_protected_operations?: boolean;
}

export default function UserPermissionsModal({ userId, onClose, onSaved }: {
  userId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const url = buildApiUrl(`users/${userId}/permissions/`);
  const [record, setRecord] = useState<UserPermissions>();
  const [selection, setSelection] = useState<string[]>([]);
  const [protectedAuthorization, setProtectedAuthorization] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const dirty = !!record && (Boolean(record.can_manage_protected_operations) !== protectedAuthorization || record.extra_permissions.length !== selection.length ||
    record.extra_permissions.some((permission) => !selection.includes(permission)));

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void fetch(url, { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("No se pudo cargar el acceso del usuario.");
      const data: UserPermissions = await response.json();
      if (controller.signal.aborted) return;
      setRecord(data);
      setSelection(data.extra_permissions);
      setProtectedAuthorization(Boolean(data.can_manage_protected_operations));
    }).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [url, attempt]);

  const close = () => {
    if (saving || (dirty && !window.confirm("¿Descartar los cambios sin guardar?"))) return;
    onClose();
  };

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(url, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: selection, can_manage_protected_operations: protectedAuthorization }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "No se pudieron guardar los permisos individuales.");
      onSaved();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudieron guardar los permisos.");
    } finally {
      setSaving(false);
    }
  };

  const term = searchable(search.trim());
  const groups = Object.entries(modules).map(([module, title]) => ({
    title,
    keys: record?.permissions.filter((key) => key.startsWith(`${module}.`) &&
      searchable(`${title} ${permissionLabel(key)}`).includes(term)) ?? [],
  })).filter(({ keys }) => keys.length > 0);

  return <Modal isOpen toggle={saving ? undefined : close} backdrop="static" keyboard={!saving} scrollable size="lg" centered>
    <ModalHeader toggle={saving ? undefined : close}>Permisos individuales</ModalHeader>
    <ModalBody>
      {error && <Alert color="danger" role="alert">{error}</Alert>}
      {!record && (error ? <Button color="outline-primary" onClick={() => setAttempt((value) => value + 1)}>Reintentar</Button>
        : <p role="status">Cargando permisos…</p>)}
      {record && <>
        <p className="fw-semibold mb-1">{record.name}</p>
        <p className="text-muted">Rol actual · {roleName(record.role.name)}</p>
        {record.role.full_access ? <p>Esta cuenta ya tiene acceso completo.</p> : <>
          <p>Los permisos del rol ya están habilitados. Selecciona las facultades adicionales para esta cuenta.</p>
          <div className="border rounded bg-light p-3 mb-3">
            <label className="d-flex align-items-start gap-2 mb-2" htmlFor="protected-operations-authorization">
              <Input id="protected-operations-authorization" type="checkbox" checked={protectedAuthorization} disabled={saving}
                onChange={event => setProtectedAuthorization(event.target.checked)} />
              <span className="fw-semibold">Autorizar cierre, reapertura y eliminación</span>
            </label>
            <p className="text-muted mb-0">Permite cerrar y reabrir expedientes y eliminar registros o adjuntos en las vistas a las que tenga acceso. Solo un Superadmin puede cambiar esta autorización. El cambio queda registrado en auditoría.</p>
          </div>
          <Input type="search" aria-label="Buscar permiso" placeholder="Buscar permiso…" value={search}
            onChange={(event) => setSearch(event.target.value)} className="mb-3" />
          {!groups.length && <p>No hay permisos que coincidan con la búsqueda.</p>}
          {groups.map(({ title, keys }) => <fieldset key={title} disabled={saving} className="border-top pt-2 mb-3">
            <legend className="fs-6 fw-semibold">{title}</legend>
            <div className="access-roles-grid">
              {keys.map((key) => {
                const inherited = record.role.permissions.includes(key);
                const checked = selection.includes(key);
                const protectedPermission = isProtectedPermission(key);
                const fixed = protectedPermission && protectedAuthorization;
                return <label key={key} className="access-roles-permission">
                  <Input type="checkbox" checked={Boolean(fixed || inherited || checked)} disabled={protectedPermission || (inherited && !checked)}
                    onChange={(event) => {
                      const enable = event.target.checked;
                      setSelection((current) => enable ? [...current, key] : current.filter((item) => item !== key));
                    }} />
                  <span>{permissionLabel(key)} {protectedPermission && <small className="d-block text-muted">{fixed ? "Incluido en la autorización de esta cuenta" : "Requiere autorización de cierre, reapertura y eliminación"}</small>}{inherited && <small className="d-block text-muted">
                    {checked ? "Del rol y adicional" : "Del rol"}
                  </small>}</span>
                </label>;
              })}
            </div>
          </fieldset>)}
        </>}
      </>}
    </ModalBody>
    <ModalFooter className="justify-content-between">
      <span className="text-muted small">{record && !record.role.full_access && (
        selection.length === 1 ? "1 permiso adicional" : `${selection.length} permisos adicionales`
      )}</span>
      <div className="d-flex gap-2">
        <Button color="light" disabled={saving} onClick={close}>Cerrar</Button>
        {record && !record.role.full_access && <Button color="primary" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? "Guardando…" : "Guardar permisos"}
        </Button>}
      </div>
    </ModalFooter>
  </Modal>;
}
