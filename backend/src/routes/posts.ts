import { Router } from "express";
import type { Request, Response } from "express";
import { query } from "../db/index";

interface PostRow {
  id: number;
  user_id: number;
  title: string;
  content: string;
  community: string;
  created_at: string;
  username: string;
  display_name: string;
}

const postsRouter = Router();

function mapPost(post: PostRow) {
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

postsRouter.get("/explore", async (_req: Request, res: Response) => {
  const rows = await query<PostRow>(
    `SELECT p.*, u.username, u.display_name
     FROM posts p
     JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at DESC
     LIMIT 60`,
  );

  return res.status(200).json({ posts: rows.map(mapPost) });
});

postsRouter.get("/home", async (req: Request, res: Response) => {
  if (!req.session.userId) {
    const rows = await query<PostRow>(
      `SELECT p.*, u.username, u.display_name
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT 60`,
    );
    return res.status(200).json({ posts: rows.map(mapPost) });
  }

  const rows = await query<PostRow>(
    `SELECT DISTINCT p.*, u.username, u.display_name
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN follows f ON f.followed_id = p.user_id AND f.follower_id = $1
     WHERE p.user_id = $1 OR f.follower_id = $1
     ORDER BY p.created_at DESC
     LIMIT 60`,
    [req.session.userId],
  );

  return res.status(200).json({ posts: rows.map(mapPost) });
});

postsRouter.post("/", async (req: Request, res: Response) => {
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

  const rows = await query<PostRow>(
    `INSERT INTO posts (user_id, title, content, community)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, title, content, community, created_at,
      ''::text as username,
      ''::text as display_name`,
    [req.session.userId, title, content, community || "general"],
  );

  return res.status(201).json({ post: mapPost(rows[0]) });
});

export default postsRouter;
