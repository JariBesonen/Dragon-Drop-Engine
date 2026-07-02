import type { Request, Response } from "express";
import { mapHive } from "../models/hivesModel";
import { getSearchHives, getSearchSuggestions } from "../models/searchModel";

export async function search(req: Request, res: Response): Promise<Response> {
  const rawQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (!rawQuery) {
    return res.status(200).json({ searches: [], hives: [] });
  }

  const term = `%${rawQuery}%`;
  const [searches, hives] = await Promise.all([
    getSearchSuggestions(term, req.session.userId),
    getSearchHives(term),
  ]);

  return res.status(200).json({
    searches,
    hives: hives.map(mapHive),
  });
}
