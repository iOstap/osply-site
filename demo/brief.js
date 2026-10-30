// ------------- BRIEF ------------- //
const ROOT = document.querySelector('[data-brief]');
if (!ROOT) throw new Error('[BRIEF] no [data-brief] root');
const gsap = window.gsap || (await import('https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js')).gsap;
const D = ROOT.dataset;
const CONFIG = {
  endpoint: D.endpoint || null,
  rate: parseFloat(D.rate) || 0,
  currency: D.currency || '',
  contact: D.contact || 'email',
  finalText: D.final || 'All set{name}. I’ll get back to you with a tailored proposal within a few hours.',
  source: D.source || '',
  typeSpeed: 0.022, wave: 16,
  ink:[255,255,255], waveMid:[92,142,255], waveHead:[186,210,255],
  holdAuto: .85,
  anchor: parseFloat(D.anchor) || .5,
};
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const smooth=(x,a,b)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };

const Sound = {
  ctx:null, out:null, on:true, lastTick:0,
  init(){ if(this.ctx) return; const C=window.AudioContext||window.webkitAudioContext; if(!C) return;
    this.ctx=new C(); this.out=this.ctx.createGain(); this.out.gain.value=.5; this.out.connect(this.ctx.destination); },
  tone(f0,f1,dur,{type='sine',vol=.2,delay=0}={}){ const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(f1,1),t+dur);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g).connect(this.out);o.start(t);o.stop(t+dur+.02); },
  noise(dur,{vol=.1,f0=2000,f1=f0,q=1,delay=0}={}){ const c=this.ctx,t=c.currentTime+delay,n=Math.ceil(c.sampleRate*dur),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=Math.random()*2-1; const s=c.createBufferSource();s.buffer=b;const f=c.createBiquadFilter();f.type='bandpass';f.Q.value=q;
    f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);const g=c.createGain();
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f).connect(g).connect(this.out);s.start(t); },
  play(name){ if(!this.on||!this.ctx) return; if(this.ctx.state==='suspended') this.ctx.resume();
    switch(name){
      case 'pop':   this.tone(560,170,.11,{vol:.32}); this.noise(.025,{vol:.06,f0:3200,q:2}); break;
      case 'tick':  { const n=performance.now(); if(n-this.lastTick<38) return; this.lastTick=n; this.noise(.014,{vol:.022,f0:4200+Math.random()*900,q:3}); break; }
      case 'hover': this.tone(1900,1650,.035,{vol:.025}); break;
      case 'step':  this.tone(300,620,.13,{vol:.14}); this.tone(620,900,.12,{vol:.08,delay:.07}); break;
      case 'back':  this.tone(420,310,.2,{type:'triangle',vol:.11}); this.tone(320,255,.28,{type:'triangle',vol:.09,delay:.2}); break;
      case 'error': this.tone(170,150,.08,{type:'square',vol:.05}); this.tone(170,140,.1,{type:'square',vol:.05,delay:.11}); break;
      case 'pix':   for(let k=0;k<5;k++) this.noise(.03,{vol:.035,f0:2500+Math.random()*4000,q:6,delay:k*.035}); break;
      case 'squeak':this.tone(900,1500,.08,{vol:.1}); this.tone(1500,1100,.1,{vol:.07,delay:.08}); break;
      case 'submit':this.noise(.8,{vol:.11,f0:250,f1:3500,q:.8}); this.tone(380,1250,.55,{vol:.1,delay:.1}); break;
    } }
};

const MOB = ()=>innerWidth<992;
const MOB_TOP = .55;
const typing=()=>{ const a=document.activeElement; return !!a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && matchMedia('(pointer:coarse)').matches; };
const scene=()=>document.querySelector('[data-logo-reveal]')?.logoReveal;
const React = {
  press(){ Sound.play('pop'); },
  step(){ Sound.play('step'); scene()?.wave(.9); },
  spin(){ scene()?.wave(1.2); },
  type(){},
  back(){ Sound.play('back'); scene()?.wave(.6, true); },
  error(){ Sound.play('error'); },
  submit(){ Sound.play('submit'); scene()?.wave(2.2); },
};
addEventListener('pointerdown', ()=>Sound.init());

