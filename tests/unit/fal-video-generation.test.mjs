import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "omniroute-fal-video-"));

const { handleVideoGeneration } = await import("../../open-sse/handlers/videoGeneration.ts");
const { VIDEO_PROVIDERS, parseVideoModel, getAllVideoModels } =
  await import("../../open-sse/config/videoRegistry.ts");
const { buildFalVideoInput, falAppId, isAllowedImageRef, falPollOptionsFromEnv } =
  await import("../../open-sse/utils/falVideo.ts");

const IMAGE = "https://v3.fal.media/files/abc/abaya.jpg";
const KEY = "fal-test-key:secret";

function falSpec(id) {
  return VIDEO_PROVIDERS.fal.models.find((m) => m.id === id).fal;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Runs fn with fetch and setTimeout stubbed; returns the captured calls. */
async function withFalMock(routes, fn) {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const call = {
      url: String(url),
      method: options.method || "GET",
      headers: options.headers || {},
      body: options.body ? JSON.parse(String(options.body)) : undefined,
    };
    calls.push(call);
    for (const [match, handler] of routes) {
      if (call.url.includes(match)) return handler(call, calls);
    }
    throw new Error(`Unexpected fetch: ${call.url}`);
  };
  globalThis.setTimeout = (cb, _ms, ...args) => {
    if (typeof cb === "function") cb(...args);
    return 0;
  };
  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
  }
  return calls;
}

test("fal video models are registered and resolvable", () => {
  assert.equal(VIDEO_PROVIDERS.fal.format, "fal-queue");
  assert.deepEqual(parseVideoModel("fal/kling-v3-standard"), {
    provider: "fal",
    model: "kling-v3-standard",
  });
  const ids = getAllVideoModels().map((m) => m.id);
  for (const id of [
    "fal/seedance-2.0-fast",
    "fal/grok-imagine-video-v1.5",
    "fal/kling-v3-standard",
    "fal/hailuo-2.3-standard",
  ]) {
    assert.ok(ids.includes(id), id);
  }
  for (const m of VIDEO_PROVIDERS.fal.models) {
    assert.ok(m.fal.endpoint.endsWith("/image-to-video"), m.id);
    assert.ok(m.fal.durations.includes(m.fal.defaultDuration), m.id);
  }
});

test("falAppId keeps only owner/alias", () => {
  assert.equal(falAppId("fal-ai/kling-video/v3/standard/image-to-video"), "fal-ai/kling-video");
  assert.equal(falAppId("bytedance/seedance-2.0/fast/image-to-video"), "bytedance/seedance-2.0");
});

test("isAllowedImageRef accepts https URLs and image data URIs only", () => {
  assert.equal(isAllowedImageRef(IMAGE), true);
  assert.equal(isAllowedImageRef("data:image/png;base64,iVBORw0KGgo="), true);
  assert.equal(isAllowedImageRef("http://example.com/a.jpg"), false);
  assert.equal(isAllowedImageRef("file:///etc/passwd"), false);
  assert.equal(isAllowedImageRef("data:text/html;base64,PGgxPg=="), false);
  assert.equal(isAllowedImageRef(42), false);
});

test("buildFalVideoInput maps fields per model", () => {
  assert.deepEqual(
    buildFalVideoInput(falSpec("seedance-2.0-fast"), {
      prompt: " spin slowly ",
      image_url: IMAGE,
      duration: 10,
      aspect_ratio: "9:16",
      resolution: "720p",
      generate_audio: false,
    }),
    {
      input: {
        prompt: "spin slowly",
        image_url: IMAGE,
        duration: "10",
        aspect_ratio: "9:16",
        resolution: "720p",
        generate_audio: false,
      },
    }
  );

  // Kling uses start_image_url and accepts a negative prompt.
  const kling = buildFalVideoInput(falSpec("kling-v3-standard"), {
    prompt: "walk",
    image: { url: IMAGE },
    seconds: "5s",
    negative_prompt: "blur",
  });
  assert.deepEqual(kling, {
    input: { prompt: "walk", start_image_url: IMAGE, duration: "5", negative_prompt: "blur" },
  });

  // Grok takes a numeric duration and defaults to 6s; aspect_ratio is ignored.
  assert.deepEqual(
    buildFalVideoInput(falSpec("grok-imagine-video-v1.5"), {
      prompt: "smile",
      image_url: IMAGE,
      aspect_ratio: "9:16",
      generate_audio: true,
    }),
    { input: { prompt: "smile", image_url: IMAGE, duration: 6 } }
  );
});

