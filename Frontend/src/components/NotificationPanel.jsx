
import { useCallback, useEffect, useState } from "react";
import "../styles/NotificationPanel.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const getToken = () => {
  return localStorage.getItem("accessToken");
};

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Please log in to view notifications.");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/notifications/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      ); 
      if (!response.ok) {
        throw new Error(
          `Could not load notifications (${response.status}).`
        );
      }

      const data = await response.json();

      // Supports both normal DRF lists and paginated DRF responses.
      const items = Array.isArray(data) ? data : data.results;

      setNotifications(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  async function markAsRead(notificationId) {
    setUpdatingId(notificationId);
    setError("");

    try {
      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${notificationId}/mark-read/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || `Unable to mark as read (${response.status}).`
        );
      }

      // Update the UI only after the backend confirms success.
      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err) {
      setError(err.message || "Could not update notification.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="notification-panel">
      <div className="notification-header">
        <div>
          <h2>
            Notifications
            {unreadCount > 0 && (
              <span className="notification-count">
                {unreadCount}
              </span>
            )}
          </h2>
          <p>Updates about your audit plans</p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={fetchNotifications}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error && <p className="notification-error">{error}</p>}

      {loading ? (
        <p className="notification-message">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p className="notification-message">
          You have no notifications.
        </p>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`notification-item ${
                notification.is_read ? "read" : "unread"
              }`}
            >
              <div className="notification-item-header">
                <h3>{notification.title}</h3>

                <span
                  className={`notification-status ${
                    notification.is_read ? "status-read" : "status-unread"
                  }`}
                >
                  {notification.is_read ? "Read" : "Unread"}
                </span>
              </div>

              <p className="notification-body">
                {notification.message}
              </p>

              
              {notification.notification_type && (
                <p className="notification-type">
                  Type:{" "}
                  {{
                    "1": "Annual Audit Plan",
                    "2": "Project",
                    "3": "Audit Assignment",
                    "4": "Audit Reminder",
                    "5": "Checklist / Non-Conformity",
                    "6": "Corrective Action",
                    "7": "Audit Closure",
                  }[String(notification.notification_type)] ??
                    "General Notification"}
                </p>
              )}


              <div className="notification-item-footer">
                <time>
                  {notification.created_at
                    ? new Date(notification.created_at).toLocaleString()
                    : ""}
                </time>

                {!notification.is_read && (
                  <button
                    type="button"
                    className="mark-read-button"
                    onClick={() => markAsRead(notification.id)}
                    disabled={updatingId === notification.id}
                  >
                    {updatingId === notification.id
                      ? "Updating..."
                      : "Mark as read"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
