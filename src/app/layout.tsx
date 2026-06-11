import type { Metadata, Viewport } from "next";
import { Yuji_Syuku } from "next/font/google";
import "./globals.css";
import Link from "next/link";

// 筆文字(楷書系)。ロゴ・段位など要所だけに使い、本文は読みやすい標準フォント。
const brush = Yuji_Syuku({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-brush",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "プロンプト道場 12週間プログラム",
  description: "ほぼゼロから12週間で、AIへの「ちゃんとした指示出し」ができるようになる完走型プログラム。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={brush.variable}>
      <body className="font-sans">
        <div className="min-h-screen w-full">
          <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur-md">
            <div className="h-1 w-full bg-gradient-to-r from-brand via-brand-dark to-brand" />
            <div className="mx-auto flex max-w-screen items-center justify-between px-5 py-2.5">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-brush text-lg leading-none text-white shadow-soft">
                  道
                </span>
                <span className="font-brush text-xl leading-none tracking-wide text-ink">プロンプト道場</span>
              </Link>
              <span className="chip bg-brand-soft font-brush text-brand-ink">十二週</span>
            </div>
          </header>
          <main className="mx-auto max-w-screen px-5 pb-28 pt-5">{children}</main>
        </div>
      </body>
    </html>
  );
}
