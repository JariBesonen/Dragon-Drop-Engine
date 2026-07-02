import { query } from "../db";

export interface UserRow {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  display_name: string;
  bio: string;
  theme_preference: "light" | "dark";
  notifications_enabled: boolean;
  notify_post_likes: boolean;
  notify_post_comments: boolean;
  notify_replies: boolean;
  notify_comment_likes: boolean;
  notify_hive_follows: boolean;
  avatar_url: string | null;
  banner_url: string | null;
  is_private: boolean;
  created_at: string;
}

export function sanitizeUser(user: UserRow) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    bio: user.bio,
    themePreference: user.theme_preference,
    avatarUrl: user.avatar_url,
    bannerUrl: user.banner_url,
    isPrivate: user.is_private,
    notificationPreferences: {
      all: user.notifications_enabled,
      postLikes: user.notify_post_likes,
      postComments: user.notify_post_comments,
      replies: user.notify_replies,
      commentLikes: user.notify_comment_likes,
      hiveFollows: user.notify_hive_follows,
    },
    createdAt: user.created_at,
  };
}

export async function findUserByUsername(
  username: string,
): Promise<UserRow | null> {
  const rows = await query<UserRow>(
    "SELECT * FROM users WHERE username = $1 LIMIT 1",
    [username],
  );

  return rows[0] || null;
}

export async function findUserByUsernameOrEmail(
  username: string,
  email: string,
): Promise<UserRow | null> {
  const rows = await query<UserRow>(
    "SELECT * FROM users WHERE username = $1 OR email = $2 LIMIT 1",
    [username, email],
  );

  return rows[0] || null;
}

export async function findUserByIdentity(
  identity: string,
): Promise<UserRow | null> {
  const rows = await query<UserRow>(
    "SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1",
    [identity],
  );

  return rows[0] || null;
}

export async function createUser(
  username: string,
  email: string,
  passwordHash: string,
): Promise<UserRow> {
  const rows = await query<UserRow>(
    `INSERT INTO users (username, email, password_hash, display_name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [username, email, passwordHash, username],
  );

  return rows[0];
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const rows = await query<UserRow>(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [id],
  );

  return rows[0] || null;
}

export async function deleteUserById(id: number): Promise<boolean> {
  const rows = await query<{ id: number }>(
    "DELETE FROM users WHERE id = $1 RETURNING id",
    [id],
  );

  return rows.length > 0;
}
