---
phase: 2
title: "Monorepo foundation"
status: pending
priority: P1
effort: "M"
dependencies: [1]
---

# Phase 2: Monorepo foundation (FOUNDATION-01)

## Overview
Dựng khung chạy được cho `apps/web`, `apps/server`, `packages/schema`, `packages/quest`, cùng CI mở rộng (audit + SAST). Không có tính năng nghiệp vụ; mỗi app có một hành vi thật được test (web render shell, server trả `/api/health`).

## Requirements
- `apps/web` (`@miu/web`): Vite 8 + React 19 + TypeScript strict; `index.html` với CSP như POC (`script-src 'self'`, không `unsafe-eval`, `connect-src 'self'`); `src/main.tsx`, `src/ui/app-shell.tsx`; router React Router (library mode); dev `5173` KHÔNG dùng được song song với POC → web dev dùng cổng **5174**, preview **4174** (`--strictPort`), proxy `/api` → server. POC giữ 5173/4173 tới phase 7, sau đó web chuyển về 5173/4173.
- `apps/server` (`@miu/server`): Express 5 + TypeScript, chạy bằng `tsx watch` khi dev, build `tsc`; cổng cố định **8787**; `src/app.ts` (tạo app, dùng cho test với supertest), `src/server.ts` (listen); config từ env validate bằng Zod (fail sớm khi thiếu); `helmet`; JSON body limit 32 KB; `/api/health`; handler lỗi không lộ stack ra client.
- `packages/schema` (`@miu/schema`): Zod 4, export theo miền (bắt đầu với `health`).
- `packages/quest` (`@miu/quest`): TS thuần, chưa có logic (phase 5 thêm) — chỉ tạo khi phase 5 cần; KHÔNG tạo ở phase này.
- Root: `typecheck` chạy mọi project (`pnpm -r --if-present typecheck` + root tsconfig); `vitest.config.ts` include `apps/*/src/**/*.test.{ts,tsx}`; ESLint thêm `eslint-plugin-react-hooks` cho `apps/web`; `.gitignore` thêm `.data/`.
- CI (`.github/workflows/assets.yml` đổi tên thành `ci.yml` hoặc thêm job): giữ 4 gate; thêm `pnpm audit --prod --audit-level=high`; job Semgrep CE (container `semgrep/semgrep`, `semgrep scan --config p/typescript --config p/nodejs --error`, không cần tài khoản). CodeQL bị loại vì repo private cần Advanced Security trả phí.
- Dependency mới ghi vào danh sách cho trang review (phase 8).

## Implementation Steps
1. Test trước: `apps/server/src/app.test.ts` (GET `/api/health` → 200 `{status:"ok"}`, route lạ → 404 JSON, body > 32 KB → 413); `apps/web/src/ui/app-shell.test.tsx` (render bằng `@testing-library/react` + jsdom).
2. Tạo package + cấu hình TS riêng mỗi app (`tsconfig.json` extends `tsconfig.base.json`; web dùng `jsx: react-jsx`, `lib: DOM`).
3. Viết server tối thiểu, web shell, proxy dev.
4. Cập nhật root scripts, vitest, eslint, `.gitignore`.
5. Cập nhật CI; chạy Semgrep cục bộ không bắt buộc (không có Docker) — kiểm trên CI của nhánh.
6. Cập nhật `CLAUDE.md` mục Lệnh (lệnh dev server/web, cổng 8787/5174/4174 tạm).

## Success Criteria
- [ ] `pnpm --filter @miu/server dev` trả `/api/health`; `pnpm --filter @miu/web dev` hiển thị shell ở 5174 và gọi được `/api/health` qua proxy
- [ ] 4 gate xanh; test mới pass
- [ ] CI xanh với `pnpm audit` và Semgrep
- [ ] POC vẫn chạy (`pnpm --filter @miu/poc-voxel e2e --project poc` xanh)

## Risk Assessment
- ESLint/TS config chung vỡ khi thêm JSX. Xử lý: override theo glob `apps/web/**`.
- Semgrep báo giả trên tooling. Xử lý: chỉ quét `apps/`, `packages/`; ngoại lệ ghi bằng `nosemgrep` kèm lý do.
