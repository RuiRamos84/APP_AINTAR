import api from "./api";

const getNotifications = async () => {
  try {
    const response = await api.get("/notification");
    // console.log("Notifications response:", response.data);
    return Array.isArray(response.data.notifications)
      ? response.data.notifications
      : [];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
};

const getNotificationsCount = async () => {
  try {
    const response = await api.get("/notifications/count");
    // console.log("Notifications count response:", response.data);
    return response.data.count || 0;
  } catch (error) {
    console.error("Error fetching notifications count:", error);
    return 0;
  }
};

const updateNotificationStatus = async (documentId, status) => {
  try {
    const response = await api.put(`/notification/${documentId}`, { status });
    return response.data.message;
  } catch (error) {
    console.error("Error updating notification status:", error);
    throw error;
  }
};

const addNotification = async (userId) => {
  const response = await api.post("/notification", { user_id: userId });
  return response.data;
};

const clearNotifications = async (userId) => {
  const response = await api.delete("/notification", {
    data: { user_id: userId },
  });
  return response.data;
};

export {
  getNotifications,
  getNotificationsCount,
  addNotification,
  clearNotifications,
  updateNotificationStatus,
};
