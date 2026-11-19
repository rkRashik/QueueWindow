import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, count, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { Pool } from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Database } from "../src/db";
import { counters, organizations, tickets, users } from "../src/db/schema";
import {
  callNext,
  completeTicket,
  deskState,
  issueTicket,
  recallTicket,
  skipTicket,
  toggleCounterStatus,
} from "../src/lib/queue";
import { displaySnapshot, visitorTicket } from "../src/features/queue/public";
import { analytics } from "../src/features/queue/read-model";
import { signSession } from "../src/lib/auth";

const databaseUrl = process.env.QW_TEST_DATABASE_URL;
const schema = "qw_test_" + randomUUID().replaceAll("-", "");
let pool: Pool;
let control: Pool;
let db: Database;

vi.mock("@/db", () => ({ getDb: () => db }));

async function fixture() {
  const [organization] = await db
    .insert(organizations)
    .values({
      name: "Test organization",
      slug: randomUUID(),
      expiresAt: new Date(Date.now() + 86_400_000),
    })
    .returning();
  const [a, b] = await db
    .insert(counters)
    .values([
      { orgId: organization.id, name: "Counter A", prefix: "A" },
      { orgId: organization.id, name: "Counter B", prefix: "B" },
    ])
    .returning();
  return { organization, a, b };
}

async function session(
  orgId: string,
  orgSlug: string,
  role: "OWNER" | "STAFF",
  claimRole = role,
) {
  const username = "actor" + randomUUID().replaceAll("-", "");
  const [actor] = await db
    .insert(users)
    .values({
      orgId,
      fullName: "Test actor",
      username: username.slice(0, 24),
      passwordHash: "unused",
      role,
      email: role === "OWNER" ? `${username}@example.com` : null,
    })
    .returning();
  const token = await signSession({
    userId: actor.id,
    orgId,
    role: claimRole,
    orgSlug,
    username: actor.username,
  });
  return { actor, cookie: `qw_session=${token}` };
}

function request(path: string, method = "GET", cookie?: string, body?: object) {
  const origin = "http://localhost";
  const headers = new Headers({ Origin: origin });
  if (cookie) headers.set("Cookie", cookie);
  if (body) headers.set("Content-Type", "application/json");
  return new NextRequest(origin + path, {
    method,
    headers,
    body: body && JSON.stringify(body),
  });
}

