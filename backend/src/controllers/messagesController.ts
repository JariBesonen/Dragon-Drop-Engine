import type { Request, Response } from "express";
import {
  getConversation,
  getConversationList,
  getUnreadMessageCount,
  mapConversation,
  mapMessage,
  markConversationRead,
  sendMessage,
} from "../models/messagesModel";
import { getProfileUserById } from "../models/profileModel";

export async function send(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const recipientUserId = Number(req.body.recipientUserId);
  if (!Number.isInteger(recipientUserId) || recipientUserId <= 0) {
    return res.status(400).json({ message: "Invalid recipient user id." });
  }

  const content = (req.body as { content?: string }).content;
  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ message: "Message content is required." });
  }

  if (req.session.userId === recipientUserId) {
    return res
      .status(400)
      .json({ message: "Cannot send message to yourself." });
  }

  const recipient = await getProfileUserById(recipientUserId);
  if (!recipient) {
    return res.status(404).json({ message: "Recipient not found." });
  }

  try {
    const message = await sendMessage(
      req.session.userId,
      recipientUserId,
      content.trim(),
    );
    return res.status(201).json({ message: mapMessage(message) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to send message." });
  }
}

export async function getList(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  try {
    const conversations = await getConversationList(req.session.userId);
    return res
      .status(200)
      .json({ conversations: conversations.map(mapConversation) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load conversations." });
  }
}

export async function getThread(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const otherUserId = Number(req.params.userId);
  if (!Number.isInteger(otherUserId) || otherUserId <= 0) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  if (req.session.userId === otherUserId) {
    return res
      .status(400)
      .json({ message: "Cannot view conversation with yourself." });
  }

  const other = await getProfileUserById(otherUserId);
  if (!other) {
    return res.status(404).json({ message: "User not found." });
  }

  try {
    const messages = await getConversation(req.session.userId, otherUserId);
    await markConversationRead(req.session.userId, otherUserId);
    return res.status(200).json({ messages: messages.map(mapMessage) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load conversation." });
  }
}

export async function getUnreadCount(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  try {
    const count = await getUnreadMessageCount(req.session.userId);
    return res.status(200).json({ unreadCount: count });
  } catch (error) {
    return res.status(500).json({ message: "Failed to get unread count." });
  }
}
