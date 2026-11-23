import { NextResponse } from "next/server";
import { z } from "zod";

import { AUTH_COOKIE, authToken, safeEqual } from "@/lib/auth.ts";

const bodySchema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const expected = process.env.STUDIO_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "STUDIO_PASSWORD belum diset dalam .env.local" },
      { status: 500 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !safeEqual(parsed.data.password, expected)) {
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await authToken(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
