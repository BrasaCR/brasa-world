/* ──────────────────────────────────────────────────────────────────────────
   BRASA CR · Planetary Monitoring Platform
   Infrastructure console engine — live, client-side, real data only.
   Each page sets  window.INFRA_DOMAIN  before loading this file.

   Mirror of the Global Hazards / Stewardship engines. Two kinds of domain:
     · live      → { url, parse }      fetched + refreshed in the browser
     · reference → { reference: {...} } no public browser feed, links to the
                                        authoritative live viewer (honest by design)
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
    if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return String(Math.round(n));
  };

  // ── Per-domain configuration ───────────────────────────────────────────────
  const CONFIG = {

    // ── LIVE · global river discharge (flood lifelines) ───────────────────────
    "rivers-floods": {
      source: "Open-Meteo Flood API · Copernicus GloFAS",
      sourceUrl: "https://open-meteo.com/en/docs/flood-api",
      feedNote: "Daily-mean river discharge at major world gauges · refreshes every 5 min",
      refresh: 300000,
      url: (() => {
        const lat = [-1.92, 25.59, 35.12, 30.59, 30.04, 47.50, 11.56, -4.32];
        const lon = [-55.51, 85.13, -90.05, 114.30, 31.23, 19.04, 104.92, 15.31];
        return "https://flood-api.open-meteo.com/v1/flood?latitude=" + lat.join(",") +
          "&longitude=" + lon.join(",") + "&daily=river_discharge&forecast_days=1&timezone=UTC";
      })(),
      parse: (j) => {
        const names = ["Amazon · Óbidos", "Ganges · Patna", "Mississippi · Memphis", "Yangtze · Wuhan",
                       "Nile · Cairo", "Danube · Budapest", "Mekong · Phnom Penh", "Congo · Kinshasa"];
        const arr = Array.isArray(j) ? j : [j];
        const rows = arr.map((loc, i) => {
          const d = (loc && loc.daily) || {};
          const q = d.river_discharge && d.river_discharge[0];
          const t = d.time && d.time[0];
          return { name: names[i] || ("River " + (i + 1)), q, time: t ? new Date(t).getTime() : null };
        }).filter((r) => r.q != null);
        rows.sort((a, b) => (b.q || 0) - (a.q || 0));
        return {
          status: "info",
          statusText: rows.length ? "Live river discharge · daily mean" : "No data",
          stats: [
            { label: "Gauges tracked", value: num(rows.length) },
            { label: "Highest discharge", value: rows[0] ? num(Math.round(rows[0].q)) + " m³/s" : "—" },
            { label: "Model", value: "GloFAS v4" },
          ],
          items: rows.map((r) => ({
            time: r.time,
            value: num(Math.round(r.q)) + " m³/s",
            title: r.name,
            meta: "river discharge · daily mean",
            severity: "info",
          })),
        };
      },
    },

    // ── LIVE · country macro (real GDP growth) ────────────────────────────────
    "country-macro": {
      source: "World Bank Open Data",
      sourceUrl: "https://data.worldbank.org/",
      feedNote: "Latest annual real GDP growth · World Development Indicators · refreshes hourly",
      refresh: 3600000,
      url: "https://api.worldbank.org/v2/country/USA;CHN;JPN;DEU;IND;BRA;GBR;CRI/indicator/NY.GDP.MKTP.KD.ZG?format=json&mrnev=1&per_page=200",
      parse: (j) => {
        const rows = (Array.isArray(j) && j[1]) ? j[1] : [];
        const clean = rows.filter((r) => r.value != null).map((r) => ({
          name: (r.country && r.country.value) || "—", year: r.date, v: r.value,
        }));
        clean.sort((a, b) => b.v - a.v);
        const sevOf = (v) => (v < 0 ? "high" : v < 1 ? "moderate" : "low");
        return {
          status: clean.some((c) => c.v < 0) ? "moderate" : "low",
          statusText: clean.length ? "Latest real GDP growth · " + clean.length + " economies" : "No data",
          stats: [
            { label: "Economies", value: num(clean.length) },
            { label: "Fastest growth", value: clean[0] ? clean[0].v.toFixed(1) + "%" : "—" },
            { label: "In contraction", value: num(clean.filter((c) => c.v < 0).length) },
          ],
          items: clean.map((c) => ({
            time: null,
            value: (c.v >= 0 ? "+" : "") + c.v.toFixed(1) + "%",
            title: c.name,
            meta: "real GDP growth · " + c.year,
            severity: sevOf(c.v),
          })),
        };
      },
    },

    // ── LIVE · markets (global asset moves) ───────────────────────────────────
    markets: {
      source: "CoinGecko Markets API",
      sourceUrl: "https://www.coingecko.com/",
      feedNote: "Top assets by market cap · live price & 24h move · refreshes every 60s",
      url: "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&price_change_percentage=24h",
      parse: (j) => {
        const rows = Array.isArray(j) ? j : [];
        const sevOf = (p) => (p <= -5 ? "high" : p < 0 ? "moderate" : "low");
        const down = rows.filter((r) => (r.price_change_percentage_24h || 0) < 0).length;
        const totalCap = rows.reduce((s, r) => s + (r.market_cap || 0), 0);
        return {
          status: down > rows.length / 2 ? "moderate" : "low",
          statusText: rows.length ? "Live · " + down + " of " + rows.length + " down 24h" : "No data",
          stats: [
            { label: "Assets tracked", value: num(rows.length) },
            { label: "Down · 24h", value: num(down) },
            { label: "Total mkt cap", value: rows.length ? "$" + compact(totalCap) : "—" },
          ],
          items: rows.map((r) => {
            const p = r.price_change_percentage_24h;
            return {
              time: r.last_updated ? new Date(r.last_updated).getTime() : null,
              value: (p >= 0 ? "+" : "") + (p != null ? p.toFixed(1) : "0.0") + "%",
              title: r.name + " · " + (r.symbol || "").toUpperCase(),
              meta: "$" + num(r.current_price, r.current_price < 1 ? 4 : 2),
              severity: sevOf(p || 0),
              href: r.id ? ("https://www.coingecko.com/en/coins/" + r.id) : undefined,
            };
          }),
        };
      },
    },

    // ── REFERENCE LAYERS · authoritative sources without a public browser feed ──
    "electrical-grid": {
      source: "ENTSO-E Transparency Platform",
      sourceUrl: "https://transparency.entsoe.eu/",
      feedNote: "Real-time electricity load, generation mix & cross-border flows",
      reference: {
        statusText: "Reference layer",
        blurb: "The electrical grid is monitored through the ENTSO-E Transparency Platform (Europe) and the U.S. EIA real-time grid dashboard — actual load, generation by fuel type, and cross-border flows at 15-minute to hourly resolution. The data is served through authenticated SOAP/REST APIs rather than an open browser feed, so this console links straight to the live ENTSO-E platform.",
        stats: [
          { label: "Metric", value: "Load · mix" },
          { label: "Coverage", value: "EU + US" },
          { label: "Cadence", value: "15 min" },
        ],
      },
    },

    gas: {
      source: "U.S. EIA · Natural Gas",
      sourceUrl: "https://www.eia.gov/naturalgas/",
      feedNote: "Storage, pipeline flows, spot & futures prices",
      reference: {
        statusText: "Reference layer",
        blurb: "Natural-gas infrastructure is tracked by the U.S. Energy Information Administration and ENTSOG (Europe) — underground storage levels, pipeline flows, and Henry Hub / TTF spot and futures prices. These are published as periodic statistical series rather than a live browser feed, so this console links to the official EIA natural-gas dashboard.",
        stats: [
          { label: "Metric", value: "Storage · price" },
          { label: "Coverage", value: "Global" },
          { label: "Cadence", value: "Weekly" },
        ],
      },
    },

    communications: {
      source: "Cloudflare Radar · IODA",
      sourceUrl: "https://radar.cloudflare.com/",
      feedNote: "Internet traffic, routing & connectivity disruptions",
      reference: {
        statusText: "Reference layer",
        blurb: "Communications resilience is observed through Cloudflare Radar and the Georgia Tech IODA project — internet traffic levels, BGP routing changes, and detected outages or shutdowns worldwide in near real time. These layers are served through authenticated or rate-limited APIs rather than an open browser feed, so this console links to the live Cloudflare Radar viewer.",
        stats: [
          { label: "Signal", value: "BGP · traffic" },
          { label: "Coverage", value: "Global" },
          { label: "Cadence", value: "Real time" },
        ],
      },
    },

    banking: {
      source: "Bank for International Settlements (BIS)",
      sourceUrl: "https://www.bis.org/statistics/",
      feedNote: "Cross-border claims, credit & banking-sector statistics",
      reference: {
        statusText: "Reference layer",
        blurb: "The banking system is monitored through the Bank for International Settlements and IMF statistics — cross-border claims, global credit aggregates, and banking-sector soundness indicators compiled from central-bank reporting. These are quarterly statistical datasets rather than a live browser feed, so this console links to the official BIS statistics portal.",
        stats: [
          { label: "Dataset", value: "Global" },
          { label: "Indicators", value: "Credit · claims" },
          { label: "Cadence", value: "Quarterly" },
        ],
      },
    },

    "financial-stability": {
      source: "IMF · Global Financial Stability Report",
      sourceUrl: "https://www.imf.org/en/Publications/GFSR",
      feedNote: "Systemic risk, vulnerabilities & financial conditions",
      reference: {
        statusText: "Reference layer",
        blurb: "Financial stability is assessed through the IMF Global Financial Stability Report and the Financial Stability Board — systemic-risk indices, financial-conditions indexes, and sector vulnerability assessments for the global system. These are published as biannual analytical products rather than a live browser feed, so this console links to the official IMF GFSR.",
        stats: [
          { label: "Metric", value: "Risk indices" },
          { label: "Coverage", value: "Global" },
          { label: "Cadence", value: "Biannual" },
        ],
      },
    },
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const domain = window.INFRA_DOMAIN;
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
