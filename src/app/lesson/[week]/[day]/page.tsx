"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLesson, getWeek } from "@/lib/curriculum";
import { Markdown } from "@/components/Markdown";
import { ExerciseRunner } from "@/components/ExerciseRunner";
import { DrillCard } from "@/components/DrillRunner";
import { Quiz } from "@/components/Quiz";
import { Seal } from "@/components/Dojo";
import { FeedbackLink } from "@/components/FeedbackLink";
import { complete, stepAfterKey } from "@/lib/progress";

const KANJI = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

type StepDef = {
  key: string;
  kind: "review" | "explain" | "drill" | "exercise" | "bridge" | "quiz";
  label: string;
  badge: string; // 内容を表す一文字の朱印(準・解・技・演・実・問)
  sub?: string;
  drillIndex?: number;
  gated: boolean; // 答える/実行するまで「次へ」を出さない
};

export default function LessonPage({ params }: { params: { week: string; day: string } }) {
  const week = Number(params.week);
  const day = Number(params.day);
  const lesson = getLesson(week, day);
  const wk = getWeek(week);

  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [bridgeTried, setBridgeTried] = useState(false);
  // 完了演出: none → stamp(優をドン) → nav(メニュー/次へ)
  const [celebrate, setCelebrate] = useState<"none" | "stamp" | "nav">("none");
  const [nextHref, setNextHref] = useState<string | null>(null);

  // スタンプ着弾の約1.4秒後に、自動でナビ画面へ切り替える(タップでも進める)
  useEffect(() => {
    if (celebrate !== "stamp") return;
    const t = setTimeout(() => setCelebrate("nav"), 1400);
    return () => clearTimeout(t);
  }, [celebrate]);

  if (!lesson || !wk) {
    return (
      <div className="py-20 text-center text-ink-400">
        <p>レッスンが見つかりませんでした。</p>
        <Link href="/" className="mt-3 inline-block text-brand-ink underline underline-offset-2">
          ホームに戻る
        </Link>
      </div>
    );
  }

  // 1画面=1ステップ。スマホで縦に積まず、1問ずつ送る。
  const steps: StepDef[] = [];
  if (lesson.review)
    steps.push({ key: "review", kind: "review", label: "準備運動", badge: "準", sub: "昨日の復習・1タップ", gated: true });
  steps.push({ key: "explain", kind: "explain", label: "解説", badge: "解", gated: false });
  (lesson.drills ?? []).forEach((_, i) =>
    steps.push({ key: `drill-${i}`, kind: "drill", label: `腕ならし その${KANJI[i] ?? i + 1}`, badge: "技", drillIndex: i, gated: true }),
  );
  steps.push({ key: "exercise", kind: "exercise", label: "ミニ演習", badge: "演", sub: "穴埋め → AIが実行 → 添削", gated: true });
  steps.push({ key: "bridge", kind: "bridge", label: "自分のAIで1回使う", badge: "実", gated: false });
  steps.push({ key: "quiz", kind: "quiz", label: "1問クイズ", badge: "問", gated: true });

  const total = steps.length;
  const cur = steps[Math.min(current, total - 1)];
  const isLast = current === total - 1;
  const gateOk = !cur.gated || done[cur.key];

  function markDoneKey(key: string) {
    setDone((d) => (d[key] ? d : { ...d, [key]: true }));
  }

  function go(dir: 1 | -1) {
    const ni = current + dir;
    if (ni < 0 || ni >= total) return;
    setCurrent(ni);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishLesson() {
    complete(`w${week}d${day}`);
    const after = stepAfterKey(`w${week}d${day}`);
    setNextHref(after ? after.href : null);
    setCelebrate("stamp");
  }

  // ① 完了スタンプ「ドン」(全画面)。タップで即ナビへ、放置でも1.4秒で自動遷移。
  if (celebrate === "stamp") {
    return (
      <button
        type="button"
        onClick={() => setCelebrate("nav")}
        className="fixed inset-0 z-50 flex w-full flex-col items-center justify-center gap-6 bg-paper/95 backdrop-blur-sm"
        aria-label="次へ"
      >
        <div className="relative grid place-items-center">
          <span className="pointer-events-none absolute h-44 w-44 rounded-full border-4 border-brand/30 animate-ring-out" />
          <Seal char="優" size="xl" slam />
        </div>
        <p className="animate-pop-in font-brush text-3xl text-brand-ink">よくできました</p>
        <p className="animate-pop-in text-xs text-ink-400">画面をタップで次へ</p>
      </button>
    );
  }

  // ② ナビ画面(メニューに戻る / 次のレッスン)
  if (celebrate === "nav") {
    return (
      <article className="space-y-5 animate-fade-up pt-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Seal char="優" />
          <div>
            <p className="font-brush text-2xl text-brand-ink">本日の稽古 修了</p>
            <p className="mt-1.5 text-sm text-ink-700">
              Day {day}「{lesson.title}」を終えました。稽古ストリークが伸びました。
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="btn-soft flex-1">
            メニューに戻る
          </Link>
          <Link href={nextHref ?? "/"} className="btn-primary flex-1">
            {nextHref ? "次のレッスンへ →" : "トップへ →"}
          </Link>
        </div>
        <div className="pt-1 text-center">
          <FeedbackLink context={`週${week} Day${day}`} className="text-xs" />
        </div>
      </article>
    );
  }

  return (
    <div className="animate-fade-up">
      {/* ヘッダー(コンパクト)+進捗バー */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 text-xs text-ink-400">
          <Link href="/" className="hover:underline">
            ← やめる
          </Link>
          <span>
            週{week}・Day {day}
            {wk.hardWeek && <span className="chip ml-2 bg-warnsoft text-warnink">ゆっくり週</span>}
          </span>
        </div>
        <h1 className="mt-1 text-lg font-bold leading-tight tracking-tight text-ink">{lesson.title}</h1>
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${((current + 1) / total) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold text-ink-400">
            {current + 1}/{total}
          </span>
        </div>
      </div>

      {/* ステップ本体。状態保持のため全て描画し、現在ステップ以外は隠す */}
      <div>
        {steps.map((s, i) => (
          <div key={s.key} className={i === current ? "block" : "hidden"}>
            <section className="card p-5">
              <StepHead n={s.badge} label={s.label} sub={s.sub} />

              {s.kind === "review" && lesson.review && (
                <DrillCard drill={lesson.review} onDone={() => markDoneKey(s.key)} />
              )}

              {s.kind === "explain" && <Markdown text={lesson.explanation} />}

              {s.kind === "drill" && typeof s.drillIndex === "number" && lesson.drills?.[s.drillIndex] && (
                <DrillCard drill={lesson.drills[s.drillIndex]} onDone={() => markDoneKey(s.key)} />
              )}

              {s.kind === "exercise" && (
                <ExerciseRunner
                  week={week}
                  day={day}
                  exercise={lesson.exercise}
                  onSolved={() => markDoneKey(s.key)}
                />
              )}

              {s.kind === "bridge" && (
                <>
                  <Markdown text={lesson.bridge} />
                  <label className="mt-3 flex items-start gap-2.5 rounded-xl bg-paper px-3.5 py-3 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-brand"
                      checked={bridgeTried}
                      onChange={(e) => setBridgeTried(e.target.checked)}
                    />
                    <span>
                      今日の技法を、自分のAI(Claude等)で実際に1回使った（任意。アプリ内で終わらせず、自分で1回使うのが定着のコツです）
                    </span>
                  </label>
                </>
              )}

              {s.kind === "quiz" && <Quiz quiz={lesson.quiz} onAnswered={() => markDoneKey(s.key)} />}
            </section>
          </div>
        ))}
      </div>

      {/* ステップ送りナビ(画面下に固定) */}
      <nav className="sticky bottom-0 z-10 mt-4 border-t border-line bg-paper/90 py-3 backdrop-blur-md">
        {cur.gated && !gateOk && (
          <p className="mb-2 text-center text-xs text-ink-400">
            {cur.kind === "exercise" ? "↑ ミニ演習を実行すると、次へ進めます" : "↑ 答えると、次へ進めます"}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={current === 0}
            className="btn-soft flex-1 disabled:opacity-40"
          >
            戻る
          </button>
          {isLast ? (
            <button type="button" onClick={finishLesson} disabled={!gateOk} className="btn-primary flex-[2] disabled:opacity-40">
              今日のレッスンを完了する
            </button>
          ) : (
            <button type="button" onClick={() => go(1)} disabled={!gateOk} className="btn-primary flex-[2] disabled:opacity-40">
              次へ →
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

function StepHead({ n, label, sub }: { n: string; label: string; sub?: string }) {
  return (
    <div className="mb-3.5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft font-brush text-base leading-none text-brand-ink">
          {n}
        </span>
        <h2 className="text-sm font-bold text-ink">{label}</h2>
      </div>
      {sub && <p className="mt-1.5 pl-9 text-xs text-ink-400">{sub}</p>}
    </div>
  );
}
