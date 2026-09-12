'use strict';

const MODEL_DEFAULT='@cf/llava-hf/llava-1.5-7b-hf';
const MAX_IMAGE_BYTES=850000;
const MAX_OUTPUT=180;
const WINDOW_MS=10*60*1000;
const MAX_REQUESTS=8;
const buckets=new Map();
const SYSTEM_PROMPT='你是“这也算马？”游戏的友善毒舌物种鉴定员。玩家画的是抽象线稿，不要认真纠正它像不像马，要抓住线条的荒谬感。只输出 JSON，不要 Markdown，不要解释。字段必须是 species（中文外号，最多 14 个字）、verdict（中文鉴定吐槽，最多 32 个字）、challenge（给朋友的中文挑战语，最多 38 个字）。避免攻击真实的人群、外貌、身份和敏感话题，保持轻松、荒诞、适合分享。';

function json(res,status,payload){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Vary','Origin');
  res.end(JSON.stringify(payload));
}
function clientIp(req){return String(req.headers?.['x-forwarded-for']||req.headers?.['x-real-ip']||'unknown').split(',')[0].trim().slice(0,80)}
function allowed(ip){
  const now=Date.now(),old=buckets.get(ip);
  if(!old||old.reset<now){buckets.set(ip,{reset:now+WINDOW_MS,count:1});return true}
  if(old.count>=MAX_REQUESTS)return false;
  old.count++;return true;
}
async function readBody(req){
  if(req.body&&typeof req.body==='object')return req.body;
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>MAX_IMAGE_BYTES*2)break}
  return JSON.parse(raw||'{}');
}
function decodeImage(value){
  if(typeof value!=='string')throw Error('image');
  const match=value.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i);
  if(!match)throw Error('image-format');
  const bytes=Buffer.from(match[2],'base64');
  if(!bytes.length||bytes.length>MAX_IMAGE_BYTES)throw Error('image-size');
  return {dataUrl:value,bytes};
}
function clean(value,max){
  return typeof value==='string'?value.replace(/[\\r\\n]+/g,' ').replace(/[<>]/g,'').trim().slice(0,max):'';
}
function extractText(payload){
  const result=payload?.result;
  const choice=payload?.choices?.[0]?.message?.content;
  if(typeof choice==='string')return choice;
  if(Array.isArray(choice))return choice.map(x=>typeof x==='string'?x:x?.text||'').join(' ');
  if(typeof result==='string')return result;
  if(typeof result?.response==='string')return result.response;
  if(typeof result?.description==='string')return result.description;
  if(typeof payload?.response==='string')return payload.response;
  return '';
}
function parseResult(payload){
  const raw=extractText(payload);
  let parsed=null;
  const match=raw.match(/\{[\s\S]*\}/);
  if(match){try{parsed=JSON.parse(match[0])}catch{}}
  if(!parsed&&raw){
    const lines=raw.split(/\n|。/).map(x=>clean(x,180)).filter(Boolean);
    if(lines.length>=3)parsed={species:lines[0],verdict:lines[1],challenge:lines[2]};
  }
  if(!parsed)return null;
  const result={species:clean(parsed.species,14),verdict:clean(parsed.verdict,32),challenge:clean(parsed.challenge,38)};
  return result.species&&result.verdict&&result.challenge?result:null;
}
function promptFor(meta){
  const colors=Number(meta?.colors)||1,strokes=Number(meta?.strokes)||1,aspect=Number(meta?.aspect)||1;
  return `${SYSTEM_PROMPT}\n这是一个玩家手绘的赛马线稿。补充信息：${strokes} 笔，${colors} 种颜色，横纵比例约 ${aspect.toFixed(2)}。请看图后给出 JSON。`;
}
async function callCloudflare(image,meta,signal){
  const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
  if(!account||!token)throw Object.assign(Error('not-configured'),{code:'AI_NOT_CONFIGURED'});
  const model=process.env.AI_MODEL||MODEL_DEFAULT;
  const modelPath=String(model).split('/').map(encodeURIComponent).join('/');
  const endpoint=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/${modelPath}`;
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({image:[...image.bytes],prompt:promptFor(meta),max_tokens:160}),signal});
  if(!response.ok)throw Error(`provider-${response.status}`);
  return parseResult(await response.json());
}
async function callOpenAI(image,meta,signal){
  const base=String(process.env.AI_BASE_URL||'').replace(/\/$/,'');
  const key=process.env.AI_API_KEY,model=process.env.AI_MODEL;
  if(!base||!key||!model)throw Object.assign(Error('not-configured'),{code:'AI_NOT_CONFIGURED'});
  const endpoint=/chat\/completions$/.test(base)?base:`${base}/chat/completions`;
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:[{type:'text',text:promptFor(meta)},{type:'image_url',image_url:{url:image.dataUrl}}]}],temperature:.9,max_tokens:160}),signal});
  if(!response.ok)throw Error(`provider-${response.status}`);
  return parseResult(await response.json());
}
async function handler(req,res){
  if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}
  if(req.method!=='POST')return json(res,405,{error:'method-not-allowed'});
  if(!allowed(clientIp(req)))return json(res,429,{error:'rate-limit'});
  let body;
  try{body=await readBody(req);const image=decodeImage(body.image);const protocol=String(process.env.AI_PROTOCOL||'').toLowerCase();
    if(process.env.AI_ENABLED!=='1')return json(res,503,{error:'ai-disabled',code:'AI_NOT_CONFIGURED'});
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Number(process.env.AI_TIMEOUT_MS)||6500);
    const result=protocol==='cloudflare'||(!process.env.AI_BASE_URL&&process.env.CLOUDFLARE_ACCOUNT_ID)?await callCloudflare(image,body.meta,controller.signal):await callOpenAI(image,body.meta,controller.signal);
    clearTimeout(timer);
    if(!result)return json(res,502,{error:'invalid-ai-response',code:'AI_BAD_RESPONSE'});
    return json(res,200,{...result,source:'ai'});
  }catch(error){
    if(['image','image-format','image-size'].includes(error?.message))return json(res,400,{error:'invalid-image',code:'INVALID_IMAGE'});
    if(error?.code==='AI_NOT_CONFIGURED')return json(res,503,{error:'ai-not-configured',code:'AI_NOT_CONFIGURED'});
    if(error?.name==='AbortError')return json(res,504,{error:'ai-timeout',code:'AI_TIMEOUT'});
    return json(res,502,{error:'ai-unavailable',code:'AI_PROVIDER_ERROR'});
  }
}

module.exports=handler;
module.exports._internals={clean,decodeImage,extractText,parseResult,promptFor};