test("buildFalVideoInput rejects bad input with a clear message", () => {
  const spec = falSpec("hailuo-2.3-standard");
  assert.match(buildFalVideoInput(spec, { prompt: "x" }).error, /image_url is required/);
  assert.match(
    buildFalVideoInput(spec, { prompt: "x", image_url: "http://insecure/a.jpg" }).error,
    /https URL/
  );
  assert.match(
    buildFalVideoInput(spec, { prompt: "x", image_url: IMAGE, duration: 7 }).error,
    /duration must be one of: 6, 10/
  );
  assert.match(
    buildFalVideoInput(falSpec("seedance-2.0-fast"), {
      prompt: "x",
      image_url: IMAGE,
      aspect_ratio: "2:1",
    }).error,
    /aspect_ratio must be one of/
  );
  assert.match(buildFalVideoInput(spec, { prompt: "  ", image_url: IMAGE }).error, /prompt/);
});

test("handleVideoGeneration runs the fal queue flow and returns the video URL", async () => {
  let statusPolls = 0;
  let result;
  const calls = await withFalMock(
    [
      [
        "/requests/req-123/status",
        () => json({ status: ++statusPolls < 3 ? "IN_PROGRESS" : "COMPLETED" }),
      ],
      ["/requests/req-123", () => json({ video: { url: "https://v3.fal.media/out.mp4" } })],
      [
        "queue.fal.run/fal-ai/kling-video/v3/standard/image-to-video",
        () =>
          json({
            request_id: "req-123",
            status_url: "https://queue.fal.run/fal-ai/kling-video/requests/req-123/status",
            response_url: "https://queue.fal.run/fal-ai/kling-video/requests/req-123",
          }),
      ],
    ],
    async () => {
      result = await handleVideoGeneration({
        body: { model: "fal/kling-v3-standard", prompt: "spin", image_url: IMAGE, duration: 10 },
        credentials: { apiKey: KEY },
        log: null,
      });
    }
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.data.data, [{ url: "https://v3.fal.media/out.mp4", format: "mp4" }]);

  const submit = calls[0];
  assert.equal(submit.method, "POST");
  assert.equal(submit.url, "https://queue.fal.run/fal-ai/kling-video/v3/standard/image-to-video");
  assert.equal(submit.headers.Authorization, `Key ${KEY}`);
  assert.deepEqual(submit.body, { prompt: "spin", start_image_url: IMAGE, duration: "10" });
  assert.equal(statusPolls, 3);
  for (const c of calls) assert.equal(c.headers.Authorization, `Key ${KEY}`);
});

test("fal flow ignores non-fal status URLs and builds them from the app id", async () => {
  let result;
  const calls = await withFalMock(
    [
      ["/requests/req-9/status", () => json({ status: "COMPLETED" })],
      ["/requests/req-9", () => json({ video: { url: "https://v3.fal.media/x.mp4" } })],
      [
        "bytedance/seedance-2.0/fast/image-to-video",
        () =>
          json({
            request_id: "req-9",
            status_url: "https://evil.example/steal",
            response_url: "http://queue.fal.run/insecure",
          }),
      ],
    ],
    async () => {
      result = await handleVideoGeneration({
        body: { model: "fal/seedance-2.0-fast", prompt: "spin", image_url: IMAGE },
        credentials: { apiKey: KEY },
        log: null,
      });
    }
  );
  assert.equal(result.success, true);
  assert.equal(calls[1].url, "https://queue.fal.run/bytedance/seedance-2.0/requests/req-9/status");
  assert.equal(calls[2].url, "https://queue.fal.run/bytedance/seedance-2.0/requests/req-9");
  assert.ok(calls.every((c) => !c.url.includes("evil.example")));
});

test("fal flow returns base64 when response_format is b64_json", async () => {
  let result;
  await withFalMock(
    [
      ["v3.fal.media/clip.mp4", () => new Response(Buffer.from("mp4-bytes"), { status: 200 })],
      ["/requests/r-1/status", () => json({ status: "COMPLETED" })],
      ["/requests/r-1", () => json({ video: { url: "https://v3.fal.media/clip.mp4" } })],
      ["image-to-video", () => json({ request_id: "r-1" })],
    ],
    async () => {
      result = await handleVideoGeneration({
        body: {
          model: "fal/hailuo-2.3-standard",
          prompt: "orbit",
          image_url: IMAGE,
          response_format: "b64_json",
        },
        credentials: { apiKey: KEY },
        log: null,
      });
    }
  );
  assert.equal(result.success, true);
  assert.deepEqual(result.data.data, [
    { b64_json: Buffer.from("mp4-bytes").toString("base64"), format: "mp4" },
  ]);
});

