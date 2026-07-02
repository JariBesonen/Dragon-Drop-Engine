import type { Request, Response } from "express";
import { findUserByUsername } from "../models/authModel";
import { mapPost } from "../models/postsModel";
import {
  followUser,
  getFollowerCountByUserId,
  getOwnedHivesByUserId,
  getProfileTopLevelCommentsByUserId,
  getProfilePostsByUserId,
  getProfileUserById,
  getProfileUserByUsername,
  isFollowingUser,
  unfollowUser,
  updateProfileSettings,
} from "../models/profileModel";

function mapProfileUser(user: {
  id: number;
  username: string;
  email: string;
  display_name: string;
  bio: string;
  theme_preference: "light" | "dark";
  notifications_enabled: boolean;
  notify_post_likes: boolean;
  notify_post_comments: boolean;
  notify_replies: boolean;
  notify_comment_likes: boolean;
  notify_hive_follows: boolean;
  created_at: string;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    bio: user.bio,
    themePreference: user.theme_preference,
    notificationPreferences: {
      all: user.notifications_enabled,
      postLikes: user.notify_post_likes,
      postComments: user.notify_post_comments,
      replies: user.notify_replies,
      commentLikes: user.notify_comment_likes,
      hiveFollows: user.notify_hive_follows,
    },
    createdAt: user.created_at,
  };
}

function resolveUsernameParam(
  usernameParam: string | string[] | undefined,
): string {
  return Array.isArray(usernameParam)
    ? (usernameParam[0] || "").trim()
    : (usernameParam || "").trim();
}

function mapProfileComment(comment: {
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
  post_title: string;
  post_community: string;
}) {
  return {
    id: comment.id,
    postId: comment.post_id,
    userId: comment.user_id,
    parentCommentId: comment.parent_comment_id,
    content: comment.content,
    isDeleted: comment.deleted_at !== null,
    createdAt: comment.created_at,
    authorUsername: comment.username,
    authorDisplayName: comment.display_name,
    likeCount: Number(comment.like_count) || 0,
    dislikeCount: Number(comment.dislike_count) || 0,
    userVote: comment.user_vote === null ? null : Number(comment.user_vote),
    postTitle: comment.post_title,
    postCommunity: comment.post_community,
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

  const posts = await getProfilePostsByUserId(
    req.session.userId,
    req.session.userId,
  );
  return res.status(200).json({
    user: mapProfileUser(user),
    posts: posts.map(mapPost),
  });
}

export async function byUsername(
  req: Request,
  res: Response,
): Promise<Response> {
  const username = resolveUsernameParam(req.params.username);
  if (!username) {
    return res.status(400).json({ message: "Username is required." });
  }

  const user = await getProfileUserByUsername(username);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const [posts, comments, followerCount, ownedHives] = await Promise.all([
    getProfilePostsByUserId(user.id, req.session.userId),
    getProfileTopLevelCommentsByUserId(user.id, req.session.userId),
    getFollowerCountByUserId(user.id),
    getOwnedHivesByUserId(user.id),
  ]);

  const isFollowing =
    !!req.session.userId && req.session.userId !== user.id
      ? await isFollowingUser(req.session.userId, user.id)
      : false;

  return res.status(200).json({
    user: mapProfileUser(user),
    posts: posts.map(mapPost),
    comments: comments.map(mapProfileComment),
    followerCount,
    isFollowing,
    ownedHives,
  });
}

export async function follow(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const username = resolveUsernameParam(req.params.username);
  if (!username) {
    return res.status(400).json({ message: "Username is required." });
  }

  const targetUser = await getProfileUserByUsername(username);
  if (!targetUser) {
    return res.status(404).json({ message: "User not found." });
  }

  if (targetUser.id === req.session.userId) {
    return res.status(400).json({ message: "You cannot follow yourself." });
  }

  await followUser(req.session.userId, targetUser.id);
  const followerCount = await getFollowerCountByUserId(targetUser.id);

  return res.status(200).json({
    message: "Followed user.",
    followerCount,
    isFollowing: true,
  });
}

export async function unfollow(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const username = resolveUsernameParam(req.params.username);
  if (!username) {
    return res.status(400).json({ message: "Username is required." });
  }

  const targetUser = await getProfileUserByUsername(username);
  if (!targetUser) {
    return res.status(404).json({ message: "User not found." });
  }

  if (targetUser.id === req.session.userId) {
    return res.status(400).json({ message: "You cannot unfollow yourself." });
  }

  await unfollowUser(req.session.userId, targetUser.id);
  const followerCount = await getFollowerCountByUserId(targetUser.id);

  return res.status(200).json({
    message: "Unfollowed user.",
    followerCount,
    isFollowing: false,
  });
}

export async function settings(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const { username, displayName, bio, themePreference } = req.body as {
    notificationPreferences?: {
      all?: boolean;
      postLikes?: boolean;
      postComments?: boolean;
      replies?: boolean;
      commentLikes?: boolean;
      hiveFollows?: boolean;
    };
    username?: string;
    displayName?: string;
    bio?: string;
    themePreference?: "light" | "dark";
  };
  const { notificationPreferences } = req.body as {
    notificationPreferences?: {
      all?: boolean;
      postLikes?: boolean;
      postComments?: boolean;
      replies?: boolean;
      commentLikes?: boolean;
      hiveFollows?: boolean;
    };
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

  if (notificationPreferences) {
    const preferenceValues = Object.values(notificationPreferences).filter(
      (value) => value !== undefined,
    );
    const hasInvalidPreference = preferenceValues.some(
      (value) => typeof value !== "boolean",
    );

    if (hasInvalidPreference) {
      return res.status(400).json({
        message: "Notification preferences must be boolean values.",
      });
    }
  }

  const user = await updateProfileSettings(
    req.session.userId,
    trimmedUsername,
    trimmedDisplayName,
    trimmedBio,
    themePreference,
    notificationPreferences,
  );
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.status(200).json({ user: mapProfileUser(user) });
}
