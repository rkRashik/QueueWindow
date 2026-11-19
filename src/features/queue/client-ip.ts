import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export function clientBucket(headers: Headers, orgId: string) {
  const header =
    process.env.VERCEL === "1"
      ? "x-vercel-forwarded-for"
      : process.env.TRUSTED_CLIENT_IP_HEADER;
  const candidate = header ? headers.get(header)?.trim() : undefined;
  const client =
    candidate && isIP(candidate) ? candidate.toLowerCase() : "unknown";
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32)
    throw new Error("JWT_SECRET must be at least 32 bytes.");

  return createHmac("sha256", secret)
    .update(JSON.stringify(["public-join", orgId, client]))
    .digest("hex");
}
