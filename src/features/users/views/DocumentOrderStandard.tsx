import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, Container } from "reactstrap";
import { buildApiUrl } from "../../../helpers/api-url";

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

  return <Container fluid className="page-content">
    <h4>Orden estándar de documentos</h4>
    <p className="text-muted">Esta secuencia se asigna a las nuevas órdenes y expedientes. En un registro existente puedes aplicarla con Restablecer orden estándar.</p>
    {error && <Alert color="danger" role="alert">{error} <Button color="link" onClick={() => setAttempt((count) => count + 1)}>Reintentar</Button></Alert>}
    {notice && <Alert color="success" role="status">{notice}</Alert>}
    <Card><CardBody>
      {!saved.length && !error && <p role="status">Cargando estándar…</p>}
      <ol className="list-unstyled mb-3">
        {categories.map((key, index) => <li key={key} className="d-flex align-items-center gap-2 border-bottom py-3">
          <span className="text-muted">{index + 1}.</span><span className="me-auto">{names[key]}</span>
          {([-1, 1] as const).map((direction) => <Button key={direction} color="outline-secondary" size="sm"
            disabled={saving || index + direction < 0 || index + direction >= categories.length}
            aria-label={`${direction === -1 ? "Subir" : "Bajar"} ${names[key]}`} onClick={() => {
              setNotice("");
              const next = [...categories];
              [next[index], next[index + direction]] = [next[index + direction], next[index]];
              setCategories(next);
            }}><i className={direction === -1 ? "ri-arrow-up-line" : "ri-arrow-down-line"} aria-hidden="true" /></Button>)}
        </li>)}
      </ol>
      <div className="d-flex gap-2 justify-content-end">
        {dirty && <Button color="light" disabled={saving} onClick={() => setCategories(saved)}>Descartar</Button>}
        <Button color="primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? "Guardando…" : "Guardar estándar"}</Button>
      </div>
    </CardBody></Card>
  </Container>;
}
