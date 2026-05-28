/* models.js -----------------------------------------------------------------
 * Object model translated from the Java syllabus into ES2022 classes.
 *
 * Demonstrates:
 *   - Abstraction          : User & Artwork are abstract — direct instantiation
 *                            throws, only concrete subclasses are creatable.
 *   - Inheritance          : Admin / Curator / Visitor extend User;
 *                            Painting / Sketch / PenWork extend Artwork.
 *   - Encapsulation        : private fields (`#`) with validated setters
 *                            and read-only public getters.
 *   - Polymorphism         : `describePrivileges()`, `getRole()`,
 *                            `toCsvRow()` are overridden in every subclass.
 *   - Interface contracts  : every model implements `Authenticatable`,
 *                            `CsvSerializable` and/or `Reportable<K,V>` —
 *                            enforced by a runtime contract checker.
 * ------------------------------------------------------------------------- */
'use strict';
(function () {

const Ex = window.GalleryEx;

/* ------- "interface" contracts (Java interface, JS protocol) -------------- */
const Authenticatable = {
  required: ['authenticate', 'getRole', 'getUsername'],
};
const CsvSerializable = {
  required: ['toCsvRow'],
  csvEscape(v) {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  },
};
const Reportable = {
  required: ['generateReport'],
};

function implementsContract(obj, contract, name) {
  for (const m of contract.required) {
    if (typeof obj[m] !== 'function') {
      throw new Ex.GalleryException(
        `${obj.constructor.name} does not implement ${name}.${m}()`);
    }
  }
}

/* ------- Roles --------------------------------------------------------- */
const Role = Object.freeze({
  ADMIN:   'ADMIN',
  CURATOR: 'CURATOR',
  VISITOR: 'VISITOR',
});

/* ===========================================================================
 * User hierarchy
 * ========================================================================= */
class User {
  // private fields → encapsulation
  #id; #username; #passwordHash; #fullName; #email; #createdAt; #active;

  constructor({ id, username, passwordHash, fullName, email, createdAt, active }) {
    if (new.target === User) {
      throw new Ex.GalleryException('User is abstract — instantiate Admin, Curator or Visitor');
    }
    this.#id           = id || crypto.randomUUID();
    this.#username     = User.#normaliseUsername(username);
    this.#passwordHash = passwordHash;
    this.#fullName     = (fullName || '').trim();
    this.#email        = (email || '').trim().toLowerCase();
    this.#createdAt    = createdAt || new Date().toISOString();
    this.#active       = active !== false;
    implementsContract(this, Authenticatable, 'Authenticatable');
    implementsContract(this, CsvSerializable, 'CsvSerializable');
  }

  // ---- read-only getters
  get id()           { return this.#id; }
  get username()     { return this.#username; }
  get passwordHash() { return this.#passwordHash; }
  get fullName()     { return this.#fullName; }
  get email()        { return this.#email; }
  get createdAt()    { return this.#createdAt; }
  get active()       { return this.#active; }

  // ---- validated setters
  setFullName(v) {
    if (!v || v.trim().length < 2) throw new Ex.ValidationException('Full name must be ≥ 2 characters', 'fullName');
    this.#fullName = v.trim();
  }
  setEmail(v) {
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Ex.ValidationException('Invalid e-mail', 'email');
    this.#email = (v || '').trim().toLowerCase();
  }
  setActive(b) { this.#active = !!b; }
  setPasswordHash(h) { this.#passwordHash = h; }

  // ---- Authenticatable contract
  authenticate(passwordHash) {
    if (!this.#active) throw new Ex.AuthenticationException('Account is disabled');
    if (this.#passwordHash !== passwordHash) throw new Ex.AuthenticationException();
    return true;
  }
  getUsername() { return this.#username; }
  getRole()     { throw new Ex.GalleryException('getRole() is abstract'); }

  // ---- polymorphism showcase (overridden in subclasses)
  describePrivileges() { return 'Browse the public catalogue.'; }
  can(action)          { return false; }

  // ---- CsvSerializable contract
  toCsvRow() {
    const e = CsvSerializable.csvEscape;
    return [
      this.getRole(), e(this.#username), e(this.#passwordHash), e(this.#fullName),
      e(this.#email), this.#createdAt, this.#active ? '1' : '0',
    ].join(',');
  }
  static csvHeader() { return 'role,username,password_hash,full_name,email,created_at,active'; }

  static #normaliseUsername(u) {
    if (!u || !u.trim()) throw new Ex.ValidationException('Username is required', 'username');
    const s = u.trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,32}$/.test(s)) throw new Ex.ValidationException('Username must be 3–32 chars, a-z 0-9 . _ -', 'username');
    return s;
  }

  toJSON() {
    return {
      kind: this.getRole(), id: this.#id, username: this.#username,
      passwordHash: this.#passwordHash, fullName: this.#fullName, email: this.#email,
      createdAt: this.#createdAt, active: this.#active,
    };
  }
}

class Admin extends User {
  getRole() { return Role.ADMIN; }
  describePrivileges() {
    return 'Full access: manage users, manage artworks, import/export CSV, reset demo.';
  }
  can(action) {
    return ['manage-users', 'manage-artworks', 'view-reports', 'csv-io'].includes(action);
  }
}

class Curator extends User {
  getRole() { return Role.CURATOR; }
  describePrivileges() {
    return 'Manage the catalogue: add, edit, archive artworks and change status.';
  }
  can(action) {
    return ['manage-artworks', 'view-reports'].includes(action);
  }
}

class Visitor extends User {
  getRole() { return Role.VISITOR; }
  describePrivileges() {
    return 'Browse the gallery and bookmark favourite pieces.';
  }
  can(action) {
    return ['favourite'].includes(action);
  }
}

/** Factory that respects the discriminator coming from storage / CSV. */
function userFromPlain(o) {
  const kind = (o.kind || o.role || '').toUpperCase();
  switch (kind) {
    case Role.ADMIN:   return new Admin(o);
    case Role.CURATOR: return new Curator(o);
    case Role.VISITOR: return new Visitor(o);
    default: throw new Ex.ValidationException(`Unknown role "${kind}"`, 'role');
  }
}

/* ===========================================================================
 * Artwork hierarchy
 * ========================================================================= */
const ArtworkStatus = Object.freeze({
  AVAILABLE: 'available',
  SOLD:      'sold',
  ON_LOAN:   'on-loan',
  ARCHIVED:  'archived',
});

const Size = Object.freeze({
  SMALL: 'small', MEDIUM: 'medium', LARGE: 'large', EXTRALARGE: 'extralarge',
});

class Artwork {
  #id; #title; #year; #medium; #size; #imageUrl; #price; #status;
  #description; #tags; #createdAt; #updatedAt;

  constructor({ id, title, year, medium, size, imageUrl, price, status,
                description, tags, createdAt, updatedAt }) {
    if (new.target === Artwork) {
      throw new Ex.GalleryException('Artwork is abstract — use Painting, Sketch or PenWork');
    }
    this.#id          = id || crypto.randomUUID();
    this.setTitle(title);
    this.setYear(year);
    this.#medium      = (medium || '').toLowerCase();
    this.#size        = Artwork.#parseSize(size);
    this.#imageUrl    = imageUrl || '';
    // Prices are negotiated per enquiry, not stored — null means "on request".
    this.#price       = (price === undefined || price === null || price === '') ? null : Number(price);
    this.#status      = Object.values(ArtworkStatus).includes(status) ? status : ArtworkStatus.AVAILABLE;
    this.#description = description || '';
    this.#tags        = Array.isArray(tags) ? tags.slice() : [];
    this.#createdAt   = createdAt || new Date().toISOString();
    this.#updatedAt   = updatedAt || this.#createdAt;
    implementsContract(this, CsvSerializable, 'CsvSerializable');
    implementsContract(this, Reportable, 'Reportable');
  }

  // ---- getters
  get id()          { return this.#id; }
  get title()       { return this.#title; }
  get year()        { return this.#year; }
  get medium()      { return this.#medium; }
  get size()        { return this.#size; }
  get imageUrl()    { return this.#imageUrl; }
  get price()       { return this.#price; }
  get status()      { return this.#status; }
  get description() { return this.#description; }
  get tags()        { return this.#tags.slice(); }
  get createdAt()   { return this.#createdAt; }
  get updatedAt()   { return this.#updatedAt; }

  // ---- validated setters → encapsulation
  setTitle(v) {
    if (!v || !v.trim()) throw new Ex.ValidationException('Title is required', 'title');
    if (v.length > 80)   throw new Ex.ValidationException('Title must be ≤ 80 chars', 'title');
    this.#title = v.trim();
    this.#touch();
  }
  setYear(v) {
    const y = Number(v);
    const current = new Date().getFullYear();
    if (!Number.isInteger(y) || y < 1900 || y > current + 1) {
      throw new Ex.ValidationException(`Year must be between 1900 and ${current + 1}`, 'year');
    }
    this.#year = y;
    this.#touch();
  }
  setMedium(v) { this.#medium = (v || '').toLowerCase(); this.#touch(); }
  setSize(v)   { this.#size = Artwork.#parseSize(v); this.#touch(); }
  setImageUrl(v) { this.#imageUrl = v || ''; this.#touch(); }
  setPrice(v) {
    if (v === null || v === undefined || v === '') { this.#price = null; this.#touch(); return; }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw new Ex.ValidationException('Price must be ≥ 0', 'price');
    this.#price = Math.round(n * 100) / 100;
    this.#touch();
  }
  setStatus(v) {
    if (!Object.values(ArtworkStatus).includes(v)) throw new Ex.ValidationException(`Unknown status "${v}"`, 'status');
    this.#status = v; this.#touch();
  }
  setDescription(v) { this.#description = v || ''; this.#touch(); }
  setTags(arr) { this.#tags = (arr || []).map(t => String(t).trim()).filter(Boolean); this.#touch(); }

  #touch() { this.#updatedAt = new Date().toISOString(); }

  // ---- polymorphism (overridden)
  category()       { return 'artwork'; }
  displayLabel()   { return `${this.#title} (${this.#year})`; }

  // ---- Reportable<String,Number>
  generateReport() {
    return {
      [`${this.category()}-${this.#size}`]: 1,
      [`${this.category()}-${this.#status}`]: 1,
    };
  }

  // ---- CsvSerializable
  toCsvRow() {
    const e = CsvSerializable.csvEscape;
    return [
      this.category(), e(this.#title), this.#year, e(this.#medium),
      e(this.#size), (this.#price ?? ''), e(this.#status), e(this.#imageUrl),
      e(this.#tags.join('|')), e(this.#description),
    ].join(',');
  }
  static csvHeader() {
    return 'category,title,year,medium,size,price,status,image_url,tags,description';
  }

  static #parseSize(s) {
    const v = (s || 'medium').toLowerCase();
    if (!Object.values(Size).includes(v)) {
      throw new Ex.ValidationException(`Unknown size "${s}"`, 'size');
    }
    return v;
  }
  static #defaultPriceFor(size) {
    switch (size) {
      case Size.SMALL:      return 120;
      case Size.MEDIUM:     return 280;
      case Size.LARGE:      return 540;
      case Size.EXTRALARGE: return 920;
      default:              return 200;
    }
  }

  toJSON() {
    return {
      kind: this.category(), id: this.#id, title: this.#title, year: this.#year,
      medium: this.#medium, size: this.#size, imageUrl: this.#imageUrl, price: this.#price,
      status: this.#status, description: this.#description, tags: this.#tags,
      createdAt: this.#createdAt, updatedAt: this.#updatedAt,
    };
  }
}

class Painting extends Artwork {
  category() { return 'painting'; }
}
class Sketch extends Artwork {
  category() { return 'sketch'; }
}
class PenWork extends Artwork {
  category() { return 'pen'; }
}

/** Decide which concrete subclass to instantiate based on the medium. */
function artworkFromPlain(o) {
  const kind = (o.kind || o.category || '').toLowerCase();
  if (kind === 'painting') return new Painting(o);
  if (kind === 'sketch')   return new Sketch(o);
  if (kind === 'pen')      return new PenWork(o);

  // Infer from medium when not specified (used by the seed catalog).
  const m = (o.medium || '').toLowerCase();
  if (['pencil', 'colorpencil', 'drypastel', 'oilpastel'].includes(m)) return new Sketch(o);
  if (['pen'].includes(m))                                              return new PenWork(o);
  return new Painting(o);
}

/* ------- export -------- */
window.GalleryModels = {
  Role, ArtworkStatus, Size,
  User, Admin, Curator, Visitor, userFromPlain,
  Artwork, Painting, Sketch, PenWork, artworkFromPlain,
  CsvSerializable, Authenticatable, Reportable,
};
})();
