import { NextResponse } from "next/server";

import { errorMessage, getFal } from "@/lib/fal.ts";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/schema.ts";

export const runtime = "nodejs";

/** Uploads a product photo to fal storage and returns its public URL. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Tiada fail gambar" }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Guna JPG, PNG atau WebP sahaja" }, { status: 415 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Gambar melebihi 10MB" }, { status: 413 });
  }

  try {
    const url = await getFal().storage.upload(file);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[upload] fal storage error:", errorMessage(err));
    return NextResponse.json({ error: `Upload gagal: ${errorMessage(err)}` }, { status: 502 });
  }
}
