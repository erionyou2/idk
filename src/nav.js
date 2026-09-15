// Search (Photon), routing (OSRM via FOSSGIS), and the geometry math for live navigation.
// Every service here is free and keyless.

import { REGION } from './mapstyle.js';

const PHOTON = 'https://photon.komoot.io';
const OSRM_FOSSGIS = 'https://routing.openstreetmap.de';
const OSRM_DEMO = 'https://router.project-osrm.org';

export const MODES = {
  car: { label: 'Minecart', icon: 'minecart', profile: 'routed-car' },
  bike: { label: 'Horse', icon: 'horse', profile: 'routed-bike' },
  foot: { label: 'Boots', icon: 'boots', profile: 'routed-foot' },
};

// ---------------------------------------------------------------- search

function placeFromPhoton(feature) {
  const p = feature.properties || {};
  const [lng, lat] = feature.geometry.coordinates;
  const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ');
  const name = p.name || streetLine || p.city || p.county || 'Unnamed place';
  const parts = [];
  if (p.name && streetLine) parts.push(streetLine);
  const locality = p.city || p.town || p.village || p.district || p.locality || p.county;
  if (locality && locality !== name) parts.push(locality);
  if (p.state && p.state !== 'Texas') parts.push(p.state);
  if (p.postcode) parts.push(p.postcode);
  return {
    name,
    subtitle: parts.join(', ') || 'Texas',
    kind: p.osm_value || p.type || '',
    lngLat: [lng, lat],
    extent: p.extent || null,
  };
}

export async function searchPlaces(query, { near, limit = 6, signal } = {}) {
  const url = new URL(`${PHOTON}/api/`);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('lang', 'en');
  url.searchParams.set('bbox', REGION.searchBbox.join(','));
  if (near) {
    url.searchParams.set('lon', String(near[0]));
    url.searchParams.set('lat', String(near[1]));
    url.searchParams.set('location_bias_scale', '0.4');
    url.searchParams.set('zoom', '12');
  }
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const json = await res.json();
  return (json.features || []).map(placeFromPhoton);
}

