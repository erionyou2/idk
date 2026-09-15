import { Map as MapLibreMap, Marker, LngLatBounds, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre resolves its worker relative to its own module URL, which breaks once Vite bundles it.
// Let Vite bundle the worker (and the shared chunk it imports) and tell MapLibre where it landed.
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import './style.css';

import { buildStyle, REGION, FIRST_LABEL_LAYER } from './mapstyle.js';
import { getTexture, textureDataURL } from './textures.js';
import { ICONS, drawSprite, spriteCanvas, maneuverSprite, makeMarkerElement } from './sprites.js';
import {
  MODES,
  searchPlaces,
  reverseGeocode,
  fetchRoute,
  locateOnRoute,
  formatDistance,
  formatBlocks,
  formatDuration,
  formatEta,
} from './nav.js';

const $ = (sel) => document.querySelector(sel);
const els = {
  search: $('#search'),
  searchClear: $('#search-clear'),
  results: $('#results'),
  panel: $('#panel'),
  hotbar: $('#hotbar'),
  banner: $('#banner'),
  bannerIcon: $('#banner-icon'),
  bannerDist: $('#banner-dist'),
  bannerInstr: $('#banner-instr'),
  bannerSub: $('#banner-sub'),
  bannerEnd: $('#banner-end'),
  toast: $('#toast'),
  loading: $('#loading'),
  loadingMsg: $('#loading-msg'),
  loadingBar: $('#loading-bar'),
  splash: $('#splash'),
};

const SPLASHES = [
  'Also try Boerne!',
  'Now with 100% more blocks!',
  'Turn left at the villager!',
  'Creeper-free routes!',
  '1 block = 1 meter!',
  'Mind the gravel!',
  'Helotes approved!',
  'Not affiliated with Mojang!',
  'Loop 1604 is lava!',
  'Diamonds are that way!',
];

const OFF_ROUTE_METERS = 60;
const OFF_ROUTE_FIXES = 3;
const ARRIVE_METERS = 25;
const NAV_ZOOM = 16.5;

const state = {
  origin: null, // { name, subtitle, lngLat, isUser }
  dest: null,
  mode: 'car',
  route: null,
  navigating: false,
  user: null, // { lngLat, accuracy, heading, speed }
  follow: false,
  watchId: null,
  geoDenied: false,
  offRouteCount: 0,
  rerouting: false,
  activeStep: -1,
  view: null, // 'place' | 'directions'
  routeAbort: null,
};

const USER_ORIGIN = { name: 'My location', subtitle: 'Live GPS position', isUser: true, lngLat: null };

// ---------------------------------------------------------------- boot

document.documentElement.style.setProperty('--dirt', `url(${textureDataURL('dirt', 4)})`);
els.splash.textContent = SPLASHES[Math.floor(Math.random() * SPLASHES.length)];
setLoading(15, 'Building terrain...');

const fontUrl = new URL(`${import.meta.env.BASE_URL}fonts/PixelifySans.ttf`, location.href).href;
setWorkerUrl(mapWorkerUrl);

const map = new MapLibreMap({
  container: 'map',
  style: buildStyle({ fontUrl }),
  center: REGION.center,
  zoom: REGION.zoom,
  minZoom: 7,
  maxZoom: 19,
  pitch: 0,
  maxPitch: 0,
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
  attributionControl: { compact: true },
  fadeDuration: 0,
});
map.touchZoomRotate.disableRotation();
map.keyboard.disableRotation();

// Every fill-pattern / line-pattern in the style names a texture; generate it the first time it's asked for.
function resolveTexture(id) {
  if (map.hasImage(id)) return;
  const tex = getTexture(id);
  if (tex) map.addImage(id, tex, { pixelRatio: 1 });
}
map.setMissingStyleImageResolver(resolveTexture);
map.on('styleimagemissing', ({ id }) => resolveTexture(id));

map.on('style.load', () => setLoading(55, 'Placing blocks...'));

map.once('load', () => {
  addRouteLayers();
  setLoading(100, 'Done!');
  setTimeout(() => els.loading.classList.add('done'), 350);
  setTimeout(() => els.loading.remove(), 900);
  startWatching();
});

map.on('error', (e) => {
  const msg = e?.error?.message || '';
  if (/font|glyph/i.test(msg)) return; // fallback glyph misses are harmless
  console.warn('[map]', msg || e);
});

setTimeout(() => {
  if (!map.loaded() && document.body.contains(els.loading)) {
    setLoading(60, 'Still loading terrain... check your connection');
  }
}, 12000);

const userMarker = new Marker({ element: makeMarkerElement('steve'), anchor: 'center' });
const destMarker = new Marker({ element: makeMarkerElement('diamond'), anchor: 'center' });
const originMarker = new Marker({ element: makeMarkerElement('emerald'), anchor: 'center' });

// ---------------------------------------------------------------- map layers

const EMPTY = { type: 'FeatureCollection', features: [] };

function addRouteLayers() {
  map.addSource('user-accuracy', { type: 'geojson', data: EMPTY });
  map.addLayer(
    {
      id: 'user-accuracy',
      type: 'fill',
      source: 'user-accuracy',
      paint: { 'fill-color': '#55ff55', 'fill-opacity': 0.18, 'fill-outline-color': '#1e5a14' },
    },
    FIRST_LABEL_LAYER,
  );

  map.addSource('route', { type: 'geojson', data: EMPTY });
  map.addLayer(
    {
      id: 'route-casing',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#3a0a00', 'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 10, 7, 18, 18] },
    },
    FIRST_LABEL_LAYER,
  );
  map.addLayer(
    {
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ff3b1f', 'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 10, 3.5, 18, 10] },
    },
    FIRST_LABEL_LAYER,
  );
  map.addLayer(
    {
      id: 'route-sparkle',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': '#ffd6a0',
        'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 10, 1, 18, 3],
        'line-dasharray': [0.6, 3],
      },
    },
    FIRST_LABEL_LAYER,
  );
}

