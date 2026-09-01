/* ──────────────────────────────────────────────────────────────────────────
   BRASA CR · Planetary Monitoring Platform
   Hazard console engine — live, client-side, real data only.
   Each page sets  window.HAZARD_DOMAIN  before loading this file.
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

  // ── Per-domain configuration ───────────────────────────────────────────────
  const CONFIG = {
    earthquake: {
      source: "USGS Earthquake Hazards Program",
      sourceUrl: "https://earthquake.usgs.gov/",
      feedNote: "USGS real-time GeoJSON · M2.5+ past 24h · refreshes every 60s",
      url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
      parse: (j) => {
        const f = (j.features || []).filter((x) => x.properties && x.properties.mag != null);
        f.sort((a, b) => b.properties.time - a.properties.time);
        const mags = f.map((x) => x.properties.mag);
        const max = mags.length ? Math.max(...mags) : 0;
        const sevOf = (m) => (m >= 6 ? "critical" : m >= 5 ? "high" : m >= 4 ? "moderate" : "low");
        return {
          status: f.length ? sevOf(max) : "calm",
          statusText: f.length ? "Live feed · strongest M" + max.toFixed(1) : "No qualifying events",
          stats: [
            { label: "Events · 24h", value: num(f.length) },
            { label: "Strongest", value: "M" + max.toFixed(1) },
            { label: "M4.5+", value: num(mags.filter((m) => m >= 4.5).length) },
          ],
          items: f.slice(0, 24).map((x) => ({
            time: x.properties.time,
            value: "M" + x.properties.mag.toFixed(1),
            title: x.properties.place || "Unknown location",
            meta: (x.geometry && x.geometry.coordinates) ? "depth " + Math.round(x.geometry.coordinates[2]) + " km" : "",
            severity: sevOf(x.properties.mag),
            href: x.properties.url,
          })),
        };
      },
    },

    tsunami: {
      source: "NOAA · U.S. National Weather Service",
      sourceUrl: "https://www.tsunami.gov/",
      feedNote: "NWS active alerts API · global watches/advisories/warnings · refreshes every 60s",
      url: "https://api.weather.gov/alerts/active?event=Tsunami%20Warning,Tsunami%20Advisory,Tsunami%20Watch,Tsunami%20Information%20Statement",
      parse: (j) => {
        const f = j.features || [];
        const sevOf = (e) => /warning/i.test(e) ? "critical" : /advisory/i.test(e) ? "high" : /watch/i.test(e) ? "moderate" : "info";
        return {
          status: f.length ? "high" : "calm",
          statusText: f.length ? f.length + " active alert" + (f.length > 1 ? "s" : "") : "No active alerts — all clear",
          stats: [
            { label: "Active alerts", value: num(f.length) },
            { label: "Warnings", value: num(f.filter((x) => /warning/i.test(x.properties.event)).length) },
            { label: "Advisories", value: num(f.filter((x) => /advisory/i.test(x.properties.event)).length) },
          ],
          items: f.slice(0, 24).map((x) => ({
            time: new Date(x.properties.sent || x.properties.effective).getTime(),
            value: x.properties.event.replace(/Tsunami\s*/i, ""),
            title: x.properties.areaDesc || x.properties.headline || "—",
            meta: x.properties.senderName || "",
            severity: sevOf(x.properties.event),
            href: x.properties.uri || x.properties["@id"],
          })),
          emptyText: "No tsunami warnings, advisories, or watches are active anywhere in the NWS network right now.",
        };
      },
    },

    solar: {
      source: "NOAA Space Weather Prediction Center",
      sourceUrl: "https://www.swpc.noaa.gov/",
      feedNote: "NOAA SWPC product feed · official space-weather alerts · refreshes every 60s",
      url: "https://services.swpc.noaa.gov/products/alerts.json",
      parse: (j) => {
        // j is an array of {product_id, issue_datetime, message}
        const rows = (Array.isArray(j) ? j : []).slice().reverse();
        const recent = rows.slice(0, 24).map((r) => {
          const msg = r.message || "";
          const first = (msg.split("\n").find((l) => /^(WARNING|ALERT|WATCH|SUMMARY|EXTENDED)/i.test(l.trim())) || msg.split("\n")[0] || "").trim();
          const sev = /warning|alert/i.test(first) ? "high" : /watch/i.test(first) ? "moderate" : "info";
          const kp = (msg.match(/K-index of (\d+)/i) || [])[1];
          return {
            time: new Date((r.issue_datetime || "").replace(" ", "T") + "Z").getTime(),
            value: kp ? "Kp " + kp : (r.product_id || "SWPC"),
            title: first || "Space weather product",
            meta: r.product_id || "",
            severity: sev,
          };
        });
        const alerts = recent.filter((x) => x.severity !== "info").length;
        return {
          status: alerts ? "high" : "low",
          statusText: alerts ? alerts + " active alert" + (alerts > 1 ? "s" : "") : "Nominal conditions",
          stats: [
            { label: "Products · recent", value: num(recent.length) },
            { label: "Active alerts", value: num(alerts) },
            { label: "Latest", value: recent[0] ? recent[0].value : "—" },
          ],
          items: recent,
        };
      },
    },

    asteroids: {
      source: "NASA CNEOS · Near-Earth Object Web Service",
      sourceUrl: "https://cneos.jpl.nasa.gov/",
      feedNote: "NASA NeoWs · today's close approaches · refreshes every 5 min",
      refresh: 300000,
      url: (() => {
        const t = new Date().toISOString().slice(0, 10);
        return "https://api.nasa.gov/neo/rest/v1/feed?start_date=" + t + "&end_date=" + t + "&api_key=DEMO_KEY";
      })(),
      parse: (j) => {
        const byDate = j.near_earth_objects || {};
        const all = [].concat(...Object.values(byDate));
        all.sort((a, b) => {
          const da = a.close_approach_data[0] ? +a.close_approach_data[0].epoch_date_close_approach : 0;
          const db = b.close_approach_data[0] ? +b.close_approach_data[0].epoch_date_close_approach : 0;
          return da - db;
        });
        const haz = all.filter((x) => x.is_potentially_hazardous_asteroid).length;
        return {
          status: haz ? "moderate" : "low",
          statusText: haz ? haz + " flagged potentially hazardous" : "None flagged hazardous today",
          stats: [
            { label: "Close approaches · today", value: num(all.length) },
            { label: "Flagged hazardous", value: num(haz) },
            { label: "Closest", value: all[0] && all[0].close_approach_data[0] ? num(all[0].close_approach_data[0].miss_distance.lunar, 1) + " LD" : "—" },
          ],
          items: all.slice(0, 24).map((x) => {
            const ca = x.close_approach_data[0] || {};
            const dia = x.estimated_diameter.meters;
            return {
              time: ca.epoch_date_close_approach ? +ca.epoch_date_close_approach : null,
              value: ca.miss_distance ? num(ca.miss_distance.lunar, 1) + " LD" : "—",
              title: x.name.replace(/[()]/g, ""),
              meta: "Ø " + num(dia.estimated_diameter_min) + "–" + num(dia.estimated_diameter_max) + " m · " +
                (ca.relative_velocity ? num(ca.relative_velocity.kilometers_per_second, 1) + " km/s" : ""),
              severity: x.is_potentially_hazardous_asteroid ? "moderate" : "low",
              href: x.nasa_jpl_url,
            };
          }),
        };
      },
    },

    multi: {
      source: "GDACS · Global Disaster Alert & Coordination System",
      sourceUrl: "https://www.gdacs.org/",
      feedNote: "GDACS event list · multi-hazard · refreshes every 60s",
      url: "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP",
      parse: (j) => {
        const f = (j.features || []);
        const lvl = (a) => /red/i.test(a) ? "critical" : /orange/i.test(a) ? "high" : /green/i.test(a) ? "low" : "info";
        f.sort((a, b) => new Date(b.properties.fromdate) - new Date(a.properties.fromdate));
        return {
          status: f.length ? "high" : "calm",
          statusText: f.length ? f.length + " active events" : "No active events",
          stats: [
            { label: "Active events", value: num(f.length) },
            { label: "Red alerts", value: num(f.filter((x) => /red/i.test(x.properties.alertlevel)).length) },
            { label: "Orange alerts", value: num(f.filter((x) => /orange/i.test(x.properties.alertlevel)).length) },
          ],
          items: f.slice(0, 24).map((x) => ({
            time: new Date(x.properties.fromdate).getTime(),
            value: (x.properties.eventtype || "").toUpperCase(),
            title: x.properties.name || x.properties.htmldescription || x.properties.country || "Event",
            meta: x.properties.alertlevel ? x.properties.alertlevel + " alert" : "",
            severity: lvl(x.properties.alertlevel),
            href: x.properties.url && x.properties.url.report ? x.properties.url.report : undefined,
          })),
        };
      },
    },

    volcano: {
      source: "USGS Volcano Hazards · HANS",
      sourceUrl: "https://volcano.si.edu/",
      feedNote: "USGS HANS public API · elevated U.S. alert levels · refreshes every 5 min",
      refresh: 300000,
      url: "https://volcanoes.usgs.gov/hans-public/api/volcano/getElevatedVolcanoes",
      parse: (j) => {
        const rows = Array.isArray(j) ? j : (j.data || []);
        const sevOf = (a) => /warning/i.test(a) ? "critical" : /watch/i.test(a) ? "high" : /advisory/i.test(a) ? "moderate" : "low";
        return {
          status: rows.length ? "moderate" : "low",
          statusText: rows.length ? rows.length + " at elevated level" : "All monitored volcanoes nominal",
          stats: [
            { label: "Elevated", value: num(rows.length) },
            { label: "Warnings", value: num(rows.filter((x) => /warning/i.test(x.alert_level || "")).length) },
            { label: "Watches", value: num(rows.filter((x) => /watch/i.test(x.alert_level || "")).length) },
          ],
          items: rows.slice(0, 24).map((x) => ({
            time: x.sent ? new Date(x.sent).getTime() : null,
            value: (x.alert_level || x.color_code || "—"),
            title: x.volcano_name || x.name || "Volcano",
            meta: [x.color_code, x.obs_abbr].filter(Boolean).join(" · "),
            severity: sevOf(x.alert_level || ""),
          })),
          emptyText: "No U.S. volcanoes are currently above the Normal / Green alert level on the USGS network.",
        };
      },
    },

    landslide: {
      source: "NASA · Global Landslide Catalog (COOLR)",
      sourceUrl: "https://landslides.nasa.gov/viewer/",
      feedNote: "Rainfall-triggered landslide nowcast",
      url: null, // no public CORS feed — reference console
      reference: {
        statusText: "Reference layer",
        blurb: "Global landslide reporting is compiled from the NASA Global Landslide Catalog and the LHASA rainfall-nowcast model. These products are published as map services without a public browser feed, so this console links straight to the live NASA viewer for real-time inspection.",
        stats: [
          { label: "Model", value: "LHASA-2" },
          { label: "Resolution", value: "1 km" },
          { label: "Cadence", value: "30 min" },
        ],
      },
    },

    deformation: {
      source: "Copernicus · European Ground Motion Service",
      sourceUrl: "https://egms.land.copernicus.eu/",
      feedNote: "Sentinel-1 InSAR ground-motion",
      url: null,
      reference: {
        statusText: "Reference layer",
        blurb: "Ground deformation is measured by Sentinel-1 InSAR and published through the Copernicus European Ground Motion Service as millimetre-precision velocity maps. This is a slow-cadence product updated per satellite revisit rather than a live stream, so this console links to the official EGMS viewer for inspection.",
        stats: [
          { label: "Sensor", value: "Sentinel-1" },
          { label: "Precision", value: "±1 mm/yr" },
          { label: "Revisit", value: "6–12 d" },
        ],
      },
    },
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const domain = window.HAZARD_DOMAIN;
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
