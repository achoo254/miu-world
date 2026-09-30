---
phase: 4
title: "Kịch bản Tiếng Việt — 18 tuần"
status: pending
priority: P1
effort: "XL"
dependencies: [3]
---

# Phase 4: Kịch bản Tiếng Việt — 18 tuần (Khu rừng bí mật, chương 2–19)

## Goal
Mỗi bài Tiếng Việt 2 tập 1 là một quest ở Khu rừng bí mật, phủ mọi item kiểm kê của bài bằng bước đúng cơ chế (trong game, hoặc qua phiếu viết cho phần Viết), đủ luật quest của repo.

## Requirements
- Nhân vật chính, nơi, tình huống mở đầu theo [story-map.md](./story-map.md). D8 + D9: chữ SGK nguyên văn; mỗi quest một câu chuyện/bối cảnh/NPC riêng, lời thoại và `feedback` không trùng quest khác, chuỗi cơ chế không trùng quest khác (`content:check` kiểm).
- 34 quest: 32 bài (`tv2-t01-b01` … `tv2-t17-b32`) + `tv2-t09-on-giua-ki` + `tv2-t18-on-cuoi-ki`, `region: "khu-rung-bi-mat"`, `chapter` = tuần + 1 (2 quest/chương, D6), `status: "draft"` (phase 10 đổi `active`), `review: "teacher-pending"`, id và mở khóa theo quy ước phase 3 (bài 1 đã có từ phase 3).
- Khuôn một bài (theo cấu trúc sách; bài lẻ có Nói và nghe, bài chẵn có Luyện tập + Đọc mở rộng):
  - Hook: NPC (Vẹt/Hải ly/nhân vật trong bài đọc) kể tình huống gắn chủ điểm tuần.
  - Explore: `search` tìm đồ vật gắn bài đọc (target theo quy ước `tv2-tNN-<vật>`, phase 9 đặt lên map).
  - Learn: `read` bài đọc nguyên văn (`texts` + `textRef`, `audio: true`); các câu hỏi đọc hiểu của sách thành chuỗi `read`/`quiz`/`multi-select`/`classify`.
  - Challenge: Luyện tập — từ ngữ (`classify`), câu (`sort` ghép thẻ từ, `classify` kiểu câu), dấu câu và phân biệt chính tả (`fill-blank`), bảng chữ cái (`sort`/`fill-blank`).
  - Decision: `dialogue` có lựa chọn kể chuyện gắn nội dung bài.
  - Finale: Nói và nghe — `sort` xếp tranh theo trình tự câu chuyện (tranh `picture-card` theo mô tả kiểm kê) + `speak` kể lại/nói về bản thân với gợi ý "G:" của sách (thu âm trên máy, phase 7).
  - Reward + Unlock: như ch1; phần Viết (chữ hoa, viết ứng dụng, nghe–viết, viết đoạn, "Vận dụng" ở nhà) là bước `worksheet` trỏ phiếu của bài (phase 6).
- Đọc mở rộng: `read` + câu hỏi đóng nếu sách có, hoặc `speak`.
- Ôn tập giữa kì/cuối kì: quest dài hơn, phần "Đánh giá cuối học kì 1" (đọc thành tiếng, đọc hiểu "Cỏ và lúa", nghe–viết, viết 3–4 câu) phủ bằng `read`/`quiz`/`fill-blank`/`speak`/`worksheet`.
- Mỗi bước tương tác có `curriculumRef`; `pnpm content:gaps --book tv2-t1` = 100% cuối phase (phủ đúng cơ chế theo quy tắc phase 3).
- KHÔNG đụng `forest-ch1.json`, `forest-ch2.json` và test VS (D7 — phase 10 làm).

## Chia việc song song (disjoint file)
| Gói | Tuần | File |
| --- | --- | --- |
| 4a | 1–4 (chủ điểm 1: bài 1–8) | `content/quests/tv2-t0[1-4]-*.json` |
| 4b | 5–9 (chủ điểm 2 + ôn giữa kì: bài 9–16) | `tv2-t0[5-9]-*.json` |
| 4c | 10–13 (chủ điểm 3: bài 17–24) | `tv2-t1[0-3]-*.json` |
| 4d | 14–18 (chủ điểm 4 + ôn cuối kì: bài 25–32) | `tv2-t1[4-8]-*.json` |
Bài cuối mỗi gói `unlock` bài đầu gói sau theo quy ước id (draft chấp nhận id chưa có file, cảnh báo; phase 10 đòi đủ).

## Steps
1. Mỗi gói: đọc kiểm kê chủ điểm, viết quest theo khuôn, chạy `pnpm content:check` + `pnpm content:gaps --unit <chủ điểm>` sau mỗi bài.
2. `apps/server/src/quest/tv2-quests.test.ts`: dựng catalog từ `content/quests/tv2-*.json` với draft coi như active (tham số của loader test), chơi hết mọi quest theo chuỗi mở khóa bằng `solution()` (`apps/server/test/quest-solution.ts`).
3. Report cuối phase: danh sách quest, số bước theo cơ chế, item phủ trong game/qua phiếu.

## Verification
- `pnpm content:check`; `pnpm content:gaps --book tv2-t1` = 100%; `pnpm vitest run apps/server/src/quest/tv2-quests.test.ts`

## Risk
- Chép sai nguyên văn: chỉ lấy `text`/`prompt` từ kiểm kê (không gõ lại từ ảnh).
- Quest chỉ "đọc – trả lời": luật ≥ 2 cơ chế tương tác khác nhau (phase 2) chặn.
