"""
Static-site generator for Arte de la Montaña.

Reads PNGs from ./assets and ./assets(2), parses artwork filenames the same
way ArtworkService.java does, and writes a static site to ./docs/ suitable for
GitHub Pages. Buyer inquiries open the user's email client (mailto:).
"""

from __future__ import annotations

import html
import re
import shutil
from pathlib import Path
from typing import NamedTuple
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "docs"
INQUIRY_EMAIL = "andreaisabelmontana@gmail.com"

FILENAME_RE = re.compile(
    r"^(?P<title>[a-z0-9-]+?)-(?P<year>\d{4})-(?P<medium>[a-z]+)-(?P<size>small|medium|large|extralarge)\.png$"
)

NON_ARTWORK = {
    "andean-bear-icon.png", "brown-layout.png", "buttons-example.png",
    "caracas-duplicate.png", "comic-life.png", "cream-layout.png",
    "footer.png", "graffiti-me-icon.png", "graffiti-wallpaper.png",
    "landing.png", "mafalda-1.png", "mafalda-2.png", "mafalda-3.png",
    "mafalda-4.png", "self-portrait-gallery.png",
    "self-portrait-stencil.png", "signature.png", "subtitle.png",
    "title.png", "website-main-title.png", "white-layout.png",
    "white-square-layout.png", "yellow-wallpaper.png",
    "yellow-watercolor.png",
}

CATEGORY_LABELS = {
    "PAINTINGS": "Paintings",
    "DRAWINGS": "Drawings",
    "PASTELS": "Pastels",
    "MARKERS": "Markers",
    "CERAMICS": "Ceramics",
}
CATEGORY_ORDER = ["PAINTINGS", "DRAWINGS", "PASTELS", "MARKERS", "CERAMICS"]


class Artwork(NamedTuple):
    slug: str
    title: str
    year: str
    medium: str
    size: str
    size_key: str
    filename: str
    category: str


def normalize_medium(m: str) -> str:
    return {
        "acylic": "acrylic",
        "oilpastel": "oil pastel",
        "drypastel": "dry pastel",
        "colorpencil": "colour pencil",
    }.get(m, m)


def categorize(medium: str) -> str:
    return {
        "acrylic": "PAINTINGS",
        "oil": "PAINTINGS",
        "pencil": "DRAWINGS",
        "colour pencil": "DRAWINGS",
        "pen": "DRAWINGS",
        "oil pastel": "PASTELS",
        "dry pastel": "PASTELS",
        "alcohol": "MARKERS",
        "ceramic": "CERAMICS",
    }.get(medium, "PAINTINGS")


def prettify(raw: str) -> str:
    parts = [p for p in raw.split("-") if p]
    return " ".join(p[0].upper() + p[1:] for p in parts)


def prettify_size(s: str) -> str:
    return "Extra large" if s == "extralarge" else s[0].upper() + s[1:]


def gather_assets() -> dict[str, Path]:
    """Union of assets/ and assets(2)/, assets(2) wins on conflict."""
    files: dict[str, Path] = {}
    for folder_name in ("assets", "assets(2)"):
        folder = ROOT / folder_name
        if not folder.exists():
            continue
        for p in folder.iterdir():
            if p.is_file():
                files[p.name] = p
    return files


def parse_artworks(files: dict[str, Path]) -> list[Artwork]:
    out: list[Artwork] = []
    for name in sorted(files.keys()):
        if name in NON_ARTWORK:
            continue
        m = FILENAME_RE.match(name)
        if not m:
            continue
        medium = normalize_medium(m.group("medium"))
        size_key = m.group("size")
        out.append(Artwork(
            slug=name[:-4],  # drop .png
            title=prettify(m.group("title")),
            year=m.group("year"),
            medium=medium,
            size=prettify_size(size_key),
            size_key=size_key,
            filename=name,
            category=categorize(medium),
        ))
    out.sort(key=lambda a: (-int(a.year), a.title))
    return out


def by_category(artworks: list[Artwork]) -> dict[str, list[Artwork]]:
    grouped: dict[str, list[Artwork]] = {c: [] for c in CATEGORY_ORDER}
    for a in artworks:
        grouped[a.category].append(a)
    return {k: v for k, v in grouped.items() if v}


# ---------- templates ----------

