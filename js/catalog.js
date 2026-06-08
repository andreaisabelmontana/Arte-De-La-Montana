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
  'barcelona-2024-acrylic-large.jpg',
  'bogota-2026-acrylic-large.jpg',
  'caracas-skyline-2026-watercolor-large.jpg',
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
  'acrylicpen':  'acrylic and pen',
  'colorpencil': 'colour pencil',
  'oilpastel':   'oil pastel',
  'drypastel':   'dry pastel',
  'watercolor':  'watercolour',
};
const DESCRIPTIONS = {
  'caracas-skyline': 'The Caracas skyline beneath El Ávila, the green mountain that watches over the city. The piece lives in three renderings you can switch between, a clean pen line, a bold colour version and a soft watercolour, each carrying the same towers and the Polar and Nescafé signs locals know by heart.',
  'venezia':       'A wide oil view of the Venetian lagoon, water and faded façades meeting in low light. The largest piece in the catalogue.',
  'barcelona':     'The city built from its own colour and clamour, letters tangled around a watching eye. A keepsake of time spent in Spain.',
  'bogota':        'Bogotá spelled out in bright stacked letters, loud and playful, a postcard from the high Andean capital.',
  'tokyo':         'A quiet station platform in pen, commuters and signage caught in the clean lines of a travel sketch.',
  'porto':         'Two blue fish on a white ceramic tile, a nod to Portuguese azulejos and the thick glaze of fired clay.',
  'fleurs':        'A homage to the old Neuilly sur Seine flower festival poster, dancers and roses crowded into warm acrylic.',
  'jazz':          'A band of crocodiles lost in their playing, horns and stray notes drifting across the canvas. Acrylic improvised to a jazz record.',
  'sloth':         'A sloth stretched along a branch, slow and content, a small acrylic from the recurring animal cast.',
  'ladybug':       'A ladybug seen up close in colour pencil, its reds pushed past life into something jewel bright.',
  'angel':         'A winged figure at rest, graphite worked from the softest greys down to deep shadow.',
  'laia':          'A girl in a sun hat and swimsuit, a pencil portrait of high soft light and gentle edges.',
  'mimir':         'A girl curled on a staircase, caught somewhere between rest and daydream, in dry pastel.',
  'men':           'A male figure seen from behind, hands at the neck, a dry pastel study of weight and muscle.',
  'colorin':       'A hummingbird ablaze with colour, oil built up in small jewelled strokes. The title nods to the bright birds of Venezuela.',
  'newspaper':     'A folded paper boat adrift on swirling water, oil pastel, small and hopeful against the current.',
  'grocery':       'Two teddy bears steering a cart piled high with groceries, oil pastel full of warmth and happy clutter.',
  'luck':          'A girl in red seated on worn steps, ladybugs scattered around her like small tokens of luck. Oil pastel.',
  'peach':         'A white cat asleep on a bench, alcohol marker with cool shadows and soft, drowsy fur.',
  'run':           'A baseball moment, the batter set and the field alive, drawn quickly in alcohol marker.',
  '2000':          'A candy bright cityscape packed with towers, signs and tiny figures, a millennium piece bursting with acrylic energy.',
  'feriado':       'A holiday plaza in pen, a bandstand among palms with families strolling on a day off.',
  'ganado':        'Two figures leaning on a rail above the pens, watching the cattle at a country fair. Pen lifted with light colour.',
  'pescadito':     'A little fish and a few lemons on striped cloth, a quiet acrylic still life with a kitchen calm.',
  'simona':        'An oil portrait of Simona, a tortoiseshell cat whose coat is a patchwork of warm darks.',
  'chamo':         'A bear hugging a carton of Polar against a burst of yellow rays, a fond acrylic wink at Venezuelan street life.',
  'portugal':      'A teddy bear in a pink sun hat with pastel houses behind it, a small acrylic souvenir of the Portuguese coast.',
  'san-fransisco': 'Two teddy bears at a picnic beneath the Golden Gate, a small acrylic where the great landmark turns tender.',
  'vtech':         'A child bent over a toy laptop, lost in play, alcohol marker. A soft look at the very first screens.',
  'zahra':         'An oil portrait of baby Zahra asleep on a dark sofa, all soft weight and quiet.',
  'sloth-2023':    'A small acrylic creature study, one of the recurring animal subjects.',
};

const TAG_MAP = {
  acrylic:            ['acrylic', 'canvas', 'paint'],
  'acrylic and pen':  ['acrylic', 'pen', 'mixed media', 'canvas'],
  watercolour:        ['watercolour', 'pen', 'paper'],
  oil:                ['oil', 'canvas'],
  alcohol:            ['marker', 'paper'],
  pen:                ['pen', 'ink', 'paper'],
  pencil:             ['pencil', 'paper'],
  'oil pastel':       ['pastel', 'paper'],
  'dry pastel':       ['pastel', 'paper'],
  'colour pencil':    ['colour', 'pencil', 'paper'],
  ceramic:            ['ceramic', 'impasto'],
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
  'assets/caracas-skyline-2026-watercolor-large.jpg': [
    { imageUrl: 'assets/caracas-skyline-2026-watercolor-large.jpg', label: 'Watercolour' },
    { imageUrl: 'assets/caracas-skyline-comic.jpg',                  label: 'Colour' },
    { imageUrl: 'assets/caracas-skyline-stencil.jpg',                label: 'Pen stencil' },
  ],
};

/* Narratives behind selected works — keyed by slug (the part of the filename
 * before the year). Leave a piece out, or set it to '', to show no story.
 * Fill these in over time; they render under the description in the detail
 * modal and are great for visitors and SEO. */
const STORIES = {
  'caracas-skyline': 'One skyline drawn three ways. The pen study came first, every tower and sign set down by hand, then the same scene was carried into colour and finally into watercolour. Use the buttons under the image to move between them.',
  // 'venezia': 'The story behind this piece…',
};

/* Bump this whenever the seed catalogue changes (pieces added/removed/renamed)
 * so returning visitors get the updated gallery instead of a stale cached one. */
const CATALOG_VERSION = '2026-06-08-3';

window.GalleryCatalog = { SEED_ARTWORKS, SEED_USERS, ALT_VIEWS, STORIES, CATALOG_VERSION };
})();
