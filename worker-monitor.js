/**
 * BRASA Monitor — AI Nervous System
 *
 * A team of specialized AI agents that watch every BRASA data point,
 * route signals to the right domain, surface insights, and report live.
 *
 * Agents: health · water · education · justice · identity · economic · system
 * Coordinator: sees full picture, prioritizes, alerts
 *
 * Endpoints:
 *   POST /event          — receive signal from any BRASA worker
 *   GET  /dashboard      — live HTML dashboard
 *   GET  /api/status     — JSON status for external consumers
 *   GET  /api/insights   — latest AI agent insights
 *
 * Secrets needed (same Worker):
 *   BRASA_API_KEY        — Anthropic API key
 *
 * wrangler.toml binding:
 *   [[d1_databases]]
 *   binding = "DB"
 *   database_name = "brasa-citizens"
 *   database_id = "4a475c36-9846-4cc5-aa71-b48fe30d9cf9"
 *
 * Deploy:
 *   curl -o worker-monitor.js https://raw.githubusercontent.com/BrasaCR/brasa-world/main/worker-monitor.js
 *   wrangler deploy worker-monitor.js --name brasa-monitor --compatibility-date 2026-03-28
 */

// ── DOMAIN CLASSIFIER ────────────────────────────────────────────────────────
const DOMAIN_KEYWORDS = {
  health:    ['health','salud','médico','doctor','hospital','medicine','medicina','sick','enfermo','pain','dolor','emergency','emergencia'],
  water:     ['water','agua','drink','beber','well','pozo','flood','inundación','drought','sequía','clean','limpio'],
  education: ['education','educación','school','escuela','learn','aprender','study','estudiar','course','curso','teacher','maestro'],
  justice:   ['justice','justicia','rights','derechos','police','policía','court','tribunal','lawyer','abogado','violation','violación'],
  identity:  ['identity','identidad','govid','id','passport','pasaporte','register','registrar','document','documento'],
  economic:  ['money','dinero','job','trabajo','earn','ganar','business','negocio','income','ingreso','wallet','payment','pago'],
  system:    ['error','fail','broken','timeout','unavailable','crash']
};

function classifyDomain(text) {
  if (!text) return 'general';
  const lower = text.toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return domain;
  }
  return 'general';
}

function detectRegion(phone) {
  if (!phone) return 'XX';
  if (phone.startsWith('+254')) return 'KE';
  if (phone.startsWith('+234')) return 'NG';
  if (phone.startsWith('+506')) return 'CR';
  if (phone.startsWith('+1'))   return 'US';
  if (phone.startsWith('+44'))  return 'UK';
  if (phone.startsWith('+91'))  return 'IN';
  if (phone.startsWith('+55'))  return 'BR';
  if (phone.startsWith('+52'))  return 'MX';
  if (phone.startsWith('+27'))  return 'ZA';
  if (phone.startsWith('+20'))  return 'EG';
  if (phone.startsWith('+57'))  return 'CO';
  if (phone.startsWith('+56'))  return 'CL';
  if (phone.startsWith('+51'))  return 'PE';
  if (phone.startsWith('+58'))  return 'VE';
  if (phone.startsWith('+49'))  return 'DE';
  if (phone.startsWith('+33'))  return 'FR';
  if (phone.startsWith('+34'))  return 'ES';
  if (phone.startsWith('+39'))  return 'IT';
  if (phone.startsWith('+86'))  return 'CN';
  if (phone.startsWith('+81'))  return 'JP';
  if (phone.startsWith('+82'))  return 'KR';
  if (phone.startsWith('+62'))  return 'ID';
  if (phone.startsWith('+63'))  return 'PH';
  if (phone.startsWith('+92'))  return 'PK';
  if (phone.startsWith('+880')) return 'BD';
  if (phone.startsWith('+234')) return 'NG';
  if (phone.startsWith('+255')) return 'TZ';
  if (phone.startsWith('+256')) return 'UG';
  if (phone.startsWith('+233')) return 'GH';
  return 'XX';
}