test("fal errors pass through upstream 4xx status and message", async () => {
  let result;
  await withFalMock(
    [["image-to-video", () => json({ detail: "User is locked. Reason: Exhausted balance." }, 403)]],
    async () => {
      result = await handleVideoGeneration({
        body: { model: "fal/grok-imagine-video-v1.5", prompt: "x", image_url: IMAGE },
        credentials: { apiKey: KEY },
        log: null,
      });
    }
  );
  assert.equal(result.success, false);
  assert.equal(result.status, 403);
  assert.match(result.error, /Exhausted balance/);
});

test("fal job failure on the result call is reported (validation detail array)", async () => {
  let result;
  await withFalMock(
    [
      ["/requests/r-2/status", () => json({ status: "COMPLETED" })],
      [
        "/requests/r-2",
        () => json({ detail: [{ msg: "content policy violation", loc: ["body"] }] }, 422),
      ],
      ["image-to-video", () => json({ request_id: "r-2" })],
    ],
    async () => {
      result = await handleVideoGeneration({
        body: { model: "fal/kling-v3-standard", prompt: "x", image_url: IMAGE },
        credentials: { apiKey: KEY },
        log: null,
      });
    }
  );
  assert.equal(result.status, 422);
  assert.match(result.error, /content policy violation/);
});

test("fal 5xx upstream errors become 502 and timeouts become 504", async () => {
  let result;
  await withFalMock([["image-to-video", () => new Response("boom", { status: 500 })]], async () => {
    result = await handleVideoGeneration({
      body: { model: "fal/kling-v3-standard", prompt: "x", image_url: IMAGE },
      credentials: { apiKey: KEY },
      log: null,
    });
  });
  assert.equal(result.status, 502);

  process.env.FAL_VIDEO_TIMEOUT_MS = "1";
  try {
    await withFalMock(
      [
        ["/requests/r-3/status", () => json({ status: "IN_QUEUE", queue_position: 4 })],
        ["image-to-video", () => json({ request_id: "r-3" })],
      ],
      async () => {
        const originalNow = Date.now;
        let t = originalNow();
        Date.now = () => (t += 10);
        try {
          result = await handleVideoGeneration({
            body: { model: "fal/kling-v3-standard", prompt: "x", image_url: IMAGE },
            credentials: { apiKey: KEY },
            log: null,
          });
        } finally {
          Date.now = originalNow;
        }
      }
    );
  } finally {
    delete process.env.FAL_VIDEO_TIMEOUT_MS;
  }
  assert.equal(result.status, 504);
  assert.match(result.error, /timed out/);
});

test("fal handler validates model, key and input before calling upstream", async () => {
  const calls = await withFalMock([], async () => {
    const unknown = await handleVideoGeneration({
      body: { model: "fal/sora-9", prompt: "x", image_url: IMAGE },
      credentials: { apiKey: KEY },
      log: null,
    });
    assert.equal(unknown.status, 400);
    assert.match(unknown.error, /Unknown fal video model/);

    const noKey = await handleVideoGeneration({
      body: { model: "fal/kling-v3-standard", prompt: "x", image_url: IMAGE },
      credentials: null,
      log: null,
    });
    assert.equal(noKey.status, 401);

    const noImage = await handleVideoGeneration({
      body: { model: "fal/kling-v3-standard", prompt: "x" },
      credentials: { apiKey: KEY },
      log: null,
    });
    assert.equal(noImage.status, 400);
    assert.match(noImage.error, /image_url is required/);
  });
  assert.equal(calls.length, 0);
});

test("falPollOptionsFromEnv falls back to safe defaults", () => {
  process.env.FAL_VIDEO_TIMEOUT_MS = "abc";
  process.env.FAL_VIDEO_POLL_INTERVAL_MS = "500";
  try {
    const opts = falPollOptionsFromEnv();
    assert.equal(opts.timeoutMs, 600000);
    assert.equal(opts.intervalMs, 500);
  } finally {
    delete process.env.FAL_VIDEO_TIMEOUT_MS;
    delete process.env.FAL_VIDEO_POLL_INTERVAL_MS;
  }
});
