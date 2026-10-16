// Run one of this app's TypeScript modules from a plain `node` script.
//
// The St. Eugene tools (audit, seed) need the real curriculum and the real
// types, which live in TypeScript. Node cannot import those directly — its
// type-stripping wants explicit `.ts` extensions, which the app does not use —
// and esbuild is not a dependency here. Vite is, and it resolves the app's
// imports exactly as the app does, so it bundles the entry to a temp file we
// import back.
import { build } from 'vite'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export async function loadTs(entryPath) {
  const outDir = mkdtempSync(join(tmpdir(), 'se-ts-'))
  await build({
    configFile: false,
    logLevel: 'error',
    build: {
      ssr: entryPath,
      outDir,
      emptyOutDir: false,
      minify: false,
      rollupOptions: { output: { entryFileNames: 'mod.mjs', format: 'es' } },
    },
  })
  return import(pathToFileURL(join(outDir, 'mod.mjs')).href)
}
