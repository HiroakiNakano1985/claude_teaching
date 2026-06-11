"use client";

import { useEffect, useMemo, useState } from "react";
import type { Drill } from "@/lib/types";

// タップ式ドリル(問題設計ガイド §2.1)。正解・解説は問題データに持ち、APIは呼ばない。
export function DrillRunner({ drills, onAllDone }: { drills: Drill[]; onAllDone?: () => void }) {
  const [done, setDone] = useState<boolean[]>(() => drills.map(() => false));

  useEffect(() => {
    if (done.length > 0 && done.every(Boolean)) onAllDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function markDone(i: number) {
    setDone((prev) => {
      if (prev[i]) return prev;
      const next = [...prev];
      next[i] = true;
      return next;
    });
  }

  return (
    <div className="space-y-5">
      {drills.map((d, i) => (
        <div key={i}>
          {drills.length > 1 && (
            <span className="mb-1.5 inline-block rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink-500">
              その{KANJI[i] ?? i + 1}
            </span>
          )}
          <DrillCard drill={d} onDone={() => markDone(i)} />
        </div>
      ))}
    </div>
  );
}

const KANJI = ["一", "二", "三", "四", "五"];

export function DrillCard({ drill, onDone }: { drill: Drill; onDone?: () => void }) {
  if (drill.kind === "ab") return <AbDrill drill={drill} onDone={onDone} />;
  if (drill.kind === "flaw") return <FlawDrill drill={drill} onDone={onDone} />;
  return <OrderDrill drill={drill} onDone={onDone} />;
}

// ── ab: 二択比較 ─────────────────────────────────────────────
function AbDrill({ drill, onDone }: { drill: Extract<Drill, { kind: "ab" }>; onDone?: () => void }) {
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const answered = picked !== null;
  const correct = picked === drill.answer;

  function pick(side: "a" | "b") {
    if (answered) return;
    setPicked(side);
    onDone?.();
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[15px] font-bold leading-7 text-ink">{drill.question}</p>
      {(["a", "b"] as const).map((side) => {
        const isAnswer = side === drill.answer;
        const isPicked = side === picked;
        let cls = "border-line bg-white hover:border-brand hover:bg-brand-tint";
        if (answered) {
          if (isAnswer) cls = "border-brand bg-brand-soft";
          else if (isPicked) cls = "border-red-300 bg-red-50";
          else cls = "border-line bg-white opacity-60";
        }
        return (
          <button
            key={side}
            type="button"
            onClick={() => pick(side)}
            disabled={answered}
            className={`block w-full rounded-xl border px-3.5 py-3 text-left transition ${cls}`}
          >
            <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-paper text-xs font-bold text-ink-500">
              {side === "a" ? "A" : "B"}
            </span>
            <span className="text-sm leading-7 text-ink-700">{side === "a" ? drill.a : drill.b}</span>
            {answered && isAnswer && <span className="ml-2 text-sm font-bold text-brand-ink">✓ こちら</span>}
          </button>
        );
      })}
      {answered && <Explain ok={correct} text={drill.explanation} />}
    </div>
  );
}

// ── flaw: 弱点タップ ─────────────────────────────────────────
function FlawDrill({ drill, onDone }: { drill: Extract<Drill, { kind: "flaw" }>; onDone?: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === drill.flawIndex;

  function pick(i: number) {
    if (answered) return;
    setPicked(i);
    onDone?.();
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[15px] font-bold leading-7 text-ink">{drill.question}</p>
      <div className="space-y-1.5">
        {drill.segments.map((seg, i) => {
          const isAnswer = i === drill.flawIndex;
          const isPicked = i === picked;
          let cls = "border-line bg-white hover:border-brand hover:bg-brand-tint";
          if (answered) {
            if (isAnswer) cls = "border-brand bg-brand-soft";
            else if (isPicked) cls = "border-red-300 bg-red-50";
            else cls = "border-line bg-white opacity-60";
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={answered}
              className={`block w-full rounded-xl border px-3.5 py-2.5 text-left text-sm leading-7 text-ink-700 transition ${cls}`}
            >
              {seg}
              {answered && isAnswer && <span className="ml-2 font-bold text-brand-ink">← ここが弱点</span>}
            </button>
          );
        })}
      </div>
      {answered && <Explain ok={correct} text={drill.explanation} />}
    </div>
  );
}

// ── order: 組み立て(並びが違っても✗にしない — ガイド§2B) ──
function OrderDrill({ drill, onDone }: { drill: Extract<Drill, { kind: "order" }>; onDone?: () => void }) {
  const pool = useMemo(() => scramble(drill.chips.map((_, i) => i)), [drill.chips]);
  const [placed, setPlaced] = useState<number[]>([]);
  const doneAll = placed.length === drill.chips.length;
  const exact = doneAll && placed.every((idx, i) => idx === i);

  function place(idx: number) {
    if (doneAll || placed.includes(idx)) return;
    const next = [...placed, idx];
    setPlaced(next);
    if (next.length === drill.chips.length) onDone?.();
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[15px] font-bold leading-7 text-ink">{drill.question}</p>

      {/* 組み立て先 */}
      <div className="min-h-[3.5rem] rounded-xl border border-dashed border-line bg-white px-3.5 py-2.5 text-sm leading-8 text-ink-700">
        {placed.length === 0 ? (
          <span className="text-xs text-ink-400">↓ 下のチップを、文になる順にタップ</span>
        ) : (
          placed.map((idx, i) => (
            <mark key={i} className="mr-0.5 rounded bg-brand-soft px-1 not-italic text-brand-ink">
              {drill.chips[idx]}
            </mark>
          ))
        )}
      </div>

      {/* チップ置き場 */}
      {!doneAll && (
        <div className="flex flex-wrap gap-2">
          {pool
            .filter((idx) => !placed.includes(idx))
            .map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => place(idx)}
                className="rounded-full border border-line bg-white px-3 py-1.5 text-sm leading-6 text-ink-700 transition hover:border-brand hover:bg-brand-tint active:scale-95"
              >
                {drill.chips[idx]}
              </button>
            ))}
        </div>
      )}

      {placed.length > 0 && !doneAll && (
        <button type="button" onClick={() => setPlaced([])} className="text-xs text-ink-400 underline underline-offset-2">
          やり直す
        </button>
      )}

      {doneAll && (
        <div className="space-y-2">
          {!exact && (
            <div className="rounded-xl bg-paper px-4 py-3 text-sm leading-7 text-ink-700">
              <span className="font-bold">組み立て完了。</span>おすすめの並びはこちら:
              <span className="mt-1 block">{drill.chips.join("")}</span>
            </div>
          )}
          <Explain ok={exact} okLabel="◎ 自然な一文になりました！ " text={drill.explanation} />
        </div>
      )}
    </div>
  );
}

function Explain({ ok, text, okLabel = "正解！ " }: { ok: boolean; text: string; okLabel?: string }) {
  return (
    <div className={`rounded-xl px-4 py-3 text-sm leading-7 text-ink-700 ${ok ? "bg-brand-soft" : "bg-paper"}`}>
      <span className="font-bold">{ok ? okLabel : "解説: "}</span>
      {text}
    </div>
  );
}

// 決定的シャッフル(Math.randomはSSRと不整合になるため使わない)。奇数番→偶数番の順。恒等になる場合は反転。
function scramble(indices: number[]): number[] {
  const out = [...indices.filter((i) => i % 2 === 1), ...indices.filter((i) => i % 2 === 0)];
  return out.every((v, i) => v === indices[i]) ? [...indices].reverse() : out;
}
