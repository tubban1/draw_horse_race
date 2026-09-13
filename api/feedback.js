'use strict';

const TABLE = 'horse_feedbacks';
const MAX_ITEMS = 500;
const MAX_MESSAGE = 500;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 12;
const buckets = new Map();

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
  res.end(JSON.stringify(payload));
}

function config() {
  const url = String(process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

function clientIp(req) {
  return String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown')
    .split(',')[0].trim().slice(0, 80);
}

function allowed(ip) {
  const now = Date.now();
  const old = buckets.get(ip);
  if (!old || old.reset < now) {
    buckets.set(ip, { reset: now + WINDOW_MS, count: 1 });
    return true;
  }
  if (old.count >= MAX_REQUESTS) return false;
  old.count++;
  return true;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 12000) throw new Error('body-too-large');
  }
  return JSON.parse(raw || '{}');
}

function clean(value, max) {
  return typeof value === 'string'
    ? value.replace(/[\r\n]+/g, ' ').replace(/[<>]/g, '').trim().slice(0, max)
    : '';
}

function normalize(value) {
  if (!value || typeof value !== 'object') return null;
  const rating = Math.max(1, Math.min(5, Number(value.rating) || 5));
  const item = {
    id: clean(value.id, 80),
    at: typeof value.at === 'string' ? value.at : new Date().toISOString(),
    rating,
    topic: ['idea', 'bug', 'share', 'other'].includes(value.topic) ? value.topic : 'other',
    message: clean(value.message, MAX_MESSAGE),
    horse: clean(value.horse, 40),
    mode: clean(value.mode, 60),
    place: Number.isFinite(Number(value.place)) ? Number(value.place) : null,
    time: Number.isFinite(Number(value.time)) ? Number(value.time) : null,
    combo: Math.max(0, Math.min(999, Number(value.combo) || 0)),
  };
  return item.message.length >= 2 ? item : null;
}

function rowToItem(row) {
  return normalize({
    id: row?.id,
    at: row?.created_at,
    rating: row?.rating,
    topic: row?.topic,
    message: row?.message,
    horse: row?.horse,
    mode: row?.mode,
    place: row?.place,
    time: row?.time_seconds,
    combo: row?.combo,
  });
}

function endpoint(configured) {
  return `${configured.url}/rest/v1/${TABLE}`;
}

function headers(configured, extra = {}) {
  return { apikey: configured.key, Authorization: `Bearer ${configured.key}`, ...extra };
}

async function readAll(configured) {
  const response = await fetch(`${endpoint(configured)}?select=id,created_at,rating,topic,message,horse,mode,place,time_seconds,combo&order=created_at.desc&limit=${MAX_ITEMS}`, {
    headers: headers(configured),
  });
  if (!response.ok) throw Error(`supabase-read-${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows.map(rowToItem).filter(Boolean) : [];
}

async function writeOne(configured, item) {
  const response = await fetch(endpoint(configured), {
    method: 'POST',
    headers: headers(configured, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify({
      id: item.id,
      created_at: item.at,
      rating: item.rating,
      topic: item.topic,
      message: item.message,
      horse: item.horse,
      mode: item.mode,
      place: item.place,
      time_seconds: item.time,
      combo: item.combo,
    }),
  });
  if (!response.ok) {
    const error = Error(`supabase-write-${response.status}`);
    error.status = response.status;
    throw error;
  }
  const rows = await response.json();
  return rowToItem(Array.isArray(rows) ? rows[0] : null) || item;
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  const configured = config();
  if (!configured) return json(res, 503, { error: 'feedback-storage-not-configured', code: 'FEEDBACK_STORAGE_NOT_CONFIGURED' });

  try {
    if (req.method === 'GET') return json(res, 200, { items: await readAll(configured) });
    if (req.method !== 'POST') return json(res, 405, { error: 'method-not-allowed' });
    if (!allowed(clientIp(req))) return json(res, 429, { error: 'rate-limit' });
    const value = normalize(await readBody(req));
    if (!value) return json(res, 400, { error: 'invalid-feedback', code: 'INVALID_FEEDBACK' });
    if (!value.id) value.id = `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    const item = await writeOne(configured, value);
    return json(res, 201, { item });
  } catch (error) {
    if (error?.message === 'body-too-large') return json(res, 413, { error: 'body-too-large' });
    if (error?.status === 409) return json(res, 409, { error: 'feedback-already-exists' });
    return json(res, 502, { error: 'feedback-storage-unavailable' });
  }
}

module.exports = handler;
module.exports._internals = { clean, normalize, rowToItem };
