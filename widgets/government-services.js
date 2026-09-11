class BrasaGovernmentServices extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>:host{display:block;color:#1b1a17;font:400 1rem/1.5 system-ui,sans-serif}.card{border:1px solid #e5dfd0;border-radius:.6rem;background:#fbf9f4;padding:1rem}.brand{color:#0d6e5c;font-size:.75rem;letter-spacing:.12em;text-transform:uppercase}h2{font:600 1.35rem/1.2 Georgia,serif;margin:.35rem 0 .5rem}.note{color:#6b6862;font-size:.875rem;margin:0 0 1rem}ul{list-style:none;padding:0;margin:0;display:grid;gap:.75rem}li{border-top:1px solid #e5dfd0;padding-top:.75rem}a{color:#8c3a1f;font-weight:600}.category{display:block;color:#6b6862;font-size:.875rem}a:focus-visible{outline:3px solid #8c3a1f;outline-offset:3px}</style><section class="card" aria-labelledby="civic-title"><div class="brand">Powered by BRASA Government</div><h2 id="civic-title">Find civic services</h2><p class="note">Informational links—confirm requirements with the service provider.</p><div id="status" role="status">Loading services…</div><ul id="list"></ul></section>`;
    this.load();
  }
  async load() {
    const status = this.shadowRoot.getElementById('status'), list = this.shadowRoot.getElementById('list');
    const query = this.getAttribute('query') || '', category = this.getAttribute('category') || '', countryCode = this.getAttribute('country-code') || 'CR';
    const endpoint = this.getAttribute('api-origin') || 'https://api.brasa.world';
    try {
      const url = new URL('/v1/government/services', endpoint);
      if (query) url.searchParams.set('q', query); if (category) url.searchParams.set('page', category); url.searchParams.set('countryCode', countryCode);
      const response = await fetch(url, { headers: { accept: 'application/json' }, credentials: 'omit' });
      if (!response.ok) throw new Error('request_failed');
      const payload = await response.json(), services = Array.isArray(payload.data) ? payload.data : [];
      list.replaceChildren(...services.map((service) => {
        const item = document.createElement('li'), link = document.createElement('a'), group = document.createElement('span');
        const destination = new URL(String(service.sourceUrl || ''), 'https://brasagovernment.net');
        link.href = ['https:', 'http:'].includes(destination.protocol) ? destination.href : 'https://brasagovernment.net/';
        link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = String(service.label || 'Civic service');
        group.className = 'category'; group.textContent = String(service.category || ''); item.append(link, group); return item;
      }));
      status.textContent = services.length ? `${services.length} informational service link${services.length === 1 ? '' : 's'} found.` : 'No matching services found.';
    } catch { status.textContent = 'Civic services are temporarily unavailable.'; }
  }
}
if (!customElements.get('brasa-government-services')) customElements.define('brasa-government-services', BrasaGovernmentServices);
