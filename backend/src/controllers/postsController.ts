import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import { getHiveById } from "../models/hivesModel";
import {
  createHivePost,
  deletePostByOwner,
  getHivePosts,
  getExplorePosts,
  getHomePosts,
  getPostById,
  mapPost,
} from "../models/postsModel";

export async function explore(_req: Request, res: Response): Promise<Response> {
  const posts = await getExplorePosts();
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

export async function hivePosts(req: Request, res: Response): Promise<Response> {
  const hiveId = Number(req.params.id);
  if (!Number.isInteger(hiveId) || hiveId <= 0) {
    return res.status(400).json({ message: "Invalid hive id." });
  }

  const hive = await getHiveById(hiveId);
  if (!hive) {
    return res.status(404).json({ message: "Hive not found." });
  }

  const posts = await getHivePosts(hiveId);
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
    return res.status(403).json({ message: "You can only delete your own posts." });
  }

  const deletedPost = await deletePostByOwner(postId, req.session.userId);
  if (!deletedPost) {
    return res.status(404).json({ message: "Post not found." });
  }

  if (deletedPost.image_url) {
    const absoluteImagePath = path.resolve(process.cwd(), deletedPost.image_url.replace(/^\//, ""));
    fs.promises.unlink(absoluteImagePath).catch(() => undefined);
  }

  return res.status(200).json({ message: "Post deleted." });
}
