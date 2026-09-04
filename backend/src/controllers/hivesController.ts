import type { Request, Response } from "express";
import { createNotification } from "../models/notificationsModel.js";
import {
  approveHiveFollowRequestById,
  createOrReopenHiveFollowRequest,
  denyHiveFollowRequestById,
  createHive,
  deleteHiveByOwner,
  getHiveFollowerCount,
  getHiveFollowRequest,
  getHiveById,
  getHivesByOwnerId,
  getJoinedHivesByUserId,
  isUserJoinedHive,
  joinHive,
  unjoinHive,
  listPendingHiveFollowRequestsForOwner,
  mapHive,
  updateHivePrivacyByOwner,
} from "../models/hivesModel";

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return undefined;
}

function normalizeTags(rawTags: string[] | string | undefined): string[] {
  if (!rawTags) {
    return [];
  }

  const splitTags = Array.isArray(rawTags)
    ? rawTags
    : rawTags.split(",").map((tag) => tag.trim());

  const tags = splitTags
    .map((tag) => String(tag).trim().toLowerCase())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(tags)).slice(0, 5);
}

export async function create(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const { name, description, bannerImage, tags } = req.body as {
    name?: string;
    description?: string;
    bannerImage?: string;
    tags?: string[] | string;
    isPrivate?: boolean | string;
  };

  const trimmedName = name?.trim();
  const trimmedDescription = description?.trim();

  if (!trimmedName || !trimmedDescription) {
    return res
      .status(400)
      .json({ message: "Hive name and description are required." });
  }

  const normalizedTags = normalizeTags(tags);
  const parsedIsPrivate = parseOptionalBoolean(
    (req.body as { isPrivate?: unknown }).isPrivate,
  );

  if (
    (req.body as { isPrivate?: unknown }).isPrivate !== undefined &&
    parsedIsPrivate === undefined
  ) {
    return res
      .status(400)
      .json({ message: "isPrivate must be a boolean value." });
  }

  const uploadedBannerPath = req.file
    ? `/uploads/hives/${req.file.filename}`
    : null;
  const fallbackBanner =
    typeof bannerImage === "string" ? bannerImage.trim() : "";

  try {
    const hive = await createHive(
      req.session.userId,
      trimmedName,
      trimmedDescription,
      uploadedBannerPath || fallbackBanner || null,
      normalizedTags,
      parsedIsPrivate ?? false,
    );

    return res.status(201).json({ hive: mapHive(hive) });
  } catch (caughtError) {
    const dbError = caughtError as { code?: string };
    if (dbError.code === "23505") {
      return res.status(409).json({ message: "Hive name already exists." });
    }
    throw caughtError;
  }
}

export async function getMine(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const hives = await getHivesByOwnerId(req.session.userId);
  return res.json({ hives: hives.map(mapHive) });
}

export async function getJoined(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const hives = await getJoinedHivesByUserId(req.session.userId);
  return res.json({ hives: hives.map(mapHive) });
}

export async function getById(req: Request, res: Response): Promise<Response> {
  const hiveId = Number(req.params.id);
  if (!Number.isInteger(hiveId) || hiveId <= 0) {
    return res.status(400).json({ message: "Invalid hive id." });
  }

  const hive = await getHiveById(hiveId);
  if (!hive) {
    return res.status(404).json({ message: "Hive not found." });
  }

  const followerCount = await getHiveFollowerCount(hiveId);

  if (!req.session.userId) {
    return res.json({
      hive: mapHive(hive),
      joined: false,
      canViewPosts: hive.is_private ? false : true,
      requestStatus: "none",
      followerCount,
    });
  }

  const joined =
    hive.owner_user_id === req.session.userId
      ? true
      : await isUserJoinedHive(req.session.userId, hiveId);

  const followRequest =
    hive.owner_user_id === req.session.userId || joined
      ? null
      : await getHiveFollowRequest(hiveId, req.session.userId);

  const requestStatus = joined
    ? "accepted"
    : followRequest?.status === "pending"
      ? "pending"
      : "none";

  return res.json({
    hive: mapHive(hive),
    joined,
    canViewPosts: !hive.is_private || joined,
    requestStatus,
    followerCount,
  });
}

export async function remove(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const hiveId = Number(req.params.id);
  if (!Number.isInteger(hiveId) || hiveId <= 0) {
    return res.status(400).json({ message: "Invalid hive id." });
  }

  const hive = await getHiveById(hiveId);
  if (!hive) {
    return res.status(404).json({ message: "Hive not found." });
  }

  if (hive.owner_user_id !== req.session.userId) {
    return res
      .status(403)
      .json({ message: "You can only delete your own hive." });
  }

  const deletedHive = await deleteHiveByOwner(hiveId, req.session.userId);
  if (!deletedHive) {
    return res.status(404).json({ message: "Hive not found." });
  }

  return res.status(200).json({ message: "Hive deleted." });
}

