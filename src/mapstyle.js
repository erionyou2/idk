// MapLibre style that skins OpenMapTiles vector data (served by OpenFreeMap) with block textures.
// Image names reference textures.js; main.js adds them on demand via `styleimagemissing`.

const TILES = 'https://tiles.openfreemap.org/planet';

export const REGION = {
  // Kendall County (Boerne) down through Helotes into Bexar County (San Antonio).
  maxBounds: [
    [-99.15, 29.05],
    [-97.95, 30.12],
  ],
  searchBbox: [-99.15, 29.05, -97.95, 30.12],
  center: [-98.61, 29.6],
  zoom: 10.2,
  minZoom: 8.5,
};

export const FIRST_LABEL_LAYER = 'label-water';

const FONT = ['Pixel'];

const expZoom = (stops) => ['interpolate', ['exponential', 1.5], ['zoom'], ...stops.flat()];
const linZoom = (stops) => ['interpolate', ['linear'], ['zoom'], ...stops.flat()];

const tunnelOpacity = ['case', ['==', ['get', 'brunnel'], 'tunnel'], 0.45, 1];
const classIn = (list) => ['in', ['get', 'class'], ['literal', list]];

const labelPaint = (color, halo = '#000000', haloWidth = 1.6) => ({
  'text-color': color,
  'text-halo-color': halo,
  'text-halo-width': haloWidth,
  'text-halo-blur': 0,
});

function roadPair(id, filter, pattern, stops, opts = {}) {
  // Ramps get 60% of the width; the data expression has to live inside the zoom interpolate.
  const width = opts.ramp
    ? expZoom(stops.map(([z, w]) => [z, ['case', ['==', ['get', 'ramp'], 1], w * 0.6, w]]))
    : expZoom(stops);
  const casingWidth = expZoom(stops.map(([z, w]) => [z, w + Math.max(2, w * 0.35)]));
  const common = {
    type: 'line',
    source: 'omt',
    'source-layer': 'transportation',
    filter,
    minzoom: opts.minzoom ?? 0,
    layout: { 'line-cap': 'butt', 'line-join': 'round' },
  };
  return {
    casing: {
      ...common,
      id: `${id}-casing`,
      paint: { 'line-color': opts.casing ?? '#1c1c1c', 'line-width': casingWidth, 'line-opacity': tunnelOpacity },
    },
    fill: {
      ...common,
      id,
      paint: { 'line-pattern': pattern, 'line-width': width, 'line-opacity': tunnelOpacity },
    },
  };
}

const roads = [
  roadPair('road-path', classIn(['path']), 'dirt_path', [[14, 1], [16, 2], [18, 5]], { minzoom: 14, casing: '#5a4a2a' }),
  roadPair('road-service', classIn(['service', 'track', 'raceway', 'busway', 'bus_guideway']), 'dirt_path', [[13, 0.8], [14, 1.5], [16, 4], [18, 12]], { minzoom: 13, casing: '#4a3a1e' }),
  roadPair('road-minor', classIn(['minor']), 'gravel', [[11, 0.6], [13, 1.5], [14, 3], [16, 8], [18, 18]], { minzoom: 11 }),
  roadPair('road-secondary', classIn(['secondary', 'tertiary']), 'cobblestone', [[9, 0.6], [12, 1.8], [14, 5], [16, 10], [18, 24]], { minzoom: 9 }),
  roadPair('road-primary', classIn(['primary']), 'stone_bricks', [[8, 0.8], [11, 2.2], [14, 7], [16, 13], [18, 30]], { minzoom: 8, ramp: true }),
  roadPair('road-motorway', classIn(['motorway', 'trunk']), 'deepslate_bricks', [[6, 1], [9, 2.5], [12, 5], [14, 10], [16, 18], [18, 40]], { ramp: true, casing: '#0d0d0d' }),
];

