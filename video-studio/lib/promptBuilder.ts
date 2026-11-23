/**
 * Structured prompt builder: the team picks options in BM, the app composes
 * a consistent English motion prompt (video models follow English best).
 */

export type FieldId = "motion" | "fabric" | "camera" | "light" | "style";

export interface BuilderOption {
  id: string;
  label: string;
  /** English fragment; empty means "add nothing". */
  text: string;
}

export interface BuilderField {
  id: FieldId;
  label: string;
  options: BuilderOption[];
}

export type BuilderState = Record<FieldId, string>;

export const FIELDS: BuilderField[] = [
  {
    id: "motion",
    label: "Gerakan model",
    options: [
      { id: "spin", label: "Pusing perlahan", text: "The model slowly turns around in place" },
      {
        id: "walk",
        label: "Jalan ke kamera",
        text: "The model walks gracefully toward the camera",
      },
      {
        id: "walk-side",
        label: "Jalan ke sisi",
        text: "The model walks slowly from left to right",
      },
      {
        id: "poses",
        label: "Tukar pose OOTD",
        text: "The model changes between three natural poses",
      },
      {
        id: "hijab",
        label: "Betulkan tudung",
        text: "The model gently adjusts her hijab and looks into the camera",
      },
      {
        id: "smile",
        label: "Senyum ke kamera",
        text: "The model stands elegantly, looks into the camera and smiles warmly",
      },
      {
        id: "twirl",
        label: "Pusing kain",
        text: "The model holds the side of her skirt and twirls once, the hem flares out",
      },
      {
        id: "still",
        label: "Model diam",
        text: "The model stays still with subtle natural breathing",
      },
    ],
  },
  {
    id: "fabric",
    label: "Gerakan kain",
    options: [
      {
        id: "flow",
        label: "Beralun lembut",
        text: "the fabric flows and sways naturally with her movement",
      },
      {
        id: "breeze",
        label: "Ditiup angin",
        text: "a gentle breeze lifts the hem, sleeves and hijab softly",
      },
      { id: "none", label: "Biasa sahaja", text: "" },
    ],
  },
  {
    id: "camera",
    label: "Gerakan kamera",
    options: [
      { id: "static", label: "Statik", text: "Static camera, full outfit in frame" },
      { id: "push", label: "Zoom in perlahan", text: "Slow camera push-in toward the model" },
      {
        id: "pull",
        label: "Zoom out perlahan",
        text: "Slow camera pull-back revealing the full outfit",
      },
      {
        id: "orbit",
        label: "Orbit keliling",
        text: "The camera slowly orbits 180 degrees around the model",
      },
      { id: "track", label: "Ikut model", text: "The camera smoothly tracks with the model" },
      {
        id: "detail",
        label: "Close-up detail",
        text: "Close-up camera glides over the embroidery and fabric texture, shallow depth of field",
      },
      {
        id: "handheld",
        label: "Handheld TikTok",
        text: "Handheld phone camera feel with slight natural shake",
      },
    ],
  },
  {
    id: "light",
    label: "Cahaya & mood",
    options: [
      { id: "studio", label: "Studio terang", text: "bright soft studio lighting" },
      { id: "golden", label: "Golden hour", text: "warm golden hour sunlight" },
      { id: "morning", label: "Pagi lembut", text: "soft natural morning light" },
      {
        id: "raya",
        label: "Malam raya",
        text: "festive evening glow with warm fairy lights in the background",
      },
      { id: "cinematic", label: "Sinematik", text: "cinematic moody lighting with soft contrast" },
    ],
  },
  {
    id: "style",
    label: "Gaya video",
    options: [
      { id: "real", label: "Realistik", text: "realistic, natural motion" },
      { id: "slowmo", label: "Slow motion", text: "smooth slow motion" },
      { id: "premium", label: "Iklan premium", text: "high-end fashion commercial look" },
      { id: "ugc", label: "Gaya UGC", text: "casual authentic TikTok creator style" },
    ],
  },
];

export const DEFAULT_STATE: BuilderState = {
  motion: "spin",
  fabric: "flow",
  camera: "static",
  light: "studio",
  style: "slowmo",
};

export function optionText(field: FieldId, optionId: string): string {
  const f = FIELDS.find((x) => x.id === field);
  return f?.options.find((o) => o.id === optionId)?.text ?? "";
}

function sentence(s: string): string {
  const t = s.trim();
  if (!t) return "";
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(cap) ? cap : `${cap}.`;
}

/** Builds the English prompt from builder choices plus optional free-text notes. */
export function composePrompt(state: BuilderState, extra = ""): string {
  const motion = optionText("motion", state.motion);
  const fabric = optionText("fabric", state.fabric);
  const first = [motion, fabric].filter(Boolean).join(", ");
  const mood = [optionText("light", state.light), optionText("style", state.style)]
    .filter(Boolean)
    .join(", ");
  return [first, optionText("camera", state.camera), mood, extra]
    .map(sentence)
    .filter(Boolean)
    .join(" ");
}

export function isValidState(state: unknown): state is BuilderState {
  if (!state || typeof state !== "object") return false;
  return FIELDS.every((f) => {
    const v = (state as Record<string, unknown>)[f.id];
    return typeof v === "string" && f.options.some((o) => o.id === v);
  });
}
