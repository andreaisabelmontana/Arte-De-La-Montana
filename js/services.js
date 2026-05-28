/* services.js ---------------------------------------------------------------
 * Application services — match the Java layered architecture
 *   UI  →  Service  →  Dao  →  Storage
 * Controllers never touch the DAO directly; services translate any
 * DataAccessException into a domain-specific GalleryException.
 * ------------------------------------------------------------------------- */
'use strict';
(function () {

const Ex = window.GalleryEx;
const M  = window.GalleryModels;
const D  = window.GalleryDao;

/* ------- PasswordHasher (Session 18 "Encapsulation" / utility) ------------ */
class PasswordHasher {
  /** Salted FNV-1a — deliberately weak, course-project equivalent of salted SHA-256. */
  static hash(password, salt = 'pelusa-salt-2026') {
    const input = salt + ':' + (password || '');
    let h1 = 0x811c9dc5, h2 = 0x9dc5811c;
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      h1 ^= c; h1 = Math.imul(h1, 0x01000193);
      h2 ^= c << ((i % 4) * 2); h2 = Math.imul(h2, 0x01000193);
    }
    return ('00000000' + (h1 >>> 0).toString(16)).slice(-8)
         + ('00000000' + (h2 >>> 0).toString(16)).slice(-8);
  }
  static matches(password, expectedHash) {
    return PasswordHasher.hash(password) === expectedHash;
  }
}

/* ------- AuthService ------------------------------------------------------ */
class AuthService {
  #users; #session;
  constructor(userDao, sessionManager) {
    this.#users = userDao;
    this.#session = sessionManager;
  }
  login(username, password) {
    const user = this.#users.findByUsername(username);
    if (!user) throw new Ex.AuthenticationException();
    user.authenticate(PasswordHasher.hash(password));   // throws on mismatch
    this.#session.setCurrent(user);
    return user;
  }
  logout() { this.#session.clear(); }
  register({ role, username, password, fullName, email }) {
    if (!password || password.length < 6) {
      throw new Ex.ValidationException('Password must be ≥ 6 characters', 'password');
    }
    const plain = {
      kind: role, username, fullName, email,
      passwordHash: PasswordHasher.hash(password),
    };
    const user = M.userFromPlain(plain);
    return this.#users.save(user);
  }
  requireRole(role) {
    const u = this.#session.current;
    if (!u) throw new Ex.AuthorizationException('Please sign in first');
    if (u.getRole() !== role) throw new Ex.AuthorizationException(`Requires role ${role}`);
    return u;
  }
  requireAction(action) {
    const u = this.#session.current;
    if (!u) throw new Ex.AuthorizationException('Please sign in first');
    if (!u.can(action)) throw new Ex.AuthorizationException(`Action "${action}" not permitted for ${u.getRole()}`);
    return u;
  }
}

/* ------- SessionManager --------------------------------------------------- */
class SessionManager {
  static KEY = 'session';
  #user = null;
  constructor(userDao) {
    const stored = D.Storage.read(SessionManager.KEY);
    if (stored && stored.username) {
      try { this.#user = userDao.findByUsername(stored.username); }
      catch { this.#user = null; }
    }
  }
  get current() { return this.#user; }
  setCurrent(u) {
    this.#user = u;
    D.Storage.write(SessionManager.KEY, { username: u.username });
  }
  clear() {
    this.#user = null;
    D.Storage.write(SessionManager.KEY, null);
  }
}

/* ------- GalleryService --------------------------------------------------- */
class GalleryService {
  #dao;
  constructor(artworkDao) { this.#dao = artworkDao; }

  list({ search = '', medium = '', size = '', year = '', status = '', sort = 'year-desc' } = {}) {
    const q = (search || '').toLowerCase();
    let rows = this.#dao.filter(a => {
      if (q && !a.title.toLowerCase().includes(q)) return false;
      if (medium && a.medium !== medium)           return false;
      if (size   && a.size   !== size)             return false;
      if (year   && a.year   !== Number(year))     return false;
      if (status && a.status !== status)           return false;
      return true;
    });
    const cmp = {
      'year-desc':  (a, b) => b.year - a.year || a.title.localeCompare(b.title),
      'year-asc':   (a, b) => a.year - b.year || a.title.localeCompare(b.title),
      'title-asc':  (a, b) => a.title.localeCompare(b.title),
      'title-desc': (a, b) => b.title.localeCompare(a.title),
      'price-desc': (a, b) => b.price - a.price,
      'price-asc':  (a, b) => a.price - b.price,
    }[sort] || ((a,b)=>0);
    rows.sort(cmp);
    return rows;
  }

  get(id) { return this.#dao.findById(id); }

  /** Create a new artwork.  Pass `category` ('painting'|'sketch'|'pen') to
   *  choose the concrete subclass, or let the system infer from medium. */
  create(data) {
    const entity = M.artworkFromPlain(Object.assign({ kind: data.category }, data));
    return this.#dao.save(entity);
  }

  update(id, patch) {
    const entity = this.#dao.findById(id);
    if (patch.title       !== undefined) entity.setTitle(patch.title);
    if (patch.year        !== undefined) entity.setYear(patch.year);
    if (patch.medium      !== undefined) entity.setMedium(patch.medium);
    if (patch.size        !== undefined) entity.setSize(patch.size);
    if (patch.imageUrl    !== undefined) entity.setImageUrl(patch.imageUrl);
    if (patch.price       !== undefined) entity.setPrice(patch.price);
    if (patch.status      !== undefined) entity.setStatus(patch.status);
    if (patch.description !== undefined) entity.setDescription(patch.description);
    if (patch.tags        !== undefined) entity.setTags(patch.tags);
    return this.#dao.save(entity);
  }

  delete(id) { this.#dao.delete(id); }

  /* Reportable<String, Number> aggregation — polymorphism applied to the
   * heterogeneous Artwork hierarchy. */
  stats() {
    const all = this.#dao.findAll();
    const out = {
      total: all.length, byStatus: {}, byMedium: {}, bySize: {}, byYear: {}, byCategory: {},
      totalValue: 0,
    };
    for (const a of all) {
      out.byStatus[a.status]    = (out.byStatus[a.status]    || 0) + 1;
      out.byMedium[a.medium]    = (out.byMedium[a.medium]    || 0) + 1;
      out.bySize[a.size]        = (out.bySize[a.size]        || 0) + 1;
      out.byYear[a.year]        = (out.byYear[a.year]        || 0) + 1;
      out.byCategory[a.category()] = (out.byCategory[a.category()] || 0) + 1;
      out.totalValue += a.price;
    }
    return out;
  }
}

/* ------- CsvService — RFC-4180 quoted-field aware ------------------------- */
class CsvService {
  /** Build a CSV from any list of CsvSerializable + a `csvHeader` string. */
  static buildCsv(header, rows) {
    return header + '\n' + rows.map(r => r.toCsvRow()).join('\n') + '\n';
  }

  /** Proper RFC-4180 parser (quoted fields, embedded quotes via "" doubling). */
  static parseCsv(text) {
    const out = [];
    let row = [], field = '', inQuotes = false, i = 0;
    while (i < text.length) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
        if (c === '"')                        { inQuotes = false; i++; continue; }
        field += c; i++;
      } else {
        if (c === '"')                        { inQuotes = true; i++; continue; }
        if (c === ',')                        { row.push(field); field = ''; i++; continue; }
        if (c === '\r')                       { i++; continue; }
        if (c === '\n')                       { row.push(field); out.push(row); row = []; field = ''; i++; continue; }
        field += c; i++;
      }
    }
    if (field.length || row.length) { row.push(field); out.push(row); }
    return out.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
  }

  static exportArtworks(artworks)       { return CsvService.buildCsv(M.Artwork.csvHeader(), artworks); }
  static exportUsers(users)             { return CsvService.buildCsv(M.User.csvHeader(),    users); }

  /** Import an artworks CSV. Returns {created, updated, errors}. */
  static importArtworks(text, dao) {
    const rows = CsvService.parseCsv(text);
    if (rows.length === 0) throw new Ex.CsvFormatException('CSV is empty', 0);
    const header = rows.shift().map(h => h.trim().toLowerCase());
    const required = ['title', 'year', 'medium', 'size'];
    for (const r of required) {
      if (!header.includes(r)) throw new Ex.CsvFormatException(`Missing required column "${r}"`, 1);
    }
    const idx = name => header.indexOf(name);
    let created = 0, updated = 0;
    const errors = [];
    rows.forEach((cols, n) => {
      const lineNo = n + 2; // header was line 1
      try {
        const data = {
          kind:        idx('category') >= 0 ? cols[idx('category')] : '',
          title:       cols[idx('title')],
          year:        cols[idx('year')],
          medium:      cols[idx('medium')],
          size:        cols[idx('size')],
          price:       idx('price')       >= 0 ? cols[idx('price')]       : undefined,
          status:      idx('status')      >= 0 ? cols[idx('status')]      : undefined,
          imageUrl:    idx('image_url')   >= 0 ? cols[idx('image_url')]   : '',
          tags:        idx('tags')        >= 0 ? (cols[idx('tags')] || '').split('|').filter(Boolean) : [],
          description: idx('description') >= 0 ? cols[idx('description')] : '',
        };
        const existing = dao.findByTitleYear(data.title, data.year);
        if (existing) {
          existing.setTitle(data.title);
          existing.setYear(data.year);
          existing.setMedium(data.medium);
          existing.setSize(data.size);
          if (data.price !== undefined && data.price !== '') existing.setPrice(data.price);
          if (data.status) existing.setStatus(data.status);
          if (data.imageUrl) existing.setImageUrl(data.imageUrl);
          existing.setTags(data.tags);
          existing.setDescription(data.description);
          dao.save(existing); updated++;
        } else {
          const a = M.artworkFromPlain(data);
          dao.save(a); created++;
        }
      } catch (e) {
        errors.push({ line: lineNo, message: e.message });
      }
    });
    return { created, updated, errors };
  }
}

window.GalleryServices = {
  PasswordHasher, AuthService, SessionManager, GalleryService, CsvService,
};
})();