const col=ROOT.querySelector('[data-brief-col]'), colFinal=ROOT.querySelector('[data-brief-final]'), backBtn=ROOT.querySelector('[data-brief-back]');
const fillEl=ROOT.querySelector('[data-brief-fill]'), pctEl=ROOT.querySelector('[data-brief-pct]'), progEl=ROOT.querySelector('[data-brief-progress]');
const logoEl=document.querySelector('.brief-logo');
ROOT.querySelectorAll('[data-tpl="icon"] .w-embed, [data-brief-back] .w-embed').forEach(e=>{ const sv=e.querySelector('svg'); if(sv&&!e.classList.contains('brief-arrow')){ e.classList.add('brief-arrow'); e.appendChild(sv.cloneNode(true)); } });
const setBack=(on)=>{ backBtn.classList.toggle('is-off',!on); backBtn.setAttribute('aria-hidden',!on); logoEl&&logoEl.classList.toggle('is-off',on); };
const tpl=(name,tag)=>{ const t=ROOT.querySelector(`[data-tpl="${name}"]`); let c;
  if(tag&&t.tagName.toLowerCase()!==tag){ c=document.createElement(tag); c.className=t.className; c.innerHTML=t.innerHTML; } else c=t.cloneNode(true);
  c.removeAttribute('data-tpl'); c.removeAttribute('id'); if(tag==='button') c.type='button'; return c; };
const put=(el,sel,text)=>{ const n=el.querySelector(sel); if(!n) return; if(text==null||text===''){ n.remove(); } else n.textContent=text; };
const rem=()=>parseFloat(getComputedStyle(document.documentElement).fontSize);

const HOURS={ landing:[20,30,46], 'website-s':[40,60,96], 'website-m':[70,104,160] };
const money=(n)=>CONFIG.currency+Math.round(n).toLocaleString('en-US');
function priceFor(tier){ const h=HOURS[data.size]; if(!h||!CONFIG.rate) return 'Custom quote'; return 'From '+money(Math.round(h[tier]*CONFIG.rate/100)*100); }

const data={ project:'', kind:'', size:'', feel:'', extras:[], assets:[], references:'', currentSite:'', name:'', email:'', notes:'' };
const LABELS={};

const contactStep = CONFIG.contact==='name'
  ? { id:'contact', progress:80, say:'And who am I\ntalking to?', ui:{type:'text', fields:[{key:'name', placeholder:'Your name', required:true, autocomplete:'name'}]} }
  : { id:'contact', progress:80, say:'Who should I send\nthe proposal to?', ui:{type:'text', fields:[{key:'name', placeholder:'Your name', required:true, autocomplete:'name'},{key:'email', placeholder:'Email', type:'email', required:true, autocomplete:'email'}]} };

const STEPS=[
  { id:'intro', progress:0, say:'Hey, I’m PUFF, OSPLY’s\nvery inflated assistant.\nGot a project in mind?',
    ui:{type:'choice', key:'_start', options:[{label:'Start a project', value:'start'}]}, onAnswer:()=>React.spin() },
  { id:'project', progress:10, pre:['Ooh, a new project. My\nfavorite kind of air.'], say:'First things first:\nwhat should we call\nyour project?',
    ui:{type:'text', fields:[{key:'project', placeholder:'Project or brand name', required:true, autocomplete:'organization'}]} },
  { id:'kind', preProgress:20, progress:20, pre:[d=>`${d.project}. Has\na ring to it.`], say:'Are we building\nsomething new, or giving\nan existing site a glow-up?',
    ui:{type:'choice', key:'kind', options:[{label:'Something new',value:'new'},{label:'A redesign',value:'redesign'}]} },
  { id:'size', progress:30, say:'How big are we\ntalking?',
    ui:{type:'choice', key:'size', fixed:true, options:[{label:'Landing page',sub:'1 page',value:'landing'},{label:'Website',sub:'2–5 pages',value:'website-s'},{label:'Website',sub:'6–12 pages',value:'website-m'},{label:'Bigger than that',value:'large'}]} },
  { id:'feel', progress:40, say:'Now the fun part.\nHow should it feel?',
    ui:{type:'cards', key:'feel', options:[
      {label:'Essential',desc:'Clean and fast, focused on what matters.',tier:0,value:'essential'},
      {label:'Advanced',desc:'Alive, with motion and smooth interactions.',tier:1,value:'advanced'},
      {label:'Signature',desc:'Award-level WebGL and seamless transitions.',tier:2,value:'signature'}],
      foot:{label:'Not sure, help me choose',value:'help'}} },
  { id:'extras', progress:50, say:'Anything extra on the\nlist? Pick all that apply.',
    ui:{type:'multi', key:'extras', none:'none', options:[{label:'Brand identity',value:'identity'},{label:'CMS',value:'cms'},{label:'Forms & integrations',value:'forms'},{label:'Multiple languages',value:'i18n'},{label:'E-commerce',value:'ecom'},{label:'Nothing else',value:'none'}]} },
  { id:'assets', progress:60, say:'What’s already ready\non your side?',
    ui:{type:'multi', key:'assets', none:'nothing', options:[{label:'Logo & brand',value:'brand'},{label:'Texts',value:'copy'},{label:'Photos & video',value:'media'},{label:'Nothing yet',value:'nothing'}]} },
  { id:'refs', progress:70, say:'Any websites you\nlove? Drop a link or\ntwo. Totally optional.',
    ui:{type:'text', fields:d=>[ ...(d.kind==='redesign'?[{key:'currentSite', placeholder:'Your current website', type:'url'}]:[]), {key:'references', placeholder:'Links you love, comma separated'} ]} },
  contactStep,
  { id:'notes', progress:90, say:'Last one. Anything\nelse we should know?', ui:{type:'notes', key:'notes'} },
];

