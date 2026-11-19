import { createQueue, mutateQueue } from "@/lib/queue";
import { database } from "@/lib/db";
import { clientKey, rateLimit, setSession, SESSION_COOKIE } from "@/lib/auth";
import { assertSameOrigin, failure, json, readBody } from "@/lib/http";
import { hash, verifyPassword } from "@/lib/crypto";
import { AppError } from "@/lib/domain";
import { cookies } from "next/headers";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readBody(request);
    await rateLimit(`login:${clientKey(request)}`, 12, 900000);
    const db = await database();
    if (body.mode === "demo") {
      if (process.env.QW_ENABLE_TEST_FIXTURES !== "1" || process.env.VERCEL)
        throw new AppError("Staff sign-in is required.", 400);
      await db.batch(
        [
          {
            sql: "DELETE FROM queues WHERE demo=1 AND expires_at<?",
            args: [Date.now()],
          },
          {
            sql: "DELETE FROM sessions WHERE expires_at<?",
            args: [Date.now()],
          },
          {
            sql: "DELETE FROM rate_limits WHERE reset_at<?",
            args: [Date.now()],
          },
        ],
        "write",
      );
      const count = (
        await db.execute("SELECT count(*) AS total FROM queues WHERE demo=1")
      ).rows[0];
      if (Number(count.total) >= 200)
        throw new AppError(
          "The demo is busy right now. Please try again later.",
          429,
        );
      const id = await createQueue(db, true);
      for (let i = 0; i < 5; i++)
        await mutateQueue(db, id, {
          action: "issue",
          key: crypto.randomUUID(),
        });
      await mutateQueue(db, id, {
        action: "call",
        key: crypto.randomUUID(),
        version: 5,
      });
      await setSession(id);
    } else {
      if (!process.env.STAFF_PASSWORD_HASH)
        throw new AppError(
          "Staff sign-in is not configured. Contact the person who manages this queue.",
          503,
        );
      if (
        typeof body.password !== "string" ||
        body.password.length > 200 ||
        !verifyPassword(body.password, process.env.STAFF_PASSWORD_HASH)
      )
        throw new AppError(
          "That password doesn’t match. Please try again.",
          401,
        );
      const id = await createQueue(db, false, "owner");
      await setSession(id);
    }
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (token)
      await (
        await database()
      ).execute({
        sql: "DELETE FROM sessions WHERE token_hash=?",
        args: [hash(token)],
      });
    jar.delete(SESSION_COOKIE);
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
