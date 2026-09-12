'use strict';
const $=id=>document.getElementById(id), palette=['#20231c','#ef6548','#546bdd','#b951b3'];
const S={screen:'draw',pet:null,aspect:null,strokes:[],color:palette[0],drawing:null,mode:'free',sound:true,elapsed:0,horses:[],combo:0,maxCombo:0,lastBeat:-1,boost:0,phase:'idle',seed:1,raf:0,last:0,challenge:null};
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
function mode(m){S.mode=m;$('free').classList.toggle('selected',m==='free');$('daily').classList.toggle('selected',m==='daily');$('mode-desc').innerText=m==='daily'?`${dateKey()} · 全球同一赛道\n每天一场新挑战（UTC 更新）`:'100 米离谱短跑 · 约 20 秒\n踩准节奏，就能反超。'}
$('free').onclick=()=>mode('free');$('daily').onclick=()=>mode('daily');
function screen(n){cancelAnimationFrame(S.raf);S.screen=n;music.setScene(n);for(const k of ['draw','race','result'])$(k+'-screen').hidden=k!==n;window.scrollTo(0,0);if(n==='draw')draw()}
function start(){if(!S.strokes.length)return;music.unlock();save();S.seed=S.challenge?.s??(S.mode==='daily'?hash(dateKey()):Math.floor(Math.random()*4294967296));const rng=random(S.seed);S.horses=Array.from({length:3},(_,i)=>({name:['不是驴','马力全无','长话短说'][i],strokes:template(i,palette[i+1]),x:0,time:0,speed:5.4+rng()*.8,offset:rng()*6}));if(S.challenge)S.horses[0]={name:S.challenge.n+' · 影子',strokes:S.challenge.d,aspect:S.challenge.a||1,x:0,time:0,ghost:S.challenge.t};S.horses.push({name:$('name').value.trim()||'无名之马',strokes:structuredClone(S.strokes),aspect:S.aspect,petId:S.pet?.id,x:0,time:0,player:true});S.elapsed=-3;S.combo=0;S.maxCombo=0;S.lastBeat=-1;S.boost=0;S.phase='countdown';S.last=0;S.countNumber=0;$('race-name').textContent=S.horses[3].name;$('race-mode').textContent=S.challenge?'好友挑战 · 对手是成绩配速影子':S.mode==='daily'?`每日挑战 / ${dateKey()}`:'自由赛 / THE QUESTIONABLE DERBY';$('boost').disabled=true;$('feedback').textContent='光标进入绿色区时点击 / 按空格。连点不会更快。';$('race-comment').textContent='选手正在热身，物种有待确认。';screen('race');S.raf=requestAnimationFrame(loop)}
$('start').onclick=start;$('again').onclick=start;$('back').onclick=()=>{S.phase='idle';screen('draw')};$('redraw').onclick=()=>screen('draw');
function cheer(){if(S.screen!=='race'||S.phase!=='running')return;const beat=Math.floor(S.elapsed/.8);if(S.lastBeat===beat)return;S.lastBeat=beat;const p=(S.elapsed%.8)/.8;const hit=p>=.72&&p<=.96;S.combo=hit?S.combo+1:0;S.maxCombo=Math.max(S.combo,S.maxCombo);S.boost=hit?Math.min(4.6,2.7+S.combo*.22):.4;$('feedback').textContent=hit?`漂亮！连击 × ${S.combo} · ${S.combo>=3?'马力全开！':'继续保持节奏'}`:'早了或晚了，再找找节奏。';tone(hit?660+Math.min(S.combo,6)*60:180)}
$('boost').onclick=cheer;window.addEventListener('keydown',e=>{if(e.code==='Space'&&S.screen==='race'&&!e.repeat&&e.target.tagName!=='BUTTON'){e.preventDefault();cheer()}});
$('sound').onclick=()=>{S.sound=!S.sound;$('sound').textContent=S.sound?'音乐 开 ♪':'音乐 关 ◌';$('sound').setAttribute('aria-pressed',S.sound);music.setEnabled(S.sound)};
function loop(now){if(S.screen!=='race')return;const dt=S.last?Math.min((now-S.last)/1000,.05):0;S.last=now;if(!document.hidden){S.elapsed+=dt;if(S.elapsed<0){const c=Math.ceil(-S.elapsed);$('countdown').textContent=c;if(c!==S.countNumber){S.countNumber=c;tone(450)}}else{if(S.phase==='countdown')music.effect('go');S.phase='running';music.sync(S.elapsed,S.combo);$('boost').disabled=false;$('countdown').textContent=S.elapsed<.6?'跑！':'';const step=Math.min(dt,S.elapsed);S.boost=Math.max(0,S.boost-step*1.4);for(const h of S.horses){if(h.time)continue;const old=h.x;const speed=h.ghost?100/h.ghost:h.player?5.2+S.boost:h.speed+.35*Math.sin(S.elapsed*1.2+h.offset);h.x=Math.min(100,old+speed*step);if(h.x>=100)h.time=S.elapsed-step+(100-old)/speed}const p=S.horses[3];$('distance').textContent=`${Math.floor(p.x)} / 100 m`;$('timer').textContent=`${(p.time||S.elapsed).toFixed(2)}s`;$('combo').textContent=`连击 × ${S.combo}`;$('needle').style.left=((S.elapsed%.8)/.8*98)+'%';if(p.x>75)$('race-comment').textContent='最后 25 米！抽象也是一种实力。';if(p.time){finish();return}}}renderTrack();S.raf=requestAnimationFrame(loop)}
document.addEventListener('visibilitychange',()=>{S.last=0;music.pause(document.hidden)});
function horse(ctx,strokes,x,y,size,phase,still=false,aspect=1){let minX=1,maxX=0,minY=1,maxY=0;for(const s of strokes)for(const [px,py] of s.p){minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py)}const w=Math.max(.06,(maxX-minX)*aspect),h=Math.max(.06,maxY-minY),scale=size/Math.max(w,h*1.5);ctx.save();ctx.translate(x,y);ctx.fillStyle='#28382018';ctx.beginPath();ctx.ellipse(0,20,size*.48,6,0,0,Math.PI*2);ctx.fill();ctx.translate(0,still?0:Math.sin(phase)*3);ctx.rotate(still?0:Math.sin(phase*.5)*.025);ctx.lineCap='round';ctx.lineJoin='round';for(const s of strokes){ctx.strokeStyle=s.c;ctx.lineWidth=2.5;ctx.beginPath();s.p.forEach(([px,py],i)=>{let xx=(px-(minX+maxX)/2)*aspect*scale,yy=(py-maxY)*scale+10;const leg=clamp((py-minY)/h-.55,0,.45)/.45;if(!still){xx+=Math.sin(phase+px*14)*leg*9;yy-=Math.max(0,Math.cos(phase+px*14))*leg*7}if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy)});if(s.p.length===1){ctx.lineTo((s.p[0][0]-(minX+maxX)/2)*aspect*scale+.5,(s.p[0][1]-maxY)*scale+10)}ctx.stroke()}ctx.restore()}
function renderTrack(){const v=fit($('track'));if(!v)return;const {ctx:c,w,h}=v;const player=S.horses[3],cam=Math.max(0,player.x-16),unit=w<600?9:13;const left=w<600?65:140;const top=125,lane=(h-top-25)/4;c.fillStyle='#e8edcc';c.fillRect(0,0,w,h);c.fillStyle='#d3dfa0';for(let i=0;i<9;i++){const x=((i*190-cam*unit*.3)%(w+190)+w+190)%(w+190)-50;c.beginPath();c.ellipse(x,105,100,30,0,0,Math.PI*2);c.fill()}c.fillStyle='#f5f4df';c.fillRect(0,top-28,w,h);for(let i=0;i<5;i++){const yy=top-15+i*lane;c.strokeStyle='#d8dcc3';c.beginPath();c.moveTo(0,yy);c.lineTo(w,yy);c.stroke()}for(let m=0;m<=100;m+=10){const xx=left+(m-cam)*unit;if(xx<-40||xx>w+40)continue;c.strokeStyle='#c5cbb0';c.setLineDash([4,8]);c.beginPath();c.moveTo(xx,top-25);c.lineTo(xx,h);c.stroke();c.setLineDash([]);c.fillStyle='#8b9474';c.font='10px Arial';c.fillText(m+'m',xx+5,h-8)}const fx=left+(100-cam)*unit;if(fx<w+20){for(let i=0;i<24;i++)for(let j=0;j<2;j++){c.fillStyle=(i+j)%2?'#f9faee':'#20231c';c.fillRect(fx+j*8,top-25+i*12,8,12)}}S.horses.forEach((a,i)=>{const raw=left+(a.x-cam)*unit,x=clamp(raw,28,w-30),y=top+i*lane+lane*.6;horse(c,a.strokes,x,y,w<600?78:125,Math.max(0,S.elapsed)*12+i,false,a.aspect||1);c.font=(a.player?'bold ':'')+'10px Arial';c.textAlign='center';c.fillStyle=a.player?'#20231c':'#737b61';c.fillText((raw<28?'← ':raw>w-30?'→ ':'')+(a.player?'你的马':a.name),x,y-45)});const sorted=[...S.horses].sort((a,b)=>b.x-a.x||(a.time||Infinity)-(b.time||Infinity));$('ranks').replaceChildren(...sorted.map((a,i)=>{const e=document.createElement('span');e.textContent=`${i+1}  ${a.player?'你 · ':''}${a.name}`;if(a.player)e.className='you';return e}))}
function finish(){S.phase='finished';$('boost').disabled=true;const p=S.horses[3];S.place=1+S.horses.filter(h=>!h.player&&h.time&&h.time<p.time).length;const old=S.best;S.best=Math.min(old||Infinity,p.time);save();$('best').textContent=`本机最佳 ${S.best.toFixed(2)} 秒 · 再快一点，就一点。`;S.receipt=raceReceipt({horse:p,place:S.place,combo:S.maxCombo,seed:S.seed,challengeTime:S.challenge?.t,previousBest:old});
$('result-title').textContent=S.receipt.title;
$('result-desc').textContent=`${S.receipt.intro}\n${S.receipt.stats}\n${S.receipt.performance}`;
$('challenge-result').textContent=S.receipt.verdict;
screen('result');poster();music.effect('finish',S.place)}
function poster(){
  const c=$('poster').getContext('2d'),p=S.horses[3];
  c.fillStyle='#fafbf3';c.fillRect(0,0,720,860);c.fillStyle='#20231c';c.textAlign='center';
  c.font='bold 23px sans-serif';c.fillText(S.receipt.badge,360,48);
  c.font='16px monospace';c.fillText('NO. '+S.receipt.serial,360,78);
  c.font='900 112px Arial';c.fillText('#'+S.place,360,190);
  if(S.challenge){
    c.font='bold 16px sans-serif';c.fillText('好友挑战 · 同一条赛道',360,230);
    horse(c,S.challenge.d,220,395,245,0,true,S.challenge.a||1);
    horse(c,p.strokes,500,395,245,0,true,p.aspect||1);
    c.font='bold 20px sans-serif';c.fillText('朋友的马',220,492);c.fillText('你的马',500,492);
  }else{
    horse(c,p.strokes,360,430,440,0,true,p.aspect||1);
  }
  c.fillStyle='#20231c';c.font='bold 34px sans-serif';c.fillText(p.name,360,535,640);
  c.font='22px sans-serif';c.fillText(S.receipt.metric,360,570);
  c.font='900 76px Arial';c.fillText(p.time.toFixed(2)+'s',360,655);
  c.font='20px sans-serif';c.fillText(`100 米  /  最高连击 ${S.maxCombo}  /  ${S.challenge?'好友挑战':S.mode==='daily'?'每日挑战':'自由赛'}`,360,700);
  c.fillStyle='#dfff4f';c.fillRect(40,735,640,80);c.fillStyle='#20231c';
  c.font='bold 26px sans-serif';c.fillText(S.receipt.title.replace(/\n/g,' '),360,768,625);
  c.font='18px sans-serif';c.fillText(S.receipt.taunt,360,798,625);
  c.font='16px Arial';c.fillText('DOODLE DERBY  /  这也算马？',360,842);
}
function clipFrame(c,ctx,t){
  const w=c.width,h=c.height,progress=Math.min(1,t/4.8);
  ctx.fillStyle='#dfff4f';ctx.fillRect(0,0,w,h);ctx.fillStyle='#fafbf3';ctx.fillRect(24,24,w-48,h-48);
  ctx.fillStyle='#20231c';ctx.textAlign='center';ctx.font='bold 20px sans-serif';ctx.fillText(S.receipt.badge,w/2,72);
  ctx.font='900 86px Arial';ctx.fillText('#'+S.place,w/2,180);
  ctx.font='bold 27px sans-serif';ctx.fillText(S.horses[3].name,w/2,245);
  ctx.font='900 64px Arial';ctx.fillText(S.horses[3].time.toFixed(2)+'s',w/2,330);
  ctx.save();ctx.translate(70+progress*(w-140),510);horse(ctx,S.horses[3].strokes,0,0,250,progress*10,false,S.horses[3].aspect||1);ctx.restore();
  ctx.fillStyle='#dfff4f';ctx.fillRect(48,650,w-96,120);ctx.fillStyle='#20231c';ctx.font='bold 28px sans-serif';ctx.fillText(S.receipt.title.replace(/\n/g,' '),w/2,698,w-120);ctx.font='19px sans-serif';ctx.fillText(S.receipt.taunt,w/2,738,w-120);ctx.font='16px Arial';ctx.fillText('DOODLE DERBY  /  这也算马？',w/2,850);
}
async function createClip(){
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw Error('unsupported');
  const canvas=document.createElement('canvas');canvas.width=540;canvas.height=900;const ctx=canvas.getContext('2d');
  const stream=canvas.captureStream(30),mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
  const recorder=new MediaRecorder(stream,{mimeType:mime}),chunks=[];recorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  const result=new Promise((resolve,reject)=>{recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));recorder.onerror=reject});recorder.start();
  const started=performance.now();const draw=now=>{const t=(now-started)/1000;clipFrame(canvas,ctx,t);if(t<4.8)requestAnimationFrame(draw);else recorder.stop()};requestAnimationFrame(draw);return result;
}
$('save-clip').onclick=async()=>{try{const blob=await createClip(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='这也算马-动态战绩.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('动态战绩已生成，发给朋友看这匹怪马。')}catch{toast('当前浏览器不支持动态短片，已可保存静态战绩。')}};

// A bounded, versioned URL payload. Shared drawings are downsampled; local originals stay intact.
function encodeChallenge(){const p=S.horses[3],budget=Math.max(2,Math.floor(200/p.strokes.length));const d=p.strokes.map(s=>({c:s.c,p:s.p.filter((_,i)=>i===0||i===s.p.length-1||i%Math.max(1,Math.ceil(s.p.length/budget))===0).map(a=>a.map(n=>Math.round(n*1000)/1000))}));return btoa(unescape(encodeURIComponent(JSON.stringify({v:1,n:p.name,t:+p.time.toFixed(4),s:S.seed,a:p.aspect||1,d})))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}
function decodeChallenge(raw,local=false){if(raw.length>(local?8000000:22000))throw Error('size');const v=JSON.parse(decodeURIComponent(escape(atob(raw.replaceAll('-','+').replaceAll('_','/')))));if(v.v!==1||typeof v.n!=='string'||v.n.length>18||!Number.isFinite(v.t)||v.t<5||v.t>60||!Number.isInteger(v.s)||v.s<0||v.s>4294967295||!Array.isArray(v.d)||!v.d.length||v.d.length>80)throw Error('invalid');if(v.a!==undefined&&(!Number.isFinite(v.a)||v.a<.01||v.a>100))throw Error('aspect');let total=0;for(const s of v.d){if(!palette.includes(s.c)||!Array.isArray(s.p)||!s.p.length)throw Error('stroke');for(const p of s.p){if(!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1))throw Error('point');if(++total>(local?128000:1000))throw Error('points')}}return v}
function resultShareText(url){
  const p=S.horses[3],r=S.receipt;
  const mode=S.challenge?'好友接战':S.mode==='daily'?'每日挑战':'自由赛';
  const medals=S.maxCombo>=8?'🔥🔥🔥':S.maxCombo>=3?'🔥🔥':'🔥';
  return `这也算马？ / ${mode}\n${medals} 「${p.name}」${r?.stats||`跑完 100 米 · ${p.time.toFixed(2)} 秒`}\n${r?.title?.replace(/\n/g,' ')||'物种存疑，实力已认证。'}\n${r?.taunt||'我画的这玩意儿，你跑得过吗？'}\n${url}`;
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
  const url=new URL(location.href);url.hash='race='+encodeChallenge();
  const text=resultShareText(url.href);$('share-copy').value=text;$('share-url').value=url.href;
  if(await shareResult(url.href,text))return;
  $('share-note').textContent=['localhost','127.0.0.1',''].includes(location.hostname)?'当前为本地试玩地址。部署到公开网址后，朋友才能在自己的设备打开链接。':'可复制文案，也可以复制链接单独发给朋友。';$('share-dialog').showModal();
};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('share-copy').value);toast('战绩文案已复制，去找一位不服的朋友。')}catch{$('share-copy').focus();$('share-copy').select();toast('请长按或按 Ctrl/Cmd+C 复制战绩。')}};
$('save').onclick=()=>{$('poster').toBlob(blob=>{if(!blob)return toast('生成失败，请再试一次。');const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='这也算马-战绩.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),5000);toast('战绩海报已生成。')},'image/png')};
const stored=readSave();if(Array.isArray(stored.strokes)){try{S.strokes=decodeChallenge(btoa(unescape(encodeURIComponent(JSON.stringify({v:1,n:'存档',t:15,s:0,d:stored.strokes})))),true).d}catch{S.strokes=[]}}
if(Number.isFinite(stored.aspect)&&stored.aspect>=.01&&stored.aspect<=100)S.aspect=stored.aspect;
S.pet=ADOPTION_CATALOG.find(p=>p.id===stored.petId)||null;
if(typeof stored.name==='string')$('name').value=stored.name.slice(0,18);S.best=Number.isFinite(stored.best)&&stored.best>0?stored.best:null;if(S.best)$('best').textContent=`本机最佳 ${S.best.toFixed(2)} 秒 · 再快一点，就一点。`;
if(location.hash.startsWith('#race=')){try{S.challenge=decodeChallenge(location.hash.slice(6));S.strokes=[];S.aspect=null;S.pet=null;$('name').value='接战选手';$('challenge-banner').hidden=false;$('challenge-copy').textContent=`朋友的「${S.challenge.n}」跑了 ${S.challenge.t.toFixed(2)} 秒。画一匹马，打败它的成绩影子！`;$('free').disabled=$('daily').disabled=true;$('mode-desc').textContent='好友挑战 · 同一赛道种子 · 配速影子';$('accept-challenge').onclick=()=>$('drawing').scrollIntoView({behavior:'smooth',block:'center'})}catch{toast('这个挑战链接不完整，先自由赛一场吧。')}}
new ResizeObserver(()=>{if(S.screen==='draw')draw()}).observe($('drawing').parentElement);draw();
