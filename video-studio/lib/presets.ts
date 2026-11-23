import type { BuilderState } from "./promptBuilder.ts";

/**
 * Quick starts: each preset is just a set of prompt-builder choices,
 * so the team can apply one and then tweak any single option.
 */
export interface Preset {
  id: string;
  label: string;
  state: BuilderState;
}

export const PRESETS: Preset[] = [
  {
    id: "spin",
    label: "Pusing perlahan",
    state: { motion: "spin", fabric: "flow", camera: "static", light: "studio", style: "slowmo" },
  },
  {
    id: "walk",
    label: "Jalan ke kamera",
    state: { motion: "walk", fabric: "flow", camera: "pull", light: "golden", style: "premium" },
  },
  {
    id: "detail",
    label: "Close-up detail",
    state: { motion: "still", fabric: "none", camera: "detail", light: "studio", style: "premium" },
  },
  {
    id: "breeze",
    label: "Kain ditiup angin",
    state: { motion: "smile", fabric: "breeze", camera: "push", light: "golden", style: "slowmo" },
  },
  {
    id: "ootd",
    label: "Pose OOTD",
    state: { motion: "poses", fabric: "flow", camera: "handheld", light: "morning", style: "ugc" },
  },
  {
    id: "raya",
    label: "Vibe raya",
    state: { motion: "twirl", fabric: "flow", camera: "orbit", light: "raya", style: "premium" },
  },
];
