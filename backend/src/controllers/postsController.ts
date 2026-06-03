import type { Request, Response } from "express";
import {
  createPost,
  getExplorePosts,
  getHomePosts,
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

  const { title, content, community } = req.body as {
    title?: string;
    content?: string;
    community?: string;
  };

  if (!title || !content) {
    return res.status(400).json({ message: "Title and content are required." });
  }

  const post = await createPost(
    req.session.userId,
    title,
    content,
    community || "general",
  );

  return res.status(201).json({ post: mapPost(post) });
}
