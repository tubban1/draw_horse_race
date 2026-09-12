const test=require('node:test');
const assert=require('node:assert/strict');
const identify=require('../api/identify.js');

function response(){
  return {statusCode:0,headers:{},body:'',setHeader(k,v){this.headers[k]=v},end(v=''){this.body=v}};
}
function request(body){return {method:'POST',headers:{},body};}
const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('AI result parser accepts Cloudflare and OpenAI shapes',()=>{
  const {parseResult}=identify._internals;
  assert.deepEqual(parseResult({result:{response:'{"species":"会跑的办公桌","verdict":"四条腿都在上班。","challenge":"来画一张更离谱的。"}'}}),{species:'会跑的办公桌',verdict:'四条腿都在上班。',challenge:'来画一张更离谱的。'});
  assert.deepEqual(parseResult({choices:[{message:{content:'{"species":"折叠晾衣架","verdict":"下班方向一致。","challenge":"我的晾衣架跑完了。"}'}}]}),{species:'折叠晾衣架',verdict:'下班方向一致。',challenge:'我的晾衣架跑完了。'});
});

test('invalid image is rejected before provider calls',async()=>{
  const res=response();await identify(request({image:'data:text/plain;base64,AAAA'}),res);
  assert.equal(res.statusCode,400);assert.equal(JSON.parse(res.body).code,'INVALID_IMAGE');
});

test('disabled or unconfigured AI returns a safe fallback signal',async()=>{
  const old=process.env.AI_ENABLED;process.env.AI_ENABLED='0';
  const res=response();await identify(request({image:pixel,meta:{strokes:3}}),res);
  assert.equal(res.statusCode,503);assert.equal(JSON.parse(res.body).code,'AI_NOT_CONFIGURED');
  if(old===undefined)delete process.env.AI_ENABLED;else process.env.AI_ENABLED=old;
});