def nav_html(active: str, prefix: str = "") -> str:
    """`prefix` is `../` when the page is one folder deep (artwork/*.html)."""
    def link(href: str, label: str, key: str) -> str:
        cls = ' class="active"' if active == key else ""
        return f'<a href="{prefix}{href}"{cls}>{label}</a>'
    return f"""
<header class="site-header">
  <a href="{prefix}index.html" class="brand" aria-label="Arte de la Montaña — home">
    <img src="{prefix}assets/website-main-title.png" alt="Arte de la Montaña">
  </a>
  <nav class="site-nav">
    {link('index.html',      'Home',       'home')}
    {link('collection.html', 'Collection', 'collection')}
    {link('andrea.html',     'Andrea',     'andrea')}
    {link('sketches.html',   'Sketches',   'sketches')}
    {link('customize.html',  'Customize',  'customize')}
  </nav>
</header>
""".strip()


def footer_html(prefix: str = "") -> str:
    return f"""
<footer class="site-footer">
  <img src="{prefix}assets/footer.png" alt="">
  <p class="quiet">© Arte de la Montaña</p>
</footer>
""".strip()


def page(title: str, body: str, prefix: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(title)}</title>
  <link rel="stylesheet" href="{prefix}css/style.css">
  <link rel="icon" type="image/png" href="{prefix}assets/andean-bear-icon.png">
</head>
<body>
{body}
</body>
</html>
"""


def render_home(grouped: dict[str, list[Artwork]]) -> str:
    sections = []
    for cat in CATEGORY_ORDER:
        items = grouped.get(cat)
        if not items:
            continue
        cards = "\n".join(
            f"""        <a href="artwork/{a.slug}.html" class="card size-{a.size_key}">
          <img src="assets/{a.filename}" alt="{html.escape(a.title)}">
          <div class="caption">
            <span class="title">{html.escape(a.title)}</span>
            <span class="meta"><span>{a.year}</span> · <span>{html.escape(a.medium)}</span></span>
          </div>
        </a>"""
            for a in items
        )
        sections.append(f"""    <section class="category">
      <h2>{CATEGORY_LABELS[cat]}</h2>
      <div class="grid">
{cards}
      </div>
    </section>""")

    body = f"""{nav_html('home')}

<section class="hero">
  <img class="hero-img" src="assets/landing.png" alt="">
  <img class="hero-title" src="assets/website-main-title.png" alt="Arte de la Montaña">
</section>

<main class="home">
{chr(10).join(sections)}
</main>

{footer_html()}"""
    return page("Arte de la Montaña", body)


def render_collection(artworks: list[Artwork]) -> str:
    cards = "\n".join(
        f"""    <a href="artwork/{a.slug}.html" class="card">
      <img src="assets/{a.filename}" alt="{html.escape(a.title)}">
      <div class="caption"><span class="title">{html.escape(a.title)}</span></div>
    </a>"""
        for a in artworks
    )
    body = f"""{nav_html('collection')}

<main class="collection">
  <h1 class="brushed">Collection</h1>
  <div class="grid dense">
{cards}
  </div>
</main>

{footer_html()}"""
    return page("Collection — Arte de la Montaña", body)


def render_andrea() -> str:
    body = f"""{nav_html('andrea')}

<main class="andrea">
  <section class="intro">
    <img class="comic" src="assets/comic-life.png" alt="">
    <div class="signature-block">
      <img class="signature" src="assets/signature.png" alt="Andrea">
      <p>Art has always been how I make sense of things before I have the words for them. Every painting is a question I didn't know I was asking.</p>
      <p>Working across acrylics, oils, and pencil, to express cultural symbolism, cityscapes, and pop art. It is the language of the soul, and how I make sense of this beautiful world.</p>
    </div>
  </section>

  <section class="bio">
    <div class="bio-text">
      <p>Andrea Montaña Lamus is a Computer Science and Artificial Intelligence student, and a visual artist with roots in Colombia and Venezuela. Her art portfolio was accepted into Parsons School of Design, developed under the mentorship of Lina Sinisterra, recognized as a top 50 AP Art instructor by the CollegeBoard.</p>
    </div>
    <img class="bio-photo" src="assets/self-portrait-gallery.png" alt="Andrea in the gallery">
  </section>
</main>

{footer_html()}"""
    return page("Andrea — Arte de la Montaña", body)


def render_sketches() -> str:
    body = f"""{nav_html('sketches')}

<main class="sketches">
  <h1 class="brushed">Sketches</h1>
  <p class="quiet centered">Studies, drafts, and works in progress.</p>
  <div class="sketches-grid">
    <p class="quiet centered">More sketches coming soon.</p>
  </div>
