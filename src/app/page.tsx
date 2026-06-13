"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CURRICULUM } from "@/lib/curriculum";
import { Daruma, Seal } from "@/components/Dojo";
import { FeedbackLink } from "@/components/FeedbackLink";
import { loadProgress, nextStep, progressPct, resetProgress, allSteps, type Progress, type Step } from "@/lib/progress";

// 進捗に応じた段位(白帯→黒帯)
function rank(pct: number): { name: string; belt: string } {
  if (pct >= 100) return { name: "黒帯・免許皆伝", belt: "#2a2622" };
  if (pct >= 75) return { name: "茶帯", belt: "#7b4a2d" };
  if (pct >= 50) return { name: "青帯", belt: "#2b4a6f" };
  if (pct >= 25) return { name: "黄帯", belt: "#dca52e" };
  if (pct > 0) return { name: "白帯", belt: "#cdbfa3" };
  return { name: "入門", belt: "#cdbfa3" };
}

export default function Home() {
  const [p, setP] = useState<Progress | null>(null);

  useEffect(() => {
    setP(loadProgress());
  }, []);

  if (!p) {
    return <div className="py-24 text-center text-ink-400">読み込み中…</div>;
  }

  const next: Step | null = nextStep(p);
  const pct = progressPct(p);
  const total = allSteps().length;
  const r = rank(pct);
  const done = (key: string) => p.completed.includes(key);
  const finished = next === null;

  return (
    <div className="space-y-7 animate-fade-up">
      {/* 段位ダッシュボード */}
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        <div className="bg-brand-tint px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-brand-ink">あなたの段位</p>
              <p className="mt-0.5 font-brush text-[28px] leading-tight text-ink">{r.name}</p>
              <p className="mt-1 text-xs text-ink-500">
                {p.completed.length}/{total} 稽古　・　進捗 {pct}%
              </p>
            </div>
            <Daruma eyes={pct >= 100 ? 2 : 1} className="h-[88px] w-[88px] shrink-0" />
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white ring-1 ring-line">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: r.belt }} />
          </div>
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ink-500">
            <span>🔥</span>
            <span className="font-bold text-ink">{p.streak}</span>
            <span>日連続の稽古</span>
          </p>
        </div>
      </section>

      {/* 一本道:今日の稽古1つ */}
      <section>
        <h2 className="section-label mb-2.5">今日の稽古</h2>
        {finished ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand/30 bg-brand-soft px-5 py-7 text-center">
            <Seal char="皆伝" />
            <div>
              <p className="font-brush text-2xl text-brand-ink">ここまで修了</p>
              <p className="mt-1.5 text-sm leading-7 text-ink-700">
                公開中の稽古を、見事にすべて納めました。続きの週は順次お届けします。
              </p>
            </div>
          </div>
        ) : (
          <Link
            href={next!.href}
            className="group block rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:shadow-lift"
          >
            <div className="flex items-center gap-2">
              <span className="chip bg-brand-soft text-brand-ink">
                {next!.kind === "weekend" ? `週${next!.week}・週末の稽古` : `週${next!.week}・Day ${next!.day}`}
              </span>
              <span className="text-xs text-ink-400">約10分</span>
            </div>
            <p className="mt-2.5 text-lg font-bold leading-snug text-ink">{next!.title}</p>
            <span className="btn-primary mt-4 w-full">
              {next!.kind === "weekend" ? "稽古に取り組む" : "稽古を始める"}
              <span className="transition group-hover:translate-x-0.5">→</span>
            </span>
          </Link>
        )}
      </section>

      {/* 品書き(カリキュラム) */}
      <section>
        <h2 className="section-label mb-2.5">品書き(カリキュラム)</h2>
        <div className="space-y-3">
          {CURRICULUM.map((w) => (
            <div key={w.week} className="card p-4">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-paper font-brush text-base text-ink-700">
                  {w.week}
                </span>
                <span className="text-sm font-semibold text-ink">{w.theme}</span>
                {w.hardWeek && <span className="chip bg-warnsoft text-warnink">ゆっくり週</span>}
              </div>
              <ul className="divide-y divide-line">
                {w.lessons.map((l) => {
                  const key = `w${w.week}d${l.day}`;
                  const isNext = next?.key === key;
                  return (
                    <li key={key}>
                      <Link
                        href={`/lesson/${w.week}/${l.day}`}
                        className={`flex items-center gap-3 py-2.5 text-sm ${isNext ? "font-bold text-brand-ink" : "text-ink-700"}`}
                      >
                        <StatusDot done={done(key)} current={isNext} />
                        <span className="w-12 shrink-0 text-xs text-ink-400">Day {l.day}</span>
                        <span className="flex-1 leading-snug">{l.title}</span>
                        {isNext && <span className="text-brand">→</span>}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link
                    href={`/weekend/${w.week}`}
                    className={`flex items-center gap-3 py-2.5 text-sm ${
                      next?.key === `weekend${w.week}` ? "font-bold text-brand-ink" : "text-ink-700"
                    }`}
                  >
                    <StatusDot done={done(`weekend${w.week}`)} current={next?.key === `weekend${w.week}`} />
                    <span className="w-12 shrink-0 text-xs text-ink-400">週末</span>
                    <span className="flex-1 leading-snug">
                      {w.weekend.title.replace(/^週末課題[(（].*?[)）]：?/, "").replace(/^週末課題：/, "")}
                    </span>
                    {w.weekend.optional && <span className="chip bg-warnsoft text-warnink">推奨</span>}
                  </Link>
                </li>
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-4 text-xs leading-6 text-ink-500">
        <p className="font-semibold text-ink-700">この道場について(β版)</p>
        <p className="mt-1">
          学習の進捗はこの端末にのみ保存されます(ログイン不要)。ミニ演習と週末課題のAI実行・添削には、
          管理者によるAPIキーの設定が必要です。
        </p>
        <div className="mt-3 rounded-xl bg-brand-tint p-3">
          <p className="text-[13px] font-semibold text-brand-ink">β版です。気づいた点を教えてください 🙏</p>
          <p className="mt-0.5 text-[11px] text-ink-500">使いにくい所・分かりにくい問題・要望など、ひとことでも大歓迎です。</p>
          <FeedbackLink context="ホーム" variant="button" className="mt-2" />
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("学習の進捗・ストリークをリセットします。よろしいですか?")) setP(resetProgress());
          }}
          className="mt-2 text-[11px] text-ink-400 underline underline-offset-2"
        >
          進捗をリセット
        </button>
      </section>
    </div>
  );
}

function StatusDot({ done, current }: { done: boolean; current: boolean }) {
  if (done)
    return <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-[11px] text-white">✓</span>;
  if (current)
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center">
        <span className="h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-brand-soft" />
      </span>
    );
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center">
      <span className="h-2.5 w-2.5 rounded-full border-2 border-line" />
    </span>
  );
}
