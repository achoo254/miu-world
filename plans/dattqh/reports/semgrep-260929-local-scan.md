# Semgrep CE — bằng chứng chạy cục bộ

Date: 2026-09-29 · Máy dev Windows · Semgrep 1.178.0 (pip, venv tạm ngoài repo; máy không có Docker)

Lệnh (từ gốc repo):

```sh
semgrep scan --config p/typescript --config p/nodejs --metrics=off --no-git-ignore   --exclude node_modules --exclude dist --exclude test-results --exclude playwright --json apps packages
```

Kết quả: **0 phát hiện**, 0 lỗi quét, 98 file được quét.

File được quét:

- `apps\server\drizzle.config.ts`
- `apps\server\src\app.test.ts`
- `apps\server\src\app.ts`
- `apps\server\src\auth\account-summary.ts`
- `apps\server\src\auth\auth-context.ts`
- `apps\server\src\auth\auth-routes.test.ts`
- `apps\server\src\auth\auth-routes.ts`
- `apps\server\src\auth\consent-store.ts`
- `apps\server\src\auth\origin-check.ts`
- `apps\server\src\auth\secret-hashing.test.ts`
- `apps\server\src\auth\secret-hashing.ts`
- `apps\server\src\auth\session-cookie.ts`
- `apps\server\src\auth\session-store.ts`
- `apps\server\src\character\character-routes.ts`
- `apps\server\src\child-profile\child-profile-routes.test.ts`
- `apps\server\src\child-profile\child-profile-routes.ts`
- `apps\server\src\config.test.ts`
- `apps\server\src\config.ts`
- `apps\server\src\content\content-catalog.test.ts`
- `apps\server\src\content\content-catalog.ts`
- `apps\server\src\db\client.ts`
- `apps\server\src\db\schema.test.ts`
- `apps\server\src\db\schema.ts`
- `apps\server\src\http-error.ts`
- `apps\server\src\quest\quest-routes.test.ts`
- `apps\server\src\quest\quest-routes.ts`
- `apps\server\src\reward\reward-ledger.ts`
- `apps\server\src\server.ts`
- `apps\web\e2e\account-flow.spec.ts`
- `apps\web\e2e\parent-session.setup.ts`
- `apps\web\e2e\perf.spec.ts`
- `apps\web\e2e\play.spec.ts`
- `apps\web\e2e\stats.ts`
- `apps\web\playwright.config.ts`
- `apps\web\src\content-security-policy.test.ts`
- `apps\web\src\game-bridge\game-store.test.tsx`
- `apps\web\src\game-bridge\game-store.ts`
- `apps\web\src\game-bridge\use-game-state.ts`
- `apps\web\src\game\asset-loader.test.ts`
- `apps\web\src\game\asset-loader.ts`
- `apps\web\src\game\character\character-accessories.ts`
- `apps\web\src\game\content\accessories.ts`
- `apps\web\src\game\debug\review-shots.ts`
- `apps\web\src\game\debug\stats-overlay.ts`
- `apps\web\src\game\entities\npc.ts`
- `apps\web\src\game\entities\player-character.ts`
- `apps\web\src\game\entities\props.ts`
- `apps\web\src\game\game.ts`
- `apps\web\src\game\player\autopilot.ts`
- `apps\web\src\game\player\camera-rig.ts`
- `apps\web\src\game\player\input.ts`
- `apps\web\src\game\player\player-controller.ts`
- `apps\web\src\game\quality.ts`
- `apps\web\src\game\scene\sky.ts`
- `apps\web\src\game\world\block-material.ts`
- `apps\web\src\game\world\chunk-mesher.ts`
- `apps\web\src\game\world\mesher.worker.ts`
- `apps\web\src\game\world\world-data.ts`
- `apps\web\src\game\world\world-renderer.ts`
- `apps\web\src\main.tsx`
- `apps\web\src\preview\preview-main.ts`
- `apps\web\src\review\review-main.ts`
- `apps\web\src\ui\account\account-context.tsx`
- `apps\web\src\ui\account\account-flow.test.tsx`
- `apps\web\src\ui\account\consent-screen.tsx`
- `apps\web\src\ui\account\parent-gate.tsx`
- `apps\web\src\ui\account\profile-screens.tsx`
- `apps\web\src\ui\account\sign-in-screens.tsx`
- `apps\web\src\ui\account\use-submit.ts`
- `apps\web\src\ui\api-client.ts`
- `apps\web\src\ui\app-shell.tsx`
- `apps\web\src\ui\play\play-screen.test.tsx`
- `apps\web\src\ui\play\play-screen.tsx`
- `apps\web\vite-repo-assets.test.ts`
- `apps\web\vite-repo-assets.ts`
- `apps\web\vite.config.ts`
- `apps\web\vitest.config.ts`
- `packages\quest\src\level.test.ts`
- `packages\quest\src\level.ts`
- `packages\quest\src\quest-progress.test.ts`
- `packages\quest\src\quest-progress.ts`
- `packages\schema\src\account.test.ts`
- `packages\schema\src\account.ts`
- `packages\schema\src\content.test.ts`
- `packages\schema\src\content.ts`
- `packages\schema\src\game.ts`
- `packages\schema\src\health.ts`
- `packages\voxel\src\accessory-schema.ts`
- `packages\voxel\src\block-table.ts`
- `packages\voxel\src\chunk-format.test.ts`
- `packages\voxel\src\chunk-format.ts`
- `packages\voxel\src\greedy-mesher.test.ts`
- `packages\voxel\src\greedy-mesher.ts`
- `packages\voxel\src\grid-collision.test.ts`
- `packages\voxel\src\grid-collision.ts`
- `packages\voxel\src\voxel-accessory.test.ts`
- `packages\voxel\src\voxel-accessory.ts`
- `packages\voxel\src\world-entities.ts`

CI chạy lại cùng bộ luật trong job `sast` (`semgrep/semgrep:1.178.0`, cờ `--error`) trên mỗi push.