export function buildStyle({ fontUrl }) {
  return {
    version: 8,
    name: 'BlockNav',
    sources: {
      omt: { type: 'vector', url: TILES },
    },
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    'font-faces': { Pixel: fontUrl },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-pattern': 'grass' } },

      // ---- land use / land cover ----
      {
        id: 'landuse-residential',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landuse',
        filter: classIn(['residential', 'suburb', 'neighbourhood', 'garages']),
        paint: { 'fill-pattern': 'grass_plains' },
      },
      {
        id: 'landuse-commercial',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landuse',
        filter: classIn(['commercial', 'retail', 'bus_station', 'theme_park', 'zoo']),
        paint: { 'fill-pattern': 'gravel' },
      },
      {
        id: 'landuse-industrial',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landuse',
        filter: classIn(['industrial', 'quarry', 'railway', 'dam']),
        paint: { 'fill-pattern': 'stone' },
      },
      {
        id: 'landuse-institution',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landuse',
        filter: classIn(['school', 'university', 'college', 'hospital', 'kindergarten', 'stadium']),
        paint: { 'fill-pattern': 'sandstone' },
      },
      {
        id: 'landuse-pitch',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landuse',
        filter: classIn(['pitch', 'playground', 'track', 'golf_course', 'grass']),
        paint: { 'fill-pattern': 'grass_bright' },
      },
      {
        id: 'landuse-cemetery',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landuse',
        filter: classIn(['cemetery']),
        paint: { 'fill-pattern': 'dirt' },
      },
      {
        id: 'landuse-military',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landuse',
        filter: classIn(['military']),
        paint: { 'fill-pattern': 'netherrack' },
      },
      {
        id: 'landcover-grass',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landcover',
        filter: classIn(['grass']),
        paint: { 'fill-pattern': 'moss' },
      },
      {
        id: 'landcover-farmland',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landcover',
        filter: classIn(['farmland']),
        paint: { 'fill-pattern': 'farmland' },
      },
      {
        id: 'landcover-wood',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landcover',
        filter: classIn(['wood']),
        paint: { 'fill-pattern': 'leaves' },
      },
      {
        id: 'landcover-wetland',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landcover',
        filter: classIn(['wetland']),
        paint: { 'fill-pattern': 'mud' },
      },
      {
        id: 'landcover-sand',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landcover',
        filter: classIn(['sand']),
        paint: { 'fill-pattern': 'sand' },
      },
      {
        id: 'landcover-rock',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landcover',
        filter: classIn(['rock']),
        paint: { 'fill-pattern': 'stone' },
      },
      {
        id: 'landcover-ice',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landcover',
        filter: classIn(['ice']),
        paint: { 'fill-pattern': 'snow' },
      },
      {
        id: 'park',
        type: 'fill',
        source: 'omt',
        'source-layer': 'park',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-pattern': 'moss' },
      },

      // ---- water ----
      {
        id: 'water',
        type: 'fill',
        source: 'omt',
        'source-layer': 'water',
        filter: ['!=', ['get', 'brunnel'], 'tunnel'],
        paint: { 'fill-pattern': 'water' },
      },
      {
        id: 'waterway',
        type: 'line',
        source: 'omt',
        'source-layer': 'waterway',
        filter: ['!=', ['get', 'brunnel'], 'tunnel'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-pattern': 'water',
          'line-width': expZoom([[9, 0.8], [12, 1.5], [14, 3], [18, 12]]),
        },
      },

      // ---- aeroway ----
      {
        id: 'aeroway-area',
        type: 'fill',
        source: 'omt',
        'source-layer': 'aeroway',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-pattern': 'smooth_stone' },
      },
      {
        id: 'aeroway-line',
        type: 'line',
        source: 'omt',
        'source-layer': 'aeroway',
        filter: ['all', ['==', ['geometry-type'], 'LineString'], classIn(['runway', 'taxiway'])],
        paint: {
          'line-pattern': 'smooth_stone',
          'line-width': expZoom([[11, 1], [14, 6], [18, 40]]),
        },
      },

      // ---- buildings ----
      {
        id: 'building',
        type: 'fill',
        source: 'omt',
        'source-layer': 'building',
        minzoom: 13,
        paint: {
          'fill-pattern': ['case', ['>', ['coalesce', ['get', 'render_height'], 0], 20], 'stone_bricks', 'oak_planks'],
          'fill-opacity': linZoom([[13, 0.6], [15, 1]]),
        },
      },
      {
        id: 'building-outline',
        type: 'line',
        source: 'omt',
        'source-layer': 'building',
        minzoom: 15,
        paint: { 'line-color': '#3b2a14', 'line-width': linZoom([[15, 0.6], [18, 1.5]]) },
      },

      // ---- roads: all casings first, then all fills ----
      ...roads.map((r) => r.casing),
      ...roads.map((r) => r.fill),
      {
        id: 'rail',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        filter: classIn(['rail', 'transit']),
        minzoom: 10,
        paint: {
          'line-pattern': 'rail',
          'line-width': expZoom([[10, 1.5], [14, 4], [18, 12]]),
          'line-opacity': tunnelOpacity,
        },
      },

      // ---- boundaries ----
      {
        id: 'boundary',
        type: 'line',
        source: 'omt',
        'source-layer': 'boundary',
        filter: ['all', ['<=', ['get', 'admin_level'], 8], ['!=', ['get', 'maritime'], 1]],
        paint: {
          'line-color': '#2b2b2b',
          'line-dasharray': [3, 2],
          'line-width': ['match', ['get', 'admin_level'], 4, 3, 6, 2, 1.2],
          'line-opacity': 0.75,
        },
      },

      // ---- labels ----
      {
        id: FIRST_LABEL_LAYER,
        type: 'symbol',
        source: 'omt',
        'source-layer': 'water_name',
        filter: ['==', ['geometry-type'], 'Point'],
        layout: {
          'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
          'text-font': FONT,
          'text-size': 13,
          'text-letter-spacing': 0.05,
          'text-max-width': 8,
        },
        paint: labelPaint('#9ad0ff'),
      },
      {
        id: 'label-water-line',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'water_name',
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: {
          'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
          'text-font': FONT,
          'text-size': 13,
          'symbol-placement': 'line',
          'symbol-spacing': 400,
          'text-letter-spacing': 0.05,
        },
        paint: labelPaint('#9ad0ff'),
      },
      {
        id: 'label-waterway',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'waterway',
        minzoom: 12,
        layout: {
          'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
          'text-font': FONT,
          'text-size': 12,
          'symbol-placement': 'line',
          'symbol-spacing': 400,
        },
        paint: labelPaint('#9ad0ff'),
      },
      {
        id: 'label-park',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'park',
        minzoom: 12,
        filter: ['==', ['geometry-type'], 'Point'],
        layout: {
          'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
          'text-font': FONT,
          'text-size': 12,
          'text-max-width': 8,
        },
        paint: labelPaint('#8cf57a'),
      },
      {
        id: 'label-poi',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'poi',
        minzoom: 15,
        filter: [
          'all',
          ['<=', ['coalesce', ['get', 'rank'], 99], 12],
          classIn(['school', 'college', 'university', 'hospital', 'stadium', 'library', 'town_hall', 'attraction', 'grocery', 'shop', 'restaurant', 'fast_food', 'cafe', 'fuel', 'bank', 'pharmacy', 'place_of_worship', 'park', 'lodging', 'cinema', 'theatre', 'bus', 'railway', 'airport']),
        ],
        layout: {
          'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
          'text-font': FONT,
          'text-size': 11,
          'text-max-width': 8,
          'text-anchor': 'top',
          'text-offset': [0, 0.4],
          'text-optional': true,
        },
        paint: labelPaint('#ffd97a'),
      },
      {
        id: 'label-road',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'transportation_name',
        minzoom: 13,
        filter: classIn(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service']),
        layout: {
          'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
          'text-font': FONT,
          'text-size': linZoom([[13, 11], [18, 15]]),
          'symbol-placement': 'line',
          'symbol-spacing': 350,
          'text-rotation-alignment': 'map',
          'text-pitch-alignment': 'viewport',
          'text-max-angle': 30,
        },
        paint: labelPaint('#f0f0f0'),
      },
      {
        id: 'label-shield',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'transportation_name',
        minzoom: 9,
        filter: ['all', classIn(['motorway', 'trunk', 'primary']), ['has', 'ref'], ['<=', ['get', 'ref_length'], 6]],
        layout: {
          'text-field': ['get', 'ref'],
          'text-font': FONT,
          'text-size': 12,
          'symbol-placement': 'line',
          'symbol-spacing': 500,
          'text-rotation-alignment': 'viewport',
          'text-pitch-alignment': 'viewport',
          'text-padding': 6,
        },
        paint: labelPaint('#ffffff', '#3f3f3f', 2.2),
      },
      {
        id: 'label-place-minor',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'place',
        minzoom: 11,
        filter: classIn(['suburb', 'neighbourhood', 'quarter', 'hamlet', 'isolated_dwelling']),
        layout: {
          'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
          'text-font': FONT,
          'text-size': linZoom([[11, 11], [15, 14]]),
          'text-max-width': 8,
          'text-letter-spacing': 0.05,
        },
        paint: labelPaint('#e8e8e8'),
      },
      {
        id: 'label-place-village',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'place',
        maxzoom: 15,
        filter: classIn(['village']),
        layout: {
          'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
          'text-font': FONT,
          'text-size': linZoom([[9, 11], [14, 15]]),
          'text-max-width': 8,
        },
        paint: labelPaint('#ffffff'),
      },
      {
        id: 'label-place-town',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'place',
        maxzoom: 15,
        filter: classIn(['town']),
        layout: {
          'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
          'text-font': FONT,
          'text-size': linZoom([[8, 12], [13, 18]]),
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.1,
          'text-max-width': 8,
        },
        paint: labelPaint('#ffffff', '#000000', 2),
      },
      {
        id: 'label-place-city',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'place',
        maxzoom: 14,
        filter: classIn(['city']),
        layout: {
          'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
          'text-font': FONT,
          'text-size': linZoom([[8, 15], [12, 22]]),
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.12,
          'text-max-width': 10,
        },
        paint: labelPaint('#ffff55', '#000000', 2.2),
      },
    ],
  };
}
