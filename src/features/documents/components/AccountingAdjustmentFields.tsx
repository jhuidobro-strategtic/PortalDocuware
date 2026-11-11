import React, { useEffect, useState } from "react";
import { Button, Col, Input, Label, Row, Spinner } from "reactstrap";
import { Document } from "../types/list.types";
import { adjustmentPreview, fetchAccountingCatalog, TaxOption } from "../services/accounting";
import { buildFactilizaUrl, getFactilizaToken } from "../../../helpers/external-api";

interface Props { document: Document; disabled: boolean; onChange: (value: Document["accounting_adjustment"]) => void; }

export default function AccountingAdjustmentFields({ document, disabled, onChange }: Props) {
  const [options, setOptions] = useState<TaxOption[]>([]);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [kind, setKind] = useState<"retention" | "detraction" | "">(document.accounting_adjustment?.kind || "");
  const [checking, setChecking] = useState(false);
  const [rucResult, setRucResult] = useState<{ ruc: string; message: string; error?: boolean } | null>(null);
  const selected = options.find((option) => option.id === document.accounting_adjustment?.option_id);
  const hasWithholding = Number(document.withholdingamount || 0) > 0;
  const preview = adjustmentPreview(document.totalamount, selected?.rate || 0);
  useEffect(() => {
    let active = true;
    setError("");
    fetchAccountingCatalog().then((catalog) => { if (active) setOptions(catalog.tax_options); })
      .catch((failure) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [attempt]);
  const verifyRuc = async () => {
    const ruc = document.suppliernumber.trim();
    if (!/^\d{11}$/.test(ruc)) { setRucResult({ ruc, message: "Ingrese un RUC de 11 dígitos.", error: true }); return; }
    if (!getFactilizaToken()) { setRucResult({ ruc, message: "La consulta RUC no está configurada.", error: true }); return; }
    setChecking(true); setRucResult(null);
    try {
      const response = await fetch(buildFactilizaUrl(`ruc/info/${ruc}`), { headers: { Authorization: `Bearer ${getFactilizaToken()}` } });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data?.nombre_o_razon_social) throw new Error("No se pudo verificar el RUC. Reintente la consulta.");
      const data = result.data;
      const condition = [data.estado, data.condicion].filter((value) => typeof value === "string").join(" / ");
      setRucResult({ ruc, message: `${data.nombre_o_razon_social}${condition ? ` — ${condition}` : ""}. La consulta identifica al proveedor; no confirma la aplicación del descuento.` });
    } catch (failure) { setRucResult({ ruc, message: failure instanceof Error ? failure.message : "Error al consultar el RUC.", error: true }); }
    finally { setChecking(false); }
  };
  const changeKind = (next: typeof kind) => { setKind(next); onChange({}); };
  return <section aria-label="Detracciones y retenciones" className="border-top pt-3">
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
      <h6 className="mb-0">Detracciones y retenciones</h6>
      <Button type="button" color="secondary" outline size="sm" disabled={disabled || checking} onClick={verifyRuc}>
        {checking && <Spinner size="sm" className="me-2" />}Consultar RUC del proveedor
      </Button>
    </div>
    {rucResult?.ruc === document.suppliernumber.trim() && <p role="status" className={`small ${rucResult?.error ? "text-danger" : "text-muted"}`}>{rucResult?.message}</p>}
    <p className="small text-muted">Seleccione el tratamiento confirmado por Contabilidad. Las tasas provienen del archivo del cliente; no se aplican umbrales ni exoneraciones automáticamente.</p>
    {hasWithholding && <p className="small text-muted">El recibo ya registra una retención de {document.withholdingamount} {document.currency}. No se añadirá un segundo descuento.</p>}
    <div className="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Tratamiento contable">
      {([ ["", "Sin descuento"], ["detraction", "Detracción"], ["retention", "Retención"] ] as const).map(([value, label]) =>
        <Button key={value} type="button" size="sm" color="primary" outline={kind !== value} aria-pressed={kind === value}
          disabled={disabled || (hasWithholding && value !== "")} onClick={() => changeKind(value)}>{label}</Button>)}
    </div>
    {error && <p role="alert" className="text-danger small">{error} <Button type="button" color="link" size="sm" onClick={() => setAttempt((count) => count + 1)}>Reintentar</Button></p>}
    {kind && !hasWithholding && <Row className="g-3">
      <Col xs={12}><Label for="accounting-tax-option">Concepto y tasa</Label>
        <Input id="accounting-tax-option" type="select" required disabled={disabled || !!error || !options.length}
          value={document.accounting_adjustment?.option_id || ""} onChange={(event) => {
            const option = options.find((item) => item.id === event.target.value);
            onChange(option ? { option_id: option.id, kind: option.kind } : {});
          }}><option value="">Seleccione un concepto…</option>{options.filter((option) => option.kind === kind).map((option) =>
            <option key={option.id} value={option.id}>{option.label} — {option.rate}%</option>)}</Input>
      </Col>
      {selected && <Col xs={12}><p className="mb-1">Base (total con IGV): <strong>{Number(document.totalamount).toFixed(2)} {document.currency}</strong></p>
        <p className="mb-1">Descuento ({selected.rate}%): <strong>{preview.amount.toFixed(2)} {document.currency}</strong></p>
        <p className="mb-0">Neto a pagar: <strong>{preview.net.toFixed(2)} {document.currency}</strong></p>
      </Col>}
    </Row>}
  </section>;
}
