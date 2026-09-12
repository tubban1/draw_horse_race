const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync('adoption.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
test('12 distinct residents produce bounded editable drawing data',()=>{
  const pets=run('ADOPTION_CATALOG'),shapes=new Set();
  assert.equal(pets.length,12);
  for(const pet of pets){
    const art=run(`adoptionDrawing('${pet.id}')`);
    assert.ok(art.aspect>0);assert.ok(art.strokes.length>0&&art.strokes.length<=80);
    assert.ok(pet.name.length<=18);
    for(const s of art.strokes){assert.ok(s.p.length>0);for(const p of s.p)assert.ok(p.every(n=>Number.isFinite(n)&&n>=0&&n<=1),pet.id)}
    shapes.add(JSON.stringify(art.strokes));
  }
  assert.equal(shapes.size,12);
});
test('shuffle visits all residents before repeating and never repeats at a boundary',()=>{
  const names=run('(()=>{const next=adoptionBag(()=>.31);return Array.from({length:36},()=>next().id)})()');
  for(let i=0;i<36;i+=12)assert.equal(new Set(names.slice(i,i+12)).size,12);
  assert.notEqual(names[11],names[12]);assert.notEqual(names[23],names[24]);
});
