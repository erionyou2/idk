// Hand-drawn 13x13 pixel-art icons and markers. Each grid row is a string; the palette
// maps a character to an RGB(A) colour. '.' is transparent.

const P = {
  W: '#ffffff',
  K: '#1a1a1a',
  G: '#6f6f6f',
  D: '#3a3a3a',
  R: '#e03c2f',
  Y: '#ffe25a',
  B: '#3f76e4',
  N: '#8b5a2b',
  T: '#c8a464',
  L: '#7ab648',
  C: '#4be2f0',
  E: '#7fd9e6',
  S: '#b98d6c',
  H: '#3b2a17',
  M: '#5c3b2e',
  V: '#4a3aa3',
  O: '#c47a33',
  I: '#2e8b57',
};

export const ICONS = {
  search: [
    '.....KKKK....',
    '...KKWWWWKK..',
    '..KWW....WWK.',
    '..KW......WK.',
    '.KW........WK',
    '.KW........WK',
    '..KW......WK.',
    '..KWW....WWK.',
    '...KKWWWWKK..',
    '...NNKKKK....',
    '..NNN........',
    '.NNN.........',
    'NNN..........',
  ],
  directions: [
    'TTTTTTTTTTTTT',
    'TLLLLLLLLLLLT',
    'TLLBBLLLLLLLT',
    'TLBBBBLLLYLLT',
    'TLLBBLLLYYYLT',
    'TLLLLLLLLYLLT',
    'TLLLLRRLLLLLT',
    'TLLLLRLLLLLLT',
    'TLLLLRRRLLLLT',
    'TLLLLLLRLLLLT',
    'TLLBBLLRRLLLT',
    'TLLLLLLLLLLLT',
    'TTTTTTTTTTTTT',
  ],
  locate: [
    '....KKKKK....',
    '..KKGGGGGKK..',
    '.KGGGGGGGGGK.',
    '.KGGGGRGGGGK.',
    'KGGGGRRRGGGGK',
    'KGGGGRRRGGGGK',
    'KGGGGGWGGGGGK',
    'KGGGGWWWGGGGK',
    'KGGGGWWWGGGGK',
    '.KGGGGWGGGGK.',
    '.KGGGGGGGGGK.',
    '..KKGGGGGKK..',
    '....KKKKK....',
  ],
  plus: [
    '.............',
    '.............',
    '.....WWW.....',
    '.....WWW.....',
    '.....WWW.....',
    '..WWWWWWWWW..',
    '..WWWWWWWWW..',
    '..WWWWWWWWW..',
    '.....WWW.....',
    '.....WWW.....',
    '.....WWW.....',
    '.............',
    '.............',
  ],
  minus: [
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '..WWWWWWWWW..',
    '..WWWWWWWWW..',
    '..WWWWWWWWW..',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
  ],
  close: [
    '.............',
    '.WW.......WW.',
    '.WWW.....WWW.',
    '..WWW...WWW..',
    '...WWW.WWW...',
    '....WWWWW....',
    '.....WWW.....',
    '....WWWWW....',
    '...WWW.WWW...',
    '..WWW...WWW..',
    '.WWW.....WWW.',
    '.WW.......WW.',
    '.............',
  ],
  swap: [
    '.............',
    '....W........',
    '...WWW.......',
    '..WWWWW......',
    '....W........',
    '....W....W...',
    '....W....W...',
    '....W....W...',
    '.........W...',
    '.......WWWWW.',
    '........WWW..',
    '.........W...',
    '.............',
  ],
  play: [
    '.............',
    '...WW........',
    '...WWWW......',
    '...WWWWWW....',
    '...WWWWWWWW..',
    '...WWWWWWWWW.',
    '...WWWWWWWWWW',
    '...WWWWWWWWW.',
    '...WWWWWWWW..',
    '...WWWWWW....',
    '...WWWW......',
    '...WW........',
    '.............',
  ],
  minecart: [
    '.............',
    '.............',
    '.............',
    'K...........K',
    'KK.........KK',
    'KGGGGGGGGGGGK',
    'KGGGGGGGGGGGK',
    'KGGGGGGGGGGGK',
    'KGGGGGGGGGGGK',
    '.KKKKKKKKKKK.',
    '..KDK...KDK..',
    '.KDDDK.KDDDK.',
    '..KDK...KDK..',
  ],
  horse: [
    '.............',
    '..NN.........',
    '..NNNN.......',
    '..NNNNNNNNN..',
    '...HNNNNNNNN.',
    '....NNNNNNNNN',
    '....NNNNNNNN.',
    '....NNNNNNNN.',
    '....NN....NN.',
    '....NN....NN.',
    '....NN....NN.',
    '....HH....HH.',
    '.............',
  ],
  boots: [
    '.............',
    '....MMMM.....',
    '....MMMM.....',
    '....MMMM.....',
    '....MMMM.....',
    '....MMMM.....',
    '....MMMM.....',
    '....MMMMMM...',
    '....MMMMMMMM.',
    '..MMMMMMMMMM.',
    '..HHHHHHHHHH.',
    '..HHHHHHHHHH.',
    '.............',
  ],
  flag: [
    '.............',
    '..K..........',
    '..KRRRRRRR...',
    '..KRWWRRWWR..',
    '..KRWWRRWWR..',
    '..KRRRWWRRR..',
    '..KRRRWWRRR..',
    '..KRWWRRWWR..',
    '..KRRRRRRR...',
    '..K..........',
    '..K..........',
    '..K..........',
    '.............',
  ],
};

