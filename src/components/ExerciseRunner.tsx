"use client";

import { useMemo, useState } from "react";
import { buildInstruction } from "@/lib/curriculum";
import { AXIS_LABEL, type Exercise, type ExerciseBlank, type ExerciseFeedback } from "@/lib/types";
import { Markdown } from "./Markdown";
import { Scores } from "./Scores";
import { VoiceButton } from "./VoiceButton";

export function ExerciseRunner({
  week,
  day,
  exercise,
  onSolved,
}: {
  week: number;
  day: number;
  exercise: Exercise;
  onSolved?: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [outputDone, setOutputDone] = useState(false);
  const [feedback, setFeedback] = useState<ExerciseFeedback | null>(null);

  const mode = exercise.mode ?? "compose";
  const instruction = useMemo(() => buildInstruction(exercise, values), [exercise, values]);
  const allFilled = exercise.blanks.every((b) => (values[b.id] ?? "").trim().length > 0);

  // この問題のfocal軸(自己チェックのチップに使う)
  const focalLabels = useMemo(() => {
    if (exercise.criteria?.length) return exercise.criteria.map((c) => c.label);
    if (exercise.axes?.length) return exercise.axes.map((a) => AXIS_LABEL[a]);
    return Object.values(AXIS_LABEL);
  }, [exercise]);

  const runLabel =
    mode === "revise" ? "この修正指示でAIに直させる" : mode === "rewrite" ? "この新しいプロンプトで試す" : "この指示でAIに実行させる";
  const outputLabel =
    mode === "revise"
      ? "改善された出力（あなたの修正指示の結果）"
      : mode === "rewrite"
        ? "新しい出力（あなたのプロンプトの結果）"
        : "AIの実行結果（あなたの指示で出た成果物）";

  async function run() {
    setLoading(true);
    setError(null);
    setOutput(null);
    setOutputDone(false);
    setFeedback(null);
    try {
      const res = await fetch("/api/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week,
          day,
          instruction,
          inputs: exercise.blanks.map((b) => ({ label: b.label, text: (values[b.id] ?? "").trim() })),
        }),
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!res.ok || ct.includes("application/json")) {
        const data = await res.json();
        setError(data?.error ?? "エラーが発生しました。");
        return;
      }
      // NDJSONストリームを逐次読み取り(成果物を流しながら表示し、添削は出来しだい差し込む)
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const handle = (ev: { type: string; text?: string; message?: string; feedback?: ExerciseFeedback }) => {
        if (ev.type === "delta") setOutput((prev) => (prev ?? "") + (ev.text ?? ""));
        else if (ev.type === "output") {
          setOutput(ev.text ?? "");
          setOutputDone(true);
        } else if (ev.type === "feedback" && ev.feedback) {
          setFeedback(ev.feedback);
          onSolved?.();
        } else if (ev.type === "error") setError(ev.message ?? "エラーが発生しました。");
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) handle(JSON.parse(line));
        }
      }
    } catch {
      setError("通信に失敗しました。ネットワークをご確認ください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-paper px-4 py-3 text-sm leading-7 text-ink-700">
        <span className="font-bold text-ink">場面　</span>
        {exercise.scenario}
      </div>

      {/* compose: お題(読み取り専用)。水色=あなたの記入欄 */}
      {mode === "compose" && (
        <div className="rounded-xl border border-line bg-paper px-3.5 py-3">
          <p className="text-xs font-bold text-ink-700">お題（AIに渡される指示の全文）</p>
          <p className="mt-1 text-[11px] leading-5 text-ink-400">
            <span className="rounded bg-brand-soft px-1 text-brand-ink">水色</span>{" "}
            があなたの記入欄。ほかの状況・条件は最初から決まっているので、書き写す必要はありません。
          </p>
          <OdaiPreview template={exercise.template} values={values} blanks={exercise.blanks} />
        </div>
      )}

      {/* rewrite: 使われた弱いプロンプトと残念な出力(コピーして編集できる) */}
      {mode === "rewrite" && exercise.givenPrompt && (
        <div className="space-y-2">
          <GivenBlock label="使われたプロンプト（イマイチ）" body={exercise.givenPrompt} tone="warn" copy />
          {exercise.given && <GivenBlock label="返ってきた残念な出力" body={exercise.given} tone="plain" copy />}
        </div>
      )}

      {/* revise: 直す対象の出力 */}
      {mode === "revise" && exercise.given && (
        <GivenBlock label="AIの出力（これを直します）" body={exercise.given} tone="plain" copy />
      )}

      <div className="space-y-3.5">
        {exercise.blanks.map((b) => (
          <div key={b.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-ink">{b.label}</span>
              <div className="flex items-center gap-1.5">
                <VoiceButton
                  onAppend={(t) =>
                    setValues((v) => {
                      const cur = (v[b.id] ?? "").trim();
                      return { ...v, [b.id]: cur ? `${cur} ${t}` : t };
                    })
                  }
                />
                {mode !== "compose" && <PasteBtn onPaste={(t) => setValues((v) => ({ ...v, [b.id]: t }))} />}
              </div>
            </div>
            <textarea
              className="field mt-1.5"
              rows={mode === "compose" ? 2 : 3}
              placeholder={b.placeholder}
              value={values[b.id] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [b.id]: e.target.value }))}
            />
            {b.hint && <span className="mt-1 block text-xs text-ink-400">💡 {b.hint}</span>}
          </div>
        ))}
        <p className="text-xs text-ink-400">
          🎤 打つのが面倒なら、上の「音声入力」ボタンで話して入力できます（スマホは入力欄をタップ→キーボードのマイクキーでもOK）。
        </p>
      </div>

      <button type="button" onClick={run} disabled={!allFilled || loading} className="btn-primary w-full">
        {loading ? "AIが実行中…" : allFilled ? runLabel : "空欄を埋めてください"}
      </button>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {output !== null && (
        <div className="space-y-4 animate-fade-up">
          <section className="rounded-xl border border-line bg-paper p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold tracking-wide text-ink-500">{outputLabel}</h3>
              {outputDone && <CopyBtn text={output} />}
            </div>
            <div className="whitespace-pre-wrap text-[15px] leading-8 text-ink-700">
              {output}
              {!outputDone && <span className="ml-0.5 inline-block w-2 animate-pulse text-brand">▍</span>}
            </div>
          </section>

          <section className="rounded-xl border border-brand/25 bg-brand-tint p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-brand-ink">
              <span>📝</span> フィードバック
            </h3>

            {!feedback && (
              <p className="text-sm leading-7 text-ink-500">
                <span className="mr-1 inline-block animate-pulse">⏳</span> 師範が添削中…（成果物を先に読んでお待ちください）
              </p>
            )}

            {feedback && (
              <>
                {feedback.scores.length > 0 && (
                  <div className="mb-3 rounded-xl border border-line bg-white p-3.5">
                    <Scores items={feedback.scores} />
                  </div>
                )}

                {feedback.good.length > 0 && <FbList title="良かった点" color="text-brand-ink" items={feedback.good} />}
                {feedback.improve.length > 0 && (
                  <FbList title="さらに良くするヒント" color="text-warnink" items={feedback.improve} />
                )}

                {feedback.rewrite && (
                  <details className="rounded-xl border border-line bg-white p-3.5">
                    <summary className="cursor-pointer text-sm font-bold text-ink">お手本を見る</summary>
                    <div className="mt-2">
                      <div className="mb-2 flex justify-end">
                        <CopyBtn text={feedback.rewrite} label="お手本をコピー" />
                      </div>
                      <Markdown text={feedback.rewrite} />
                      <SelfCheck key={feedback.rewrite} labels={focalLabels} />
                    </div>
                  </details>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

// お手本後の自己チェック(1タップ・採点しない — 問題設計ガイド §2A)
function SelfCheck({ labels }: { labels: string[] }) {
  const [picked, setPicked] = useState<string | null>(null);
  const SAME = "ほぼ同じだった";
  return (
    <div className="mt-3 rounded-xl bg-paper px-3.5 py-3">
      <p className="text-xs font-bold text-ink-700">自己チェック（1タップ）: お手本とくらべて、あなたの指示に足りなかったものは？</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {[...labels, SAME].map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setPicked(l)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
              picked === l ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-white text-ink-700"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      {picked && (
        <p className="mt-2 text-xs leading-5 text-ink-700">
          {picked === SAME
            ? "その調子です！ 型が身についてきています。"
            : `「${picked}」に自分で気づけたのが今日の収穫です。次の問題でひとこと足してみましょう。`}
        </p>
      )}
    </div>
  );
}

// お題を読み取り専用で表示。{{blank}} は、入力済みなら水色ハイライト、未入力なら記入スロット。
function OdaiPreview({
  template,
  values,
  blanks,
}: {
  template: string;
  values: Record<string, string>;
  blanks: ExerciseBlank[];
}) {
  const labelById: Record<string, string> = {};
  blanks.forEach((b) => (labelById[b.id] = b.label.split(/[（(]/)[0]));
  const parts = template.split(/(\{\{\w+\}\})/g);
  return (
    <div className="mt-2 whitespace-pre-wrap rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] leading-7 text-ink-700">
      {parts.map((seg, i) => {
        const m = seg.match(/^\{\{(\w+)\}\}$/);
        if (!m) return <span key={i}>{seg}</span>;
        const id = m[1];
        const v = (values[id] ?? "").trim();
        return v ? (
          <mark key={i} className="rounded bg-brand-soft px-1 font-medium not-italic text-brand-ink">
            {v}
          </mark>
        ) : (
          <span key={i} className="rounded bg-paper px-1.5 text-xs text-ink-400">
            （{labelById[id] ?? "ここ"}を記入）
          </span>
        );
      })}
    </div>
  );
}

function CopyBtn({ text, label = "コピー" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* クリップボード不可の環境では何もしない */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-brand-ink transition active:scale-95"
    >
      {done ? "✓ コピー済" : `⧉ ${label}`}
    </button>
  );
}

function PasteBtn({ onPaste }: { onPaste: (t: string) => void }) {
  async function paste() {
    try {
      const t = await navigator.clipboard.readText();
      if (t && t.trim()) onPaste(t);
    } catch {
      alert("自動で貼り付けできませんでした。入力欄を長押しして貼り付けてください。");
    }
  }
  return (
    <button
      type="button"
      onClick={paste}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-brand-ink transition active:scale-95"
    >
      ⎘ 貼り付け
    </button>
  );
}

function GivenBlock({
  label,
  body,
  tone,
  copy = false,
}: {
  label: string;
  body: string;
  tone: "warn" | "plain";
  copy?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${tone === "warn" ? "border-warnink/20 bg-warnsoft" : "border-line bg-white"}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className={`text-xs font-bold tracking-wide ${tone === "warn" ? "text-warnink" : "text-ink-500"}`}>{label}</p>
        {copy && <CopyBtn text={body} />}
      </div>
      <div className="whitespace-pre-wrap text-sm leading-7 text-ink-700">{body}</div>
    </div>
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
