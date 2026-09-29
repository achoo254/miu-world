# Code review — asset intake + voxel POC (2026-09-29)

Reviewer: independent `code-reviewer` subagent (read-only). Fixes applied by the implementing session afterwards.
Checks at review time: `pnpm test` 50/50, typecheck 0, lint 0; `assets:check` red (stale manifest after a perf run → M1).

## Findings and resolution

| ID | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| M1 | must | Review PNGs / perf.json rewritten by render/perf runs → manifest stale, gate red | `render-preview.ts` and `perf.spec.ts` regenerate the manifest when done; gate also self-checks the manifest (G1) |
| M2 | must | Symlinks under `assets/` passed the gate (target hashed) | `listFiles` never follows links; gate reports `not a regular file`; test added |
| M3 | must | Drag-to-orbit ignored (canvas is the event target) | Accept any target except joystick/buttons; Playwright drag test added |
| S1 | should | Camera aim point inside 2-block-high canopy → camera inside leaves | Aim at 1.9, stepped down while inside a block; no 0.6 floor, 0.3 margin |
| S2 | should | Worker failing midway + fallback → duplicate chunk meshes; no timeout | Chunks buffered until worker finishes; 20 s timeout |
| S3 | should | Malformed `%` URL → unhandled rejection in dev/preview server | try/catch → 400; stream error handler; handler wraps promise |
| S4 | should | CSP `connect-src ws:` allowed any WebSocket host | Removed `ws:` |
| G1 | should | Gate trusted a hand-edited manifest | Gate compares `manifest.json` to a fresh `buildManifest()` |
| G2 | should | Extension blocklist incomplete | Allowlist `.glb .png .json .bin .ogg .woff2 .txt` + `LICENSE`; `nosniff` header |
| G3 | should | Accessory budget test hard-coded 2 files | Test iterates `content/accessories/*.json` |
| — | nice | jointIndex −1 → joint 255; non-identity rig top; index-range check order | Throw on unknown joint; assert identity top; check before Uint16Array; validator errors on unbound joint |
| — | nice | RLE varint overflow / trailing bytes | Reject shift > 21, run ≤ 0, trailing bytes |
| — | nice | GLTF cache kept failed loads | Failed promise evicted; shared-scene contract documented |
| — | nice | Bad `?outfit=` crashed load | Entry skipped with a warning |
| — | quality | Atlas shader snippet ×2, `@font-face` ×2, worker `as unknown as` | `injectAtlas()` helper; shared `fonts.css`; `DedicatedWorkerGlobalScope` |

Not changed (recorded):
- Production build copies all manifest files (~24 MB incl. unused pack files and review images) into `dist/`. First-area download is unaffected (1.9 MB raw / 0.45 MB gzip measured). Trimming to runtime-referenced files belongs to the real app build (Master Plan task #3).
- Vite dev server `/@fs/` can read workspace files; the manifest-only guarantee applies to preview/production. Dev-only.
- Mirrored textures on +x/−z faces; boulder can overwrite a tree base log — cosmetic.
- No automated determinism test for the map (verified manually: identical `chunks.bin` across runs).

## Verification after fixes
- Unit: 8 files, 52 tests pass. Typecheck (tools + packages + app) 0 errors. ESLint 0 warnings.
- Rebuilt `miu-cat.glb`, `atlas.png`, `chunks.bin`: byte-identical to pre-fix outputs.
- `assets:check` OK — 12 packs, 1060 files. Hand-edited manifest entry → FAILED as expected.
- E2E (production preview): 5/5 pass incl. new drag-orbit test.
- `perf.json` predates the fixes; the fixes do not change GPU work (shader refactor emits identical GLSL, camera aim change is CPU-trivial), so the matrix was not re-run.
