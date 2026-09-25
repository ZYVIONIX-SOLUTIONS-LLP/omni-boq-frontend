import { apiGet, apiPatch } from "./client";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export async function getNotifications(): Promise<Notification[]> {
  return apiGet<Notification[]>("/notifications");
}

export async function markNotificationAsRead(id: string): Promise<void> {
  return apiPatch<void>(`/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  return apiPatch<void>(`/notifications/read-all`);
}
