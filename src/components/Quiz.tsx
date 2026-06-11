"use client";

import { useState } from "react";
import type { Quiz as QuizType } from "@/lib/types";

export function Quiz({ quiz, onAnswered }: { quiz: QuizType; onAnswered?: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === quiz.answerIndex;

  function pick(i: number) {
    if (answered) return;
    setPicked(i);
    onAnswered?.();
  }

  return (
    <div className="space-y-3">
      <p className="text-[15px] font-bold leading-7 text-ink">{quiz.question}</p>
      <div className="space-y-2">
        {quiz.options.map((opt, i) => {
          const isAnswer = i === quiz.answerIndex;
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
              className={`block w-full rounded-xl border px-3.5 py-3 text-left text-sm leading-7 text-ink-700 transition ${cls}`}
            >
              {opt}
              {answered && isAnswer && <span className="ml-2 font-bold text-brand-ink">✓ 正解</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div
          className={`rounded-xl px-4 py-3 text-sm leading-7 ${
            correct ? "bg-brand-soft text-ink-700" : "bg-paper text-ink-700"
          }`}
        >
          <span className="font-bold">{correct ? "正解！ " : "解説: "}</span>
          {quiz.explanation}
        </div>
      )}
    </div>
  );
}
