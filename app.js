const defaults = {
  weights: { reliability: 3, quality: 2, cost: 1 },
  memories: [
    { id:"M-144", enabled:true, supplier:"Supplier A", dimension:"reliability", effect:-8, confidence:.98, source:"shipping-api:event-881", text:"Supplier A missed a critical delivery deadline by four days." },
    { id:"M-928", enabled:true, supplier:"Supplier B", dimension:"quality", effect:2.5, confidence:.90, source:"qa-report:q3", text:"Supplier B's defect rate improved substantially over the last quarter." },
    { id:"M-411", enabled:true, supplier:"Supplier B", dimension:"reliability", effect:1, confidence:.95, source:"erp:shipment-1902", text:"A previous Supplier B shipment arrived early during a stockout." },
    { id:"M-210", enabled:true, supplier:"Supplier A", dimension:"cost", effect:1.5, confidence:1, source:"quote:2026-09-14", text:"Supplier A offered a modest price discount." }
  ]
};

const observations = {
  "Supplier A": { reliability:7, quality:8, cost:9 },
  "Supplier B": { reliability:8, quality:8, cost:7 }
};

let state = JSON.parse(JSON.stringify(defaults));
let lastDNA = null;
let runCounter = 1;

const $ = s => document.querySelector(s);
const memoryList = $("#memoryList");
const weightEls = {
  reliability: $("#reliabilityWeight"),
  quality: $("#qualityWeight"),
  cost: $("#costWeight")
};

function renderMemories(){
  memoryList.innerHTML = "";
  state.memories.forEach((m,i)=>{
    const el = document.createElement("label");
    el.className = "memory";
    el.innerHTML = `
      <input type="checkbox" ${m.enabled ? "checked":""} data-index="${i}">
      <div><b>${m.id} · ${m.text}</b><p>${m.source}</p></div>
      <code>${m.confidence.toFixed(2)}</code>`;
    memoryList.appendChild(el);
  });
  memoryList.querySelectorAll("input").forEach(input=>{
    input.addEventListener("change",e=>{
      state.memories[+e.target.dataset.index].enabled = e.target.checked;
    });
  });
}

function bindWeights(){
  Object.entries(weightEls).forEach(([key,el])=>{
    const output = $("#"+key+"Output");
    const sync = ()=>{ state.weights[key]=+el.value; output.textContent=(+el.value).toFixed(1)+"×"; };
    el.addEventListener("input",sync); sync();
  });
}

function decide(memories){
  const scores = {"Supplier A":0,"Supplier B":0};
  for(const supplier of Object.keys(observations)){
    for(const [dim,val] of Object.entries(observations[supplier])){
      scores[supplier] += val * state.weights[dim];
    }
  }
  for(const m of memories){
    scores[m.supplier] += m.effect*m.confidence*state.weights[m.dimension];
  }
  const action = Object.keys(scores).sort((a,b)=>scores[b]-scores[a] || a.localeCompare(b))[0];
  return {action,scores};
}

function hashString(str){
  let h1=0xdeadbeef^str.length,h2=0x41c6ce57^str.length;
  for(let i=0,ch;i<str.length;i++){
    ch=str.charCodeAt(i);
    h1=Math.imul(h1^ch,2654435761); h2=Math.imul(h2^ch,1597334677);
  }
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return ((h2>>>0).toString(16).padStart(8,"0")+(h1>>>0).toString(16).padStart(8,"0")).toUpperCase();
}

