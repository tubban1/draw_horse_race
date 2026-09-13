'use strict';
const $=id=>document.getElementById(id), palette=['#20231c','#ef6548','#546bdd','#b951b3'];
const S={screen:'draw',pet:null,aspect:null,strokes:[],color:palette[0],drawing:null,mode:'free',sound:true,elapsed:0,horses:[],combo:0,maxCombo:0,lastBeat:-1,boost:0,phase:'idle',seed:1,raf:0,last:0,challenge:null,dailyVariant:null,ai:null,aiRequestId:0,replayFrames:[],replayHorses:[],replayLast:null};
let toastTimer;
const music = window.derbyAudio;
document.addEventListener('pointerdown',()=>music.unlock(),{once:true});
document.addEventListener('keydown',()=>music.unlock(),{once:true});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function toast(t){$('toast').textContent=t;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,3500)}
function tone(f=500){music.effect(f===450?'count':f===180?'miss':'hit',S.combo)}
function readSave(){try{return JSON.parse(localStorage.getItem('derby-v1'))||{}}catch{return{}}}
function save(){try{localStorage.setItem('derby-v1',JSON.stringify({strokes:S.strokes,aspect:S.aspect,petId:S.pet?.id,name:$('name').value,best:S.best}))}catch{}}
function fit(c){const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);if(r.width<1||r.height<1)return null;c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);const ctx=c.getContext('2d');ctx.setTransform(d,0,0,d,0,0);return {ctx,w:r.width,h:r.height}}
function ink(ctx,strokes,w,h){ctx.lineCap='round';ctx.lineJoin='round';for(const s of strokes){ctx.strokeStyle=s.c;ctx.fillStyle=s.c;ctx.lineWidth=4;ctx.beginPath();s.p.forEach(([x,y],i)=>i?ctx.lineTo(x*w,y*h):ctx.moveTo(x*w,y*h));if(s.p.length===1){ctx.arc(s.p[0][0]*w,s.p[0][1]*h,2,0,Math.PI*2);ctx.fill()}else ctx.stroke()}}
// Keep the original paper's aspect ratio, including when the viewport changes.
function drawingFrame(width,height,aspect){
  const w=Math.min(width,height*aspect),h=w/aspect;
  return {w,h,left:(width-w)/2,top:(height-h)/2};
}
function draw(){
  const v=fit($('drawing'));
  if(v){
    if(!S.aspect){S.aspect=v.w/v.h;if(S.strokes.length)save();}
    const frame=drawingFrame(v.w,v.h,S.aspect);
    v.ctx.save();v.ctx.translate(frame.left,frame.top);
    ink(v.ctx,[...S.strokes,...(S.drawing?[S.drawing]:[])],frame.w,frame.h);
    v.ctx.restore();
  }
  $('placeholder').hidden=!!(S.strokes.length||S.drawing);
  $('start').disabled=$('clear').disabled=$('undo').disabled=!S.strokes.length;
  $('horse-note').textContent=S.pet?`${S.pet.tag} · ${S.pet.bio}`:S.strokes.length?`${S.strokes.length} 笔灵魂线条 · 物种：暂定为马`:'灵魂画手，准备登场。';
}
for(const [i,c] of palette.entries()){const b=document.createElement('button');b.className='swatch';b.style.background=c;b.setAttribute('aria-label',['墨黑','珊瑚红','电光蓝','葡萄紫'][i]);b.setAttribute('aria-pressed',i===0);b.onclick=()=>{S.color=c;document.querySelectorAll('.swatch').forEach(x=>x.setAttribute('aria-pressed',x===b))};$('swatches').append(b)}
function point(e){
  const r=$('drawing').getBoundingClientRect(),f=drawingFrame(r.width,r.height,S.aspect||r.width/r.height);
  return [clamp((e.clientX-r.left-f.left)/f.w,0,1),clamp((e.clientY-r.top-f.top)/f.h,0,1)];
}
$('drawing').onpointerdown=e=>{if(S.drawing||e.button>0)return;if(S.strokes.length>=80)return toast('画纸已经很有灵魂了，先开跑吧。');if(!S.strokes.length){const r=$('drawing').getBoundingClientRect();S.aspect=r.width/r.height;}$('drawing').setPointerCapture(e.pointerId);S.drawing={c:S.color,p:[point(e)],id:e.pointerId};draw()};
$('drawing').onpointermove=e=>{if(!S.drawing||S.drawing.id!==e.pointerId)return;const p=point(e),a=S.drawing.p.at(-1);if(Math.hypot(p[0]-a[0],p[1]-a[1])>.002&&S.drawing.p.length<1600){S.drawing.p.push(p);draw()}};
function end(e){if(!S.drawing||S.drawing.id!==e.pointerId)return;S.pet=null;S.strokes.push({c:S.drawing.c,p:S.drawing.p});S.drawing=null;draw();save();music.effect('draw',S.strokes.length)}
$('drawing').onpointerup=end;$('drawing').onpointercancel=end;
$('undo').onclick=()=>{S.pet=null;S.strokes.pop();draw();save()};$('clear').onclick=()=>{S.pet=null;S.strokes=[];S.aspect=null;draw();save()};$('name').oninput=save;
const names=['马马虎虎','周一不想跑','汗血保温杯','真的不是狗','马上下班','一匹潦草'];
$('rename').onclick=()=>{$('name').value=names[(names.indexOf($('name').value)+1)%names.length];save()};
function template(k,c=palette[0]){const stretch=k%3===0?.1:0;return[{c,p:[[.13,.43],[.08,.23],[.19,.36],[.65+stretch,.36],[.7+stretch,.15],[.75+stretch,.24],[.84+stretch,.24],[.88+stretch,.34],[.78+stretch,.43],[.74+stretch,.62],[.2,.62],[.13,.43]]},{c,p:[[.27,.62],[.22,.84],[.31,.84]]},{c,p:[[.4,.62],[.43,.84],[.5,.84]]},{c,p:[[.6,.62],[.58,.82],[.65,.82]]},{c,p:[[.7,.61],[.78,.81],[.86,.81]]}]}
const nextAdoption=adoptionBag(),adoptionsSeen=new Set();
let beforeAdoption=null;
$('borrow').onclick=()=>{
  if(!beforeAdoption){beforeAdoption={strokes:structuredClone(S.strokes),aspect:S.aspect,name:$('name').value};$('restore-drawing').hidden=false;}
  const pet=nextAdoption(),art=adoptionDrawing(pet.id,S.color);
  S.strokes=art.strokes;S.aspect=art.aspect;S.pet=pet;
  $('name').value=pet.name;adoptionsSeen.add(pet.id);
  $('borrow').textContent=`再拆一匹怪马 · 已见 ${adoptionsSeen.size}/12 ↻`;
  draw();save();music.effect('adopt');toast(`领养成功：${pet.name} / ${pet.tag}`);
};
$('restore-drawing').onclick=()=>{if(!beforeAdoption)return;S.strokes=beforeAdoption.strokes;S.aspect=beforeAdoption.aspect;S.pet=null;$('name').value=beforeAdoption.name;beforeAdoption=null;$('restore-drawing').hidden=true;draw();save();toast('领养前的画稿已还原。')};
function hash(t){let n=2166136261;for(const c of t)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0}
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function dateKey(){return new Date().toISOString().slice(0,10)}
const DAILY_VARIANTS=[
  {id:'double',label:'连击翻倍日',rule:'连中越多，马越不讲理。',targetStart:.7,targetEnd:.96,comboBoost:.42},
  {id:'rush',label:'全员早退日',rule:'对手集体赶下班，别让它们先溜。',opponentSpeed:1.05},
  {id:'mud',label:'泥地摆烂日',rule:'所有马都慢一点，节奏才是王。',speedFactor:.84,targetStart:.66,targetEnd:.98},
  {id:'needle',label:'针尖节拍日',rule:'绿区变窄，命中一次就上热搜。',targetStart:.83,targetEnd:.94,comboBoost:.35},
  {id:'wind',label:'妖风抽签日',rule:'对手忽快忽慢，别信表面排名。',wind:1.15},
  {id:'rocket',label:'火箭发射日',rule:'每次命中都带二段推力。',playerSpeed:-.3,baseBoost:3.4,maxBoost:6.2,comboBoost:.5},
  {id:'rainbow',label:'彩虹赛道日',rule:'颜色越多，起步越快。',colorBoost:.32}
];
function dailyChallenge(key=dateKey()){return DAILY_VARIANTS[hash(key)%DAILY_VARIANTS.length]}
function targetWindow(){const v=S.dailyVariant;return {start:v?.targetStart??.72,end:v?.targetEnd??.96}}
function syncTarget(){const target=targetWindow(),el=document.querySelector('.target');if(!el)return;el.style.left=`${target.start*100}%`;el.style.width=`${(target.end-target.start)*100}%`}
function mode(m){S.mode=m;S.dailyVariant=m==='daily'?dailyChallenge():null;$('free').classList.toggle('selected',m==='free');$('daily').classList.toggle('selected',m==='daily');$('mode-desc').innerText=m==='daily'?`${dateKey()} · ${S.dailyVariant.label}\n${S.dailyVariant.rule}`:'100 米离谱短跑 · 约 20 秒\n踩准节奏，就能反超。';syncTarget()}
$('free').onclick=()=>mode('free');$('daily').onclick=()=>mode('daily');
const AI_CACHE_PREFIX='derby-ai-v1:';
function normalizeAiResult(value,source='ai'){
  if(!value||typeof value!=='object')return null;
  const clean=(v,max)=>typeof v==='string'?v.replace(/[\\r\\n]+/g,' ').replace(/[<>]/g,'').trim().slice(0,max):'';
  const result={species:clean(value.species,18),verdict:clean(value.verdict,48),challenge:clean(value.challenge,56),source};
  return result.species&&result.verdict&&result.challenge?result:null;
}
function localAi(strokes=S.strokes){
  const points=strokes.flatMap(s=>s.p),minX=Math.min(...points.map(p=>p[0]),0),maxX=Math.max(...points.map(p=>p[0]),1),minY=Math.min(...points.map(p=>p[1]),0),maxY=Math.max(...points.map(p=>p[1]),1),ratio=((maxX-minX)*(S.aspect||1))/Math.max(.01,maxY-minY),colors=new Set(strokes.map(s=>s.c)).size;
  const catalog=ratio>2.8?[['疑似折叠晾衣架','四肢各有想法，但下班方向一致。','我的晾衣架跑完了，你画的那玩意敢来吗？'],['疑似逃跑的长面条','身体先出发，灵魂还在起点。','我的面条跑完了，你的能别打结吗？']]:ratio<.72?[['疑似通风报信的路牌','站得很直，跑得很有意见。','我的路牌都跑完了，你画的敢来吗？'],['疑似加班后的图钉','个子不大，拒绝原地待命。','我的图钉跑完了，你的还在桌上吗？']]:colors>=3?[['疑似彩色章鱼马','颜色很多，腿的意见也很多。','我的彩色怪物跑完了，你的敢接吗？'],['疑似打翻的调色盘','每一笔都想当主角，最后竟然完赛。','我的调色盘跑完了，你来收拾吗？']]:[['疑似会跑的办公桌','四条腿都在上班，方向却非常自由。','我的办公桌跑完了，你画的敢来吗？'],['疑似周一的精神状态','看起来没醒，但已经冲过终点。','我的周一跑完了，你的今天敢接吗？']];
  const item=catalog[hash(JSON.stringify(strokes))%catalog.length];return normalizeAiResult({species:item[0],verdict:item[1],challenge:item[2]},'fallback');
}
function aiCacheKey(){return AI_CACHE_PREFIX+hash(JSON.stringify({strokes:S.strokes,aspect:S.aspect}))}
function readAiCache(){try{return normalizeAiResult(JSON.parse(localStorage.getItem(aiCacheKey())),'ai')}catch{return null}}
function writeAiCache(value){try{localStorage.setItem(aiCacheKey(),JSON.stringify(value))}catch{}}
function aiDrawingData(){
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=240;const ctx=canvas.getContext('2d');ctx.fillStyle='#fafbf3';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#20231c';ink(ctx,S.strokes,canvas.width,canvas.height);return canvas.toDataURL('image/png');
}
function renderAiResult(){
  const box=$('ai-verdict');if(!box)return;box.hidden=false;box.dataset.state=S.ai?.pending?'loading':'ready';box.dataset.source=S.ai?.source||'fallback';
  $('ai-verdict-status').textContent=S.ai?.pending?'正在观察你的画……':S.ai?.source==='cache'?'AI 已鉴定 · 本机缓存':S.ai?.source==='ai'?'AI 已鉴定':'本地备用鉴定';
  $('ai-species').textContent=S.ai?.pending?'正在给它起外号':S.ai?.species||'未知物种';
  $('ai-line').textContent=S.ai?.pending?'比赛先跑，鉴定马上回来。':S.ai?.verdict||'';
  $('ai-challenge').textContent=S.ai?.pending?'先想想你朋友会画出什么。':S.ai?.challenge||'';
}
async function requestAiIdentification(){
  const requestId=++S.aiRequestId,fallback=localAi();S.ai={...fallback,pending:true};renderAiResult();
  const cached=readAiCache();if(cached){if(requestId!==S.aiRequestId)return;S.ai={...cached,source:'cache',pending:false};renderAiResult();return}
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    const response=await fetch('/api/identify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:aiDrawingData(),meta:{strokes:S.strokes.length,colors:new Set(S.strokes.map(s=>s.c)).size,aspect:S.aspect||1}}),signal:controller.signal});
    clearTimeout(timer);if(!response.ok)throw Error('ai-unavailable');const value=normalizeAiResult(await response.json());if(!value)throw Error('ai-invalid');
    if(requestId!==S.aiRequestId)return;S.ai={...value,pending:false};writeAiCache(value);
  }catch{if(requestId!==S.aiRequestId)return;S.ai={...fallback,pending:false}}
  renderAiResult();if(S.screen==='result')poster();
}
function screen(n){cancelAnimationFrame(S.raf);S.screen=n;music.setScene(n);for(const k of ['draw','race','result','feedbacks'])$(k+'-screen').hidden=k!==n;window.scrollTo(0,0);if(n==='draw')draw()}
function start(){if(!S.strokes.length)return;music.unlock();save();S.dailyVariant=S.challenge?.m?DAILY_VARIANTS.find(v=>v.id===S.challenge.m)||null:S.mode==='daily'?dailyChallenge():null;syncTarget();S.seed=S.challenge?.s??(S.mode==='daily'?hash(dateKey()):Math.floor(Math.random()*4294967296));const rng=random(S.seed);S.horses=Array.from({length:3},(_,i)=>({name:['不是驴','马力全无','长话短说'][i],strokes:template(i,palette[i+1]),x:0,time:0,speed:5.4+rng()*.8,offset:rng()*6}));if(S.challenge)S.horses[0]={name:S.challenge.n+' · 影子',strokes:S.challenge.d,aspect:S.challenge.a||1,x:0,time:0,ghost:S.challenge.t};S.horses.push({name:$('name').value.trim()||'无名之马',strokes:structuredClone(S.strokes),aspect:S.aspect,petId:S.pet?.id,colors:new Set(S.strokes.map(s=>s.c)).size,x:0,time:0,player:true});S.elapsed=-3;S.combo=0;S.maxCombo=0;S.lastBeat=-1;S.boost=0;S.phase='countdown';S.last=0;S.countNumber=0;S.replayFrames=[{t:-3,x:S.horses.map(h=>h.x),time:S.horses.map(h=>h.time||0)}];S.replayHorses=[];S.replayLast=-3;$('race-name').textContent=S.horses[3].name;$('race-mode').textContent=S.challenge?`好友挑战 · 对手是成绩配速影子${S.dailyVariant?` · ${S.dailyVariant.label}`:''}`:S.mode==='daily'?`每日挑战 · ${S.dailyVariant.label}`:'自由赛 / THE QUESTIONABLE DERBY';$('boost').disabled=true;$('feedback').textContent=S.dailyVariant?`今日规则：${S.dailyVariant.rule}`:'光标进入绿色区时点击 / 按空格。连点不会更快。';$('race-comment').textContent=S.dailyVariant?`今日挑战：${S.dailyVariant.label}`:'选手正在热身，物种有待确认。';requestAiIdentification();screen('race');S.raf=requestAnimationFrame(loop)}
$('start').onclick=start;$('again').onclick=start;$('back').onclick=()=>{S.phase='idle';screen('draw')};$('redraw').onclick=()=>screen('draw');
function cheer(){if(S.screen!=='race'||S.phase!=='running')return;const beat=Math.floor(S.elapsed/.8);if(S.lastBeat===beat)return;S.lastBeat=beat;const p=(S.elapsed%.8)/.8,target=targetWindow(),hit=p>=target.start&&p<=target.end;S.combo=hit?S.combo+1:0;S.maxCombo=Math.max(S.maxCombo,S.combo);const v=S.dailyVariant,base=v?.baseBoost??2.7,bonus=v?.comboBoost??.22,cap=v?.maxBoost??4.6;S.boost=hit?Math.min(cap,base+S.combo*bonus):.4;$('feedback').textContent=hit?`漂亮！连击 × ${S.combo} · ${S.combo>=3?'马力全开！':'继续保持节奏'}`:'早了或晚了，再找找节奏。';tone(hit?660+Math.min(S.combo,6)*60:180)}
$('boost').onclick=cheer;window.addEventListener('keydown',e=>{if(e.code==='Space'&&S.screen==='race'&&!e.repeat&&e.target.tagName!=='BUTTON'){e.preventDefault();cheer()}});

