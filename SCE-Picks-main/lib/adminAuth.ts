import { cookies } from "next/headers";

const COOKIE_NAME = "sce_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET is not set in your environment variables."
    );
  }
  return secret;
}

async function getKey() {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string) {
  const key = await getKey();
  const enc = new TextEncoder();
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return toHex(signature);
}

// Creates a signed "expiry.signature" token. No external session
// store needed - the cookie itself proves it was issued by this
// server and hasn't expired or been tampered with.
export async function createAdminSessionToken() {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${expires}`;
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = await sign(payload);
  if (signature.length !== expected.length) return false;

  // constant-time-ish comparison
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (diff !== 0) return false;
  return Date.now() < Number(payload);
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

// Call at the top of every admin API route to enforce auth
// (defense in depth alongside middleware.ts).
export async function requireAdmin(): Promise<
  { ok: true } | { ok: false; status: number }
> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!(await isValidToken(token))) {
      return { ok: false, status: 401 };
    }
    return { ok: true };
  } catch (error) {
    console.error("Error in requireAdmin:", error);
    return { ok: false, status: 500 };
  }
}

export async function isAdminSessionValid(token: string | undefined) {
  return isValidToken(token);
}
