// Procedurally generated 16x16 block textures, upscaled 2x so each texel is a chunky
// 2x2 screen pixel. No Mojang assets are used; every texture is drawn from noise.

const SIZE = 16;
const SCALE = 2;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(name) {
  let h = 2166136261;
  for (const c of name) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const jitter = (r, [R, G, B], amt) => {
  const d = Math.floor((r() - 0.5) * 2 * amt);
  return [R + d, G + d, B + d];
};

/** Fill every texel with the base colour or one of the variants, then jitter. */
function noise(px, r, base, variants, amt) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      px.set(x, y, jitter(r, r() < 0.55 ? base : pick(r, variants), amt));
    }
  }
}

/** Brick layout: 8x4 bricks with 1px mortar, alternate rows offset by half a brick. */
function bricks(px, r, face, mortar, amt) {
  for (let y = 0; y < SIZE; y++) {
    const row = Math.floor(y / 4);
    const offset = row % 2 ? 4 : 0;
    for (let x = 0; x < SIZE; x++) {
      const bx = (x + offset) % 8;
      const isMortar = y % 4 === 3 || bx === 7;
      px.set(x, y, isMortar ? jitter(r, mortar, 2) : jitter(r, face, amt));
    }
  }
}

const RECIPES = {
  grass: (px, r) => noise(px, r, [94, 157, 52], [[83, 140, 45], [104, 170, 60], [76, 130, 40], [110, 178, 64]], 6),
  grass_plains: (px, r) => noise(px, r, [126, 172, 66], [[112, 158, 58], [138, 184, 74], [120, 166, 60]], 5),
  moss: (px, r) => noise(px, r, [74, 128, 48], [[62, 112, 40], [86, 142, 56], [70, 120, 44]], 5),
  grass_bright: (px, r) => noise(px, r, [110, 190, 72], [[98, 176, 64], [122, 204, 80], [104, 184, 68]], 5),
  dirt: (px, r) => noise(px, r, [134, 96, 67], [[121, 85, 58], [150, 108, 74], [112, 80, 54], [142, 102, 70]], 6),
  dirt_path: (px, r) => noise(px, r, [150, 124, 72], [[140, 114, 64], [160, 134, 80], [146, 120, 68]], 4),
  gravel: (px, r) => noise(px, r, [131, 127, 124], [[150, 147, 143], [112, 108, 105], [160, 143, 132], [120, 120, 118]], 6),
  sand: (px, r) => noise(px, r, [219, 207, 163], [[210, 198, 154], [226, 214, 172], [204, 192, 148]], 4),
  mud: (px, r) => noise(px, r, [62, 58, 48], [[54, 50, 42], [72, 66, 54], [58, 56, 46]], 4),
  netherrack: (px, r) => noise(px, r, [112, 42, 42], [[96, 32, 32], [130, 52, 52], [86, 26, 26]], 6),
  obsidian: (px, r) => noise(px, r, [22, 17, 34], [[36, 28, 56], [16, 12, 26], [30, 22, 46]], 3),
  bedrock: (px, r) => noise(px, r, [85, 85, 85], [[40, 40, 40], [130, 130, 130], [60, 60, 60], [110, 110, 110]], 10),
  snow: (px, r) => noise(px, r, [240, 240, 248], [[232, 232, 242], [248, 248, 255]], 4),

  stone: (px, r) => {
    noise(px, r, [125, 125, 125], [[115, 115, 115], [135, 135, 135], [108, 108, 108], [142, 142, 142]], 4);
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(r() * SIZE);
      const y = Math.floor(r() * SIZE);
      const len = 2 + Math.floor(r() * 2);
      for (let k = 0; k < len; k++) px.set((x + k) % SIZE, y, [98, 98, 98]);
    }
  },

  smooth_stone: (px, r) => {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        px.set(x, y, y % 8 === 7 ? [138, 138, 138] : jitter(r, [160, 160, 160], 3));
      }
    }
  },

  cobblestone: (px, r) => {
    noise(px, r, [118, 118, 118], [[128, 128, 128], [108, 108, 108], [136, 136, 136]], 6);
    // Uneven stones: 4x4 cells with mortar lines that wobble between cells.
    for (let cy = 0; cy < 4; cy++) {
      for (let cx = 0; cx < 4; cx++) {
        const w = 3 + Math.floor(r() * 2);
        const h = 3 + Math.floor(r() * 2);
        const x0 = cx * 4;
        const y0 = cy * 4;
        for (let k = 0; k < 4; k++) {
          px.set(x0 + k, (y0 + h) % SIZE, [78, 78, 78]);
          px.set((x0 + w) % SIZE, y0 + k, [80, 80, 80]);
        }
        px.set(x0 + 1, y0 + 1, [146, 146, 146]);
      }
    }
  },

  stone_bricks: (px, r) => bricks(px, r, [122, 122, 122], [82, 82, 82], 4),
  deepslate_bricks: (px, r) => bricks(px, r, [72, 72, 78], [40, 40, 44], 4),

  sandstone: (px, r) => {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const line = y % 8 === 7;
        px.set(x, y, line ? [196, 183, 135] : jitter(r, [216, 203, 155], 3));
      }
    }
    for (let i = 0; i < 8; i++) px.set(Math.floor(r() * SIZE), Math.floor(r() * SIZE), [204, 190, 142]);
  },

  water: (px, r) => {
    noise(px, r, [49, 89, 208], [[44, 82, 198], [54, 96, 216]], 3);
    for (let i = 0; i < 7; i++) {
      const y = Math.floor(r() * SIZE);
      const x = Math.floor(r() * SIZE);
      const len = 3 + Math.floor(r() * 5);
      const c = r() < 0.6 ? [64, 108, 228] : [40, 76, 190];
      for (let k = 0; k < len; k++) px.set((x + k) % SIZE, y, c);
    }
  },

  oak_planks: (px, r) => {
    for (let y = 0; y < SIZE; y++) {
      const plank = Math.floor(y / 4);
      const seamX = plank % 2 ? 4 : 12;
      for (let x = 0; x < SIZE; x++) {
        if (y % 4 === 3 || x === seamX) px.set(x, y, [108, 84, 48]);
        else px.set(x, y, jitter(r, [162, 130, 78], 4));
      }
    }
    for (let i = 0; i < 6; i++) px.set(Math.floor(r() * SIZE), Math.floor(r() * SIZE), [148, 116, 66]);
  },

  leaves: (px, r) => {
    noise(px, r, [58, 104, 30], [[46, 86, 22], [70, 120, 36], [38, 70, 18], [64, 112, 32]], 5);
    for (let i = 0; i < 8; i++) px.set(Math.floor(r() * SIZE), Math.floor(r() * SIZE), [28, 52, 14]);
  },

  farmland: (px, r) => {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const furrow = y % 4 === 0;
        px.set(x, y, furrow ? jitter(r, [70, 46, 28], 3) : jitter(r, [108, 76, 48], 4));
      }
    }
    for (let i = 0; i < 6; i++) px.set(Math.floor(r() * SIZE), Math.floor(r() * SIZE), [88, 60, 38]);
  },

  // Rail is a line-pattern: x runs along the track, y across it. Transparent background.
  rail: (px, r) => {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) px.set(x, y, [0, 0, 0], 0);
    for (let x = 0; x < SIZE; x++) {
      if (x % 4 === 1 || x % 4 === 2) {
        for (let y = 3; y <= 12; y++) px.set(x, y, jitter(r, [110, 80, 50], 4));
      }
    }
    for (let x = 0; x < SIZE; x++) {
      px.set(x, 5, jitter(r, [138, 138, 138], 4));
      px.set(x, 10, jitter(r, [138, 138, 138], 4));
    }
  },
};

