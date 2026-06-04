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
  like_count: number;
  dislike_count: number;
  user_vote: number | null;
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
    likeCount: Number(post.like_count) || 0,
    dislikeCount: Number(post.dislike_count) || 0,
    userVote: post.user_vote === null ? null : Number(post.user_vote),
  };
}

function postVoteSelect(userVoteExpression: string): string {
  return `
    p.*,
    u.username,
    u.display_name,
    COALESCE((SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id AND pv.vote = 1), 0) AS like_count,
    COALESCE((SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id AND pv.vote = -1), 0) AS dislike_count,
    ${userVoteExpression} AS user_vote
  `;
}

export async function getExplorePosts(userId?: number): Promise<PostRow[]> {
  return query<PostRow>(
    `SELECT ${postVoteSelect(
      typeof userId === "number"
        ? `COALESCE((SELECT pv.vote FROM post_votes pv WHERE pv.post_id = p.id AND pv.user_id = $1 LIMIT 1), 0)`
        : `0::smallint`,
    )}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at DESC
     LIMIT 60`,
    typeof userId === "number" ? [userId] : [],
  );
}

export async function getHomePosts(userId: number): Promise<PostRow[]> {
  return query<PostRow>(
    `SELECT DISTINCT ${postVoteSelect(
      `COALESCE((SELECT pv.vote FROM post_votes pv WHERE pv.post_id = p.id AND pv.user_id = $1 LIMIT 1), 0)`,
    )}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN follows f ON f.followed_id = p.user_id AND f.follower_id = $1
     LEFT JOIN hive_memberships hm ON hm.hive_id = p.hive_id AND hm.user_id = $1
     WHERE p.user_id = $1 OR f.follower_id = $1 OR hm.user_id = $1
     ORDER BY p.created_at DESC
     LIMIT 60`,
    [userId],
  );
}

export async function getHivePosts(
  hiveId: number,
  userId?: number,
): Promise<PostRow[]> {
  return query<PostRow>(
    `SELECT ${postVoteSelect(
      typeof userId === "number"
        ? `COALESCE((SELECT pv.vote FROM post_votes pv WHERE pv.post_id = p.id AND pv.user_id = $2 LIMIT 1), 0)`
        : `0::smallint`,
    )}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.hive_id = $1
     ORDER BY p.created_at DESC
     LIMIT 60`,
    typeof userId === "number" ? [hiveId, userId] : [hiveId],
  );
}

export async function getPostById(
  id: number,
  userId?: number,
): Promise<PostRow | null> {
  const rows = await query<PostRow>(
    `SELECT ${postVoteSelect(
      typeof userId === "number"
        ? `COALESCE((SELECT pv.vote FROM post_votes pv WHERE pv.post_id = p.id AND pv.user_id = $2 LIMIT 1), 0)`
        : `0::smallint`,
    )}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1
     LIMIT 1`,
    typeof userId === "number" ? [id, userId] : [id],
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
      ''::text as display_name,
      0::bigint as like_count,
      0::bigint as dislike_count,
      0::smallint as user_vote`,
    [postId, ownerUserId],
  );

  return rows[0] ?? null;
}

export async function voteOnPost(
  userId: number,
  postId: number,
  vote: 1 | -1,
): Promise<PostRow | null> {
  const post = await getPostById(postId, userId);
  if (!post) {
    return null;
  }

  const currentVote = post.user_vote;

  if (currentVote === vote) {
    await query(
      `DELETE FROM post_votes
       WHERE user_id = $1 AND post_id = $2`,
      [userId, postId],
    );
  } else {
    await query(
      `INSERT INTO post_votes (user_id, post_id, vote, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, post_id)
       DO UPDATE SET vote = EXCLUDED.vote, updated_at = NOW()`,
      [userId, postId, vote],
    );
  }

  return getPostById(postId, userId);
}
