import { query } from "../db";

export interface MessageRow {
  id: number;
  sender_user_id: number;
  recipient_user_id: number;
  sender_username: string;
  sender_display_name: string;
  content: string;
  created_at: string;
}

export interface ConversationRow {
  other_user_id: number;
  other_user_username: string;
  other_user_display_name: string;
  other_user_avatar_url: string | null;
  latest_message_content: string;
  latest_message_created_at: string;
  latest_message_sender_id: number;
}

export function mapMessage(message: MessageRow) {
  return {
    id: message.id,
    senderUserId: message.sender_user_id,
    recipientUserId: message.recipient_user_id,
    senderUsername: message.sender_username,
    senderDisplayName: message.sender_display_name,
    content: message.content,
    createdAt: message.created_at,
  };
}

export function mapConversation(conversation: ConversationRow) {
  return {
    otherUserId: conversation.other_user_id,
    otherUserUsername: conversation.other_user_username,
    otherUserDisplayName: conversation.other_user_display_name,
    otherUserAvatarUrl: conversation.other_user_avatar_url,
    latestMessageContent: conversation.latest_message_content,
    latestMessageCreatedAt: conversation.latest_message_created_at,
    latestMessageSenderId: conversation.latest_message_sender_id,
  };
}

export async function sendMessage(
  senderUserId: number,
  recipientUserId: number,
  content: string,
): Promise<MessageRow> {
  const rows = await query<MessageRow>(
    `INSERT INTO messages (sender_user_id, recipient_user_id, content)
     VALUES ($1, $2, $3)
     RETURNING id, sender_user_id, recipient_user_id, content, created_at,
      ''::text as sender_username,
      ''::text as sender_display_name`,
    [senderUserId, recipientUserId, content],
  );

  return rows[0];
}

export async function getConversation(
  userId: number,
  otherUserId: number,
  limit: number = 50,
  offset: number = 0,
): Promise<MessageRow[]> {
  return query<MessageRow>(
    `SELECT 
      m.id,
      m.sender_user_id,
      m.recipient_user_id,
      u.username as sender_username,
      u.display_name as sender_display_name,
      m.content,
      m.created_at
     FROM messages m
     JOIN users u ON u.id = m.sender_user_id
     WHERE (
       (m.sender_user_id = $1 AND m.recipient_user_id = $2) OR
       (m.sender_user_id = $2 AND m.recipient_user_id = $1)
     )
     ORDER BY m.created_at DESC
     LIMIT $3 OFFSET $4`,
    [userId, otherUserId, limit, offset],
  );
}

export async function getConversationList(
  userId: number,
): Promise<ConversationRow[]> {
  return query<ConversationRow>(
    `SELECT DISTINCT ON (other_user_id)
      CASE 
        WHEN m.sender_user_id = $1 THEN m.recipient_user_id
        ELSE m.sender_user_id
      END as other_user_id,
      u.username as other_user_username,
      u.display_name as other_user_display_name,
      u.avatar_url as other_user_avatar_url,
      m.content as latest_message_content,
      m.created_at as latest_message_created_at,
      m.sender_user_id as latest_message_sender_id
     FROM messages m
     JOIN users u ON u.id = CASE 
       WHEN m.sender_user_id = $1 THEN m.recipient_user_id
       ELSE m.sender_user_id
     END
     WHERE m.sender_user_id = $1 OR m.recipient_user_id = $1
     ORDER BY other_user_id, m.created_at DESC`,
    [userId],
  );
}

export async function getUnreadMessageCount(userId: number): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM messages
     WHERE recipient_user_id = $1 AND read_at IS NULL`,
    [userId],
  );
  return parseInt(rows[0].count, 10);
}

export async function markConversationRead(
  userId: number,
  otherUserId: number,
): Promise<void> {
  await query(
    `UPDATE messages SET read_at = NOW()
     WHERE recipient_user_id = $1 AND sender_user_id = $2 AND read_at IS NULL`,
    [userId, otherUserId],
  );
}
