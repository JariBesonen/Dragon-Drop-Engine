import { query } from "../db";
import type { HiveRow } from "./hivesModel";

export async function getSearchSuggestions(
  term: string,
  viewerUserId?: number,
): Promise<string[]> {
  const rows =
    typeof viewerUserId === "number"
      ? await query<{ suggestion: string }>(
          `WITH matches AS (
             SELECT DISTINCT p.title AS suggestion, p.created_at
             FROM posts p
             LEFT JOIN hives h ON h.id = p.hive_id
             WHERE (p.title ILIKE $1 OR p.community ILIKE $1)
               AND (
                 h.id IS NULL
                 OR h.is_private = false
                 OR h.owner_user_id = $2
                 OR EXISTS (
                   SELECT 1
                   FROM hive_memberships hm
                   WHERE hm.hive_id = h.id
                     AND hm.user_id = $2
                 )
               )
             UNION
             SELECT DISTINCT h.name AS suggestion, h.created_at
             FROM hives h
             WHERE (h.name ILIKE $1
                 OR h.description ILIKE $1
                 OR array_to_string(h.tags, ' ') ILIKE $1)
           )
           SELECT suggestion
           FROM matches
           ORDER BY created_at DESC
           LIMIT 5`,
          [term, viewerUserId],
        )
      : await query<{ suggestion: string }>(
          `WITH matches AS (
             SELECT DISTINCT p.title AS suggestion, p.created_at
             FROM posts p
             LEFT JOIN hives h ON h.id = p.hive_id
             WHERE (p.title ILIKE $1 OR p.community ILIKE $1)
               AND (h.id IS NULL OR h.is_private = false)
             UNION
             SELECT DISTINCT h.name AS suggestion, h.created_at
             FROM hives h
             WHERE (h.name ILIKE $1
                 OR h.description ILIKE $1
                 OR array_to_string(h.tags, ' ') ILIKE $1)
           )
           SELECT suggestion
           FROM matches
           ORDER BY created_at DESC
           LIMIT 5`,
          [term],
        );

  return rows.map((row) => row.suggestion);
}

export async function getSearchHives(
  term: string,
): Promise<HiveRow[]> {
  return query<HiveRow>(
    `SELECT h.*
     FROM hives h
     WHERE (h.name ILIKE $1
         OR h.description ILIKE $1
         OR array_to_string(h.tags, ' ') ILIKE $1)
     ORDER BY h.created_at DESC
     LIMIT 5`,
    [term],
  );
}
