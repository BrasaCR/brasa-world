const ORIGIN = 'https://brasa.world';
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
const escapeXml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export function sitemapGroup(record) {
  if (record.kind === 'country') return 'countries';
  if (record.pillar === 'human-capability') return 'human-capability';
  if (record.pillar === 'brasa-open') return 'open-ledger';
  return 'world';
}

export function buildSitemaps(catalog) {
  const groups = new Map();
  for (const record of catalog.records) {
    const group = sitemapGroup(record);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(record);
  }
  const documents = {};
  for (const [group, records] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const urls = records.map((record) => `  <url><loc>${escapeXml(new URL(record.url, ORIGIN))}</loc></url>`).join('\n');
    documents[`sitemaps/${group}.xml`] = `${XML_HEADER}\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  }
  const entries = Object.keys(documents).sort().map((name) => `  <sitemap><loc>${ORIGIN}/${escapeXml(name)}</loc></sitemap>`).join('\n');
  return { index: `${XML_HEADER}\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`, documents };
}

export function buildSeoMetadata(catalog) {
  return catalog.records.map((record) => ({
    id: record.id,
    canonical: new URL(record.url, ORIGIN).href,
    title: record.title,
    description: record.description || null,
    locale: record.locale,
    robots: 'index,follow',
    openGraph: { type: 'website', siteName: 'BRASA World', title: record.title, description: record.description || null, url: new URL(record.url, ORIGIN).href },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': record.kind === 'homepage' ? 'WebSite' : 'WebPage',
      '@id': `${new URL(record.url, ORIGIN).href}#webpage`,
      url: new URL(record.url, ORIGIN).href,
      name: record.title,
      ...(record.description ? { description: record.description } : {}),
      inLanguage: record.locale,
      isPartOf: { '@id': `${ORIGIN}/#website` }
    }
  }));
}

export function buildEditorialQueue(catalog) {
  return catalog.records.filter((record) => !record.description).map((record) => ({
    id: record.id,
    path: record.source.path,
    canonical: new URL(record.url, ORIGIN).href,
    issue: 'missing-meta-description',
    status: 'needs-editorial-review',
    sourceSha256: record.source.sha256
  }));
}