export const textureNames = Object.keys(RECIPES);

const cache = new Map();

/** Returns {width, height, data} suitable for maplibregl.Map#addImage. */
export function getTexture(name) {
  if (cache.has(name)) return cache.get(name);
  const recipe = RECIPES[name];
  if (!recipe) return null;

  const small = new Uint8ClampedArray(SIZE * SIZE * 4);
  const px = {
    set(x, y, [R, G, B], a = 255) {
      const i = ((y + SIZE) % SIZE) * SIZE * 4 + ((x + SIZE) % SIZE) * 4;
      small[i] = R;
      small[i + 1] = G;
      small[i + 2] = B;
      small[i + 3] = a;
    },
  };
  recipe(px, mulberry32(hashSeed(name)));

  const W = SIZE * SCALE;
  const data = new Uint8ClampedArray(W * W * 4);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const si = (Math.floor(y / SCALE) * SIZE + Math.floor(x / SCALE)) * 4;
      const di = (y * W + x) * 4;
      data[di] = small[si];
      data[di + 1] = small[si + 1];
      data[di + 2] = small[si + 2];
      data[di + 3] = small[si + 3];
    }
  }
  const tex = { width: W, height: W, data };
  cache.set(name, tex);
  return tex;
}

/** Texture as a data URL for CSS backgrounds (scale = screen pixels per texel). */
export function textureDataURL(name, scale = 3) {
  const tex = getTexture(name);
  const canvas = document.createElement('canvas');
  canvas.width = tex.width;
  canvas.height = tex.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(new ImageData(tex.data, tex.width, tex.height), 0, 0);
  const out = document.createElement('canvas');
  out.width = SIZE * scale;
  out.height = SIZE * scale;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL();
}
