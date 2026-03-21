import React from "react";
import { useTranslation } from "react-i18next";

type CurrencyValue = string | number | null | undefined;

interface CurrencyMeta {
  label: string;
  alt: string;
  imageUrl: string | null;
}

interface StatusMeta {
  label: string;
  className: string;
  icon: string;
}

const baseStatusClassName =
  "badge rounded-pill px-3 py-2 d-inline-flex align-items-center gap-1 border";

export const getCurrencyMeta = (currency: CurrencyValue): CurrencyMeta => {
  const normalizedCurrency = String(currency ?? "").trim().toUpperCase();

  if (normalizedCurrency === "1" || normalizedCurrency === "PEN") {
    return {
      label: "PEN",
      alt: "Peru",
      imageUrl: "https://flagcdn.com/w40/pe.png",
    };
  }

  if (normalizedCurrency === "2" || normalizedCurrency === "USD") {
    return {
      label: "USD",
      alt: "USA",
      imageUrl: "https://flagcdn.com/w40/us.png",
    };
  }

  return {
    label: normalizedCurrency || "-",
    alt: "Moneda",
    imageUrl: null,
  };
};

export const getDocumentStatusMeta = (
  status?: boolean | null,
  t?: (key: string) => string
): StatusMeta => {
  const translate = t || ((value: string) => value);

  if (status === true) {
    return {
      label: translate("Active"),
      className: `${baseStatusClassName} bg-success-subtle text-success border-success-subtle`,
      icon: "ri-checkbox-circle-line",
    };
  }

  if (status === false) {
    return {
      label: translate("Pending"),
      className: `${baseStatusClassName} bg-warning-subtle text-warning border-warning-subtle`,
      icon: "ri-time-line",
    };
  }

  return {
    label: translate("No status"),
      className: `${baseStatusClassName} bg-secondary-subtle text-secondary border-secondary-subtle`,
      icon: "ri-subtract-line",
  };
};

interface CurrencyBadgeProps {
  currency: CurrencyValue;
}

export const CurrencyBadge: React.FC<CurrencyBadgeProps> = ({ currency }) => {
  const meta = getCurrencyMeta(currency);

  return (
    <div className="d-inline-flex align-items-center gap-2 px-2 py-1 rounded-pill bg-light border">
      {meta.imageUrl && (
        <img
          src={meta.imageUrl}
          alt={meta.alt}
          width={20}
          height={15}
          className="rounded-1 flex-shrink-0"
        />
      )}
      <span className="fw-semibold text-body">{meta.label}</span>
    </div>
  );
};

interface DocumentStatusBadgeProps {
  status?: boolean | null;
}

export const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({
  status,
}) => {
  const { t } = useTranslation();
  const meta = getDocumentStatusMeta(status, t);

  return (
    <span className={meta.className}>
      <i className={meta.icon} />
      <span>{meta.label}</span>
    </span>
  );
};
