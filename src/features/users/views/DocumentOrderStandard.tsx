import { useEffect, useState } from "react";
import { Alert, Button, Container } from "reactstrap";
import { buildApiUrl } from "../../../helpers/api-url";
import "./Roles.css";
import "./DocumentOrderStandard.css";

const names: Record<string, string> = {
  invoice: "Factura o comprobante", order: "Orden de compra o servicio",
  credit: "Nota de crédito", debit: "Nota de débito", support: "Otros sustentos",
};

export default function DocumentOrderStandard() {
  const [saved, setSaved] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const dirty = saved.some((key, index) => key !== categories[index]);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void fetch(buildApiUrl("document-order-standard/"), { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("No se pudo cargar el orden estándar.");
      const data = await response.json();
      if (!controller.signal.aborted) { setSaved(data.categories); setCategories(data.categories); }
    }).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [attempt]);

  const save = async () => {
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(buildApiUrl("document-order-standard/"), {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "No se pudo guardar el estándar.");
      setSaved(result.categories); setCategories(result.categories); setNotice("Orden estándar guardado.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo guardar."); }
    finally { setSaving(false); }
  };

  return <Container fluid className="page-content access-roles document-standard">
    <header className="access-roles-heading">
      <div><h1>Orden documental</h1><p>Define cómo se presentan los documentos de las nuevas órdenes y expedientes.</p></div>
    </header>
    {error && <Alert color="danger" role="alert">{error} <Button color="link" onClick={() => setAttempt((count) => count + 1)}>Reintentar</Button></Alert>}
    {notice && <Alert color="success" role="status">{notice}</Alert>}
    <div className="document-standard-layout">
    <section className="access-roles-surface document-standard-editor" aria-label="Secuencia estándar">
      <div className="access-roles-editor-head">
        <div><h2>Secuencia estándar</h2><p>Mueve cada tipo con las flechas.</p></div>
      </div>
      {!saved.length && !error && <p role="status">Cargando estándar…</p>}
      <ol className="document-standard-list">
        {categories.map((key, index) => <li key={key} className="document-standard-row">
          <span className="document-standard-position">{index + 1}</span>
          <i className={key === "order" ? "ri-file-list-3-line document-standard-icon" : key === "support" ? "ri-attachment-line document-standard-icon" : "ri-file-text-line document-standard-icon"} aria-hidden="true" />
          <span className="document-standard-name">{names[key]}</span>
          <div className="document-standard-controls">
          {([-1, 1] as const).map((direction) => <Button key={direction} color="outline-secondary" size="sm"
            disabled={saving || index + direction < 0 || index + direction >= categories.length}
            aria-label={`${direction === -1 ? "Subir" : "Bajar"} ${names[key]}`} onClick={() => {
              setNotice("");
              const next = [...categories];
              [next[index], next[index + direction]] = [next[index + direction], next[index]];
              setCategories(next);
            }}><i className={direction === -1 ? "ri-arrow-up-line" : "ri-arrow-down-line"} aria-hidden="true" /></Button>)}
          </div>
        </li>)}
      </ol>
      <div className="access-roles-footer">
        <span className="small" role="status">{dirty ? "Cambios sin guardar" : "Estándar al día"}</span>
        <div className="access-roles-footer-actions">
          {dirty && <Button color="light" disabled={saving} onClick={() => { setCategories(saved); setNotice(""); }}>Descartar</Button>}
          <Button color="primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? "Guardando…" : "Guardar estándar"}</Button>
        </div>
      </div>
    </section>
    <aside className="document-standard-help">
      <h2>Aplicación del estándar</h2>
      <p>Las nuevas órdenes y expedientes reciben la secuencia que guardes aquí.</p>
      <h3>Registros existentes</h3>
      <p>Para aplicarles esta secuencia, abre <strong>Ver documentos → Ordenar documentos</strong> y pulsa <strong>Restablecer orden estándar</strong>.</p>
      <p>Los registros con un orden personalizado lo conservan hasta que decidas restablecerlo.</p>
    </aside>
    </div>
  </Container>;
}
