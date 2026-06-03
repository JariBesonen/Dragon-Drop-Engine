import { query } from "../db";

export interface ProfileUserRow {
  id: number;
  username: string;
  email: string;
  display_name: string;
  bio: string;
  created_at: string;
}

export interface UserPostRow {
  id: number;
  title: string;
  content: string;
  community: string;
  created_at: string;
}

export async function getProfileUserById(
  userId: number,
): Promise<ProfileUserRow | null> {
  const rows = await query<ProfileUserRow>(
    "SELECT id, username, email, display_name, bio, created_at FROM users WHERE id = $1 LIMIT 1",
    [userId],
  );

  return rows[0] || null;
}

export async function getProfilePostsByUserId(
  userId: number,
): Promise<UserPostRow[]> {
  return query<UserPostRow>(
    `SELECT id, title, content, community, created_at
     FROM posts
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId],
  );
}

export async function updateProfileSettings(
  userId: number,
  displayName?: string,
  bio?: string,
): Promise<ProfileUserRow | null> {
  const rows = await query<ProfileUserRow>(
    `UPDATE users
     SET display_name = COALESCE($2, display_name),
         bio = COALESCE($3, bio),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, username, email, display_name, bio, created_at`,
    [userId, displayName, bio],
  );

  return rows[0] || null;
}
