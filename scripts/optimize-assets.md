Optimize the static images in public/ (SKIP public/backgrounds/ entirely — it has its own pipeline, `npm run backgrounds`).

1. Find every reference to public/ assets across src/, index.html, and vite.config.ts (root-path strings like "/nami.png"). For each image, work out the largest size it is ever rendered at (img width/height props, <Luffy size={...}> call sites, PWA manifest sizes, etc.).
2. Using sharp (already a devDependency — write a small temp .mjs script inside the project so node resolves it, and delete the script afterwards):
   - Resize each raster image to 3× its largest rendered CSS width (retina headroom), never enlarging.
   - Keep every filename, format, and transparency exactly as they are — references and the PWA manifest must keep working.
   - PWA icons (pwa-192.png, pwa-512.png) must keep their exact pixel dimensions; recompress only.
   - Recompress (png palette quality ~80 / webp quality ~80 / jpeg mozjpeg ~72) and only overwrite a file when the result is at least 10% smaller.
   - Leave SVGs and any file already under 20 KB alone; skip animated GIFs.
3. Ghost files: any file in public/ (still excluding backgrounds/) referenced nowhere in the codebase — double-check with a repo-wide grep including vite.config.ts and index.html — should be deleted.
4. Finish with a table of before → after sizes, the list of deleted ghosts, and run `npm run build` to confirm nothing broke.