const stack=[], history=[]; let busy=false;

function makeMsg(text, parent=col){
  const el=tpl('msg','p'); el.textContent='';
  const chars=[]; let idx=0;
  text.split('\n').forEach((line,li)=>{
    if(li) el.appendChild(document.createElement('br'));
    line.split(' ').forEach((word,wi)=>{
      if(wi){ el.appendChild(document.createTextNode(' ')); idx++; }
      const w=document.createElement('span'); w.className='brief-w';
      for(const ch of word){ const c=document.createElement('span'); c.className='brief-c'; c.textContent=ch; w.appendChild(c); chars.push({el:c,i:idx++}); }
      el.appendChild(w);
    });
  });
  el.setAttribute('aria-label', text.replace(/\n/g,' '));
  parent.appendChild(el);
  return { el, chars, n:idx, p:0, ui:null, step:null, kind:'msg' };
}
function paint(b){
  const W=CONFIG.wave, ink=CONFIG.ink, mid=CONFIG.waveMid, head=CONFIG.waveHead;
  for(const c of b.chars){
    const t=Math.min(1,Math.max(0,(b.p-c.i)/W));
    if(t===c.t) continue; c.t=t;
    if(t<=0){ c.el.style.color='transparent'; continue; }
    if(t>=1){ c.el.style.color='inherit'; continue; }
    const a=smooth(t,0,.45); let rgb;
    if(t<.22){ const k=smooth(t,0,.22); rgb=head.map((h,j)=>h+(mid[j]-h)*k); }
    else { const k=Math.pow(smooth(t,.22,1),.8); rgb=mid.map((m,j)=>m+(ink[j]-m)*k); }
    c.el.style.color=`rgba(${rgb[0]|0},${rgb[1]|0},${rgb[2]|0},${a.toFixed(3)})`;
  }
}
function typeIn(b, delay=0){
  const dur=RM?.01:(b.n+CONFIG.wave)*CONFIG.typeSpeed; let last=-1;
  return gsap.to(b,{p:b.n+CONFIG.wave, duration:dur, delay, ease:'none', onUpdate(){ paint(b); const f=Math.floor(b.p); if(f!==last&&f<b.n&&f%2===0) Sound.play('tick'); last=f; }});
}
function typeOut(b){ return gsap.to(b,{p:0, duration:RM?.01:Math.min(.55,b.n*.008+.2), ease:'power1.in', onUpdate:()=>paint(b)}); }

