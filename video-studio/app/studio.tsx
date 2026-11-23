"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";

import type { AspectRatio, ModelKey, VideoLength } from "@/lib/models.ts";
import type { Preset } from "@/lib/presets.ts";
import {
  composePrompt,
  DEFAULT_STATE,
  FIELDS,
  type BuilderState,
  type FieldId,
} from "@/lib/promptBuilder.ts";

export interface ModelInfo {
  key: ModelKey;
  label: string;
  vendor: string;
  note: string;
  durations: Record<VideoLength, string>;
  supportsAspectRatio: boolean;
  supportsAudio: boolean;
}

type JobStatus = "SUBMITTING" | "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

interface Job {
  id: string;
  requestId?: string;
  model: ModelKey;
  modelLabel: string;
  prompt: string;
  imageUrl: string;
  seconds: string;
  status: JobStatus;
  queuePosition?: number;
  videoUrl?: string;
  error?: string;
  createdAt: number;
}

const STORAGE_KEY = "roselle-video-studio:jobs:v1";
const POLL_MS = 5000;
const MAX_HISTORY = 40;

function loadJobs(): Job[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const jobs = raw ? (JSON.parse(raw) as Job[]) : [];
    return Array.isArray(jobs) ? jobs : [];
  } catch {
    return [];
  }
}

function saveJobs(jobs: Job[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, MAX_HISTORY)));
  } catch {
    /* storage unavailable (private mode); history just won't persist */
  }
}

