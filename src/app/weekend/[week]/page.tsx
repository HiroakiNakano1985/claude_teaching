"use client";

import { useState } from "react";
import Link from "next/link";
import { getWeek } from "@/lib/curriculum";
import { Markdown } from "@/components/Markdown";
import { Scores } from "@/components/Scores";
import { Seal } from "@/components/Dojo";
import { complete, stepAfterKey } from "@/lib/progress";
import { AXIS_LABEL, type GradeResult, type RubricAxis } from "@/lib/types";

const AXES: RubricAxis[] = ["purpose", "context", "constraints", "format"];

export default function WeekendPage({ params }: { params: { week: string } }) {
  const week = Number(params.week);
  const wk = getWeek(week);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [completed, setCompleted] = useState(false);
  const [nextHref, setNextHref] = useState<string | null>(null);

  if (!wk) {
    return (
      <div className="py-20 text-center text-ink-400">
        <p>課題が見つかりませんでした。</p>
        <Link href="/" className="mt-3 inline-block text-brand-ink underline underline-offset-2">
          ホームに戻る
        </Link>
      </div>
    );
  }

  const task = wk.weekend;

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, instruction: text }),
      });
      const data = await res.json();
      if (!res.ok) setError(data?.error ?? "エラーが発生しました。");
      else setResult(data as GradeResult);
    } catch {
      setError("通信に失敗しました。ネットワークをご確認ください。");
    } finally {
      setLoading(false);
    }
  }

  function markDone() {
    complete(`weekend${week}`);
    const after = stepAfterKey(`weekend${week}`);
    setNextHref(after ? after.href : null);
    setCompleted(true);
  }

  return (
    <article className="space-y-5 animate-fade-up">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
          <Link href="/" className="hover:underline">ホーム</Link>
          <span>›</span>
          <span>週{week}・週末課題</span>
          {task.optional && <span className="chip bg-warnsoft text-warnink">推奨</span>}
        </div>
        <h1 className="mt-1.5 text-[22px] font-bold leading-tight tracking-tight text-ink">{task.title}</h1>
      </div>

      <section className="card p-5">
        <Markdown text={task.brief} />
      </section>

      <section className="card p-5">
        <h2 className="mb-2 text-sm font-bold text-ink">あなたの指示文を提出</h2>
        <textarea
          className="field"
          rows={9}
          placeholder="ここに、AIに渡す『ちゃんとした指示文』を書いてください（目的・背景・制約・出力形式を意識して）。"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading || text.trim().length < 10}
          className="btn-primary mt-3 w-full"
        >
          {loading ? "添削中…" : "提出して添削を受ける"}
        </button>
        {error && <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      </section>

      {result && (
        <section className="card animate-fade-up p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">添削結果</h2>
            <span
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${
                result.pass ? "bg-brand text-white" : "bg-warnsoft text-warnink"
              }`}
            >
              {result.totalPct}点・{result.pass ? "合格" : "もう一歩"}
            </span>
          </div>

          <div className="mb-3 rounded-xl border border-line bg-paper p-3.5">
            <Scores items={AXES.map((a) => ({ label: AXIS_LABEL[a], score: result.scores[a] }))} />
          </div>

          {result.good.length > 0 && <FbList title="良かった点" color="text-brand-ink" items={result.good} />}
          {result.improve.length > 0 && <FbList title="次に良くする点" color="text-warnink" items={result.improve} />}

          {result.rewrite && (
            <details className="rounded-xl border border-line bg-paper p-3.5">
              <summary className="cursor-pointer text-sm font-bold text-ink">お手本の指示文を見る</summary>
              <div className="mt-2">
                <Markdown text={result.rewrite} />
              </div>
            </details>
          )}

          {!completed ? (
            <>
              <button type="button" onClick={markDone} className="btn-primary mt-4 w-full">
                この課題を完了する
              </button>
              {!result.pass && (
                <p className="mt-2 text-center text-xs text-ink-400">
                  「もう一歩」でも完了できます。改善点を踏まえて書き直し、再提出すると力がつきます。
                </p>
              )}
            </>
          ) : (
            <div className="mt-4 space-y-3 animate-fade-up">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand/30 bg-brand-soft px-5 py-7 text-center">
                <Seal char="一本" />
                <div>
                  <p className="font-brush text-2xl text-brand-ink">お見事</p>
                  <p className="mt-1.5 text-xs text-ink-700">週末の稽古、完了。稽古ストリークが伸びました。</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/" className="btn-soft flex-1">
                  メニューに戻る
                </Link>
                {nextHref ? (
                  <Link href={nextHref} className="btn-primary flex-1">
                    次へ進む →
                  </Link>
                ) : (
                  <Link href="/" className="btn-primary flex-1">
                    トップへ →
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </article>
  );
}

function FbList({ title, color, items }: { title: string; color: string; items: string[] }) {
  return (
    <div className="mb-3">
      <p className={`text-xs font-bold ${color}`}>{title}</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((g, i) => (
          <li key={i} className="flex gap-2 text-sm leading-7 text-ink-700">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" />
            <span>{g}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
