/* ──────────────────────────────────────────────────────────────────────────
   BRASA CR · Planetary Monitoring Platform
   Wellbeing console engine — live, client-side, real data only.
   Each page sets  window.WELLBEING_DOMAIN  before loading this file.

   Mirror of the Hazards / Stewardship / Infrastructure / Health engines.
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

    // ── LIVE · conflict early-warning (humanitarian situation reports) ────────
    "conflict-early-warning": {
      source: "ReliefWeb · UN OCHA",
      sourceUrl: "https://reliefweb.int/updates",
      feedNote: "Latest crisis, conflict & displacement situation reports · refreshes every 5 min",
      refresh: 300000,
      url: "https://api.reliefweb.int/v1/reports?appname=brasa-cr&query[value]=conflict%20OR%20displacement%20OR%20crisis&sort[]=date.created:desc&limit=24&fields[include][]=title&fields[include][]=url&fields[include][]=date.created&fields[include][]=source.shortname&fields[include][]=primary_country.name",
      parse: (j) => {
        const data = j.data || [];
        return {
          status: "info",
          statusText: data.length ? "Latest crisis & conflict reports" : "No reports",
          stats: [
            { label: "Reports · recent", value: num(data.length) },
            { label: "On ReliefWeb", value: j.totalCount ? compact(j.totalCount) : "—" },
            { label: "Coordinated by", value: "UN OCHA" },
          ],
          items: data.map((r) => {
            const f = r.fields || {};
            const src = (f.source && f.source[0] && f.source[0].shortname) || "";
            const country = (f.primary_country && f.primary_country.name) || "Global";
            return {
              time: f.date && f.date.created ? new Date(f.date.created).getTime() : null,
              value: "REPORT",
              title: (f.title || "Situation report").slice(0, 100),
              meta: [country, src].filter(Boolean).join(" · "),
              severity: "moderate",
              href: f.url || undefined,
            };
          }),
        };
      },
    },

    // ── LIVE · national wellbeing (life expectancy at birth) ──────────────────
    "national-wellbeing": {
      source: "World Bank Open Data",
      sourceUrl: "https://data.worldbank.org/",
      feedNote: "Life expectancy at birth · World Development Indicators · refreshes hourly",
      refresh: 3600000,
      url: "https://api.worldbank.org/v2/country/USA;CHN;JPN;DEU;IND;BRA;GBR;CRI;NGA;NOR/indicator/SP.DYN.LE00.IN?format=json&mrnev=1&per_page=300",
      parse: (j) => {
        const rows = (Array.isArray(j) && j[1]) ? j[1] : [];
        const clean = rows.filter((r) => r.value != null).map((r) => ({
          name: (r.country && r.country.value) || "—", year: r.date, v: r.value,
        }));
        clean.sort((a, b) => b.v - a.v);
        return {
          status: "low",
          statusText: clean.length ? "Life expectancy at birth · " + clean.length + " economies" : "No data",
          stats: [
            { label: "Economies", value: num(clean.length) },
            { label: "Highest", value: clean[0] ? clean[0].v.toFixed(1) + " yrs" : "—" },
            { label: "Indicator", value: "Life exp." },
          ],
          items: clean.map((c) => ({
            time: null,
            value: c.v.toFixed(1) + " yr",
            title: c.name,
            meta: "life expectancy at birth · " + c.year,
            severity: "low",
          })),
        };
      },
    },

    // ── REFERENCE LAYERS · authoritative sources without a public browser feed ──
    "peace-and-fragility": {
      source: "Fund for Peace · Fragile States Index",
      sourceUrl: "https://fragilestatesindex.org/",
      feedNote: "Annual state-fragility scoring across cohesion, economic, political & social indicators",
      reference: {
        statusText: "Reference layer",
        blurb: "State fragility is scored by the Fund for Peace Fragile States Index and the Institute for Economics & Peace Global Peace Index — composite measures of cohesion, economic, political and social pressures across 179 states. These are annual analytical indices rather than a live browser feed, so this console links to the official Fragile States Index.",
        stats: [
          { label: "Indicators", value: "12" },
          { label: "Coverage", value: "179 states" },
          { label: "Cadence", value: "Annual" },
        ],
      },
    },

    "hunger-famine": {
      source: "IPC · Integrated Food Security Phase Classification",
      sourceUrl: "https://www.ipcinfo.org/",
      feedNote: "Acute food-insecurity & famine classification (with FEWS NET)",
      reference: {
        statusText: "Reference layer",
        blurb: "Acute hunger and famine risk are classified by the IPC (Integrated Food Security Phase Classification) and FEWS NET — a five-phase scale from Minimal to Famine, derived from consumption, nutrition and mortality evidence. The classifications are published as periodic country analyses rather than a live browser feed, so this console links to the official IPC portal.",
        stats: [
          { label: "Scale", value: "Phase 1–5" },
          { label: "Coverage", value: "Global" },
          { label: "Cadence", value: "Seasonal" },
        ],
      },
    },

    homelessness: {
      source: "OECD Affordable Housing Database",
      sourceUrl: "https://www.oecd.org/en/data/datasets/oecd-affordable-housing-database.html",
      feedNote: "Homelessness estimates & housing-cost burden across member states",
      reference: {
        statusText: "Reference layer",
        blurb: "Homelessness is estimated through the OECD Affordable Housing Database and UN-Habitat — counts and rates of people experiencing homelessness, alongside housing-cost burden and overcrowding indicators. Definitions vary by country and data is released periodically rather than as a live feed, so this console links to the OECD Affordable Housing Database.",
        stats: [
          { label: "Metric", value: "Estimates" },
          { label: "Coverage", value: "OECD" },
          { label: "Cadence", value: "Periodic" },
        ],
      },
    },

    crime: {
      source: "UNODC · data.UNODC",
      sourceUrl: "https://dataunodc.un.org/",
      feedNote: "Homicide, violent & property crime statistics",
      reference: {
        statusText: "Reference layer",
        blurb: "Crime is documented by the UN Office on Drugs and Crime — intentional homicide, violent and property crime, and criminal-justice indicators compiled from national reporting and victimization surveys. These are annual statistical datasets rather than a live browser feed, so this console links to the official data.UNODC portal.",
        stats: [
          { label: "Dataset", value: "Global" },
          { label: "Indicators", value: "Homicide · victims" },
          { label: "Cadence", value: "Annual" },
        ],
      },
    },

    traffic: {
      source: "WHO · Global Status Report on Road Safety",
      sourceUrl: "https://www.who.int/teams/social-determinants-of-health/safety-and-mobility",
      feedNote: "Road-traffic deaths, exposure & safety measures",
      reference: {
        statusText: "Reference layer",
        blurb: "Road safety is tracked by the WHO Global Status Report on Road Safety — road-traffic death rates, exposure, and the legislative and infrastructure measures in place across 175+ countries. The report is published on a multi-year cycle rather than as a live browser feed, so this console links to the official WHO road-safety programme.",
        stats: [
          { label: "Metric", value: "Road deaths" },
          { label: "Coverage", value: "Global" },
          { label: "Cadence", value: "Triennial" },
        ],
      },
    },
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const domain = window.WELLBEING_DOMAIN;
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
