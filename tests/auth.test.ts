import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/crypto";
import { assertSameOrigin } from "../src/lib/http";
describe("staff boundary", () => {
  it("verifies passwords without accepting wrong or malformed values", () => {
    const encoded = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", encoded)).toBe(true);
    expect(verifyPassword("wrong", encoded)).toBe(false);
    expect(verifyPassword("wrong", "not-a-hash")).toBe(false);
  });
  it("rejects missing and cross-origin mutation requests", () => {
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/login", {
          headers: { origin: "https://attacker.test" },
        }),
      ),
    ).toThrow();
    expect(() =>
      assertSameOrigin(new Request("http://localhost:3000/api/login")),
    ).toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/login", {
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/login", {
          headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
        }),
      ),
    ).not.toThrow();
  });
});
