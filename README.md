# Carom

A browser arcade duel about spin, timing, and bank shots. Slide your paddle as you
strike to curve the ball around two swaying, rotating obstacles. Play the Solo AI
or share a keyboard in local Versus. First to 11 wins, with a two-point lead.

Everything is drawn on canvas and every sound is synthesized. The static game
needs no backend, accounts, external assets, or runtime network requests.

## Run

Requires Node.js compatible with Vite 8 (Node 22.12+ recommended).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite.

```sh
npm run build
npm run preview
```

The production build is in `dist/`. Serve that directory at the root of any
static site host. No additional build or deployment step is needed.

## Controls

| Action | Controls |
| --- | --- |
| Solo paddle | W / S or ↑ / ↓ |
| Versus left paddle | W / S |
| Versus right paddle | ↑ / ↓ |
| Select a menu item | W / S or ↑ / ↓; mouse or touch |
| Confirm | Enter or Space; click or tap |
| Pause / resume | P or Escape |
| Back | Escape |
| Toggle sound | M |
| Engine diagnostics | Backtick |

Touching the screen reveals the engine's paddle sliders and menu controls.
Move at the instant of contact to add spin; an off-center strike changes the
initial bounce angle. Wall and obstacle bounces preserve the ball's speed.

## Development

The Simple 2D engine owns the clock, input, canvas fit, sound, diagnostics, and
recording. The game keeps its state in immutable values and separates rendering
from the simulation. The engine's `debug` surface provides the poses and readings
specified in `specs/instrumentation.md`; no debug object is installed on the page.

```sh
npm run typecheck
npm run lint
npm run format
npm test
```

Tests run the real engine with an in-memory canvas and counted clock frames.
They exercise menu input, pause and reset, paddle controls, AI, collision and
spin, scoring, mute, and debug operations. `showcase/` contains player-facing
copy, screenshots, and a recording of live play.
