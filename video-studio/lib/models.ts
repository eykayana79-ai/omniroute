/**
 * Image-to-video models available through fal.ai.
 *
 * Endpoint ids and input fields come from the typed endpoint map shipped in
 * @fal-ai/client 1.11.0 (src/types/endpoints.d.ts). Only these endpoints can be
 * called: the API routes refuse any model key that is not listed here.
 */

export type ModelKey = "seedance" | "grok" | "kling" | "hailuo";
export type VideoLength = "short" | "long";
export type AspectRatio = "auto" | "9:16" | "1:1" | "16:9";

export interface GenerateOptions {
  prompt: string;
  imageUrl: string;
  length: VideoLength;
  aspectRatio: AspectRatio;
  audio: boolean;
}

export interface VideoModel {
  key: ModelKey;
  label: string;
  vendor: string;
  endpoint: string;
  /** Seconds sent to fal for "short" and "long". */
  durations: Record<VideoLength, string>;
  supportsAspectRatio: boolean;
  supportsAudio: boolean;
  note: string;
  buildInput: (opts: GenerateOptions) => Record<string, unknown>;
}

const NEGATIVE_PROMPT =
  "blur, distortion, low quality, deformed hands, extra fingers, warped fabric, changed outfit";

export const MODELS: Record<ModelKey, VideoModel> = {
  seedance: {
    key: "seedance",
    label: "Seedance 2.0 Fast",
    vendor: "ByteDance",
    endpoint: "bytedance/seedance-2.0/fast/image-to-video",
    durations: { short: "5", long: "10" },
    supportsAspectRatio: true,
    supportsAudio: true,
    note: "Pergerakan kain natural, boleh pilih 9:16, ada audio",
    buildInput: (o) => ({
      prompt: o.prompt,
      image_url: o.imageUrl,
      duration: MODELS.seedance.durations[o.length],
      resolution: "720p",
      aspect_ratio: o.aspectRatio,
      generate_audio: o.audio,
    }),
  },
  grok: {
    key: "grok",
    label: "Grok Imagine v1.5",
    vendor: "xAI",
    endpoint: "xai/grok-imagine-video/v1.5/image-to-video",
    durations: { short: "6", long: "10" },
    supportsAspectRatio: false,
    supportsAudio: false,
    note: "Laju, audio auto. Nisbah ikut gambar",
    buildInput: (o) => ({
      prompt: o.prompt,
      image_url: o.imageUrl,
      duration: Number(MODELS.grok.durations[o.length]),
      resolution: "720p",
    }),
  },
  kling: {
    key: "kling",
    label: "Kling v3 Standard",
    vendor: "Kuaishou",
    endpoint: "fal-ai/kling-video/v3/standard/image-to-video",
    durations: { short: "5", long: "10" },
    supportsAspectRatio: false,
    supportsAudio: true,
    note: "Kuat untuk pergerakan model & detail. Nisbah ikut gambar",
    buildInput: (o) => ({
      prompt: o.prompt,
      start_image_url: o.imageUrl,
      duration: MODELS.kling.durations[o.length],
      negative_prompt: NEGATIVE_PROMPT,
      generate_audio: o.audio,
    }),
  },
  hailuo: {
    key: "hailuo",
    label: "Hailuo 2.3 Standard",
    vendor: "MiniMax",
    endpoint: "fal-ai/minimax/hailuo-2.3/standard/image-to-video",
    durations: { short: "6", long: "10" },
    supportsAspectRatio: false,
    supportsAudio: false,
    note: "Gerakan kamera smooth. Tiada audio. Nisbah ikut gambar",
    buildInput: (o) => ({
      prompt: o.prompt,
      image_url: o.imageUrl,
      duration: MODELS.hailuo.durations[o.length],
      prompt_optimizer: true,
    }),
  },
};

export const MODEL_KEYS = Object.keys(MODELS) as ModelKey[];

export function isModelKey(value: unknown): value is ModelKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(MODELS, value);
}

export const KEEP_OUTFIT_SUFFIX =
  "Keep the outfit design, colours, pattern and hijab exactly the same as in the image. Modest, elegant, realistic fabric movement.";

export function buildPrompt(prompt: string, keepOutfit: boolean): string {
  const base = prompt.trim();
  if (!keepOutfit) return base;
  const sep = /[.!?]$/.test(base) ? " " : ". ";
  return `${base}${sep}${KEEP_OUTFIT_SUFFIX}`;
}

/** Extracts the video URL from a fal result payload ({ video: { url } }). */
export function extractVideoUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const video = (data as { video?: unknown }).video;
  if (!video || typeof video !== "object") return null;
  const url = (video as { url?: unknown }).url;
  return typeof url === "string" && url.startsWith("https://") ? url : null;
}
