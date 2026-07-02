import type { Request, Response } from "express";
import { createNotification } from "../models/notificationsModel.js";
import {
  createHive,
  getHiveById,
  getHivesByOwnerId,
  isUserJoinedHive,
  joinHive,
  mapHive,
} from "../models/hivesModel";

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
  };

  const trimmedName = name?.trim();
  const trimmedDescription = description?.trim();

  if (!trimmedName || !trimmedDescription) {
    return res
      .status(400)
      .json({ message: "Hive name and description are required." });
  }

  const normalizedTags = normalizeTags(tags);
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

export async function getById(req: Request, res: Response): Promise<Response> {
  const hiveId = Number(req.params.id);
  if (!Number.isInteger(hiveId) || hiveId <= 0) {
    return res.status(400).json({ message: "Invalid hive id." });
  }

  const hive = await getHiveById(hiveId);
  if (!hive) {
    return res.status(404).json({ message: "Hive not found." });
  }

  if (!req.session.userId) {
    return res.json({ hive: mapHive(hive), joined: false });
  }

  const joined =
    hive.owner_user_id === req.session.userId
      ? true
      : await isUserJoinedHive(req.session.userId, hiveId);

  return res.json({ hive: mapHive(hive), joined });
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
    return res.status(200).json({ message: "Joined hive.", joined: true });
  }

  await joinHive(req.session.userId, hiveId);

  await createNotification({
    recipientUserId: hive.owner_user_id,
    actorUserId: req.session.userId,
    type: "hive_follow",
    hiveId,
  });

  return res.status(200).json({ message: "Joined hive.", joined: true });
}
