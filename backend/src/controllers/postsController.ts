import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import {
  createComment,
  deleteCommentByOwner,
  getCommentById,
  getCommentReferenceById,
  getPostComments,
  mapComment,
  voteOnComment,
} from "../models/commentsModel";
import { getHiveById, isUserJoinedHive } from "../models/hivesModel";
import { createNotification } from "../models/notificationsModel.js";
import {
  createHivePost,
  deletePostByOwner,
  getHivePosts,
  getExplorePosts,
  getRecommendedPosts,
  getHomePosts,
  getPostById,
  mapPost,
  voteOnPost,
} from "../models/postsModel";
import { isPostSaved, savePost, unsavePost } from "../models/profileModel";

export async function explore(req: Request, res: Response): Promise<Response> {
  const posts = await getRecommendedPosts(req.session.userId);
  return res.status(200).json({ posts: posts.map(mapPost) });
}

export async function home(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    const posts = await getExplorePosts();
    return res.status(200).json({ posts: posts.map(mapPost) });
  }

  const posts = await getHomePosts(req.session.userId);
  return res.status(200).json({ posts: posts.map(mapPost) });
}

export async function create(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const rawHiveId = req.body.hiveId ?? req.params.id;
  const hiveId = Number(rawHiveId);
  if (!Number.isInteger(hiveId) || hiveId <= 0) {
    return res.status(400).json({ message: "Valid hive id is required." });
  }

  const { caption, content, title } = req.body as {
    caption?: string;
    content?: string;
    title?: string;
  };

  const resolvedCaption = (caption || content || title || "").trim();

  if (!resolvedCaption) {
    return res.status(400).json({ message: "Caption is required." });
  }

  const hive = await getHiveById(hiveId);
  if (!hive) {
    return res.status(404).json({ message: "Hive not found." });
  }

  if (hive.is_private && hive.owner_user_id !== req.session.userId) {
    const joined = await isUserJoinedHive(req.session.userId, hiveId);
    if (!joined) {
      return res.status(403).json({
        message: "You must join this private hive before creating posts.",
      });
    }
  }

  const imageUrl = req.file ? `/uploads/posts/${req.file.filename}` : null;

  const post = await createHivePost(
    req.session.userId,
    hiveId,
    resolvedCaption,
    imageUrl,
    hive.name,
  );

  return res.status(201).json({ post: mapPost(post) });
}

export async function hivePosts(
  req: Request,
  res: Response,
): Promise<Response> {
  const hiveId = Number(req.params.id);
  if (!Number.isInteger(hiveId) || hiveId <= 0) {
    return res.status(400).json({ message: "Invalid hive id." });
  }

  const hive = await getHiveById(hiveId);
  if (!hive) {
    return res.status(404).json({ message: "Hive not found." });
  }

  if (hive.is_private) {
    if (!req.session.userId) {
      return res.status(403).json({
        message: "This hive is private. Join to view posts.",
      });
    }

    if (hive.owner_user_id !== req.session.userId) {
      const joined = await isUserJoinedHive(req.session.userId, hiveId);
      if (!joined) {
        return res.status(403).json({
          message: "This hive is private. Join to view posts.",
        });
      }
    }
  }

  const posts = await getHivePosts(hiveId, req.session.userId);
  return res.status(200).json({ posts: posts.map(mapPost) });
}

export async function remove(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: "Invalid post id." });
  }

  const post = await getPostById(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found." });
  }

  if (post.user_id !== req.session.userId) {
    return res
      .status(403)
      .json({ message: "You can only delete your own posts." });
  }

  const deletedPost = await deletePostByOwner(postId, req.session.userId);
  if (!deletedPost) {
    return res.status(404).json({ message: "Post not found." });
  }

  if (deletedPost.image_url) {
    const absoluteImagePath = path.resolve(
      process.cwd(),
      deletedPost.image_url.replace(/^\//, ""),
    );
    fs.promises.unlink(absoluteImagePath).catch(() => undefined);
  }

  return res.status(200).json({ message: "Post deleted." });
}

