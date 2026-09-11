class BrasaBusinessPathways extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>:host{display:block;color:#1b1a17;font:400 1rem/1.5 system-ui,sans-serif}.card{border:1px solid #e5dfd0;border-radius:.6rem;background:#fbf9f4;padding:1rem}.brand{color:#0d6e5c;font-size:.75rem;letter-spacing:.12em;text-transform:uppercase}h2{font:600 1.35rem/1.2 Georgia,serif;margin:.35rem 0 1rem}ul{list-style:none;padding:0;margin:0;display:grid;gap:.75rem}li{border-top:1px solid #e5dfd0;padding-top:.75rem}a{color:#8c3a1f;font-weight:600}a:focus-visible{outline:3px solid #8c3a1f;outline-offset:3px}</style><section class="card" aria-labelledby="business-title"><div class="brand">Powered by BRASA Business</div><h2 id="business-title">Explore business pathways</h2><div id="status" role="status">Loading pathways…</div><ul id="list"></ul></section>`;
    this.load();
  }
  async load() {
    const status = this.shadowRoot.getElementById('status'), list = this.shadowRoot.getElementById('list');
    const capability = this.getAttribute('capability') || '', countryCode = this.getAttribute('country-code') || '';
    const endpoint = this.getAttribute('api-origin') || 'https://api.brasa.world';
    try {
      const url = new URL('/v1/business/pathways', endpoint);
      if (capability) url.searchParams.set('capability', capability); if (countryCode) url.searchParams.set('countryCode', countryCode);
      const response = await fetch(url, { headers: { accept: 'application/json' }, credentials: 'omit' });
      if (!response.ok) throw new Error('request_failed');
      const payload = await response.json(), pathways = Array.isArray(payload.data) ? payload.data : [];
      list.replaceChildren(...pathways.map((pathway) => {
        const item = document.createElement('li'), link = document.createElement('a');
        link.textContent = String(pathway.title || 'Business pathway');
        const destination = new URL(String(pathway.url || '/'), 'https://brasa.business'); link.href = destination.protocol === 'https:' ? destination.href : 'https://brasa.business/';
        item.append(link); return item;
      }));
      status.textContent = pathways.length ? `${pathways.length} public pathway${pathways.length === 1 ? '' : 's'} available.` : 'No matching public pathways yet.';
    } catch { status.textContent = 'Business pathways are temporarily unavailable.'; }
  }
}
if (!customElements.get('brasa-business-pathways')) customElements.define('brasa-business-pathways', BrasaBusinessPathways);