function setRouteGeometry(route) {
  const src = map.getSource('route');
  if (!src) return;
  src.setData(route ? { type: 'Feature', geometry: route.geometry, properties: {} } : EMPTY);
}

function circlePolygon([lng, lat], radiusM, n = 40) {
  const kx = Math.cos((lat * Math.PI) / 180) * 111320;
  const ky = 110540;
  const ring = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    ring.push([lng + (Math.cos(a) * radiusM) / kx, lat + (Math.sin(a) * radiusM) / ky]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} };
}

function updateAccuracyCircle() {
  const src = map.getSource('user-accuracy');
  if (!src) return;
  const u = state.user;
  src.setData(u && u.accuracy > 15 ? circlePolygon(u.lngLat, u.accuracy) : EMPTY);
}

// ---------------------------------------------------------------- geolocation

const locateWaiters = [];

function startWatching() {
  if (state.watchId != null) return;
  if (!navigator.geolocation) {
    state.geoDenied = true;
    toast('This browser has no GPS. Search or long-press the map to set a start.');
    return;
  }
  state.watchId = navigator.geolocation.watchPosition(onFix, onGeoError, {
    enableHighAccuracy: true,
    maximumAge: 2000,
    timeout: 20000,
  });
}

function onFix(pos) {
  const { longitude, latitude, accuracy, heading, speed } = pos.coords;
  const first = !state.user;
  state.user = { lngLat: [longitude, latitude], accuracy, heading, speed };
  state.geoDenied = false;
  userMarker.setLngLat(state.user.lngLat);
  if (!userMarker._map) userMarker.addTo(map);
  updateAccuracyCircle();

  if (first) {
    toast('Found you!');
    if (!state.route && !state.dest) {
      state.follow = true;
      map.flyTo({ center: state.user.lngLat, zoom: 14.5, duration: 1600 });
    }
    refreshFieldValues();
  } else if (state.follow) {
    map.easeTo({ center: state.user.lngLat, duration: 700, easing: (t) => t });
  }

  while (locateWaiters.length) locateWaiters.shift().resolve(state.user);
  if (state.navigating) onNavTick();
  updateHotbar();
}

function onGeoError(err) {
  if (err.code === err.PERMISSION_DENIED) {
    state.geoDenied = true;
    toast('Location blocked. Type a start address or long-press the map.');
  } else if (!state.user) {
    toast('Still looking for GPS signal...');
  }
  while (locateWaiters.length) locateWaiters.shift().reject(err);
  refreshFieldValues();
  updateHotbar();
}

