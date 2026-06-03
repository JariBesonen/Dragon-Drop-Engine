import type { Request, Response } from "express";
import {
  getProfilePostsByUserId,
  getProfileUserById,
  updateProfileSettings,
} from "../models/profileModel";

function mapProfileUser(user: {
  id: number;
  username: string;
  email: string;
  display_name: string;
  bio: string;
  created_at: string;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    bio: user.bio,
    createdAt: user.created_at,
  };
}

export async function me(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const user = await getProfileUserById(req.session.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const posts = await getProfilePostsByUserId(req.session.userId);
  return res.status(200).json({
    user: mapProfileUser(user),
    posts,
  });
}

export async function settings(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const { displayName, bio } = req.body as {
    displayName?: string;
    bio?: string;
  };

  const user = await updateProfileSettings(
    req.session.userId,
    displayName,
    bio,
  );
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.status(200).json({ user: mapProfileUser(user) });
}
