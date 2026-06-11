import Anthropic from "@anthropic-ai/sdk";

// サーバー側専用。ANTHROPIC_API_KEY は環境変数からのみ読み、クライアントには露出しない。
// 設計書 §3.2「APIキーはサーバ側のみ」/ §3.3 モデルルーティング(実行=Sonnet / 採点=Haiku)に対応。

export const MODEL_EXECUTE = process.env.MODEL_EXECUTE || "claude-sonnet-4-6";
export const MODEL_GRADE = process.env.MODEL_GRADE || "claude-haiku-4-5-20251001";

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY が未設定です。.env.local に設定してください。");
  }
  if (!client) {
    // SDK 標準の指数バックオフ・自動リトライを有効化(§3.2 運用ベストプラクティス)
    client = new Anthropic({ maxRetries: 2 });
  }
  return client;
}

// アシスタント側を "{" で先頭プリフィルし、JSON のみを返させてから安全にパースする。
export function parseJsonReply<T>(raw: string): T {
  const text = raw.trim();
  const body = text.startsWith("{") ? text : "{" + text;
  // 末尾に余計な文字が付くケースに備え、最後の "}" までを採用
  const end = body.lastIndexOf("}");
  const sliced = end >= 0 ? body.slice(0, end + 1) : body;
  return JSON.parse(sliced) as T;
}

export function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(3, Math.round(v)));
}