/** Resolves with the current fix, or waits for the first one. */
function requireUser() {
  if (state.user) return Promise.resolve(state.user);
  if (state.geoDenied) return Promise.reject(new Error('Location is blocked'));
  startWatching();
  return new Promise((resolve, reject) => {
    locateWaiters.push({ resolve, reject });
    setTimeout(() => {
      const i = locateWaiters.findIndex((w) => w.resolve === resolve);
      if (i >= 0) {
        locateWaiters.splice(i, 1);
        reject(new Error('No GPS fix yet'));
      }
    }, 25000);
  });
}

map.on('dragstart', () => {
  state.follow = false;
  updateHotbar();
});

// ---------------------------------------------------------------- search typeahead

function attachSearch(input, list, { onPick, extras = () => [] }) {
  let timer = null;
  let ctrl = null;
  let items = [];
  let active = -1;

  function close() {
    list.hidden = true;
    list.innerHTML = '';
    items = [];
    active = -1;
  }

  function render() {
    list.innerHTML = '';
    if (!items.length) {
      close();
      return;
    }
    items.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = `result${item.muted ? ' muted' : ''}${i === active ? ' active' : ''}`;
      li.innerHTML = `<span class="result-name"></span><span class="result-sub"></span>`;
      li.firstChild.textContent = item.name;
      li.lastChild.textContent = item.subtitle || '';
      if (!item.muted) {
        li.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          pick(item);
        });
      }
      list.appendChild(li);
    });
    list.hidden = false;
  }

  function pick(item) {
    close();
    input.value = item.name;
    input.blur();
    onPick(item);
  }

  async function run(q) {
    ctrl?.abort();
    ctrl = new AbortController();
    try {
      const near = state.user?.lngLat || map.getCenter().toArray();
      const found = await searchPlaces(q, { near, signal: ctrl.signal });
      items = [...extras(q), ...found];
      if (!found.length) items.push({ muted: true, name: 'No results', subtitle: 'Try a street, business or neighborhood' });
      active = -1;
      render();
    } catch (err) {
      if (err.name === 'AbortError') return;
      items = [{ muted: true, name: 'Search failed', subtitle: err.message }];
      render();
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) {
      items = extras(q);
      render();
      return;
    }
    timer = setTimeout(() => run(q), 280);
  });

  input.addEventListener('focus', () => {
    if (input.dataset.selectOnFocus) input.select();
    if (!input.value.trim()) {
      items = extras('');
      render();
    }
  });

  input.addEventListener('keydown', (e) => {
    const selectable = items.filter((it) => !it.muted);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!selectable.length) return;
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = active >= 0 ? items[active] : selectable[0];
      if (item && !item.muted) pick(item);
      else if (input.value.trim().length >= 2) run(input.value.trim());
    } else if (e.key === 'Escape') {
      close();
      input.blur();
    }
  });

  document.addEventListener('pointerdown', (e) => {
    if (e.target !== input && !list.contains(e.target)) close();
  });

  return { close };
}

const myLocationExtra = () => [
  {
    name: 'My location',
    subtitle: state.user ? 'Live GPS position' : state.geoDenied ? 'Location blocked in this browser' : 'Waiting for GPS...',
    isUser: true,
  },
];

attachSearch(els.search, els.results, {
  onPick: (place) => {
    setDestination(place, { openCard: true });
  },
});

els.search.addEventListener('input', () => {
  els.searchClear.hidden = !els.search.value;
});
drawSprite(els.searchClear.appendChild(document.createElement('canvas')), ICONS.close, { scale: 2 });
els.searchClear.addEventListener('click', () => {
  els.search.value = '';
  els.searchClear.hidden = true;
  els.search.focus();
});

// ---------------------------------------------------------------- origin / destination

function placeToPoint(place) {
  return place.isUser ? state.user?.lngLat || null : place.lngLat;
}

