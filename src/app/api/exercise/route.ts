import { NextRequest, NextResponse } from "next/server";
import { getClient, hasApiKey, MODEL_EXECUTE, MODEL_GRADE, parseJsonReply, clampScore } from "@/lib/anthropic";
import { getLesson } from "@/lib/curriculum";
import { AXIS_LABEL, type Criterion, type CriterionScore, type ExerciseFeedback } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOUR: Criterion[] = [
  { key: "purpose", label: AXIS_LABEL.purpose },
  { key: "context", label: AXIS_LABEL.context },
  { key: "constraints", label: AXIS_LABEL.constraints },
  { key: "format", label: AXIS_LABEL.format },
];

function textOf(msg: { content: Array<{ type: string; text?: string }> }): string {
  return msg.content.filter((b) => b.type === "text" && typeof b.text === "string").map((b) => b.text as string).join("");
}

// メール等の成果物に紛れるマークダウン装飾(** や 見出しの #)や、スマホで横にはみ出す
// 区切り線(──── / ---- / ==== / ーーー 等)を除去し、プレーンな文章にする。
function toPlain(s: string): string {
  return s
    .replace(/\*\*/g, "")
    .replace(/(^|\n)#{1,6}[ \t]+/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    // 罫線だけの行(横スクロールの原因)を削除
    .replace(/^[ \t]*[-—―─‒–_=＝ー－﹣•・*~＿]{3,}[ \t]*$/gm, "")
    // 行中に紛れた長い区切り連続も除去
    .replace(/[-—―─‒–_=＝ー－﹣]{6,}/g, "")
    // 連続した空行を1つに圧縮
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が未設定です。.env.local に設定して再起動してください(.env.example 参照)。" },
      { status: 503 },
    );
  }

  let body: { week?: number; day?: number; instruction?: string; inputs?: Array<{ label?: string; text?: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です。" }, { status: 400 });
  }

  const { week, day, instruction } = body;
  const inputs = Array.isArray(body.inputs)
    ? body.inputs.filter((i) => i && typeof i.text === "string" && i.text.trim().length > 0)
    : [];
  if (!instruction || instruction.trim().length < 4) {
    return NextResponse.json({ error: "入力が短すぎます。空欄を埋めてから実行してください。" }, { status: 400 });
  }
  if (instruction.length > 4000) {
    return NextResponse.json({ error: "入力が長すぎます(4000字以内)。" }, { status: 400 });
  }

  const lesson = typeof week === "number" && typeof day === "number" ? getLesson(week, day) : undefined;
  const ex = lesson?.exercise;
  const mode = ex?.mode ?? "compose";
  // この問題で「書かせる軸」= focal軸(exercise.axes か criteria)。採点はこのfocal軸だけ。
  const criteria =
    ex?.criteria && ex.criteria.length
      ? ex.criteria
      : ex?.axes && ex.axes.length
        ? ex.axes.map((a) => ({ key: a, label: AXIS_LABEL[a] }))
        : FOUR;
  const labels = criteria.map((c) => c.label);
  const multi = labels.length >= 2;
  const focus = ex?.focus ?? "初見でも意図が正しく伝わる、自然で簡潔な指示を書く力";

  const client = getClient();

  // ① 実行(ライブ)。revise=元の出力に修正を適用 / compose・rewrite=その指示/プロンプトを実行
  const execMessages =
    mode === "revise" && ex?.given
      ? {
          system:
            "あなたは有能な日本語の業務アシスタントです。『元の出力』を、ユーザーの『修正指示』に従って改善版に書き直してください。改善版の本文だけを返し、前置き・説明は不要です。装飾記号(** や # などのマークダウン)や区切り線(──── / ---- / ==== / ーーー 等の横罫線)は使わず、そのまま貼って使えるプレーンな文章で出力してください。",
          content: `【元の出力】\n${ex.given}\n\n【修正指示】\n${instruction}`,
        }
      : {
          system:
            "あなたは有能な日本語の業務アシスタントです。ユーザーの指示に忠実に従い、成果物だけを出力してください。前置き・言い訳・補足説明は不要です。装飾記号(** や # などのマークダウン)や区切り線(──── / ---- / ==== / ーーー 等の横罫線)は使わず、そのまま貼って使えるプレーンな文章で出力してください。",
          content: instruction,
        };

  // ② フィードバック(励まし基調・動的な評価軸)
  const ctx =
    mode === "revise" && ex?.given
      ? `\n\n（参考：直す対象だった元の出力）\n${ex.given}`
      : mode === "rewrite" && ex?.givenPrompt
        ? `\n\n（参考：書き直す前の弱いプロンプト）\n${ex.givenPrompt}`
        : "";
  const evalTargetLabel =
    mode === "revise" ? "あなたが書いた修正指示" : mode === "rewrite" ? "あなたが書き直したプロンプト" : "あなたが書いた指示";
  const wrote = inputs.length > 0 ? inputs.map((i) => `- ${i.label ?? ""}: ${i.text}`).join("\n") : instruction;

  try {
    // 添削は先に投げておき、実行はストリーミングで流す(白画面を作らない — 問題設計ガイド §4A)
    const fbPromise = client.messages.create({
      model: MODEL_GRADE,
      max_tokens: 1200,
      system:
          "あなたは前向きで親身な日本語の『指示出し』コーチです。学習者のやる気を引き出すことを最優先に、学習者が『実際に入力した内容』だけを評価します。\n" +
          `この演習で鍛える力: ${focus}\n` +
          "次の観点だけを0〜3で採点する: " + labels.map((l) => `「${l}」`).join(" / ") + "。scoresにはこの観点だけを含め、これ以外の観点(指示されていない軸)は一切出さないこと。\n" +
          "★各観点は、学習者が実際に入力した文章だけで判断する。場面説明・テンプレートの固定文・例文・修正対象の出力は採点材料にしない(学習者が書いていない物を褒めない)。\n" +
          "目安: 1=あるが弱い / 2=具体的で良い / 3=とても良い。きちんと書けていれば2〜3を惜しまず付ける(満点を恐れない)。\n" +
          (multi ? "スマホ入力ゆえ、求めた観点の一部に触れていない場合は、0や1ではなく2点(減点1のみ)とする。\n" : "") +
          "【大切】指示は『過不足なく簡潔』が理想。短くても要点を押さえていれば高得点。長い・細かすぎる指示は満点にしない。\n" +
          "good(良い点)は必ず1つ以上、具体的に褒める。improve(さらに良くするヒント)は最大2つまで、前向きに。『もっと足せ』と量を求めず本当に効く1点だけ。完成度が高ければ空でよい。\n" +
          "【事実に忠実に】good/improveは、学習者の指示が“実際に行う変更”だけを根拠にする。場面や元の出力に含まれる固有名詞・氏名・電話番号・各種番号などの識別情報のうち、学習者の指示が明示的に『消す/別の名前や記号に置き換える』と書いていない項目を、『消えている』『除去できている』と書いてはいけない(指示が触れていなければ、その情報はまだ残っている)。残っている識別情報があれば、improveで『◯◯(例:氏名)も削除またはダミー化しましょう』と具体名で促す。学習者が書いていない成果(消えた・直った等)を事実であるかのように褒めない。\n" +
          "rewrite(お手本)は『AIに渡す指示文(プロンプト)』のお手本であって、AIが作る成果物(メール本文や文章そのもの)ではない。必ず『〜なメールを書いて』『〜と伝えるメールを作って』のようにAIへの依頼の形にすること(完成したメール本文を書いてはいけない)。実際の人がスマホでサッと打つような自然で短い1〜2文にし、【】や項目ラベル・箇条書き記号は使わず、ふつうの話し言葉で書く(4点セットは頭の中のチェックリストであって書式ではない)。お題の状況と矛盾させず、長々と書かない。\n" +
          "出力はJSONのみ。scoresのlabelは観点名を一字一句そのまま使う。形式:\n" +
          '{"scores":[{"label":"観点名","score":2}],"good":["..."],"improve":["..."],"rewrite":"..."}',
        messages: [
          {
            role: "user",
            content:
              `タスクの場面: ${ex?.scenario ?? "(指定なし)"}\n\n` +
              (mode === "compose" ? `お題(状況。お手本を自然に書くための参考。これ自体は採点しない):\n${instruction}\n\n` : "") +
              `評価対象（${evalTargetLabel}。この入力内容だけを採点・コメントする）:\n${wrote}` + ctx,
          },
          { role: "assistant", content: "{" },
      ],
    });
    fbPromise.catch(() => {}); // 実行側より先に失敗しても未処理拒否にしない(後段で改めてawaitする)

    // NDJSONストリーム: {type:"delta"} → {type:"output"} → {type:"feedback"}(失敗時は {type:"error"})
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

        // ① 実行(ライブ・ストリーミング)
        try {
          const execStream = client.messages.stream({
            model: MODEL_EXECUTE,
            max_tokens: 800,
            system: execMessages.system,
            messages: [{ role: "user", content: execMessages.content }],
          });
          let raw = "";
          for await (const ev of execStream) {
            if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
              raw += ev.delta.text;
              send({ type: "delta", text: ev.delta.text });
            }
          }
          send({ type: "output", text: toPlain(raw) });
        } catch (err) {
          send({ type: "error", message: apiErrorMessage(err) });
        }

        // ② フィードバック(出来しだい差し込む)
        let feedback: ExerciseFeedback;
        try {
          const fbMsg = await fbPromise;
          const parsed = parseJsonReply<{ scores?: Array<{ label?: string; score?: unknown }>; good?: string[]; improve?: string[]; rewrite?: string }>(
            textOf(fbMsg as any),
          );
          const scores: CriterionScore[] = Array.isArray(parsed.scores)
            ? parsed.scores
                .map((s) => ({ label: String(s?.label ?? "").trim(), score: clampScore(s?.score) }))
                .filter((s) => s.label.length > 0)
            : [];
          feedback = {
            scores,
            good: Array.isArray(parsed.good) ? parsed.good.slice(0, 5) : [],
            improve: Array.isArray(parsed.improve) ? parsed.improve.slice(0, 3) : [],
            rewrite: typeof parsed.rewrite === "string" ? parsed.rewrite : "",
          };
        } catch {
          feedback = { scores: [], good: [], improve: ["フィードバックの取得に失敗しました。もう一度お試しください。"], rewrite: "" };
        }
        send({ type: "feedback", feedback });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" },
    });
  } catch (err: any) {
    const status = err?.status === 429 ? 429 : err?.status === 529 ? 529 : 500;
    return NextResponse.json({ error: apiErrorMessage(err) }, { status });
  }
}

function apiErrorMessage(err: unknown): string {
  const status = (err as { status?: number })?.status;
  if (status === 429) return "アクセスが集中しています。少し待って再試行してください。";
  if (status === 529) return "AI側が一時的に過負荷です。少し待って再試行してください。";
  return "AIの呼び出しに失敗しました。APIキーや通信状況をご確認ください。";
}