</main>

{footer_html()}"""
    return page("Sketches — Arte de la Montaña", body)


def render_customize() -> str:
    subject = quote("Commission inquiry — Arte de la Montaña")
    body_template = quote(
        "Hi Andrea,\n\n"
        "I'd love to commission a piece. Here's what I have in mind:\n\n"
        "Subject:\n"
        "Mood:\n"
        "Medium (acrylic / oil / pencil / etc.):\n"
        "Dimensions:\n"
        "Where it will live:\n\n"
        "Thanks!\n"
    )
    mailto = f"mailto:{INQUIRY_EMAIL}?subject={subject}&body={body_template}"

    body = f"""{nav_html('customize')}

<main class="customize">
  <section class="banner-yellow">
    <h1 class="brushed">Customize</h1>
    <p>Life's a climb. But the view is great.</p>
  </section>

  <section class="customize-form">
    <h2>Commission a piece</h2>
    <p class="quiet">Tell me what you have in mind — subject, mood, medium, dimensions, where it will live. Click below to open your email app with a template, or write to <a href="mailto:{INQUIRY_EMAIL}">{INQUIRY_EMAIL}</a>.</p>
    <p><a href="{mailto}" class="btn">Send me an email</a></p>
  </section>

  <section class="customize-examples">
    <img src="assets/mafalda-1.png" alt="">
    <img src="assets/mafalda-2.png" alt="">
    <img src="assets/mafalda-3.png" alt="">
    <img src="assets/mafalda-4.png" alt="">
  </section>
</main>

{footer_html()}"""
    return page("Customize — Arte de la Montaña", body)


def render_artwork(a: Artwork) -> str:
    subject = quote(f'Inquiry about "{a.title}"')
    body_template = quote(
        f'Hi Andrea,\n\n'
        f'I\'m interested in "{a.title}" ({a.year}, {a.medium}, {a.size}).\n\n'
        f'Could you share the price and next steps?\n\n'
        f'Thanks!\n'
    )
    mailto = f"mailto:{INQUIRY_EMAIL}?subject={subject}&body={body_template}"

    body = f"""{nav_html('', prefix='../')}

<main class="artwork-detail">
  <div class="frame">
    <img src="../assets/{a.filename}" alt="{html.escape(a.title)}">
  </div>
  <aside class="info">
    <h1>{html.escape(a.title)}</h1>
    <p class="meta">
      <span>{a.year}</span> ·
      <span>{html.escape(a.medium)}</span> ·
      <span>{html.escape(a.size)}</span>
    </p>
    <a href="{mailto}" class="btn">Inquire to purchase</a>
    <p class="quiet small">All works are originals. Inquire by email and Andrea will reply with the price and a secure payment link.</p>
  </aside>
</main>

{footer_html(prefix='../')}"""
    return page(f"{a.title} — Arte de la Montaña", body, prefix="../")


# ---------- driver ----------

def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    (OUT / "assets").mkdir()
    (OUT / "css").mkdir()
    (OUT / "artwork").mkdir()

    # Copy all images (union of both asset folders)
    files = gather_assets()
    for name, src in files.items():
        shutil.copy2(src, OUT / "assets" / name)
    print(f"copied {len(files)} images")

    # Copy CSS
    css_src = ROOT / "java" / "src" / "main" / "resources" / "static" / "css" / "style.css"
    shutil.copy2(css_src, OUT / "css" / "style.css")

    # Parse artworks and render pages
    artworks = parse_artworks(files)
    print(f"parsed {len(artworks)} artworks")
    grouped = by_category(artworks)

    (OUT / "index.html").write_text(render_home(grouped), encoding="utf-8")
    (OUT / "collection.html").write_text(render_collection(artworks), encoding="utf-8")
    (OUT / "andrea.html").write_text(render_andrea(), encoding="utf-8")
    (OUT / "sketches.html").write_text(render_sketches(), encoding="utf-8")
    (OUT / "customize.html").write_text(render_customize(), encoding="utf-8")
    for a in artworks:
        (OUT / "artwork" / f"{a.slug}.html").write_text(render_artwork(a), encoding="utf-8")

    # Disable Jekyll on GitHub Pages so it serves files as-is.
    (OUT / ".nojekyll").write_text("", encoding="utf-8")

    print(f"wrote site to {OUT}")


if __name__ == "__main__":
    main()
