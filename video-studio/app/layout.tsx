import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Roselle Video Studio",
  description: "Tukar gambar produk jadi video TikTok dengan Seedance, Grok, Kling & Hailuo",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
