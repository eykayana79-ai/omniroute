import { NextResponse } from "next/server";

import { errorMessage, getFal } from "@/lib/fal.ts";
import { dailyLimit, releaseSlot, takeSlot } from "@/lib/limit.ts";
import { buildPrompt, MODELS } from "@/lib/models.ts";
import { generateSchema } from "@/lib/schema.ts";

export const runtime = "nodejs";

/** Queues one image-to-video job on fal and returns its request id. */
export async function POST(request: Request) {
  const parsed = generateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const body = parsed.data;
  const model = MODELS[body.model];

  if (!takeSlot()) {
    return NextResponse.json(
      { error: `Had harian ${dailyLimit()} video dah capai. Cuba esok.` },
      { status: 429 }
    );
  }

  const input = model.buildInput({
    prompt: buildPrompt(body.prompt, body.keepOutfit),
    imageUrl: body.imageUrl,
    length: body.length,
    aspectRatio: body.aspectRatio,
    audio: body.audio,
  });

  try {
    // Endpoint comes from our allowlist; the client types cannot narrow a union key.
    const queued = await getFal().queue.submit(model.endpoint as never, { input } as never);
    return NextResponse.json({ requestId: queued.request_id, model: model.key });
  } catch (err) {
    releaseSlot();
    console.error(`[generate] ${model.endpoint} submit error:`, errorMessage(err));
    return NextResponse.json({ error: `${model.label}: ${errorMessage(err)}` }, { status: 502 });
  }
}
