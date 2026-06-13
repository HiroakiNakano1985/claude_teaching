async function run(label, body) {
  const res = await fetch("http://localhost:3000/api/exercise", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok || (res.headers.get("content-type")??"").includes("application/json")) { console.log(label,"JSON:",await res.text()); return; }
  const reader=res.body.getReader(); const dec=new TextDecoder(); let buf="",out="",fb=null;
  for(;;){ const {done,value}=await reader.read(); if(done)break; buf+=dec.decode(value,{stream:true});
    let nl; while((nl=buf.indexOf("\n"))>=0){ const line=buf.slice(0,nl).trim(); buf=buf.slice(nl+1);
      if(!line)continue; const ev=JSON.parse(line); if(ev.type==="output")out=ev.text; if(ev.type==="feedback")fb=ev.feedback; } }
  console.log("\n=== "+label+" ===");
  console.log("scores:", JSON.stringify(fb?.scores));
  console.log("good:", fb?.good?.[0]);
  console.log("rewrite(お手本):", fb?.rewrite);
  console.log("お手本=依頼形:", /(ください|して|作って|まとめて|整えて|ほしい)/.test(fb?.rewrite??""), "/【】混入:", /【.+】/.test(fb?.rewrite??""));
  console.log("出力先頭:", (out??"").slice(0,90).replace(/\n/g,"｜"));
}

// 6-1 比較表(focal=format 1軸)
await run("週6-1 比較表", {
  week:6, day:1,
  instruction:"次の3案を比較する表を作ってください。\n対象: 来期の販促企画案(SNS広告 / 店頭イベント / メルマガ強化)\n\n受け取りたい表の形: 3案を行、列は『狙う客層』『想定費用』『見込み効果』『リスク』。各セル20字以内。表の下に一言おすすめ。",
  inputs:[{label:"表の構造(行・列・粒度)の指定", text:"3案を行、列は『狙う客層』『想定費用』『見込み効果』『リスク』。各セル20字以内。表の下に一言おすすめ。"}],
});

// 6-4 revise: メモ→報告書(2軸 shape+keep)
await run("週6-4 作り直し(revise)", {
  week:6, day:4,
  instruction:"これを社内向けの導入報告書に。『背景→経過→効果(数字)→今後』の見出しで各2〜3文。事実は変えず、足りない数字は[要確認]と書いて。",
  inputs:[{label:"作り直しの指示(成果物・構成・事実保持)", text:"これを社内向けの導入報告書に。『背景→経過→効果(数字)→今後』の見出しで各2〜3文。事実は変えず、足りない数字は[要確認]と書いて。"}],
});
