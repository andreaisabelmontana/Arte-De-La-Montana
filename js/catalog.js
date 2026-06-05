/* catalog.js ----------------------------------------------------------------
 * Seed data parsed from the asset filenames in ./assets/.
 * Naming convention is {title}-{year}-{medium}-{size}.png — we parse it once
 * and dump the result into LocalStorage on first run.
 * ------------------------------------------------------------------------- */
'use strict';
(function () {

/* Each row is the literal filename in /assets — the asset filename is the
 * source of truth for title/year/medium/size. */
const ASSET_FILES = [
  '2000-2026-acrylic-large.jpg',
  'angel-2021-pencil-medium.jpg',
  'awesome-2026-acrylic-small.jpg',
  'barcelona-2024-acrylic-large.jpg',
  'bogota-2026-acrylic-large.jpg',
  'caracas-skyline-2026-acrylicpen-medium.jpg',
  'chamo-2026-acrylic-large.jpg',
  'colorin-2021-oil-large.jpg',
  'feriado-2025-pen-medium.jpg',
  'fleurs-2026-acrylic-large.jpg',
  'ganado-2026-pen-medium.jpg',
  'grocery-2023-oilpastel-medium.jpg',
  'jazz-2026-acylic-medium.jpg',
  'ladybug-2020-colorpencil-small.jpg',
  'laia-2020-pencil-medium.jpg',
  'luck-2021-oilpastel-medium.jpg',
  'men-2021-drypastel-medium.jpg',
  'mimir-2021-drypastel-medium.jpg',
  'newspaper-2021-oilpastel-medium.jpg',
  'peach-2026-alcohol-medium.jpg',
  'pescadito-2026-acrylic-medium.jpg',
  'porto-2025-ceramic-medium.jpg',
  'portugal-2022-acylic-small.jpg',
  'run-2026-alcohol-medium.jpg',
  'san-fransisco-2022-acrylic-small.jpg',
  'simona-2026-acrylic-large.jpg',
  'sloth-2023-acrylic-small.jpg',
  'tokyo-2023-pen-medium.jpg',
  'venezia-2020-oil-extralarge.jpg',
  'vtech-2026-alcohol-medium.jpg',
  'wizard-2021-colorpencil-small.jpg',
  'zahra-2023-oil-medium.jpg',
];

/* Cosmetic mappings — pretty title + a short description tailored to each piece. */
const TITLE_FIXES = {
  '2000': 'Two Thousand',
  'san-fransisco': 'San Francisco',
  'porto': 'Porto',
  'vtech': 'VTech',
  'feriado': 'Feriado',
  'colorin': 'Colorín',
  'simona': 'Simona',
  'chamo': 'Chamo',
  'mimir': 'Mimir',
  'pescadito': 'Pescadito',
  'fleurs': 'Fleurs',
  'venezia': 'Venezia',
};
const MEDIUM_FIXES = {
  'acylic':      'acrylic',
  'acrylicpen':  'acrylic + pen',
  'colorpencil': 'color-pencil',
  'oilpastel':   'oil-pastel',
  'drypastel':   'dry-pastel',
};
const DESCRIPTIONS = {
  'caracas-skyline': 'Caracas skyline in a cartoon/comic style — acrylic and pen mixed media, medium canvas, with El Ávila rising behind the city.',
  'venezia':       'A wide oil composition of the Venetian lagoon, the largest piece in the catalogue.',
  'barcelona':     'Modernist façade study captured during a residency in Spain.',
  'bogota':        'High-altitude rooftops painted from sketches taken in Bogotá, 2026.',
  'tokyo':         'Pen-and-ink figures from a sketch trip through Tokyo.',
  'porto':         'Ceramic-effect impasto inspired by Portuguese azulejos.',
  'fleurs':        'Acrylic botanical study, large canvas.',
  'jazz':          'Improvised acrylic mark-making to a Bill Evans record.',
  'sloth':         'Small acrylic creature study; one of the recurring animal subjects.',
  'ladybug':       'Color-pencil close-up; deliberately oversaturated reds.',
  'wizard':        'A small color-pencil portrait piece, 2021.',
  'angel':         'Graphite portrait in HB / 2B pencil, medium A3.',
  'laia':          'Pencil portrait of a friend; soft edges, high-key lighting.',
  'mimir':         'Dry pastel sleep study, 2021.',
  'men':           'Dry pastel figure work; quick gestural drawing.',
  'colorin':       'Oil composition exploring complementary colour palettes.',
  'newspaper':     'Oil-pastel collage referencing newspaper textures.',
  'grocery':       'Still-life of a grocery counter, oil pastel.',
  'luck':          'Lucky charms still life in oil pastel.',
  'peach':         'Alcohol-marker fruit study with cool shadows.',
  'run':           'Movement study in alcohol marker — runners mid-stride.',
  'awesome':       'Acrylic word study, small canvas.',
  '2000':          'Acrylic typography piece celebrating the millennium.',
  'feriado':       'Pen-on-paper holiday scene.',
  'ganado':        'Pen study of cattle, A4.',
  'pescadito':     'Acrylic fish piece, palette knife on canvas.',
  'simona':        'Large acrylic portrait of Simona, 2026.',
  'chamo':         'Acrylic study of a Venezuelan chamo (kid) on the street.',
  'portugal':      'Small acrylic landscape, Portuguese coastline.',
  'san-fransisco': 'Small acrylic of the San Francisco skyline.',
  'vtech':         'Alcohol-marker tech-toy study.',
  'zahra':         'Oil portrait, medium canvas.',
  'sloth-2023':    'Small acrylic creature study.',
};

const TAG_MAP = {
  acrylic:        ['acrylic', 'canvas', 'paint'],
  'acrylic + pen': ['acrylic', 'pen', 'mixed-media', 'canvas'],
  oil:            ['oil', 'canvas'],
  alcohol:        ['marker', 'paper'],
  pen:            ['pen', 'ink', 'paper'],
  pencil:         ['pencil', 'paper'],
  'oil-pastel':   ['pastel', 'paper'],
  'dry-pastel':   ['pastel', 'paper'],
  'color-pencil': ['color', 'pencil', 'paper'],
  ceramic:        ['ceramic', 'impasto'],
};

function titleCase(slug) {
  if (TITLE_FIXES[slug]) return TITLE_FIXES[slug];
  return slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

/* A few asset files predate the {title}-{year}-{medium}-{size}.png convention. */
const SPECIAL = {
};

/** Parse a filename like `caracas-2026-alcohol-medium.png` into seed data. */
function parseFilename(name) {
  const special = SPECIAL[name];
  if (special) {
    return Object.assign({}, special, {
      imageUrl:    `assets/${name}`,
      status:      'available',
      description: `${special.title} — ${special.medium}, ${special.size}, ${special.year}.`,
      tags:        TAG_MAP[special.medium] || [special.medium],
    });
  }
  const base = name.replace(/\.(png|jpe?g|webp|gif)$/i, '');
  const parts = base.split('-');
  // last 3 components are year, medium, size
  const size   = parts.pop();
  const medRaw = parts.pop();
  const year   = Number(parts.pop());
  const slug   = parts.join('-');
  const medium = MEDIUM_FIXES[medRaw] || medRaw;
  const tags   = (TAG_MAP[medium] || [medium]).concat(slug);
  return {
    title:       titleCase(slug),
    year,
    medium,
    size,
    imageUrl:    `assets/${name}`,
    status:      'available',
    description: DESCRIPTIONS[slug] || DESCRIPTIONS[`${slug}-${year}`] || `${titleCase(slug)} — ${medium}, ${size}, ${year}.`,
    tags,
  };
}

const SEED_ARTWORKS = ASSET_FILES.map(parseFilename);

/* Demo users — passwords are hashed on first seed. */
const SEED_USERS = [
  { role: 'ADMIN',   username: 'admin',   password: 'admin123',   fullName: 'Pelusa Montaña', email: 'admin@artedelamontana.example' },
  { role: 'CURATOR', username: 'curator', password: 'curator123', fullName: 'Curator Demo',   email: 'curator@artedelamontana.example' },
  { role: 'VISITOR', username: 'visitor', password: 'visitor123', fullName: 'Visitor Demo',   email: 'visitor@artedelamontana.example' },
];

/* Alternate views — keyed by a piece's imageUrl. When present, the detail
 * modal offers a toggle between the main image and these alternates. Kept here
 * (rather than on the Artwork model) so it survives without touching the OOP
 * persistence layer. */
const ALT_VIEWS = {
  'assets/caracas-skyline-2026-acrylicpen-medium.jpg': [
    { imageUrl: 'assets/caracas-skyline-2026-acrylicpen-medium.jpg', label: 'Colour' },
    { imageUrl: 'assets/caracas-skyline-stencil.jpg',                label: 'Pen stencil' },
  ],
};

/* Narratives behind selected works — keyed by slug (the part of the filename
 * before the year). Leave a piece out, or set it to '', to show no story.
 * Fill these in over time; they render under the description in the detail
 * modal and are great for visitors and SEO. */
const STORIES = {
  'caracas-skyline': '',
  // 'venezia': 'The story behind this piece…',
};

/* Bump this whenever the seed catalogue changes (pieces added/removed/renamed)
 * so returning visitors get the updated gallery instead of a stale cached one. */
const CATALOG_VERSION = '2026-06-05-1';

window.GalleryCatalog = { SEED_ARTWORKS, SEED_USERS, ALT_VIEWS, STORIES, CATALOG_VERSION };
})();