function layout(animate=true, dur=.95){
  const mob=MOB(), center=col.clientHeight*(mob?.52:CONFIG.anchor), gap=(mob?2.5:4)*rem(), S2=.5; let y=null;
  for(let k=stack.length-1;k>=0;k--){
    const b=stack[k], h=b.el.offsetHeight, role=stack.length-1-k; let to;
    if(role===0){ y=mob?innerHeight*MOB_TOP-col.offsetTop:center-h; to={y, scale:1, filter:'blur(0px)', opacity:1}; b.top=y; b.h=h; placeUI(b); }
    else { y=y-gap-h*S2; to={y, scale:S2, filter:role===1?'blur(5px)':'blur(14px)', opacity:role===1&&!mob?.9:0}; }
    if(!b.placed){ b.placed=true; gsap.set(b.el,to); continue; }
    if(animate) gsap.to(b.el,{...to, duration:dur, ease:'expo.inOut', overwrite:'auto'}); else gsap.set(b.el,to);
  }
}
function textW(el){ const r=document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width/(gsap.getProperty(el,'scale')||1); }
function placeUI(b){ if(!b||!b.ui) return; b.ui.style.top = MOB() && b.top!=null ? (b.top+b.h+(b.ui.classList.contains('is-cards')?1:2)*rem())+'px' : '';
  const wide=b.ui.querySelectorAll('[data-fit]'); if(wide.length){ const w=MOB()?'':Math.ceil(textW(b.el))+'px'; wide.forEach(n=>{ n.style.width=w; n.style.maxWidth=w?'none':''; }); } }
function showUI(b,at){
  if(!b.ui) return;
  gsap.fromTo(b.ui,{autoAlpha:0,y:8},{autoAlpha:1,y:0,duration:.45,ease:'power2.out',delay:Math.max(0,at)});
  if(!matchMedia('(pointer:coarse)').matches){ const f=b.ui.querySelector('input,textarea'); if(f) gsap.delayedCall(Math.max(0,at)+.3,()=>f.focus({preventScroll:true})); }
}
function hideUI(b){ if(b&&b.ui) gsap.to(b.ui,{autoAlpha:0,y:-6,duration:.22,ease:'power1.in'}); }
function pushMsg(text,{step=null}={}){
  const b=makeMsg(text); b.step=step;
  const prev=stack[stack.length-1]; stack.push(b); hideUI(prev); layout(true);
  const d=stack.length>1?.32:.1; const tw=typeIn(b,d); return {b, typingEnd:d+tw.duration()};
}
const wait=s=>new Promise(r=>gsap.delayedCall(s,r));

async function enterStep(i){
  busy=true; const st=STEPS[i]; history.push(i); setBack(history.length>1);
  for(const pre of (st.pre||[])){
    if(st.preProgress!=null) setProgress(st.preProgress);
    const {typingEnd}=pushMsg(typeof pre==='function'?pre(data):pre,{step:i}); stack[stack.length-1].kind='pre';
    await wait(typingEnd+CONFIG.holdAuto);
  }
  setProgress(st.progress);
  const {b,typingEnd}=pushMsg(st.say,{step:i}); b.kind='q'; b.ui=buildUI(st,b); placeUI(b);
  showUI(b,typingEnd-.4); await wait(Math.max(.2,typingEnd-.4)); busy=false;
}
async function goBack(){
  if(busy||history.length<=1) return; busy=true; React.back();
  const cur=history.pop(); const removing=[];
  while(stack.length&&stack[stack.length-1].step===cur) removing.unshift(stack.pop());
  const q=removing[removing.length-1]; hideUI(q);
  removing.slice(0,-1).forEach(b=>gsap.to(b.el,{opacity:0,y:'-=40',filter:'blur(16px)',duration:.5,ease:'power2.in'}));
  const out=typeOut(q); await wait(.18); layout(true,1);
  out.then(()=>removing.forEach(b=>{ b.el.remove(); b.ui&&b.ui.remove(); }));
  const back=stack[stack.length-1]; setProgress(STEPS[back.step].progress); setBack(history.length>1);
  if(STEPS[back.step].id==='feel') refreshPrices(back.ui);
  showUI(back,.6); await wait(.9); busy=false;
}
setBack(false);
backBtn.addEventListener('click',()=>{ Sound.init(); goBack(); });
async function next(from){ const i=history[history.length-1]; if(from!==undefined&&from!==i) return; if(i===STEPS.length-1) return submit(); React.step(); await enterStep(i+1); }

function refreshPrices(ui){ ui&&ui.querySelectorAll('[data-tier]').forEach(c=>{ const p=c.querySelector('[data-price]'); if(p) p.textContent=priceFor(+c.dataset.tier); }); }

