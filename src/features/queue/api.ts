import type { NextRequest } from "next/server";
import type { z } from "zod";
import { identityForSession } from "@/features/auth/session";
import { sessionCookie } from "@/lib/auth";
import { assertSameOrigin, failure, HttpError, readJson } from "@/lib/http";

export function route<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
) {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      return failure(error);
    }
  };
}

export async function requireIdentity(request: NextRequest, ownerOnly = false) {
  const identity = await identityForSession(
    request.cookies.get(sessionCookie)?.value,
  );
  if (!identity) throw new HttpError("Sign in to access this workspace.", 401);
  if (ownerOnly && identity.user.role !== "OWNER")
    throw new HttpError("Owner access is required.", 403);
  if (request.method !== "GET") assertSameOrigin(request);
  return identity.user;
}

export function parse<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new HttpError("Check the request fields and try again.", 400);
  return result.data;
}

export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
) {
  return parse(schema, await readJson(request));
}
