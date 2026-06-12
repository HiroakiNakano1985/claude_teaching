// 週1 Day6 安全演習。氏名(山田太郎)に触れない修正指示を出し、採点が
// 「実名が消えている」と誤って褒めない(残っていると指摘する)ことを確認する。
const body = {
  week: 1,
  day: 6,
  // わざと氏名の扱いを書かない指示(電話番号と契約番号だけ消す)
  instruction: "電話番号と契約番号は削除して、3行で要約して。",
  inputs: [{ label: "安全にするための修正指示(実名・番号をどう扱う?)", text: "電話番号と契約番号は削除して、3行で要約して。" }],
};

const res = await fetch("http://localhost:3000/api/exercise", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
if (!res.ok || (res.headers.get("content-type") ?? "").includes("application/json")) {
  console.log("JSON応答:", await res.text());
  process.exit(1);
}
const reader = res.body.getReader();
const dec = new TextDecoder();
let buf = "";
let output = "";
let feedback = null;
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
    if (ev.type === "output") output = ev.text;
    if (ev.type === "feedback") feedback = ev.feedback;
  }
}
const allText = JSON.stringify(feedback);
console.log("scores:", JSON.stringify(feedback?.scores));
console.log("good:", feedback?.good);
console.log("improve:", feedback?.improve);
console.log("--- 検証 ---");
const praisesNameRemoval = /(実名|氏名|名前|山田).{0,12}(消え|除去|削除|ダミー|置き換)/.test(
  (feedback?.good ?? []).join("　"),
);
const flagsName = /(実名|氏名|名前|山田)/.test((feedback?.improve ?? []).join("　"));
console.log("good で“氏名が消えた”と誤って褒めている:", praisesNameRemoval, "(false が正)");
console.log("improve で氏名の未処理を指摘:", flagsName, "(true が望ましい)");
console.log("出力に区切り線(──/----/ーーー)が残存:", /[-—―─ー]{4,}/.test(output), "(false が正)");