function buildUI(st){
  const ui=tpl('ui'), u=st.ui, SI=STEPS.indexOf(st);
  if(u.type==='choice'||u.type==='cards'){
    const row=tpl('row'); if(u.type==='cards'){ row.classList.add('is-scroll'); ui.classList.add('is-fill','is-cards'); }
    u.options.forEach(o=>{
      let btn;
      if(u.type==='cards'){ btn=tpl('card','button'); put(btn,'[data-label]',o.label); put(btn,'[data-desc]',o.desc); btn.dataset.tier=o.tier; put(btn,'[data-price]',priceFor(o.tier)); }
      else { btn=tpl('btn','button'); put(btn,'[data-label]',o.label); put(btn,'[data-sub]',o.sub); if(u.fixed) btn.classList.add('is-fixed'); }
      if(data[u.key]===o.value) btn.classList.add('is-active');
      btn.addEventListener('click',()=>pick(btn,o)); btn.addEventListener('pointerenter',()=>Sound.play('hover'));
      row.appendChild(btn);
    });
    ui.appendChild(row);
    if(u.foot){ const f=tpl('ghost','button'); put(f,'[data-label]',u.foot.label); if(data[u.key]===u.foot.value) f.classList.add('is-active'); f.addEventListener('click',()=>pick(f,u.foot)); ui.appendChild(f); }
    function pick(btn,o){ if(busy) return; Sound.init(); React.press(false);
      ui.querySelectorAll('.is-active').forEach(x=>x.classList.remove('is-active')); btn.classList.add('is-active');
      if(u.key!=='_start'){ data[u.key]=o.value; LABELS[u.key]=o.label+(o.sub?' · '+o.sub:''); }
      st.onAnswer&&st.onAnswer(o); busy=true; gsap.delayedCall(.32,()=>{ busy=false; next(SI); }); }
  }
  if(u.type==='multi'){
    const row=tpl('row'); const sel=new Set(data[u.key]); const btns=[];
    u.options.forEach(o=>{
      const btn=tpl('btn','button'); put(btn,'[data-label]',o.label); put(btn,'[data-sub]',null);
      btn.classList.toggle('is-active',sel.has(o.value)); btn.setAttribute('aria-pressed',sel.has(o.value));
      btn.addEventListener('pointerenter',()=>Sound.play('hover'));
      btn.addEventListener('click',()=>{ Sound.init(); React.press();
        if(o.value===u.none){ sel.clear(); sel.add(o.value); } else { sel.delete(u.none); sel.has(o.value)?sel.delete(o.value):sel.add(o.value); }
        btns.forEach((x,k)=>{ const on=sel.has(u.options[k].value); x.classList.toggle('is-active',on); x.setAttribute('aria-pressed',on); }); });
      btns.push(btn); row.appendChild(btn);
    });
    const go=tpl('icon','button'); go.setAttribute('aria-label','Continue');
    go.addEventListener('click',()=>{ if(busy) return; if(!sel.size){ React.error(); return; }
      data[u.key]=[...sel]; LABELS[u.key]=u.options.filter(o=>sel.has(o.value)).map(o=>o.label).join(', '); React.press(false); next(SI); });
    row.appendChild(go); ui.appendChild(row);
  }
  if(u.type==='text'){
    const fields=typeof u.fields==='function'?u.fields(data):u.fields;
    const form=tpl('fields','form'); form.noValidate=true;
    const inputs=fields.map((f,k)=>{
      const r=tpl('fieldrow'); const inp=tpl('input','input');
      inp.id='brief-'+f.key; inp.name=f.key; inp.type=f.type||'text'; inp.placeholder=f.placeholder; inp.value=data[f.key]||'';
      if(f.autocomplete) inp.autocomplete=f.autocomplete; inp.setAttribute('aria-label',f.placeholder);
      inp.addEventListener('input',()=>{ React.type(); inp.classList.remove('is-error'); });
      r.appendChild(inp);
      form.appendChild(r); return {f,inp};
    });
    { const go=tpl('icon','button'); go.classList.add('is-field'); go.type='submit'; go.setAttribute('aria-label','Continue');
      if(fields.length>1){ go.classList.add('is-below'); form.appendChild(go); } else form.lastChild.appendChild(go); }
    form.addEventListener('submit',e=>{ e.preventDefault(); e.stopPropagation(); if(busy) return; Sound.init(); let ok=true;
      for(const {f,inp} of inputs){ const v=inp.value.trim();
        const bad=(f.required&&!v)||(f.type==='email'&&v&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v));
        if(bad){ if(ok) inp.focus(); ok=false; inp.classList.add('is-error'); } }
      if(!ok){ React.error(); return; }
      inputs.forEach(({f,inp})=>data[f.key]=inp.value.trim()); React.press(false); next(SI); });
    ui.appendChild(form);
  }
  if(u.type==='notes'){
    ui.classList.add('is-fill'); const form=tpl('fields','form'); form.noValidate=true; form.classList.add('is-fill'); const ta=tpl('area','textarea'); ta.id='brief-notes'; ta.value=data.notes;
    ta.placeholder='Goals, ideas, deadlines…'; ta.setAttribute('aria-label','Goals, ideas, deadlines');
    ta.addEventListener('input',()=>React.type());
    ta.addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)) form.requestSubmit(); });
    const send=tpl('send','button'); send.type='submit'; ta.dataset.fit=''; send.dataset.fit=''; form.append(ta,send);
    form.addEventListener('submit',e=>{ e.preventDefault(); e.stopPropagation(); if(busy) return; data.notes=ta.value.trim(); React.press(); submit(); });
    ui.appendChild(form);
  }
  col.appendChild(ui); return ui;
}

