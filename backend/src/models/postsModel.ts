import { query } from "../db";

export interface PostRow {
  id: number;
  user_id: number;
  title: string;
  content: string;
  community: string;
  created_at: string;
  username: string;
  display_name: string;
}

export function mapPost(post: PostRow) {
  return {
    id: post.id,
    userId: post.user_id,
    authorUsername: post.username,
    authorDisplayName: post.display_name,
    title: post.title,
    content: post.content,
    community: post.community,
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

export async function createPost(
  userId: number,
  title: string,
  content: string,
  community: string,
): Promise<PostRow> {
  const rows = await query<PostRow>(
    `INSERT INTO posts (user_id, title, content, community)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, title, content, community, created_at,
      ''::text as username,
      ''::text as display_name`,
    [userId, title, content, community],
  );

  return rows[0];
}
