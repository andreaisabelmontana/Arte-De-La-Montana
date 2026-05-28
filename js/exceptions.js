/* exceptions.js -------------------------------------------------------------
 * Mirrors the Java custom-exception hierarchy from the syllabus
 * (Session 18 "Exception Handling"). Every domain failure is a subclass of
 * GalleryException so UI controllers can use one `catch (GalleryException)`
 * per layer just like a Java service.
 * ------------------------------------------------------------------------- */
'use strict';

class GalleryException extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'GalleryException';
    if (cause) this.cause = cause;
  }
  /** Java-style toString — useful in `Toast.error(ex)`. */
  toString() { return `${this.name}: ${this.message}`; }
}

class AuthenticationException extends GalleryException {
  constructor(message = 'Invalid credentials') {
    super(message);
    this.name = 'AuthenticationException';
  }
}

class AuthorizationException extends GalleryException {
  constructor(message = 'You are not authorised to perform this action') {
    super(message);
    this.name = 'AuthorizationException';
  }
}

class ValidationException extends GalleryException {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationException';
    this.field = field || null;
  }
}

class NotFoundException extends GalleryException {
  constructor(entity, id) {
    super(`${entity} with id "${id}" was not found`);
    this.name = 'NotFoundException';
    this.entity = entity;
    this.id = id;
  }
}

class DuplicateException extends GalleryException {
  constructor(entity, key) {
    super(`${entity} with key "${key}" already exists`);
    this.name = 'DuplicateException';
    this.entity = entity;
    this.key = key;
  }
}

class CsvFormatException extends GalleryException {
  constructor(message, lineNumber) {
    super(`CSV line ${lineNumber || '?'}: ${message}`);
    this.name = 'CsvFormatException';
    this.lineNumber = lineNumber || null;
  }
}

class DataAccessException extends GalleryException {
  constructor(message, cause) {
    super(message, cause);
    this.name = 'DataAccessException';
  }
}

/* Expose to the rest of the scripts (single global namespace pattern). */
window.GalleryEx = {
  GalleryException,
  AuthenticationException,
  AuthorizationException,
  ValidationException,
  NotFoundException,
  DuplicateException,
  CsvFormatException,
  DataAccessException,
};
