async function run(label, body){
  const res=await fetch("http://localhost:3000/api/exercise",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!res.ok||(res.headers.get("content-type")??"").includes("application/json")){console.log(label,"JSON:",await res.text());return;}
  const r=res.body.getReader();const d=new TextDecoder();let buf="",out="",fb=null;
  for(;;){const{done,value}=await r.read();if(done)break;buf+=d.decode(value,{stream:true});let nl;
    while((nl=buf.indexOf("\n"))>=0){const l=buf.slice(0,nl).trim();buf=buf.slice(nl+1);if(!l)continue;
      const e=JSON.parse(l);if(e.type==="output")out=e.text;if(e.type==="feedback")fb=e.feedback;}}
  console.log("\n=== "+label+" ===");
  console.log("scores:",JSON.stringify(fb?.scores));
  console.log("good:",fb?.good?.[0]);
  console.log("improve:",fb?.improve?.[0]);
  console.log("お手本:",fb?.rewrite);
  console.log("依頼形:", /(ください|して|確認|見て|検討|疑|分析)/.test(fb?.rewrite??""), "/【】混入:", /【.+】/.test(fb?.rewrite??""));
}
// 9-4 一括委任(2軸)
await run("週9-4 一括委任", {week:9,day:4,
  instruction:"①5人の進捗を項目別に集約し、②予定比でマイナスの項目を抽出、③上司向けに『全体状況→要対応→依頼』の順で200字のメールに。数字が無い項目は[要確認]。",
  inputs:[{label:"一括委任の指示",text:"①5人の進捗を項目別に集約し、②予定比でマイナスの項目を抽出、③上司向けに『全体状況→要対応→依頼』の順で200字のメールに。数字が無い項目は[要確認]。"}]});
// 10-4 交絡を疑う revise(2軸)。良い修正指示
await run("週10-4 交絡(revise・良い例)", {week:10,day:4,
  instruction:"結論を出す前に、大宮店の営業月数(3ヶ月)・人口・業態など他の要因を確認して。新店や商圏の小ささが原因の可能性も検討し、断定は避けて『可能性』で書いて。",
  inputs:[{label:"交絡を疑わせ、断定を避けさせる修正指示",text:"結論を出す前に、大宮店の営業月数(3ヶ月)・人口・業態など他の要因を確認して。新店や商圏の小ささが原因の可能性も検討し、断定は避けて『可能性』で書いて。"}]});
// 10-4 弱い例: 交絡に触れず断定もそのまま → improve で交絡を促すか
await run("週10-4 交絡(revise・弱い例)", {week:10,day:4,
  instruction:"もっと丁寧な言い方に直して。",
  inputs:[{label:"交絡を疑わせ、断定を避けさせる修正指示",text:"もっと丁寧な言い方に直して。"}]});
