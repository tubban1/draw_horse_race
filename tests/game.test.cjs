const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('game.js','utf8');
function declaration(name){const start=source.indexOf('function '+name+'(');let depth=0,begin=source.indexOf('{',start);for(let i=begin;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&!--depth)return source.slice(start,i+1)}}
const context=vm.createContext({btoa,atob,encodeURIComponent,decodeURIComponent,escape,unescape});
vm.runInContext("const palette=['#20231c','#ef6548','#546bdd','#b951b3'];const S={horses:[],seed:123};"+['hash','random','template','encodeChallenge','decodeChallenge','cheer'].map(declaration).join('\n'),context);
const run=s=>vm.runInContext(s,context);
test('seeded daily opponents reproduce exactly',()=>{assert.equal(run('JSON.stringify(Array.from({length:8},random(hash("2026-09-12"))))'),run('JSON.stringify(Array.from({length:8},random(hash("2026-09-12"))))'));assert.notEqual(run('hash("2026-09-12")'),run('hash("2026-09-13")'))});
test('challenge preserves Unicode, timing, seed and art',()=>{run('S.horses[3]={name:"汗血保温杯🐴",finish:1,time:14.1234,strokes:template(1)}');assert.equal(run('decodeChallenge(encodeChallenge()).n'),'汗血保温杯🐴');assert.equal(run('decodeChallenge(encodeChallenge()).t'),14.1234);assert.equal(run('decodeChallenge(encodeChallenge()).s'),123);assert.equal(run('decodeChallenge(encodeChallenge()).d.length'),5)});
test('rejects malformed and hostile payloads',()=>{for(const raw of ['bad','x'.repeat(22001),btoa(JSON.stringify({v:1,n:'bad',t:-1,s:0,d:[]})),btoa(JSON.stringify({v:1,n:'bad',t:10,s:0,d:[{c:'url(evil)',p:[[0,0]]}]})),btoa(JSON.stringify({v:1,n:'bad',t:10,s:0,d:[{c:'#20231c',p:[[2,0]]}]}))])assert.throws(()=>run(`decodeChallenge(${JSON.stringify(raw)})`))});
test('complex drawings stay within challenge bounds',()=>{run('S.horses[3].strokes=Array.from({length:80},()=>({c:palette[0],p:Array.from({length:1600},(_,i)=>[i/1600,.5])}))');assert.ok(run('encodeChallenge().length')<22000);assert.equal(run('decodeChallenge(encodeChallenge()).d.length'),80)});
test('one boost per beat; success combo and miss reset',()=>{run("const el={textContent:''};const $=()=>el;const tone=()=>{};S.screen='race';S.phase='running';S.elapsed=.65;S.lastBeat=-1;S.combo=0;S.maxCombo=0;cheer()");assert.equal(run('S.combo'),1);run('cheer()');assert.equal(run('S.combo'),1);run('S.elapsed=1.45;cheer()');assert.equal(run('S.combo'),2);run('S.elapsed=1.65;cheer()');assert.equal(run('S.combo'),0);assert.equal(run('S.maxCombo'),2)});
test('finish timing stays consistent across frame rates and countdown boundary',()=>{const results=[];for(const fps of [30,60,120]){const c=vm.createContext({});vm.runInContext(`const e={style:{},textContent:'',disabled:false};const $=()=>e;const tone=()=>{};const document={hidden:false};const requestAnimationFrame=()=>0;const renderTrack=()=>{};const music={effect(){},sync(){}};const S={screen:'race',elapsed:-3,last:0,boost:0,horses:[{x:0,time:0,speed:5.5,offset:0},{x:0,time:0,speed:5.7,offset:0},{x:0,time:0,speed:5.9,offset:0},{x:0,time:0,player:true}]};const finish=()=>S.screen='result';${declaration('loop')}for(let now=1;now<25000&&S.screen==='race';now+=1000/${fps})loop(now);`,c);const t=vm.runInContext('S.horses[3].time',c);assert.ok(Math.abs(t-100/5.2)<.000001);results.push(t)}assert.ok(Math.max(...results)-Math.min(...results)<.000001)});
test('race and poster preserve the pixel aspect ratio of a wide drawing',()=>{
  const c=vm.createContext({});
  vm.runInContext(`const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));${declaration('horse')}`,c);
  for(const size of [78,125,440]){
    const points=[];
    c.ctx={save(){},restore(){},translate(){},rotate(){},beginPath(){},ellipse(){},fill(){},stroke(){},moveTo(x,y){points.push([x,y])},lineTo(x,y){points.push([x,y])}};
    vm.runInContext(`horse(ctx,[{c:'#20231c',p:[[.1,.1],[.9,.1],[.9,.9],[.1,.9]]}],0,0,${size},0,true,3)`,c);
    const width=Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]));
    const height=Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]));
    assert.ok(Math.abs(width/height-3)<1e-10);
  }
});
test('resized drawing area and pointer mapping retain source aspect',()=>{
  const c=vm.createContext({});vm.runInContext(declaration('drawingFrame'),c);
  for(const [w,h] of [[1000,330],[333,245],[1200,500]]){
    const f=vm.runInContext(`drawingFrame(${w},${h},3)`,c);
    assert.ok(Math.abs(f.w/f.h-3)<1e-10);assert.ok(f.w<=w&&f.h<=h);
    assert.equal(f.left*2+f.w,w);assert.equal(f.top*2+f.h,h);
  }
});
test('challenge carries drawing aspect and rejects invalid ratios',()=>{
  run('S.horses[3]={name:"长马",time:15,strokes:template(1),aspect:3.15}');
  assert.equal(run('decodeChallenge(encodeChallenge()).a'),3.15);
  for(const a of [0,-1,101,'3']){
    const raw=btoa(JSON.stringify({v:1,n:'马',t:15,s:0,a,d:[{c:'#20231c',p:[[0,0]]}]}).replace('马','x'));
    assert.throws(()=>run(`decodeChallenge(${JSON.stringify(raw)})`));
  }
});
