# Arte de la Montaña

A browser-only gallery site for Pelusa Montaña's painting catalogue. Three
sections — **Gallery**, **About**, **Order** — built on top of the Java OOP
design from the CP2 syllabus (Sessions 10–20), faithfully ported to ES2022
classes so the site can be hosted on GitHub Pages with no backend.

## Sections

- **Gallery** — every piece in `assets/` shown whole in a masonry layout
  (no cropping). Click any tile to see the medium, year, size, description
  and — where present — an alternate view (e.g. a pen-stencil version) and
  the story behind the work, and to start an enquiry for that piece.
- **About** — the studio's story, with the self-portraits, comic-life print,
  design notes, and signature plate.
- **Order** — fill in your details, pick the pieces you'd like to enquire
  about, and submit. Enquiries are stored in your browser so you can come
  back to them later.

## Run locally

```bash
# from this folder
python -m http.server 8000
# → http://localhost:8000
```

## Deploy to GitHub Pages

1. Push this folder to the `main` branch of a GitHub repo.
2. Settings → Pages → Source: `main` / root → Save.
3. The `.nojekyll` file is included so Pages serves the JS as-is.

## Java OOP concepts → JavaScript mapping

The UI is intentionally lean, but the data layer mirrors the syllabus:

| Java syllabus session                     | Where it lives |
|-------------------------------------------|----------------|
| Encapsulation (Session 13)                | `js/models.js` — private `#` fields, validated setters |
| Inheritance (Session 14)                  | `Artwork → Painting / Sketch / PenWork`, `User → Admin / Curator / Visitor` |
| Polymorphism (Session 15)                 | `category()`, `displayLabel()`, `toCsvRow()` overridden per subclass |
| Abstraction & interfaces (Session 16)     | `Authenticatable`, `Reportable<K,V>`, `CsvSerializable`, `Dao<T,ID>` |
| Exception handling (Session 18)           | `js/exceptions.js` — `GalleryException` checked hierarchy |
| File I/O (Chapter 14)                     | `services.js → CsvService` (RFC-4180 quoted-field aware) |
| Persistence                               | `js/dao.js → LocalStorageDao` (drop-in for a JDBC DAO) |

## File layout

```
ArteDeLaMontana/
├── index.html       # 3-section SPA
├── .nojekyll
├── README.md
├── assets/          # all 54 source images (used somewhere on the site)
├── css/styles.css
└── js/
    ├── exceptions.js
    ├── models.js
    ├── dao.js
    ├── services.js
    ├── catalog.js   # seed data parsed from asset filenames
    └── app.js       # 3-view router + Order form
```
