import { query } from "../db";

export interface ProfileUserRow {
  id: number;
  username: string;
  email: string;
  display_name: string;
  bio: string;
  theme_preference: "light" | "dark";
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
    "SELECT id, username, email, display_name, bio, theme_preference, created_at FROM users WHERE id = $1 LIMIT 1",
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
  username?: string,
  displayName?: string,
  bio?: string,
  themePreference?: "light" | "dark",
): Promise<ProfileUserRow | null> {
  const rows = await query<ProfileUserRow>(
    `UPDATE users
     SET username = COALESCE($2, username),
         display_name = COALESCE($3, display_name),
         bio = COALESCE($4, bio),
         theme_preference = COALESCE($5, theme_preference),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, username, email, display_name, bio, theme_preference, created_at`,
    [userId, username, displayName, bio, themePreference],
  );

  return rows[0] || null;
}
