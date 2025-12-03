import React from "react";
import { Notification } from "../types";

interface NotificationsProps {
  notifications: Notification[];
  onRemove: (id: number) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ notifications, onRemove }) => (
  <div className="notification-container">
    {notifications.map((n) => (
      <div
        key={n.id}
        className={`alert alert-${n.type} alert-dismissible fade show notification-fade d-flex align-items-center`}
        role="alert"
      >
        {n.type === "success" && <i className="ri-check-line me-2"></i>}
        {n.type === "danger" && <i className="ri-error-warning-line me-2"></i>}
        {n.type === "warning" && <i className="ri-alert-line me-2"></i>}
        {n.type === "info" && <i className="ri-information-line me-2"></i>}

        <span>{n.message}</span>

        <button
          type="button"
          className="btn-close ms-auto"
          onClick={() => onRemove(n.id)}
        ></button>
      </div>
    ))}
  </div>
);

export default Notifications;
