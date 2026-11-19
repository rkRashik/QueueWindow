import { cookies } from "next/headers";
import { database, serializeWrite } from "./db";
import { hash, randomToken } from "./crypto";
import { AppError } from "./domain";
export const SESSION_COOKIE = "qw_session";
export async function staffQueue() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token)
    throw new AppError("Your session has ended. Please sign in again.", 401);
  const db = await database();
  const row = (
    await db.execute({
      sql: "SELECT queue_id FROM sessions WHERE token_hash=? AND expires_at>?",
      args: [hash(token), Date.now()],
    })
  ).rows[0];
  if (!row)
    throw new AppError("Your session has ended. Please sign in again.", 401);
  return String(row.queue_id);
}
export async function setSession(queueId: string) {
  const token = randomToken();
  const db = await database();
  const jar = await cookies();
  const previous = jar.get(SESSION_COOKIE)?.value;
  if (previous)
    await db.execute({
      sql: "DELETE FROM sessions WHERE token_hash=?",
      args: [hash(previous)],
    });
  await db.execute({
    sql: "INSERT INTO sessions(token_hash,queue_id,expires_at) VALUES(?,?,?)",
    args: [hash(token), queueId, Date.now() + 86400000],
  });
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  });
}
export async function rateLimit(key: string, limit: number, windowMs: number) {
  return serializeWrite(() => recordRateLimit(key, limit, windowMs));
}
async function recordRateLimit(key: string, limit: number, windowMs: number) {
  const db = await database();
  const now = Date.now();
  const row = (
    await db.execute({
      sql: `INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,
    reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING count`,
      args: [hash(key), now + windowMs, now, now],
    })
  ).rows[0];
  if (Number(row.count) > limit)
    throw new AppError(
      "Too many requests. Give it a moment and try again.",
      429,
    );
}
export function clientKey(request: Request) {
  // Vercel supplies its trusted client address header. Local use shares one bucket.
  return process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for") || "unknown"
    : "local";
}
