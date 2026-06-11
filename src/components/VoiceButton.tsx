"use client";

import { useEffect, useRef, useState } from "react";

// ブラウザ内蔵の音声認識(Web Speech API)で、話した内容を入力欄に追記する。
// 対応ブラウザ(Chrome系・Android・iOS Safari等)でのみボタンを表示。非対応では何も描画しない
// (その場合はスマホキーボードのマイクキーを使ってもらう)。
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceButton({ onAppend }: { onAppend: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  if (!supported) return null;

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript;
      }
      if (text.trim()) onAppend(text.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function stop() {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      aria-label={listening ? "音声入力を止める" : "音声で入力"}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
        listening
          ? "border-brand bg-brand text-white"
          : "border-line bg-white text-brand-ink"
      }`}
    >
      {listening ? (
        <>
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" /> 聞き取り中…
        </>
      ) : (
        <>🎤 音声入力</>
      )}
    </button>
  );
}
