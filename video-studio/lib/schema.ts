import { z } from "zod";

import { MODEL_KEYS, type ModelKey } from "./models.ts";

export const generateSchema = z.object({
  model: z.enum(MODEL_KEYS as [ModelKey, ...ModelKey[]]),
  prompt: z.string().trim().min(3, "Prompt terlalu pendek").max(2000, "Prompt terlalu panjang"),
  imageUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), "Gambar mesti URL https"),
  length: z.enum(["short", "long"]).default("short"),
  aspectRatio: z.enum(["auto", "9:16", "1:1", "16:9"]).default("9:16"),
  audio: z.boolean().default(false),
  keepOutfit: z.boolean().default(true),
});

export type GenerateBody = z.infer<typeof generateSchema>;

export const statusSchema = z.object({
  model: z.enum(MODEL_KEYS as [ModelKey, ...ModelKey[]]),
  id: z.string().regex(/^[A-Za-z0-9-]{8,80}$/, "Request ID tidak sah"),
});

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
