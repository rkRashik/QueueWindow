import { NextResponse } from "next/server";

import { AppError } from "./app-error";
export { AppError as HttpError } from "./app-error";

const loopbackHost = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i;

export function assertSameOrigin(request: Request) {
  const appUrl = process.env.APP_URL;
  const expected = new URL(appUrl || request.url);
  const host = request.headers.get("host");
  // Next can normalize local request URLs to localhost. Use the loopback
  // authority the browser actually contacted when APP_URL is unset.
  const loopbackOrigin =
    !appUrl &&
    host &&
    loopbackHost.test(expected.host) &&
    loopbackHost.test(host)
      ? URL.parse(`${expected.protocol}//${host}`)?.origin
      : undefined;
  if (request.headers.get("origin") !== (loopbackOrigin ?? expected.origin)) {
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
