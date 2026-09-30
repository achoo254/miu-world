---
phase: 3
title: "API gameplay: chấm thử thách, hỗ trợ học, level, mở khóa"
status: completed
priority: P1
effort: "M"
dependencies: [2]
---

# Phase 3: API gameplay (SLICE-10 phần server, task #19)

## Goal
Server là nguồn sự thật cho mọi kết quả thử thách, thưởng, level và mở khóa (Master Plan §8, §9); client chỉ gửi hành động.

## Requirements
- `GET /api/quests` — danh sách quest theo region với trạng thái (khóa/mở/đang làm/xong, sao), dùng `QuestView` (không đáp án).
- `GET /api/quests/:id` — `QuestView` + progress.
- `POST /api/quests/:q/steps/:s/complete` body `{ answer? }` hoặc `{ target }` cho step `search` (Zod theo loại step): server tìm step, kiểm thứ tự + mở khóa như hiện tại, chấm bằng `packages/quest.checkAnswer`; sai → 200 `{ correct: false }` không ghi tiến độ, tăng bộ đếm sai (không khóa: thử lại vô hạn); đúng → ghi như hiện tại. Step `search`: mỗi `target` tìm được ghi vào `quest_progress.found` (idempotent), step xong khi đủ target. Lặp idempotent giữ nguyên.
<!-- Updated: Validation - Jev support_answer_penalty=xp_minus_10_percent (0.72/0.58, dưới ngưỡng, người sở hữu có thể đảo), stars_rule=three_stars_minus_support_and_mistakes, challenge_answer_attempt_logging=count_only -->
- `POST /api/quests/:q/steps/:s/support` body `{ layer: "guide" | "hint" | "answer" }` → trả nội dung lớp đó và tăng bộ đếm tương ứng. Xem đáp án không khóa tiến trình. Quy tắc thưởng (quyết định validation): nếu quest có ít nhất một lần xem lớp `answer` thì XP của quest bị giảm 10% (làm tròn xuống) lúc hoàn thành; Xu, Skill XP, vật phẩm không giảm. Hiển thị lời khích lệ, không nói "phạt".
- Sao (1–3) tính ở server khi hoàn thành quest: 3 sao; trừ 1 sao nếu có xem đáp án; trừ thêm 1 sao nếu tổng số lần sai của quest ≥ 5; tối thiểu 1 sao. Sao và XP thực nhận LƯU vào `quest_progress` (`stars`, `xp_awarded`) tại thời điểm hoàn thành, không tính lại từ bộ đếm sau này.
- Kết quả hoàn thành bước cuối trả thêm: `levelBefore/levelAfter` (Level Up), `unlocked[]` (quest/chapter mới mở), `skillLevels` (level skill từ Skill XP theo curve riêng `content/progression/skill-curve.json`), `stars`, `xpAwarded`.
- `GET /api/progress` thêm skill level theo Subject (Master Plan §5: level Subject tổng hợp từ Skill).
<!-- Updated: Red Team - hai bảng theo sự kiện có dấu thời gian là nhật ký hành vi trẻ, vượt mức "tối thiểu" của Master Plan §9; sao/XP cần bộ đếm ổn định -->
- Dữ liệu mới (migration qua drizzle-kit `0002`, không sửa 0000/0001), chỉ là BỘ ĐẾM, không nội dung trả lời và không dấu thời gian từng sự kiện: bảng `step_attempts` (child_id, quest_id, step_id, wrong_count, guide_views, hint_views, answer_views; PK ba cột đầu; FK `ON DELETE CASCADE` theo hồ sơ); cột `quest_progress.found jsonb` (target đã tìm theo step), `quest_progress.stars smallint null`, `quest_progress.xp_awarded int null`. Test xóa hồ sơ xóa sạch `step_attempts`.
- Cập nhật văn bản đồng ý (`content/legal/consent-vi.json`) sang `draft-3`: thêm "chỉ đếm số lần dùng hỗ trợ và số lần trả lời sai để tính sao; không lưu nội dung câu trả lời"; giữ `requiresLegalReview: true`; test schema đồng ý; phụ huynh đã đồng ý bản cũ được hỏi lại (đã có kiểm bản hiện hành).
- Rate limit theo hồ sơ + step (khóa `childId|questId|stepId`) cho `complete` (30 lần/phút) và cho `support` (20 lần/phút); vượt trả 429; mục tiêu chống spam, không phải bảo mật đáp án.

