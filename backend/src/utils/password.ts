import crypto from "crypto";

const SALT_SIZE = 16;
const KEY_LENGTH = 64;

export function hashPassword(plainTextPassword: string): string {
  const salt = crypto.randomBytes(SALT_SIZE).toString("hex");
  const derived = crypto
    .scryptSync(plainTextPassword, salt, KEY_LENGTH)
    .toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(
  plainTextPassword: string,
  storedHash: string,
): boolean {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) {
    return false;
  }

  const derivedBuffer = crypto.scryptSync(plainTextPassword, salt, KEY_LENGTH);
  const keyBuffer = Buffer.from(key, "hex");

  if (derivedBuffer.length !== keyBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedBuffer, keyBuffer);
}
