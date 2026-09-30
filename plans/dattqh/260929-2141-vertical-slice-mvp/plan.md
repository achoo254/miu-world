---
title: "Vertical slice MVP (Master Plan v3 task #4, #10–#20, #21 phần icon, #22)"
description: "Một vòng chơi trọn vẹn ở Khu rừng bí mật chương 1: tạo nhân vật, Home + HUD, khám phá, NPC, quest bằng dữ liệu, 3 thử thách Toán có hỗ trợ học, thưởng/Level Up/mở khóa do server tính, ba lô và bộ sưu tập."
status: in-progress
priority: P1
effort: "5-6w"
branch: main
tags: [frontend, backend, game, content, security]
blockedBy: []
blocks: []
created: 2026-09-29
---

# Vertical slice MVP

## Overview
Hiện thực luồng Master Plan §13: Mở game → Home → Tạo nhân vật → Vào Khu rừng bí mật → Di chuyển → Khám phá → Gặp NPC → Nhận quest → Tương tác → Thử thách Toán → Thưởng → XP và kỹ năng → Mở khóa chương tiếp. Nền đã có từ đợt Foundation (`plans/dattqh/260929-1911-foundation-after-poc-gate/`): runtime `Game` + game-bridge, auth phụ huynh (Google), hồ sơ trẻ, API nhân vật/tiến độ/thưởng, `packages/quest`, Miu chibi A, map rừng ch1.

Nguồn quyết định: Master Plan v3 §2–§6, §9, §11, §13, §16, §17; brainstorm `plans/dattqh/reports/brainstorm-260929-1905-next-steps-after-poc-gate.md` (đọc hiểu trong slice = đọc lá thư/manh mối khi khám phá, skill `doc-hieu`; 3 thử thách Toán; không làm M2.3).