## Files
- Modify: `apps/server/src/quest/quest-routes.ts`, `apps/server/src/reward/reward-ledger.ts`, `apps/server/src/db/schema.ts`, `packages/schema/src/game.ts`, `content/legal/consent-vi.json`
- Quy tắc migration: chỉ phase này sinh `0002`; các phase khác không đổi schema DB (phase 4 đã bỏ cột personality)
- Create: `apps/server/drizzle/0002_*.sql` (generate), `content/progression/skill-curve.json`, test mới trong `apps/server/src/quest/`

## Steps
1. Test trước (supertest + PGlite, chạy thêm Postgres ở CI): đáp án sai không ghi tiến độ và tăng `wrong_count`; đúng ghi 1 lần; body chứa reward/đáp án giả bị bỏ; không có đáp án trong mọi response trừ `support` với `layer: "answer"`; IDOR (hồ sơ khác → 404/401); support tăng bộ đếm; xem đáp án → XP thực nhận = 90 (XP 100 giảm 10%), Xu/Skill XP/vật phẩm nguyên; không xem đáp án → 100 XP; sao 3/2/1 theo quy tắc và được lưu; hoàn thành lặp không đổi `stars`/`xp_awarded`; step `search` tìm sai thứ tự và lặp target; rate limit 429; level up + unlocked đúng biên curve; quest khóa → 409; xóa hồ sơ xóa `step_attempts`.
2. Hiện thực route + migration.
3. Cập nhật `docs/system-architecture.md` (chấm thử thách ở server).

## Verification
- `pnpm vitest run apps/server`; `pnpm --filter @miu/server exec drizzle-kit check`; CI integration Postgres xanh

## Kết quả (2026-09-30)
Xong. Gate: `assets:check`, `content:check`, `test` (232 test), `typecheck`, `lint`, `drizzle-kit check`, E2E setup/account/play (8/8) xanh; web build xanh. Simplifier đã gọn 4 file; reviewer độc lập: không có đường gian lận, IDOR, lộ đáp án hay lỗi transaction.

Lệch so với spec, có chủ ý (Jev `vs_phase3_step_counters` = minimal, 0.62/0.43, escalate — dùng lựa chọn Jev theo ủy quyền; `plans/dattqh/reports/jev-260930-sgk-plan-decisions.md`):
- `step_attempts` chỉ còn `wrong_count`, `answer_views` (bỏ `guide_views`, `hint_views` vì không dùng tính sao/XP); xóa bộ đếm của quest ngay khi chấm xong; sau khi xong không đếm nữa.
- Xem Đáp án chỉ bị tính khi bước đang làm chưa giải (xem lại đáp án bước đã giải không trừ sao/XP); đếm trong cùng khóa dòng `quest_progress` với route hoàn thành.
- Văn bản đồng ý draft-3 nói đúng: chỉ đếm sai và xem Đáp án, giảm một sao và 10% XP, xóa khi xong.
- Thêm: `GET /api/quests` (lọc `?region=`), `GET /api/quests/:id`; `progress.subjects` (level Subject = tổng Skill XP trên `skill-curve.json`); test IDOR con trỏ giả cho endpoint mới.

Test chập chờn khi máy tải nặng (có từ trước, không do phase này): `auth-routes.test.ts` (khóa PIN/rate limit) và thỉnh thoảng 503 `server-busy` từ hàng đợi hash trong test server.

## Risk
- Brute force đáp án trắc nghiệm 4 lựa chọn là tầm thường: chấp nhận (không phải bí mật), rate limit chỉ để chống spam; thưởng vẫn một lần.
