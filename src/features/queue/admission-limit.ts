import { and, eq, lt, sql } from "drizzle-orm";
import type { QueueTransaction } from "@/db";
import { publicJoinLimits } from "@/db/schema";
import { AppError } from "@/lib/app-error";

export async function consumeAdmission(
  tx: QueueTransaction,
  orgId: string,
  clientHash: string,
) {
  const now = sql`statement_timestamp()`;
  const expired = sql`${publicJoinLimits.windowEndsAt} <= ${now}`;
  const windowEndsAt = sql`${now} + interval '60 seconds'`;

  await tx
    .delete(publicJoinLimits)
    .where(
      and(
        eq(publicJoinLimits.orgId, orgId),
        lt(publicJoinLimits.windowEndsAt, sql`${now} - interval '1 day'`),
      ),
    );

  const [bucket] = await tx
    .insert(publicJoinLimits)
    .values({ orgId, clientHash, windowEndsAt, hits: 1 })
    .onConflictDoUpdate({
      target: [publicJoinLimits.orgId, publicJoinLimits.clientHash],
      set: {
        hits: sql`case when ${expired} then 1 else ${publicJoinLimits.hits} + 1 end`,
        windowEndsAt: sql`case when ${expired} then ${windowEndsAt} else ${publicJoinLimits.windowEndsAt} end`,
      },
      setWhere: sql`${expired} or ${publicJoinLimits.hits} < 10`,
    })
    .returning({ hits: publicJoinLimits.hits });
  if (!bucket)
    throw new AppError("Too many ticket requests. Try again in a minute.", 429);
}
