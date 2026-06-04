import { query } from "../db";

export interface PostRow {
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
}

export function mapPost(post: PostRow) {
  return {
    id: post.id,
    userId: post.user_id,
    hiveId: post.hive_id,
    authorUsername: post.username,
    authorDisplayName: post.display_name,
    title: post.title,
    content: post.content,
    community: post.community,
    imageUrl: post.image_url,
    createdAt: post.created_at,
  };
}

export async function getExplorePosts(): Promise<PostRow[]> {
  return query<PostRow>(
    `SELECT p.*, u.username, u.display_name
     FROM posts p
     JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at DESC
     LIMIT 60`,
  );
}

export async function getHomePosts(userId: number): Promise<PostRow[]> {
  return query<PostRow>(
    `SELECT DISTINCT p.*, u.username, u.display_name
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN follows f ON f.followed_id = p.user_id AND f.follower_id = $1
     WHERE p.user_id = $1 OR f.follower_id = $1
     ORDER BY p.created_at DESC
     LIMIT 60`,
    [userId],
  );
}

export async function getHivePosts(hiveId: number): Promise<PostRow[]> {
  return query<PostRow>(
    `SELECT p.*, u.username, u.display_name
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.hive_id = $1
     ORDER BY p.created_at DESC
     LIMIT 60`,
    [hiveId],
  );
}

export async function getPostById(id: number): Promise<PostRow | null> {
  const rows = await query<PostRow>(
    `SELECT p.*, u.username, u.display_name
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function createHivePost(
  userId: number,
  hiveId: number,
  caption: string,
  imageUrl: string | null,
  community: string,
): Promise<PostRow> {
  const rows = await query<PostRow>(
    `INSERT INTO posts (user_id, hive_id, title, content, community, image_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, hive_id, title, content, community, image_url, created_at,
      ''::text as username,
      ''::text as display_name`,
    [userId, hiveId, caption, caption, community, imageUrl],
  );

  return rows[0];
}

export async function createPost(
  userId: number,
  hiveId: number,
  caption: string,
  community: string,
  imageUrl: string | null,
): Promise<PostRow> {
  return createHivePost(userId, hiveId, caption, imageUrl, community);
}

export async function deletePostByOwner(
  postId: number,
  ownerUserId: number,
): Promise<PostRow | null> {
  const rows = await query<PostRow>(
    `DELETE FROM posts
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, hive_id, title, content, community, image_url, created_at,
      ''::text as username,
      ''::text as display_name`,
    [postId, ownerUserId],
  );

  return rows[0] ?? null;
}
