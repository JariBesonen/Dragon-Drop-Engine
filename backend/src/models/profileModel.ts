import { query } from "../db";

export interface ProfileUserRow {
  id: number;
  username: string;
  email: string;
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
  created_at: string;
}

interface NotificationPreferencesUpdate {
  all?: boolean;
  postLikes?: boolean;
  postComments?: boolean;
  replies?: boolean;
  commentLikes?: boolean;
  hiveFollows?: boolean;
}

const profileUserSelect =
  "id, username, email, display_name, bio, theme_preference, notifications_enabled, notify_post_likes, notify_post_comments, notify_replies, notify_comment_likes, notify_hive_follows, avatar_url, banner_url, created_at";

export interface UserPostRow {
  id: number;
  user_id: number;
  hive_id: number | null;
  title: string;
  content: string;
  community: string;
  image_url: string | null;
  created_at: string;
  username: string;
  display_name: string;
  like_count: number;
  dislike_count: number;
  user_vote: number | null;
}

export interface ProfileCommentRow {
  id: number;
  post_id: number;
  user_id: number;
  parent_comment_id: number | null;
  content: string;
  deleted_at: string | null;
  created_at: string;
  username: string;
  display_name: string;
  like_count: number;
  dislike_count: number;
  user_vote: number | null;
  post_title: string;
  post_community: string;
}

export interface OwnedHiveRow {
  id: number;
  name: string;
}

export async function getProfileUserById(
  userId: number,
): Promise<ProfileUserRow | null> {
  const rows = await query<ProfileUserRow>(
    `SELECT ${profileUserSelect} FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  );

  return rows[0] || null;
}

export async function getProfileUserByUsername(
  username: string,
): Promise<ProfileUserRow | null> {
  const rows = await query<ProfileUserRow>(
    `SELECT ${profileUserSelect}
     FROM users
     WHERE LOWER(username) = LOWER($1)
     LIMIT 1`,
    [username],
  );

  return rows[0] || null;
}

function postVoteSelect(userVoteExpression: string): string {
  return `
    p.id,
    p.user_id,
    p.hive_id,
    p.title,
    p.content,
    p.community,
    p.image_url,
    p.created_at,
    u.username,
    u.display_name,
    COALESCE((SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id AND pv.vote = 1), 0) AS like_count,
    COALESCE((SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id AND pv.vote = -1), 0) AS dislike_count,
    ${userVoteExpression} AS user_vote
  `;
}

export async function getProfilePostsByUserId(
  userId: number,
  viewerUserId?: number,
): Promise<UserPostRow[]> {
  return query<UserPostRow>(
    `SELECT ${postVoteSelect(
      typeof viewerUserId === "number"
        ? `COALESCE((SELECT pv.vote FROM post_votes pv WHERE pv.post_id = p.id AND pv.user_id = $2 LIMIT 1), 0)`
        : `0::smallint`,
    )}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1
    ORDER BY p.created_at DESC
     LIMIT 50`,
    typeof viewerUserId === "number" ? [userId, viewerUserId] : [userId],
  );
}

function commentVoteSelect(userVoteExpression: string): string {
  return `
    c.id,
    c.post_id,
    c.user_id,
    c.parent_comment_id,
    c.content,
    c.deleted_at,
    c.created_at,
    u.username,
    u.display_name,
    COALESCE((SELECT COUNT(*) FROM comment_votes cv WHERE cv.comment_id = c.id AND cv.vote = 1), 0) AS like_count,
    COALESCE((SELECT COUNT(*) FROM comment_votes cv WHERE cv.comment_id = c.id AND cv.vote = -1), 0) AS dislike_count,
    ${userVoteExpression} AS user_vote,
    p.title AS post_title,
    p.community AS post_community
  `;
}

export async function getProfileTopLevelCommentsByUserId(
  userId: number,
  viewerUserId?: number,
): Promise<ProfileCommentRow[]> {
  return query<ProfileCommentRow>(
    `SELECT ${commentVoteSelect(
      typeof viewerUserId === "number"
        ? `COALESCE((SELECT cv.vote FROM comment_votes cv WHERE cv.comment_id = c.id AND cv.user_id = $2 LIMIT 1), 0)`
        : `0::smallint`,
    )}
     FROM comments c
     JOIN users u ON u.id = c.user_id
     JOIN posts p ON p.id = c.post_id
     WHERE c.user_id = $1 AND c.parent_comment_id IS NULL
     ORDER BY c.created_at DESC
     LIMIT 50`,
    typeof viewerUserId === "number" ? [userId, viewerUserId] : [userId],
  );
}

export async function getOwnedHivesByUserId(
  userId: number,
): Promise<OwnedHiveRow[]> {
  return query<OwnedHiveRow>(
    `SELECT id, name
     FROM hives
     WHERE owner_user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );
}

export async function getFollowerCountByUserId(
  userId: number,
): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM follows
     WHERE followed_id = $1`,
    [userId],
  );

  return Number(rows[0]?.count ?? 0);
}

export async function isFollowingUser(
  followerId: number,
  followedId: number,
): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM follows
       WHERE follower_id = $1 AND followed_id = $2
     )`,
    [followerId, followedId],
  );

  return rows[0]?.exists ?? false;
}

export async function followUser(
  followerId: number,
  followedId: number,
): Promise<void> {
  await query(
    `INSERT INTO follows (follower_id, followed_id)
     VALUES ($1, $2)
     ON CONFLICT (follower_id, followed_id) DO NOTHING`,
    [followerId, followedId],
  );
}

export async function unfollowUser(
  followerId: number,
  followedId: number,
): Promise<void> {
  await query(
    `DELETE FROM follows
     WHERE follower_id = $1 AND followed_id = $2`,
    [followerId, followedId],
  );
}

export async function updateProfileSettings(
  userId: number,
  username?: string,
  displayName?: string,
  bio?: string,
  themePreference?: "light" | "dark",
  notificationPreferences?: NotificationPreferencesUpdate,
  avatarUrl?: string | null,
  bannerUrl?: string | null,
): Promise<ProfileUserRow | null> {
  const rows = await query<ProfileUserRow>(
    `UPDATE users
     SET username = COALESCE($2, username),
         display_name = COALESCE($3, display_name),
         bio = COALESCE($4, bio),
         theme_preference = COALESCE($5, theme_preference),
         notifications_enabled = COALESCE($6, notifications_enabled),
         notify_post_likes = COALESCE($7, notify_post_likes),
         notify_post_comments = COALESCE($8, notify_post_comments),
         notify_replies = COALESCE($9, notify_replies),
         notify_comment_likes = COALESCE($10, notify_comment_likes),
         notify_hive_follows = COALESCE($11, notify_hive_follows),
         avatar_url = COALESCE($12, avatar_url),
         banner_url = COALESCE($13, banner_url),
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${profileUserSelect}`,
    [
      userId,
      username,
      displayName,
      bio,
      themePreference,
      notificationPreferences?.all,
      notificationPreferences?.postLikes,
      notificationPreferences?.postComments,
      notificationPreferences?.replies,
      notificationPreferences?.commentLikes,
      notificationPreferences?.hiveFollows,
      avatarUrl,
      bannerUrl,
    ],
  );

  return rows[0] || null;
}
