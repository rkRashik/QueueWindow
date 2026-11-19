import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
export function secret() {
  const value = process.env.APP_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.VERCEL || process.env.NODE_ENV === "production")
    throw new Error("APP_SECRET must contain at least 32 characters.");
  return "queuewindow-local-development-only-secret";
}
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
export const ticketToken = (id: string) =>
  createHmac("sha256", secret()).update(`ticket:${id}`).digest("base64url");
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, encoded: string) {
  const [salt, stored] = encoded.split(":");
  if (!salt || !stored || stored.length !== 128) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(stored, "hex"));
}
