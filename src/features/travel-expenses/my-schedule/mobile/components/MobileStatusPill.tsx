import React from "react";
import { useTranslation } from "react-i18next";
import { getStatusMeta } from "../../shared/formatters";

interface MobileStatusPillProps {
  status: boolean;
}

export const MobileStatusPill = ({ status }: MobileStatusPillProps) => {
  const { t } = useTranslation();
  const meta = getStatusMeta(status, t);

  return (
    <span
      className={`my-schedule-app__mobile-pill my-schedule-app__mobile-pill--${meta.tone}`}
    >
      <i className={meta.icon} />
      <span>{meta.label}</span>
    </span>
  );
};
