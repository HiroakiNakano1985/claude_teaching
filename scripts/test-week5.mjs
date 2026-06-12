async function run(label, body) {
  const res = await fetch("http://localhost:3000/api/exercise", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok || (res.headers.get("content-type")??"").includes("application/json")) {
    console.log(label, "JSON:", await res.text()); return;
  }
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf="", out="", fb=null;
  for(;;){ const {done,value}=await reader.read(); if(done)break; buf+=dec.decode(value,{stream:true});
    let nl; while((nl=buf.indexOf("\n"))>=0){ const line=buf.slice(0,nl).trim(); buf=buf.slice(nl+1);
      if(!line)continue; const ev=JSON.parse(line); if(ev.type==="output")out=ev.text; if(ev.type==="feedback")fb=ev.feedback; } }
  console.log("\n=== "+label+" ===");
  console.log("scores:", JSON.stringify(fb?.scores));
  console.log("good:", fb?.good?.[0]);
  console.log("rewrite(お手本):", fb?.rewrite);
  console.log("お手本は依頼形:", /(ください|ほしい|して|教えて|まとめて|整えて)/.test(fb?.rewrite??""), "/ 【】混入:", /【.+】/.test(fb?.rewrite??""));
  console.log("出力先頭:", (out??"").slice(0,80).replace(/\n/g," "));
}

// 5-1 ダミーデータ分析(focal=purpose 1軸)
await run("週5-1 データ分析", {
  week:5, day:1,
  instruction:"次の売上データについて、下の問いに答えてください。\n\n店舗 / 今月売上 / 前月比\n渋谷店 / 420万円 / +8%\n新宿店 / 380万円 / -3%\n横浜店 / 510万円 / +15%\n大宮店 / 290万円 / -12%\n千葉店 / 350万円 / +2%\n\n知りたいこと: 前月比がマイナスの店舗の共通点と、立て直しの打ち手を3つ",
  inputs:[{label:"知りたいこと(分析の目的を一言で)", text:"前月比がマイナスの店舗の共通点と、立て直しの打ち手を3つ"}],
});

// 5-2 音声業務記録(facts+format 2軸)
await run("週5-2 音声日報", {
  week:5, day:2,
  instruction:"次の話し言葉のメモを、提出できる日報の形に整えてください。\n\n【今日のメモ】午前A社訪問、見積もり依頼もらった。午後B社電話、来週再提案。C社は見送り連絡あり。\n\n【整える形】訪問先ごとに『結果』と『次のアクション』を分けた箇条書きで。",
  inputs:[
    {label:"今日のメモ(声でOK)", text:"午前A社訪問、見積もり依頼もらった。午後B社電話、来週再提案。C社は見送り連絡あり。"},
    {label:"整える形", text:"訪問先ごとに『結果』と『次のアクション』を分けた箇条書きで。"},
  ],
});
