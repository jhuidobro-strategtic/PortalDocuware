import React, { useEffect, useState } from "react";
import { Alert, Button, Container, Input, Table } from "reactstrap";
import { Link } from "react-router-dom";
import "./Roles.css";
import { modules, permissionLabel, roleName, searchable } from "./accessLabels";
import { buildApiUrl } from "../../../helpers/api-url";

interface Role { id: number; name: string; full_access: boolean; permissions: string[] }
interface History { id: number; action: string; target: string; actor__fullname: string; created_at: string; before: { permissions?: string[] }; after: { permissions?: string[] } }

async function call<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), options);
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "No se pudo completar la operación.");
  return data as T;
}

export default function Roles() {
  const [panel, setPanel] = useState<"permissions" | "history">("permissions");
  const [search, setSearch] = useState("");
  const [openModules, setOpenModules] = useState<string[]>(["documents"]);
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [chosenId, setChosenId] = useState<number>();
  const [selection, setSelection] = useState<string[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const selected = roles.find((role) => role.id === chosenId);
  const dirty = !!selected && (selected.permissions.length !== selection.length ||
    selected.permissions.some((permission) => !selection.includes(permission)));
  const refreshHistory = () => call<History[]>("users/access-history/").then((data) => {
    setHistory(data);
    setHistoryError("");
  }).catch((failure) => setHistoryError(failure.message));

  useEffect(() => {
    setLoading(true);
    setError("");
    void call<{ roles: Role[]; permissions: string[] }>("users/roles/").then((data) => {
      setRoles(data.roles);
      setPermissionKeys(data.permissions);
      const role = data.roles.find((item) => !item.full_access) ?? data.roles[0];
      setChosenId(role?.id);
      setSelection(role?.permissions || []);
    }).catch((failure) => setError(failure.message)).finally(() => setLoading(false));
    void refreshHistory();
  }, [loadAttempt]);

  const save = async () => {
    if (!selected || selected.full_access || !dirty) return;
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const saved = await call<Role>("users/roles/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, permissions: selection }),
      });
      setRoles((rows) => rows.map((role) => role.id === saved.id ? saved : role));
      setSelection(saved.permissions);
      setNotice("Permisos guardados.");
      void refreshHistory();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const granted = selection.filter((key) => !selected?.permissions.includes(key));
  const removed = selected?.permissions.filter((key) => !selection.includes(key)) ?? [];
  const term = searchable(search.trim());
  const groups = Object.entries(modules).map(([module, title]) => {
    const keys = permissionKeys.filter((key) => key.startsWith(`${module}.`));
    const visible = keys.filter((key) => searchable(`${title} ${permissionLabel(key)}`).includes(term));
    return { module, title, keys, visible };
  }).filter((group) => group.visible.length > 0);

  const selectRole = (role: Role) => {
    if (role.id === chosenId || (dirty && !window.confirm("¿Descartar los cambios sin guardar?"))) return;
    setChosenId(role.id);
    setSelection(role.permissions);
    const firstModule = Object.keys(modules).find((module) => module !== "reference" &&
      role.permissions.some((key) => key.startsWith(`${module}.`)));
    setOpenModules(firstModule ? [firstModule] : []);
    setSearch("");
    setNotice("");
    setError("");
  };

  const togglePermissions = (keys: string[], enabled: boolean) => {
    setSelection((current) => enabled
      ? Array.from(new Set([...current, ...keys]))
      : current.filter((key) => !keys.includes(key)));
    setNotice("");
  };

  return <Container fluid className="page-content access-roles">
    <header className="access-roles-heading">
      <div>
        <h1>Roles y permisos</h1>
        <p>Configura las acciones disponibles para los usuarios de cada rol.</p>
      </div>
      <Link to="/users" className="btn btn-outline-primary">
        <i className="ri-user-settings-line me-2" aria-hidden="true" />Administrar usuarios
      </Link>
    </header>

    <nav className="access-roles-tabs" aria-label="Administración de accesos">
      <button type="button" aria-pressed={panel === "permissions"} onClick={() => setPanel("permissions")}>
        <i className="ri-shield-keyhole-line" aria-hidden="true" /> Permisos
        {dirty && <span className="access-roles-dot" aria-label="Cambios sin guardar" />}
      </button>
      <button type="button" aria-pressed={panel === "history"} onClick={() => setPanel("history")}>
        <i className="ri-history-line" aria-hidden="true" /> Historial
      </button>
    </nav>

    {panel === "permissions" ? <>
      {loading && <p className="access-roles-surface p-4" role="status">Cargando roles…</p>}
      {!loading && !selected && <div className="access-roles-surface p-4">
        <p role="status">{error || "No hay roles registrados."}</p>
        <Button color="outline-primary" onClick={() => setLoadAttempt((count) => count + 1)}>Actualizar roles</Button>
      </div>}
      {!loading && selected && <div className="access-roles-layout">
        <aside className="access-roles-surface access-roles-list" aria-label="Seleccionar rol">
          <h2>Roles del sistema</h2>
          {[...roles].sort((a, b) => Number(b.full_access) - Number(a.full_access) || a.id - b.id).map((role) =>
            <button key={role.id} type="button" aria-pressed={role.id === chosenId} disabled={saving}
              onClick={() => selectRole(role)} className="access-roles-role">
              <i className={role.full_access ? "ri-shield-star-line" : "ri-user-3-line"} aria-hidden="true" />
              <span><strong>{roleName(role.name)}</strong><small>
                {role.full_access ? "Acceso completo" : role.permissions.length === 1
                  ? "1 permiso" : `${role.permissions.length} permisos`}
              </small></span>
              <i className="ri-arrow-right-s-line access-roles-chevron" aria-hidden="true" />
            </button>
          )}
        </aside>

        <form className="access-roles-surface access-roles-editor" onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}>
          <div className="access-roles-editor-head">
            <div><h2>{roleName(selected.name)}</h2><p>{selected.full_access
              ? "Puede administrar los accesos y realizar todas las acciones del portal."
              : `${selection.length} de ${permissionKeys.length} permisos seleccionados`}</p></div>
            {!selected.full_access && <div className="access-roles-search">
              <i className="ri-search-line" aria-hidden="true" />
              <Input type="search" aria-label="Buscar permiso" placeholder="Buscar permiso…" value={search}
                onChange={(event) => setSearch(event.target.value)} />
            </div>}
          </div>

          {selected.full_access ? <div className="access-roles-full">
            <i className="ri-lock-line" aria-hidden="true" />
            <div><strong>Acceso completo protegido</strong><p>Superadmin tiene acceso completo y sus permisos son fijos.</p></div>
          </div> : <>
            <div className="access-roles-groups">
              {groups.map(({ module, title, keys, visible }) => {
                const enabled = keys.filter((key) => selection.includes(key)).length;
                const open = Boolean(term) || openModules.includes(module);
                return <section key={module} className="access-roles-module">
                  <button className="access-roles-module-toggle" type="button" aria-expanded={open}
                    aria-controls={`permissions-${module}`} disabled={Boolean(term)}
                    onClick={() => setOpenModules((current) =>
                      open ? current.filter((name) => name !== module) : [...current, module]
                    )}>
                    <strong>{title}</strong>
                    <span>{enabled}/{keys.length} activos</span>
                    <i className={open ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} aria-hidden="true" />
                  </button>
                  {open && <fieldset id={`permissions-${module}`} aria-label={title} disabled={saving}>
                    {!term && <Button type="button" color="link" size="sm" className="access-roles-bulk"
                      onClick={() => togglePermissions(keys, enabled !== keys.length)}>
                      {enabled === keys.length ? "Quitar todos" : "Activar todos"}
                    </Button>}
                    <div className="access-roles-grid">
                      {visible.map((key) => <label key={key} className="access-roles-permission">
                        <Input type="checkbox" checked={selection.includes(key)}
                          onChange={(event) => togglePermissions([key], event.target.checked)} />
                        <span>{permissionLabel(key)}</span>
                      </label>)}
                    </div>
                  </fieldset>}
                </section>;
              })}
              {!groups.length && <p className="p-3 mb-0">No hay permisos que coincidan con la búsqueda.</p>}
            </div>
            {(error || notice) && <Alert className="mx-3 mt-3 mb-0" color={error ? "danger" : "success"}
              role={error ? "alert" : "status"}>{error || notice}</Alert>}
            <footer className={`access-roles-footer${dirty ? " has-changes" : ""}`}>
              <div>
                {dirty ? <details>
                  <summary>{granted.length + removed.length === 1
                    ? "1 cambio sin guardar" : `${granted.length + removed.length} cambios sin guardar`}</summary>
                  <ul className="mb-0 ps-3">
                    {[...granted.map((key) => [key, "Activar"]), ...removed.map((key) => [key, "Quitar"])].map(([key, action]) =>
                      <li key={key}>{action} {permissionLabel(key)} · {modules[key.split(".")[0]]}</li>
                    )}
                  </ul>
                </details> : <span>Permisos al día</span>}
              </div>
              <div className="access-roles-footer-actions">
                {dirty && <Button type="button" color="light" disabled={saving} onClick={() => {
                  setSelection(selected.permissions);
                  setError("");
                }}>Descartar</Button>}
                <Button type="submit" color="primary" disabled={!dirty || saving}>
                  {saving ? "Guardando…" : "Guardar permisos"}
                </Button>
              </div>
            </footer>
          </>}
        </form>
      </div>}
    </> : <section className="access-roles-surface access-roles-history">
      <div className="access-roles-editor-head">
        <div><h2>Historial de accesos</h2><p>Cambios de permisos y de cuentas de usuario.</p></div>
        <Button type="button" color="outline-primary" size="sm" onClick={() => void refreshHistory()}>Actualizar</Button>
      </div>
      {historyError && <Alert color="danger" className="mx-3">{historyError}</Alert>}
      {!!history.length && <Table responsive className="mb-0 align-middle">
        <thead><tr><th>Fecha</th><th>Responsable</th><th>Cambio</th><th>Detalle</th></tr></thead>
        <tbody>{history.map((row) => {
          const role = roles.find((item) => row.action === "role.permissions" && item.id === Number(row.target));
          const added = row.after.permissions?.filter((key) => !row.before.permissions?.includes(key)) ?? [];
          const revoked = row.before.permissions?.filter((key) => !row.after.permissions?.includes(key)) ?? [];
          return <tr key={row.id}>
            <td>{new Date(row.created_at).toLocaleString("es-PE")}</td>
            <td>{row.actor__fullname}</td>
            <td>{row.action === "role.permissions" ? "Permisos del rol" : row.action === "user.permissions" ? "Permisos individuales" : row.action === "user.create" ? "Alta de usuario" : "Actualización de usuario"}</td>
            <td><details><summary>{role ? roleName(role.name) : `Usuario ${row.target}`}</summary>
              {(row.action === "role.permissions" || row.action === "user.permissions") ? <ul className="mb-0 ps-3">
                {[...added.map((key) => [key, "Activado"]), ...revoked.map((key) => [key, "Retirado"])].map(([key, action]) =>
                  <li key={key}>{action} · {modules[key.split(".")[0]]} · {permissionLabel(key)}</li>
                )}
              </ul> : <>
                {!!Object.keys(row.before).length && <div><strong>Antes:</strong> {Object.values(row.before).map(String).join(" · ")}</div>}
                <div><strong>Después:</strong> {Object.values(row.after).map(String).join(" · ")}</div>
              </>}
            </details></td>
          </tr>;
        })}</tbody>
      </Table>}
      {!history.length && !historyError && <p className="p-4 mb-0">Todavía no hay cambios registrados.</p>}
    </section>}
  </Container>;
}