function setDestination(place, { openCard = false } = {}) {
  state.dest = place;
  destMarker.setLngLat(place.lngLat);
  if (!destMarker._map) destMarker.addTo(map);
  if (openCard) {
    showPlaceCard(place);
    map.flyTo({ center: place.lngLat, zoom: Math.max(map.getZoom(), 14.5), duration: 1200 });
  }
  if (state.view === 'directions') {
    refreshFieldValues();
    computeRoute();
  }
}

function setOrigin(place) {
  state.origin = place;
  if (place.isUser) {
    originMarker.remove();
  } else {
    originMarker.setLngLat(place.lngLat);
    if (!originMarker._map) originMarker.addTo(map);
  }
  refreshFieldValues();
  computeRoute();
}

function clearRoute() {
  state.routeAbort?.abort();
  state.route = null;
  state.activeStep = -1;
  setRouteGeometry(null);
}

// ---------------------------------------------------------------- routing

async function computeRoute() {
  const { origin, dest } = state;
  if (!origin || !dest) {
    clearRoute();
    renderRouteSummary();
    return;
  }

  state.routeAbort?.abort();
  const ctrl = new AbortController();
  state.routeAbort = ctrl;
  renderRouteSummary({ loading: origin.isUser && !state.user ? 'Locating you...' : 'Mining a route...' });

  try {
    if (origin.isUser) await requireUser();
    if (ctrl.signal.aborted) return;
    const from = placeToPoint(origin);
    const to = placeToPoint(dest);
    const route = await fetchRoute(from, to, state.mode, { signal: ctrl.signal });
    if (ctrl.signal.aborted) return;
    state.route = route;
    state.offRouteCount = 0;
    setRouteGeometry(route);
    renderRouteSummary();
    if (state.navigating) onNavTick();
    else fitRoute(route);
  } catch (err) {
    if (err.name === 'AbortError') return;
    clearRoute();
    renderRouteSummary({ error: err.message });
  }
}

function fitRoute(route) {
  const bounds = route.coords.reduce(
    (b, c) => b.extend(c),
    new LngLatBounds(route.coords[0], route.coords[0]),
  );
  const phone = window.innerWidth <= 720;
  map.fitBounds(bounds, {
    padding: phone
      ? { top: 110, bottom: Math.round(window.innerHeight * 0.5), left: 40, right: 40 }
      : { top: 110, bottom: 110, left: 420, right: 80 },
    duration: 1000,
    maxZoom: 16,
  });
}

// ---------------------------------------------------------------- navigation

function startNav() {
  if (!state.route) return;
  if (!state.origin) {
    // Use live GPS only when no origin has been selected.
    setOrigin(USER_ORIGIN);
  }
  state.navigating = true;
  state.follow = true;
  document.body.classList.add('navigating');
  els.banner.hidden = false;
  els.results.hidden = true;
  updateHotbar();
  requireUser()
    .then((u) => {
      map.flyTo({ center: u.lngLat, zoom: NAV_ZOOM, duration: 1200 });
      onNavTick();
    })
    .catch((err) => {
      toast(err.message || 'Could not get your location');
      endNav();
    });
}

function endNav() {
  state.navigating = false;
  state.follow = false;
  document.body.classList.remove('navigating');
  els.banner.hidden = true;
  state.activeStep = -1;
  highlightStep(-1);
  updateHotbar();
  if (state.route) fitRoute(state.route);
}

function onNavTick() {
  if (!state.route || !state.user) return;
  const loc = locateOnRoute(state.route, state.user.lngLat);
  if (!loc) return;

  if (loc.remainingDistance < ARRIVE_METERS && loc.distanceToRoute < ARRIVE_METERS) {
    drawBannerIcon({ type: 'arrive' });
    els.bannerDist.textContent = 'Arrived';
    els.bannerInstr.textContent = `You reached ${state.dest?.name || 'your destination'}`;
    els.bannerSub.textContent = 'Achievement unlocked!';
    return;
  }

  if (state.origin?.isUser && loc.distanceToRoute > OFF_ROUTE_METERS) {
    state.offRouteCount += 1;
    if (state.offRouteCount >= OFF_ROUTE_FIXES && !state.rerouting) reroute();
  } else {
    state.offRouteCount = 0;
  }

  const upcoming = loc.next || { maneuver: { type: 'arrive' }, instruction: 'Arrive at your destination' };
  drawBannerIcon(upcoming.maneuver);
  els.bannerDist.textContent = formatDistance(loc.toNextManeuver);
  els.bannerInstr.textContent = upcoming.instruction;
  els.bannerSub.textContent = `${formatDistance(loc.remainingDistance)} left · ${formatDuration(loc.remainingDuration)} · ETA ${formatEta(loc.remainingDuration)}`;
  highlightStep(loc.stepIndex);
}

