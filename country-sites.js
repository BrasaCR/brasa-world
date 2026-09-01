(function () {
  const countrySites = {
    "saint-kitts-and-nevis": {
      name: "Saint Kitts and Nevis",
      href: "government/saint-kitts-and-nevis/"
    },
    "dominica": {
      name: "Dominica",
      href: "government/dominica/"
    },
    "antigua-and-barbuda": {
      name: "Antigua and Barbuda",
      href: "government/antigua-and-barbuda/"
    },
    "saint-vincent-and-the-grenadines": {
      name: "Saint Vincent and the Grenadines",
      href: "government/saint-vincent-and-the-grenadines/"
    },
    "grenada": {
      name: "Grenada",
      href: "government/grenada/"
    },
    "saint-lucia": {
      name: "Saint Lucia",
      href: "government/saint-lucia/"
    },
    "barbados": {
      name: "Barbados",
      href: "government/barbados/"
    },
    "bahamas": {
      name: "The Bahamas",
      href: "government/bahamas/"
    },
    "trinidad-and-tobago": {
      name: "Trinidad and Tobago",
      href: "government/trinidad-and-tobago/"
    },
    "jamaica": {
      name: "Jamaica",
      href: "government/jamaica/"
    },
    "united-states": {
      name: "United States",
      href: "government/united-states/"
    },
    "canada": {
      name: "Canada",
      href: "government/canada/"
    },
    "belize": {
      name: "Belize",
      href: "government/belize/"
    },
    "suriname": {
      name: "Suriname",
      href: "government/suriname/"
    },
    "guyana": {
      name: "Guyana",
      href: "government/guyana/"
    },
    "uruguay": {
      name: "Uruguay",
      href: "government/uruguay/"
    },
    "paraguay": {
      name: "Paraguay",
      href: "government/paraguay/"
    },
    "brazil": {
      name: "Brazil",
      href: "government/brazil/"
    },
    "argentina": {
      name: "Argentina",
      href: "government/argentina/"
    },
    "chile": {
      name: "Chile",
      href: "government/chile/"
    },
    "bolivia": {
      name: "Bolivia",
      href: "government/bolivia/"
    },
    "peru": {
      name: "Peru",
      href: "government/peru/"
    },
    "ecuador": {
      name: "Ecuador",
      href: "government/ecuador/"
    },
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
