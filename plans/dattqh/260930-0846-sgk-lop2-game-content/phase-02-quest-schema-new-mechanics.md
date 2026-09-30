---
phase: 2
title: "Schema + runtime cho cơ chế mới"
status: completed
priority: P1
effort: "L"
dependencies: []
---

# Phase 2: Schema + runtime cho cơ chế mới

## Goal
`QuestDefinition` mô tả được mọi dạng bài của hai sách, server chấm được, và quest đang viết (`draft`) không làm đỏ CI hay lọt vào game.

## Điều kiện bắt đầu
VS phase 3 đã commit (`feat(server)` gameplay API trên `main`); worktree `../miu-world-sgk` đã rebase lên commit đó.

## Requirements
- Trạng thái `draft`: `QuestDefinition` thêm nhánh `status: "draft"` cùng shape và cùng luật với `active`. `loadQuests` (server) bỏ qua draft (không vào catalog, `QuestView`, API); `content:check` vẫn validate draft (từ D12: quest SGK không có `unlock`, nên không còn cảnh báo liên kết tới draft chưa viết).
- Quest thêm `texts?: Record<textId, { title, author?, body }>` (bài đọc dài dùng chung nhiều bước); `QuestView` nhánh active thêm `texts` (test `game.test.ts` khẳng định có).
- Bước thêm `curriculumRef?: string[]` (id item kiểm kê). Không cho phép trên `dialogue`, `reward`, `unlock` (các bước này không "phủ" bài tập).
- `read`: giữ `text`, thêm `textRef` (loại trừ nhau, đúng một cái), thêm `audio?: boolean` (máy đọc bằng `speechSynthesis`, giọng local theo VS phase 7). `forest-ch1.json` không phải đổi.
- Cơ chế `challenge` mới (schema tác giả `strictObject`; `QuestView` bỏ `answer`/`support`):
  - `classify`: `groups[]` (id, label), `items[]` (id, label, `image?`); answer `{ assignment: Record<itemId, groupId> }` (≤ 50 khóa) — từ chỉ sự vật/hoạt động/đặc điểm, kiểu câu.
  - `fill-blank`: `template` có ô `{{b1}}`, `blanks[]` (id, `options[]`); answer `{ fills: Record<blankId, optionId> }` (≤ 50 khóa) — c/k, ch/tr, g/gh, ng/ngh, dấu câu, điền số, so sánh >, <, =.
  - `multi-select`: `choices[]`; answer `{ choices: string[] }` (tập hợp, ≤ 50) — chọn hình tứ giác, ba điểm thẳng hàng, phép tính đúng.
  - `clock`: `mode: "read" | "set"`, `display: "analog" | "digital"`, `time?`; answer `{ hour, minute }` (24 giờ).
  - `calendar`: `month`, `year`, `question`; answer `{ day }` hoặc `{ weekday }`.
  - `connect`: `points[]` (id, x, y, label), `showLengths?`; answer `{ edges: [a, b][] }` (không phân biệt chiều/thứ tự, ≤ 50).
  - `sort` dùng lại cho ghép câu từ thẻ từ, bảng chữ cái, xếp tranh theo trình tự (item thêm `image?: IllustrationRef`).
- `kind` mới không chấm, không khóa tiến trình, server chỉ ghi hoàn thành (body `{}`):
  - `speak`: `prompt`, `hints[]` (dòng "G:" của sách), `pictureRefs?` (phase 7).
  - `worksheet`: `lessonId` (phiếu phase 6), `text` nhắc.
- `IllustrationRef`: `{ kind: "icon", id }` (Fluent Emoji qua `content/ui/icons.json` của VS phase 1) hoặc `{ kind: "diagram", type: "clock" | "number-line" | "ruler" | "scale" | "jug" | "shapes" | "polyline" | "picture-card", params }` — vẽ lúc chạy ở phase 8.
- `checkAnswer` cho từng cơ chế mới + biên (thiếu/dư phần tử, tập hợp khác thứ tự, cạnh ngược chiều, giờ 12/24).
- Luật cơ chế: quest thường giữ luật hiện có; quest `tv2-*`/`toan2-*` cần ≥ 2 cơ chế khác nhau trong {`classify`, `fill-blank`, `multi-select`, `clock`, `calendar`, `connect`, `sort`, `drag-drop`} (không tính `search`, `riddle`, `quiz`, `read`, `speak`, `worksheet`). Cập nhật có chủ đích test ghim thông điệp luật (`content.test.ts`).
- `StepAnswer` thêm các shape mới (strict) và giới hạn kích thước.
- Chuyển helper `solution()` từ `apps/server/src/quest/quest-routes.test.ts` ra `apps/server/test/quest-solution.ts`, mở rộng cho mọi cơ chế; `quest-routes.test.ts` đổi sang import (phase 4, 5 dùng chung).

## Files
- Modify: `packages/schema/src/content.ts` (khối quest), `packages/schema/src/content.test.ts` (luật cơ chế), `packages/schema/src/game.ts`, `packages/schema/src/game.test.ts` (chỉ khẳng định `texts`), `packages/quest/src/{check-answer,quest-progress,quest-catalog}.ts` (+ test), `apps/server/src/content/content-catalog.ts` (bỏ qua draft) (+ test), `apps/server/src/quest/quest-routes.test.ts` (import `solution`)
- Create: `apps/server/test/quest-solution.ts`, `apps/server/test/fixtures/quests/quest-sgk.json` (một quest `active` dùng mọi cơ chế mới)

## Steps
1. Test trước: schema từng cơ chế (hợp lệ/không, key gõ sai bị từ chối, `curriculumRef` trên dialogue bị từ chối, `text` + `textRef` cùng lúc bị từ chối); `checkAnswer` + biên; `QuestView` không có `answer`/`support` ở mọi cơ chế và có `texts`; catalog bỏ qua draft; API chơi hết `quest-sgk` bằng `solution()`, sai → `correct: false`.
2. Hiện thực.
3. Gate đầy đủ.

## Verification
- `pnpm vitest run packages apps/server`; `pnpm typecheck`; `pnpm lint`; `pnpm content:check`

## Risk
- Đụng VS phase 5/9 cùng file schema: chỉ sửa khối quest, rebase trước merge.
