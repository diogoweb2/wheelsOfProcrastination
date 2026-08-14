# Wheels of Procrastination

Rules for the game live in BUSINESS_REQUIREMENTS.md — that file is canonical.

## Routes (IMPORTANT)

Every new feature MUST be reachable at its own URL — `/<app>/<tab>`, matching the ids in `src/apps/registry.ts`. Two sub-apps never share a URL. See BUSINESS_REQUIREMENTS.md §1c.

## Images (IMPORTANT — low storage available)

Every image added to `public/` MUST be resized and compressed before use:

- Resize to the actual display size (at most 2× for retina). e.g. a 58px button icon → 128px asset, never a 320px+ original.
- Prefer webp output. `sharp` is already in node_modules; use it:
  `node -e "require('sharp')('in.png').resize(128,128).webp({quality:80}).toFile('public/out.webp')"`
- Give assets a descriptive name (e.g. `quest-log.webp`) and delete the raw/original file from `public/` afterwards.
