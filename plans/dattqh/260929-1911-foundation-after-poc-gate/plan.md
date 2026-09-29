---
title: "Foundation sau POC Gate (Master Plan v3 task #2, #3, #7, #8, #9, #12)"
description: "Đồng bộ docs/rules theo Master Plan, dựng monorepo Vite+React / Express / Drizzle, auth phụ huynh + hồ sơ trẻ, API nhân vật-tiến độ-thưởng tối thiểu, chỉnh visual chibi, chuyển runtime POC vào app web, duyệt cuối một lần."
status: in-progress
priority: P1
effort: "3-4w"
branch: main
tags: [docs, infra, backend, auth, frontend, database, visual]
blockedBy: []
blocks: []
created: 2026-09-29
---

# Foundation sau POC Gate

## Overview
Biến POC thành nền sản phẩm. Nguồn quyết định: `plans/dattqh/reports/brainstorm-260929-1905-next-steps-after-poc-gate.md` (contract, cấu trúc, stable ID, quyết định Jev + người sở hữu) và Master Plan v3. Thứ tự "backend trước" theo quyết định người sở hữu; Visual chạy song song vì không chung file.

Không thuộc plan này: SLICE-xx (Creator, HUD, map, quest runtime đầy đủ, thử thách, ba lô — task #10–#20), DEVICE-01 (đo đủ trên máy chuẩn iPad Gen 10 trước MVP), multiplayer.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Master Plan, `docs/`, `.claude/rules/`, `CLAUDE.md`, README phản ánh sản phẩm theo Master Plan, không còn lấy phạm vi POC | P1 |
| 2 | Monorepo chạy được: `apps/web` (Vite+React), `apps/server` (Express), `packages/schema` (phase 2), `packages/quest` (phase 5); CI có audit + SAST | P1 |
| 3 | Phụ huynh đăng ký/đăng nhập, đồng ý, tạo và chọn hồ sơ trẻ; test IDOR cho mọi endpoint | P1 |
| 4 | Server là nguồn sự thật cho nhân vật, tiến độ quest, XP/Xu/Skill XP/vật phẩm; test chống gian lận | P1 |
| 5 | Miu chibi, phụ kiện, palette block chỉnh xong; người duyệt chọn 1 biến thể | P1 |
| 6 | Runtime POC chạy trong `apps/web` qua game-bridge; `apps/poc-voxel` bị xóa | P1 |

## Phases

| # | Phase | ID | Tier | Depends | Status |
|---|-------|----|------|---------|--------|
| 1 | [Đồng bộ Master Plan + docs/rules](./phase-01-align-master-plan-docs-rules.md) | DOCS-01 | M | — | Xong |
| 2 | [Monorepo foundation](./phase-02-monorepo-foundation.md) | FOUNDATION-01 | M | 1 | Xong (chờ CI: audit, Semgrep) |
| 3 | [Schema + database](./phase-03-schema-and-database.md) | FOUNDATION-03 | M | 2 | Xong (chờ CI Postgres 17) |
| 4 | [Auth phụ huynh + hồ sơ trẻ](./phase-04-parent-auth-and-child-profile.md) | FOUNDATION-02 | L | 3 | Xong (chờ CI Postgres 17) |
| 5 | [API nhân vật, tiến độ, thưởng](./phase-05-character-progress-reward-api.md) | FOUNDATION-04 | M | 4 | Xong (chờ CI Postgres 17) |
| 6 | [Visual chibi + palette](./phase-06-visual-chibi-palette.md) | VISUAL-01..03 | M | 1 | Xong (chờ người duyệt chọn biến thể) |
| 7 | [Runtime vào app web](./phase-07-engine-into-web-app.md) | ENGINE-01 | L | 5, 6 | Xong |
| 8 | [Trang review + gate](./phase-08-delivery-review-gate.md) | — | S | 7 | Đang làm (chờ người duyệt) |

Phase 6 chạy song song với 2–5: phase 6 chỉ chạm `content/`, `tools/assets/`, `assets/generated/`, `apps/poc-voxel/src/review/`; phase 2–5 không chạm các đường dẫn đó.

## Cấu trúc đích
```
apps/web/            Vite + React SPA; src/game (Three.js), src/game-bridge (store), src/ui (React)
apps/server/         Express 5 + Drizzle; src/{auth,child-profile,character,quest,reward,db}
packages/voxel/      TS thuần, không import three (giữ nguyên)
packages/quest/      TS thuần: tiến trình bước quest, tính thưởng, level — dùng chung web + server
packages/schema/     Zod: DTO API + schema nội dung
content/ assets/ tools/
```
Luồng: game phát event → `packages/quest` dự đoán ở client → API server tính lại, ghi DB, trả kết quả chuẩn → store → React.

## Success Criteria
- [ ] Master Plan §7, §15 và docs/rules khớp nhau; không còn mục "chờ chốt" cho Q3–Q8
- [ ] `pnpm assets:check`, `pnpm test`, `pnpm typecheck`, `pnpm lint` xanh; CI thêm `pnpm audit` + Semgrep xanh; integration test chạy trên Postgres thật trong CI
- [ ] Test IDOR và chống gian lận cho mọi endpoint phase 4–5
- [ ] E2E `apps/web`: đăng ký → đồng ý → tạo hồ sơ → vào game → đi lại, gặp NPC (nhãn tương tác hiển thị qua React)
- [ ] Ngân sách §12 giữ nguyên sau khi chuyển runtime (perf chạy lại một lần ở phase 8)
- [ ] Trang review cuối đợt: biến thể chibi, báo cáo bảo mật, dependency mới, bảng license, hiệu năng

## Rủi ro chính
| Rủi ro | Giảm thiểu |
| --- | --- |
| GPU mobile chưa có dữ liệu thật, gameplay xây trên engine chưa kiểm | Phase 8 mở `/play` trên iPad Gen 10 (máy chuẩn) và ghi FPS; đo đủ ở DEVICE-01 trước MVP |
| PGlite lệch Postgres thật | CI chạy integration test trên Postgres service container |
| Dữ liệu trẻ em / pháp lý (NĐ 13/2023) | Chỉ thu tối thiểu; văn bản đồng ý đánh dấu bản nháp, chờ pháp chế trước khi có người dùng thật |
| Di chuyển runtime làm hỏng hành vi POC | Chuyển E2E `poc.spec.ts` sang `apps/web` trước khi xóa `apps/poc-voxel` |

## Dependencies
Tiếp nối `plans/dattqh/260929-0842-asset-sourcing-and-voxel-poc/` (completed).

## Red Team Review
Chạy trong phiên (không spawn reviewer riêng; đã có đủ ngữ cảnh), 4 lăng kính: bảo mật, giả định, lỗi vận hành, phạm vi.

| # | Phát hiện | Bằng chứng | Quyết | Áp vào |
| --- | --- | --- | --- | --- |
| 1 | Cookie `Secure`/`__Host-` bị trình duyệt bỏ khi người duyệt mở trang review qua LAN (http) → không đăng nhập được | quy trình duyệt LAN `plans/dattqh/reports/poc-review-260929.md:6` | Accept | Phase 4: cookie dev/review không Secure, production bắt buộc + test |
| 2 | `Origin` check chặn origin LAN | như trên | Accept | Phase 4: `ALLOWED_ORIGINS` |
| 3 | Scrypt N=2^17 vượt `maxmem` mặc định 32 MB của Node → lỗi runtime | tài liệu `crypto.scrypt` | Accept | Phase 4: `maxmem` ≥ 256 MB |
| 4 | Nhãn NPC cập nhật vị trí mỗi khung hình; đưa vào state React trái nguyên tắc bridge | `apps/poc-voxel/src/entities/npc.ts:48` | Accept | Phase 7: React giữ nội dung/hiện-ẩn, game ghi transform qua ref |
| 5 | `perf.spec` vào `/play` cần hồ sơ active | phase 7 yêu cầu `/play` | Accept | Phase 7 |
| 6 | File mặt trong `content/accessories/` sẽ "mặc" được qua `PUT /api/character` | phase 5 validate `equipped` theo thư mục đó | Accept | Phase 6: `content/faces/` |
| 7 | Xóa mềm giữ dữ liệu trẻ, không có ai chạy purge | §9 tối thiểu dữ liệu | Accept (qua Jev) | Phase 3, 4: xóa cứng cascade |
| 8 | Cổng 5173/4173 bị POC giữ khi web cần chạy song song | `apps/poc-voxel/package.json` (`--strictPort`) | Accept | Phase 2 dùng 5174/4174 tạm; phase 7 trả về 5173/4173 |

### Whole-Plan Consistency Sweep
Đã grep `Validation` (câu còn treo), `xóa mềm`, `deleted_at`, `RecentReauth`, `face-*`: 0 kết quả sót. Không còn mâu thuẫn.

## Validation Log

### Session 1 — 2026-09-29
Người sở hữu giao TypeSafe Jev quyết (`jev-1.13.0`, Choice, `tools/decisions/jev-decide.py`). Câu dưới ngưỡng vẫn theo lựa chọn Jev theo chỉ đạo người sở hữu. Câu dữ liệu trẻ (stakes high) không cần hỏi người: Jev chọn phương án thu ít nhất, không vượt Master Plan §9.

| # | Câu hỏi | Stakes | Jev chọn (xác suất / conf) | Chốt |
| --- | --- | --- | --- | --- |
| 1 | Trường hồ sơ trẻ | high | display_name_only (0.55 / 0.32; grade band 0.45) | Chỉ tên hiển thị từ danh sách; thêm lớp học sau = hỏi người |
| 2 | Cổng phụ huynh | medium | parent_pin (0.73 / 0.59) | PIN 4–6 số, khóa sau 5 lần sai |
| 3 | Xác minh email | medium | defer_until_pre_launch (1.00 / 0.99) | Hoãn tới trước người dùng thật |
| 4 | SAST | low | semgrep_ce (1.00 / 1.00) | Semgrep CE |
| 5 | Router web | low | react_router (0.89 / 0.84) | React Router |
| 6 | Số hồ sơ tối đa | low | three (0.55 / 0.34) | 3 |
| 7 | Xóa hồ sơ trẻ | medium | hard_delete_cascade (0.99 / 0.99) | Xóa cứng cascade |
| 8 | Làm rõ mặt Miu | low | voxel_face_blocks_json (0.67 / 0.50) | Khối voxel từ JSON, gộp vào mesh |

### Verification Results
- Claims checked: 18 (đường dẫn POC cần chuyển, script `assets:*`/`world:*`, `APP_DIR` trong `render-preview.ts`, Worker `new URL` trong `world-renderer.ts:38`, `headScale` trong `content/characters.json`, CI `assets.yml`, mục §7/§14/§15 Master Plan, repo private, không Docker/psql)
- Verified: 18 | Failed: 0 | Unverified: 0
- Tier: Full (8 phase)

### Whole-Plan Consistency Sweep
Quyết định đã lan tới phase 2 (router, SAST), 3 (bảng, cascade, PIN), 4 (PIN, 3 hồ sơ, xóa cứng, email), 6 (mặt). Không còn mâu thuẫn.

<!-- slug: foundation-after-poc-gate -->