// Turn arrows. Right-hand versions; left is a horizontal mirror.
export const ARROWS = {
  straight: [
    '......W......',
    '.....WWW.....',
    '....WWWWW....',
    '...WWWWWWW...',
    '..WWWWWWWWW..',
    '.....WWW.....',
    '.....WWW.....',
    '.....WWW.....',
    '.....WWW.....',
    '.....WWW.....',
    '.....WWW.....',
    '.....WWW.....',
    '.............',
  ],
  slight: [
    '.............',
    '......WWWWWW.',
    '.......WWWWW.',
    '........WWWW.',
    '.......WWWWW.',
    '......WWW.WW.',
    '.....WWW..W..',
    '....WWW......',
    '....WW.......',
    '....WW.......',
    '....WW.......',
    '....WW.......',
    '.............',
  ],
  turn: [
    '.............',
    '.........W...',
    '.........WW..',
    '....WWWWWWWW.',
    '....WWWWWWWWW',
    '....WWWWWWWW.',
    '....WW...WW..',
    '....WW...W...',
    '....WW.......',
    '....WW.......',
    '....WW.......',
    '....WW.......',
    '.............',
  ],
  sharp: [
    '.............',
    '....WWWW.....',
    '....WWWW.....',
    '....WW.WW....',
    '....WW..WW...',
    '....WW...WW..',
    '....WW....WW.',
    '....WW...WWWW',
    '....WW....WWW',
    '....WW.....WW',
    '....WW.......',
    '....WW.......',
    '.............',
  ],
  uturn: [
    '.............',
    '....WWWWWW...',
    '...WWWWWWWW..',
    '...WW....WW..',
    '...WW....WW..',
    '...WW....WW..',
    '...WW..WWWWWW',
    '...WW...WWWW.',
    '...WW....WW..',
    '...WW.....W..',
    '...WW........',
    '...WW........',
    '.............',
  ],
  roundabout: [
    '.............',
    '....WWWWW....',
    '...WW...WW...',
    '..WW.....WW..',
    '..WW.....WW..',
    '..WW.....WW..',
    '..WW.....WW..',
    '...WW...WW...',
    '....WWWWW....',
    '.....WWW.....',
    '.....WWW.....',
    '.....WWW.....',
    '.............',
  ],
  merge: [
    '.............',
    '......W......',
    '.....WWW.....',
    '....WWWWW....',
    '.....WWW.....',
    '.....WWW.....',
    '....WWWWW....',
    '...WW.W.WW...',
    '..WW..W..WW..',
    '..WW..W..WW..',
    '..WW.....WW..',
    '..WW.....WW..',
    '.............',
  ],
};

export const MARKERS = {
  steve: [
    'HHHHHHHH',
    'HHHHHHHH',
    'HHSSSSHH',
    'SSSSSSSS',
    'SWVSSVWS',
    'SSSOOSSS',
    'SSMMMMSS',
    'SSSMMSSS',
  ],
  diamond: [
    '..CCCC..',
    '.CEEEEC.',
    'CEWWEEEC',
    'CEWEEEEC',
    '.CEEEEC.',
    '..CEEC..',
    '...CC...',
    '........',
  ],
  emerald: [
    '..IIII..',
    '.ILLLLI.',
    'ILWWLLLI',
    'ILWLLLLI',
    '.ILLLLI.',
    '..ILLI..',
    '...II...',
    '........',
  ],
};

/** Draws a grid onto a canvas at the given scale. Optionally mirrors horizontally. */
export function drawSprite(canvas, grid, { scale = 3, flip = false, palette = P } = {}) {
  const h = grid.length;
  const w = grid[0].length;
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grid[y][x];
      if (ch === '.') continue;
      ctx.fillStyle = palette[ch] || '#ff00ff';
      const dx = flip ? w - 1 - x : x;
      ctx.fillRect(dx * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

export function spriteCanvas(grid, opts) {
  return drawSprite(document.createElement('canvas'), grid, opts);
}

/** Picks an arrow grid for an OSRM maneuver. */
export function maneuverSprite(maneuver) {
  const type = maneuver?.type || '';
  const mod = maneuver?.modifier || '';
  const flip = mod.includes('left');
  if (type === 'arrive') return { grid: ICONS.flag, flip: false };
  if (type === 'depart') return { grid: ARROWS.straight, flip: false };
  if (type.includes('roundabout') || type === 'rotary') return { grid: ARROWS.roundabout, flip: false };
  if (type === 'merge') return { grid: ARROWS.merge, flip: false };
  if (mod === 'uturn') return { grid: ARROWS.uturn, flip };
  if (mod.startsWith('slight') || type === 'fork' || type === 'on ramp' || type === 'off ramp') {
    return { grid: ARROWS.slight, flip };
  }
  if (mod.startsWith('sharp')) return { grid: ARROWS.sharp, flip };
  if (mod === 'left' || mod === 'right') return { grid: ARROWS.turn, flip };
  return { grid: ARROWS.straight, flip: false };
}

/** Builds a DOM element for a maplibregl.Marker. */
export function makeMarkerElement(kind) {
  const el = document.createElement('div');
  el.className = `mc-marker mc-marker-${kind}`;
  const canvas = spriteCanvas(MARKERS[kind], { scale: 4 });
  el.appendChild(canvas);
  return el;
}
