/**
 * Ready-made motion prompts for modest fashion product shots.
 * Labels are BM for the team; prompts are English because the video models
 * follow English motion directions more reliably.
 */
export interface Preset {
  id: string;
  label: string;
  prompt: string;
}

export const PRESETS: Preset[] = [
  {
    id: "spin",
    label: "Pusing perlahan",
    prompt:
      "The model slowly turns around in place, the abaya fabric flows and sways naturally, soft studio lighting, smooth slow motion, static camera.",
  },
  {
    id: "walk",
    label: "Jalan ke kamera",
    prompt:
      "The model walks gracefully toward the camera, the fabric moves with each step, gentle breeze, fashion runway feel, camera slowly tracks back.",
  },
  {
    id: "detail",
    label: "Close-up detail",
    prompt:
      "Slow camera push-in on the fabric details, embroidery and texture, soft light glints on the fabric, shallow depth of field.",
  },
  {
    id: "breeze",
    label: "Kain ditiup angin",
    prompt:
      "A gentle breeze lifts the hem and sleeves, the fabric ripples softly, the model stands elegantly and smiles, warm golden hour light.",
  },
  {
    id: "ootd",
    label: "Pose OOTD",
    prompt:
      "The model changes between three natural poses, gently adjusts her hijab and smiles at the camera, TikTok outfit-of-the-day style, handheld feel.",
  },
  {
    id: "orbit",
    label: "Kamera orbit",
    prompt:
      "The camera slowly orbits 180 degrees around the model, the full outfit stays visible, clean minimal background, smooth cinematic motion.",
  },
];
