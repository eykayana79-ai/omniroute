import { createFalClient } from "@fal-ai/client";

let client: ReturnType<typeof createFalClient> | null = null;

/** Server-side fal client. FAL_KEY never reaches the browser. */
export function getFal() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY belum diset dalam .env.local");
  if (!client) client = createFalClient({ credentials: key });
  return client;
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const body = (err as { body?: { detail?: unknown } }).body;
    if (body?.detail) {
      if (typeof body.detail === "string") return body.detail;
      if (Array.isArray(body.detail)) {
        return body.detail
          .map((d) => (d && typeof d === "object" && "msg" in d ? String(d.msg) : String(d)))
          .join("; ");
      }
    }
    if ("message" in err) return String((err as { message: unknown }).message);
  }
  return "Ralat tidak diketahui";
}