async function reroute() {
  state.rerouting = true;
  els.bannerSub.textContent = 'Off route. Re-mining...';
  try {
    const route = await fetchRoute(state.user.lngLat, placeToPoint(state.dest), state.mode);
    state.route = route;
    state.offRouteCount = 0;
    setRouteGeometry(route);
    renderRouteSummary();
    onNavTick();
  } catch (err) {
    els.bannerSub.textContent = `Re-route failed: ${err.message}`;
  } finally {
    state.rerouting = false;
  }
}

function drawBannerIcon(maneuver) {
  const { grid, flip } = maneuverSprite(maneuver);
  drawSprite(els.bannerIcon, grid, { scale: 4, flip });
}

els.bannerEnd.addEventListener('click', endNav);

// ---------------------------------------------------------------- panel views

function closePanel() {
  els.panel.hidden = true;
  els.panel.innerHTML = '';
  state.view = null;
  updateHotbar();
}

function panelHeader(title) {
  const head = document.createElement('div');
  head.className = 'panel-head';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  const close = document.createElement('button');
  close.className = 'mc-btn icon-only';
  close.setAttribute('aria-label', 'Close');
  close.appendChild(spriteCanvas(ICONS.close, { scale: 2 }));
  close.addEventListener('click', closePanel);
  head.append(h2, close);
  return head;
}

function showPlaceCard(place) {
  state.view = 'place';
  els.panel.innerHTML = '';
  els.panel.appendChild(panelHeader(place.name));

  const sub = document.createElement('div');
  sub.className = 'panel-sub';
  sub.textContent = place.subtitle || '';
  els.panel.appendChild(sub);

  const row = document.createElement('div');
  row.className = 'btn-row';
  const go = document.createElement('button');
  go.className = 'mc-btn mc-btn-green';
  go.textContent = 'Directions';
  go.addEventListener('click', () => {
    if (!state.origin) state.origin = USER_ORIGIN;
    showDirections();
  });
  const start = document.createElement('button');
  start.className = 'mc-btn';
  start.textContent = 'Start here';
  start.addEventListener('click', () => {
    if (state.dest === place) {
      state.dest = null;
      destMarker.remove();
    }
    state.origin = place;
    originMarker.setLngLat(place.lngLat).addTo(map);
    showDirections();
  });
  row.append(go, start);
  els.panel.appendChild(row);
  els.panel.hidden = false;
  updateHotbar();
}

let fromInput = null;
let toInput = null;
let summaryEl = null;
let stepsEl = null;
let startBtn = null;

