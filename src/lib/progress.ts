"use client";

// Phase 0 はβ向けに最小化:進捗・ストリークは localStorage に保持(認証/DBはPhase 1)。
// 設計書 §6「支出を検証の後ろに置く」— 完走率検証に必要な最小限のみを実装。

import { CURRICULUM } from "./curriculum";

const KEY = "ai-shijiryoku-progress-v1";

export interface Progress {
  completed: string[]; // ステップキー("w1d1" / "weekend1" など)
  streak: number;
  lastActive: string; // YYYY-MM-DD
}

const EMPTY: Progress = { completed: [], streak: 0, lastActive: "" };

function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function diffDays(a: string, b: string): number {
  if (!a || !b) return Infinity;
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw) as Progress;
    return { completed: p.completed ?? [], streak: p.streak ?? 0, lastActive: p.lastActive ?? "" };
  } catch {
    return { ...EMPTY };
  }
}

function save(p: Progress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
}

export function isDone(p: Progress, key: string): boolean {
  return p.completed.includes(key);
}

// ステップ完了 → 進捗追加 & ストリーク更新
export function complete(key: string): Progress {
  const p = loadProgress();
  if (!p.completed.includes(key)) p.completed.push(key);

  const today = todayStr();
  const gap = diffDays(p.lastActive, today);
  if (gap === 0) {
    // 同日:ストリーク据え置き(初日0なら1に)
    if (p.streak === 0) p.streak = 1;
  } else if (gap === 1) {
    p.streak += 1;
  } else {
    p.streak = 1;
  }
  p.lastActive = today;
  save(p);
  return p;
}

export function resetProgress(): Progress {
  save({ ...EMPTY });
  return { ...EMPTY };
}

// 一本道:全ステップを順序付けし、最初の未完了ステップを「今日やること」とする。
export type StepKind = "lesson" | "weekend";
export interface Step {
  key: string;
  kind: StepKind;
  week: number;
  day?: number;
  title: string;
  href: string;
}

export function allSteps(): Step[] {
  const steps: Step[] = [];
  for (const w of CURRICULUM) {
    for (const l of w.lessons) {
      steps.push({
        key: `w${w.week}d${l.day}`,
        kind: "lesson",
        week: w.week,
        day: l.day,
        title: l.title,
        href: `/lesson/${w.week}/${l.day}`,
      });
    }
    steps.push({
      key: `weekend${w.week}`,
      kind: "weekend",
      week: w.week,
      title: w.weekend.title,
      href: `/weekend/${w.week}`,
    });
  }
  return steps;
}

// ホームの「今日やること」用:最初の未完了ステップ
export function nextStep(p: Progress): Step | null {
  const steps = allSteps();
  return steps.find((s) => !p.completed.includes(s.key)) ?? null;
}

// 「次へ進む」用:カリキュラム順で、いまの課の“すぐ次”の課(完了済みでも構わない)
export function stepAfterKey(key: string): Step | null {
  const steps = allSteps();
  const idx = steps.findIndex((s) => s.key === key);
  if (idx < 0 || idx + 1 >= steps.length) return null;
  return steps[idx + 1];
}

export function progressPct(p: Progress): number {
  const total = allSteps().length;
  if (total === 0) return 0;
  return Math.round((p.completed.length / total) * 100);
}
