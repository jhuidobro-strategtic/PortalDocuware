import { Fragment, ReactNode, useState } from "react";
import { Alert, Button } from "reactstrap";
import { buildApiUrl } from "../../helpers/api-url";

export function arrangeAttachments<T>(items: T[], order: string[], keyFor: (item: T) => string): T[] {
  const rank = new Map(order.map((key, index) => [key, index]));
  return [...items].sort((a, b) =>
    (rank.get(keyFor(a)) ?? order.length) - (rank.get(keyFor(b)) ?? order.length));
}

interface Props<T> {
  items: T[];
  order?: string[];
  itemKey: (item: T) => string;
  itemName: (item: T) => string;
  render: (item: T, index: number) => ReactNode;
  endpoint: string;
  canReorder: boolean;
  onSaved: (order: string[]) => void;
}

export default function AttachmentOrderList<T>({
  items, order = [], itemKey, itemName, render, endpoint, canReorder, onSaved,
}: Props<T>) {
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const savedItems = arrangeAttachments(items, order, itemKey);
  const editing = canReorder && draft !== null;
  const visible = editing ? arrangeAttachments(savedItems, draft, itemKey) : savedItems;
  const keys = visible.map(itemKey);
  const changed = visible.some((item, index) => itemKey(item) !== itemKey(savedItems[index]));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= keys.length) return;
    const reordered = [...keys];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    setDraft(reordered);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(buildApiUrl(endpoint), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: keys }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(result?.attachment_order)) {
        throw new Error(typeof result?.detail === "string" ? result.detail : "No se pudo guardar el orden de los documentos.");
      }
      onSaved(result.attachment_order);
      setDraft(null);
      setNotice("Orden guardado.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo guardar el orden.");
    } finally {
      setSaving(false);
    }
  };

  return <>
    {canReorder && items.length > 1 && <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
      {editing ? <>
        <span className="me-auto small text-muted">Usa las flechas para mover los documentos.</span>
        <Button size="sm" color="light" disabled={saving} onClick={() => { setDraft(null); setError(""); }}>Cancelar</Button>
        <Button size="sm" color="primary" disabled={!changed || saving} onClick={() => void save()}>
          {saving ? "Guardando…" : "Guardar orden"}
        </Button>
      </> : <Button size="sm" color="outline-primary" onClick={() => {
        setNotice(""); setDraft(savedItems.map(itemKey));
      }}><i className="ri-sort-desc me-1" aria-hidden="true" />Ordenar documentos</Button>}
    </div>}
    {error && <Alert color="danger" role="alert" className="mb-0">{error}</Alert>}
    {notice && <span role="status" className="small text-success">{notice}</span>}
    {visible.map((item, index) => <Fragment key={itemKey(item)}>
      {editing && <div className="d-flex align-items-center gap-2 rounded bg-light px-2 py-1">
        <span className="small text-truncate me-auto">{index + 1}. {itemName(item)}</span>
        <Button size="sm" color="outline-secondary" disabled={saving || index === 0}
          aria-label={`Subir ${itemName(item)}`} onClick={() => move(index, index - 1)}>
          <i className="ri-arrow-up-line" aria-hidden="true" />
        </Button>
        <Button size="sm" color="outline-secondary" disabled={saving || index === visible.length - 1}
          aria-label={`Bajar ${itemName(item)}`} onClick={() => move(index, index + 1)}>
          <i className="ri-arrow-down-line" aria-hidden="true" />
        </Button>
      </div>}
      {render(item, index)}
    </Fragment>)}
  </>;
}
