import { NextResponse } from "next/server";

import { errorMessage, getFal } from "@/lib/fal.ts";
import { extractVideoUrl, MODELS } from "@/lib/models.ts";
import { statusSchema } from "@/lib/schema.ts";

export const runtime = "nodejs";

/** Reports a job's queue status; on completion also returns the video URL. */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = statusSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parameter tidak sah" }, { status: 400 });
  }
  const model = MODELS[parsed.data.model];
  const requestId = parsed.data.id;

  try {
    const fal = getFal();
    const status = await fal.queue.status(model.endpoint, { requestId });
    if (status.status === "IN_QUEUE") {
      return NextResponse.json({ status: "IN_QUEUE", queuePosition: status.queue_position });
    }
    if (status.status === "IN_PROGRESS") {
      return NextResponse.json({ status: "IN_PROGRESS" });
    }

    const result = await fal.queue.result(model.endpoint as never, { requestId });
    const videoUrl = extractVideoUrl(result.data);
    if (!videoUrl) {
      return NextResponse.json({ status: "FAILED", error: "Model tak pulangkan video" });
    }
    return NextResponse.json({ status: "COMPLETED", videoUrl });
  } catch (err) {
    // fal answers the result call with an error when the job itself failed
    // (e.g. safety filter or invalid input); report that as a failed job.
    console.error(`[status] ${model.endpoint} ${requestId}:`, errorMessage(err));
    return NextResponse.json({ status: "FAILED", error: errorMessage(err) });
  }
}
