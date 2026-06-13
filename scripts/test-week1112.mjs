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
  console.log("お手本:",fb?.rewrite);
  console.log("依頼形:", /(ください|して|答えて|送って|作って|まとめて|提案して)/.test(fb?.rewrite??""), "/【】混入:", /【.+】/.test(fb?.rewrite??""));
  console.log("出力先頭:",(out??"").slice(0,80).replace(/\n/g,"｜"));
}
// 11-1 常設指示(compose・1軸)。常設指示が依頼に効くか
await run("週11-1 常設指示", {week:11,day:1,
  instruction:"【あなたへの常設の指示】\n私は総務担当。社内向け文書は結論から・200字以内・敬語で、専門用語は避ける。日時と締切は必ず明記。\n\nこの前提のもとで、次の依頼に答えてください:\n「来週の部署ミーティングの案内を作って」",
  inputs:[{label:"常設指示(役割・読み手・毎回のルール)",text:"私は総務担当。社内向け文書は結論から・200字以内・敬語で、専門用語は避ける。日時と締切は必ず明記。"}]});
// 12-3 revise 全自動→人の承認(2軸)
await run("週12-3 人の承認(revise)", {week:12,day:3,
  instruction:"集計とアンケート作成までは自動でいい。ただし送信はしないで、下書きを私宛に出して。私が確認・承認してから送る形に変えて。",
  inputs:[{label:"人の承認を残す修正指示",text:"集計とアンケート作成までは自動でいい。ただし送信はしないで、下書きを私宛に出して。私が確認・承認してから送る形に変えて。"}]});
