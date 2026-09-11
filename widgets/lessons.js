class BrasaLessons extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>:host{display:block;color:#1b1a17;font:400 1rem/1.5 system-ui,sans-serif}.card{border:1px solid #e5dfd0;border-radius:.6rem;background:#fbf9f4;padding:1rem}.brand{color:#8c3a1f;font-size:.75rem;letter-spacing:.12em;text-transform:uppercase}h2{font:600 1.35rem/1.2 Georgia,serif;margin:.35rem 0 1rem}ul{list-style:none;padding:0;margin:0;display:grid;gap:.75rem}li{border-top:1px solid #e5dfd0;padding-top:.75rem}h3{font-size:1rem;margin:0 0 .25rem}p{margin:0;color:#6b6862}button{font:inherit;margin-top:.75rem;padding:.5rem .75rem;border:1px solid currentColor;border-radius:.35rem;background:transparent;color:#8c3a1f}button[hidden]{display:none}a:focus-visible,button:focus-visible{outline:3px solid #8c3a1f;outline-offset:3px}</style><section class="card" aria-labelledby="title"><div class="brand">Powered by BRASA</div><h2 id="title">Lessons</h2><div id="status" role="status">Loading lessons…</div><ul id="list"></ul><button id="more" type="button" hidden>More lessons</button></section>`;
    this.page = 1; this.load(false);
  }
  async load(append = false) {
    const status = this.shadowRoot.getElementById('status');
    const list = this.shadowRoot.getElementById('list');
    const schoolId = this.getAttribute('school-id') || '';
    const locale = this.getAttribute('locale') || document.documentElement.lang || 'en';
    const endpoint = this.getAttribute('api-origin') || 'https://api.brasa.world';
    const limit = this.getAttribute('limit') || '10', query = this.getAttribute('query'), offline = this.getAttribute('offline-eligible');
    const more = this.shadowRoot.getElementById('more'); more.hidden = true;
    if (!schoolId) { status.textContent = 'School identifier is required.'; return; }
    try {
      const url = new URL('/v1/education/lessons', endpoint);
      url.searchParams.set('schoolId', schoolId); url.searchParams.set('locale', locale); url.searchParams.set('page', String(this.page)); url.searchParams.set('limit', limit);
      if (query) url.searchParams.set('q', query); if (offline === 'true' || offline === 'false') url.searchParams.set('offlineEligible', offline);
      const response = await fetch(url, { headers: { accept: 'application/json' }, credentials: 'omit' });
      if (!response.ok) throw new Error('request_failed');
      const payload = await response.json();
      const lessons = Array.isArray(payload.data) ? payload.data : [];
      const items = lessons.map((lesson) => {
        const item = document.createElement('li'), title = document.createElement('h3'), summary = document.createElement('p');
        title.textContent = String(lesson.title || 'Untitled lesson'); summary.textContent = String(lesson.summary || '');
        item.append(title, summary); return item;
      });
      if (append) list.append(...items); else list.replaceChildren(...items);
      const count = list.children.length; status.textContent = count ? `${count} lesson${count === 1 ? '' : 's'} available.` : 'No published lessons yet.';
      more.hidden = !payload.meta?.hasMore; more.onclick = () => { this.page += 1; this.load(true); };
    } catch {
      status.replaceChildren(document.createTextNode('Lessons are temporarily unavailable. '));
      const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Try again'; retry.addEventListener('click', () => this.load(append), { once: true }); status.append(retry);
    }
  }
}
if (!customElements.get('brasa-lessons')) customElements.define('brasa-lessons', BrasaLessons);
