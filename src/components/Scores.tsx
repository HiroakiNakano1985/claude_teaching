function Dots({ score }: { score: number }) {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < score ? "bg-brand" : "bg-line"}`} aria-hidden />
      ))}
    </span>
  );
}

// 評価軸は演習ごとに動的(週1=4点セット / 週3=修正の質 など)。
export function Scores({ items }: { items: { label: string; score: number }[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-700">{it.label}</span>
          <div className="flex items-center gap-2">
            <Dots score={it.score} />
            <span className="w-8 text-right text-sm font-bold text-ink">{it.score}/3</span>
          </div>
        </div>
      ))}
    </div>
  );
}