// ── AI AGENT SYSTEM PROMPTS ───────────────────────────────────────────────────
const AGENT_PROMPTS = {
  health:    'You are BRASA Health Agent. Analyze health signals from citizens worldwide. Identify disease patterns, healthcare access gaps, emergency clusters. Be specific about geography and urgency.',
  water:     'You are BRASA Water Agent. Analyze water access signals. Identify shortage clusters, contamination reports, flood/drought patterns. Flag humanitarian emergencies immediately.',
  education: 'You are BRASA Education Agent. Analyze education access signals. Identify learning gaps, language barriers, infrastructure needs by region.',
  justice:   'You are BRASA Justice Agent. Analyze rights violation signals. Identify systemic patterns, geographic hotspots, vulnerable populations. Flag urgent situations.',
  identity:  'You are BRASA Identity Agent. Analyze identity and registration signals. Track GovID adoption, document barriers, stateless populations.',
  economic:  'You are BRASA Economic Agent. Analyze economic signals. Track income gaps, business needs, payment barriers, poverty clusters by region.',
  system:    'You are BRASA System Agent. Analyze technical errors and failures. Identify patterns, root causes, and repair recommendations. Be precise and actionable.',
  coordinator: 'You are BRASA Coordinator — the central intelligence of the BRASA nervous system. You see signals from all domain agents. Synthesize the full picture: what is most urgent for human welfare right now, what geographic regions need immediate attention, and what BRASA should prioritize in the next 24 hours. Be direct and prioritized.'
};

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/event') {
      return handleEvent(request, env);
    }
    if (request.method === 'GET' && url.pathname === '/dashboard') {
      return handleDashboard(env);
    }
    if (request.method === 'GET' && url.pathname === '/api/status') {
      return handleStatus(env);
    }
    if (request.method === 'GET' && url.pathname === '/api/insights') {
      return handleInsights(env);
    }
    if (request.method === 'GET' && url.pathname === '/api/analyze') {
      return handleAnalyze(env);
    }

    return new Response('BRASA Monitor active', { status: 200 });
  }
};

