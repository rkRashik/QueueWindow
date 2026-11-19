import { AppError } from "./domain";
export function assertSameOrigin(request: Request) {
  const url = new URL(request.url);
  const expected = process.env.APP_URL
    ? new URL(process.env.APP_URL).origin
    : `${url.protocol}//${request.headers.get("host") || url.host}`;
  if (request.headers.get("origin") !== expected)
    throw new AppError(
      "This request could not be verified. Reload the page and try again.",
      403,
    );
}
export async function readBody(request: Request) {
  const text = await request.text();
  if (text.length > 4096) throw new AppError("The request is too large.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("The request could not be read.");
  }
}
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
export function failure(error: unknown) {
  if (error instanceof AppError)
    return json({ error: error.message }, error.status);
  const requestId = crypto.randomUUID();
  console.error(
    "QueueWindow request failed",
    requestId,
    error instanceof Error ? error.name : "UnknownError",
  );
  return json(
    { error: "We couldn’t reach the queue. Please try again.", requestId },
    503,
  );
}
