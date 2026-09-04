export interface RecentlyViewedHive {
  id: number;
  name: string;
  viewedAt: string;
}

const STORAGE_KEY_PREFIX = "dde.recentlyViewedHives";
export const RECENTLY_VIEWED_HIVES_UPDATED_EVENT =
  "recentlyViewedHivesUpdated";

function getStorageKey(userId: number): string {
  return `${STORAGE_KEY_PREFIX}.${userId}`;
}

function isValidHiveRecord(value: unknown): value is RecentlyViewedHive {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    Number.isInteger(candidate.id) &&
    Number(candidate.id) > 0 &&
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.viewedAt === "string" &&
    candidate.viewedAt.length > 0
  );
}

function readRecentlyViewedFromStorage(userId: number): RecentlyViewedHive[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidHiveRecord);
  } catch {
    return [];
  }
}

function writeRecentlyViewedToStorage(
  userId: number,
  items: RecentlyViewedHive[],
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(items));
  window.dispatchEvent(
    new CustomEvent(RECENTLY_VIEWED_HIVES_UPDATED_EVENT, {
      detail: { userId },
    }),
  );
}

export function getRecentlyViewedHives(
  userId: number,
  maxItems = 5,
): RecentlyViewedHive[] {
  if (!Number.isInteger(userId) || userId <= 0 || maxItems <= 0) {
    return [];
  }

  return readRecentlyViewedFromStorage(userId).slice(0, maxItems);
}

export function addRecentlyViewedHive(
  userId: number,
  hive: { id: number; name: string },
  maxItems = 5,
): void {
  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    !Number.isInteger(hive.id) ||
    hive.id <= 0 ||
    typeof hive.name !== "string" ||
    hive.name.trim().length === 0 ||
    maxItems <= 0
  ) {
    return;
  }

  const existing = readRecentlyViewedFromStorage(userId);
  const next: RecentlyViewedHive = {
    id: hive.id,
    name: hive.name,
    viewedAt: new Date().toISOString(),
  };

  const deduped = existing.filter((item) => item.id !== next.id);
  const updated = [next, ...deduped].slice(0, maxItems);
  writeRecentlyViewedToStorage(userId, updated);
}
