import "dotenv/config";
import { Pool, type QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;
const pgHost = process.env.PGHOST;
const pgPortRaw = process.env.PGPORT;
const pgDatabase = process.env.PGDATABASE;
const pgUser = process.env.PGUSER;
const pgPassword = process.env.PGPASSWORD;
const pgSsl = process.env.PGSSL === "true";
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

const pgPort = pgPortRaw ? Number(pgPortRaw) : 5432;
const shouldDisableSslForLocal =
  (connectionString &&
    (connectionString.includes("@localhost:") ||
      connectionString.includes("@127.0.0.1:") ||
      connectionString.includes("@::1:"))) ||
  (pgHost ? localHosts.has(pgHost) : false);

if (!connectionString && (!pgHost || !pgDatabase || !pgUser || !pgPassword)) {
  throw new Error(
    "Set DATABASE_URL or all PG env vars (PGHOST, PGDATABASE, PGUSER, PGPASSWORD).",
  );
}

if (!Number.isFinite(pgPort) || pgPort <= 0) {
  throw new Error("PGPORT must be a positive number.");
}

export const pool = new Pool({
  ...(connectionString
    ? { connectionString, ssl: shouldDisableSslForLocal ? false : pgSsl }
    : {
        host: pgHost,
        port: pgPort,
        database: pgDatabase,
        user: pgUser,
        password: pgPassword,
        ssl: shouldDisableSslForLocal ? false : pgSsl,
      }),
});

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}
