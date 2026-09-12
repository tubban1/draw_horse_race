const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function engine(){const c=vm.createContext({window:{},setInterval:()=>1,clearInterval:()=>{}});vm.runInContext(fs.readFileSync('audio.js','utf8'),c);const a=c.window.derbyAudio;a.context={state:'running',currentTime:10};a.scene='race';return a}
test('musical notes and green-zone bells schedule once, in rhythm',()=>{const a=engine(),notes=[],beats=[];a.note=(...args)=>notes.push(args);a.phrase=(...args)=>beats.push(args);a.sync(.6,0);assert.equal(beats.length,1);assert.equal(notes.length,1);assert.ok(Math.abs(notes[0][1]-10.072)<1e-8);a.sync(.61,0);assert.equal(notes.length,1);assert.equal(beats.length,1)});
test('resume drops missed notes instead of playing a burst',()=>{const a=engine(),events=[];a.note=(...args)=>events.push(args);a.phrase=(...args)=>events.push(args);a.sync(13.1,0);assert.ok(events.length<=2);assert.ok(a.step>=65)});
test('muting stops every queued voice and clears the scheduler',()=>{const a=engine();let stopped=0;a.voices.add({stop(){stopped++}});a.voices.add({stop(){stopped++}});a.timer=123;a.setEnabled(false);assert.equal(stopped,2);assert.equal(a.voices.size,0);assert.equal(a.timer,null);assert.equal(a.ready,false)});
test('scene changes reset the race score cursor and prevent loop stacking',()=>{const a=engine();a.step=77;a.cue=20;a.setScene('race');assert.equal(a.step,0);assert.equal(a.cue,0);assert.equal(a.timer,null)});
