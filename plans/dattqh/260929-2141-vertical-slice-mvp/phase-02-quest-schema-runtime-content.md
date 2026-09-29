---
phase: 2
title: "Quest schema v2 + runtime + nội dung ch1"
status: pending
priority: P1
effort: "L"
dependencies: []
---

# Phase 2: Quest schema v2 + runtime + nội dung ch1 (SLICE-06, task #15)

## Goal
Quest mô tả hoàn toàn bằng dữ liệu (Master Plan §11): Quest → Step → Interaction → Challenge, có hỗ trợ học, validator trong CI; runtime thuần TS quyết định bước tiếp theo và chấm đáp án, dùng chung web (dự đoán) và server (nguồn sự thật). Viết nội dung quest "Khu rừng bí mật – Chương 1".

## Requirements
- `packages/schema/src/content.ts` — `QuestDefinition` v2 (giữ tương thích file cũ bằng migration trong test fixture):
  - Quest: `id`, `region`, `chapter`, `title`, `summary`, `phases` (8 pha Hook…Unlock ánh xạ tới step id), `sevenQuestions` (đóng vai ai, ở đâu, mục tiêu, chơi gì, kiến thức nào, nhận gì, mở khóa gì — bắt buộc đủ 7), `steps[]`, `reward`, `unlock[]`, `review: "teacher-pending" | "teacher-approved"`.
<!-- Updated: Red Team - `search` cần tiến độ con (3 manh mối, thứ tự tùy ý) nhưng completeStep hiện tuyến tính theo step và QuestProgress chỉ có completedSteps -->
  - Step `search`: `targets[]` (≥ 1, tìm theo thứ tự tùy ý); `QuestProgress` thêm `found: Record<stepId, targetId[]>`; step hoàn thành khi tìm đủ mọi target; tìm lại một target đã tìm là idempotent (không đổi tiến độ). `completeStep` giữ tuyến tính giữa các step; chỉ bên trong step `search` mới tùy ý thứ tự.
  - Step `kind`: `dialogue` (npc, lines, choices chỉ để kể chuyện), `search` (targets ≥ 1, yêu cầu tìm đủ n), `read` (lá thư/manh mối: text + skill `doc-hieu`), `riddle` (vật thể + câu đố số, đáp án), `challenge` (`drag-drop` | `sort` | `quiz`, dữ liệu + đáp án + `skill`), `reward`, `unlock`. Step có `target` (entity id trên map) và `trigger` (`interact` | `enter-zone` | `auto`).
  - `support` bắt buộc cho `riddle`/`challenge`/`read`: `guide` (các bước), `hint`, `answer` (đáp án + giải thích) — Master Plan §5 ba lớp hỗ trợ.
  - Refine: step id duy nhất; skill tồn tại trong `skills.json`; mỗi quest có ≥ 2 step không phải `quiz`.
<!-- Updated: Red Team - `content/world/forest-ch1/entities` không tồn tại; entities.json do generator sinh ở `assets/generated/world/forest-ch1/entities.json`, hiện chỉ có npcs (parrot-guide), props không có id; các target quest (hộp, lá thư, cây nấm, bụi cây, cây cổ thụ, rương, cổng) chỉ có sau phase 6 -->
  - Quest `status: "stub"` (như `forest-ch2`) được miễn các refine về step/7 câu/≥ 2 step không phải quiz, chỉ cần `id`, `region`, `chapter`, `title`; DTO ẩn nội dung và hiện "sắp có".
  - Kiểm target tồn tại trong `assets/generated/world/<region>/entities.json`: hàm kiểm nằm ở phase này (test bằng fixture entities), nhưng bật kiểm trên nội dung thật `forest-ch1` ở phase 6 khi generator đã sinh đủ `interactables[]`; trước đó `content:check` bỏ qua bước này có ghi chú rõ, để CI không đỏ giữa hai phase.