export async function getById(req: Request, res: Response): Promise<Response> {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: "Invalid post id." });
  }

  const post = await getPostById(postId, req.session.userId);
  if (!post) {
    return res.status(404).json({ message: "Post not found." });
  }

  return res.status(200).json({ post: mapPost(post) });
}

async function handleVote(
  req: Request,
  res: Response,
  vote: 1 | -1,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: "Invalid post id." });
  }

  const updatedPost = await voteOnPost(req.session.userId, postId, vote);
  if (!updatedPost) {
    return res.status(404).json({ message: "Post not found." });
  }

  if (vote === 1 && updatedPost.user_vote === 1) {
    await createNotification({
      recipientUserId: updatedPost.user_id,
      actorUserId: req.session.userId,
      type: "post_like",
      postId,
    });
  }

  return res.status(200).json({ post: mapPost(updatedPost) });
}

export async function like(req: Request, res: Response): Promise<Response> {
  return handleVote(req, res, 1);
}

export async function dislike(req: Request, res: Response): Promise<Response> {
  return handleVote(req, res, -1);
}

interface ApiCommentNode {
  id: number;
  postId: number;
  userId: number;
  parentCommentId: number | null;
  content: string;
  createdAt: string;
  authorUsername: string;
  authorDisplayName: string;
  isDeleted: boolean;
  likeCount: number;
  dislikeCount: number;
  userVote: number | null;
  replies: ApiCommentNode[];
}

function buildCommentTree(
  comments: ReturnType<typeof mapComment>[],
): ApiCommentNode[] {
  const nodes: ApiCommentNode[] = comments.map((comment) => ({
    ...comment,
    replies: [],
  }));

  const byId = new Map<number, ApiCommentNode>();
  nodes.forEach((node) => {
    byId.set(node.id, node);
  });

  const roots: ApiCommentNode[] = [];
  nodes.forEach((node) => {
    if (node.parentCommentId && byId.has(node.parentCommentId)) {
      byId.get(node.parentCommentId)?.replies.push(node);
      return;
    }

    roots.push(node);
  });

  return roots;
}

export async function comments(req: Request, res: Response): Promise<Response> {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: "Invalid post id." });
  }

  const post = await getPostById(postId, req.session.userId);
  if (!post) {
    return res.status(404).json({ message: "Post not found." });
  }

  const postComments = await getPostComments(postId, req.session.userId);
  return res.status(200).json({
    comments: buildCommentTree(postComments.map(mapComment)),
  });
}

export async function addComment(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: "Invalid post id." });
  }

  const post = await getPostById(postId, req.session.userId);
  if (!post) {
    return res.status(404).json({ message: "Post not found." });
  }

  const rawContent = (req.body as { content?: string }).content;
  const content = typeof rawContent === "string" ? rawContent.trim() : "";
  if (!content) {
    return res.status(400).json({ message: "Comment content is required." });
  }

  const rawParentCommentId = (req.body as { parentCommentId?: unknown })
    .parentCommentId;
  const parentCommentId =
    rawParentCommentId === undefined || rawParentCommentId === null
      ? null
      : Number(rawParentCommentId);

  if (parentCommentId !== null) {
    if (!Number.isInteger(parentCommentId) || parentCommentId <= 0) {
      return res.status(400).json({ message: "Invalid parent comment id." });
    }

    const parentComment = await getCommentReferenceById(parentCommentId);
    if (!parentComment || parentComment.post_id !== postId) {
      return res.status(400).json({
        message: "Reply target does not exist on this post.",
      });
    }
  }

  const comment = await createComment(
    req.session.userId,
    postId,
    content,
    parentCommentId,
  );

  if (parentCommentId === null) {
    await createNotification({
      recipientUserId: post.user_id,
      actorUserId: req.session.userId,
      type: "post_comment",
      postId,
      commentId: comment.id,
    });
  } else {
    const parentComment = await getCommentReferenceById(parentCommentId);
    const parentCommentOwnerId = parentComment?.user_id ?? null;

    if (parentComment && parentCommentOwnerId !== null) {
      await createNotification({
        recipientUserId: parentCommentOwnerId,
        actorUserId: req.session.userId,
        type: "comment_reply",
        postId,
        commentId: comment.id,
      });
    }

    if (
      post.user_id !== req.session.userId &&
      post.user_id !== parentCommentOwnerId
    ) {
      await createNotification({
        recipientUserId: post.user_id,
        actorUserId: req.session.userId,
        type: "post_reply",
        postId,
        commentId: comment.id,
      });
    }
  }

  return res.status(201).json({
    comment: {
      ...mapComment(comment),
      replies: [],
    },
  });
}

