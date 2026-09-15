# BlockNav

A Minecraft-themed, top-down 2D GPS for **Boerne, Helotes and San Antonio, Texas**.
It works like a normal navigation app: it finds you, you search for a place (or long-press the
map), it mines a route, and it gives live turn-by-turn directions with re-routing when you miss a turn.

Every road, river, building and park is drawn with a procedurally generated block texture. Roads are
stone bricks, cobblestone and gravel. Water is water. Camp Bullis is netherrack. Labels use a pixel font.

## Run it

```bash
npm install
npm run dev
```

Open the printed URL. On a phone, open the same URL over your local network (Vite prints it), or
deploy to GitHub Pages (below) and open it over HTTPS. **Browsers only allow GPS on HTTPS or
localhost**, so the deployed URL is what you want on your phone.

## Deploy (GitHub Pages)

The workflow in `.github/workflows/deploy.yml` builds and publishes the site on every push to `main`.
One-time setup: repo **Settings → Pages → Source: GitHub Actions**. The site lands at
`https://<user>.github.io/<repo>/`. Add it to your phone's home screen and it runs full-screen.

## How to use

| Action | How |
| --- | --- |
| Find me | The compass slot on the hotbar (also happens automatically on load) |
| Search a place | Type in the top bar, pick a result |
| Drop a pin | Right-click on desktop, long-press on a phone |
| Route from where you are | Pick a place → **Directions** (From defaults to *My location*) |
| Route from somewhere else | Type any address into the **From** field, or pick a place → **Start here** |
| Change vehicle | Minecart (drive), Horse (bike), Boots (walk) |
| Navigate | **Start**. The banner shows the next turn; it re-routes if you go off course |
| Stop | **End** on the banner |

Distances show in miles and feet, plus blocks (1 block = 1 meter).

## How it works, no API keys

| Piece | Service | Cost |
| --- | --- | --- |
| Map data | [OpenFreeMap](https://openfreemap.org) vector tiles (OpenMapTiles schema, OpenStreetMap data) | Free, no key |
| Rendering | [MapLibre GL JS](https://maplibre.org) with a custom style in `src/mapstyle.js` | Open source |
| Block textures | Generated at runtime in `src/textures.js`, no Mojang assets | n/a |
| Search | [Photon](https://photon.komoot.io) (komoot), results limited to the Boerne–San Antonio box | Free, no key |
| Routing | [OSRM](https://project-osrm.org) hosted by [FOSSGIS](https://routing.openstreetmap.de) for car, bike and foot | Free, no key |
| Position | The browser Geolocation API | n/a |

These public services are for light, personal use. If you want to open this to lots of people, host
your own OSRM and Photon or switch to a paid provider. The code in `src/nav.js` isolates both calls.

## Layout

```
index.html            page skeleton
src/main.js           app wiring: map, GPS, search, routing, navigation, hotbar
src/mapstyle.js       the MapLibre style (which block goes on which feature)
src/textures.js       procedural 16x16 block textures
src/sprites.js        pixel-art icons, turn arrows and markers
src/nav.js            Photon search, OSRM routing, route math, instruction text
src/style.css         Minecraft GUI styling
public/fonts          Pixelify Sans (SIL Open Font License)
```

Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
