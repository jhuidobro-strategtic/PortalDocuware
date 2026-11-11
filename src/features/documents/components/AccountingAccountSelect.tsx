import React, { useEffect, useState } from "react";
import Select from "react-select";
import { Button } from "reactstrap";
import { AccountingAccount, fetchAccountingCatalog } from "../services/accounting";

interface Props {
  value: string; suggestions?: AccountingAccount[]; disabled?: boolean; label: string;
  onChange: (code: string) => void;
}

export default function AccountingAccountSelect({ value, suggestions = [], disabled, label, onChange }: Props) {
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    fetchAccountingCatalog().then((catalog) => { if (active) setAccounts(catalog.accounts); })
      .catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  const options = accounts.map((account) => ({ value: account.code, label: `${account.code} — ${account.name}` }));
  return <div style={{ minWidth: 290 }}>
    <Select aria-label={label} options={options} isSearchable isClearable isLoading={loading}
      isDisabled={disabled || loading || !!error}
      value={options.find((option) => option.value === value) || (value ? { value, label: value } : null)}
      onChange={(option: { value: string; label: string } | null) => onChange(option?.value || "")} placeholder="Buscar código o descripción…"
      noOptionsMessage={() => "No hay cuentas que coincidan"}
      menuPortalTarget={document.body} menuPosition="fixed" styles={{ menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 9999 }) }} />
    {error && <div role="alert" className="text-danger small mt-1">{error} <Button type="button" color="link" size="sm" onClick={() => setAttempt((count) => count + 1)}>Reintentar</Button></div>}
    {!value && suggestions.length > 0 && <details className="small mt-1">
      <summary>Sugerencias por descripción ({suggestions.length})</summary>
      {suggestions.map((account) => <Button key={account.code} type="button" color="link" size="sm" className="d-block text-start"
        disabled={disabled || !!error} onClick={() => onChange(account.code)}>{account.code} — {account.name}</Button>)}
      <span className="text-muted">Confirme el área y la cuenta antes de guardar.</span>
    </details>}
  </div>;
}
