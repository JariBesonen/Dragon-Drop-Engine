import { query } from "../db";

export interface CommentRow {
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
}

interface CommentReferenceRow {
  id: number;
  post_id: number;
  user_id: number;
  deleted_at: string | null;
}

export function mapComment(comment: CommentRow) {
  return {
    id: comment.id,
    postId: comment.post_id,
    userId: comment.user_id,
    parentCommentId: comment.parent_comment_id,
    content: comment.content,
    createdAt: comment.created_at,
    authorUsername: comment.username,
    authorDisplayName: comment.display_name,
    isDeleted: comment.deleted_at !== null,
    likeCount: Number(comment.like_count) || 0,
    dislikeCount: Number(comment.dislike_count) || 0,
    userVote: comment.user_vote === null ? null : Number(comment.user_vote),
  };
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
    ${userVoteExpression} AS user_vote
  `;
}

export async function getPostComments(
  postId: number,
  userId?: number,
): Promise<CommentRow[]> {
  return query<CommentRow>(
    `SELECT ${commentVoteSelect(
      typeof userId === "number"
        ? `COALESCE((SELECT cv.vote FROM comment_votes cv WHERE cv.comment_id = c.id AND cv.user_id = $2 LIMIT 1), 0)`
        : `0::smallint`,
    )}
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC, c.id ASC`,
    typeof userId === "number" ? [postId, userId] : [postId],
  );
}

export async function getCommentReferenceById(
  commentId: number,
): Promise<CommentReferenceRow | null> {
  const rows = await query<CommentReferenceRow>(
    `SELECT id, post_id, user_id, deleted_at
     FROM comments
     WHERE id = $1
     LIMIT 1`,
    [commentId],
  );

  return rows[0] ?? null;
}

export async function createComment(
  userId: number,
  postId: number,
  content: string,
  parentCommentId: number | null,
): Promise<CommentRow> {
  const rows = await query<CommentRow>(
    `INSERT INTO comments (post_id, user_id, parent_comment_id, content)
     VALUES ($1, $2, $3, $4)
     RETURNING id, post_id, user_id, parent_comment_id, content, deleted_at, created_at,
      ''::text as username,
      ''::text as display_name,
      0::bigint as like_count,
      0::bigint as dislike_count,
      0::smallint as user_vote`,
    [postId, userId, parentCommentId, content],
  );

  const createdComment = rows[0];
  const hydratedRows = await query<CommentRow>(
    `SELECT ${commentVoteSelect(
      `COALESCE((SELECT cv.vote FROM comment_votes cv WHERE cv.comment_id = c.id AND cv.user_id = $2 LIMIT 1), 0)`,
    )}
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = $1
     LIMIT 1`,
    [createdComment.id, userId],
  );

  return hydratedRows[0];
}

export async function getCommentById(
  commentId: number,
  userId?: number,
): Promise<CommentRow | null> {
  const rows = await query<CommentRow>(
    `SELECT ${commentVoteSelect(
      typeof userId === "number"
        ? `COALESCE((SELECT cv.vote FROM comment_votes cv WHERE cv.comment_id = c.id AND cv.user_id = $2 LIMIT 1), 0)`
        : `0::smallint`,
    )}
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = $1
     LIMIT 1`,
    typeof userId === "number" ? [commentId, userId] : [commentId],
  );

  return rows[0] ?? null;
}

export async function voteOnComment(
  userId: number,
  commentId: number,
  vote: 1 | -1,
): Promise<CommentRow | null> {
  const comment = await getCommentById(commentId, userId);
  if (!comment) {
    return null;
  }

  const currentVote = comment.user_vote;

  if (currentVote === vote) {
    await query(
      `DELETE FROM comment_votes
       WHERE user_id = $1 AND comment_id = $2`,
      [userId, commentId],
    );
  } else {
    await query(
      `INSERT INTO comment_votes (user_id, comment_id, vote, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, comment_id)
       DO UPDATE SET vote = EXCLUDED.vote, updated_at = NOW()`,
      [userId, commentId, vote],
    );
  }

  return getCommentById(commentId, userId);
}

export async function deleteCommentByOwner(
  commentId: number,
  ownerUserId: number,
): Promise<CommentRow | null> {
  const rows = await query<CommentReferenceRow>(
    `WITH RECURSIVE descendants AS (
       SELECT id FROM comments WHERE id = $1 AND user_id = $2
       UNION ALL
       SELECT c.id
       FROM comments c
       JOIN descendants d ON c.parent_comment_id = d.id
     )
     UPDATE comments
     SET deleted_at = COALESCE(deleted_at, NOW()),
         content = '[deleted]'
     WHERE id IN (SELECT id FROM descendants)
     RETURNING id, post_id, user_id, deleted_at`,
    [commentId, ownerUserId],
  );

  const updated = rows.find((row) => row.id === commentId);
  if (!updated) {
    return null;
  }

  return getCommentById(commentId, ownerUserId);
}
