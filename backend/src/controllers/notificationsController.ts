import type { Request, Response } from "express";
import {
  getGroupedNotificationsForUser,
  getUnreadNotificationCount,
  markNotificationsReadForUser,
} from "../models/notificationsModel.js";

export async function list(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const [notifications, unreadCount] = await Promise.all([
    getGroupedNotificationsForUser(req.session.userId),
    getUnreadNotificationCount(req.session.userId),
  ]);

  return res.status(200).json({ notifications, unreadCount });
}

export async function markRead(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  await markNotificationsReadForUser(req.session.userId);
  return res.status(200).json({ message: "Notifications marked as read." });
}
