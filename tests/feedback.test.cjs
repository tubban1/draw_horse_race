const test=require('node:test');
const assert=require('node:assert/strict');
const feedback=require('../api/feedback.js');

test('feedback normalization keeps bounded anonymous fields',()=>{
  const item=feedback._internals.normalize({
    id:'f-1',rating:99,topic:'idea',message:'  想要一匹会倒着跑的马  ',horse:'x'.repeat(100),mode:'自由赛',place:2,time:16.82,combo:7
  });
  assert.equal(item.rating,5);
  assert.equal(item.message,'想要一匹会倒着跑的马');
  assert.equal(item.horse.length,40);
  assert.equal(item.time,16.82);
  assert.equal(item.combo,7);
});

test('invalid or unsafe feedback is rejected or cleaned',()=>{
  assert.equal(feedback._internals.normalize({message:'x'}),null);
  const item=feedback._internals.normalize({message:'<script>马</script>\n换行',topic:'unknown'});
  assert.equal(item.topic,'other');
  assert.equal(item.message,'script马/script 换行');
});

test('database rows map back to the browser feedback shape',()=>{
  assert.deepEqual(feedback._internals.rowToItem({id:'f-2',created_at:'2026-09-13T00:00:00.000Z',rating:4,topic:'bug',message:'卡住了',horse:'香蕉马',mode:'每日挑战',place:3,time_seconds:'18.4',combo:2}),{
    id:'f-2',at:'2026-09-13T00:00:00.000Z',rating:4,topic:'bug',message:'卡住了',horse:'香蕉马',mode:'每日挑战',place:3,time:18.4,combo:2
  });
});