function showDirections() {
  state.view = 'directions';
  if (!state.origin) state.origin = USER_ORIGIN;
  els.panel.innerHTML = '';
  els.panel.appendChild(panelHeader('Directions'));

  const list = document.createElement('ul');
  list.className = 'mc-panel';
  list.hidden = true;
  list.style.margin = '0 0 6px';
  list.style.padding = '4px';
  list.style.listStyle = 'none';

  const makeField = (label, placeholder) => {
    const field = document.createElement('div');
    field.className = 'field';
    const lab = document.createElement('label');
    lab.textContent = label;
    const slot = document.createElement('div');
    slot.className = 'mc-slot';
    const input = document.createElement('input');
    input.type = 'search';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = placeholder;
    input.dataset.selectOnFocus = '1';
    slot.appendChild(input);
    field.append(lab, slot);
    return { field, input };
  };

  const from = makeField('From', 'My location');
  const to = makeField('To', 'Choose destination');
  fromInput = from.input;
  toInput = to.input;

  const swap = document.createElement('button');
  swap.className = 'mc-btn icon-only';
  swap.title = 'Swap';
  swap.setAttribute('aria-label', 'Swap start and destination');
  swap.appendChild(spriteCanvas(ICONS.swap, { scale: 2 }));
  swap.addEventListener('click', () => {
    if (!state.dest || !state.origin || state.origin.isUser && !state.user) return;
    const oldOrigin = state.origin.isUser ? { ...USER_ORIGIN, lngLat: state.user.lngLat, isUser: false, subtitle: 'Where you were' } : state.origin;
    const oldDest = state.dest;
    state.origin = oldDest;
    originMarker.setLngLat(oldDest.lngLat).addTo(map);
    setDestination(oldOrigin);
    refreshFieldValues();
    computeRoute();
  });
  to.field.appendChild(swap);

  els.panel.append(from.field, to.field, list);

  attachSearch(fromInput, list, {
    extras: myLocationExtra,
    onPick: (place) => setOrigin(place.isUser ? USER_ORIGIN : place),
  });
  attachSearch(toInput, list, {
    onPick: (place) => setDestination(place),
  });

  const modes = document.createElement('div');
  modes.className = 'mode-row';
  for (const [key, cfg] of Object.entries(MODES)) {
    const b = document.createElement('button');
    b.className = `mc-btn mode-btn${state.mode === key ? ' selected' : ''}`;
    b.dataset.mode = key;
    b.appendChild(spriteCanvas(ICONS[cfg.icon], { scale: 2 }));
    const label = document.createElement('span');
    label.textContent = cfg.label;
    b.appendChild(label);
    b.addEventListener('click', () => {
      state.mode = key;
      modes.querySelectorAll('.mode-btn').forEach((x) => x.classList.toggle('selected', x.dataset.mode === key));
      computeRoute();
    });
    modes.appendChild(b);
  }
  els.panel.appendChild(modes);

  summaryEl = document.createElement('div');
  els.panel.appendChild(summaryEl);

  const row = document.createElement('div');
  row.className = 'btn-row';
  startBtn = document.createElement('button');
  startBtn.className = 'mc-btn mc-btn-green';
  startBtn.textContent = 'Start';
  startBtn.disabled = true;
  startBtn.addEventListener('click', startNav);
  row.appendChild(startBtn);
  els.panel.appendChild(row);

  stepsEl = document.createElement('ul');
  stepsEl.className = 'steps';
  els.panel.appendChild(stepsEl);

  els.panel.hidden = false;
  refreshFieldValues();
  renderRouteSummary();
  updateHotbar();

  if (state.origin && state.dest && !state.route) computeRoute();
  else if (!state.dest) toInput.focus();
}

function refreshFieldValues() {
  if (!fromInput || state.view !== 'directions') return;
  if (state.origin?.isUser) {
    fromInput.value = 'My location';
    fromInput.classList.add('is-user');
  } else {
    fromInput.value = state.origin?.name || '';
    fromInput.classList.remove('is-user');
  }
  toInput.value = state.dest?.name || '';
}

function renderRouteSummary({ loading, error } = {}) {
  if (!summaryEl || state.view !== 'directions') return;
  summaryEl.innerHTML = '';
  stepsEl.innerHTML = '';
  startBtn.disabled = !state.route;

  if (loading) {
    summaryEl.innerHTML = `<div class="panel-note"></div>`;
    summaryEl.firstChild.textContent = loading;
    return;
  }
  if (error) {
    summaryEl.innerHTML = `<div class="panel-error"></div>`;
    summaryEl.firstChild.textContent = error;
    return;
  }
  const route = state.route;
  if (!route) {
    summaryEl.innerHTML = `<div class="panel-note">Pick a start and a destination to mine a route.</div>`;
    return;
  }

  const summary = document.createElement('div');
  summary.className = 'summary';
  summary.innerHTML = `
    <span class="big"></span>
    <span class="dim"></span>
  `;
  summary.children[0].textContent = `${formatDuration(route.duration)} · ${formatDistance(route.distance)}`;
  summary.children[1].textContent = `${formatBlocks(route.distance)} · ETA ${formatEta(route.duration)}`;
  summaryEl.appendChild(summary);

  route.steps.forEach((step, i) => {
    const li = document.createElement('li');
    li.className = 'step';
    li.dataset.index = String(i);
    const { grid, flip } = maneuverSprite(step.maneuver);
    li.appendChild(spriteCanvas(grid, { scale: 2, flip }));
    const text = document.createElement('div');
    text.className = 'step-text';
    const instr = document.createElement('div');
    instr.className = 'step-instr';
    instr.textContent = step.instruction;
    const dist = document.createElement('div');
    dist.className = 'step-dist';
    dist.textContent = step.distance > 0 ? `${formatDistance(step.distance)} · ${formatBlocks(step.distance)}` : '';
    text.append(instr, dist);
    li.appendChild(text);
    li.addEventListener('click', () => {
      map.flyTo({ center: step.maneuver.location, zoom: 16.5, duration: 900 });
    });
    stepsEl.appendChild(li);
  });
  highlightStep(state.activeStep);
}