async function handleCommentVote(
  req: Request,
  res: Response,
  vote: 1 | -1,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: "Invalid post id." });
  }

  const commentId = Number(req.params.commentId);
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return res.status(400).json({ message: "Invalid comment id." });
  }

  const post = await getPostById(postId, req.session.userId);
  if (!post) {
    return res.status(404).json({ message: "Post not found." });
  }

  const commentReference = await getCommentReferenceById(commentId);
  if (!commentReference || commentReference.post_id !== postId) {
    return res.status(404).json({ message: "Comment not found." });
  }

  if (commentReference.deleted_at !== null) {
    return res
      .status(400)
      .json({ message: "Cannot vote on a deleted comment." });
  }

  const updatedComment = await voteOnComment(
    req.session.userId,
    commentId,
    vote,
  );
  if (!updatedComment) {
    return res.status(404).json({ message: "Comment not found." });
  }

  if (vote === 1 && updatedComment.user_vote === 1) {
    await createNotification({
      recipientUserId: updatedComment.user_id,
      actorUserId: req.session.userId,
      type: "comment_like",
      postId,
      commentId,
    });
  }

  return res.status(200).json({
    comment: {
      ...mapComment(updatedComment),
      replies: [],
    },
  });
}

export async function likeComment(
  req: Request,
  res: Response,
): Promise<Response> {
  return handleCommentVote(req, res, 1);
}

export async function dislikeComment(
  req: Request,
  res: Response,
): Promise<Response> {
  return handleCommentVote(req, res, -1);
}

export async function removeComment(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: "Invalid post id." });
  }

  const commentId = Number(req.params.commentId);
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return res.status(400).json({ message: "Invalid comment id." });
  }

  const post = await getPostById(postId, req.session.userId);
  if (!post) {
    return res.status(404).json({ message: "Post not found." });
  }

  const commentReference = await getCommentReferenceById(commentId);
  if (!commentReference || commentReference.post_id !== postId) {
    return res.status(404).json({ message: "Comment not found." });
  }

  if (commentReference.user_id !== req.session.userId) {
    return res
      .status(403)
      .json({ message: "You can only delete your own comments." });
  }

  const deletedComment = await deleteCommentByOwner(
    commentId,
    req.session.userId,
  );
  if (!deletedComment) {
    return res.status(404).json({ message: "Comment not found." });
  }

  return res.status(200).json({
    message: "Comment deleted.",
    comment: {
      ...mapComment(deletedComment),
      replies: [],
    },
  });
}

export async function save(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: "Invalid post id." });
  }

  const post = await getPostById(postId, req.session.userId);
  if (!post) {
    return res.status(404).json({ message: "Post not found." });
  }

  await savePost(req.session.userId, postId);
  return res.status(200).json({ message: "Post saved.", saved: true });
}

export async function unsave(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: "Invalid post id." });
  }

  const post = await getPostById(postId, req.session.userId);
  if (!post) {
    return res.status(404).json({ message: "Post not found." });
  }

  await unsavePost(req.session.userId, postId);
  return res.status(200).json({ message: "Post unsaved.", saved: false });
}
