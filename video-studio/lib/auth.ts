/**
 * Minimal shared-password gate. The cookie holds an HMAC of a fixed label keyed
 * by STUDIO_PASSWORD, so changing the password logs everyone out.
 * Uses Web Crypto so it runs in the proxy as well as in route handlers.
 */
export const AUTH_COOKIE = "studio_auth";

export async function authToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("roselle-video-studio:v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isAuthorized(cookieValue: string | undefined): Promise<boolean> {
  const password = process.env.STUDIO_PASSWORD;
  if (!password || !cookieValue) return false;
  return safeEqual(cookieValue, await authToken(password));
}
