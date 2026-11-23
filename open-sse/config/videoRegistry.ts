/**
 * Video Generation Provider Registry
 *
 * Defines providers that support the /v1/videos/generations endpoint.
 * Local providers (ComfyUI, SD WebUI with AnimateDiff) and fal.ai hosted
 * image-to-video models (Seedance, Grok Imagine, Kling, Hailuo).
 */

import { parseModelFromRegistry, getAllModelsFromRegistry } from "./registryUtils.ts";

/**
 * Per-model request shape for fal.ai queue endpoints. Field names and enum
 * values come from the typed endpoint map in @fal-ai/client 1.11.0.
 */
export interface FalVideoSpec {
  /** fal endpoint id, e.g. "fal-ai/kling-video/v3/standard/image-to-video" */
  endpoint: string;
  /** Input field that carries the source image. */
  imageField: "image_url" | "start_image_url";
  /** Durations the endpoint accepts, in seconds. */
  durations: number[];
  defaultDuration: number;
  /** Whether fal expects duration as a number (true) or a string enum (false). */
  durationAsNumber?: boolean;
  aspectRatios?: string[];
  resolutions?: string[];
  supportsAudio?: boolean;
  supportsNegativePrompt?: boolean;
}

export interface VideoModel {
  id: string;
  name: string;
  fal?: FalVideoSpec;
}

export interface VideoProvider {
  id: string;
  baseUrl: string;
  authType: string;
  authHeader: string;
  format: string;
  models: VideoModel[];
}

export const VIDEO_PROVIDERS: Record<string, VideoProvider> = {
  comfyui: {
    id: "comfyui",
    baseUrl: "http://localhost:8188",
    authType: "none",
    authHeader: "none",
    format: "comfyui",
    models: [
      { id: "animatediff", name: "AnimateDiff" },
      { id: "svd-xt", name: "Stable Video Diffusion XT" },
    ],
  },

  sdwebui: {
    id: "sdwebui",
    baseUrl: "http://localhost:7860",
    authType: "none",
    authHeader: "none",
    format: "sdwebui-video",
    models: [{ id: "animatediff-webui", name: "AnimateDiff (WebUI)" }],
  },

  // fal.ai hosted image-to-video models (async queue: submit → poll → result).
  // Usage is billed to the fal account that owns the API key.
  fal: {
    id: "fal",
    baseUrl: "https://queue.fal.run",
    authType: "apikey",
    authHeader: "key",
    format: "fal-queue",
    models: [
      {
        id: "seedance-2.0-fast",
        name: "Seedance 2.0 Fast (Image to Video)",
        fal: {
          endpoint: "bytedance/seedance-2.0/fast/image-to-video",
          imageField: "image_url",
          durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          defaultDuration: 5,
          aspectRatios: ["auto", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
          resolutions: ["480p", "720p"],
          supportsAudio: true,
        },
      },
      {
        id: "grok-imagine-video-v1.5",
        name: "Grok Imagine Video v1.5 (Image to Video)",
        fal: {
          endpoint: "xai/grok-imagine-video/v1.5/image-to-video",
          imageField: "image_url",
          durations: [6, 10],
          defaultDuration: 6,
          durationAsNumber: true,
          resolutions: ["480p", "720p", "1080p"],
        },
      },
      {
        id: "kling-v3-standard",
        name: "Kling v3 Standard (Image to Video)",
        fal: {
          endpoint: "fal-ai/kling-video/v3/standard/image-to-video",
          imageField: "start_image_url",
          durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          defaultDuration: 5,
          supportsAudio: true,
          supportsNegativePrompt: true,
        },
      },
      {
        id: "hailuo-2.3-standard",
        name: "Hailuo 2.3 Standard (Image to Video)",
        fal: {
          endpoint: "fal-ai/minimax/hailuo-2.3/standard/image-to-video",
          imageField: "image_url",
          durations: [6, 10],
          defaultDuration: 6,
        },
      },
    ],
  },
};

/**
 * Get video provider config by ID
 */
export function getVideoProvider(providerId: string): VideoProvider | null {
  return VIDEO_PROVIDERS[providerId] || null;
}

/**
 * Parse video model string (format: "provider/model" or just "model")
 */
export function parseVideoModel(modelStr: string | null) {
  return parseModelFromRegistry(modelStr, VIDEO_PROVIDERS);
}

/**
 * Get all video models as a flat list
 */
export function getAllVideoModels() {
  return getAllModelsFromRegistry(VIDEO_PROVIDERS);
}
