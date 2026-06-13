"use client";

// β向けフィードバック導線。NEXT_PUBLIC_FEEDBACK_URL(Googleフォーム等)があればそこへ、
// 無ければ NEXT_PUBLIC_FEEDBACK_EMAIL への mailto: にフォールバック。どちらも無ければ非表示。
// NEXT_PUBLIC_ はビルド時にクライアントへ埋め込まれる(秘密を入れないこと)。

const URL = process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim();
const EMAIL = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL?.trim();

export function feedbackHref(context?: string): string | null {
  if (URL) return URL;
  if (EMAIL) {
    const subject = encodeURIComponent(`プロンプト道場 感想・要望${context ? `(${context})` : ""}`);
    const body = encodeURIComponent(
      "（よかった点・分かりにくかった点・要望など、何でもお書きください）\n\n" +
        (context ? `画面: ${context}\n` : ""),
    );
    return `mailto:${EMAIL}?subject=${subject}&body=${body}`;
  }
  return null;
}

export function FeedbackLink({
  context,
  variant = "inline",
  className = "",
}: {
  context?: string;
  variant?: "inline" | "button";
  className?: string;
}) {
  const href = feedbackHref(context);
  if (!href) return null;

  const external = href.startsWith("http");
  const common = external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  if (variant === "button") {
    return (
      <a href={href} {...common} className={`btn-soft w-full ${className}`}>
        💬 感想・要望を送る（30秒）
      </a>
    );
  }
  return (
    <a
      href={href}
      {...common}
      className={`inline-flex items-center gap-1 text-brand-ink underline underline-offset-2 ${className}`}
    >
      💬 感想・要望を送る
    </a>
  );
}