function highlightStep(index) {
  state.activeStep = index;
  if (!stepsEl) return;
  stepsEl.querySelectorAll('.step').forEach((li) => {
    const cur = Number(li.dataset.index) === index;
    li.classList.toggle('current', cur);
    if (cur) li.scrollIntoView({ block: 'nearest' });
  });
}

// ---------------------------------------------------------------- hotbar

const SLOTS = [
  {
    id: 'search',
    label: 'Search',
    icon: ICONS.search,
    action: () => {
      if (state.navigating) return;
      els.search.focus();
    },
  },
  {
    id: 'directions',
    label: 'Directions',
    icon: ICONS.directions,
    action: () => {
      if (state.view === 'directions') closePanel();
      else showDirections();
    },
  },
  {
    id: 'locate',
    label: 'Find me',
    icon: ICONS.locate,
    action: () => {
      state.follow = true;
      updateHotbar();
      requireUser()
        .then((u) => map.flyTo({ center: u.lngLat, zoom: Math.max(map.getZoom(), 15), duration: 1000 }))
        .catch((err) => {
          state.follow = false;
          updateHotbar();
          toast(err.message || 'Could not get your location');
        });
    },
  },
  { id: 'zoom-in', label: 'Zoom in', icon: ICONS.plus, action: () => map.zoomIn() },
  { id: 'zoom-out', label: 'Zoom out', icon: ICONS.minus, action: () => map.zoomOut() },
];

for (const slot of SLOTS) {
  const b = document.createElement('button');
  b.className = 'slot';
  b.dataset.slot = slot.id;
  b.dataset.label = slot.label;
  b.setAttribute('aria-label', slot.label);
  b.appendChild(spriteCanvas(slot.icon, { scale: 3 }));
  b.addEventListener('click', slot.action);
  els.hotbar.appendChild(b);
}

function updateHotbar() {
  els.hotbar.querySelector('[data-slot="directions"]').classList.toggle('selected', state.view === 'directions');
  els.hotbar.querySelector('[data-slot="locate"]').classList.toggle('selected', state.follow && !!state.user);
}

// ---------------------------------------------------------------- map interactions

async function dropPin(lngLat) {
  toast('Looking up that spot...', 1500);
  const place = await reverseGeocode(lngLat);
  setDestination(place, { openCard: true });
}

map.on('contextmenu', (e) => {
  e.preventDefault();
  dropPin(e.lngLat.toArray());
});

let pressTimer = null;
map.on('touchstart', (e) => {
  clearTimeout(pressTimer);
  if (e.originalEvent.touches.length !== 1) return;
  const at = e.lngLat.toArray();
  pressTimer = setTimeout(() => dropPin(at), 650);
});
map.on('touchmove', () => clearTimeout(pressTimer));
map.on('touchend', () => clearTimeout(pressTimer));
map.on('touchcancel', () => clearTimeout(pressTimer));

map.on('click', () => {
  els.results.hidden = true;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.view && document.activeElement?.tagName !== 'INPUT') closePanel();
});

// ---------------------------------------------------------------- helpers

let toastTimer = null;
function toast(msg, ms = 2800) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, ms);
}

function setLoading(pct, msg) {
  els.loadingBar.style.width = `${pct}%`;
  if (msg) els.loadingMsg.textContent = msg;
}

// Expose a little for debugging in the console.
window.blocknav = { map, state, setDestination, setOrigin, showDirections, startNav, endNav };