Không thuộc plan này: loài Thỏ/Cáo/Gấu, Kim cương, chuỗi ngày (streak), slot Áo/Giày/Cánh (ô khóa "Sắp có"), lưu nội dung câu trả lời của trẻ, đặt/phá block, Skill Check/Boss/ghép câu/lựa chọn hành động thật (V1), cửa hàng, sự kiện TIMO, multiplayer, Journey/Achievement, mock voxel (#23, designer), chơi thử với trẻ (#24, người), đo máy thật DEVICE-01 (người, trước nghiệm thu MVP).

## Goals

| # | Goal | Master Plan |
|---|------|-------------|
| 1 | Design token + bộ component UI chung theo mock hiện tại; màn Pause, Tải khu vực, Mất mạng | #4, §6 NEW SCREEN |
| 2 | Quest mô tả bằng dữ liệu có schema + validator trong CI; runtime quest thuần TS dùng chung web/server; server chấm thử thách | #15, §11 |
| 3 | Character Creator: chọn loài (chỉ Mèo mở), trang phục đổi thấy ngay trên voxel, 4 anim xem thử, tên từ danh sách | #10, M1.2–M1.3, §16 |
| 4 | Home Base + chọn khu vực + danh sách quest + HUD gameplay | #11, M1.1, M1.4/M2.1, M3.2 |
| 5 | Khu rừng ch1: vật thể tương tác (≥3), cây cổ thụ đố 8 + 5, NPC Vẹt và Hải ly, rương, cổng chương 2 | #12, #13, #16, M1.5, M3.4 |
| 6 | Hội thoại NPC + mở đầu quest + tracker nhiệm vụ | #14, M2.2, M3.3 |
| 7 | 3 thử thách Toán (kéo thả, sắp xếp, trắc nghiệm) + 3 lớp hỗ trợ không khóa tiến trình | #17, #18, M2.4–M2.6, M2.8 |
| 8 | Hoàn thành quest, Level Up, Mở khóa (server tính); Ba lô + Bộ sưu tập | #19, #20, M2.9, M3.5, M1.7 |
| 9 | Test bảo mật (IDOR, chống gian lận thử thách, CSP) + E2E trọn vòng; trang review + gate | #22, §16, §17 |

## Phases

| # | Phase | ID | Tier | Depends | Status |
|---|-------|----|------|---------|--------|
| 1 | [Design token + component UI + màn hệ thống](./phase-01-design-tokens-and-ui-kit.md) | SLICE-00 | M | — | Completed |
| 2 | [Quest schema v2 + runtime + nội dung ch1](./phase-02-quest-schema-runtime-content.md) | SLICE-06 | L | — | Completed |
| 3 | [API gameplay: chấm thử thách, hỗ trợ học, level, mở khóa](./phase-03-gameplay-api-server.md) | SLICE-10 (server) | M | 2 | Completed |
| 4 | [Character Creator + trang phục voxel](./phase-04-character-creator.md) | SLICE-01 | L | 1 | Completed |
| 5 | [Home Base, chọn khu vực, danh sách quest, HUD](./phase-05-home-region-hud.md) | SLICE-02 | M | 1, 3 | Completed |
| 6 | [Khu rừng ch1: vật thể tương tác, di chuyển, camera](./phase-06-forest-interactables.md) | SLICE-03, 04, 07 | L | 2, 5 | In progress |
| 7 | [NPC hội thoại + mở đầu quest + tracker](./phase-07-npc-dialogue-quest-flow.md) | SLICE-05 | M | 3, 5, 6 | Completed |
| 8 | [3 thử thách Toán + hỗ trợ học + bước đọc/đố](./phase-08-math-challenges-learning-support.md) | SLICE-08, 09 | L | 1, 3, 7 | Pending |
| 9 | [Hoàn thành, Level Up, mở khóa; Ba lô + Bộ sưu tập](./phase-09-rewards-backpack-collection.md) | SLICE-10, 11 | M | 3, 8 | Pending |
| 10 | [Bảo mật, E2E trọn vòng, hiệu năng, trang review](./phase-10-security-e2e-review-gate.md) | #22 | M | 4–9 | Pending |

Song song (đã rà file, xem Red Team): phase 1 và 2 độc lập; 3 song song với 1; 4 song song với 3, 5 và 6 (phase 6 sau phase 5).

| Phase | File/thư mục sở hữu (chỉ phase này sửa) |
| --- | --- |
| 1 | `apps/web/src/ui/{tokens.css,kit,system}`, `game-bridge/game-store.ts` (kiểu), `game/game.ts` (resume, context-lost), `playwright.config.ts`, `package.json` web (`e2e:ci`), `ci.yml` (job e2e), `tools/assets/sources.json` (icon) |
| 2 | `packages/schema/src/content.ts`, `packages/quest/**`, `apps/server/src/content/**`, `tools/content/**`, `content/quests/**`, `eslint.config.js` |
| 3 | `apps/server/src/{quest,reward,db}/**`, `apps/server/drizzle/0002_*`, `content/progression/skill-curve.json`, `content/legal/consent-vi.json`, `packages/schema/src/game.ts` |
| 4 | `apps/web/src/ui/creator/**`, `apps/web/src/game/preview/**`, `content/accessories/**`, `apps/server/src/character/**`, `packages/voxel/src/accessory-schema.ts`, `tools/assets/render-preview.ts` (chế độ outfit) |
| 5 | `apps/web/src/ui/{home,region,hud}/**`, `play/play-screen.tsx`, `game/game.ts` (nút Tương tác), `content/world/regions.json`, `tools/assets/render-home-island.ts` (file mới, không đụng `render-preview.ts`), `generated.json`, `vite-repo-assets.ts` |
| 6 | `tools/world/**`, `packages/voxel/src/world-entities.ts`, `apps/web/src/game/entities/**` (sau phase 5) |
| 7–9 | tuần tự, mỗi phase một tập `ui/*` riêng; `quest-controller.ts` do phase 7 tạo, phase 8 thêm handler |

Quy tắc: (1) chỉ phase 3 sinh migration DB; (2) kiểu event/lệnh bridge và project Playwright khai báo hết ở phase 1; (3) `packages/schema/src/game.ts` do phase 3 sở hữu, phase 4 không đổi; (4) `tools/assets/render-preview.ts` chỉ phase 4 sửa; phase 5 dùng script riêng; `vite-repo-assets.ts` do phase 1 sửa trước, phase 5 sửa sau (5 phụ thuộc 1).

## Kiến trúc chính
```
content/quests/forest-ch1.json   ── QuestDefinition v2 (Zod, packages/schema) ── pnpm content:check (CI)
packages/quest                   ── runtime thuần TS: bước tiếp theo, điều kiện, chấm đáp án (dùng chung)
apps/server                      ── nguồn sự thật: chấm thử thách (đáp án không gửi xuống client trước khi trả lời),
                                    ghi dùng hỗ trợ, thưởng/level/mở khóa trong 1 transaction
apps/web/src/game                ── phát event rời rạc: interact(target), enter-zone, … (không import React)
apps/web/src/game-bridge         ── store: prompt, dialogue, activeChallenge, questTracker (không dữ liệu theo khung hình)
apps/web/src/ui                  ── màn hình React theo mock; token CSS; component chung
```
Luồng một bước quest: game phát `interaction {targetId}` → store → React hỏi server `POST /api/quests/:q/steps/:s/complete` (kèm `answer` nếu là thử thách) → server chấm + ghi → React hiển thị kết quả chuẩn (dự đoán cục bộ bằng `packages/quest` chỉ để phản hồi tức thì, luôn thay bằng kết quả server).

## Success Criteria (bám Master Plan §16)
- [ ] Chọn Mèo, đặt tên, đổi trang phục và thấy thay đổi ngay trên nhân vật voxel, rồi vào thế giới
- [ ] Di chuyển bằng joystick và bàn phím, va chạm đúng, camera không xuyên khối
- [ ] Tương tác với NPC và ≥ 3 vật thể
- [ ] Quest có câu chuyện và vòng lặp đủ 8 pha, dùng ≥ 2 cơ chế khác trắc nghiệm (kéo thả, sắp xếp, tìm vật)
- [ ] Đố 8 + 5 trên cây cổ thụ mở đường tiếp
- [ ] Hướng dẫn, Gợi ý, Đáp án hoạt động và không khóa tiến trình
- [ ] XP, Xu, Skill XP, mở khóa do server tính; sửa dữ liệu client không đổi kết quả (test)
- [ ] Xem đáp án giảm 10% XP (100 → 90) và sao 3/2/1 do server tính và lưu; vòng chính không xem đáp án lên Lv.1→2 (test xác định)
- [ ] Server chỉ lưu bộ đếm sai/hỗ trợ theo step, không lưu nội dung trả lời; đáp án không có trong bundle web (test)
- [ ] Hoàn thành quest mở khóa chương 2 (hiển thị "sắp có" nếu nội dung ch2 chưa có)
- [ ] Test IDOR + CSP đạt; không script/analytics bên thứ ba
- [ ] Thêm quest mới chỉ bằng dữ liệu (test: quest thứ hai chỉ là JSON, chạy qua runtime + server không sửa code)
- [ ] 4 gate + E2E trọn vòng xanh trên CI; ngân sách §12 giữ (perf chạy lại một lần)
- [ ] Trang review cuối đợt; nội dung học đánh dấu "chờ giáo viên duyệt"

Việc người (ngoài plan, ghi ở trang review): giáo viên duyệt nội dung học, designer duyệt UI/mock voxel (#23), đo iPad Gen 10 (DEVICE-01), chơi thử với trẻ có phụ huynh đồng ý (#24).

## Rủi ro chính
| Rủi ro | Giảm thiểu |
| --- | --- |
| Kéo thả trên iPad (touch) lỗi hoặc chậm | Pointer Events thống nhất chuột/cảm ứng, E2E có `hasTouch`; thử thách là màn cận cảnh 2D (§12), tạm dừng render 3D khi mở |
| Lộ đáp án qua API/bundle | Đáp án chỉ ở server (`content/quests` đọc phía server; web nhận DTO đã bỏ `answer`); lớp "Đáp án" chỉ trả khi gọi `support` và được ghi lại |
| Nội dung học sai | AI soạn nháp, gắn `review: "teacher-pending"`, trang review liệt kê; giáo viên duyệt trước khi tới trẻ |
| Phạm vi lớn, 10 phase | Mỗi phase có E2E/test riêng; reviewer thường trực kiểm theo Master Plan sau mỗi phase |
| Asset trang phục thiếu (áo, giày, cánh) | Sinh bằng JSON voxel như mũ/balo; 1 draw call/món, ngân sách kiểm trong test |

## Dependencies
Tiếp nối `plans/dattqh/260929-1911-foundation-after-poc-gate/` (completed).

## Red Team Review
Chạy bởi reviewer thường trực (master-plan-reviewer) 2026-09-29, 4 lăng kính: bảo mật/dữ liệu trẻ (S), giả định sai (A), vận hành/CI/iPad (O), phạm vi so với Master Plan §4/§6/§13/§16 (M). Chi tiết và bằng chứng: `plans/dattqh/reports/red-team-260929-vertical-slice-plan.md`. Tổng 38 phát hiện: 29 Accept (đã sửa vào phase), 9 Reject.

| # | Phát hiện | Bằng chứng | Quyết | Áp vào |
| --- | --- | --- | --- | --- |
| S1 | Bảng `support_usage`/`challenge_attempts` theo sự kiện có dấu thời gian là nhật ký hành vi trẻ, vượt "tối thiểu" §9; văn bản đồng ý chưa nêu | phase-03 (bản gốc), Master Plan §9, `content/legal/consent-vi.json` draft-2 | Accept | Phase 3: một bảng bộ đếm `step_attempts`, consent draft-3 |
| S2 | Đáp án nằm trong `content/quests/*.json`; một import nhầm từ web đưa vào bundle (tiền lệ: `profile-screens.tsx` import `content/names`) | `apps/web/src/ui/account/profile-screens.tsx` | Accept | Phase 2 (ESLint), phase 10 (quét dist) |
| S3 | `speechSynthesis` giọng remote gửi văn bản ra ngoài, trái §9 | Master Plan §9 "không dịch vụ bên thứ ba" | Accept | Phase 7: chỉ `localService` |
| S4 | Google OAuth chỉ nhận https hoặc `http://localhost`; IP LAN không dùng được, tunnel là bên thứ ba | `CLAUDE.md:40`, `apps/server/src/config.ts` | Accept (Jev) | Phase 10: LAN + `PASSWORD_LOGIN=1` |
| S5 | Rate limit chưa nói khóa theo gì; `support` chưa có limit | phase-03 (bản gốc) | Accept | Phase 3 |
| S6 | `personality` là trường mới trên hồ sơ nhân vật của trẻ (rule: đổi trường dữ liệu trẻ phải hỏi) | `.claude/rules/server-and-child-safety.md`, phase-04 (bản gốc) | Accept (Jev) | Phase 4: chỉ nhãn, không cột |
| S7 | Sao và XP tính lại từ bộ đếm thay đổi được thì không ổn định | phase-09 (bản gốc) | Accept | Phase 3: lưu `stars`, `xp_awarded` |
| S8 | Brute force trắc nghiệm 4 lựa chọn | phase-03 Risk | Reject: đáp án không phải bí mật, thưởng một lần, đã có rate limit | — |
| S9 | E2E "Google giả" cần dựng server giả | `apps/web/e2e/fake-google-server.ts` đã có | Reject | — |
| A1 | `content/world/forest-ch1/entities` không tồn tại; entities do generator sinh ở `assets/generated/world/forest-ch1/entities.json`, chưa có target quest | `assets/generated/world/forest-ch1/entities.json` | Accept | Phase 2, 6 |
| A2 | `search` (3 manh mối tùy thứ tự) không có chỗ lưu tiến độ con; `completeStep` tuyến tính | `packages/quest/src/quest-progress.ts` | Accept | Phase 2, 3, 7 |
| A3 | Quest stub `forest-ch2` vi phạm refine (steps, 7 câu, ≥ 2 step không phải quiz) | phase-02 (bản gốc) | Accept | Phase 2: `status: "stub"` |
| A4 | Vòng phụ thuộc: phase 7 dùng khung quiz/support của phase 8 | phase-07, phase-08 (bản gốc) | Accept | Phase 7, 8: `read`/`riddle` chuyển sang 8 |
| A5 | `worldEntitiesSchema` version 1, props không id; `chest`, `gate` là prop | `packages/voxel/src/world-entities.ts`, `entities.json:158,168` | Accept | Phase 6: version 2 |
| A6 | Level 2 cần 100 XP; xem đáp án làm còn 90 XP nên E2E "Level Up" sẽ sai | `content/progression/level-curve.json` | Accept | Phase 9, 10 |
| A7 | Không có model lá thư trong Survival/Nature Kit | `ls assets/packs/kenney-survival-kit/2.0` | Accept | Phase 6: voxel sinh bằng code |
| A8 | Pack `fluent-emoji` chỉ 22 file ghim; thiếu icon kẹo, đá | `tools/assets/sources.json:211+` | Accept | Phase 1 |
| A9 | `accessoryScale` chỉ có `head`/`torso`, giày cần node chân | `content/characters.json` | Reject: không còn slot giày (Jev outfit_slots) | — |
| O1 | Phase chạy song song cùng sửa `game-store.ts`, `playwright.config.ts`, migration, `render-preview.ts`, `play-screen.tsx` | các file Files của phase 1–6 | Accept | plan.md bảng sở hữu; phase 1 khai báo trước; phase 6 sau phase 5 |
| O2 | CI `e2e` chỉ chạy 3 project; project mới chỉ vào CI ở phase 10 | `.github/workflows/ci.yml` | Accept | Phase 1: `e2e:ci` |
| O3 | E2E dài dễ flaky trên CI phần mềm | phase-10 Risk | Accept | Phase 1: retries, trace |
| O4 | Safari iPad: thiếu `touch-action`; Playwright touchscreen chỉ tap | Playwright API | Accept | Phase 8 |
| O5 | Mất context WebGL trên iPad, `Game` chưa nghe `webglcontextlost` | `grep contextlost apps/web/src` = 0 | Accept | Phase 1 |
| O6 | Âm lượng `localStorage` phải bọc try/catch | `.claude/rules/web-ui.md` và ghi chú bộ nhớ trình duyệt | Accept | Phase 1 |
| O7 | Lệnh grep màu chỉ quét `.tsx`, bỏ sót `styles.css` | `apps/web/src/ui/styles.css` có hex | Accept | Phase 1 |
| O8 | Tắt tiến trình sau review | phase-10 bước 4 đã có | Reject | — |
| O9 | Ngân sách draw call sau thêm entity | phase-06/10 đã đo perf | Reject | — |
| M1 | §4 và task #11: Home và World Map là một cảnh 3D; quyết định validation dùng ảnh | Master Plan §4, §14 #11 | Accept (Jev) | Phase 5, 10 (ghi §15) |
| M2 | Bản đồ thế giới 3D (M3.1) MVP không có màn riêng | Master Plan §6 | Accept | Phase 5: "Bản đồ" là màn chọn khu vực, ghi lệch |
| M3 | Chuỗi ngày trong §1 nhưng không trong §16 | Master Plan §1, §16 | Accept (Jev) | Phase 5, 9 |
| M4 | Slot Áo/Giày/Cánh trong §5 | Master Plan §5 | Accept (Jev) | Phase 4, 10 |
| M5 | Cập nhật docs kiến trúc/tiêu chuẩn, Master Plan §15 | `documentation-management.md` | Accept | Phase 10 |
| M6 | Consent thu dữ liệu chơi mới | như S1 | Accept | Phase 3 (gộp S1) |
| M7 | Task #21 chỉ làm phần icon | plan.md header | Reject: đã ghi phạm vi | — |
| M8 | Bộ component kit dư (Tabs, Badge, Toast) | phase-01 | Reject: Ba lô, hỗ trợ học, thông báo đều dùng | — |
| M9 | Nhà của Miu (trang trí) MVP | Master Plan §4 | Reject: §13 không có; trang trí sau MVP | — |
| M10 | Mock voxel (#23) chưa có cho tiêu chí §16 "đúng mock voxel" | Master Plan §16, §14 #23 | Reject: plan đã loại, việc designer | — |
| M11 | Ghi các quyết định Jev vào Master Plan §15 | Master Plan §15 | Accept | Phase 10 |

### Whole-Plan Consistency Sweep
Đã kiểm: link giữa các file (11 file, tất cả tồn tại), frontmatter (`phase`, `dependencies` khớp bảng Phases sau sửa: phase 6 `[2, 5]`), sở hữu file giữa các phase song song, lệnh kiểm tra có thật (`pnpm vitest run --project web|node`, `pnpm --filter @miu/server exec drizzle-kit check`, `pnpm assets:*`, `pnpm world:forest`); lệnh chưa có do phase tạo ra: `pnpm content:check` (phase 2), `pnpm assets:home` (phase 5), `e2e:ci` (phase 1). Không còn câu "Validation" treo.

## Validation Log

### Session 1 — 2026-09-29
Người sở hữu giao TypeSafe Jev quyết (`jev-1.13.0`, Choice, `tools/decisions/jev-decide.py`). Dùng lựa chọn Jev kể cả khi script `escalate`; các mục dưới ngưỡng tự quyết người sở hữu có thể đảo. Câu dữ liệu trẻ (stakes high) chọn phương án thu ít nhất. Chi tiết: `plans/dattqh/reports/jev-260929-vertical-slice-validation.md`.

| # | Câu hỏi | Stakes | Jev chọn | Xác suất / conf | Script | Chốt (áp vào) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `home_scene` | medium | react_screen_with_prerendered_island_image | 0.79 / 0.69 | escalate (dưới ngưỡng) | Home là màn React, nền ảnh đảo render sẵn, không cảnh 3D thứ hai (phase 5, 10) |
| 2 | `support_answer_penalty` | medium | xp_minus_10_percent | 0.72 / 0.58 | escalate (dưới ngưỡng) | Xem đáp án giảm 10% XP quest, Xu/Skill XP/vật phẩm giữ; UI khích lệ (phase 3, 8, 9) |
| 3 | `streak_in_mvp` | low | defer_v1 | 1.00 / 1.00 | auto | Không chuỗi ngày ở MVP (phase 5, 9) |
| 4 | `outfit_slots_mvp` | medium | hat_backpack_plus_color_variants | 0.98 / 0.96 | auto | Mũ + Balo và biến thể màu; Áo/Giày/Cánh khóa "Sắp có" (phase 4) |
| 5 | `decision_step` | low | narrative_only | 0.95 / 0.90 | auto | Decision chỉ kể chuyện (phase 2) |
| 6 | `offline_behavior` | low | block_with_retry | 0.99 / 0.99 | auto | Chặn + thử lại, không tính cục bộ (phase 1, 7) |
| 7 | `stars_rule` | low | three_stars_minus_support_and_mistakes | 0.94 / 0.89 | auto | 3 sao − xem đáp án − nhiều lần sai, tối thiểu 1; lưu ở server (phase 3, 9) |
| 8 | `challenge_answer_attempt_logging` | high | count_only | 1.00 / 1.00 | escalate (high luôn chuyển người) | Chỉ bộ đếm theo step, không lưu nội dung trả lời (phase 3) |
| 9 | `character_personality_field` (thêm) | high | cosmetic_not_stored | 0.91 / 0.81 | escalate (high) | Tính cách chỉ là nhãn, không cột (phase 4) |
| 10 | `ipad_review_access` (thêm) | low | lan_password_login | 0.73 / 0.47 | escalate (dưới ngưỡng) | LAN + `PASSWORD_LOGIN=1`, dữ liệu giả (phase 10) |

Tương tác giữa các quyết định: XP 100 nhân 0.9 = 90 nên xem đáp án làm quest ch1 không lên Level 2 (ngưỡng 100 XP); E2E vòng chính không xem đáp án (phase 9, 10).

### Chỉ thị người sở hữu — 2026-09-30
- "Miu" chỉ là tên dự án và tên game. Mọi chữ trong game (lời NPC, tiêu đề/tóm tắt/đề bài quest, thông báo thưởng) gọi người chơi bằng tên nhân vật bé đã đặt. Nội dung dùng placeholder `{name}`, UI điền bằng `fillPlayerName` (`packages/quest/src/player-name.ts`) với tên từ `GET /api/character`; `content:check` báo lỗi khi chữ quest còn "Miu" (commit `e709331`). Áp cho phase 7–9 (hội thoại, thử thách, màn thưởng) và nội dung SGK.
- Nội dung phong phú, không lặp: không dùng lại nội dung/cảnh giữa các quest; mọi thứ chạy lặp (phản hồi đúng/sai, lời chào và câu nói rảnh của NPC, chúc mừng, lời mời thử lại, hoạt ảnh) xoay vòng từ pool, không lặp ngay. Server trả `feedback` luân phiên trong response hoàn thành bước (plan SGK sở hữu, cộng thêm vào DTO); UI phase 7–9 hiển thị `feedback` khi có và dùng helper chọn không lặp cho các vòng lặp của mình; `content:check` có gate đa dạng (plan SGK).

### Câu hỏi mở
Không còn câu chặn. Việc của người (ngoài plan): giáo viên duyệt nội dung học, cấp Google OAuth cho hostname https cố định nếu muốn thử Google trên iPad, pháp chế duyệt consent draft-3, đo iPad Gen 10 (DEVICE-01), designer duyệt UI/mock voxel, chơi thử với trẻ.


<!-- slug: vertical-slice-mvp -->