function elapsed(from: number, now: number): string {
  const s = Math.max(0, Math.round((now - from) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function isPending(j: Job): boolean {
  return j.status === "SUBMITTING" || j.status === "IN_QUEUE" || j.status === "IN_PROGRESS";
}

export default function Studio({ models, presets }: { models: ModelInfo[]; presets: Preset[] }) {
  const [imageUrl, setImageUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<ModelKey[]>(["seedance"]);
  const [mode, setMode] = useState<"builder" | "manual">("builder");
  const [builder, setBuilder] = useState<BuilderState>(presets[0]?.state ?? DEFAULT_STATE);
  const [extra, setExtra] = useState("");
  const [manualPrompt, setManualPrompt] = useState("");
  const [length, setLength] = useState<VideoLength>("short");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [audio, setAudio] = useState(false);
  const [keepOutfit, setKeepOutfit] = useState(true);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const fileInput = useRef<HTMLInputElement>(null);
  const jobsRef = useRef<Job[]>([]);

  useEffect(() => {
    const saved = loadJobs();
    jobsRef.current = saved;
    setJobs(saved);
  }, []);

  const updateJobs = useCallback((fn: (prev: Job[]) => Job[]) => {
    setJobs((prev) => {
      const next = fn(prev);
      jobsRef.current = next;
      saveJobs(next);
      return next;
    });
  }, []);

  const patchJob = useCallback(
    (id: string, patch: Partial<Job>) =>
      updateJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j))),
    [updateJobs]
  );

  // Poll every pending job that already has a fal request id.
  useEffect(() => {
    const timer = setInterval(async () => {
      setNow(Date.now());
      const pending = jobsRef.current.filter((j) => j.requestId && isPending(j));
      await Promise.all(
        pending.map(async (job) => {
          try {
            const qs = new URLSearchParams({ model: job.model, id: job.requestId! });
            const res = await fetch(`/api/status?${qs}`);
            const data = await res.json();
            if (!res.ok) {
              if (res.status === 401) window.location.href = "/login";
              return;
            }
            patchJob(job.id, {
              status: data.status,
              queuePosition: data.queuePosition,
              videoUrl: data.videoUrl,
              error: data.error,
            });
          } catch {
            /* network blip: try again next tick */
          }
        })
      );
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [patchJob]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Guna gambar JPG, PNG atau WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Gambar melebihi 10MB. Kecilkan dulu.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setImageUrl("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload gagal");
      setImageUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload gagal");
      setPreview("");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function toggleModel(key: ModelKey) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function pickPreset(p: Preset) {
    setBuilder(p.state);
  }

  function pickOption(field: FieldId, optionId: string) {
    setBuilder((prev) => ({ ...prev, [field]: optionId }));
  }

  function editManually() {
    setManualPrompt(composePrompt(builder, extra));
    setMode("manual");
  }

  async function generate() {
    setError("");
    const prompt = finalPrompt;
    const chosen = models.filter((m) => selected.includes(m.key));
    const batch: Job[] = chosen.map((m) => ({
      id: `${Date.now()}-${m.key}-${Math.random().toString(36).slice(2, 7)}`,
      model: m.key,
      modelLabel: m.label,
      prompt,
      imageUrl,
      seconds: m.durations[length],
      status: "SUBMITTING",
      createdAt: Date.now(),
    }));
    updateJobs((prev) => [...batch, ...prev]);

    await Promise.all(
      batch.map(async (job) => {
        try {
          const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: job.model,
              prompt,
              imageUrl,
              length,
              aspectRatio,
              audio,
              keepOutfit,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Gagal hantar");
          patchJob(job.id, { requestId: data.requestId, status: "IN_QUEUE" });
        } catch (e) {
          patchJob(job.id, {
            status: "FAILED",
            error: e instanceof Error ? e.message : "Gagal hantar",
          });
        }
      })
    );
  }

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    window.location.href = "/login";
  }

  const anyAspect = models.some((m) => selected.includes(m.key) && m.supportsAspectRatio);
  const anyAudio = models.some((m) => selected.includes(m.key) && m.supportsAudio);
  const finalPrompt = mode === "builder" ? composePrompt(builder, extra) : manualPrompt;
  const activePreset = presets.find((p) =>
    FIELDS.every((f) => p.state[f.id] === builder[f.id])
  )?.id;
  const canGenerate =
    !!imageUrl && !uploading && selected.length > 0 && finalPrompt.trim().length >= 3;
  const pendingCount = jobs.filter(isPending).length;

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>Roselle Video Studio</h1>
          <span>Gambar produk → video TikTok</span>
        </div>
        <button className="btn ghost" onClick={logout}>
          Log keluar
        </button>
      </header>

      <div className="grid">
        <section className="card">
          <div className="section">
            <span className="label">1. Gambar produk</span>
            <label
              className={`drop${dragging ? " active" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Gambar produk" />
              ) : (
                <span className="hint">
                  Tarik gambar ke sini atau tekan untuk pilih
                  <br />
                  Paling cantik: gambar potret 9:16, model full body, background bersih
                </span>
              )}
            </label>
            {uploading && <p className="hint">Sedang upload...</p>}
            {imageUrl && !uploading && <p className="hint status-ok">Gambar sedia ✓</p>}
          </div>

          <div className="section">
            <span className="label">
              2. Pilih model (boleh pilih lebih dari satu untuk banding)
            </span>
            <div className="models">
              {models.map((m) => (
                <label key={m.key} className={`model${selected.includes(m.key) ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selected.includes(m.key)}
                    onChange={() => toggleModel(m.key)}
                  />
                  <span>
                    <strong>
                      {m.label} <small>· {m.vendor}</small>
                    </strong>
                    <small>{m.note}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="section">
            <span className="label">3. Arahan video (prompt)</span>
            <div className="seg" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "builder"}
                className={mode === "builder" ? "on" : ""}
                onClick={() => setMode("builder")}
              >
                Prompt builder
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "manual"}
                className={mode === "manual" ? "on" : ""}
                onClick={editManually}
              >
                Tulis sendiri
              </button>
            </div>

            {mode === "builder" ? (
              <>
                <div className="field">
                  <span className="sublabel">Mula cepat</span>
                  <div className="chips">
                    {presets.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        className={`chip preset${activePreset === p.id ? " on" : ""}`}
                        onClick={() => pickPreset(p)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                {FIELDS.map((f) => (
                  <div className="field" key={f.id}>
                    <span className="sublabel">{f.label}</span>
                    <div className="chips" role="radiogroup" aria-label={f.label}>
                      {f.options.map((o) => (
                        <button
                          type="button"
                          key={o.id}
                          role="radio"
                          aria-checked={builder[f.id] === o.id}
                          className={`chip${builder[f.id] === o.id ? " on" : ""}`}
                          onClick={() => pickOption(f.id, o.id)}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="field">
                  <span className="sublabel">Nota tambahan (pilihan)</span>
                  <input
                    type="text"
                    value={extra}
                    maxLength={300}
                    onChange={(e) => setExtra(e.target.value)}
                    placeholder="cth: she holds a small beige handbag"
                    aria-label="Nota tambahan"
                  />
                </div>
                <div className="preview">
                  <span className="sublabel">Prompt yang akan dihantar</span>
                  <p>{finalPrompt}</p>
                  <button type="button" className="link" onClick={editManually}>
                    Edit prompt ni secara manual →
                  </button>
                </div>
              </>
            ) : (
              <>
                <textarea
                  value={manualPrompt}
                  onChange={(e) => setManualPrompt(e.target.value)}
                  aria-label="Prompt"
                  placeholder="Terangkan gerakan dalam English untuk hasil terbaik"
                />
                <p className="hint">
                  Tip: satu gerakan utama + satu gerakan kamera + cahaya. Tulis dalam English.
                </p>
              </>
            )}
            <label className="toggle">
              <input
                type="checkbox"
                checked={keepOutfit}
                onChange={(e) => setKeepOutfit(e.target.checked)}
              />
              Kekalkan design baju (warna, corak, tudung) sama macam gambar
            </label>
          </div>

          <div className="section">
            <div className="row">
              <div>
                <span className="label">Tempoh</span>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value as VideoLength)}
                  aria-label="Tempoh"
                >
                  <option value="short">Pendek (5–6s)</option>
                  <option value="long">Panjang (10s)</option>
                </select>
              </div>
              <div>
                <span className="label">Nisbah</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                  disabled={!anyAspect}
                  aria-label="Nisbah"
                >
                  <option value="9:16">9:16 TikTok</option>
                  <option value="1:1">1:1 Feed</option>
                  <option value="16:9">16:9 Landscape</option>
                  <option value="auto">Ikut gambar</option>
                </select>
              </div>
            </div>
            <p className="hint">Nisbah hanya untuk Seedance. Model lain ikut nisbah gambar asal.</p>
            {anyAudio && (
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={audio}
                  onChange={(e) => setAudio(e.target.checked)}
                />
                Jana bunyi/audio (Seedance & Kling)
              </label>
            )}
          </div>

          <div className="section">
            <button className="btn" disabled={!canGenerate} onClick={generate}>
              Generate {selected.length > 1 ? `${selected.length} video` : "video"}
            </button>
            {error && <p className="error">{error}</p>}
            <p className="hint">Setiap video guna credit fal.ai. Semak harga di dashboard fal.</p>
          </div>
        </section>

        <section>
          <div className="jobs-head">
            <h2>
              Video{" "}
              {pendingCount > 0 && <small className="hint">· {pendingCount} sedang dibuat</small>}
            </h2>
            {jobs.length > 0 && (
              <button
                className="btn ghost"
                onClick={() => updateJobs((prev) => prev.filter(isPending))}
              >
                Kosongkan sejarah
              </button>
            )}
          </div>

          {jobs.length === 0 ? (
            <div className="empty">Belum ada video. Upload gambar dan tekan Generate.</div>
          ) : (
            <div className="jobs">
              {jobs.map((job) => (
                <article key={job.id} className="job">
                  <div className="job-media">
                    {job.status === "COMPLETED" && job.videoUrl ? (
                      <video src={job.videoUrl} controls loop playsInline preload="metadata" />
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={job.imageUrl} alt="" />
                        <div className="job-overlay">
                          {isPending(job) && <div className="spinner" />}
                          {job.status === "SUBMITTING" && "Menghantar..."}
                          {job.status === "IN_QUEUE" &&
                            `Dalam giliran${job.queuePosition != null ? ` (#${job.queuePosition + 1})` : ""}`}
                          {job.status === "IN_PROGRESS" && "Sedang dijana..."}
                          {isPending(job) && (
                            <span className="hint">{elapsed(job.createdAt, now)}</span>
                          )}
                          {job.status === "FAILED" && (
                            <span className="status-err">Gagal: {job.error ?? "ralat"}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="job-body">
                    <strong>
                      {job.modelLabel} · {job.seconds}s
                    </strong>
                    <span className="job-prompt">{job.prompt}</span>
                    <div className="job-actions">
                      {job.videoUrl && (
                        <a href={job.videoUrl} target="_blank" rel="noreferrer">
                          Buka / Download
                        </a>
                      )}
                      {!isPending(job) && (
                        <button
                          onClick={() => updateJobs((prev) => prev.filter((j) => j.id !== job.id))}
                        >
                          Buang
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
