// ストリーミング版 /api/exercise の動作確認(NDJSON: delta → output → feedback)
const body = {
  week: 1,
  day: 1,
  instruction:
    "取引先A社の部品納入が1週間遅れる件(原因は先方工場の設備トラブル、代替案は調整中)で、佐藤部長へのメールの下書きを作ってください。結論から、200字程度で。\nこのメールで部長にしてほしいこと: 今日中に、調整中の代替案でよいか判断してほしい",
  inputs: [{ label: "目的(部長にしてほしいこと)", text: "今日中に、調整中の代替案でよいか判断してほしい" }],
};

const res = await fetch("http://localhost:3000/api/exercise", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

console.log("status:", res.status, "| content-type:", res.headers.get("content-type"));
if (!res.ok || (res.headers.get("content-type") ?? "").includes("application/json")) {
  console.log("JSON応答:", await res.text());
  process.exit(1);
}

const reader = res.body.getReader();
const dec = new TextDecoder();
let buf = "";
let deltaCount = 0;
let firstDeltaAt = null;
let outputText = null;
let feedback = null;
const t0 = Date.now();
const order = [];

for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    const ev = JSON.parse(line);
    if (ev.type === "delta") {
      if (deltaCount === 0) {
        firstDeltaAt = Date.now() - t0;
        order.push("delta(初回)");
      }
      deltaCount++;
    } else {
      order.push(ev.type);
      if (ev.type === "output") outputText = ev.text;
      if (ev.type === "feedback") feedback = ev.feedback;
      if (ev.type === "error") console.log("error:", ev.message);
    }
  }
}

console.log("イベント順:", order.join(" → "), `(delta計${deltaCount}件)`);
console.log("初回delta到達:", firstDeltaAt, "ms / 全体:", Date.now() - t0, "ms");
console.log("--- output(先頭120字) ---");
console.log((outputText ?? "(なし)").slice(0, 120));
console.log("装飾記号**残存:", outputText?.includes("**") ?? false);
console.log("--- feedback ---");
console.log("scores:", JSON.stringify(feedback?.scores));
console.log("good:", feedback?.good?.length, "improve:", feedback?.improve?.length);
console.log("rewrite:", feedback?.rewrite);
const rw = feedback?.rewrite ?? "";
console.log("依頼形(プロンプト)か:", /(ください|ほしい|書いて|作って|お願い)/.test(rw), "/ メール本文っぽさ(件名・拝啓):", /(件名|拝啓|お世話になって)/.test(rw));
console.log("【】ラベル混入:", /【.+】/.test(rw));
