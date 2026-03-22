import React from "react";
import FloatingAlerts from "../../../Components/Common/FloatingAlerts";
import { Notification } from "../types";

interface NotificationsProps {
  notifications: Notification[];
  onRemove: (id: number) => void;
}

const Notifications: React.FC<NotificationsProps> = ({
  notifications,
  onRemove,
}) => (
  <FloatingAlerts
    alerts={notifications.map((notification) => ({
      ...notification,
      autoDismissMs: 5000,
    }))}
    onRemove={(id) => {
      if (typeof id === "number") {
        onRemove(id);
      }
    }}
  />
);

export default Notifications;
