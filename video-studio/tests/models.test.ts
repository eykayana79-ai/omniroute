import assert from "node:assert/strict";
import { test } from "node:test";

import { resetForTests, takeSlot, releaseSlot, usedToday } from "../lib/limit.ts";
import {
  buildPrompt,
  extractVideoUrl,
  isModelKey,
  KEEP_OUTFIT_SUFFIX,
  MODEL_KEYS,
  MODELS,
  type GenerateOptions,
} from "../lib/models.ts";
import { PRESETS } from "../lib/presets.ts";
import { generateSchema, statusSchema } from "../lib/schema.ts";

const opts: GenerateOptions = {
  prompt: "Model turns slowly",
  imageUrl: "https://v3.fal.media/files/abc/photo.jpg",
  length: "long",
  aspectRatio: "9:16",
  audio: true,
};

test("every model builds an input with the image and prompt", () => {
  for (const key of MODEL_KEYS) {
    const input = MODELS[key].buildInput(opts);
    assert.equal(input.prompt, opts.prompt, key);
    const image = key === "kling" ? input.start_image_url : input.image_url;
    assert.equal(image, opts.imageUrl, key);
    assert.ok(MODELS[key].endpoint.endsWith("image-to-video"), key);
  }
});

test("model-specific fields match fal input types", () => {
  assert.deepEqual(MODELS.seedance.buildInput(opts), {
    prompt: opts.prompt,
    image_url: opts.imageUrl,
    duration: "10",
    resolution: "720p",
    aspect_ratio: "9:16",
    generate_audio: true,
  });
  // Grok takes duration as a number.
  assert.equal(MODELS.grok.buildInput({ ...opts, length: "short" }).duration, 6);
  assert.equal(MODELS.kling.buildInput(opts).generate_audio, true);
  assert.equal(MODELS.kling.buildInput(opts).duration, "10");
  assert.equal(MODELS.hailuo.buildInput({ ...opts, length: "short" }).duration, "6");
  // Models without these options must not receive them.
  assert.equal("aspect_ratio" in MODELS.hailuo.buildInput(opts), false);
  assert.equal("generate_audio" in MODELS.grok.buildInput(opts), false);
});

test("isModelKey only accepts listed models", () => {
  assert.equal(isModelKey("seedance"), true);
  assert.equal(isModelKey("toString"), false);
  assert.equal(isModelKey("fal-ai/other"), false);
  assert.equal(isModelKey(undefined), false);
});

test("buildPrompt appends the keep-outfit instruction once", () => {
  assert.equal(buildPrompt("  spin  ", false), "spin");
  assert.equal(buildPrompt("spin", true), `spin. ${KEEP_OUTFIT_SUFFIX}`);
  assert.equal(buildPrompt("spin.", true), `spin. ${KEEP_OUTFIT_SUFFIX}`);
});

test("extractVideoUrl reads fal output and rejects bad shapes", () => {
  assert.equal(
    extractVideoUrl({ video: { url: "https://v3.fal.media/x.mp4" } }),
    "https://v3.fal.media/x.mp4"
  );
  assert.equal(extractVideoUrl({ video: { url: "javascript:alert(1)" } }), null);
  assert.equal(extractVideoUrl({ images: [] }), null);
  assert.equal(extractVideoUrl(null), null);
});

test("generateSchema validates and applies defaults", () => {
  const ok = generateSchema.parse({ model: "grok", prompt: "walk", imageUrl: opts.imageUrl });
  assert.equal(ok.length, "short");
  assert.equal(ok.aspectRatio, "9:16");
  assert.equal(ok.keepOutfit, true);
  assert.equal(generateSchema.safeParse({ ...ok, model: "sora" }).success, false);
  assert.equal(generateSchema.safeParse({ ...ok, imageUrl: "http://x.com/a.jpg" }).success, false);
  assert.equal(generateSchema.safeParse({ ...ok, prompt: "a" }).success, false);
});

test("statusSchema rejects path-like request ids", () => {
  assert.equal(
    statusSchema.safeParse({ model: "kling", id: "764cabcf-b745-4b3e-ae38" }).success,
    true
  );
  assert.equal(statusSchema.safeParse({ model: "kling", id: "../../secret" }).success, false);
});

test("daily limit blocks after the limit and resets on a new day", () => {
  resetForTests();
  const day1 = new Date("2026-11-23T03:00:00Z");
  assert.equal(takeSlot(2, day1), true);
  assert.equal(takeSlot(2, day1), true);
  assert.equal(takeSlot(2, day1), false);
  releaseSlot();
  assert.equal(usedToday(day1), 1);
  assert.equal(takeSlot(2, new Date("2026-11-24T03:00:00Z")), true);
  assert.equal(takeSlot(0, day1), true, "0 means no limit");
});

test("presets have unique ids and non-empty prompts", () => {
  const ids = new Set(PRESETS.map((p) => p.id));
  assert.equal(ids.size, PRESETS.length);
  for (const p of PRESETS) assert.ok(p.prompt.length > 20, p.id);
});
