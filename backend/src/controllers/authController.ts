import type { Request, Response } from "express";
import {
  createUser,
  findUserById,
  findUserByIdentity,
  findUserByUsernameOrEmail,
  sanitizeUser,
} from "../models/authModel";
import { hashPassword, verifyPassword } from "../utils/password";

export async function register(req: Request, res: Response): Promise<Response> {
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

  const existingUser = await findUserByUsernameOrEmail(username, email);
  if (existingUser) {
    return res
      .status(409)
      .json({ message: "Username or email already exists." });
  }

  const passwordHash = hashPassword(password);
  const user = await createUser(username, email, passwordHash);
  req.session.userId = user.id;

  return res.status(201).json({ user: sanitizeUser(user) });
}

export async function login(req: Request, res: Response): Promise<Response> {
  const { identity, password } = req.body as {
    identity?: string;
    password?: string;
  };

  if (!identity || !password) {
    return res
      .status(400)
      .json({ message: "Identity and password are required." });
  }

  const user = await findUserByIdentity(identity);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  req.session.userId = user.id;
  return res.status(200).json({ user: sanitizeUser(user) });
}

export function logout(req: Request, res: Response): void {
  req.session.destroy((error: Error | null) => {
    if (error) {
      res.status(500).json({ message: "Unable to logout." });
      return;
    }

    res.clearCookie("connect.sid");
    res.status(200).json({ message: "Logged out." });
  });
}

export async function me(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const user = await findUserById(req.session.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.status(200).json({ user: sanitizeUser(user) });
}
