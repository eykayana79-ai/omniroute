/**
 * fal.ai queue client for image-to-video generation.
 *
 * Flow: POST https://queue.fal.run/{endpoint} → poll {status_url} until
 * COMPLETED → GET {response_url} → { video: { url } }.
 * Auth header is `Authorization: Key <api key>` (same as @fal-ai/client).
 * Status and result URLs live under the app id (first two path segments of
 * the endpoint), e.g. "fal-ai/kling-video" for "fal-ai/kling-video/v3/...".
 */

import type { FalVideoSpec } from "../config/videoRegistry.ts";

export const FAL_QUEUE_BASE = "https://queue.fal.run";
const DEFAULT_POLL_INTERVAL_MS = 3_000;
const DEFAULT_TIMEOUT_MS = 10 * 60_000;
const MAX_IMAGE_REF_LENGTH = 15 * 1024 * 1024; // data URIs can be large; cap at ~15 MB

export class FalVideoError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "FalVideoError";
    this.status = status;
  }
}

type BuildResult = { input: Record<string, unknown> } | { error: string };

function pickImageRef(body: Record<string, unknown>): unknown {
  const raw = body.image_url ?? body.image ?? body.input_reference;
  if (raw && typeof raw === "object" && typeof (raw as { url?: unknown }).url === "string") {
    return (raw as { url: string }).url;
  }
  return raw;
}

export function isAllowedImageRef(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_IMAGE_REF_LENGTH) return false;
  if (/^data:image\/(png|jpe?g|webp|gif|heic|heif|bmp|tiff);base64,/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseDuration(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+(\.\d+)?s?$/.test(value.trim())) {
    return Number(value.trim().replace(/s$/, ""));
  }
  return null;
}

/**
 * Maps an OpenAI-style video request body onto a fal endpoint's input.
 * Accepted body fields: prompt, image_url | image | input_reference (https URL
 * or base64 data URI), duration | seconds, aspect_ratio, resolution,
 * generate_audio, negative_prompt.
 */
export function buildFalVideoInput(spec: FalVideoSpec, body: Record<string, unknown>): BuildResult {
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return { error: "prompt is required" };

  const image = pickImageRef(body);
  if (image === undefined || image === null || image === "") {
    return {
      error: "image_url is required for image-to-video (https URL or data:image/...;base64 URI)",
    };
  }
  if (!isAllowedImageRef(image)) {
    return { error: "image_url must be an https URL or a data:image/...;base64 URI" };
  }

  const input: Record<string, unknown> = { prompt, [spec.imageField]: image };

  const rawDuration = body.duration ?? body.seconds;
  let duration = spec.defaultDuration;
  if (rawDuration !== undefined && rawDuration !== null) {
    const parsed = parseDuration(rawDuration);
    if (parsed === null || !spec.durations.includes(parsed)) {
      return { error: `duration must be one of: ${spec.durations.join(", ")} (seconds)` };
    }
    duration = parsed;
  }
  input.duration = spec.durationAsNumber ? duration : String(duration);

  if (body.aspect_ratio !== undefined && spec.aspectRatios) {
    if (!spec.aspectRatios.includes(String(body.aspect_ratio))) {
      return { error: `aspect_ratio must be one of: ${spec.aspectRatios.join(", ")}` };
    }
    input.aspect_ratio = String(body.aspect_ratio);
  }

  if (body.resolution !== undefined && spec.resolutions) {
    if (!spec.resolutions.includes(String(body.resolution))) {
      return { error: `resolution must be one of: ${spec.resolutions.join(", ")}` };
    }
    input.resolution = String(body.resolution);
  }

  if (spec.supportsAudio && typeof body.generate_audio === "boolean") {
    input.generate_audio = body.generate_audio;
  }

  if (
    spec.supportsNegativePrompt &&
    typeof body.negative_prompt === "string" &&
    body.negative_prompt.trim()
  ) {
    input.negative_prompt = body.negative_prompt.trim();
  }

  return { input };
}

/** "fal-ai/kling-video/v3/standard/image-to-video" → "fal-ai/kling-video" */
export function falAppId(endpoint: string): string {
  return endpoint.split("/").slice(0, 2).join("/");
}

function isFalQueueUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "queue.fal.run";
  } catch {
    return false;
  }
}

async function readFalError(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  try {
    const json = JSON.parse(text);
    const detail = json?.detail ?? json?.error ?? json?.message;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String(d.msg) : String(d)))
        .join("; ");
    }
  } catch {
    // not JSON
  }
  return text.slice(0, 300) || `HTTP ${response.status}`;
}

/** Upstream 4xx statuses are passed through; everything else becomes 502. */
function clientStatus(upstream: number): number {
  return upstream >= 400 && upstream < 500 ? upstream : 502;
}

function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" };
}

export interface FalJob {
  requestId: string;
  statusUrl: string;
  responseUrl: string;
}

export async function submitFalJob(
  endpoint: string,
  input: Record<string, unknown>,
  apiKey: string
): Promise<FalJob> {
  const response = await fetch(`${FAL_QUEUE_BASE}/${endpoint}`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new FalVideoError(clientStatus(response.status), await readFalError(response));
  }
  const data = await response.json();
  const requestId = data?.request_id;
  if (typeof requestId !== "string" || !/^[A-Za-z0-9-]+$/.test(requestId)) {
    throw new FalVideoError(502, "fal did not return a request id");
  }
  const base = `${FAL_QUEUE_BASE}/${falAppId(endpoint)}/requests/${requestId}`;
  return {
    requestId,
    statusUrl: isFalQueueUrl(data.status_url) ? data.status_url : `${base}/status`,
    responseUrl: isFalQueueUrl(data.response_url) ? data.response_url : base,
  };
}

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

export async function waitForFalJob(
  job: FalJob,
  apiKey: string,
  { intervalMs = DEFAULT_POLL_INTERVAL_MS, timeoutMs = DEFAULT_TIMEOUT_MS }: PollOptions = {}
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const response = await fetch(job.statusUrl, { headers: authHeaders(apiKey) });
    if (!response.ok) {
      throw new FalVideoError(clientStatus(response.status), await readFalError(response));
    }
    const data = await response.json();
    if (data?.status === "COMPLETED") return;
    if (data?.status !== "IN_QUEUE" && data?.status !== "IN_PROGRESS") {
      throw new FalVideoError(502, `Unexpected fal job status: ${String(data?.status)}`);
    }
    if (Date.now() >= deadline) {
      throw new FalVideoError(504, `fal job ${job.requestId} timed out after ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export async function fetchFalVideoUrl(job: FalJob, apiKey: string): Promise<string> {
  const response = await fetch(job.responseUrl, { headers: authHeaders(apiKey) });
  if (!response.ok) {
    // fal reports failed jobs (e.g. content policy, invalid input) on the result call.
    throw new FalVideoError(clientStatus(response.status), await readFalError(response));
  }
  const data = await response.json();
  const url = data?.video?.url;
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new FalVideoError(502, "fal returned no video URL");
  }
  return url;
}

export function falPollOptionsFromEnv(): PollOptions {
  const timeout = Number(process.env.FAL_VIDEO_TIMEOUT_MS);
  const interval = Number(process.env.FAL_VIDEO_POLL_INTERVAL_MS);
  return {
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
    intervalMs: Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_POLL_INTERVAL_MS,
  };
}