export async function join(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const hiveId = Number(req.params.id);
  if (!Number.isInteger(hiveId) || hiveId <= 0) {
    return res.status(400).json({ message: "Invalid hive id." });
  }

  const hive = await getHiveById(hiveId);
  if (!hive) {
    return res.status(404).json({ message: "Hive not found." });
  }

  const alreadyJoined =
    hive.owner_user_id === req.session.userId
      ? true
      : await isUserJoinedHive(req.session.userId, hiveId);

  if (alreadyJoined) {
    return res.status(200).json({
      message: "Joined hive.",
      joined: true,
      requestStatus: "accepted",
    });
  }

  if (hive.is_private) {
    const request = await createOrReopenHiveFollowRequest(
      hiveId,
      req.session.userId,
    );

    return res.status(202).json({
      message: "Follow request sent.",
      joined: false,
      requestStatus: request.status,
    });
  }

  await joinHive(req.session.userId, hiveId);

  await createNotification({
    recipientUserId: hive.owner_user_id,
    actorUserId: req.session.userId,
    type: "hive_follow",
    hiveId,
  });

  return res.status(200).json({
    message: "Joined hive.",
    joined: true,
    requestStatus: "accepted",
  });
}

export async function unjoin(req: Request, res: Response): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const hiveId = Number(req.params.id);
  if (!Number.isInteger(hiveId) || hiveId <= 0) {
    return res.status(400).json({ message: "Invalid hive id." });
  }

  const hive = await getHiveById(hiveId);
  if (!hive) {
    return res.status(404).json({ message: "Hive not found." });
  }

  if (hive.owner_user_id === req.session.userId) {
    return res
      .status(403)
      .json({ message: "You cannot leave a hive you own." });
  }

  await unjoinHive(req.session.userId, hiveId);

  return res.status(200).json({ message: "Left hive.", joined: false });
}

export async function getFollowRequests(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const hiveId = Number(req.params.id);
  if (!Number.isInteger(hiveId) || hiveId <= 0) {
    return res.status(400).json({ message: "Invalid hive id." });
  }

  const requests = await listPendingHiveFollowRequestsForOwner(
    hiveId,
    req.session.userId,
  );

  return res.status(200).json({
    requests: requests.map((request) => ({
      id: request.id,
      hiveId: request.hive_id,
      requesterUserId: request.requester_user_id,
      requesterUsername: request.requester_username,
      requesterDisplayName: request.requester_display_name,
      requesterAvatarUrl: request.requester_avatar_url,
      createdAt: request.created_at,
    })),
  });
}

export async function approveFollowRequest(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const requestId = Number(req.params.requestId);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ message: "Invalid request id." });
  }

  const approved = await approveHiveFollowRequestById(
    requestId,
    req.session.userId,
  );
  if (!approved) {
    return res.status(404).json({ message: "Follow request not found." });
  }

  await createNotification({
    recipientUserId: approved.requester_user_id,
    actorUserId: req.session.userId,
    type: "hive_follow_accepted",
    hiveId: approved.hive_id,
  });

  return res.status(200).json({ message: "Follow request approved." });
}

export async function denyFollowRequest(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const requestId = Number(req.params.requestId);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ message: "Invalid request id." });
  }

  const denied = await denyHiveFollowRequestById(requestId, req.session.userId);
  if (!denied) {
    return res.status(404).json({ message: "Follow request not found." });
  }

  return res.status(200).json({ message: "Follow request denied." });
}

export async function updatePrivacy(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  const hiveId = Number(req.params.id);
  if (!Number.isInteger(hiveId) || hiveId <= 0) {
    return res.status(400).json({ message: "Invalid hive id." });
  }

  const parsedIsPrivate = parseOptionalBoolean(
    (req.body as { isPrivate?: unknown }).isPrivate,
  );

  if (parsedIsPrivate === undefined) {
    return res
      .status(400)
      .json({ message: "isPrivate must be a boolean value." });
  }

  const hive = await updateHivePrivacyByOwner(
    hiveId,
    req.session.userId,
    parsedIsPrivate,
  );

  if (!hive) {
    return res
      .status(404)
      .json({ message: "Hive not found or you are not the owner." });
  }

  return res.status(200).json({ hive: mapHive(hive) });
}