export async function reverseGeocode([lng, lat], { signal } = {}) {
  try {
    const url = new URL(`${PHOTON}/reverse`);
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lang', 'en');
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Reverse geocode failed (${res.status})`);
    const json = await res.json();
    const f = json.features?.[0];
    if (f) {
      const place = placeFromPhoton(f);
      return { ...place, lngLat: [lng, lat] };
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err;
  }
  return { name: 'Dropped pin', subtitle: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, kind: 'pin', lngLat: [lng, lat] };
}

// ---------------------------------------------------------------- routing

async function osrmRequest(prefix, from, to, signal) {
  // OSRM separates waypoints with ";". Percent-encoding it keeps strict proxies happy and OSRM decodes it.
  const coords = `${from[0]},${from[1]}%3B${to[0]},${to[1]}`;
  const url = `${prefix}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true&annotations=false`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);
  const json = await res.json();
  if (json.code !== 'Ok' || !json.routes?.length) throw new Error(json.message || 'No route found');
  return json.routes[0];
}

export async function fetchRoute(from, to, mode = 'car', { signal } = {}) {
  const profile = MODES[mode]?.profile || MODES.car.profile;
  let raw;
  try {
    raw = await osrmRequest(`${OSRM_FOSSGIS}/${profile}`, from, to, signal);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    // The demo server only has a car profile; use it as a fallback for driving.
    if (mode !== 'car') throw err;
    raw = await osrmRequest(OSRM_DEMO, from, to, signal).catch(() => {
      throw err;
    });
  }
  return prepareRoute(raw, mode);
}

// ---------------------------------------------------------------- geometry

const R_EARTH = 6371008.8;

export function haversine([lng1, lat1], [lng2, lat2]) {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(a));
}

const sameCoord = (a, b) => a && b && Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;

/**
 * Flattens the OSRM response into one coordinate list with cumulative distances, and
 * records where each step starts along it so a position can be mapped to a step.
 */
export function prepareRoute(raw, mode) {
  const steps = raw.legs.flatMap((leg) => leg.steps);
  const coords = [];
  const cum = [];
  const stepStartDist = [];

  for (const step of steps) {
    const g = step.geometry?.coordinates || [];
    let recordedStart = false;
    for (let i = 0; i < g.length; i++) {
      const c = g[i];
      const last = coords[coords.length - 1];
      if (last && sameCoord(last, c)) {
        if (!recordedStart) {
          stepStartDist.push(cum[cum.length - 1]);
          recordedStart = true;
        }
        continue;
      }
      const d = last ? cum[cum.length - 1] + haversine(last, c) : 0;
      coords.push(c);
      cum.push(d);
      if (!recordedStart) {
        stepStartDist.push(d);
        recordedStart = true;
      }
    }
    if (!recordedStart) stepStartDist.push(cum[cum.length - 1] ?? 0);
  }

  const total = cum[cum.length - 1] ?? 0;
  const stepEndDist = stepStartDist.map((_, i) => stepStartDist[i + 1] ?? total);

  return {
    mode,
    distance: raw.distance,
    duration: raw.duration,
    geometry: raw.geometry,
    steps: steps.map((s, i) => ({
      ...s,
      index: i,
      instruction: buildInstruction(s),
      startDist: stepStartDist[i],
      endDist: stepEndDist[i],
    })),
    coords,
    cum,
    total,
  };
}

/** Projects a position onto the route. Returns null for an empty route. */
export function locateOnRoute(route, [lng, lat]) {
  const { coords, cum, steps, total } = route;
  if (coords.length < 2) return null;

  const kx = Math.cos((lat * Math.PI) / 180) * 111320;
  const ky = 110540;
  const px = lng * kx;
  const py = lat * ky;

  let best = { dist: Infinity, along: 0 };
  for (let i = 0; i < coords.length - 1; i++) {
    const ax = coords[i][0] * kx;
    const ay = coords[i][1] * ky;
    const bx = coords[i + 1][0] * kx;
    const by = coords[i + 1][1] * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (d < best.dist) best = { dist: d, along: cum[i] + t * (cum[i + 1] - cum[i]) };
  }

  let stepIndex = 0;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].startDist <= best.along + 1e-6) stepIndex = i;
  }
  // The final "arrive" step has zero length; stay on the step leading into it.
  if (stepIndex === steps.length - 1 && steps.length > 1) stepIndex = steps.length - 2;

  const step = steps[stepIndex];
  const next = steps[stepIndex + 1] || null;
  const toNextManeuver = Math.max(0, step.endDist - best.along);
  const stepLen = Math.max(1, step.endDist - step.startDist);
  let remainingDuration = (toNextManeuver / stepLen) * step.duration;
  for (let i = stepIndex + 1; i < steps.length; i++) remainingDuration += steps[i].duration;

  return {
    distanceToRoute: best.dist,
    along: best.along,
    stepIndex,
    step,
    next,
    toNextManeuver,
    remainingDistance: Math.max(0, total - best.along),
    remainingDuration,
  };
}

// ---------------------------------------------------------------- instructions

const MOD_WORD = {
  'sharp left': 'sharp left',
  left: 'left',
  'slight left': 'slightly left',
  straight: 'straight',
  'slight right': 'slightly right',
  right: 'right',
  'sharp right': 'sharp right',
  uturn: 'around',
};

function compass(bearing) {
  const dirs = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  return dirs[Math.round(((bearing % 360) + 360) % 360 / 45) % 8];
}

function roadName(step) {
  if (step.name && step.ref) return `${step.name} (${step.ref})`;
  return step.name || step.ref || '';
}

export function buildInstruction(step) {
  const m = step.maneuver || {};
  const name = roadName(step);
  const mod = m.modifier || '';
  const word = MOD_WORD[mod] || mod;
  const onto = name ? ` onto ${name}` : '';
  const on = name ? ` on ${name}` : '';
  switch (m.type) {
    case 'depart':
      return `Head ${compass(m.bearing_after ?? 0)}${on}`;
    case 'arrive':
      return `Arrive at your destination${mod && mod !== 'straight' ? `, on the ${mod}` : ''}`;
    case 'turn':
      if (mod === 'uturn') return `Make a U-turn${onto}`;
      if (mod === 'straight') return `Continue straight${onto}`;
      return `Turn ${word}${onto}`;
    case 'new name':
    case 'continue':
      return `Continue${mod && mod !== 'straight' ? ` ${word}` : ''}${onto}`;
    case 'merge':
      return `Merge ${word || 'ahead'}${onto}`;
    case 'on ramp':
      return `Take the ramp${mod ? ` on the ${mod.replace('slight ', '')}` : ''}${onto}`;
    case 'off ramp':
      return `Take the exit${mod ? ` on the ${mod.replace('slight ', '')}` : ''}${onto}`;
    case 'fork':
      return `Keep ${word || 'straight'}${onto}`;
    case 'end of road':
      return `At the end of the road, turn ${word}${onto}`;
    case 'roundabout':
    case 'rotary':
      return `Enter the roundabout${m.exit ? ` and take exit ${m.exit}` : ''}${onto}`;
    case 'roundabout turn':
      return `At the roundabout, turn ${word}${onto}`;
    case 'exit roundabout':
    case 'exit rotary':
      return `Exit the roundabout${onto}`;
    default:
      return `Continue${onto}`;
  }
}

// ---------------------------------------------------------------- formatting

const M_PER_MILE = 1609.344;
const M_PER_FOOT = 0.3048;

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '--';
  if (meters < 0.15 * M_PER_MILE) {
    const ft = Math.max(10, Math.round(meters / M_PER_FOOT / 10) * 10);
    return `${ft} ft`;
  }
  const mi = meters / M_PER_MILE;
  return mi >= 10 ? `${Math.round(mi)} mi` : `${mi.toFixed(1)} mi`;
}

/** In Minecraft one block is one meter. */
export function formatBlocks(meters) {
  if (!Number.isFinite(meters)) return '';
  return `${Math.round(meters).toLocaleString()} blocks`;
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '--';
  const min = Math.round(seconds / 60);
  if (min < 1) return '<1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function formatEta(seconds) {
  const t = new Date(Date.now() + seconds * 1000);
  return t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
