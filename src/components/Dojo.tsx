// 道場テーマのイラスト(依存なし・インラインSVG)。
// だるま=願掛け(始めに片目、修了でもう片目)で、12週間の歩みと重なる温かいモチーフ。

export function Daruma({ eyes = 1, className = "" }: { eyes?: 0 | 1 | 2; className?: string }) {
  return (
    <svg viewBox="0 0 100 112" className={className} role="img" aria-label="だるま">
      <ellipse cx="50" cy="107" rx="30" ry="5" fill="rgba(60,40,20,0.08)" />
      {/* 胴体(朱) */}
      <path d="M50 6 C75 6 90 31 90 60 C90 90 73 105 50 105 C27 105 10 90 10 60 C10 31 25 6 50 6 Z" fill="#c75b43" />
      <path d="M50 6 C75 6 90 31 90 60 C90 90 73 105 50 105 C27 105 10 90 10 60 C10 31 25 6 50 6 Z" fill="none" stroke="#a8432f" strokeWidth="1.5" />
      {/* 顔(生成り) */}
      <ellipse cx="50" cy="55" rx="29" ry="32" fill="#f7efe1" />
      {/* ほっぺ */}
      <circle cx="32" cy="63" r="5" fill="#eebfa9" />
      <circle cx="68" cy="63" r="5" fill="#eebfa9" />
      {/* 眉(鶴) */}
      <path d="M28 41 q9 -8 18 -2" stroke="#2a2622" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M72 41 q-9 -8 -18 -2" stroke="#2a2622" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {/* 目(願掛け:片目→両目) */}
      {eyes >= 1 ? (
        <ellipse cx="41" cy="53" rx="4.6" ry="6.2" fill="#2a2622" />
      ) : (
        <ellipse cx="41" cy="53" rx="4.6" ry="6.2" fill="#fff" stroke="#2a2622" strokeWidth="1.6" />
      )}
      {eyes >= 2 ? (
        <ellipse cx="59" cy="53" rx="4.6" ry="6.2" fill="#2a2622" />
      ) : (
        <ellipse cx="59" cy="53" rx="4.6" ry="6.2" fill="#fff" stroke="#2a2622" strokeWidth="1.6" />
      )}
      {/* 口ひげ(亀) */}
      <path d="M43 62 q7 7 14 0" stroke="#2a2622" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// 朱印(ハンコ)スタンプ。修了・合格の表現に。
// size="xl" + slam で、完了時の「ドン」と押し込む大判演出。
export function Seal({
  char,
  size = "md",
  slam = false,
  className = "",
}: {
  char: string;
  size?: "md" | "xl";
  slam?: boolean;
  className?: string;
}) {
  const single = char.length <= 1;
  const xl = size === "xl";
  const box = xl ? "h-36 w-36 rounded-3xl border-4" : "h-20 w-20 rounded-2xl border-[3px]";
  const text = xl
    ? single
      ? "text-[5.5rem]"
      : "text-4xl tracking-tight"
    : single
      ? "text-[2.6rem]"
      : "text-xl tracking-tight";
  return (
    <div className={`relative inline-grid -rotate-6 place-items-center ${slam ? "animate-stamp-slam" : "animate-stamp-in"} ${className}`}>
      <div className={`grid place-items-center bg-white/60 border-brand ${box}`}>
        <span className={`font-brush font-bold leading-none text-brand ${text}`}>{char}</span>
      </div>
      <span className={`pointer-events-none absolute rounded-xl border border-brand/40 ${xl ? "inset-2.5" : "inset-[6px]"}`} />
    </div>
  );
}
