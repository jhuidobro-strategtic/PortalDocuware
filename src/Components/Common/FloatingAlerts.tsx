import React, { CSSProperties, ReactNode, useEffect } from "react";

import "./FloatingAlerts.css";

export type FloatingAlertType = "success" | "danger" | "warning" | "info";

export interface FloatingAlertItem {
  id: string | number;
  type: FloatingAlertType;
  message: ReactNode;
  autoDismissMs?: number;
  dismissible?: boolean;
}

interface FloatingAlertsProps {
  alerts: FloatingAlertItem[];
  onRemove?: (id: FloatingAlertItem["id"]) => void;
}

const alertIcons: Record<FloatingAlertType, string> = {
  success: "ri-checkbox-circle-line",
  danger: "ri-error-warning-line",
  warning: "ri-alert-line",
  info: "ri-information-line",
};

const FloatingAlerts: React.FC<FloatingAlertsProps> = ({
  alerts,
  onRemove,
}) => {
  useEffect(() => {
    if (!onRemove) {
      return undefined;
    }

    const timers = alerts
      .filter((alert) => Number(alert.autoDismissMs) > 0)
      .map((alert) =>
        window.setTimeout(() => {
          onRemove(alert.id);
        }, alert.autoDismissMs)
      );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [alerts, onRemove]);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="floating-alerts-container" aria-live="polite">
      {alerts.map((alert) => {
        const alertStyle = alert.autoDismissMs
          ? ({
              ["--floating-alert-autoclose-ms" as string]: `${alert.autoDismissMs}ms`,
            } as CSSProperties)
          : undefined;

        return (
          <div
            key={alert.id}
            className={`alert alert-${alert.type} d-flex align-items-start gap-3 floating-alert${
              alert.autoDismissMs ? " floating-alert-autoclose" : ""
            }`}
            role="alert"
            style={alertStyle}
          >
            <i
              className={`${alertIcons[alert.type]} fs-5 flex-shrink-0 mt-1`}
              aria-hidden="true"
            />
            <div className="flex-grow-1">{alert.message}</div>
            {onRemove && alert.dismissible !== false && (
              <button
                type="button"
                className="btn-close flex-shrink-0"
                aria-label="Close"
                onClick={() => onRemove(alert.id)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FloatingAlerts;