const prog={v:0};
function setProgress(v){
  gsap.to(prog,{v,duration:.9,ease:'expo.inOut',onUpdate(){ fillEl.style.transform=`scaleX(${prog.v/100})`; pctEl.textContent=Math.round(prog.v)+'%'; }});
  gsap.to(pctEl,{opacity:v>0?1:0,duration:.3});
}

function payload(){
  const tier={essential:0,advanced:1,signature:2}[data.feel];
  const q=new URLSearchParams(location.search);
  return {
    'Source':CONFIG.source, 'Project':data.project, 'Type':LABELS.kind||'', 'Size':LABELS.size||'', 'Level':LABELS.feel||'',
    'Starting price': tier!=null?priceFor(tier):'—', 'Extras':LABELS.extras||'', 'Ready':LABELS.assets||'',
    'Current site':data.currentSite, 'References':data.references, 'Name':data.name, 'Email':data.email, 'Notes':data.notes,
    'UTM':[...q].filter(([k])=>k.startsWith('utm_')).map(([k,v])=>k+'='+v).join('&'), 'Timezone':Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
function sendWebflowForm(p){
  const form=ROOT.querySelector('[data-brief-form] form, form[data-brief-form]'); if(!form) return false;
  for(const [k,v] of Object.entries(p)){
    let inp=form.querySelector(`[name="${k}"]`);
    if(!inp){ inp=document.createElement('input'); inp.type='hidden'; inp.name=k; form.appendChild(inp); }
    inp.value=Array.isArray(v)?v.join(', '):(v??'');
  }
  const wrap=form.closest('.w-form')||form.parentElement;
  const go=()=>{ form.requestSubmit ? form.requestSubmit() : form.submit(); };
  let n=0; (function tryIt(){ if(wrap.classList.contains('w-form-loading') && n++<40) return setTimeout(tryIt,250); go(); })();
  return true;
}
async function submit(){
  if(busy) return; busy=true; setBack(false);
  const p=payload(); window.__lastLead=p;
  try{ sendWebflowForm(p); }catch(e){ console.warn('[BRIEF] form',e); }
  if(CONFIG.endpoint){ try{ await fetch(CONFIG.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)}); }catch(e){} }
  setProgress(100); hideUI(stack[stack.length-1]);
  stack.forEach((b,k)=>gsap.to(b.el,{opacity:0,y:'-=60',filter:'blur(16px)',duration:.8,delay:k*.03,ease:'power2.in'}));
  gsap.to(progEl,{autoAlpha:0,duration:.5,delay:.6});
  React.submit(); await wait(1.5);
  const first=(data.name||'').split(' ')[0];
  const b=makeMsg(CONFIG.finalText.replace('{name}', first?', '+first:''), colFinal);
  gsap.set(b.el,{y:colFinal.clientHeight*.5});
  const tw=typeIn(b,0);
  const cta=ROOT.querySelector('[data-brief-cta]'); if(cta) gsap.to(cta,{autoAlpha:1,duration:.45,delay:tw.duration()-.4});
}

addEventListener('resize',()=>{ if(typing()) return; layout(false); });
document.addEventListener('focusout',()=>{ if(!matchMedia('(pointer:coarse)').matches) return; setTimeout(()=>{ if(typing()) return; window.scrollTo(0,0); document.documentElement.scrollTop=0; document.body.scrollTop=0; layout(false); },60); });
addEventListener('keydown',e=>{ if(e.key==='Escape') goBack(); });
(document.fonts?document.fonts.ready:Promise.resolve()).then(()=>enterStep(0));
