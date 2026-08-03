import { query } from "../db";

export interface HiveRow {
  id: number;
  owner_user_id: number;
  owner_username?: string;
  name: string;
  description: string;
  banner_image: string | null;
  tags: string[];
  is_private: boolean;
  created_at: string;
}

export type HiveFollowRequestStatus = "pending" | "approved" | "denied";

export interface HiveFollowRequestRow {
  id: number;
  hive_id: number;
  requester_user_id: number;
  status: HiveFollowRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface HiveFollowRequestListRow {
  id: number;
  hive_id: number;
  requester_user_id: number;
  requester_username: string;
  requester_display_name: string;
  requester_avatar_url: string | null;
  created_at: string;
}

export function mapHive(hive: HiveRow) {
  return {
    id: hive.id,
    ownerUserId: hive.owner_user_id,
    ownerUsername: hive.owner_username,
    name: hive.name,
    description: hive.description,
    bannerImage: hive.banner_image,
    tags: hive.tags,
    isPrivate: hive.is_private,
    createdAt: hive.created_at,
  };
}

export async function createHive(
  ownerUserId: number,
  name: string,
  description: string,
  bannerImage: string | null,
  tags: string[],
  isPrivate: boolean,
): Promise<HiveRow> {
  const rows = await query<HiveRow>(
    `INSERT INTO hives (owner_user_id, name, description, banner_image, tags, is_private)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [ownerUserId, name, description, bannerImage, tags, isPrivate],
  );

  return rows[0];
}

export async function getHivesByOwnerId(
  ownerUserId: number,
): Promise<HiveRow[]> {
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
    `SELECT h.*, u.username as owner_username
     FROM hives h
     LEFT JOIN users u ON h.owner_user_id = u.id
     WHERE h.id = $1
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function deleteHiveByOwner(
  hiveId: number,
  ownerUserId: number,
): Promise<HiveRow | null> {
  const rows = await query<HiveRow>(
    `DELETE FROM hives
     WHERE id = $1 AND owner_user_id = $2
     RETURNING *`,
    [hiveId, ownerUserId],
  );

  return rows[0] ?? null;
}

export async function isUserJoinedHive(
  userId: number,
  hiveId: number,
): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM hive_memberships
       WHERE user_id = $1 AND hive_id = $2
     )`,
    [userId, hiveId],
  );

  return rows[0]?.exists ?? false;
}

export async function joinHive(userId: number, hiveId: number): Promise<void> {
  await query(
    `INSERT INTO hive_memberships (user_id, hive_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, hive_id) DO NOTHING`,
    [userId, hiveId],
  );
}

export async function unjoinHive(
  userId: number,
  hiveId: number,
): Promise<void> {
  await query(
    `DELETE FROM hive_memberships
     WHERE user_id = $1 AND hive_id = $2`,
    [userId, hiveId],
  );
}

export async function getJoinedHivesByUserId(
  userId: number,
): Promise<HiveRow[]> {
  return query<HiveRow>(
    `SELECT h.*
     FROM hives h
     JOIN hive_memberships hm ON hm.hive_id = h.id
     WHERE hm.user_id = $1
       AND h.owner_user_id != $1
     ORDER BY h.created_at DESC`,
    [userId],
  );
}

export async function updateHivePrivacyByOwner(
  hiveId: number,
  ownerUserId: number,
  isPrivate: boolean,
): Promise<HiveRow | null> {
  const rows = await query<HiveRow>(
    `UPDATE hives
     SET is_private = $3
     WHERE id = $1 AND owner_user_id = $2
     RETURNING *`,
    [hiveId, ownerUserId, isPrivate],
  );

  return rows[0] ?? null;
}

export async function getHiveFollowRequest(
  hiveId: number,
  requesterUserId: number,
): Promise<HiveFollowRequestRow | null> {
  const rows = await query<HiveFollowRequestRow>(
    `SELECT id, hive_id, requester_user_id, status, created_at, updated_at
     FROM hive_follow_requests
     WHERE hive_id = $1 AND requester_user_id = $2
     LIMIT 1`,
    [hiveId, requesterUserId],
  );

  return rows[0] ?? null;
}

export async function createOrReopenHiveFollowRequest(
  hiveId: number,
  requesterUserId: number,
): Promise<HiveFollowRequestRow> {
  const rows = await query<HiveFollowRequestRow>(
    `INSERT INTO hive_follow_requests (hive_id, requester_user_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (hive_id, requester_user_id)
     DO UPDATE
     SET status = 'pending',
         updated_at = NOW()
     RETURNING id, hive_id, requester_user_id, status, created_at, updated_at`,
    [hiveId, requesterUserId],
  );

  return rows[0];
}

export async function listPendingHiveFollowRequestsForOwner(
  hiveId: number,
  ownerUserId: number,
): Promise<HiveFollowRequestListRow[]> {
  return query<HiveFollowRequestListRow>(
    `SELECT hfr.id,
            hfr.hive_id,
            hfr.requester_user_id,
            u.username AS requester_username,
            u.display_name AS requester_display_name,
            u.avatar_url AS requester_avatar_url,
            hfr.created_at
     FROM hive_follow_requests hfr
     JOIN users u ON u.id = hfr.requester_user_id
     JOIN hives h ON h.id = hfr.hive_id
     WHERE hfr.hive_id = $1
       AND h.owner_user_id = $2
       AND hfr.status = 'pending'
     ORDER BY hfr.created_at DESC`,
    [hiveId, ownerUserId],
  );
}

export async function approveHiveFollowRequestById(
  requestId: number,
  ownerUserId: number,
): Promise<HiveFollowRequestRow | null> {
  const rows = await query<HiveFollowRequestRow>(
    `UPDATE hive_follow_requests hfr
     SET status = 'approved',
         updated_at = NOW()
     FROM hives h
     WHERE hfr.id = $1
       AND hfr.hive_id = h.id
       AND h.owner_user_id = $2
       AND hfr.status = 'pending'
     RETURNING hfr.id, hfr.hive_id, hfr.requester_user_id, hfr.status, hfr.created_at, hfr.updated_at`,
    [requestId, ownerUserId],
  );

  const request = rows[0] ?? null;
  if (!request) {
    return null;
  }

  await joinHive(request.requester_user_id, request.hive_id);
  return request;
}

export async function denyHiveFollowRequestById(
  requestId: number,
  ownerUserId: number,
): Promise<HiveFollowRequestRow | null> {
  const rows = await query<HiveFollowRequestRow>(
    `UPDATE hive_follow_requests hfr
     SET status = 'denied',
         updated_at = NOW()
     FROM hives h
     WHERE hfr.id = $1
       AND hfr.hive_id = h.id
       AND h.owner_user_id = $2
       AND hfr.status = 'pending'
     RETURNING hfr.id, hfr.hive_id, hfr.requester_user_id, hfr.status, hfr.created_at, hfr.updated_at`,
    [requestId, ownerUserId],
  );

  return rows[0] ?? null;
}
