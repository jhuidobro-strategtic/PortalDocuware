import React from "react";
import { Alert } from "reactstrap";
import { Notification } from "../types";

interface NotificationsProps {
  notifications: Notification[];
  onRemove: (id: number) => void;
}

const Notifications: React.FC<NotificationsProps> = ({
  notifications,
  onRemove,
}) => (
  <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 9999 }}>
    {notifications.map((notif) => (
      <Alert
        key={notif.id}
        color={notif.type}
        className="mb-2"
        toggle={() => onRemove(notif.id)}
      >
        {notif.message}
      </Alert>
    ))}
  </div>
);

export default Notifications;
