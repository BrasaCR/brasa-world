/* ──────────────────────────────────────────────────────────────────────────
   BRASA CR · Planetary Monitoring Platform
   Stewardship console engine — live, client-side, real data only.
   Each page sets  window.STEWARD_DOMAIN  before loading this file.

   Mirror of the Global Hazards engine. Two kinds of domain:
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
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return String(n);
  };

  // ── Per-domain configuration ───────────────────────────────────────────────
  const CONFIG = {

    // ── LIVE · global air quality ─────────────────────────────────────────────
    pollution: {
      source: "Open-Meteo Air Quality API · Copernicus CAMS",
      sourceUrl: "https://open-meteo.com/en/docs/air-quality-api",
      feedNote: "Real-time US AQI & PM2.5 · major world cities · refreshes every 60s",
      url: (() => {
        const lat = [28.61, 39.90, -6.21, 34.05, 51.51, 19.43, -23.55, 6.52];
        const lon = [77.20, 116.40, 106.85, -118.24, -0.13, -99.13, -46.63, 3.38];
        return "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" +
          lat.join(",") + "&longitude=" + lon.join(",") +
          "&current=us_aqi,pm2_5,pm10&timezone=UTC";
      })(),
      parse: (j) => {
        const names = ["New Delhi", "Beijing", "Jakarta", "Los Angeles", "London", "Mexico City", "São Paulo", "Lagos"];
        const arr = Array.isArray(j) ? j : [j];
        const sevOf = (a) => (a >= 151 ? "critical" : a >= 101 ? "high" : a >= 51 ? "moderate" : "low");
        const rows = arr.map((loc, i) => {
          const c = (loc && loc.current) || {};
          return {
            name: names[i] || ("Site " + (i + 1)),
            aqi: c.us_aqi,
            pm: c.pm2_5,
            time: c.time ? new Date(c.time + "Z").getTime() : null,
          };
        }).filter((r) => r.aqi != null);
        rows.sort((a, b) => (b.aqi || 0) - (a.aqi || 0));
        const worst = rows.length ? rows[0].aqi : 0;
        const unhealthy = rows.filter((r) => r.aqi > 100).length;
        return {
          status: sevOf(worst),
          statusText: rows.length ? "Worst · " + rows[0].name + " · AQI " + Math.round(worst) : "No data",
          stats: [
            { label: "Cities tracked", value: num(rows.length) },
            { label: "Worst US AQI", value: num(Math.round(worst)) },
            { label: "Above 100 · unhealthy", value: num(unhealthy) },
          ],
          items: rows.map((r) => ({
            time: r.time,
            value: "AQI " + Math.round(r.aqi),
            title: r.name,
            meta: r.pm != null ? "PM2.5 " + num(r.pm, 1) + " µg/m³" : "",
            severity: sevOf(r.aqi),
          })),
        };
      },
    },

    // ── LIVE · global biodiversity observations ───────────────────────────────
    biodiversity: {
      source: "GBIF · Global Biodiversity Information Facility",
      sourceUrl: "https://www.gbif.org/",
      feedNote: "Latest geo-referenced species occurrence records worldwide · refreshes every 60s",
      url: "https://api.gbif.org/v1/occurrence/search?hasCoordinate=true&limit=24",
      parse: (j) => {
        const res = j.results || [];
        return {
          status: "info",
          statusText: j.count ? compact(j.count) + " records indexed worldwide" : "Live observations",
          stats: [
            { label: "Records · GBIF", value: j.count ? compact(j.count) : num(res.length) },
            { label: "In this window", value: num(res.length) },
            { label: "Countries", value: num(new Set(res.map((r) => r.country).filter(Boolean)).size) },
          ],
          items: res.map((r) => ({
            time: r.eventDate ? new Date(r.eventDate).getTime() : (r.lastInterpreted ? new Date(r.lastInterpreted).getTime() : null),
            value: (r.basisOfRecord || "OBS").replace(/_/g, " ").toLowerCase(),
            title: r.species || r.scientificName || r.genus || "Unidentified taxon",
            meta: [r.country, r.datasetName].filter(Boolean).join(" · ").slice(0, 90),
            severity: "low",
            href: r.key ? ("https://www.gbif.org/occurrence/" + r.key) : undefined,
          })),
          emptyText: "No occurrence records returned in this window.",
        };
      },
    },

    // ── REFERENCE LAYERS · authoritative sources without a public browser feed ──
    ocean: {
      source: "NOAA Coral Reef Watch",
      sourceUrl: "https://coralreefwatch.noaa.gov/",
      feedNote: "Sea-surface temperature & coral bleaching heat stress",
      reference: {
        statusText: "Reference layer",
        blurb: "Ocean health is tracked through NOAA Coral Reef Watch and the Copernicus Marine Service — global sea-surface temperature, marine heatwaves and coral bleaching heat-stress products derived from satellite and model data. These are published as gridded map services rather than a public browser feed, so this console links straight to the live NOAA viewer for real-time inspection.",
        stats: [
          { label: "Product", value: "SST · DHW" },
          { label: "Resolution", value: "5 km" },
          { label: "Cadence", value: "Daily" },
        ],
      },
    },

    deforestation: {
      source: "Global Forest Watch",
      sourceUrl: "https://www.globalforestwatch.org/",
      feedNote: "Near-real-time tree-cover-loss alerts (GLAD / RADD)",
      reference: {
        statusText: "Reference layer",
        blurb: "Forest loss is detected by the GLAD and RADD alert systems and published through Global Forest Watch — integrated deforestation alerts from optical and radar satellites at 10–30 m resolution. The alert layers are served as authenticated map tiles rather than an open browser feed, so this console links to the live Global Forest Watch map for real-time inspection.",
        stats: [
          { label: "System", value: "GLAD-L/S2 · RADD" },
          { label: "Resolution", value: "10–30 m" },
          { label: "Cadence", value: "Weekly" },
        ],
      },
    },

    "illegal-fishing": {
      source: "Global Fishing Watch",
      sourceUrl: "https://globalfishingwatch.org/map/",
      feedNote: "AIS-derived apparent fishing effort & vessel tracks",
      reference: {
        statusText: "Reference layer",
        blurb: "Apparent fishing activity is reconstructed by Global Fishing Watch from satellite AIS and VMS vessel signals, revealing effort, transhipment and tracks in near real time across the world's oceans. The full data is accessed through an authenticated API rather than an open browser feed, so this console links to the live Global Fishing Watch map.",
        stats: [
          { label: "Signal", value: "AIS / VMS" },
          { label: "Vessels", value: "70k+" },
          { label: "Cadence", value: "Daily" },
        ],
      },
    },

    "illegal-mining": {
      source: "Amazon Mining Watch",
      sourceUrl: "https://amazonminingwatch.org/",
      feedNote: "Machine-learning detection of mining scars from satellite imagery",
      reference: {
        statusText: "Reference layer",
        blurb: "Illegal and informal mining is mapped by Amazon Mining Watch and partners (RAISG, Earthrise) using machine-learning models that detect open-pit mining scars in Sentinel-2 imagery across the Amazon basin. Detections are released as periodic map layers rather than a live browser feed, so this console links to the authoritative Amazon Mining Watch viewer.",
        stats: [
          { label: "Method", value: "ML · Sentinel-2" },
          { label: "Coverage", value: "Amazon basin" },
          { label: "Cadence", value: "Quarterly" },
        ],
      },
    },

    "drug-trafficking": {
      source: "UNODC · data.UNODC",
      sourceUrl: "https://dataunodc.un.org/",
      feedNote: "Drug seizures, prices & trafficking flows",
      reference: {
        statusText: "Reference layer",
        blurb: "Drug trafficking is documented by the UN Office on Drugs and Crime through the World Drug Report and the data.UNODC portal — global seizures, prices, cultivation and trafficking-route indicators compiled from member-state reporting. These are statistical datasets published on an annual cycle rather than a live feed, so this console links to the official UNODC data portal.",
        stats: [
          { label: "Dataset", value: "Global" },
          { label: "Indicators", value: "Seizures · routes" },
          { label: "Cadence", value: "Annual" },
        ],
      },
    },

    "human-trafficking": {
      source: "Counter Trafficking Data Collaborative (CTDC)",
      sourceUrl: "https://www.ctdatacollaborative.org/",
      feedNote: "World's largest harmonised data hub on human trafficking",
      reference: {
        statusText: "Reference layer",
        blurb: "Human trafficking is tracked by the Counter Trafficking Data Collaborative — the first global data hub on the issue, harmonising case records from IOM, Polaris and partner organisations into a single anonymised dataset. The data is released as curated, privacy-protected datasets rather than a live browser feed, so this console links to the official CTDC portal.",
        stats: [
          { label: "Records", value: "200k+ victims" },
          { label: "Sources", value: "Multi-agency" },
          { label: "Cadence", value: "Ongoing" },
        ],
      },
    },

    tourism: {
      source: "UN Tourism (UNWTO) Data Dashboard",
      sourceUrl: "https://www.unwto.org/tourism-data/un-tourism-tourism-dashboard",
      feedNote: "International tourist arrivals, receipts & confidence",
      reference: {
        statusText: "Reference layer",
        blurb: "Tourism flows are measured by UN Tourism (UNWTO) — international tourist arrivals, receipts, expenditure and the Tourism Confidence Index, compiled from national statistics offices worldwide. The dashboard publishes monthly and annual indicators rather than a live browser feed, so this console links to the official UN Tourism data dashboard.",
        stats: [
          { label: "Metric", value: "Arrivals" },
          { label: "Coverage", value: "Global" },
          { label: "Cadence", value: "Monthly" },
        ],
      },
    },
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const domain = window.STEWARD_DOMAIN;
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