describe.skipIf(!databaseUrl)("PostgreSQL queue and route integration", () => {
  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
      throw new Error("Use a loopback test database.");
    }
    control = new Pool({ connectionString: url.toString() });
    await control.query(`create schema "${schema}"`);
    pool = new Pool({
      connectionString: url.toString(),
      options: `-c search_path=${schema}`,
      max: 12,
    });
    db = drizzle({ client: pool });
    for (const name of ["0000_phase_1.sql", "0001_phase_2.sql"]) {
      const migration = await readFile(resolve("drizzle", name), "utf8");
      await pool.query(migration.replaceAll('"public".', `"${schema}".`));
    }
  });

  afterAll(async () => {
    await pool?.end();
    if (control) {
      try {
        await control.query(`drop schema if exists "${schema}" cascade`);
      } finally {
        await control.end();
      }
    }
  });

  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", "phase2-test-secret-with-at-least-32-bytes");
    vi.stubEnv("APP_URL", "http://localhost");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("serializes issuance per counter and makes concurrent retries return one ticket", async () => {
    const { organization, a, b } = await fixture();
    const issue = (counterId: string, key: string) =>
      issueTicket(db, organization.id, counterId, key, { source: "walkin" });
    const results = await Promise.all([
      ...Array.from({ length: 8 }, (_, i) => issue(a.id, `a-${i}`)),
      ...Array.from({ length: 8 }, (_, i) => issue(b.id, `b-${i}`)),
      ...Array.from({ length: 4 }, () => issue(a.id, "a-0")),
    ]);
    expect(new Set(results.slice(0, 8).map((ticket) => ticket.id)).size).toBe(
      8,
    );
    expect(
      results.slice(16).every((ticket) => ticket.id === results[0].id),
    ).toBe(true);
    const expected = Array.from({ length: 8 }, (_, i) => i + 1);
    expect(
      results
        .slice(0, 8)
        .map((ticket) => ticket.sequence)
        .sort((x, y) => x - y),
    ).toEqual(expected);
    expect(
      results
        .slice(8, 16)
        .map((ticket) => ticket.sequence)
        .sort((x, y) => x - y),
    ).toEqual(expected);
    expect(results[8].tokenNumber).toMatch(/^B-0[1-8]$/);
  });

  it("resets daily sequence, replays previous-day issuance, and blocks paused or expired counters", async () => {
    const { organization, a } = await fixture();
    const issue = (key: string) =>
      issueTicket(db, organization.id, a.id, key, { source: "walkin" });
    const prior = await issue("prior");
    await db
      .update(tickets)
      .set({ issuedAt: sql`statement_timestamp() - interval '1 day'` })
      .where(and(eq(tickets.orgId, organization.id), eq(tickets.id, prior.id)));
    const today = await issue("today");
    expect(today.tokenNumber).toBe("A-01");
    expect((await issue("prior")).id).toBe(prior.id);
    await toggleCounterStatus(db, organization.id, a.id);
    await expect(issue("paused")).rejects.toMatchObject({ status: 409 });
    await toggleCounterStatus(db, organization.id, a.id);
    await db
      .update(organizations)
      .set({ expiresAt: new Date(0) })
      .where(eq(organizations.id, organization.id));
    await expect(issue("expired")).rejects.toMatchObject({ status: 402 });
    expect((await issue("today")).id).toBe(today.id);
  });

  it("scopes counters, actions, and visitor tickets to their tenant", async () => {
    const first = await fixture();
    const second = await fixture();
    const foreign = await issueTicket(
      db,
      second.organization.id,
      second.a.id,
      "shared",
      { source: "walkin" },
    );
    for (const action of [
      () => deskState(db, first.organization.id, second.a.id),
      () => callNext(db, first.organization.id, second.a.id),
      () =>
        issueTicket(db, first.organization.id, second.a.id, "shared", {
          source: "walkin",
        }),
      () => completeTicket(db, first.organization.id, first.a.id, foreign.id),
      () => visitorTicket(db, first.organization.id, foreign.id),
    ]) {
      await expect(action()).rejects.toMatchObject({ status: 404 });
    }
    const own = await issueTicket(
      db,
      first.organization.id,
      first.a.id,
      "shared",
      { source: "walkin" },
    );
    expect(own.id).not.toBe(foreign.id);
    const publicState = await displaySnapshot(db, first.organization.slug);
    expect(publicState.counters.map((counter) => counter.id)).not.toContain(
      second.a.id,
    );
    expect(JSON.stringify(publicState)).not.toContain(own.id);
  });

  it("keeps a single called ticket through competing calls and records recall without resetting service time", async () => {
    const { organization, a } = await fixture();
    const id = organization.id;
    const first = await issueTicket(db, id, a.id, "first", {
      source: "walkin",
    });
    const second = await issueTicket(db, id, a.id, "second", {
      source: "walkin",
    });
    const third = await issueTicket(db, id, a.id, "third", {
      source: "walkin",
    });
    expect((await visitorTicket(db, id, third.id)).peopleAhead).toBe(2);
    await Promise.all([callNext(db, id, a.id), callNext(db, id, a.id)]);
    const state = await deskState(db, id, a.id);
    expect(state.calledTicket?.id).toBe(second.id);
    expect((await visitorTicket(db, id, first.id)).status).toBe("SERVED");
    expect((await visitorTicket(db, id, third.id)).peopleAhead).toBe(1);
    const previous = state.calledTicket!;
    const recalled = await recallTicket(db, id, a.id, second.id);
    expect(recalled.calledAt!.getTime()).toBeGreaterThan(
      previous.calledAt!.getTime(),
    );
    expect(recalled.firstCalledAt).toEqual(previous.firstCalledAt);
    await skipTicket(db, id, a.id, third.id);
    expect(await callNext(db, id, a.id)).toBeNull();
    expect((await completeTicket(db, id, a.id, second.id)).status).toBe(
      "SERVED",
    );
    expect((await analytics(db, id)).totals).toMatchObject({
      issued: 3,
      served: 2,
      waiting: 0,
      skipped: 1,
    });
  });

  it("limits public issuance across counters without charging a replay", async () => {
    const { organization, a, b } = await fixture();
    const source = { source: "public", clientHash: "fixture" } as const;
    const issue = (counterId: string, key: string) =>
      issueTicket(db, organization.id, counterId, key, source);
    const original = await issue(a.id, "initial");
    await Promise.all(
      Array.from({ length: 9 }, (_, i) =>
        issue(i % 2 ? a.id : b.id, `new-${i}`),
      ),
    );
    await expect(issue(b.id, "limited")).rejects.toMatchObject({ status: 429 });
    expect((await issue(a.id, "initial")).id).toBe(original.id);
    const [result] = await db
      .select({ count: count() })
      .from(tickets)
      .where(eq(tickets.orgId, organization.id));
    expect(result.count).toBe(10);
  });

  it("returns 403 from owner routes for current STAFF even with an OWNER claim", async () => {
    const { organization } = await fixture();
    const { actor, cookie } = await session(
      organization.id,
      organization.slug,
      "STAFF",
      "OWNER",
    );
    const counterList = await import("../src/app/api/admin/counters/route");
    const counterById =
      await import("../src/app/api/admin/counters/[id]/route");
    const staffList = await import("../src/app/api/admin/staff/route");
    const staffById = await import("../src/app/api/admin/staff/[id]/route");
    const branding = await import("../src/app/api/admin/organization/route");
    const reports = await import("../src/app/api/admin/analytics/route");
    const context = { params: Promise.resolve({ id: actor.id }) };

    for (const result of await Promise.all([
      counterList.GET(request("/api/admin/counters", "GET", cookie)),
      counterList.POST(request("/api/admin/counters", "POST", cookie)),
      counterById.PATCH(
        request("/api/admin/counters/id", "PATCH", cookie),
        context,
      ),
      counterById.DELETE(
        request("/api/admin/counters/id", "DELETE", cookie),
        context,
      ),
      staffList.GET(request("/api/admin/staff", "GET", cookie)),
      staffList.POST(request("/api/admin/staff", "POST", cookie)),
      staffById.DELETE(
        request("/api/admin/staff/id", "DELETE", cookie),
        context,
      ),
      branding.PATCH(request("/api/admin/organization", "PATCH", cookie)),
      reports.GET(request("/api/admin/analytics", "GET", cookie)),
    ])) {
      expect(result.status).toBe(403);
      expect((await result.json()).error).toBe("Owner access is required.");
    }
  });

  it("handles owner counter, staff, and branding changes within the current organization", async () => {
    const { organization, a } = await fixture();
    const other = await fixture();
    const { actor, cookie } = await session(
      organization.id,
      organization.slug,
      "OWNER",
    );
    const counterList = await import("../src/app/api/admin/counters/route");
    const counterById =
      await import("../src/app/api/admin/counters/[id]/route");
    const staffList = await import("../src/app/api/admin/staff/route");
    const staffById = await import("../src/app/api/admin/staff/[id]/route");
    const branding = await import("../src/app/api/admin/organization/route");
    const params = (id: string) => ({ params: Promise.resolve({ id }) });

    const created = await counterList.POST(
      request("/api/admin/counters", "POST", cookie, {
        name: "Triage",
        prefix: "t2",
      }),
    );
    expect(created.status).toBe(201);
    const { counter } = await created.json();
    expect(counter).toMatchObject({ prefix: "T2", orgId: organization.id });
    const changed = await counterById.PATCH(
      request("/api/admin/counters/id", "PATCH", cookie, { status: "PAUSED" }),
      params(counter.id),
    );
    expect((await changed.json()).counter.status).toBe("PAUSED");
    const conflict = await counterById.PATCH(
      request("/api/admin/counters/id", "PATCH", cookie, { prefix: "a" }),
      params(counter.id),
    );
    expect(conflict.status).toBe(409);
    expect(
      (
        await counterById.DELETE(
          request("/api/admin/counters/id", "DELETE", cookie),
          params(other.a.id),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await counterById.DELETE(
          request("/api/admin/counters/id", "DELETE", cookie),
          params(counter.id),
        )
      ).status,
    ).toBe(200);

    const staffResponse = await staffList.POST(
      request("/api/admin/staff", "POST", cookie, {
        fullName: "Desk Staff",
        username: "staff" + randomUUID().slice(0, 8),
        password: "random fixture password",
      }),
    );
    expect(staffResponse.status).toBe(201);
    const { staff } = await staffResponse.json();
    expect(staff.role).toBe("STAFF");
    expect(staff.passwordHash).toBeUndefined();
    expect(
      (
        await staffById.DELETE(
          request("/api/admin/staff/id", "DELETE", cookie),
          params(actor.id),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await staffById.DELETE(
          request("/api/admin/staff/id", "DELETE", cookie),
          params(staff.id),
        )
      ).status,
    ).toBe(200);

    const patch = {
      name: "Renamed organization",
      primaryColor: "#123ABC",
      logoUrl: "https://example.com/logo.png",
    };
    expect(
      (
        await branding.PATCH(
          request("/api/admin/organization", "PATCH", cookie, patch),
        )
      ).status,
    ).toBe(200);
    expect((await displaySnapshot(db, organization.slug)).organization).toEqual(
      patch,
    );
    await issueTicket(db, organization.id, a.id, "active", {
      source: "walkin",
    });
    expect(
      (
        await counterById.DELETE(
          request("/api/admin/counters/id", "DELETE", cookie),
          params(a.id),
        )
      ).status,
    ).toBe(409);
  });

  it("serves public admission, ticket status, display and SSE without exposing ticket IDs in display data", async () => {
    const { organization, a } = await fixture();
    const other = await fixture();
    const { cookie } = await session(
      organization.id,
      organization.slug,
      "STAFF",
    );
    const orgSlug = organization.slug;
    const context = { params: Promise.resolve({ orgSlug }) };
    const publicJoin =
      await import("../src/app/api/public/[orgSlug]/join/route");
    const status =
      await import("../src/app/api/public/[orgSlug]/ticket/[ticketId]/route");
    const display =
      await import("../src/app/api/public/[orgSlug]/display/route");
    const stream = await import("../src/app/api/public/[orgSlug]/stream/route");
    const desk = await import("../src/app/api/desk/action/route");
    const admission = (
      counterId: string,
      idempotencyKey: string = randomUUID(),
    ) =>
      publicJoin.POST(
        request("/api/public/org/join", "POST", undefined, {
          counterId,
          idempotencyKey,
        }),
        context,
      );
    const key = randomUUID();
    const result = await admission(a.id, key);
    expect(result.status).toBe(201);
    const ticket = await result.json();
    expect((await (await admission(a.id, key)).json()).ticketId).toBe(
      ticket.ticketId,
    );
    expect((await admission(other.a.id)).status).toBe(404);
    expect((await admission(a.id, "predictable")).status).toBe(400);

    const ticketContext = (slug: string) => ({
      params: Promise.resolve({ orgSlug: slug, ticketId: ticket.ticketId }),
    });
    expect(
      (
        await status.GET(
          request("/api/public/org/ticket/id"),
          ticketContext(other.organization.slug),
        )
      ).status,
    ).toBe(404);
    const view = await status.GET(
      request("/api/public/org/ticket/id"),
      ticketContext(orgSlug),
    );
    expect(await view.json()).toEqual({
      status: "WAITING",
      counterName: a.name,
      tokenNumber: "A-01",
      peopleAhead: 0,
      estimatedWaitMinutes: 0,
    });

    await Promise.all(Array.from({ length: 4 }, () => admission(a.id)));
    const snapshot = await (
      await display.GET(request("/api/public/org/display"), context)
    ).json();
    expect(
      snapshot.counters.find((counter: { id: string }) => counter.id === a.id),
    ).toMatchObject({
      waitingTokens: ["A-01", "A-02", "A-03"],
      waitingCount: 5,
    });
    await admission(a.id);
    expect(
      (await displaySnapshot(db, orgSlug)).counters.find(
        (counter) => counter.id === a.id,
      ),
    ).toMatchObject({
      waitingTokens: ["A-01", "A-02", "A-03"],
      waitingCount: 6,
    });
    expect(JSON.stringify(snapshot)).not.toContain(ticket.ticketId);

    const events = await stream.GET(request("/api/public/org/stream"), context);
    expect(events.headers.get("content-type")).toContain("text/event-stream");
    const reader = events.body!.getReader();
    try {
      const initial = new TextDecoder().decode((await reader.read()).value);
      expect(initial).toContain("event: snapshot");
      const call = await desk.POST(
        request("/api/desk/action", "POST", cookie, {
          action: "CALL_NEXT",
          counterId: a.id,
        }),
      );
      expect(call.status).toBe(200);
      const update = new TextDecoder().decode((await reader.read()).value);
      expect(update).toContain("event: update\ndata: ");
      expect(update).toContain('"calledTicket":{"tokenNumber":"A-01"');
      expect(update).not.toContain(ticket.ticketId);
    } finally {
      await reader.cancel();
    }

    await db
      .update(organizations)
      .set({ expiresAt: new Date(0) })
      .where(eq(organizations.id, organization.id));
    expect((await admission(a.id)).status).toBe(402);
    const walkin = await desk.POST(
      request("/api/desk/action", "POST", cookie, {
        action: "ISSUE_WALKIN",
        counterId: a.id,
        idempotencyKey: "expired-walkin",
      }),
    );
    expect(walkin.status).toBe(402);
  });
});
