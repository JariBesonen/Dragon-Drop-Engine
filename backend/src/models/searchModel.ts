import { query } from "../db";
import type { HiveRow } from "./hivesModel";

export async function getSearchSuggestions(term: string): Promise<string[]> {
  const rows = await query<{ suggestion: string }>(
    `WITH matches AS (
       SELECT DISTINCT title AS suggestion, created_at
       FROM posts
       WHERE title ILIKE $1 OR community ILIKE $1
       UNION
       SELECT DISTINCT name AS suggestion, created_at
       FROM hives
       WHERE name ILIKE $1 OR description ILIKE $1 OR array_to_string(tags, ' ') ILIKE $1
     )
     SELECT suggestion
     FROM matches
     ORDER BY created_at DESC
     LIMIT 5`,
    [term],
  );

  return rows.map((row) => row.suggestion);
}

export async function getSearchHives(term: string): Promise<HiveRow[]> {
  return query<HiveRow>(
    `SELECT *
     FROM hives
     WHERE name ILIKE $1
        OR description ILIKE $1
        OR array_to_string(tags, ' ') ILIKE $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [term],
  );
}
