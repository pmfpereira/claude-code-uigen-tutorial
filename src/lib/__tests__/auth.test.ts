// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookies)),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeValidToken(payload: object, expiresIn = "7d") {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- createSession ---

test("createSession sets an httpOnly cookie", async () => {
  const { createSession } = await import("../auth");
  await createSession("user-1", "test@example.com");

  expect(mockCookies.set).toHaveBeenCalledOnce();
  const [name, _token, options] = mockCookies.set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(typeof _token).toBe("string");
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession cookie expires roughly 7 days from now", async () => {
  const { createSession } = await import("../auth");
  const before = Date.now();
  await createSession("user-1", "test@example.com");
  const after = Date.now();

  const [, , options] = mockCookies.set.mock.calls[0];
  const expires: Date = options.expires;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
  expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDays + 1000);
});

// --- getSession ---

test("getSession returns null when no cookie is set", async () => {
  mockCookies.get.mockReturnValue(undefined);
  const { getSession } = await import("../auth");
  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns session payload for a valid token", async () => {
  const payload = { userId: "user-1", email: "test@example.com", expiresAt: new Date() };
  const token = await makeValidToken(payload);
  mockCookies.get.mockReturnValue({ value: token });

  const { getSession } = await import("../auth");
  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("test@example.com");
});

test("getSession returns null for an expired token", async () => {
  const payload = { userId: "user-1", email: "test@example.com", expiresAt: new Date() };
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("-1s")
    .setIssuedAt()
    .sign(JWT_SECRET);
  mockCookies.get.mockReturnValue({ value: token });

  const { getSession } = await import("../auth");
  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null for a tampered token", async () => {
  mockCookies.get.mockReturnValue({ value: "not.a.valid.jwt" });
  const { getSession } = await import("../auth");
  const session = await getSession();
  expect(session).toBeNull();
});

// --- deleteSession ---

test("deleteSession deletes the auth-token cookie", async () => {
  const { deleteSession } = await import("../auth");
  await deleteSession();
  expect(mockCookies.delete).toHaveBeenCalledWith("auth-token");
});

// --- verifySession ---

test("verifySession returns null when request has no cookie", async () => {
  const request = new NextRequest("http://localhost/api/test");
  const { verifySession } = await import("../auth");
  const session = await verifySession(request);
  expect(session).toBeNull();
});

test("verifySession returns session payload for a valid cookie in request", async () => {
  const payload = { userId: "user-2", email: "other@example.com", expiresAt: new Date() };
  const token = await makeValidToken(payload);

  const request = new NextRequest("http://localhost/api/test", {
    headers: { cookie: `auth-token=${token}` },
  });

  const { verifySession } = await import("../auth");
  const session = await verifySession(request);

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-2");
  expect(session?.email).toBe("other@example.com");
});

test("verifySession returns null for an invalid token in request", async () => {
  const request = new NextRequest("http://localhost/api/test", {
    headers: { cookie: "auth-token=garbage.token.value" },
  });

  const { verifySession } = await import("../auth");
  const session = await verifySession(request);
  expect(session).toBeNull();
});

test("verifySession returns null for an expired token in request", async () => {
  const payload = { userId: "user-3", email: "old@example.com", expiresAt: new Date() };
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("-1s")
    .setIssuedAt()
    .sign(JWT_SECRET);

  const request = new NextRequest("http://localhost/api/test", {
    headers: { cookie: `auth-token=${token}` },
  });

  const { verifySession } = await import("../auth");
  const session = await verifySession(request);
  expect(session).toBeNull();
});
