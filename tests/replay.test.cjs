const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('game.js','utf8');
function declaration(name){const start=source.indexOf('function '+name+'(');let depth=0,begin=source.indexOf('{',start);for(let i=begin;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&!--depth)return source.slice(start,i+1)}}
const context=vm.createContext({});
vm.runInContext(`const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const S={replayFrames:[{t:-3,x:[0,0,0,0],time:[0,0,0,0]},{t:0,x:[1,2,3,4],time:[0,0,0,0]},{t:10,x:[50,60,70,80],time:[0,0,0,9.5]}],horses:[{},{},{},{time:9.5}]};${declaration('replayDuration')}${declaration('replaySample')}`,context);
const run=s=>vm.runInContext(s,context);
test('replay timeline includes countdown and complete finish',()=>{
  assert.equal(run('replayDuration()'),13);
  assert.equal(run('replaySample(0).t'),-3);
  assert.equal(run('replaySample(13).t'),10);
});
test('replay samples interpolate horse positions smoothly',()=>{
  const sample=run('replaySample(8)');
  assert.equal(sample.t,5);
  assert.equal(sample.x[3],42);
});
