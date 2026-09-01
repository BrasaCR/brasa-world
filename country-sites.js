(function () {
  const countrySites = {
    "zimbabwe": {
      name: "Zimbabwe",
      href: "government/zimbabwe/"
    },
    "zambia": {
      name: "Zambia",
      href: "government/zambia/"
    },
    "uganda": {
      name: "Uganda",
      href: "government/uganda/"
    },
    "tunisia": {
      name: "Tunisia",
      href: "government/tunisia/"
    },
    "togo": {
      name: "Togo",
      href: "government/togo/"
    },
    "tanzania": {
      name: "Tanzania",
      href: "government/tanzania/"
    },
    "sudan": {
      name: "Sudan",
      href: "government/sudan/"
    },
    "south-sudan": {
      name: "South Sudan",
      href: "government/south-sudan/"
    },
    "south-africa": {
      name: "South Africa",
      href: "government/south-africa/"
    },
    "somalia": {
      name: "Somalia",
      href: "government/somalia/"
    },
    "sierra-leone": {
      name: "Sierra Leone",
      href: "government/sierra-leone/"
    },
    "seychelles": {
      name: "Seychelles",
      href: "government/seychelles/"
    },
    "senegal": {
      name: "Senegal",
      href: "government/senegal/"
    },
    "sao-tome-and-principe": {
      name: "São Tomé and Príncipe",
      href: "government/sao-tome-and-principe/"
    },
    "rwanda": {
      name: "Rwanda",
      href: "government/rwanda/"
    },
    "nigeria": {
      name: "Nigeria",
      href: "government/nigeria/"
    },
    "niger": {
      name: "Niger",
      href: "government/niger/"
    },
    "namibia": {
      name: "Namibia",
      href: "government/namibia/"
    },
    "mozambique": {
      name: "Mozambique",
      href: "government/mozambique/"
    },
    "morocco": {
      name: "Morocco",
      href: "government/morocco/"
    },
    "mauritius": {
      name: "Mauritius",
      href: "government/mauritius/"
    },
    "mauritania": {
      name: "Mauritania",
      href: "government/mauritania/"
    },
    "mali": {
      name: "Mali",
      href: "government/mali/"
    },
    "malawi": {
      name: "Malawi",
      href: "government/malawi/"
    },
    "madagascar": {
      name: "Madagascar",
      href: "government/madagascar/"
    },
    "libya": {
      name: "Libya",
      href: "government/libya/"
    },
    "liberia": {
      name: "Liberia",
      href: "government/liberia/"
    },
    "lesotho": {
      name: "Lesotho",
      href: "government/lesotho/"
    },
    "kenya": {
      name: "Kenya",
      href: "government/kenya/"
    },
    "guinea": {
      name: "Guinea",
      href: "government/guinea/"
    },
    "guinea-bissau": {
      name: "Guinea-Bissau",
      href: "government/guinea-bissau/"
    },
    "ghana": {
      name: "Ghana",
      href: "government/ghana/"
    },
    "gambia": {
      name: "Gambia",
      href: "government/gambia/"
    },
    "gabon": {
      name: "Gabon",
      href: "government/gabon/"
    },
    "ethiopia": {
      name: "Ethiopia",
      href: "government/ethiopia/"
    },
    "eswatini": {
      name: "Eswatini",
      href: "government/eswatini/"
    },
    "eritrea": {
      name: "Eritrea",
      href: "government/eritrea/"
    },
    "equatorial-guinea": {
      name: "Equatorial Guinea",
      href: "government/equatorial-guinea/"
    },
    "egypt": {
      name: "Egypt",
      href: "government/egypt/"
    },
    "dr-congo": {
      name: "Democratic Republic of the Congo",
      href: "government/dr-congo/"
    },
    "djibouti": {
      name: "Djibouti",
      href: "government/djibouti/"
    },
    "cote-divoire": {
      name: "Côte d’Ivoire",
      href: "government/cote-divoire/"
    },
    "congo": {
      name: "Republic of the Congo",
      href: "government/congo/"
    },
    "comoros": {
      name: "Comoros",
      href: "government/comoros/"
    },
    "chad": {
      name: "Chad",
      href: "government/chad/"
    },
    "central-african-republic": {
      name: "Central African Republic",
      href: "government/central-african-republic/"
    },
    "cameroon": {
      name: "Cameroon",
      href: "government/cameroon/"
    },
    "cabo-verde": {
      name: "Cabo Verde",
      href: "government/cabo-verde/"
    },
    "burundi": {
      name: "Burundi",
      href: "government/burundi/"
    },
    "burkina-faso": {
      name: "Burkina Faso",
      href: "government/burkina-faso/"
    },
    "botswana": {
      name: "Botswana",
      href: "government/botswana/"
    },
    "benin": {
      name: "Benin",
      href: "government/benin/"
    },
    "angola": {
      name: "Angola",
      href: "government/angola/"
    },
    "algeria": {
      name: "Algeria",
      href: "government/algeria/"
    },
    "yemen": {
      name: "Yemen",
      href: "government/yemen/"
    },
    "united-arab-emirates": {
      name: "United Arab Emirates",
      href: "government/united-arab-emirates/"
    },
    "syria": {
      name: "Syria",
      href: "government/syria/"
    },
    "saudi-arabia": {
      name: "Saudi Arabia",
      href: "government/saudi-arabia/"
    },
    "qatar": {
      name: "Qatar",
      href: "government/qatar/"
    },
    "palestine": {
      name: "Palestine",
      href: "government/palestine/"
    },
    "oman": {
      name: "Oman",
      href: "government/oman/"
    },
    "lebanon": {
      name: "Lebanon",
      href: "government/lebanon/"
    },
    "kuwait": {
      name: "Kuwait",
      href: "government/kuwait/"
    },
    "jordan": {
      name: "Jordan",
      href: "government/jordan/"
    },
    "israel": {
      name: "Israel",
      href: "government/israel/"
    },
    "iraq": {
      name: "Iraq",
      href: "government/iraq/"
    },
    "iran": {
      name: "Iran",
      href: "government/iran/"
    },
    "bahrain": {
      name: "Bahrain",
      href: "government/bahrain/"
    },
    "vietnam": {
      name: "Vietnam",
      href: "government/vietnam/"
    },
    "uzbekistan": {
      name: "Uzbekistan",
      href: "government/uzbekistan/"
    },
    "turkmenistan": {
      name: "Turkmenistan",
      href: "government/turkmenistan/"
    },
    "timor-leste": {
      name: "Timor-Leste",
      href: "government/timor-leste/"
    },
    "thailand": {
      name: "Thailand",
      href: "government/thailand/"
    },
    "tajikistan": {
      name: "Tajikistan",
      href: "government/tajikistan/"
    },
    "taiwan": {
      name: "Taiwan",
      href: "government/taiwan/"
    },
    "sri-lanka": {
      name: "Sri Lanka",
      href: "government/sri-lanka/"
    },
    "south-korea": {
      name: "South Korea",
      href: "government/south-korea/"
    },
    "singapore": {
      name: "Singapore",
      href: "government/singapore/"
    },
    "philippines": {
      name: "Philippines",
      href: "government/philippines/"
    },
    "pakistan": {
      name: "Pakistan",
      href: "government/pakistan/"
    },
    "north-korea": {
      name: "North Korea",
      href: "government/north-korea/"
    },
    "nepal": {
      name: "Nepal",
      href: "government/nepal/"
    },
    "myanmar": {
      name: "Myanmar",
      href: "government/myanmar/"
    },
    "mongolia": {
      name: "Mongolia",
      href: "government/mongolia/"
    },
    "maldives": {
      name: "Maldives",
      href: "government/maldives/"
    },
    "malaysia": {
      name: "Malaysia",
      href: "government/malaysia/"
    },
    "macau": {
      name: "Macau",
      href: "government/macau/"
    },
    "laos": {
      name: "Laos",
      href: "government/laos/"
    },
    "kyrgyzstan": {
      name: "Kyrgyzstan",
      href: "government/kyrgyzstan/"
    },
    "kazakhstan": {
      name: "Kazakhstan",
      href: "government/kazakhstan/"
    },
    "japan": {
      name: "Japan",
      href: "government/japan/"
    },
    "indonesia": {
      name: "Indonesia",
      href: "government/indonesia/"
    },
    "india": {
      name: "India",
      href: "government/india/"
    },
    "hong-kong": {
      name: "Hong Kong",
      href: "government/hong-kong/"
    },
    "china": {
      name: "China",
      href: "government/china/"
    },
    "cambodia": {
      name: "Cambodia",
      href: "government/cambodia/"
    },
    "brunei": {
      name: "Brunei",
      href: "government/brunei/"
    },
    "bhutan": {
      name: "Bhutan",
      href: "government/bhutan/"
    },
    "bangladesh": {
      name: "Bangladesh",
      href: "government/bangladesh/"
    },
    "afghanistan": {
      name: "Afghanistan",
      href: "government/afghanistan/"
    },
    "united-kingdom": {
      name: "United Kingdom",
      href: "government/united-kingdom/"
    },
    "ukraine": {
      name: "Ukraine",
      href: "government/ukraine/"
    },
    "turkey": {
      name: "Türkiye",
      href: "government/turkey/"
    },
    "switzerland": {
      name: "Switzerland",
      href: "government/switzerland/"
    },
    "sweden": {
      name: "Sweden",
      href: "government/sweden/"
    },
    "spain": {
      name: "Spain",
      href: "government/spain/"
    },
    "slovenia": {
      name: "Slovenia",
      href: "government/slovenia/"
    },
    "slovakia": {
      name: "Slovakia",
      href: "government/slovakia/"
    },
    "serbia": {
      name: "Serbia",
      href: "government/serbia/"
    },
    "san-marino": {
      name: "San Marino",
      href: "government/san-marino/"
    },
    "russia": {
      name: "Russia",
      href: "government/russia/"
    },
    "romania": {
      name: "Romania",
      href: "government/romania/"
    },
    "portugal": {
      name: "Portugal",
      href: "government/portugal/"
    },
    "poland": {
      name: "Poland",
      href: "government/poland/"
    },
    "norway": {
      name: "Norway",
      href: "government/norway/"
    },
    "north-macedonia": {
      name: "North Macedonia",
      href: "government/north-macedonia/"
    },
    "netherlands": {
      name: "Netherlands",
      href: "government/netherlands/"
    },
    "montenegro": {
      name: "Montenegro",
      href: "government/montenegro/"
    },
    "monaco": {
      name: "Monaco",
      href: "government/monaco/"
    },
    "moldova": {
      name: "Moldova",
      href: "government/moldova/"
    },
    "malta": {
      name: "Malta",
      href: "government/malta/"
    },
    "luxembourg": {
      name: "Luxembourg",
      href: "government/luxembourg/"
    },
    "lithuania": {
      name: "Lithuania",
      href: "government/lithuania/"
    },
    "liechtenstein": {
      name: "Liechtenstein",
      href: "government/liechtenstein/"
    },
    "latvia": {
      name: "Latvia",
      href: "government/latvia/"
    },
    "kosovo": {
      name: "Kosovo",
      href: "government/kosovo/"
    },
    "italy": {
      name: "Italy",
      href: "government/italy/"
    },
    "ireland": {
      name: "Ireland",
      href: "government/ireland/"
    },
    "iceland": {
      name: "Iceland",
      href: "government/iceland/"
    },
    "hungary": {
      name: "Hungary",
      href: "government/hungary/"
    },
    "greece": {
      name: "Greece",
      href: "government/greece/"
    },
    "germany": {
      name: "Germany",
      href: "government/germany/"
    },
    "georgia": {
      name: "Georgia",
      href: "government/georgia/"
    },
    "france": {
      name: "France",
      href: "government/france/"
    },
    "finland": {
      name: "Finland",
      href: "government/finland/"
    },
    "estonia": {
      name: "Estonia",
      href: "government/estonia/"
    },
    "denmark": {
      name: "Denmark",
      href: "government/denmark/"
    },
    "czechia": {
      name: "Czechia",
      href: "government/czechia/"
    },
    "cyprus": {
      name: "Cyprus",
      href: "government/cyprus/"
    },
    "croatia": {
      name: "Croatia",
      href: "government/croatia/"
    },
    "bulgaria": {
      name: "Bulgaria",
      href: "government/bulgaria/"
    },
    "bosnia-and-herzegovina": {
      name: "Bosnia and Herzegovina",
      href: "government/bosnia-and-herzegovina/"
    },
    "belgium": {
      name: "Belgium",
      href: "government/belgium/"
    },
    "belarus": {
      name: "Belarus",
      href: "government/belarus/"
    },
    "azerbaijan": {
      name: "Azerbaijan",
      href: "government/azerbaijan/"
    },
    "austria": {
      name: "Austria",
      href: "government/austria/"
    },
    "armenia": {
      name: "Armenia",
      href: "government/armenia/"
    },
    "andorra": {
      name: "Andorra",
      href: "government/andorra/"
    },
    "albania": {
      name: "Albania",
      href: "government/albania/"
    },
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
