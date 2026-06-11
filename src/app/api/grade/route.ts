import { NextRequest, NextResponse } from "next/server";
import { getClient, hasApiKey, MODEL_GRADE, parseJsonReply, clampScore } from "@/lib/anthropic";
import { getWeek } from "@/lib/curriculum";
import type { GradeResult, RubricAxis } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function textOf(msg: { content: Array<{ type: string; text?: string }> }): string {
  return msg.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");
}

const AXES: RubricAxis[] = ["purpose", "context", "constraints", "format"];

export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が未設定です。.env.local に設定して再起動してください(.env.example 参照)。" },
      { status: 503 },
    );
  }

  let body: { week?: number; instruction?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です。" }, { status: 400 });
  }

  const { week, instruction } = body;
  if (!instruction || instruction.trim().length < 10) {
    return NextResponse.json({ error: "提出する指示文が短すぎます。もう少し書いてから提出してください。" }, { status: 400 });
  }
  if (instruction.length > 6000) {
    return NextResponse.json({ error: "入力が長すぎます(6000字以内)。" }, { status: 400 });
  }

  const wk = typeof week === "number" ? getWeek(week) : undefined;
  const rubricNote = wk?.weekend.rubricNote ?? "目的・背景・制約・出力形式の4軸で採点します。";
  const taskBrief = wk?.weekend.brief ?? "";

  const client = getClient();

  try {
    const msg = await client.messages.create({
      model: MODEL_GRADE,
      max_tokens: 1300,
      system:
        "あなたは前向きで親身な『プロンプト道場』の添削者です。学習者のやる気を引き出すことを最優先に、提出された『AIへの指示文』を4軸で採点します(成果物ではなく、指示文そのものの質)。\n" +
        "軸: purpose 目的の明確さ / context 文脈(背景・読み手) / constraints 制約 / format 出力形式。各軸 0〜3点。\n" +
        "目安: 0=欠けている / 1=あるが弱い / 2=具体的で良い / 3=とても良い。きちんと書けていれば 2〜3 を惜しまず付ける(満点を恐れない)。1以下は本当に曖昧・欠落のときだけ。\n" +
        "【大切】指示は『過不足なく簡潔』が理想。小さなタスク(例:5〜6行のメール)には短い指示で十分で、短くても要点を押さえていれば高得点。タスクに不釣り合いに長い・細かすぎる指示はむしろ良くないので満点にしない。\n" +
        `採点で特に見る点: ${rubricNote}\n` +
        "good(良い点)は必ず1つ以上、具体的に褒める。improve(さらに良くするヒント)は最大2つまで、決して責めず『こうするともっと良くなる』という前向きな言い方で。『もっと足せ』と量を求めない。rewrite(お手本)は本人の意図を活かしつつ、その課題に見合った自然な長さ(小タスクなら2〜4行)に簡潔にまとめる。\n" +
        "出力はJSONのみ。形式:\n" +
        '{"scores":{"purpose":0,"context":0,"constraints":0,"format":0},"good":["..."],"improve":["..."],"rewrite":"..."}',
      messages: [
        {
          role: "user",
          content:
            (taskBrief ? `=== 課題 ===\n${taskBrief}\n\n` : "") +
            `=== 学習者の提出した指示文 ===\n${instruction}`,
        },
        { role: "assistant", content: "{" },
      ],
    });

    let parsed: GradeResult;
    try {
      parsed = parseJsonReply<GradeResult>(textOf(msg as any));
    } catch {
      return NextResponse.json({ error: "添削結果の解析に失敗しました。もう一度お試しください。" }, { status: 502 });
    }

    const scores = {} as Record<RubricAxis, number>;
    AXES.forEach((a) => {
      scores[a] = clampScore((parsed.scores as any)?.[a]);
    });
    const sum = AXES.reduce((s, a) => s + scores[a], 0);
    const totalPct = Math.round((sum / (AXES.length * 3)) * 100);
    const pass = totalPct >= 70 && AXES.every((a) => scores[a] >= 1);

    const result: GradeResult = {
      scores,
      totalPct,
      pass,
      good: Array.isArray(parsed.good) ? parsed.good.slice(0, 5) : [],
      improve: Array.isArray(parsed.improve) ? parsed.improve.slice(0, 5) : [],
      rewrite: typeof parsed.rewrite === "string" ? parsed.rewrite : "",
    };
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err?.status === 429 ? 429 : err?.status === 529 ? 529 : 500;
    const m =
      status === 429
        ? "アクセスが集中しています。少し待って再試行してください。"
        : status === 529
          ? "AI側が一時的に過負荷です。少し待って再試行してください。"
          : "添削の呼び出しに失敗しました。APIキーや通信状況をご確認ください。";
    return NextResponse.json({ error: m }, { status });
  }
}
