class BrasaBusinessExperience extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return; const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>:host{display:block;color:#1b1a17;font:400 1rem/1.5 system-ui,sans-serif}.card{border:1px solid #e5dfd0;border-radius:.6rem;background:#fbf9f4;padding:1rem}.brand{color:#8c3a1f;font-size:.75rem;letter-spacing:.12em;text-transform:uppercase}h2{font:600 1.35rem/1.2 Georgia,serif;margin:.35rem 0}ol{padding-left:1.4rem}li{padding:.35rem 0}h3{display:inline;font-size:1rem}p{margin:.2rem 0;color:#595650}.notice{font-size:.85rem;border-top:1px solid #e5dfd0;padding-top:.75rem}a{color:#8c3a1f}a:focus-visible{outline:3px solid #8c3a1f;outline-offset:3px}</style><section class="card" aria-labelledby="title"><div class="brand">Powered by BRASA</div><h2 id="title">Business pathway</h2><div id="status" role="status">Loading…</div><ol id="steps"></ol><p id="notice" class="notice"></p></section>`;
    this.load();
  }
  async load() {
    const root = this.shadowRoot, id = this.getAttribute('experience-id') || '', locale = this.getAttribute('locale') || document.documentElement.lang || 'en', origin = this.getAttribute('api-origin') || 'https://api.brasa.world';
    if (!id) { root.getElementById('status').textContent = 'Experience identifier is required.'; return; }
    try { const url = new URL(`/v1/business/experiences/${encodeURIComponent(id)}`, origin); url.searchParams.set('locale', locale); const response = await fetch(url, { headers: { accept: 'application/json' }, credentials: 'omit' }); if (!response.ok) throw new Error('request_failed'); const item = (await response.json()).data;
      root.getElementById('title').textContent = String(item.title || 'Business pathway'); root.getElementById('status').textContent = `${item.steps.length} steps available.`;
      root.getElementById('steps').replaceChildren(...item.steps.map((step) => { const li = document.createElement('li'), title = document.createElement('h3'), detail = document.createElement('p'), link = document.createElement('a'); title.textContent = String(step.title); detail.textContent = String(step.description); link.textContent = 'Open guide'; link.href = new URL(step.url, 'https://brasa.business').href; li.append(title, detail, link); return li; })); root.getElementById('notice').textContent = String(item.disclaimer || '');
    } catch { root.getElementById('status').textContent = 'This business pathway is temporarily unavailable.'; }
  }
}
if (!customElements.get('brasa-business-experience')) customElements.define('brasa-business-experience', BrasaBusinessExperience);