function buildDNA(){
  const memories=state.memories.filter(m=>m.enabled);
  const original=decide(memories);
  const candidates=Object.entries(original.scores).sort((a,b)=>b[1]-a[1]);
  const winner=candidates[0][0], runner=candidates[1][0];
  const originalMargin=original.scores[winner]-original.scores[runner];

  const cfs=memories.map(m=>{
    const replay=decide(memories.filter(x=>x.id!==m.id));
    const cfMargin=replay.scores[winner]-replay.scores[runner];
    const effect=originalMargin-cfMargin;
    return {
      removed_memory:m.id, memory_text:m.text, source:m.source,
      original_action:original.action, counterfactual_action:replay.action,
      action_changed:replay.action!==original.action,
      original_margin:+originalMargin.toFixed(4),
      counterfactual_margin_for_original_winner:+cfMargin.toFixed(4),
      causal_margin_effect:+effect.toFixed(4),
      counterfactual_scores:Object.fromEntries(Object.entries(replay.scores).map(([k,v])=>[k,+v.toFixed(4)]))
    };
  });

  const total=cfs.reduce((s,x)=>s+Math.abs(x.causal_margin_effect),0);
  cfs.forEach(x=>x.influence_pct=total?+(Math.abs(x.causal_margin_effect)/total*100).toFixed(2):0);

  const id="D-"+String(runCounter++).padStart(4,"0");
  const dna={
    decision_id:id,
    protocol:"Decision DNA 0.1",
    action:original.action,
    scores:Object.fromEntries(Object.entries(original.scores).map(([k,v])=>[k,+v.toFixed(4)])),
    original_margin:+originalMargin.toFixed(4),
    weights:{...state.weights},
    memories:memories.map(({enabled,...m})=>m),
    counterfactuals:cfs
  };
  dna.causal_fingerprint=hashString(JSON.stringify(dna)).slice(0,16);
  return dna;
}

function renderResults(dna){
  lastDNA=dna;
  $("#emptyState").classList.add("hidden");
  $("#results").classList.remove("hidden");
  $("#recordId").textContent=dna.decision_id;
  $("#decisionName").textContent=dna.action;
  $("#fingerprint").textContent=dna.causal_fingerprint;
  $("#scoreA").textContent=dna.scores["Supplier A"].toFixed(2);
  $("#scoreB").textContent=dna.scores["Supplier B"].toFixed(2);
  $("#margin").textContent=dna.original_margin.toFixed(2);

  const sorted=[...dna.counterfactuals].sort((a,b)=>b.influence_pct-a.influence_pct);
  $("#influenceList").innerHTML=sorted.length?sorted.map(cf=>{
    let cls=cf.action_changed?"pivotal":cf.causal_margin_effect<0?"opposing":"supporting";
    let label=cf.action_changed?"PIVOTAL":cf.causal_margin_effect<0?"OPPOSED WINNER":"SUPPORTED WINNER";
    return `<div class="influence-item">
      <div class="influence-top"><b>${cf.removed_memory} · ${cf.memory_text}</b><span>${cf.influence_pct.toFixed(1)}%</span></div>
      <div class="bar"><i style="width:${Math.max(1,cf.influence_pct)}%"></i></div>
      <div class="influence-foot"><span>${cf.source}</span><strong class="${cls}">${label}</strong></div>
    </div>`;
  }).join(""):`<div class="influence-item"><span>No enabled memories to test.</span></div>`;

  $("#replayList").innerHTML=sorted.map(cf=>`
    <div class="replay">
      <code>− ${cf.removed_memory}</code>
      <span>${cf.original_action} → <strong class="${cf.action_changed?"pivotal":""}">${cf.counterfactual_action}</strong></span>
      <span>margin Δ ${cf.causal_margin_effect>=0?"+":""}${cf.causal_margin_effect.toFixed(2)}</span>
    </div>`).join("");
}

$("#runButton").addEventListener("click",()=>{
  const btn=$("#runButton");
  btn.disabled=true; btn.textContent="RUNNING INTERVENTIONS…";
  setTimeout(()=>{
    renderResults(buildDNA());
    btn.disabled=false; btn.innerHTML='<span class="run-icon">▶</span> RUN COUNTERFACTUAL EXPERIMENT';
  },420);
});

$("#resetButton").addEventListener("click",()=>{
  state=JSON.parse(JSON.stringify(defaults));
  Object.entries(weightEls).forEach(([key,el])=>{el.value=state.weights[key];$("#"+key+"Output").textContent=state.weights[key].toFixed(1)+"×";});
  renderMemories();
  $("#results").classList.add("hidden"); $("#emptyState").classList.remove("hidden"); $("#recordId").textContent="D-0001";
  lastDNA=null; runCounter=1;
});

$("#copyButton").addEventListener("click",async()=>{
  if(!lastDNA) return;
  await navigator.clipboard.writeText(JSON.stringify(lastDNA,null,2));
  const toast=$("#toast");toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),1800);
});

renderMemories(); bindWeights();
