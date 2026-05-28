/* dao.js --------------------------------------------------------------------
 * Generic Dao<T, ID> contract — same idea as Java's:
 *     interface Dao<T, ID> { Optional<T> findById(ID id); List<T> findAll();
 *                            T save(T entity); void delete(ID id); }
 * Persistence layer is window.localStorage so the site survives reloads
 * without a backend, but the contract is identical to a SQL DAO.
 * ------------------------------------------------------------------------- */
'use strict';
(function () {

const Ex = window.GalleryEx;
const M  = window.GalleryModels;

const NAMESPACE = 'arte-de-la-montana::';

/* Tiny key/value helper — abstracts localStorage so a future swap to
 * IndexedDB or HTTP only touches this class. */
class Storage {
  static read(key) {
    try {
      const raw = localStorage.getItem(NAMESPACE + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      throw new Ex.DataAccessException(`Cannot read "${key}" from storage`, e);
    }
  }
  static write(key, value) {
    try {
      localStorage.setItem(NAMESPACE + key, JSON.stringify(value));
    } catch (e) {
      throw new Ex.DataAccessException(`Cannot write "${key}" to storage`, e);
    }
  }
  static clear() {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(NAMESPACE)) localStorage.removeItem(k);
    }
  }
}

/* The Java `Dao<T,ID>` contract — extracted so every concrete DAO is a
 * mechanical implementation. */
class Dao {
  // Required methods (subclasses implement them all):
  findById(id)  { throw new Ex.GalleryException('Dao.findById is abstract'); }
  findAll()     { throw new Ex.GalleryException('Dao.findAll is abstract'); }
  save(entity)  { throw new Ex.GalleryException('Dao.save is abstract'); }
  delete(id)    { throw new Ex.GalleryException('Dao.delete is abstract'); }
  count()       { return this.findAll().length; }
}

/* Generic helper — every DAO is the same modulo (storage-key, mapRow). */
class LocalStorageDao extends Dao {
  constructor(storageKey, mapRow) {
    super();
    this.storageKey = storageKey;
    this.mapRow     = mapRow;     // (plainObj) => Entity
  }
  #loadRows() { return Storage.read(this.storageKey) || []; }
  #saveRows(rows) { Storage.write(this.storageKey, rows); }

  findAll() { return this.#loadRows().map(this.mapRow); }
  findById(id) {
    const row = this.#loadRows().find(r => r.id === id);
    if (!row) throw new Ex.NotFoundException(this.storageKey, id);
    return this.mapRow(row);
  }
  /** save = upsert. Returns the entity (with id) on success. */
  save(entity) {
    const rows = this.#loadRows();
    const json = entity.toJSON();
    const i = rows.findIndex(r => r.id === json.id);
    if (i >= 0) rows[i] = json; else rows.push(json);
    this.#saveRows(rows);
    return entity;
  }
  delete(id) {
    const rows = this.#loadRows();
    const i = rows.findIndex(r => r.id === id);
    if (i < 0) throw new Ex.NotFoundException(this.storageKey, id);
    rows.splice(i, 1);
    this.#saveRows(rows);
  }
  /** Replace the entire collection (used by CSV import and seeding). */
  replaceAll(entities) {
    this.#saveRows(entities.map(e => e.toJSON()));
  }
  filter(predicate) { return this.findAll().filter(predicate); }
  findFirst(predicate) {
    const row = this.#loadRows().find(r => predicate(this.mapRow(r)));
    return row ? this.mapRow(row) : null;
  }
}

/* ------- Concrete DAOs --------------------------------------------------- */
class UserDao extends LocalStorageDao {
  constructor() { super('users', M.userFromPlain); }
  findByUsername(username) {
    const u = (username || '').toLowerCase().trim();
    return this.findFirst(x => x.username === u);
  }
  save(entity) {
    const existing = this.findByUsername(entity.username);
    if (existing && existing.id !== entity.id) {
      throw new Ex.DuplicateException('User', entity.username);
    }
    return super.save(entity);
  }
}

class ArtworkDao extends LocalStorageDao {
  constructor() { super('artworks', M.artworkFromPlain); }
  findByTitleYear(title, year) {
    return this.findFirst(a =>
      a.title.toLowerCase() === title.toLowerCase() && a.year === Number(year));
  }
  save(entity) {
    const existing = this.findByTitleYear(entity.title, entity.year);
    if (existing && existing.id !== entity.id) {
      throw new Ex.DuplicateException('Artwork', `${entity.title} (${entity.year})`);
    }
    return super.save(entity);
  }
}

class FavouriteDao extends LocalStorageDao {
  /* (userId, artworkId) tuples — many-to-many between User and Artwork. */
  constructor() {
    super('favourites', plain => plain); // raw row, no model
  }
  toggle(userId, artworkId) {
    const rows = Storage.read('favourites') || [];
    const idx = rows.findIndex(r => r.userId === userId && r.artworkId === artworkId);
    if (idx >= 0) { rows.splice(idx, 1); Storage.write('favourites', rows); return false; }
    rows.push({ id: crypto.randomUUID(), userId, artworkId });
    Storage.write('favourites', rows);
    return true;
  }
  isFavourite(userId, artworkId) {
    return !!this.findFirst(r => r.userId === userId && r.artworkId === artworkId);
  }
  forUser(userId) {
    return this.filter(r => r.userId === userId).map(r => r.artworkId);
  }
}

window.GalleryDao = { Storage, Dao, LocalStorageDao, UserDao, ArtworkDao, FavouriteDao };
})();
