/* app.js --------------------------------------------------------------------
 * Thin UI layer over the OOP model. Three views only:
 *   Gallery  → uniform grid of every artwork in the catalogue
 *   About    → studio story, uses every decorative asset
 *   Order    → direct contact links (Instagram / WhatsApp), static markup
 * The Java-style class / service / DAO / exception hierarchy lives untouched
 * in models.js, dao.js, services.js, exceptions.js so the syllabus concepts
 * still drive the data layer — the UI just stays out of the way.
 * ------------------------------------------------------------------------- */
'use strict';
(function () {

const Ex = window.GalleryEx;
const M  = window.GalleryModels;
const D  = window.GalleryDao;
const S  = window.GalleryServices;
const C  = window.GalleryCatalog;

const artworkDao  = new D.ArtworkDao();
const userDao     = new D.UserDao();
const session     = new S.SessionManager(userDao);
const auth        = new S.AuthService(userDao, session);
const gallery     = new S.GalleryService(artworkDao);

/* ------- Seed / re-seed on catalogue change ---------------------------- *
 * The gallery is seeded into LocalStorage once. When the catalogue changes
 * (pieces added, removed or renamed) we bump C.CATALOG_VERSION so returning
 * visitors drop their stale copy and pick up the new seed. */
if (D.Storage.read('catalog-version') !== C.CATALOG_VERSION) {
  artworkDao.replaceAll([]);
  D.Storage.write('catalog-version', C.CATALOG_VERSION);
}
if (artworkDao.count() === 0) {
  for (const a of C.SEED_ARTWORKS) {
    try { gallery.create(a); } catch (_) { /* ignore dup */ }
  }
}
if (userDao.count() === 0) {
  for (const u of C.SEED_USERS) {
    try { auth.register(u); } catch (_) { /* ignore */ }
  }
}

/* ------- Tiny DOM helpers --------------------------------------------- */
const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

const Toast = {
  show(message, kind = 'info', ttl = 3500) {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = message;
    $('#toast-root').appendChild(el);
    setTimeout(() => el.remove(), ttl);
  },
  success(m) { this.show(m, 'success'); },
  error(m)   { this.show(m, 'error'); },
};

const Modal = {
  open(node) {
    const body = $('#modal-body');
    body.innerHTML = '';
    body.appendChild(node);
    $('#modal-root').hidden = false;
    document.body.style.overflow = 'hidden';
  },
  close() {
    $('#modal-root').hidden = true;
    document.body.style.overflow = '';
  },
};

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

/* ============================ Router ================================== */
function go(view) {
  document.body.setAttribute('data-view', view);
  $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
  $$('#topbar nav a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  if (view === 'studio') StudioUI.render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ============================ Gallery ================================= */
const GalleryUI = {
  render() {
    const grid = $('#gallery-grid');
    const rows = gallery.list({ sort: 'year-desc' });
    grid.innerHTML = rows.map(a => `
      <a class="tile" data-id="${a.id}" data-size="${escapeHtml(a.size)}" title="${escapeHtml(a.title)} (${a.year})">
        <img src="${escapeHtml(a.imageUrl)}" alt="${escapeHtml(a.title)}" loading="lazy" />
        <span class="caption">${escapeHtml(a.title)} · ${a.year}</span>
      </a>
    `).join('');
    grid.querySelectorAll('.tile').forEach(t => {
      t.addEventListener('click', () => GalleryUI.openDetail(t.dataset.id));
    });
  },
  openDetail(id) {
    let a; try { a = gallery.get(id); } catch (e) { Toast.error(e.message); return; }
    // Optional alternate views (e.g. a pen-stencil version) and narrative.
    const alts  = (C.ALT_VIEWS && C.ALT_VIEWS[a.imageUrl]) || null;
    const slug  = a.imageUrl.split('/').pop().replace(/\.[^.]+$/, '').replace(/-\d{4}-.*$/, '');
    const story = (C.STORIES && C.STORIES[slug]) || '';
    const node = document.createElement('div');
    node.className = 'detail';
    node.innerHTML = `
      <div class="image">
        <img src="${escapeHtml(a.imageUrl)}" alt="${escapeHtml(a.title)}" />
        ${alts ? `<div class="view-toggle">${alts.map((v, i) =>
          `<button type="button" data-src="${escapeHtml(v.imageUrl)}" class="${i === 0 ? 'active' : ''}">${escapeHtml(v.label)}</button>`
        ).join('')}</div>` : ''}
      </div>
      <div class="meta">
        <h3>${escapeHtml(a.title)}</h3>
        <div class="sub">${a.year} · ${escapeHtml(a.medium)} · ${escapeHtml(a.size)}</div>
        <p class="desc">${escapeHtml(a.description)}</p>
        ${story ? `<p class="story">${escapeHtml(story)}</p>` : ''}
        <dl>
          <dt>Category</dt><dd>${escapeHtml(a.category())}</dd>
          <dt>Medium</dt><dd>${escapeHtml(a.medium)}</dd>
          <dt>Size</dt><dd>${escapeHtml(a.size)}</dd>
          <dt>Year</dt><dd>${a.year}</dd>
          <dt>Tags</dt><dd>${a.tags.map(escapeHtml).join(', ') || '—'}</dd>
        </dl>
        <button class="primary" data-order-id="${a.id}">Enquire about this piece</button>
      </div>`;
    if (alts) {
      const img = node.querySelector('.image img');
      node.querySelectorAll('.view-toggle button').forEach(btn => {
        btn.addEventListener('click', () => {
          img.src = btn.dataset.src;
          node.querySelectorAll('.view-toggle button').forEach(b => b.classList.toggle('active', b === btn));
        });
      });
    }
    node.querySelector('[data-order-id]').addEventListener('click', () => {
      Modal.close();
      go('order');
    });
    Modal.open(node);
  },
};

/* ============================  Studio (hidden)  ======================= *
 * Reached only by typing #studio in the URL. Never linked from the public
 * site so visitors never see the curator surface unless they know to come
 * here. After login (admin / curator), a small dashboard appears with the
 * incoming enquiries and the artworks table.
 * ===================================================================== */
const StudioUI = {
  tab: 'enquiries',
  render() {
    const body = $('#studio-body');
    if (!session.current) { this._renderLogin(body); return; }
    this._renderDashboard(body);
  },
  _renderLogin(host) {
    host.innerHTML = `
      <div class="studio-login">
        <h2>Studio access</h2>
        <p class="lede">This area is for the studio team.</p>
        <form id="studio-login-form" class="studio-form">
          <label>Username <input name="username" required autocomplete="username" /></label>
          <label>Password <input name="password" type="password" required autocomplete="current-password" /></label>
          <div class="actions">
            <a href="#gallery" data-view="gallery">Back to the gallery</a>
            <button class="primary" type="submit">Sign in</button>
          </div>
        </form>
      </div>`;
    host.querySelector('#studio-login-form').addEventListener('submit', ev => {
      ev.preventDefault();
      const fd = new FormData(ev.currentTarget);
      try {
        const u = auth.login(fd.get('username'), fd.get('password'));
        Toast.success(`Welcome back, ${u.fullName || u.username}`);
        this.render();
      } catch (e) {
        if (e instanceof Ex.GalleryException) Toast.error(e.message);
        else throw e;
      }
    });
  },
  _renderDashboard(host) {
    const u = session.current;
    host.innerHTML = `
      <div class="studio-header">
        <div>
          <h2>Studio</h2>
          <p class="lede">${escapeHtml(u.fullName || u.username)} · ${escapeHtml(u.getRole().toLowerCase())}</p>
        </div>
        <div class="studio-tabs">
          <button data-tab="enquiries" class="${this.tab === 'enquiries' ? 'active' : ''}">Enquiries</button>
          <button data-tab="artworks"  class="${this.tab === 'artworks'  ? 'active' : ''}">Artworks</button>
          <button id="studio-logout">Sign out</button>
        </div>
      </div>
      <div id="studio-tab-body"></div>`;
    host.querySelectorAll('.studio-tabs button[data-tab]').forEach(b =>
      b.addEventListener('click', () => { this.tab = b.dataset.tab; this.render(); }));
    host.querySelector('#studio-logout').addEventListener('click', () => {
      auth.logout(); Toast.success('Signed out');
      // Stay on the studio page to redisplay the login form.
      this.render();
    });
    if (this.tab === 'enquiries') this._renderEnquiries(host.querySelector('#studio-tab-body'));
    if (this.tab === 'artworks')  this._renderArtworks(host.querySelector('#studio-tab-body'), u);
  },
  _renderEnquiries(host) {
    const rows = JSON.parse(localStorage.getItem('arte-de-la-montana::orders') || '[]')
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    if (rows.length === 0) {
      host.innerHTML = `<p class="hint">No enquiries yet.</p>`;
      return;
    }
    host.innerHTML = `
      <table class="studio-table">
        <thead><tr><th>Received</th><th>From</th><th>Pieces</th><th>Message</th><th></th></tr></thead>
        <tbody>${rows.map(o => `
          <tr data-id="${o.id}">
            <td>${escapeHtml(new Date(o.createdAt).toLocaleString())}</td>
            <td><div><strong>${escapeHtml(o.customer)}</strong></div>
                <div class="meta">${escapeHtml(o.email)}</div>
                ${o.phone ? `<div class="meta">${escapeHtml(o.phone)}</div>` : ''}
                ${o.country ? `<div class="meta">${escapeHtml(o.country)}</div>` : ''}</td>
            <td>${o.pieceTitles.map(escapeHtml).join('<br>')}</td>
            <td>${escapeHtml(o.message || '')}</td>
            <td><button data-action="delete">Delete</button></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    host.querySelectorAll('button[data-action="delete"]').forEach(b => b.addEventListener('click', ev => {
      const id = ev.currentTarget.closest('tr').dataset.id;
      if (!confirm('Delete this enquiry?')) return;
      const rows = JSON.parse(localStorage.getItem('arte-de-la-montana::orders') || '[]')
        .filter(o => o.id !== id);
      localStorage.setItem('arte-de-la-montana::orders', JSON.stringify(rows));
      this._renderEnquiries(host);
    }));
  },
  _renderArtworks(host, u) {
    const canEdit = u.can('manage-artworks');
    const rows = artworkDao.findAll().sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
    host.innerHTML = `
      <div class="studio-toolbar">
        ${canEdit ? `<button class="primary" id="studio-add">+ Add piece</button>` : ''}
        <span></span>
        <button id="studio-export">Export CSV</button>
      </div>
      <table class="studio-table">
        <thead><tr><th></th><th>Title</th><th>Year</th><th>Medium</th><th>Size</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows.map(a => `
          <tr data-id="${a.id}">
            <td><img src="${escapeHtml(a.imageUrl)}" alt="" /></td>
            <td>${escapeHtml(a.title)}</td>
            <td>${a.year}</td>
            <td>${escapeHtml(a.medium)}</td>
            <td>${escapeHtml(a.size)}</td>
            <td>${escapeHtml(a.status)}</td>
            <td>
              <button data-action="view">View</button>
              ${canEdit ? `<button data-action="edit">Edit</button>
                           <button data-action="delete">Delete</button>` : ''}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    if (canEdit) host.querySelector('#studio-add').addEventListener('click', () => StudioUI._openArtworkForm());
    host.querySelector('#studio-export').addEventListener('click', () => {
      const csv = S.CsvService.exportArtworks(artworkDao.findAll());
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'artworks.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(a.href);
      Toast.success('Exported artworks.csv');
    });
    host.querySelectorAll('tbody tr').forEach(tr => {
      const id = tr.dataset.id;
      tr.querySelector('[data-action="view"]')?.addEventListener('click', () => GalleryUI.openDetail(id));
      tr.querySelector('[data-action="edit"]')?.addEventListener('click', () => StudioUI._openArtworkForm(gallery.get(id)));
      tr.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
        if (!confirm('Delete this artwork?')) return;
        try { gallery.delete(id); Toast.success('Deleted'); GalleryUI.render(); StudioUI.render(); }
        catch (e) { Toast.error(e.message); }
      });
    });
  },
  _openArtworkForm(existing = null) {
    const node = document.createElement('div');
    node.style.padding = '1.8rem 2rem';
    node.innerHTML = `
      <h3 style="margin-top:0">${existing ? 'Edit piece' : 'Add piece'}</h3>
      <form class="studio-form studio-form-wide">
        <div class="form-grid">
          <label class="full">Title <input name="title" required value="${escapeHtml(existing?.title || '')}" /></label>
          <label>Year <input name="year" type="number" min="1900" max="${new Date().getFullYear()+1}" required value="${existing?.year || new Date().getFullYear()}" /></label>
          <label>Medium
            <select name="medium" required>
              ${['acrylic','oil','alcohol','pen','pencil','color-pencil','oil-pastel','dry-pastel','ceramic']
                .map(m => `<option value="${m}" ${existing?.medium === m ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </label>
          <label>Size
            <select name="size" required>
              ${['small','medium','large','extralarge'].map(s =>
                `<option value="${s}" ${existing?.size === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </label>
          <label>Status
            <select name="status">
              ${['available','sold','on-loan','archived'].map(s =>
                `<option value="${s}" ${(existing?.status || 'available') === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </label>
          <label class="full">Image URL <input name="imageUrl" value="${escapeHtml(existing?.imageUrl || '')}" placeholder="assets/your-file.png" /></label>
          <label class="full">Tags (comma-separated) <input name="tags" value="${existing?.tags?.join(', ') || ''}" /></label>
          <label class="full">Description <textarea name="description" rows="3">${escapeHtml(existing?.description || '')}</textarea></label>
        </div>
        <div class="actions">
          <button type="button" id="art-cancel">Cancel</button>
          <button class="primary" type="submit">${existing ? 'Save' : 'Add'}</button>
        </div>
      </form>`;
    Modal.open(node);
    node.querySelector('#art-cancel').addEventListener('click', () => Modal.close());
    node.querySelector('form').addEventListener('submit', ev => {
      ev.preventDefault();
      const fd = new FormData(ev.currentTarget);
      const patch = {
        title: fd.get('title'), year: fd.get('year'), medium: fd.get('medium'),
        size: fd.get('size'), status: fd.get('status'), imageUrl: fd.get('imageUrl'),
        tags: String(fd.get('tags') || '').split(',').map(s => s.trim()).filter(Boolean),
        description: fd.get('description'),
      };
      try {
        auth.requireAction('manage-artworks');
        if (existing) { gallery.update(existing.id, patch); Toast.success('Saved'); }
        else          { gallery.create(patch);             Toast.success('Added'); }
        Modal.close();
        GalleryUI.render(); StudioUI.render();
      } catch (e) {
        if (e instanceof Ex.GalleryException) Toast.error(e.message);
        else throw e;
      }
    });
  },
};

/* ============================  Bootstrap  ============================= */
document.addEventListener('DOMContentLoaded', () => {
  GalleryUI.render();

  // Internal navigation (header + content links)
  document.body.addEventListener('click', ev => {
    const a = ev.target.closest('[data-view]');
    if (a) { ev.preventDefault(); go(a.dataset.view); }
  });

  // Modal close
  $('#modal-close').addEventListener('click', () => Modal.close());
  $('#modal-root .modal-backdrop').addEventListener('click', () => Modal.close());
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#modal-root').hidden) Modal.close();
  });

  // Initial hash routing. `#studio` is intentionally undocumented — it is the
  // only way to reach the curator surface.
  const ALL_VIEWS = ['gallery', 'about', 'order', 'studio'];
  const initial = (location.hash || '#gallery').slice(1);
  go(ALL_VIEWS.includes(initial) ? initial : 'gallery');
  window.addEventListener('hashchange', () => {
    const v = (location.hash || '#gallery').slice(1);
    if (ALL_VIEWS.includes(v)) go(v);
  });
});
})();
