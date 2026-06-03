import { Router } from "express";
import type { Request, Response } from "express";
import { query } from "../db/index";

interface UserRow {
  id: number;
  username: string;
  email: string;
  display_name: string;
  bio: string;
  created_at: string;
}

interface UserPostRow {
  id: number;
  title: string;
  content: string;
  community: string;
  created_at: string;
}

const profileRouter = Router();

profileRouter.get("/me", async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const users = await query<UserRow>(
    "SELECT id, username, email, display_name, bio, created_at FROM users WHERE id = $1 LIMIT 1",
    [req.session.userId],
  );

  if (users.length === 0) {
    return res.status(404).json({ message: "User not found." });
  }

  const posts = await query<UserPostRow>(
    `SELECT id, title, content, community, created_at
     FROM posts
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.session.userId],
  );

  const user = users[0];
  return res.status(200).json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      bio: user.bio,
      createdAt: user.created_at,
    },
    posts,
  });
});

profileRouter.patch("/settings", async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const { displayName, bio } = req.body as {
    displayName?: string;
    bio?: string;
  };

  const rows = await query<UserRow>(
    `UPDATE users
     SET display_name = COALESCE($2, display_name),
         bio = COALESCE($3, bio),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, username, email, display_name, bio, created_at`,
    [req.session.userId, displayName, bio],
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: "User not found." });
  }

  const user = rows[0];
  return res.status(200).json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      bio: user.bio,
      createdAt: user.created_at,
    },
  });
});

export default profileRouter;
