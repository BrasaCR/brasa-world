/* ──────────────────────────────────────────────────────────────────────────
   BRASA CR · Planetary Monitoring Platform
   Health console engine — live, client-side, real data only.
   Each page sets  window.HEALTH_DOMAIN  before loading this file.

   Mirror of the Hazards / Stewardship / Infrastructure engines.
     · live      → { url, parse }      fetched + refreshed in the browser
     · reference → { reference: {...} } links to the authoritative live viewer
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  const SEV = {
    critical: { label: "Critical", color: "#B42318" },
    high:     { label: "High",     color: "#C4541C" },
    moderate: { label: "Moderate", color: "#B7791F" },
    low:      { label: "Low",      color: "#0D6E5C" },
    calm:     { label: "All clear",color: "#0D6E5C" },
    info:     { label: "Info",     color: "#6B6862" },
  };

  const fmtTime = (ms) => {
    if (!ms) return "";
    const d = new Date(ms);
    const diff = Date.now() - d.getTime();
    const min = Math.round(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return min + " min ago";
    const hr = Math.round(min / 60);
    if (hr < 24) return hr + " hr ago";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };
  const fmtClock = (d) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const num = (n, d = 0) => Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  const compact = (n) => {
    n = Number(n);
    if (!isFinite(n)) return "—";
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return String(Math.round(n));
  };

  // ── Per-domain configuration ───────────────────────────────────────────────
  const CONFIG = {

    // ── LIVE · disease surveillance (global case aggregator) ──────────────────
    "disease-surveillance": {
      source: "disease.sh · global case aggregator",
      sourceUrl: "https://disease.sh/",
      feedNote: "Aggregated case surveillance by country · refreshes every 5 min",
      refresh: 300000,
      url: "https://disease.sh/v3/covid-19/countries?sort=cases",
      parse: (j) => {
        const arr = Array.isArray(j) ? j : [];
        const totalCases = arr.reduce((s, r) => s + (r.cases || 0), 0);
        const todayCases = arr.reduce((s, r) => s + (r.todayCases || 0), 0);
        const top = arr.slice().sort((a, b) => (b.cases || 0) - (a.cases || 0)).slice(0, 24);
        const sevOf = (t) => (t > 50000 ? "high" : t > 0 ? "moderate" : "low");
        return {
          status: "info",
          statusText: arr.length ? "Aggregated surveillance · " + arr.length + " countries" : "No data",
          stats: [
            { label: "Countries reporting", value: num(arr.length) },
            { label: "Cumulative cases", value: compact(totalCases) },
            { label: "New today", value: num(todayCases) },
          ],
          items: top.map((r) => ({
            time: r.updated || null,
            value: compact(r.cases || 0),
            title: r.country,
            meta: "today +" + num(r.todayCases || 0) + " · " + num(r.deaths || 0) + " deaths",
            severity: sevOf(r.todayCases || 0),
          })),
        };
      },
    },

    // ── LIVE · food safety / recalls (openFDA enforcement) ────────────────────
    "food-safety-recalls": {
      source: "openFDA · FDA Food Enforcement",
      sourceUrl: "https://open.fda.gov/apis/food/enforcement/",
      feedNote: "Most recent U.S. food recalls & enforcement actions · refreshes hourly",
      refresh: 3600000,
      url: "https://api.fda.gov/food/enforcement.json?sort=report_date:desc&limit=24",
      parse: (j) => {
        const res = j.results || [];
        const total = j.meta && j.meta.results && j.meta.results.total;
        const sevOf = (c) => (/Class I\b/i.test(c) ? "critical" : /Class II\b/i.test(c) ? "high" : /Class III/i.test(c) ? "moderate" : "info");
        const classI = res.filter((r) => /Class I\b/i.test(r.classification || "")).length;
        const pd = (s) => (s && s.length === 8 ? new Date(s.slice(0, 4) + "-" + s.slice(4, 6) + "-" + s.slice(6, 8)).getTime() : null);
        return {
          status: classI ? "critical" : "high",
          statusText: res.length ? res.length + " recent recalls" + (classI ? " · " + classI + " Class I" : "") : "No recalls",
          stats: [
            { label: "Recent recalls", value: num(res.length) },
            { label: "Class I · most serious", value: num(classI) },
            { label: "On file", value: total ? compact(total) : "—" },
          ],
          items: res.map((r) => ({
            time: pd(r.report_date),
            value: (r.classification || "Recall").replace("Class ", "Cl "),
            title: (r.product_description || "Food product").slice(0, 90),
            meta: [r.recalling_firm, (r.reason_for_recall || "").slice(0, 70)].filter(Boolean).join(" · ").slice(0, 120),
            severity: sevOf(r.classification || ""),
          })),
          emptyText: "No food enforcement actions returned in this window.",
        };
      },
    },

    // ── REFERENCE LAYERS · authoritative sources without a public browser feed ──
    "health-system": {
      source: "WHO Global Health Observatory",
      sourceUrl: "https://www.who.int/data/gho",
      feedNote: "Universal health coverage, workforce & system indicators",
      reference: {
        statusText: "Reference layer",
        blurb: "Health-system performance is tracked through the WHO Global Health Observatory — universal health coverage, service-readiness, health-workforce density and financing indicators for 194 member states. These are curated statistical series published on an annual cycle rather than a live browser feed, so this console links to the official WHO GHO portal.",
        stats: [
          { label: "Indicators", value: "2,000+" },
          { label: "Coverage", value: "194 states" },
          { label: "Cadence", value: "Annual" },
        ],
      },
    },

    "pandemic-intelligence": {
      source: "WHO Hub for Pandemic & Epidemic Intelligence",
      sourceUrl: "https://pandemichub.who.int/",
      feedNote: "Early signals, EIOS event-based surveillance & risk assessment",
      reference: {
        statusText: "Reference layer",
        blurb: "Pandemic intelligence is coordinated by the WHO Hub for Pandemic & Epidemic Intelligence using the EIOS system — continuous scanning of thousands of open and official sources to detect early signals of emerging health threats. The verified signal stream is access-controlled rather than an open browser feed, so this console links to the WHO Pandemic Hub.",
        stats: [
          { label: "System", value: "EIOS" },
          { label: "Sources", value: "Multi-source" },
          { label: "Cadence", value: "Continuous" },
        ],
      },
    },
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const domain = window.HEALTH_DOMAIN;
  const cfg = CONFIG[domain];
  const $ = (id) => document.getElementById(id);

  function pill(status, text) {
    const s = SEV[status] || SEV.info;
    const el = $("status");
    el.textContent = text;
    el.style.background = s.color;
    el.style.color = "#fff";
    const dot = $("status-dot");
    if (dot) dot.style.background = status === "calm" || status === "low" ? "#7ee0c8" : "#ffd9c2";
  }

  function renderStats(stats) {
    $("stats").innerHTML = stats.map((s) => (
      '<div class="stat"><div class="stat-value">' + s.value + '</div><div class="stat-label">' + s.label + "</div></div>"
    )).join("");
  }

  function renderItems(items, emptyText) {
    const feed = $("feed");
    if (!items || !items.length) {
      feed.innerHTML = '<div class="feed-empty">' + (emptyText || "No events in the current window.") + "</div>";
      return;
    }
    feed.innerHTML = items.map((it) => {
      const s = SEV[it.severity] || SEV.info;
      const tag = '<a class="event" href="' + (it.href || "#") + '"' + (it.href ? ' target="_blank" rel="noopener"' : "") + ">";
      return tag +
        '<span class="event-bar" style="background:' + s.color + '"></span>' +
        '<span class="event-value" style="color:' + s.color + '">' + it.value + "</span>" +
        '<span class="event-body"><span class="event-title">' + it.title + "</span>" +
        (it.meta ? '<span class="event-meta">' + it.meta + "</span>" : "") + "</span>" +
        '<span class="event-time">' + fmtTime(it.time) + "</span>" +
        "</a>";
    }).join("");
  }

  function renderReference(ref) {
    pill("info", ref.statusText);
    renderStats(ref.stats);
    $("feed").innerHTML = '<div class="feed-ref">' + ref.blurb +
      '<a class="feed-ref-link" href="' + cfg.sourceUrl + '" target="_blank" rel="noopener">Open the live ' + cfg.source.split("·")[0].trim() + " viewer →</a></div>";
    $("updated").textContent = "";
  }

  function setUpdated() {
    $("updated").textContent = "Updated " + fmtClock(new Date());
  }

  async function load() {
    if (!cfg) return;
    if (cfg.reference) { renderReference(cfg.reference); return; }
    try {
      const res = await fetch(cfg.url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const data = cfg.parse(json);
      pill(data.status, data.statusText);
      renderStats(data.stats);
      renderItems(data.items, data.emptyText);
      setUpdated();
    } catch (e) {
      pill("info", "Source feed");
      $("stats").innerHTML = "";
      $("feed").innerHTML = '<div class="feed-ref">This feed could not be reached directly from the browser (the provider does not allow cross-origin requests). In production it is proxied through the BRASA ingestion layer. For now, open the authoritative live source directly.' +
        '<a class="feed-ref-link" href="' + cfg.sourceUrl + '" target="_blank" rel="noopener">Open ' + cfg.source.split("·")[0].trim() + " →</a></div>";
      $("updated").textContent = "";
    }
  }

  function boot() {
    if (!cfg) return;
    $("provenance").innerHTML = 'Source · <a href="' + cfg.sourceUrl + '" target="_blank" rel="noopener">' + cfg.source + "</a> &nbsp;·&nbsp; " + cfg.feedNote;
    load();
    const every = cfg.refresh || 60000;
    if (!cfg.reference) setInterval(load, every);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
