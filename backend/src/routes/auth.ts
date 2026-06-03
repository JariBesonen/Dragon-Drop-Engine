import { Router } from "express";
import type { Request, Response } from "express";
import { query } from "../db/index";
import { hashPassword, verifyPassword } from "../utils/password";

interface UserRow {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  display_name: string;
  bio: string;
  created_at: string;
}

const authRouter = Router();

function sanitizeUser(user: UserRow) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    bio: user.bio,
    createdAt: user.created_at,
  };
}

authRouter.post("/register", async (req: Request, res: Response) => {
  const { username, email, password } = req.body as {
    username?: string;
    email?: string;
    password?: string;
  };

  if (!username || !email || !password || password.length < 6) {
    return res
      .status(400)
      .json({ message: "Username, email, and password are required." });
  }

  const existing = await query<UserRow>(
    "SELECT * FROM users WHERE username = $1 OR email = $2 LIMIT 1",
    [username, email],
  );

  if (existing.length > 0) {
    return res
      .status(409)
      .json({ message: "Username or email already exists." });
  }

  const passwordHash = hashPassword(password);
  const rows = await query<UserRow>(
    `INSERT INTO users (username, email, password_hash, display_name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [username, email, passwordHash, username],
  );

  const user = rows[0];
  req.session.userId = user.id;

  return res.status(201).json({ user: sanitizeUser(user) });
});

authRouter.post("/login", async (req: Request, res: Response) => {
  const { identity, password } = req.body as {
    identity?: string;
    password?: string;
  };

  if (!identity || !password) {
    return res
      .status(400)
      .json({ message: "Identity and password are required." });
  }

  const rows = await query<UserRow>(
    "SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1",
    [identity],
  );

  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  req.session.userId = user.id;
  return res.status(200).json({ user: sanitizeUser(user) });
});

authRouter.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((error: Error | null) => {
    if (error) {
      return res.status(500).json({ message: "Unable to logout." });
    }

    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "Logged out." });
  });
});

authRouter.get("/me", async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const rows = await query<UserRow>(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [req.session.userId],
  );
  const user = rows[0];

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.status(200).json({ user: sanitizeUser(user) });
});

export default authRouter;