function recordReplayFrame(force=false){
  if(!S.horses.length)return;
  if(!force&&Number.isFinite(S.replayLast)&&S.elapsed-S.replayLast<.05)return;
  S.replayLast=S.elapsed;
  S.replayFrames.push({t:S.elapsed,x:S.horses.map(h=>h.x),time:S.horses.map(h=>h.time||0)});
}
$('sound').onclick=()=>{S.sound=!S.sound;$('sound').textContent=S.sound?'音乐 开 ♪':'音乐 关 ◌';$('sound').setAttribute('aria-pressed',S.sound);music.setEnabled(S.sound)};
function loop(now){if(S.screen!=='race')return;const dt=S.last?Math.min((now-S.last)/1000,.05):0;S.last=now;if(!document.hidden){S.elapsed+=dt;if(S.elapsed<0){const c=Math.ceil(-S.elapsed);$('countdown').textContent=c;if(c!==S.countNumber){S.countNumber=c;tone(450)}}else{if(S.phase==='countdown')music.effect('go');S.phase='running';music.sync(S.elapsed,S.combo);$('boost').disabled=false;$('countdown').textContent=S.elapsed<.6?'跑！':'';const step=Math.min(dt,S.elapsed);S.boost=Math.max(0,S.boost-step*1.4);for(const h of S.horses){if(h.time)continue;const old=h.x;const v=S.dailyVariant,wind=v?.wind?Math.sin(S.elapsed*.9+h.offset)*v.wind:0,colorBoost=h.player?(v?.colorBoost||0)*Math.max(0,h.colors||0):0;const speed=h.ghost?100/h.ghost:(h.player?5.2+S.boost+(v?.playerSpeed||0)+colorBoost:(h.speed+(v?.opponentSpeed||0)+wind)*(v?.speedFactor||1));h.x=Math.min(100,old+speed*step);if(h.x>=100)h.time=S.elapsed-step+(100-old)/speed}const p=S.horses[3];$('distance').textContent=`${Math.floor(p.x)} / 100 m`;$('timer').textContent=`${(p.time||S.elapsed).toFixed(2)}s`;$('combo').textContent=`连击 × ${S.combo}`;$('needle').style.left=((S.elapsed%.8)/.8*98)+'%';if(p.x>75)$('race-comment').textContent='最后 25 米！抽象也是一种实力。';if(p.time){finish();return}}}if(typeof recordReplayFrame==='function')recordReplayFrame();renderTrack();S.raf=requestAnimationFrame(loop)}
document.addEventListener('visibilitychange',()=>{S.last=0;music.pause(document.hidden)});
function horse(ctx,strokes,x,y,size,phase,still=false,aspect=1){let minX=1,maxX=0,minY=1,maxY=0;for(const s of strokes)for(const [px,py] of s.p){minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py)}const w=Math.max(.06,(maxX-minX)*aspect),h=Math.max(.06,maxY-minY),scale=size/Math.max(w,h*1.5);ctx.save();ctx.translate(x,y);ctx.fillStyle='#28382018';ctx.beginPath();ctx.ellipse(0,20,size*.48,6,0,0,Math.PI*2);ctx.fill();ctx.translate(0,still?0:Math.sin(phase)*3);ctx.rotate(still?0:Math.sin(phase*.5)*.025);ctx.lineCap='round';ctx.lineJoin='round';for(const s of strokes){ctx.strokeStyle=s.c;ctx.lineWidth=2.5;ctx.beginPath();s.p.forEach(([px,py],i)=>{let xx=(px-(minX+maxX)/2)*aspect*scale,yy=(py-maxY)*scale+10;const leg=clamp((py-minY)/h-.55,0,.45)/.45;if(!still){xx+=Math.sin(phase+px*14)*leg*9;yy-=Math.max(0,Math.cos(phase+px*14))*leg*7}if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy)});if(s.p.length===1){ctx.lineTo((s.p[0][0]-(minX+maxX)/2)*aspect*scale+.5,(s.p[0][1]-maxY)*scale+10)}ctx.stroke()}ctx.restore()}
function renderTrack(){const v=fit($('track'));if(!v)return;const {ctx:c,w,h}=v;const player=S.horses[3],cam=Math.max(0,player.x-16),unit=w<600?9:13;const left=w<600?65:140;const top=125,lane=(h-top-25)/4,daily=S.dailyVariant;c.fillStyle=daily?.id==='mud'?'#ddd6ba':daily?.id==='wind'?'#dce7be':'#e8edcc';c.fillRect(0,0,w,h);c.fillStyle='#d3dfa0';for(let i=0;i<9;i++){const x=((i*190-cam*unit*.3)%(w+190)+w+190)%(w+190)-50;c.beginPath();c.ellipse(x,105,100,30,0,0,Math.PI*2);c.fill()}if(daily?.id==='wind'){c.strokeStyle='#b5c995';c.lineWidth=2;c.setLineDash([12,12]);for(let i=0;i<6;i++){c.beginPath();c.moveTo(i*170-(cam*unit*.5%170),top-20);c.lineTo(i*170+80-(cam*unit*.5%170),top-55);c.stroke()}c.setLineDash([])}c.fillStyle='#f5f4df';c.fillRect(0,top-28,w,h);for(let i=0;i<5;i++){const yy=top-15+i*lane;c.strokeStyle='#d8dcc3';c.beginPath();c.moveTo(0,yy);c.lineTo(w,yy);c.stroke()}for(let m=0;m<=100;m+=10){const xx=left+(m-cam)*unit;if(xx<-40||xx>w+40)continue;c.strokeStyle='#c5cbb0';c.setLineDash([4,8]);c.beginPath();c.moveTo(xx,top-25);c.lineTo(xx,h);c.stroke();c.setLineDash([]);c.fillStyle='#8b9474';c.font='10px Arial';c.fillText(m+'m',xx+5,h-8)}const fx=left+(100-cam)*unit;if(fx<w+20){for(let i=0;i<24;i++)for(let j=0;j<2;j++){c.fillStyle=(i+j)%2?'#f9faee':'#20231c';c.fillRect(fx+j*8,top-25+i*12,8,12)}}S.horses.forEach((a,i)=>{const raw=left+(a.x-cam)*unit,x=clamp(raw,28,w-30),y=top+i*lane+lane*.6;horse(c,a.strokes,x,y,w<600?78:125,Math.max(0,S.elapsed)*12+i,false,a.aspect||1);c.font=(a.player?'bold ':'')+'10px Arial';c.textAlign='center';c.fillStyle=a.player?'#20231c':'#737b61';c.fillText((raw<28?'← ':raw>w-30?'→ ':'')+(a.player?'你的马':a.name),x,y-45)});const sorted=[...S.horses].sort((a,b)=>b.x-a.x||(a.time||Infinity)-(b.time||Infinity));$('ranks').replaceChildren(...sorted.map((a,i)=>{const e=document.createElement('span');e.textContent=`${i+1}  ${a.player?'你 · ':''}${a.name}`;if(a.player)e.className='you';return e}))}
function finish(){S.phase='finished';$('boost').disabled=true;recordReplayFrame(true);S.replayHorses=S.horses.map(h=>({...h,strokes:h.strokes.map(s=>({c:s.c,p:s.p.map(point=>[point[0],point[1]])}))}));const p=S.horses[3];S.place=1+S.horses.filter(h=>!h.player&&h.time&&h.time<p.time).length;const old=S.best;S.best=Math.min(old||Infinity,p.time);save();$('best').textContent=`本机最佳 ${S.best.toFixed(2)} 秒 · 再快一点，就一点。`;S.receipt=raceReceipt({horse:p,place:S.place,combo:S.maxCombo,seed:S.seed,challengeTime:S.challenge?.t,previousBest:old});
$('result-title').textContent=S.receipt.title;
$('result-desc').textContent=`${S.receipt.intro}\n${S.receipt.stats}\n${S.receipt.performance}${S.dailyVariant?`\n今日规则：${S.dailyVariant.label} · ${S.dailyVariant.rule}`:''}`;
$('challenge-result').textContent=`${S.receipt.verdict}${S.dailyVariant?` 今日挑战 · ${S.dailyVariant.label}`:''}`;
screen('result');renderAiResult();poster();music.effect('finish',S.place)}
function drawQr(ctx,text,x,y,size){
  if(!window.QRCode||!window.QRCodeErrorCorrectLevel)return false;
  try{
    const qr=new window.QRCode(0,window.QRCodeErrorCorrectLevel.L);
    qr.addData(text);qr.make();
    const count=qr.getModuleCount(),quiet=4,module=size/(count+quiet*2);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#fafbf3';ctx.fillRect(x,y,size,size);ctx.fillStyle='#20231c';
    for(let row=0;row<count;row++)for(let col=0;col<count;col++)if(qr.isDark(row,col)){
      // Snap both edges to the same integer grid so every module stays square and scan-friendly.
      const left=Math.round(x+(col+quiet)*module),top=Math.round(y+(row+quiet)*module);
      const right=Math.round(x+(col+quiet+1)*module),bottom=Math.round(y+(row+quiet+1)*module);
      ctx.fillRect(left,top,Math.max(1,right-left),Math.max(1,bottom-top));
    }
    ctx.restore();return true;
  }catch{return false}
}
function poster(){
  const c=$('poster').getContext('2d'),p=S.horses[3],W=1080,H=1500;
  c.fillStyle='#dfff4f';c.fillRect(0,0,W,H);c.fillStyle='#fafbf3';c.fillRect(34,34,W-68,H-68);c.fillStyle='#20231c';c.textAlign='center';
  c.font='bold 25px sans-serif';c.fillText('这也算马？  /  DOODLE DERBY',W/2,92);
  c.font='16px monospace';c.fillText('NO. '+S.receipt.serial,W/2,124);
  c.font='bold 28px sans-serif';c.fillText('我画的这玩意，居然跑完了 100 米。',W/2,190);
  const titleLines=S.receipt.title.split('\n');c.font='900 72px sans-serif';titleLines.forEach((line,i)=>c.fillText(line,W/2,278+i*76));
  c.font='900 150px Arial';c.fillText(p.time.toFixed(2)+'s',W/2,500);
  c.font='bold 25px sans-serif';c.fillText(`#${S.place}  /  最高连击 ${S.maxCombo}`,W/2,550);
  c.strokeStyle='#d6dbbd';c.lineWidth=2;c.beginPath();c.moveTo(120,590);c.lineTo(960,590);c.stroke();
  if(S.challenge){
    horse(c,S.challenge.d,325,850,260,0,true,S.challenge.a||1);horse(c,p.strokes,755,850,260,0,true,p.aspect||1);
    c.font='bold 20px sans-serif';c.fillText('朋友的马',325,940);c.fillText('你的马',755,940);
  }else horse(c,p.strokes,W/2,930,480,0,true,p.aspect||1);
  const ai=S.ai&&!S.ai.pending?S.ai:null;
  c.fillStyle='#dfff4f';c.fillRect(90,1030,900,150);c.fillStyle='#20231c';
  c.font='bold 28px sans-serif';c.fillText(ai?`AI 鉴定：${ai.species}`:S.receipt.taunt,540,1075,820);
  c.font='20px sans-serif';c.fillText(ai?ai.verdict:S.receipt.taunt,540,1112,820);
  c.font='22px sans-serif';c.fillText(ai?ai.challenge:'你画的，能跑几秒？扫码接战。',540,1148,820);
  c.font='17px sans-serif';c.fillText(`${S.challenge?'好友挑战':S.mode==='daily'?`每日挑战 · ${S.dailyVariant?.label||''}`:'自由赛'}  ·  ${S.receipt.metric}`,540,1170,820);
  // Keep the QR payload intentionally tiny so the same 138px mark has 2px+ modules on phones.
  const shareUrl=new URL(location.origin+location.pathname);shareUrl.hash='race='+encodeChallenge(12,true);
  if(drawQr(c,shareUrl.href,850,1230,138)){c.font='bold 14px sans-serif';c.fillText('扫码接战',919,1389)}
  c.font='15px Arial';c.fillText('DOODLE DERBY  /  发给一个不服的人',W/2,1462);
  const preview=$('poster-image');if(preview){preview.src=c.toDataURL('image/png');preview.hidden=false;$('poster').hidden=true}
}
function replayDuration(){
  const first=S.replayFrames[0]?.t??-3,last=S.replayFrames.at(-1)?.t??S.horses[3]?.time??0;
  return Math.max(.1,last-first);
}
function replaySample(offset){
  const frames=S.replayFrames.length?S.replayFrames:[{t:-3,x:S.replayHorses.map(()=>0),time:S.replayHorses.map(()=>0)}];
  const start=frames[0].t,target=start+clamp(offset,0,replayDuration());
  let right=frames.findIndex(frame=>frame.t>=target);if(right<0)right=frames.length-1;
  const left=Math.max(0,right-1),a=frames[left],b=frames[right],span=Math.max(.0001,b.t-a.t),mix=clamp((target-a.t)/span,0,1);
  return {t:target,x:a.x.map((value,i)=>value+(b.x[i]-value)*mix),time:a.time.map((value,i)=>value+(b.time[i]-value)*mix)};
}
function drawReplayScene(canvas,sample){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,hs=S.replayHorses,player=sample.x[3]||0,cam=Math.max(0,player-16),unit=w<600?9:13,left=w<600?65:140,top=105,lane=(h-top-18)/4,daily=S.dailyVariant;
  c.fillStyle=daily?.id==='mud'?'#ddd6ba':daily?.id==='wind'?'#dce7be':'#e8edcc';c.fillRect(0,0,w,h);
  c.fillStyle='#d3dfa0';for(let i=0;i<9;i++){const x=((i*190-cam*unit*.3)%(w+190)+w+190)%(w+190)-50;c.beginPath();c.ellipse(x,85,100,30,0,0,Math.PI*2);c.fill()}
  c.fillStyle='#f5f4df';c.fillRect(0,top-28,w,h);
  for(let i=0;i<5;i++){const yy=top-15+i*lane;c.strokeStyle='#d8dcc3';c.beginPath();c.moveTo(0,yy);c.lineTo(w,yy);c.stroke()}
  for(let m=0;m<=100;m+=10){const xx=left+(m-cam)*unit;if(xx<-40||xx>w+40)continue;c.strokeStyle='#c5cbb0';c.setLineDash([4,8]);c.beginPath();c.moveTo(xx,top-25);c.lineTo(xx,h);c.stroke();c.setLineDash([]);c.fillStyle='#8b9474';c.font='10px Arial';c.fillText(m+'m',xx+5,h-8)}
  const fx=left+(100-cam)*unit;if(fx<w+20){for(let i=0;i<24;i++)for(let j=0;j<2;j++){c.fillStyle=(i+j)%2?'#f9faee':'#20231c';c.fillRect(fx+j*8,top-25+i*12,8,12)}}
  hs.forEach((a,i)=>{const raw=left+((sample.x[i]||0)-cam)*unit,x=clamp(raw,28,w-30),y=top+i*lane+lane*.6;horse(c,a.strokes||[],x,y,w<600?58:95,Math.max(0,sample.t)*12+i,false,a.aspect||1);c.font=(a.player?'bold ':'')+'10px Arial';c.textAlign='center';c.fillStyle=a.player?'#20231c':'#737b61';c.fillText((raw<28?'← ':raw>w-30?'→ ':'')+(a.player?'你的马':a.name),x,y-38)});
  c.fillStyle='#20231c';c.textAlign='left';c.font='bold 13px Arial';c.fillText('这也算马？  /  完整比赛回放',18,24);c.textAlign='right';c.font='12px Arial';c.fillText(`${Math.max(0,sample.x[3]||0).toFixed(0)} / 100 m`,w-18,24);
  if(sample.t<0||sample.t<.6){c.fillStyle='#20231ccc';c.textAlign='center';c.font='900 58px Arial';c.fillText(sample.t<0?Math.ceil(-sample.t):'跑！',w/2,h/2)}
  else if(sample.time[3]&&sample.t>=sample.time[3]){c.fillStyle='#20231ccc';c.textAlign='center';c.font='900 34px Arial';c.fillText('冲线！ '+sample.time[3].toFixed(2)+'s',w/2,48)}
}
const replayState={playing:false,offset:0,last:0,raf:0};
function formatReplayTime(seconds){const total=Math.max(0,Math.floor(seconds)),minutes=Math.floor(total/60),rest=String(total%60).padStart(2,'0');return `${String(minutes).padStart(2,'0')}:${rest}`}
function renderReplay(){
  const duration=replayDuration(),sample=replaySample(replayState.offset),canvas=$('replay-track');
  if(canvas)drawReplayScene(canvas,sample);
  $('replay-seek').value=String(duration?replayState.offset/duration:0);
  $('replay-time').textContent=`${formatReplayTime(replayState.offset)} / ${formatReplayTime(duration)}`;
  $('replay-toggle').textContent=replayState.playing?'❚❚ 暂停':'▶ 继续';
}
function replayTick(now){
  if(!replayState.playing)return;
  replayState.offset+=Math.min(.1,(now-replayState.last)/1000);replayState.last=now;
  if(replayState.offset>=replayDuration()){replayState.offset=replayDuration();replayState.playing=false}
  renderReplay();if(replayState.playing)replayState.raf=requestAnimationFrame(replayTick);
}
function replayFormat(){const mime=preferredVideoMime();return mime?(mime.includes('mp4')?'MP4':'WebM'):'GIF'}
function openReplay(){
  if(!S.replayFrames.length||!S.replayHorses.length)return toast('这场比赛还没有可用回放。');
  const format=replayFormat();$('replay-format-note').textContent=`包含完整起跑、比赛过程和冲线结果。下载格式：${format}。`;$('replay-download').textContent=`下载完整比赛${format} ↓`;
  replayState.offset=0;replayState.playing=true;replayState.last=performance.now();renderReplay();$('replay-dialog').showModal();replayState.raf=requestAnimationFrame(replayTick);
}
function closeReplay(){replayState.playing=false;cancelAnimationFrame(replayState.raf);$('replay-dialog').close()}
$('save-clip').onclick=openReplay;$('replay-close').onclick=closeReplay;$('replay-toggle').onclick=()=>{replayState.playing=!replayState.playing;replayState.last=performance.now();renderReplay();if(replayState.playing)replayState.raf=requestAnimationFrame(replayTick)};
$('replay-seek').oninput=()=>{replayState.offset=Number($('replay-seek').value)*replayDuration();replayState.last=performance.now();renderReplay()};$('replay-dialog').addEventListener('close',()=>{replayState.playing=false;cancelAnimationFrame(replayState.raf)});
function preferredVideoMime(){
  if(!window.MediaRecorder||typeof MediaRecorder.isTypeSupported!=='function')return '';
  return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))||'';
}
async function createReplayGif(){
  if(!window.gifenc)throw Error('gif-unsupported');
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;const ctx=canvas.getContext('2d'),gif=window.gifenc.GIFEncoder(),duration=replayDuration();
  for(let t=0;t<duration;t+=.2){drawReplayScene(canvas,replaySample(t));const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data,palette=window.gifenc.quantize(rgba,64,{format:'rgb444'}),index=window.gifenc.applyPalette(rgba,palette,'rgb444');gif.writeFrame(index,canvas.width,canvas.height,{palette,delay:200,repeat:0})}
  drawReplayScene(canvas,replaySample(duration));const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data,palette=window.gifenc.quantize(rgba,64,{format:'rgb444'}),index=window.gifenc.applyPalette(rgba,palette,'rgb444');gif.writeFrame(index,canvas.width,canvas.height,{palette,delay:600,repeat:0});gif.finish();return {blob:new Blob([gif.bytes()],{type:'image/gif'}),extension:'gif',mime:'image/gif'};
}
async function createReplayVideo(){
  const mime=preferredVideoMime();if(!mime||!HTMLCanvasElement.prototype.captureStream)return createReplayGif();
  const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const stream=canvas.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:mime}),chunks=[],duration=replayDuration();
  recorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  const blob=await new Promise((resolve,reject)=>{recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));recorder.onerror=reject;recorder.start();const started=performance.now();const draw=now=>{const offset=Math.min(duration,(now-started)/1000);drawReplayScene(canvas,replaySample(offset));if(offset<duration)requestAnimationFrame(draw);else recorder.stop()};requestAnimationFrame(draw)});
  return {blob,extension:mime.includes('mp4')?'mp4':'webm',mime};
}
function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
$('replay-download').onclick=async()=>{const button=$('replay-download');button.disabled=true;button.textContent='正在生成完整回放…';try{const result=await createReplayVideo();downloadBlob(result.blob,`这也算马-完整回放.${result.extension}`);toast(`完整回放已下载（${result.extension.toUpperCase()}）。`)}catch{toast('回放生成失败，请稍后再试。')}finally{button.disabled=false;button.textContent=`下载完整比赛${replayFormat()} ↓`}};
// A bounded, versioned URL payload. Shared drawings are downsampled; local originals stay intact.
function encodeChallenge(pointBudget=200,compact=false){const p=S.horses[3],budget=Math.max(2,Math.floor(pointBudget/p.strokes.length));const d=p.strokes.map(s=>({c:s.c,p:s.p.filter((_,i)=>i===0||i===s.p.length-1||i%Math.max(1,Math.ceil(s.p.length/budget))===0).map(a=>a.map(n=>Math.round(n*1000)/1000))}));const variant=S.dailyVariant?.id||null;const payload=compact?[2,p.name,Math.round(p.time*100),S.seed,Math.round((p.aspect||1)*1000),d.map(s=>[palette.indexOf(s.c),s.p.map(a=>a.map(n=>Math.round(n*1000)))]),variant]:{v:1,n:p.name,t:+p.time.toFixed(4),s:S.seed,a:p.aspect||1,m:variant,d};return btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}
function decodeChallenge(raw,local=false){
  if(raw.length>(local?8000000:22000))throw Error('size');
  let encoded=raw.replaceAll('-','+').replaceAll('_','/');
  encoded+='='.repeat((4-encoded.length%4)%4);
  let v=JSON.parse(decodeURIComponent(escape(atob(encoded))));
  if(Array.isArray(v)&&v[0]===2){
    const compactStrokes=Array.isArray(v[5])?v[5].map(s=>({
      c:palette[s[0]],
      p:Array.isArray(s[1])?s[1].map(a=>[Number(a[0])/1000,Number(a[1])/1000]):[]
    })):[];
    v={v:1,n:v[1],t:Number(v[2])/100,s:v[3],a:Number(v[4])/1000,m:v[6]||null,d:compactStrokes};
  }
  if(v.v!==1||typeof v.n!=='string'||v.n.length>18||!Number.isFinite(v.t)||v.t<5||v.t>60||!Number.isInteger(v.s)||v.s<0||v.s>4294967295||!Array.isArray(v.d)||!v.d.length||v.d.length>80)throw Error('invalid');
  if(v.a!==undefined&&(!Number.isFinite(v.a)||v.a<.01||v.a>100))throw Error('aspect');
  if(v.m!==undefined&&v.m!==null&& (typeof v.m!=='string'||v.m.length>20))throw Error('variant');
  let total=0;
  for(const s of v.d){
    if(!palette.includes(s.c)||!Array.isArray(s.p)||!s.p.length)throw Error('stroke');
    for(const p of s.p){
      if(!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1))throw Error('point');
      if(++total>(local?128000:1000))throw Error('points');
    }
  }
  return v;
}
function resultShareText(url){
  const p=S.horses[3],r=S.receipt;
  const mode=S.challenge?'好友接战':S.mode==='daily'?`每日挑战 · ${S.dailyVariant?.label||dateKey()}`:'自由赛';
  const medals=S.maxCombo>=8?'🔥🔥🔥':S.maxCombo>=3?'🔥🔥':'🔥';
  const ai=S.ai&&!S.ai.pending?S.ai:null;
  return `这也算马？ / ${mode}\n${medals} 「${p.name}」${r?.stats||`跑完 100 米 · ${p.time.toFixed(2)} 秒`}\n${ai?`AI 鉴定：${ai.species}\n${ai.verdict}`:r?.title?.replace(/\n/g,' ')||'物种存疑，实力已认证。'}\n${ai?.challenge||r?.taunt||'我画的这玩意儿，你跑得过吗？'}\n${url}`;
}
async function shareResult(url,text){
  if(navigator.share){
    try{
      const data={title:`${S.horses[3].name}的离谱战绩`,text,url};
      const blob=await new Promise(resolve=>$('poster').toBlob(resolve,'image/png'));
      if(blob&&navigator.canShare?.({files:[new File([blob],'doodle-derby.png',{type:'image/png'})]}))data.files=[new File([blob],'doodle-derby.png',{type:'image/png'})];
      await navigator.share(data);return true;
    }catch(error){if(error?.name==='AbortError')return true;}
  }
  return false;
}
$('share').onclick=async()=>{
  const url=new URL(location.origin+location.pathname);url.hash='race='+encodeChallenge();
  const text=resultShareText(url.href);$('share-copy').value=text;$('share-url').value=url.href;
  if(await shareResult(url.href,text))return;
  $('share-note').textContent=['localhost','127.0.0.1',''].includes(location.hostname)?'当前为本地试玩地址。部署到公开网址后，朋友才能在自己的设备打开链接。':'可复制文案，也可以复制链接单独发给朋友。';$('share-dialog').showModal();
};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('share-copy').value);toast('战绩文案已复制，去找一位不服的朋友。')}catch{$('share-copy').focus();$('share-copy').select();toast('请长按或按 Ctrl/Cmd+C 复制战绩。')}};
function savePoster(){
  $('poster').toBlob(async blob=>{
    if(!blob)return toast('生成失败，请再试一次。');
    const action=await shareOrDownload(blob,'这也算马-战绩.png','image/png','这也算马？离谱战绩',`我画的这玩意儿，跑完了100米。${new URL(location.href).origin}`);
    if(action==='shared')toast('已打开分享面板，选择“存储图像”即可进入相册。');else if(action==='downloaded')toast('海报已下载，手机上可选择存储到相册。');
  },'image/png');
}
$('save').onclick=savePoster;
const FEEDBACK_KEY='derby-feedbacks-v1',FEEDBACK_TOPICS={idea:'怪点子',bug:'问题反馈',share:'分享建议',other:'其他'};
function readFeedbacks(){try{const value=JSON.parse(localStorage.getItem(FEEDBACK_KEY));return Array.isArray(value)?value:[]}catch{return[]}}
function writeFeedbacks(items){try{localStorage.setItem(FEEDBACK_KEY,JSON.stringify(items));return true}catch{return false}}
async function renderFeedbacks(){
  const list=$('feedback-list');if(!list)return;
  let items=readFeedbacks(),remote=true;
  try{
    const response=await fetch('/api/feedback',{cache:'no-store'});
    if(!response.ok)throw Error('feedback-unavailable');
    const payload=await response.json();
    if(!Array.isArray(payload.items))throw Error('feedback-invalid');
    items=payload.items;writeFeedbacks(items);
  }catch{remote=false}
  $('feedback-summary').textContent=items.length?`${items.length} 条反馈 · 最新一条优先${remote?'':' · 当前设备缓存'}`:'暂时还没有反馈。';
  if(!items.length){const empty=document.createElement('p');empty.className='feedback-empty';empty.textContent='等一位选手把想法投进来。';list.replaceChildren(empty);return}
  list.replaceChildren(...items.map(item=>{
    const card=document.createElement('article');card.className='feedback-card';
    const meta=document.createElement('div');meta.className='feedback-card-meta';
    const time=new Date(item.at);const when=Number.isNaN(time.getTime())?'时间未知':time.toLocaleString('zh-CN');
    meta.textContent=`${'★'.repeat(clamp(Number(item.rating)||0,0,5))}${'☆'.repeat(5-clamp(Number(item.rating)||0,0,5))} · ${FEEDBACK_TOPICS[item.topic]||'其他'} · ${when}`;
    const message=document.createElement('p');message.textContent=item.message||'';
    const context=document.createElement('small');context.textContent=[item.horse?`马：${item.horse}`:'',item.mode?`模式：${item.mode}`:'',Number.isFinite(item.time)?`${item.time.toFixed(2)} 秒`:'' ].filter(Boolean).join('  /  ');
    card.append(meta,message,context);return card;
  }));
}
function openFeedback(){const d=$('feedback-dialog');$('feedback-message').value='';if(typeof d.showModal==='function')d.showModal();else toast('当前浏览器暂不支持反馈窗口。')}
$('feedback-open').onclick=openFeedback;$('feedback-home').onclick=openFeedback;
$('feedback-submit').onclick=async()=>{
  const message=$('feedback-message').value.trim();if(message.length<2)return toast('先写两句，马厩才知道怎么改。');
  const p=S.horses[3],item={id:`f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,at:new Date().toISOString(),rating:Number($('feedback-rating').value)||5,topic:$('feedback-topic').value,message,horse:p?.name||'',mode:S.challenge?'好友挑战':S.mode==='daily'?`每日挑战 · ${S.dailyVariant?.label||''}`:'自由赛',place:S.place,time:p?.time||null,combo:S.maxCombo||0};
  const submit=$('feedback-submit');submit.disabled=true;
  try{
    const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});
    if(!response.ok)throw Error('feedback-unavailable');
    const payload=await response.json();
    if(payload.item)writeFeedbacks([payload.item,...readFeedbacks()].slice(0,500));
    $('feedback-dialog').close();await renderFeedbacks();toast('反馈已汇总到马厩，谢谢你救了这匹马。');
  }catch{
    const items=readFeedbacks();items.unshift(item);
    if(!writeFeedbacks(items.slice(0,200)))return toast('这次反馈没存下，请稍后再试。');
    $('feedback-dialog').close();await renderFeedbacks();toast('网络暂时不通，已先存到本机。');
  }finally{submit.disabled=false}
};
$('feedback-export').onclick=()=>{const blob=new Blob([JSON.stringify(readFeedbacks(),null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='doodle-derby-feedbacks.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),5000)};
const stored=readSave();if(Array.isArray(stored.strokes)){try{S.strokes=decodeChallenge(btoa(unescape(encodeURIComponent(JSON.stringify({v:1,n:'存档',t:15,s:0,d:stored.strokes})))),true).d}catch{S.strokes=[]}}
if(Number.isFinite(stored.aspect)&&stored.aspect>=.01&&stored.aspect<=100)S.aspect=stored.aspect;
S.pet=ADOPTION_CATALOG.find(p=>p.id===stored.petId)||null;
if(typeof stored.name==='string')$('name').value=stored.name.slice(0,18);S.best=Number.isFinite(stored.best)&&stored.best>0?stored.best:null;if(S.best)$('best').textContent=`本机最佳 ${S.best.toFixed(2)} 秒 · 再快一点，就一点。`;
if(location.hash.startsWith('#race=')){
  try{
    S.challenge=decodeChallenge(location.hash.slice(6));
    S.dailyVariant=S.challenge.m?DAILY_VARIANTS.find(v=>v.id===S.challenge.m)||null:null;
    syncTarget();S.strokes=[];S.aspect=null;S.pet=null;$('name').value='接战选手';$('challenge-banner').hidden=false;
    $('challenge-copy').textContent=`朋友的「${S.challenge.n}」跑了 ${S.challenge.t.toFixed(2)} 秒。画一匹马，打败它的成绩影子！${S.dailyVariant?` 今日规则：${S.dailyVariant.label} · ${S.dailyVariant.rule}`:''}`;
    $('free').disabled=$('daily').disabled=true;$('mode-desc').textContent=`好友挑战 · 同一赛道种子 · 配速影子${S.dailyVariant?` · ${S.dailyVariant.label}`:''}`;$('accept-challenge').onclick=()=>$('drawing').scrollIntoView({behavior:'smooth',block:'center'})
  }catch{toast('这个挑战链接不完整，先自由赛一场吧。')}
}
if(location.hash==='#feedbacks'){screen('feedbacks');renderFeedbacks()}
new ResizeObserver(()=>{if(S.screen==='draw')draw()}).observe($('drawing').parentElement);draw();
