import { NextResponse } from "next/server";

import { AppError } from "./app-error";
export { AppError as HttpError } from "./app-error";

export function assertSameOrigin(request: Request) {
  const expected = new URL(process.env.APP_URL || request.url).origin;
  if (request.headers.get("origin") !== expected) {
    throw new AppError(
      "This request could not be verified. Reload and try again.",
      403,
    );
  }
}

export async function readJson(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    throw new AppError("Send the request as JSON.", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("The request could not be read.", 400);

  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      throw new AppError("The request is too large.", 413);
    }
    body += decoder.decode(value, { stream: true });
  }

  try {
    return JSON.parse(body + decoder.decode());
  } catch {
    throw new AppError("The request could not be read.", 400);
  }
}

export function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export function failure(error: unknown) {
  const requestId = crypto.randomUUID();
  if (error instanceof AppError) {
    const response = json({ error: error.message, requestId }, error.status);
    if (error.status === 429) response.headers.set("Retry-After", "60");
    return response;
  }
  console.error("QueueWindow request failed", requestId);
  return json(
    {
      error: "Access is temporarily unavailable. Please try again.",
      requestId,
    },
    503,
  );
}
