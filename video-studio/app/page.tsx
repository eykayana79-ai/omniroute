import { MODEL_KEYS, MODELS } from "@/lib/models.ts";
import { PRESETS } from "@/lib/presets.ts";

import Studio, { type ModelInfo } from "./studio";

export default function Page() {
  const models: ModelInfo[] = MODEL_KEYS.map((k) => {
    const m = MODELS[k];
    return {
      key: m.key,
      label: m.label,
      vendor: m.vendor,
      note: m.note,
      durations: m.durations,
      supportsAspectRatio: m.supportsAspectRatio,
      supportsAudio: m.supportsAudio,
    };
  });
  return <Studio models={models} presets={PRESETS} />;
}
