# Full-flow engine anatomy

Frame-locked longitudinal section of a full-flow staged combustion cycle. Raptor-inspired. 1,020 frames at 30 fps. No invented chamber pressure, shaft speed, mixture ratio, or gimbal angle.

The plate is a schematic. Left/right clocking is there so both propellant circuits stay readable. It is not a manufacturing drawing and not a certified engineering reference.

## Run

```bash
npm install
npm run dev
```

The player is at `http://127.0.0.1:8734/`.

- Space plays and pauses.
- Arrow keys step one frame. Shift plus an arrow jumps 30 frames.
- Keys 1–5 jump to the five beats.
- `?frame=690&play=0` opens a still of that frame.

```bash
npm run verify
npm run build
```

`verify` checks that the five beats cover frames 0–1019 without gaps, that the camera eases, and that the held ending is still. `dist/` is a static site. Asset paths are relative so the same build works on GitHub Pages.

## What the colors mean

- Cyan: primary pathway. Thick line, majority branch. Thin line, minority branch.
- Gold: shaft work, and heat moving into the coolant.
- Violet: a change of state, not a sensor reading.

## Publish

Pushing `main` runs `.github/workflows/pages.yml`, which builds `dist/` and publishes the `gh-pages` branch with the workflow's `GITHUB_TOKEN`. No secret is stored in the repo.

## About and topics

About: Frame-accurate sectional anatomy of a Raptor-inspired full-flow staged combustion cycle, with no invented pressures or shaft speeds.

Topics: `aerospace`, `rocket-propulsion`, `staged-combustion`, `full-flow`, `raptor`, `technical-visualization`, `methalox`, `engineering-education`, `regenerative-cooling`, `de-laval`

## Fonts

Space Grotesk and JetBrains Mono are SIL Open Font License subsets in `src/fonts/`. See `src/fonts/OFL-Cursor.txt`.
