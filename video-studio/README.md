# Roselle Video Studio

Web app dalaman untuk tukar **gambar produk → video TikTok** guna model AI melalui [fal.ai](https://fal.ai):

| Model                         | Endpoint fal                                        | Tempoh   | Nota                              |
| ----------------------------- | --------------------------------------------------- | -------- | --------------------------------- |
| Seedance 2.0 Fast (ByteDance) | `bytedance/seedance-2.0/fast/image-to-video`        | 5s / 10s | Boleh pilih 9:16, audio pilihan   |
| Grok Imagine v1.5 (xAI)       | `xai/grok-imagine-video/v1.5/image-to-video`        | 6s / 10s | Audio auto, nisbah ikut gambar    |
| Kling v3 Standard (Kuaishou)  | `fal-ai/kling-video/v3/standard/image-to-video`     | 5s / 10s | Audio pilihan, nisbah ikut gambar |
| Hailuo 2.3 Standard (MiniMax) | `fal-ai/minimax/hailuo-2.3/standard/image-to-video` | 6s / 10s | Tiada audio, nisbah ikut gambar   |

Ciri-ciri:

- Upload gambar (JPG/PNG/WebP, max 10MB)
- Pilih **beberapa model sekaligus** untuk banding hasil sebelah-menyebelah
- 6 preset gerakan fashion (pusing, jalan, close-up, angin, OOTD, orbit) + prompt sendiri
- Pilihan "Kekalkan design baju", supaya warna, corak dan tudung tak berubah
- Sejarah video disimpan dalam browser, dan job yang sedang jalan tetap diteruskan walaupun page di-refresh
- Login password untuk team, dengan had video harian

## Cara setup (kali pertama)

1. Install [Node.js 20+](https://nodejs.org).
2. Dapatkan API key di https://fal.ai/dashboard/keys, kemudian topup credit.
   **Set juga spending limit** di dashboard fal supaya kos terkawal.
3. Dalam folder ni:
   ```bash
   cd video-studio
   cp .env.example .env.local     # isi FAL_KEY dan STUDIO_PASSWORD
   npm install
   npm run dev                    # buka http://localhost:3000
   ```

## Deploy online (Vercel)

1. Import repo ni di vercel.com, kemudian set **Root Directory = `video-studio`**.
2. Masukkan Environment Variables: `FAL_KEY`, `STUDIO_PASSWORD`, `DAILY_VIDEO_LIMIT`.
3. Deploy, lepas tu kongsi link + password dengan team.

## Tips hasil cantik

- Guna gambar **potret 9:16, full body, background bersih, pencahayaan terang**.
- Tulis prompt gerakan dalam **English** (model ikut arahan English lebih tepat).
- Satu gerakan utama setiap video. Prompt yang terlalu banyak aksi akan buat baju jadi pelik.
- Test model yang sama dengan 2–3 gambar dulu sebelum produksi besar.

## Nota teknikal

- `FAL_KEY` hanya digunakan di server (`lib/fal.ts`); browser tak pernah nampak key.
- API routes: `/api/upload` (ke fal storage), `/api/generate` (hantar job ke queue fal),
  `/api/status` (semak status + ambil URL video). Model hanya dari senarai dalam `lib/models.ts`.
- `DAILY_VIDEO_LIMIT` dikira dalam memori server: reset bila server restart, dan setiap instance
  ada kiraan sendiri. Spending limit di dashboard fal adalah kawalan kos sebenar.
- URL video fal tak kekal selama-lamanya. Download video yang nak guna.
- Model ID diambil dari type definitions `@fal-ai/client@1.11.0`. Kalau fal tukar/tamatkan model,
  kemas kini `lib/models.ts`.

```bash
npm test          # unit test (node:test)
npm run typecheck
npm run build
```
