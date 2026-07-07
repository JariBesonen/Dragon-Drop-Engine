import type { Request, Response } from "express";
import { mapHive } from "../models/hivesModel";
import {
  getSearchHives,
  getSearchSuggestions,
  getSearchUsers,
} from "../models/searchModel";

export async function search(req: Request, res: Response): Promise<Response> {
  const rawQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (!rawQuery) {
    return res.status(200).json({ searches: [], hives: [], users: [] });
  }

  const term = `%${rawQuery}%`;
  const [searches, hives, users] = await Promise.all([
    getSearchSuggestions(term, req.session.userId),
    getSearchHives(term),
    getSearchUsers(term),
  ]);

  return res.status(200).json({
    searches,
    hives: hives.map(mapHive),
    users: users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
    })),
  });
}
