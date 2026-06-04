import { query } from "../db";

export interface HiveRow {
  id: number;
  owner_user_id: number;
  name: string;
  description: string;
  banner_image: string | null;
  tags: string[];
  created_at: string;
}

export function mapHive(hive: HiveRow) {
  return {
    id: hive.id,
    ownerUserId: hive.owner_user_id,
    name: hive.name,
    description: hive.description,
    bannerImage: hive.banner_image,
    tags: hive.tags,
    createdAt: hive.created_at,
  };
}

export async function createHive(
  ownerUserId: number,
  name: string,
  description: string,
  bannerImage: string | null,
  tags: string[],
): Promise<HiveRow> {
  const rows = await query<HiveRow>(
    `INSERT INTO hives (owner_user_id, name, description, banner_image, tags)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [ownerUserId, name, description, bannerImage, tags],
  );

  return rows[0];
}

export async function getHivesByOwnerId(ownerUserId: number): Promise<HiveRow[]> {
  return query<HiveRow>(
    `SELECT *
     FROM hives
     WHERE owner_user_id = $1
     ORDER BY created_at DESC`,
    [ownerUserId],
  );
}

export async function getHiveById(id: number): Promise<HiveRow | null> {
  const rows = await query<HiveRow>(
    `SELECT *
     FROM hives
     WHERE id = $1
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}
