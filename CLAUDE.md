# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at localhost:3000
npm run build     # static export to out/
npm run lint      # run ESLint
npm run lint:fix  # auto-fix lint issues
npm start         # build + serve out/ locally (not for production)
```

There are no tests.

## Architecture

This is a Next.js 16 **Pages Router** app configured for **static export** (`output: 'export'`), deployed to GitHub Pages. There is no server-side rendering at runtime — the build produces static HTML/JS in `out/`.

### Game rendering

The app is a 2D platformer. The game engine runs persistently in the layout regardless of which page is active:

- `contexts/game_context.js` — `GameProvider` (wraps the app in `_app.js`) creates a shared `useRef(null)` via context. `useGame()` returns this ref. `Layout` passes it to `<GameEngine ref={gameRef} />`, and `Navbar` calls it to invoke imperative methods. This is the only mechanism for cross-component game control.
- `components/layout.js` — mounts `<GameEngine ref={gameRef} />` inside `<main>` before `{children}`. Non-index pages render as **React-Bootstrap Modal portals** (`ReactDOM.createPortal` to `document.body`) that overlay the live canvas.
- `components/game_engine.js` — `forwardRef` component; owns all Matter.js state (engine, runner, renderer, player body). Uses `Events.on(engine, 'afterUpdate')` for the game tick and `Events.on(render, 'afterRender')` to draw sprites manually via `ctx.drawImage`. The physics body is invisible (`render: { opacity: 0 }`); the sprite is drawn on top. Exposes an imperative API via `useImperativeHandle`: `restart()`, `pause()`, `resume()`, `setVolume(v)`, `getVolume()`, `mute()`, `unmute()`, `isMuted()`. The `WIREFRAMES` constant at the top is a dev toggle for Matter.js hitbox wireframes.
- `components/sprite_sheet.js` — pure config factory (`createSpriteSheet(config)`). Defines the spritesheet grid: per-row `frameCount`, `rowHeight`, `columnWidth`, and `leftOffset`. `rowY` is computed automatically. Tunable via `SLIME_SHEET_CONFIG`.
- `components/sprite_animation.js` — plain class managing animation state. `setAnimation(name)`, `update(deltaMs)`, `getFrame()` returns `{ x, y, w, h }` crop rect for `ctx.drawImage`.

### Portal system

Portals are static sensor bodies (`isSensor: true`) placed procedurally in the world. On player collision the physics runner is stopped and a React Modal confirmation dialog is shown. URLs come from `public/data.json` (fetched at runtime) as `{ url, weight }` entries; portals are assigned via weighted-random selection. Accepting a portal navigates via `window.location.href`; declining removes the body and resumes the runner.

### Pages and routing

`pages/_app.js` is a minimal wrapper: `<Layout><Component {...pageProps} /></Layout>`. No props are drilled through `Component`.

Non-index pages (e.g. `pages/settings.js`) must guard against SSR by returning `null` until mounted (`useState(false)` + `useEffect(() => setMounted(true), [])`), because Modal portals reference `document.body` which doesn't exist during Next.js's static pre-render pass.

### Styling

Bootstrap 5 is loaded via a local theme file imported in `styles/global.css`. The active theme is **Solarized** (`themes/solar/bootstrap.min.css`). Key Solarized colors used in game: `#073642` (base02, canvas background), `#586e75` (base01, floor), `#b58900` (primary yellow, canvas border).

### Assets

Sprite sheets live in `public/assets/sprites/` and are served at `/assets/sprites/`. They are pixel art PNGs (368×128px for standard slimes). The sheet has 6 animation rows; the last two (`attack`, `jump`) are taller (32px) than the first four (16px).
