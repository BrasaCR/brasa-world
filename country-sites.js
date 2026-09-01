(function () {
  const countrySites = {
    "venezuela": {
      name: "Venezuela",
      href: "government/venezuela/"
    },
    "colombia": {
      name: "Colombia",
      href: "government/colombia/"
    },
    "costa-rica": {
      name: "Costa Rica",
      href: "government/costa-rica/"
    },
    "cuba": {
      name: "Cuba",
      href: "government/cuba/"
    },
    "dominican-republic": {
      name: "Dominican Republic",
      href: "government/dominican-republic/"
    },
    "haiti": {
      name: "Haiti",
      href: "government/haiti/"
    },
    "el-salvador": {
      name: "El Salvador",
      href: "government/el-salvador/"
    },
    "guatemala": {
      name: "Guatemala",
      href: "government/guatemala/"
    },
    "honduras": {
      name: "Honduras",
      href: "government/honduras/"
    },
    "mexico": {
      name: "Mexico",
      href: "government/mexico/"
    },
    "nicaragua": {
      name: "Nicaragua",
      href: "government/nicaragua/"
    },
    "panama": {
      name: "Panama",
      href: "government/panama/"
    }
  };

  document.querySelectorAll("a.right-tile-primary").forEach((link) => {
    const match = link.getAttribute("href").match(/^ledger-(.+)\.html$/);
    const slug = link.dataset.country || (match && match[1]);
    if (!slug || !countrySites[slug]) return;

    const country = countrySites[slug];
    link.href = country.href;
    link.classList.add("country-site-live");
    link.setAttribute("aria-label", `${country.name} government site`);

    const badge = document.createElement("span");
    badge.className = "country-site-badge";
    badge.textContent = "Government site";
    link.appendChild(badge);
  });

  const style = document.createElement("style");
  style.textContent = `
    .country-site-badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      z-index: 4;
      padding: .38rem .58rem;
      border: 1px solid rgba(245,240,229,.5);
      background: rgba(27,26,23,.72);
      color: #F5F0E5;
      font: 600 .62rem/1 Geist, "Helvetica Neue", system-ui, sans-serif;
      letter-spacing: .1em;
      text-transform: uppercase;
      backdrop-filter: blur(8px);
    }
    .country-site-live:focus-visible .country-site-badge,
    .country-site-live:hover .country-site-badge { background: #8C3A1F; }
  `;
  document.head.appendChild(style);
})();
