import './style.css';

(()=>{
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait=ms=>new Promise(r=>setTimeout(r,RM?Math.min(ms,40):ms));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SVGNS='http://www.w3.org/2000/svg';
function sv(tag,attrs,parent){const e=document.createElementNS(SVGNS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e}
function presetGroup(sel,cb){const g=$(sel);g.addEventListener('click',e=>{const b=e.target.closest('.preset');if(!b)return;g.querySelectorAll('.preset').forEach(x=>x.setAttribute('aria-pressed',x===b));cb(b)})}
function toggle(sel,cb){const b=$(sel);b.addEventListener('click',()=>{const v=b.getAttribute('aria-checked')!=='true';b.setAttribute('aria-checked',v);cb(v)});return b}
function stepper(minus,plus,out,min,max,init,cb){let v=init;const r=()=>{$(out).textContent=`[ ${v} ]`;$(minus).disabled=v<=min;$(plus).disabled=v>=max;cb(v)};$(minus).onclick=()=>{if(v>min){v--;r()}};$(plus).onclick=()=>{if(v<max){v++;r()}};r();return{get:()=>v,set:x=>{v=x;r()}}}
function axis(input,val,fmt,cb){const i=$(input),o=$(val);const r=()=>{const p=(i.value-i.min)/(i.max-i.min);o.style.left=`calc(${p*100}% + ${30-60*p}px)`;o.textContent=fmt(+i.value);cb(+i.value)};i.addEventListener('input',r);r()}
function logLine(log,tag,text){const d=document.createElement('div');d.className='log-line';d.innerHTML=`<span class="tag ${tag}">${({think:'think',act:'act',obs:'observe',ans:'answer',err:'error',plan:'plan'})[tag]}</span><span>${text}</span>`;log.appendChild(d)}
// run tokens so a re-run cancels a previous one
const runs={};const begin=k=>(runs[k]=(runs[k]||0)+1);const alive=(k,t)=>runs[k]===t;

/* ===== 01 AGENT ===== */
let aMode='agent';
presetGroup('#s-agent .presets',b=>{aMode=b.dataset.a;paintCaps()});
function paintCaps(){$$('#a-caps .glyph').forEach(g=>g.classList.toggle('on',aMode==='agent'||g.dataset.cap==='think'))}
paintCaps();
const A={
 llm:[['think','The user is creative and likes helping people. Careers in that overlap: UX design, teaching, counseling.'],['think','Training paths I remember: bootcamps for UX, a B.Ed. for teaching, a master’s for counseling.'],['ans','Consider UX design, teaching or counseling. Look into bootcamps and degree programs, and check scholarships. I can’t see current programs, prices or deadlines.']],
 agent:[['think','I should match careers to personality first.'],['act','careers.search({traits:["creative","helping"]})'],['obs','UX designer · teacher · mental health counselor'],['think','Next: training programs for each.'],['act','programs.find({careers:3})'],['obs','UX bootcamp $9,800 · B.Ed. 4 yrs · M.A. counseling 2 yrs'],['act','aid.lookup({programs:3})'],['obs','2 scholarships · 1 grant · federal loans'],['ans','Three career paths, the programs that lead to each with current costs, and the funding you can apply for now.']]
};
$('#a-run').onclick=async()=>{const t=begin('a');const log=$('#a-log');log.innerHTML='';let calls=0,tools=0;$('#a-status').textContent='running';$('#a-live').textContent='—';
 for(const[tag,txt]of A[aMode]){if(!alive('a',t))return;if(tag==='think'||tag==='ans')calls++;if(tag==='act')tools++;logLine(log,tag,esc(txt));$('#a-calls').textContent=calls;$('#a-tools').textContent=tools;await wait(650)}
 $('#a-live').textContent=aMode==='agent'?'yes':'no';$('#a-status').textContent=aMode==='agent'?'done · loop exited when it had enough':'done · one pass, training data only'};

/* ===== 02 TOOLS ===== */
const TOOLS=[{n:'careers.search',api:'career database',w:false,args:{traits:['creative','helping']},res:'["UX designer","teacher","counselor"]'},{n:'programs.find',api:'education programs',w:false,args:{career:'UX designer'},res:'[{"name":"UX bootcamp","cost":9800}]'},{n:'aid.apply',api:'financial aid portal',w:true,args:{scholarship:'Design Futures',applicant:'user'},res:'{"status":"submitted"}'}];
let tTool=0,tClient='Claude',tWrite=false;
presetGroup('#t-tools',b=>{tTool=+b.dataset.t;$('#t-api').textContent=TOOLS[tTool].api});
presetGroup('#t-clients',b=>{tClient=b.dataset.c;$('#t-cl').textContent='inside '+tClient});
toggle('#t-write',v=>{tWrite=v;$('#t-write-s').textContent=v?'write allowed · with approval':'read only'});
$('#t-run').onclick=async()=>{const t=begin('t');const nodes=$$('#t-lane .node');nodes.forEach(n=>n.className='node');const T=TOOLS[tTool];const msg=$('#t-msg');
 const req=JSON.stringify({jsonrpc:'2.0',id:7,method:'tools/call',params:{name:T.n,arguments:T.args}},null,2);
 const steps=[[0,`// ${tClient} model emits a tool call\n${T.n}(${JSON.stringify(T.args)})`],[1,`// MCP client → server (same format for any client)\n${req}`],[2,'// server: tool exists? caller allowed?']];
 for(const[i,m]of steps){if(!alive('t',t))return;nodes.forEach((n,j)=>{if(j<i)n.className='node done'});nodes[i].className='node hot';msg.textContent=m;await wait(800)}
 if(T.w&&!tWrite){nodes[2].className='node block';nodes[3].className='node off';msg.textContent=`{"jsonrpc":"2.0","id":7,"error":{"code":-32001,"message":"${T.n} writes data; this client is read-only"}}`;$('#t-verdict').textContent='Blocked at the server. A write tool changes the world (here it would submit an application), so it needs explicit permission. The error still goes back to the model as context.';$('#t-verdict').className='verdict bad';return}
 nodes[2].className='node done';nodes[3].className='node hot';msg.textContent=`// API does the work\nPOST /${T.api.replace(/ /g,'-')}`;await wait(800);if(!alive('t',t))return;
 nodes[3].className='node done';nodes[0].className='node hot';msg.textContent=`// result travels back and lands in the model's context\n{"jsonrpc":"2.0","id":7,"result":{"content":[{"type":"text","text":${JSON.stringify(T.res)}}]}}`;
 $('#t-verdict').className='verdict good';$('#t-verdict').textContent=`Done. Switch the client to ${tClient==='Claude'?'Copilot':'Claude'} and run it again: the message is identical. That’s what the protocol standardizes.`};

/* ===== 03 SKILLS ===== */
const CAP=12000,SYS=1400,CONV=1600,META=70;
const SK=[{id:'report',n:'career-report',full:2600,g:'R'},{id:'aid',n:'scholarship-search',full:2900,g:'S'},{id:'resume',n:'resume-review',full:2200,g:'C'},{id:'forms',n:'aid-forms',full:3100,g:'F'}];
let kMode='skills';
presetGroup('#k-mode',b=>{kMode=b.dataset.m;paintSkills()});
$('#k-task').addEventListener('change',paintSkills);
function paintSkills(){const task=$('#k-task input:checked').value;const need=task==='both'?['report','aid']:task==='none'?[]:[task];
 const loaded=kMode==='all'?SK.map(s=>s.id):need;let used=SYS+CONV;const segs=[['seg-sys',SYS,'system'],['seg-conv',CONV,'conversation']];
 if(kMode==='skills'){used+=META*SK.length;segs.push(['seg-meta',META*SK.length,''])}
 SK.forEach(s=>{if(loaded.includes(s.id)){used+=s.full;segs.push(['seg-skill',s.full,s.n])}});
 const over=used>CAP;const total=Math.max(CAP,used);
 $('#k-meter').innerHTML=segs.map(([c,v,l])=>`<div class="${c}" style="flex:0 0 ${v/total*100}%" title="${l} ${v}">${l}</div>`).join('')+(over?'':`<div style="flex:1 1 auto;border-right:0"></div>`);
 $('#k-free').textContent=over?`${(used-CAP).toLocaleString()} tokens over the limit`:`${used.toLocaleString()} used · ${(CAP-used).toLocaleString()} free`;
 $('#k-skills').innerHTML=SK.map(s=>`<div class="glyph ${loaded.includes(s.id)?'on':''}"><b>${s.g}</b><span>${s.n}<br>${loaded.includes(s.id)?s.full.toLocaleString()+' tok':kMode==='skills'?META+' tok':''}</span></div>`).join('');
 const v=$('#k-verdict');
 if(kMode==='all'){v.className='verdict '+(over?'bad':'');v.textContent=over?'Everything loaded at once overflows the window before the user has asked anything useful.':`Every skill is loaded whether or not the task needs it: ${(SK.reduce((a,s)=>a+s.full,0)).toLocaleString()} tokens of instructions sitting idle.`}
 else{v.className='verdict good';v.textContent=need.length?`Only ${need.length===1?'one skill':'two skills'} loaded in full. The other ${SK.length-need.length} cost ${META} tokens each to stay discoverable.`:`Four skills are available for ${META*SK.length} tokens total. Nothing loads in full until a task matches.`}}
paintSkills();

/* ===== 04 RAG ===== */
const DOCS=['Design Futures scholarship covers up to $5,000 of UX design bootcamp tuition for career changers.','UX design bootcamps typically run 12 to 24 weeks and cost between $8,000 and $15,000.','Federal Pell grants can be used at accredited trade schools and community colleges.','School counselors usually need a master’s degree in counseling and a state license.','Teaching credential programs combine coursework with a semester of student teaching.','Income share agreements let bootcamp students pay tuition as a share of future salary.','Electricians train through four to five year apprenticeships that pay while you learn.','Portfolio reviews are the most common hiring step for junior UX designers.','Many community foundations offer scholarships for adult learners returning to school.','Federal student loans have fixed interest rates set each year by Congress.'];
const STOP=new Set('a an the for of to and or in on at is are be can as with by from you your that this their who what how'.split(' '));
const toks=s=>s.toLowerCase().replace(/[^a-z0-9$ ]/g,' ').split(/\s+/).filter(w=>w&&!STOP.has(w)).map(w=>w.replace(/(ships|ship|s)$/,m=>m==='ships'?'ship':m==='ship'?'ship':''));
let rK=3,rRR=false;
stepper('#r-km','#r-kp','#r-k',1,5,3,v=>rK=v);
toggle('#r-rr',v=>{rRR=v;$('#r-rr-s').textContent=v?'on · second pass':'off'});
function score(q){const qt=toks(q),qs=new Set(qt);return DOCS.map((d,i)=>{const dt=toks(d),ds=new Set(dt);let inter=0;qs.forEach(w=>{if(ds.has(w))inter++});const sim=inter/Math.sqrt(qs.size*ds.size||1);
  let bi=0;for(let j=0;j<qt.length-1;j++){const p=qt[j]+' '+qt[j+1];if(dt.join(' ').includes(p))bi++}
  return{i,d,sim,rr:sim*(1+bi*.8)+(ds.has('scholarship')&&qs.has('scholarship')?.05:0)}})}
$('#r-run').onclick=async()=>{const t=begin('r');const stages=$$('#r-pipe div');const q=$('#r-q').value.trim()||'scholarships';$('#r-hits').innerHTML='';$('#r-verdict').textContent='';
 for(let s=0;s<6;s++){if(!alive('r',t))return;stages.forEach((x,j)=>x.classList.toggle('hot',j===s));
  if(s===4){const sc=score(q).sort((a,b)=>b.sim-a.sim);let list=sc;if(rRR){list=sc.slice(0,6).sort((a,b)=>b.rr-a.rr).concat(sc.slice(6))}
   const max=Math.max(...list.map(x=>x.sim),.01);
   $('#r-hits').innerHTML=list.slice(0,7).map((h,n)=>`<div class="hit ${n<rK&&h.sim>0?'in':''}"><span class="rank">#${n+1}</span><span>${esc(h.d)}</span><span class="bar"><i style="width:0"></i></span></div>`).join('');
   await wait(30);$$('#r-hits .bar i').forEach((b,n)=>b.style.width=(list[n].sim/max*100)+'%')}
  await wait(s===4?900:380)}
 stages.forEach(x=>x.classList.remove('hot'));stages[5].classList.add('hot');
 const inC=$$('#r-hits .hit.in').length;const tk=inC*28;
 $('#r-verdict').className='verdict good';$('#r-verdict').textContent=inC?`Augmented prompt = your question + ${inC} chunk${inC>1?'s':''} (about ${tk} tokens) instead of all ${DOCS.length} documents.${rRR?' The re-ranker reordered the top six by exact phrase matches.':''}`:'Nothing matched. Try words like scholarship, bootcamp, grants or counselor.'};

/* ===== 05 MEMORY ===== */
let mCap=3000,mStrat='drop',mItems=[],mT=0;
const turnTxt=['user: I like drawing and helping people','user: what does a UX designer do?','user: how long are bootcamps?','user: can I do it part time?','user: which cities hire most?','user: what about teaching instead?'];
const toolTxt=['careers.search → 3 careers','programs.find → 12 programs','aid.lookup → 5 options','salary.get → median $78k'];
const noteTxt=['note: user prefers part-time','note: budget under $10k','note: lives near Montreal'];
let ci={turn:0,tool:0,note:0};
axis('#m-cap','#m-capv',v=>(v/1000)+'k',v=>{mCap=v;fit();paintWin()});
presetGroup('#m-strat',b=>{mStrat=b.dataset.s});
function resetMem(){mItems=[{k:'goal',t:'goal: career + training + funding plan',s:300,pin:true}];ci={turn:0,tool:0,note:0};paintWin()}
function add(k){const src={turn:turnTxt,tool:toolTxt,note:noteTxt}[k];const t=src[ci[k]%src.length];ci[k]++;mItems.push({k,t,s:{turn:350,tool:600,note:150}[k]});fit();paintWin()}
function used(){return mItems.filter(i=>i.k!=='gone').reduce((a,i)=>a+i.s,0)}
function fit(){let guard=0;while(used()>mCap&&guard++<50){const idx=mItems.findIndex(i=>!i.pin&&i.k!=='gone'&&i.k!=='sum');if(idx<0)break;const it=mItems[idx];
  if(mStrat==='sum'){const sIdx=mItems.findIndex(i=>i.k==='sum');if(sIdx>=0){mItems[sIdx].s=Math.min(mItems[sIdx].s+60,400);mItems[sIdx].n++;mItems[sIdx].t=`summary of ${mItems[sIdx].n} older items`;mItems.splice(idx,1)}else{mItems.splice(idx,1,{k:'sum',t:'summary of 1 older item',s:120,n:1})}}
  else{mItems.splice(idx,1);mItems.push({k:'gone',t:it.t,s:0})}}
 const gone=mItems.filter(i=>i.k==='gone');if(gone.length>3){const first=mItems.indexOf(gone[0]);mItems.splice(first,1)}}
function paintWin(){const order=[...mItems.filter(i=>i.k!=='gone'),...mItems.filter(i=>i.k==='gone')];
 $('#m-win').innerHTML=order.map(i=>`<div class="blk ${i.k}"><span>${esc(i.t)}</span><span>${i.k==='gone'?'dropped':i.s+' tok'}</span></div>`).join('');
 $('#m-used').textContent=`${used().toLocaleString()} / ${mCap.toLocaleString()} tokens`}
$('#m-turn').onclick=()=>add('turn');$('#m-tool').onclick=()=>add('tool');$('#m-note').onclick=()=>add('note');$('#m-reset').onclick=resetMem;
resetMem();['turn','tool','turn','note'].forEach(add);
const LT=[['Semantic memory','Docs, knowledge bases, product catalogues. This is what RAG usually searches.','e.g. the program catalogue from scene 04'],['Episodic memory','Past conversations, logs and lessons learned from earlier runs.','e.g. “last time, the loans API timed out”'],['Procedural memory','The model’s trained weights plus the system prompt and anything else that tells the agent how to act.','e.g. “always cite program costs”']];
function paintLT(i){$('#m-ltp').innerHTML=`<p class="subtitle" style="font-size:16px">${LT[i][0]}</p><p class="body-sm">${LT[i][1]}</p><p class="ui-xs">${esc(LT[i][2])}</p>`}
$('#m-lt').addEventListener('click',e=>{const g=e.target.closest('.glyph');if(!g)return;$$('#m-lt .glyph').forEach(x=>x.setAttribute('aria-pressed',x===g));paintLT(+g.dataset.lt)});paintLT(0);

/* ===== 06 PLANNING ===== */
let pMode='react',pFail=true;
presetGroup('#p-mode',b=>pMode=b.dataset.p);
toggle('#p-fail',v=>{pFail=v;$('#p-fail-s').textContent=v?'step 3 will fail':'every API works'});
$('#p-run').onclick=async()=>{const t=begin('p');const log=$('#p-log');log.innerHTML='';let calls=0,adapt=false,done=true;const L=(tag,txt,c)=>{if(c)calls++;logLine(log,tag,txt);$('#p-calls').textContent=calls};$('#p-adapt').textContent='—';$('#p-done').textContent='—';
 const seq=[];
 if(pMode==='plan'){seq.push(['plan','1 find careers · 2 find programs · 3 look up loans · 4 combine',1],['act','careers.search → UX, teaching, counseling'],['act','programs.find → 3 programs']);
  if(pFail){seq.push(['err','loans.lookup → 503 service unavailable'],['act','step 4: combine what we have'],['ans','Careers and programs. Funding: no results. The plan had no step for this failure.',1]);done=false}
  else seq.push(['act','loans.lookup → federal loans'],['act','step 4: combine'],['ans','Careers, programs and loans. Two model calls total.',1])}
 else{seq.push(['think','Start with careers that fit.',1],['act','careers.search → UX, teaching, counseling'],['think','Now programs for those.',1],['act','programs.find → 3 programs'],['think','Now funding.',1]);
  if(pFail){seq.push(['err','loans.lookup → 503 service unavailable'],['think','Loans are down. Scholarships and grants are another way to pay. Try those.',1],['act','aid.search({type:["scholarship","grant"]}) → 3 results']);adapt=true}
  else seq.push(['act','loans.lookup → federal loans']);
  seq.push(['ans','Careers, programs and ways to pay.',1])}
 for(const[tag,txt,c]of seq){if(!alive('p',t))return;L(tag,esc(txt),c);await wait(620)}
 $('#p-adapt').textContent=adapt?'yes':'no';$('#p-done').textContent=done?'yes':'no'};

/* ===== 07 REFLECTION ===== */
const fMax=stepper('#f-m','#f-p','#f-max',1,5,4,()=>{});
const DRAFTS=[[1,0,0],[1,1,0],[1,1,1]];const CN=['three careers','program costs','grants, not only loans'];
const LESSONS=['Add program costs. Search the education API for tuition, not just names.','Also search for scholarships and grants. I only looked at loans.'];
$('#f-run').onclick=async()=>{const t=begin('f');const log=$('#f-log');log.innerHTML='';const crit=$$('#f-crit input').map(c=>c.checked);const max=fMax.get();let calls=0,ctx=600,r=0;
 const put=()=>{$('#f-rounds').textContent=r;$('#f-calls').textContent=calls;$('#f-ctx').textContent=ctx.toLocaleString()};put();
 while(r<max){if(!alive('f',t))return;const d=DRAFTS[Math.min(r,2)];r++;calls++;ctx+=900;put();
  logLine(log,'act',`Attempt ${r}: draft covers ${d.map((x,i)=>x?CN[i]:null).filter(Boolean).join(', ')}.`);await wait(650);if(!alive('f',t))return;
  calls++;ctx+=250;put();const miss=crit.map((c,i)=>c&&!d[i]?i:-1).filter(i=>i>=0);
  if(!miss.length){logLine(log,'ans',`Evaluator: passes ${crit.filter(Boolean).length} of ${crit.filter(Boolean).length} checks. Stop.${!crit.every(Boolean)?' (Some checks were switched off, so “done” came earlier.)':''}`);return}
  logLine(log,'err',`Evaluator: missing ${miss.map(i=>CN[i]).join(' and ')}.`);await wait(500);if(!alive('f',t))return;
  if(r<max){ctx+=120;put();logLine(log,'think',`Lesson: ${LESSONS[Math.min(r-1,1)]}`);await wait(600)}}
 logLine(log,'plan',`Max ${max} round${max>1?'s':''} reached. Returning the best draft with its gaps flagged.`)};

/* ===== 08 CONTROL ===== */
const CTRL={wf:['“I write the arrows.”','Code fixes the order. The LLM fills in each box but never picks the next one.',['you','you','you']],single:['“The model picks arrows from a set I defined.”','You list the tools. The model decides which to call, in what order, and when to stop.',['model','model','model']],multi:['“The model picks the arrows, and who decides next.”','Agents hand control to other agents. Even the decision-maker changes during the run.',['agent a','agent b','agent c']]};
function paintCtrl(k){const[q,b,lab]=CTRL[k];$('#c-quote').textContent=q;$('#c-body').textContent=b;const s=$('#c-svg');s.innerHTML='';
 const xs=[60,220,380,540],names=['input','career','training','funding'];
 const multi=k==='multi',single=k==='single';
 if(single){sv('rect',{x:150,y:24,width:300,height:212,class:'dg-node',style:'fill:none;stroke-dasharray:4 4'},s);const tt=sv('text',{x:300,y:44,'text-anchor':'middle',class:'dg-lbl'},s);tt.textContent='tool set you defined'}
 for(let i=0;i<3;i++){const y=single?[70,130,190][i]:130;const x1=single?110:xs[i]+34,x2=single?xs[i+1]-34+(i===2?0:0):xs[i+1]-34;
  if(single){const p=sv('path',{d:`M90 130 Q 200 ${[60,130,200][i]} ${xs[i+1]-34} ${[70,130,190][i]}`,class:'dg-edge'},s);const l=sv('text',{x:220,y:[78,124,188][i],'text-anchor':'middle',class:'dg-lbl',style:'fill:var(--mcnk-text-action)'},s);l.textContent='model?'}
  else{sv('line',{x1,y1:y,x2,y2:y,class:'dg-edge'},s);sv('path',{d:`M${x2-8} ${y-5} L${x2} ${y} L${x2-8} ${y+5}`,class:'dg-edge'},s);const l=sv('text',{x:(x1+x2)/2,y:y-12,'text-anchor':'middle',class:'dg-lbl',style:`fill:${multi?'var(--mcnk-text-action)':'var(--mcnk-text-reading)'}`},s);l.textContent=lab[i]}}
 names.forEach((n,i)=>{const x=xs[i],y=single&&i>0?[70,130,190][i-1]:130;sv('circle',{cx:x,cy:y,r:30,class:'dg-node'+(i===0?' io':'')},s);const g=sv('text',{x,y:y+6,'text-anchor':'middle',class:'dg-glyph'},s);g.textContent=i?String(i).padStart(2,'0'):'IN';const l=sv('text',{x,y:y+48,'text-anchor':'middle',class:'dg-lbl'},s);l.textContent=n});
 if(multi){const p=sv('path',{d:'M540 160 Q 380 250 220 160',class:'dg-edge'},s);const l=sv('text',{x:380,y:238,'text-anchor':'middle',class:'dg-lbl',style:'fill:var(--mcnk-text-action)'},s);l.textContent='funding agent asks career agent'}}
presetGroup('#c-mode',b=>paintCtrl(b.dataset.c));paintCtrl('wf');

/* ===== generic diagram engine (09, 11) ===== */
function buildDiagram(svg,spec){svg.innerHTML='';const E=[],N={};
 spec.edges.forEach(([a,b,curve])=>{const A=spec.nodes[a],B=spec.nodes[b];const dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy)||1,r=26;const x1=A.x+dx/len*r,y1=A.y+dy/len*r,x2=B.x-dx/len*(r+2),y2=B.y-dy/len*(r+2);
  let d;if(curve){const mx=(x1+x2)/2-dy/len*curve,my=(y1+y2)/2+dx/len*curve;d=`M${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}else d=`M${x1} ${y1} L${x2} ${y2}`;
  E.push(sv('path',{d,class:'dg-edge'},svg))});
 for(const k in spec.nodes){const n=spec.nodes[k];const c=sv('circle',{cx:n.x,cy:n.y,r:26,class:'dg-node'+(n.io?' io':'')},svg);const g=sv('text',{x:n.x,y:n.y+6,'text-anchor':'middle',class:'dg-glyph'},svg);g.textContent=n.g;const l=sv('text',{x:n.x,y:n.y+44,'text-anchor':'middle',class:'dg-lbl'},svg);l.textContent=n.l;N[k]=c}
 return{E,N,spec}}
async function animate(d,key,t,ticks,opts={}){const{E,N,spec}=d;const dim=opts.dim||[];dim.forEach(i=>{E[i].classList.add('off')});(opts.dimNodes||[]).forEach(k=>N[k].classList.add('off'));
 for(const tick of ticks){if(!alive(key,t))return false;E.forEach(e=>e.classList.remove('hot'));tick.forEach(i=>{E[i].classList.add('hot');N[spec.edges[i][1]].classList.add('hot')});if(opts.onTick)opts.onTick(tick);await wait(opts.ms||700)}
 E.forEach(e=>e.classList.remove('hot'));return true}

/* ===== 09 WORKFLOWS ===== */
const IO={IN:{x:50,y:150,g:'IN',l:'user',io:1},OUT:{x:550,y:150,g:'→',l:'response',io:1}};
const WF={
 chain:{desc:'Output of one call becomes the input of the next. A gate between steps can validate before passing on. You pay latency to buy accuracy.',spec:{nodes:{...IO,a:{x:180,y:150,g:'01',l:'career fit'},b:{x:300,y:150,g:'02',l:'training'},c:{x:420,y:150,g:'03',l:'funding'}},edges:[['IN','a'],['a','b'],['b','c'],['c','OUT']]},ticks:[[0],[1],[2],[3]],calls:3,lat:3,verdict:'Three calls in a row. Each prompt is small and easy to test, but latency stacks: three model calls before the user sees anything.'},
 route:{desc:'A cheap classification step picks one specialized path. It’s a fork, not a sequence, and paths can be other prompts, bigger models or plain code.',spec:{nodes:{...IO,r:{x:190,y:150,g:'?',l:'classify'},a:{x:370,y:50,g:'C',l:'career prompt'},b:{x:370,y:150,g:'T',l:'training + api'},c:{x:370,y:250,g:'$',l:'funding + api'}},edges:[['IN','r'],['r','a'],['r','b'],['r','c'],['a','OUT'],['b','OUT'],['c','OUT']]},route:true,calls:2,lat:2},
 par:{desc:'Several calls at once, then a synthesis step. Sectioning splits independent subtasks; voting runs the same task several times and looks for agreement.',spec:{nodes:{...IO,a:{x:250,y:50,g:'1',l:'career fit'},b:{x:250,y:150,g:'2',l:'career fit'},c:{x:250,y:250,g:'3',l:'career fit'},s:{x:420,y:150,g:'Σ',l:'synthesize'}},edges:[['IN','a'],['IN','b'],['IN','c'],['a','s'],['b','s'],['c','s'],['s','OUT']]},ticks:[[0,1,2],[3,4,5],[6]],calls:4,lat:2,verdict:'Four calls but only two rounds of waiting. All three runs named “teacher” and “counselor”, so those come back with more confidence.'},
 eval:{desc:'One call drafts, another grades it against clear criteria and sends feedback, until it passes or hits a max-round cap. Reflection, written as a workflow.',spec:{nodes:{...IO,g:{x:220,y:150,g:'G',l:'generate'},e:{x:400,y:150,g:'E',l:'evaluate'}},edges:[['IN','g'],['g','e',-45],['e','g',-45],['e','OUT']]},ticks:[[0],[1],[2],[1],[2],[1],[3]],calls:6,lat:6,verdict:'Three rounds of draft and critique: six calls, six waits. Worth it when the criteria are clear enough to check. Always set the cap.'},
 orch:{desc:'A central call decides the subtasks at run time and delegates them to workers, then synthesizes. It sits at the edge between workflow and agent.',spec:{nodes:{...IO,o:{x:300,y:70,g:'O',l:'orchestrator'},a:{x:180,y:240,g:'C',l:'career worker'},b:{x:300,y:240,g:'T',l:'training worker'},c:{x:420,y:240,g:'$',l:'funding worker'}},edges:[['IN','o'],['o','a',-14],['o','b',-14],['o','c',-14],['a','o',-14],['b','o',-14],['c','o',-14],['o','OUT']]},ticks:[[0],[1,2,3],[4,5,6],[7]],calls:5,lat:3,verdict:'The orchestrator chose three subtasks for this request; a different question could produce two or five. That flexibility is why it suits work you can’t predict, like code changes.'}
};
let wKey='chain',wD=null;
function setWF(k){wKey=k;const w=WF[k];wD=buildDiagram($('#w-svg'),w.spec);$('#w-desc').textContent=w.desc;$('#w-qf').hidden=!w.route;$('#w-calls').textContent=w.calls;$('#w-lat').textContent=w.lat+'× call';$('#w-route').textContent=w.route?'—':'fixed';$('#w-verdict').textContent='Press Run to watch it.';$('#w-verdict').className='verdict'}
presetGroup('#w-mode',b=>setWF(b.dataset.w));setWF('chain');
function classify(q){q=q.toLowerCase();if(/(pay|loan|grant|scholar|fund|cost|afford|money|aid)/.test(q))return 2;if(/(school|college|bootcamp|course|train|degree|program|learn|study)/.test(q))return 1;return 0}
$('#w-run').onclick=async()=>{const t=begin('w');setWF(wKey);const w=WF[wKey];
 if(w.route){const r=classify($('#w-q').value);const names=['career','training','funding'];const others=[0,1,2].filter(i=>i!==r);
  const ok=await animate(wD,'w',t,[[0],[1+r],[4+r]],{dim:others.flatMap(i=>[1+i,4+i]),dimNodes:others.map(i=>'abc'[i])});
  if(ok){$('#w-route').textContent=names[r];$('#w-verdict').className='verdict good';$('#w-verdict').textContent=`Classified as ${names[r]}. Only that path ran, so the other two specialized prompts cost nothing. A wrong label here sends the whole request down the wrong road.`}return}
 const ok=await animate(wD,'w',t,w.ticks);if(ok){$('#w-verdict').className='verdict good';$('#w-verdict').textContent=w.verdict}};

/* ===== 10 CODEACT ===== */
let xMode='json',xN=3,xSB=true;const CAREERS=['ux_designer','teacher','counselor','social_worker','data_analyst','electrician','nurse','librarian'];
presetGroup('#x-mode',b=>{xMode=b.dataset.x;paintX()});
stepper('#x-m','#x-p','#x-n',1,8,3,v=>{xN=v;paintX()});
toggle('#x-sb',v=>{xSB=v;$('#x-sb-s').textContent=v?'on · restricted runtime':'off · runs on your machine';paintX()});
function paintX(){const cs=CAREERS.slice(0,xN);let code,turns,tc;
 if(xMode==='json'){const lines=[`<span class="k">turn 1</span>  {"tool":"search_careers","args":{"profile":"creative, helping"}}`];cs.forEach((c,i)=>lines.push(`<span class="k">turn ${i+2}</span>  {"tool":"find_programs","args":{"career":"${c}"}}`));lines.push(`<span class="k">turn ${xN+2}</span>  {"tool":"find_funding","args":{"programs":"…"}}`,`<span class="k">turn ${xN+3}</span>  final answer`);code=lines.join('\n');turns=xN+3;tc=xN+2}
 else{code=`<span class="k">turn 1</span>  # one action, many tool calls\ncareers = search_careers(profile)        # ${xN} results\nprograms = []\n<span class="k">for</span> c <span class="k">in</span> careers:\n    programs += find_programs(c)\nfunding = find_funding(programs)\n<span class="k">print</span>(careers, programs, funding)\n\n<span class="k">turn 2</span>  final answer`;turns=2;tc=xN+2}
 $('#x-code').innerHTML=code;$('#x-turns').textContent=turns;$('#x-tc').textContent=tc;
 const safe=xMode==='json'||xSB;$('#x-safe').textContent=safe?'yes':'no';$('#x-safe').style.color=safe?'':'var(--mcnk-text-action)'}
paintX();

/* ===== 11 MULTI-AGENT ===== */
const AG=[['C','career'],['T','training'],['$','funding'],['J','trends'],['R','resume'],['I','interview']];
const MA={
 seq:{desc:'Each agent finishes, then hands its output on. Same topology as prompt chaining, but every step can plan, retry and reflect.',sc:[4,2.5,2,4],note:'Errors compound down the chain, so validate each handoff.',n:true},
 par:{desc:'The request fans out to agents at the same time. Sectioning splits subtasks; voting has several agents attempt the same one and reconciles them.',sc:[4,3.5,4,1.5],note:'Mirror image of sequential: high in money, low in latency.',n:true},
 sup:{desc:'A supervisor breaks the request into subtasks, delegates to subagents that don’t need to know about each other, and synthesizes. Supervisors can nest.',sc:[5,4,5,3],note:'The supervisor model must be capable enough to manage everyone’s context.',n:true},
 disp:{desc:'A classifier sends each request to exactly one specialist agent. The multi-agent version of routing: a fork, not a decomposition.',sc:[4,3,1.5,2],note:'Can be the cheapest: send simple requests to small models. But a bad route is hard to recover from.',n:true},
 eval:{desc:'A generator agent works, an evaluator agent critiques, and they loop until the evaluator is satisfied or a stop condition hits.',sc:[2,4,4.5,4],note:'Context grows every round: each pass adds the last attempt plus its critique.',n:false},
 p2p:{desc:'No coordinator. Every agent can talk to every other one and pass control until a stop condition. Best only when there’s no natural hierarchy.',sc:[1,2,5,4],note:'Hardest to debug and easiest to loop forever. A last resort, not a default.',n:true}
};
let maKey='seq',maN=3,maD=null;
function maSpec(k,n){const nodes={IN:{x:40,y:165,g:'IN',l:'user',io:1},OUT:{x:560,y:165,g:'→',l:'response',io:1}},edges=[];let ticks=[],links=0;const ag=i=>({g:AG[i][0],l:AG[i][1]});
 if(k==='seq'){for(let i=0;i<n;i++)nodes['a'+i]={x:40+(520/(n+1))*(i+1),y:165,...ag(i)};edges.push(['IN','a0']);for(let i=0;i<n-1;i++)edges.push(['a'+i,'a'+(i+1)]);edges.push(['a'+(n-1),'OUT']);ticks=edges.map((_,i)=>[i]);links=n-1}
 if(k==='par'){for(let i=0;i<n;i++)nodes['a'+i]={x:220,y:40+(250/(n-1||1))*i+(n===1?125:0),g:AG[0][0],l:'career #'+(i+1)};nodes.s={x:400,y:165,g:'Σ',l:'aggregator'};for(let i=0;i<n;i++)edges.push(['IN','a'+i]);for(let i=0;i<n;i++)edges.push(['a'+i,'s']);edges.push(['s','OUT']);ticks=[[...Array(n).keys()],[...Array(n).keys()].map(i=>n+i),[2*n]];links=n}
 if(k==='sup'){nodes.IN.y=70;nodes.OUT.y=70;nodes.s={x:300,y:70,g:'S',l:'supervisor'};for(let i=0;i<n;i++)nodes['a'+i]={x:300+(i-(n-1)/2)*(Math.min(110,460/n)),y:250,...ag(i)};edges.push(['IN','s']);for(let i=0;i<n;i++)edges.push(['s','a'+i,-12],['a'+i,'s',-12]);edges.push(['s','OUT']);ticks=[[0]];for(let i=0;i<n;i++)ticks.push([1+2*i],[2+2*i]);ticks.push([edges.length-1]);links=n}
 if(k==='disp'){nodes.d={x:180,y:165,g:'?',l:'dispatcher'};for(let i=0;i<n;i++)nodes['a'+i]={x:380,y:40+(250/(n-1||1))*i,...ag(i)};edges.push(['IN','d']);for(let i=0;i<n;i++)edges.push(['d','a'+i]);for(let i=0;i<n;i++)edges.push(['a'+i,'OUT']);links=n}
 if(k==='eval'){nodes.g={x:220,y:165,g:'G',l:'generator'};nodes.e={x:400,y:165,g:'E',l:'evaluator'};edges.push(['IN','g'],['g','e',-50],['e','g',-50],['e','OUT']);ticks=[[0],[1],[2],[1],[2],[1],[3]];links=1}
 if(k==='p2p'){for(let i=0;i<n;i++){const a=-Math.PI/2+i*2*Math.PI/n;nodes['a'+i]={x:300+Math.cos(a)*120,y:160+Math.sin(a)*105,...ag(i)}}edges.push(['IN','a0']);const pairIdx={};for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){pairIdx[i+','+j]=edges.length;edges.push(['a'+i,'a'+j])}edges.push(['a'+(n-1),'OUT']);
  ticks=[[0]];let cur=0;const hops=Math.min(8,n*2);for(let h=0;h<hops;h++){let nx=(cur+1+((h*7+3)%Math.max(1,n-1)))%n;if(nx===cur)nx=(cur+1)%n;const key=Math.min(cur,nx)+','+Math.max(cur,nx);ticks.push([pairIdx[key]]);cur=nx}ticks.push([edges.length-1]);links=n*(n-1)/2}
 return{spec:{nodes,edges},ticks,links}}
function setMA(k){maKey=k;const m=MA[k];$('#ma-nwrap').hidden=!m.n;const n=m.n?maN:2;const s=maSpec(k,n);maD=buildDiagram($('#ma-svg'),s.spec);maD.ticks=s.ticks;
 $('#ma-desc').textContent=m.desc;$('#ma-links').textContent=s.links;$('#ma-note').textContent=k==='p2p'?`With ${n} agents, each must know the other ${n-1}: ${s.links} relationships to hold in context. Context scales with relationships, not just agents. ${m.note}`:m.note;
 const L=['context','reliability','cost','latency'];$('#ma-score').innerHTML=m.sc.map((v,i)=>`<div class="score"><span class="ui-xs">${L[i]}</span><span class="track ${i>1?'cost':''}"><i style="width:${v/5*100}%"></i></span><b>${v}</b></div>`).join('')}
presetGroup('#ma-mode',b=>setMA(b.dataset.ma));
const maStep=stepper('#ma-m','#ma-p','#ma-n',2,6,3,v=>{maN=v;if(maD)setMA(maKey)});setMA('seq');
$('#ma-run').onclick=async()=>{const t=begin('ma');setMA(maKey);
 if(maKey==='disp'){const n=maN,r=Math.floor(Math.random()*n);const others=[...Array(n).keys()].filter(i=>i!==r);await animate(maD,'ma',t,[[0],[1+r],[1+n+r]],{dim:others.flatMap(i=>[1+i,1+n+i]),dimNodes:others.map(i=>'a'+i)});return}
 await animate(maD,'ma',t,maD.ticks,{ms:maKey==='p2p'?520:700})};

/* ===== 12 EVALS ===== */
let eP=.85,eK=null;eK=stepper('#e-km','#e-kp','#e-k',1,10,5,()=>paintE());
axis('#e-p','#e-pv',v=>v+'%',v=>{eP=v/100;paintE()});
function pct(x){return(x*100).toFixed(x>.995||x<.005?1:0)+'%'}
function paintE(){if(!eK)return;const k=eK.get();$('#e-at').textContent=pct(1-Math.pow(1-eP,k));$('#e-all').textContent=pct(Math.pow(eP,k));
 const s=$('#e-svg');s.innerHTML='';const L=56,R=520,T=20,B=200,X=i=>L+(i-1)*(R-L)/9,Y=v=>B-v*(B-T);
 [0,.5,1].forEach(v=>{sv('line',{x1:L,x2:R,y1:Y(v),y2:Y(v),stroke:'var(--mcnk-border-olive)','stroke-width':v?0.5:1,'stroke-dasharray':v?'3 4':''},s);const tx=sv('text',{x:L-10,y:Y(v)+4,'text-anchor':'end',class:'dg-lbl'},s);tx.textContent=(v*100)+'%'});
 for(let i=1;i<=10;i++){const tx=sv('text',{x:X(i),y:B+18,'text-anchor':'middle',class:'dg-lbl'},s);tx.textContent=i}
 const tl=sv('text',{x:(L+R)/2,y:B+36,'text-anchor':'middle',class:'dg-lbl'},s);tl.textContent='tries (k)';
 sv('line',{x1:X(k),x2:X(k),y1:T,y2:B,stroke:'var(--mcnk-action-pink)','stroke-width':1},s);
 const curves=[[i=>1-Math.pow(1-eP,i),'var(--mcnk-text-action)','pass@k'],[i=>Math.pow(eP,i),'var(--mcnk-text-reading)','pass^k']];
 curves.forEach(([f,c,name])=>{let d='';for(let i=1;i<=10;i++)d+=(i>1?'L':'M')+X(i)+' '+Y(f(i));sv('path',{d,stroke:c,'stroke-width':2.5,fill:'none'},s);
  for(let i=1;i<=10;i++)sv('circle',{cx:X(i),cy:Y(f(i)),r:i===k?5:2.5,fill:i===k?c:'var(--mcnk-surface-white)',stroke:c,'stroke-width':1.5},s);
  const ly=Y(f(10)),lab=sv('text',{x:R-4,y:name==='pass@k'?Math.max(T+12,ly-10):Math.min(B-6,ly-10),'text-anchor':'end',style:`fill:${c};font-size:12px`},s);lab.textContent=name})}
paintE();
$('#e-grid').innerHTML='<i></i>'.repeat(100);
$('#e-run').onclick=async()=>{const t=begin('e');const k=eK.get();const cells=$$('#e-grid i');cells.forEach(c=>c.className='');let all=0,some=0,none=0;
 for(let i=0;i<100;i++){if(!alive('e',t))return;let p=0;for(let j=0;j<k;j++)if(Math.random()<eP)p++;const c=p===k?'all':p>0?'some':'none';cells[i].className=c;if(c==='all')all++;else if(c==='some')some++;else none++;if(i%5===4)await wait(30)}
 $('#e-tally').textContent=`pass@${k}: ${all+some} of 100 · pass^${k}: ${all} of 100`};
$('#e-it').onclick=e=>{const b=e.currentTarget,open=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',open);$('#e-info').hidden=!open};
if(matchMedia('(max-width:767px)').matches)$('#e-info').hidden=false;

/* ===== 13 CHOOSE ===== */
function decide(){const q1=$('input[name=q1]:checked').value,q2=$('input[name=q2]:checked').value;let a,w,h;
 if(q1==='yes'){a='Workflow';w='You know the steps, so write the arrows yourself. Put an LLM call on the one hard step and keep everything else as code you can test.';h='#s-workflows'}
 else if(q2==='yes'){a='Multiple agents';w='The path is unknown and the parts are independent, so separate agents can each keep a narrow context. Start with a supervisor or parallel pattern; peer-to-peer last.';h='#s-multi'}
 else{a='Single agent';w='The path is unknown but it draws from a known set of tools. Give one agent those tools and a ReAct loop, with a cap on steps.';h='#s-single'}
 $('#q-ans').textContent=a;$('#q-why').textContent=w;$('#q-go').href=h}
$$('#s-choose input').forEach(i=>i.addEventListener('change',decide));decide();

/* ===== NAV + RECAP ===== */
const scenes=$$('main .scene');const navItems=$('#nav-items');
scenes.forEach(s=>{const[n,...rest]=s.dataset.label.split(' ');const a=document.createElement('a');a.className='nav-item';a.href='#'+s.id;a.textContent=rest.length?rest.join(' '):n;a.dataset.id=s.id;navItems.appendChild(a)});
const recap=$('#recap');scenes.filter(s=>s.id!=='s-recap').forEach(s=>{const[n,...rest]=s.dataset.label.split(' ');const a=document.createElement('a');a.className='glyph';a.href='#'+s.id;a.innerHTML=`<b>${n}</b><span>${esc(rest.join(' '))}</span>`;recap.appendChild(a)});
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){const id=e.target.id;$$('.nav-item').forEach(a=>a.setAttribute('aria-current',a.dataset.id===id));const cur=$(`.nav-item[data-id="${id}"]`);if(cur){cur.scrollIntoView({block:'nearest',inline:'nearest'});}$('#nav-now').textContent=e.target.dataset.label}})},{rootMargin:'-45% 0px -50% 0px'});
scenes.forEach(s=>io.observe(s));
$('#replay').onclick=async()=>{const t=begin('rp');const cells=$$('#recap .glyph');for(const c of cells){if(!alive('rp',t))return;cells.forEach(x=>x.classList.remove('on'));c.classList.add('on');await wait(260)}cells.forEach(x=>x.classList.remove('on'))};
})();
