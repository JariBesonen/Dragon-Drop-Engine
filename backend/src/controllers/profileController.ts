import type { Request, Response } from "express";
import { findUserByUsername } from "../models/authModel";
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
  theme_preference: "light" | "dark";
  created_at: string;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    bio: user.bio,
    themePreference: user.theme_preference,
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

  const { username, displayName, bio, themePreference } = req.body as {
    username?: string;
    displayName?: string;
    bio?: string;
    themePreference?: "light" | "dark";
  };

  const currentUser = await getProfileUserById(req.session.userId);
  if (!currentUser) {
    return res.status(404).json({ message: "User not found." });
  }

  const trimmedUsername = username?.trim();
  const trimmedDisplayName = displayName?.trim();
  const trimmedBio = bio?.trim();

  if (trimmedUsername) {
    if (!/^[a-zA-Z0-9_]{3,40}$/.test(trimmedUsername)) {
      return res.status(400).json({
        message:
          "Username must be 3-40 characters and contain only letters, numbers, or underscores.",
      });
    }

    if (trimmedUsername.toLowerCase() !== currentUser.username.toLowerCase()) {
      const existingUser = await findUserByUsername(trimmedUsername);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists." });
      }
    }
  }

  if (
    themePreference &&
    themePreference !== "light" &&
    themePreference !== "dark"
  ) {
    return res
      .status(400)
      .json({ message: "Theme preference must be light or dark." });
  }

  const user = await updateProfileSettings(
    req.session.userId,
    trimmedUsername,
    trimmedDisplayName,
    trimmedBio,
    themePreference,
  );
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.status(200).json({ user: mapProfileUser(user) });
}
