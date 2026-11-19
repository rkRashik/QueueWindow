import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertSameOrigin } from "../src/lib/http";

function request(host: string, origin?: string) {
  return new Request("http://localhost:3000/api/auth/demo", {
    method: "POST",
    headers: { Host: host, ...(origin ? { Origin: origin } : {}) },
  });
}

beforeEach(() => vi.stubEnv("APP_URL", ""));
afterEach(() => vi.unstubAllEnvs());

describe("same-origin requests", () => {
  it.each(["127.0.0.1:3000", "localhost:3000"])(
    "uses the browser-facing loopback host %s when Next normalizes the URL",
    (host) => {
      expect(() =>
        assertSameOrigin(request(host, `http://${host}`)),
      ).not.toThrow();
    },
  );

  it.each([
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    "https://127.0.0.1:3000",
    "https://example.com",
    undefined,
  ])("rejects %s on the 127.0.0.1 origin", (origin) => {
    expect(() => assertSameOrigin(request("127.0.0.1:3000", origin))).toThrow();
  });

  it("does not use a non-loopback Host to override the request URL", () => {
    expect(() =>
      assertSameOrigin(request("example.com", "http://example.com")),
    ).toThrow();
  });

  it("keeps the configured public origin authoritative", () => {
    vi.stubEnv("APP_URL", "https://queue.example");
    expect(() =>
      assertSameOrigin(request("127.0.0.1:3000", "http://127.0.0.1:3000")),
    ).toThrow();
    expect(() =>
      assertSameOrigin(request("queue.example", "https://queue.example")),
    ).not.toThrow();
  });
});
