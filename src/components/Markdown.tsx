import React from "react";

// 依存なしの最小マークダウン:段落 / 「- 」箇条書き / 連番 / **強調** / 改行。
// 教材の explanation(信頼できる自前テキスト)専用。HTMLは挿入しない。

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={`${keyBase}-b${i}`} className="font-bold text-ink">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={`${keyBase}-t${i}`}>{p}</React.Fragment>;
  });
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.split(/\n\n+/);
  return (
    <div className={`space-y-3 text-[15px] leading-8 text-ink-700 ${className}`}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isBullet = lines.every((l) => l.trim().startsWith("- "));
        if (isBullet) {
          return (
            <ul key={`bk${bi}`} className="list-disc space-y-1 pl-5">
              {lines.map((l, li) => (
                <li key={`bk${bi}-${li}`}>{renderInline(l.replace(/^\s*-\s/, ""), `bk${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`bk${bi}`}>
            {lines.map((l, li) => (
              <React.Fragment key={`bk${bi}-l${li}`}>
                {li > 0 && <br />}
                {renderInline(l, `bk${bi}-${li}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