- DTO công khai (`packages/schema/src/game.ts`): `QuestView` bỏ mọi trường đáp án (`answer`, `support.answer`) — web chỉ nhận qua endpoint hỗ trợ.
<!-- Updated: Red Team - đáp án nằm trong content/quests/*.json; chỉ cần một import nhầm từ web là đáp án vào bundle (profile-screens.tsx đã import thẳng content/names/*.json làm tiền lệ) -->
- Chống lộ đáp án qua bundle: ESLint `no-restricted-imports` cấm `apps/web/**` và `packages/quest/**` import `content/quests/**`; test build kiểm `apps/web/dist` không chứa chuỗi đáp án của quest (kèm `"answer"` key) ở phase 10.
- `packages/quest`: `nextStep(def, progress)`, `completeStep` mở rộng: step có đáp án chỉ hoàn thành khi `checkAnswer(step, answer)` đúng; `checkAnswer` theo loại (drag-drop: tổng/số lượng; sort: thứ tự; quiz: lựa chọn; riddle: số). Không import three/React/DOM.
- `pnpm content:check` (script mới trong `tools/content/check-content.ts`): validate mọi `content/**` bằng schema, chéo tham chiếu (entity, skill, icon, accessory), chạy trong CI job `check` sau `assets:check`.
- Nội dung `content/quests/forest-ch1.json` (tiếng Việt, AI soạn nháp, `review: "teacher-pending"`): Hook (Vẹt nhờ tìm lá thần chữa cây cổ thụ) → Explore (tìm 3 manh mối: chiếc hộp, lá thư, cây nấm/bụi cây; lá thư là bước `read` skill `doc-hieu`) → Learn/Challenge (kéo thả đủ 10 quả táo cho Hải ly; sắp xếp đá 27, 15, 9, 34 qua suối; trắc nghiệm kẹo 8 − 3) → Decision (kể chuyện, không phân nhánh logic ở MVP) → Finale (cây cổ thụ đố 8 + 5 = ?) → Reward (+100 XP, +20 Xu, Skill XP phép cộng/so sánh số/đọc hiểu, vật phẩm Lá thần) → Unlock (`forest-ch2`). Quest `forest-ch2` stub chỉ để kiểm unlock (ẩn nội dung, hiện "sắp có").
- Server nạp quest v2 (`content-catalog.ts`), bỏ fixture v1 hoặc chuyển sang v2.

## Files
<!-- Updated: Validation (Jev decision_step=narrative_only) - Decision là đoạn kể chuyện có lựa chọn hội thoại không đổi logic quest; nhánh thật là V1 (Master Plan §6 M2.7) -->
- Modify: `packages/schema/src/content.ts`, `packages/schema/src/game.ts`, `packages/quest/src/*`, `apps/server/src/content/content-catalog.ts`, `apps/server/test/fixtures/quests/*`, `.github/workflows/ci.yml`, `package.json` (script), `eslint.config.js` (cấm import `content/quests/**` từ web)
- Create: `tools/content/check-content.ts` (+ test), `content/quests/forest-ch1.json`, `content/quests/forest-ch2.json`, `packages/quest/src/check-answer.ts` (+ test)

## Steps
1. Test trước: schema (thiếu 7 câu → lỗi; thiếu support ở challenge → lỗi; chỉ toàn quiz → lỗi; stub hợp lệ); `checkAnswer` từng loại + biên (thứ tự sai, dư phần tử); `nextStep`; step `search` tìm sai thứ tự vẫn hợp lệ, tìm lại không đổi; DTO không chứa đáp án (duyệt đệ quy key).
2. Schema + runtime; migrate fixture server.
3. Content check tool + CI.
4. Viết nội dung ch1 + ch2 stub; `pnpm content:check` xanh.

## Verification
- `pnpm vitest run packages tools/content apps/server`; `pnpm content:check`; `pnpm typecheck`
- Test "quest mới chỉ bằng dữ liệu": thêm quest fixture thứ hai dạng JSON, chạy runtime + API không sửa code

## Risk
- Schema quá cứng cho SLICE sau (Skill Check, Boss, lựa chọn nhánh): giữ `kind` mở rộng được; Decision ở MVP chỉ kể chuyện (ghi rõ).
- Nội dung học sai: đánh dấu teacher-pending, liệt kê ở trang review.