// ── RECEIVE EVENT ─────────────────────────────────────────────────────────────
async function handleEvent(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const phone   = body.phone   || '';
    const signal  = body.signal  || '';
    const channel = body.channel || 'whatsapp';
    const lang    = body.lang    || 'unknown';
    const error   = body.error   || '';

    const domain = classifyDomain(signal || error);
    const region = detectRegion(phone);
    const id     = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const ts     = Date.now();

    await env.DB.prepare(
      'INSERT INTO events (id, ts, phone, region, channel, domain, signal, lang, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, ts, phone || '', region, channel, domain, signal.slice(0, 500), lang, error.slice(0, 200)).run();

    return new Response(JSON.stringify({ ok: true, id, domain, region }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
}

// ── STATUS API ────────────────────────────────────────────────────────────────
async function handleStatus(env) {
  try {
    const since = Date.now() - 86400000; // last 24h

    const total     = await env.DB.prepare('SELECT COUNT(*) as n FROM events WHERE ts > ?').bind(since).first();
    const byDomain  = await env.DB.prepare('SELECT domain, COUNT(*) as n FROM events WHERE ts > ? GROUP BY domain ORDER BY n DESC').bind(since).all();
    const byRegion  = await env.DB.prepare('SELECT region, COUNT(*) as n FROM events WHERE ts > ? GROUP BY region ORDER BY n DESC LIMIT 10').bind(since).all();
    const errors    = await env.DB.prepare('SELECT COUNT(*) as n FROM events WHERE ts > ? AND error != ""').bind(since).first();
    const citizens  = await env.DB.prepare('SELECT COUNT(*) as n FROM citizens').first();
    const lastEvent = await env.DB.prepare('SELECT ts FROM events ORDER BY ts DESC LIMIT 1').first();

    return new Response(JSON.stringify({
      citizens: citizens?.n || 0,
      events_24h: total?.n || 0,
      errors_24h: errors?.n || 0,
      last_event: lastEvent?.ts || null,
      by_domain: byDomain?.results || [],
      by_region: byRegion?.results || [],
    }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

// ── AI ANALYSIS ───────────────────────────────────────────────────────────────
async function handleAnalyze(env) {
  try {
    const since = Date.now() - 3600000; // last 1h
    const insights = [];

    // Run each domain agent
    for (const [domain, prompt] of Object.entries(AGENT_PROMPTS)) {
      if (domain === 'coordinator') continue;

      const rows = await env.DB.prepare(
        'SELECT signal, region, lang, error FROM events WHERE ts > ? AND domain = ? LIMIT 50'
      ).bind(since, domain).all();

      const signals = rows?.results || [];
      if (signals.length === 0) continue;

      const summary = signals.map(r =>
        `[${r.region}|${r.lang}] ${r.signal || r.error}`
      ).join('\n');

      const resp = await callClaude(env, prompt,
        `Last hour signals (${signals.length}):\n${summary}\n\nIn 3 sentences: what is happening, where, and what is urgent?`
      );

      if (resp) {
        insights.push({ domain, count: signals.length, insight: resp });
        await saveInsight(env, domain, resp, signals.length);
      }
    }

    // Coordinator sees everything
    if (insights.length > 0) {
      const coordInput = insights.map(i => `${i.domain.toUpperCase()}: ${i.insight}`).join('\n\n');
      const coordResp = await callClaude(env, AGENT_PROMPTS.coordinator,
        `Agent reports:\n\n${coordInput}\n\nWhat is the single most urgent priority for BRASA right now?`
      );
      if (coordResp) {
        insights.unshift({ domain: 'coordinator', count: insights.reduce((a, b) => a + b.count, 0), insight: coordResp });
        await saveInsight(env, 'coordinator', coordResp, insights[1]?.count || 0);
      }
    }

    return new Response(JSON.stringify({ ok: true, insights, analyzed_at: Date.now() }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

// ── GET INSIGHTS ──────────────────────────────────────────────────────────────
async function handleInsights(env) {
  try {
    const rows = await env.DB.prepare(
      'SELECT domain, insight, signal_count, ts FROM insights ORDER BY ts DESC LIMIT 20'
    ).all();
    return new Response(JSON.stringify(rows?.results || []), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
  }
}

// ── SAVE INSIGHT ──────────────────────────────────────────────────────────────
async function saveInsight(env, domain, insight, count) {
  try {
    const id = Date.now().toString(36) + domain;
    await env.DB.prepare(
      'INSERT OR REPLACE INTO insights (id, domain, insight, signal_count, ts) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, domain, insight, count, Date.now()).run();
  } catch (e) {
    console.error('Insight save error:', e.message);
  }
}

// ── CLAUDE API CALL ───────────────────────────────────────────────────────────
async function callClaude(env, system, user) {
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.BRASA_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system,
        messages: [{ role: 'user', content: user }]
      })
    });
    const data = await resp.json();
    return data?.content?.[0]?.text || null;
  } catch (e) {
    console.error('Claude error:', e.message);
    return null;
  }
}

// ── LIVE DASHBOARD ────────────────────────────────────────────────────────────
async function handleDashboard(env) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BRASA Mission Control</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0f; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; }
  header { background: #111827; border-bottom: 1px solid #1f2937; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
  header h1 { font-size: 18px; font-weight: 600; color: #f1f5f9; letter-spacing: .02em; }
  header h1 span { color: #3b82f6; }
  .live { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #10b981; }
  .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 24px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 0 24px 24px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; padding: 0 24px 24px; }
  .card { background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 20px; }
  .card-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
  .card-value { font-size: 32px; font-weight: 700; color: #f1f5f9; }
  .card-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .section-title { font-size: 13px; font-weight: 600; color: #94a3b8; padding: 0 24px 12px; text-transform: uppercase; letter-spacing: .08em; }
  .agent-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 0 24px 24px; }
  .agent { background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 16px; }
  .agent-name { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
  .agent-insight { font-size: 12px; color: #94a3b8; line-height: 1.6; }
  .agent-count { font-size: 11px; color: #4b5563; margin-top: 8px; }
  .domain-health    { color: #34d399; border-color: #064e3b; }
  .domain-water     { color: #60a5fa; border-color: #1e3a5f; }
  .domain-education { color: #a78bfa; border-color: #3b1f6b; }
  .domain-justice   { color: #fbbf24; border-color: #5f3a00; }
  .domain-identity  { color: #f87171; border-color: #5f1f1f; }
  .domain-economic  { color: #34d399; border-color: #064e3b; }
  .domain-system    { color: #94a3b8; border-color: #374151; }
  .domain-coordinator { color: #3b82f6; border-color: #1e3a5f; grid-column: span 2; }
  .coordinator-card { background: #0f1f3d; border: 1px solid #1d4ed8; border-radius: 10px; padding: 20px; margin: 0 24px 24px; }
  .coordinator-label { font-size: 11px; font-weight: 600; color: #3b82f6; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 10px; }
  .coordinator-insight { font-size: 14px; color: #bfdbfe; line-height: 1.7; }
  .bar-row { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
  .bar-label { font-size: 12px; color: #94a3b8; width: 80px; flex-shrink: 0; }
  .bar-track { flex: 1; height: 6px; background: #1f2937; border-radius: 99px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 99px; background: #3b82f6; transition: width .6s ease; }
  .bar-count { font-size: 11px; color: #6b7280; width: 30px; text-align: right; flex-shrink: 0; }
  .btn { background: #1d4ed8; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-size: 12px; cursor: pointer; font-weight: 500; }
  .btn:hover { background: #2563eb; }
  .btn-sm { background: #1f2937; color: #94a3b8; border: 1px solid #374151; border-radius: 6px; padding: 6px 12px; font-size: 11px; cursor: pointer; }
  .btn-sm:hover { background: #374151; }
  .actions { padding: 0 24px 24px; display: flex; gap: 10px; align-items: center; }
  .last-updated { font-size: 11px; color: #4b5563; margin-left: auto; }
  .error-badge { background: #450a0a; color: #f87171; border-radius: 4px; padding: 2px 8px; font-size: 11px; }
  .ok-badge { background: #052e16; color: #34d399; border-radius: 4px; padding: 2px 8px; font-size: 11px; }
</style>
</head>
<body>
<header>
  <h1><span>BRASA</span> Mission Control</h1>
  <div class="live"><div class="live-dot"></div> Live</div>
</header>

<div style="padding:24px 24px 8px">
  <div class="actions" style="padding:0;margin-bottom:16px">
    <button class="btn" onclick="runAnalysis()">Run AI Analysis Now</button>
    <button class="btn-sm" onclick="loadAll()">Refresh</button>
    <span class="last-updated" id="last-updated">Loading...</span>
  </div>
</div>

<div class="grid" id="metrics">
  <div class="card"><div class="card-label">Citizens registered</div><div class="card-value" id="m-citizens">—</div></div>
  <div class="card"><div class="card-label">Events (24h)</div><div class="card-value" id="m-events">—</div></div>
  <div class="card"><div class="card-label">Errors (24h)</div><div class="card-value" id="m-errors">—</div><div class="card-sub" id="m-error-badge"></div></div>
  <div class="card"><div class="card-label">Last signal</div><div class="card-value" id="m-last" style="font-size:18px">—</div></div>
</div>

<div class="section-title">Domain activity (24h)</div>
<div class="grid-2">
  <div class="card" id="domain-bars"><div style="color:#4b5563;font-size:13px">No data yet</div></div>
  <div class="card" id="region-bars"><div style="color:#4b5563;font-size:13px">No data yet</div></div>
</div>

<div class="section-title" id="insights-title">AI Agent Insights</div>
<div id="coordinator-section"></div>
<div class="agent-grid" id="agent-insights">
  <div class="agent" style="grid-column:span 4;color:#4b5563;font-size:13px">Run analysis to see agent insights</div>
</div>

<script>
async function loadStatus() {
  try {
    const r = await fetch('/api/status');
    const d = await r.json();

    document.getElementById('m-citizens').textContent = d.citizens.toLocaleString();
    document.getElementById('m-events').textContent = d.events_24h.toLocaleString();
    document.getElementById('m-errors').textContent = d.errors_24h.toLocaleString();
    document.getElementById('m-error-badge').innerHTML = d.errors_24h > 0
      ? '<span class="error-badge">needs attention</span>'
      : '<span class="ok-badge">all clear</span>';

    if (d.last_event) {
      const ago = Math.round((Date.now() - d.last_event) / 60000);
      document.getElementById('m-last').textContent = ago < 1 ? 'just now' : ago + 'm ago';
    }

    const maxD = Math.max(...(d.by_domain.map(x => x.n) || [1]));
    document.getElementById('domain-bars').innerHTML = '<div style="font-size:11px;color:#6b7280;margin-bottom:12px;text-transform:uppercase;letter-spacing:.08em">By domain</div>' +
      (d.by_domain.length ? d.by_domain.map(x =>
        '<div class="bar-row"><span class="bar-label">' + x.domain + '</span><div class="bar-track"><div class="bar-fill" style="width:' + Math.round(x.n/maxD*100) + '%"></div></div><span class="bar-count">' + x.n + '</span></div>'
      ).join('') : '<div style="color:#4b5563;font-size:13px">No events yet</div>');

    const maxR = Math.max(...(d.by_region.map(x => x.n) || [1]));
    document.getElementById('region-bars').innerHTML = '<div style="font-size:11px;color:#6b7280;margin-bottom:12px;text-transform:uppercase;letter-spacing:.08em">By region</div>' +
      (d.by_region.length ? d.by_region.map(x =>
        '<div class="bar-row"><span class="bar-label">' + x.region + '</span><div class="bar-track"><div class="bar-fill" style="width:' + Math.round(x.n/maxR*100) + '%;background:#8b5cf6"></div></div><span class="bar-count">' + x.n + '</span></div>'
      ).join('') : '<div style="color:#4b5563;font-size:13px">No events yet</div>');

    document.getElementById('last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString();
  } catch(e) {
    console.error(e);
  }
}

async function loadInsights() {
  try {
    const r = await fetch('/api/insights');
    const insights = await r.json();
    if (!insights.length) return;

    const coord = insights.find(i => i.domain === 'coordinator');
    if (coord) {
      document.getElementById('coordinator-section').innerHTML =
        '<div class="coordinator-card"><div class="coordinator-label">Coordinator — full picture</div><div class="coordinator-insight">' + coord.insight + '</div></div>';
    }

    const agents = insights.filter(i => i.domain !== 'coordinator');
    if (agents.length) {
      document.getElementById('agent-insights').innerHTML = agents.map(i =>
        '<div class="agent domain-' + i.domain + '"><div class="agent-name">' + i.domain + '</div><div class="agent-insight">' + i.insight + '</div><div class="agent-count">' + i.signal_count + ' signals</div></div>'
      ).join('');
    }
  } catch(e) { console.error(e); }
}

async function runAnalysis() {
  const btn = document.querySelector('.btn');
  btn.textContent = 'Analyzing...';
  btn.disabled = true;
  try {
    await fetch('/api/analyze');
    await loadInsights();
    btn.textContent = 'Run AI Analysis Now';
    btn.disabled = false;
  } catch(e) {
    btn.textContent = 'Run AI Analysis Now';
    btn.disabled = false;
  }
}

async function loadAll() {
  await loadStatus();
  await loadInsights();
}

loadAll();
setInterval(loadStatus, 30000);
</script>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
