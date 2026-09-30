---
phase: 5
title: "Kịch bản Toán — 7 chủ đề"
status: in-progress
priority: P1
effort: "XL"
dependencies: [3]
---

# Phase 5: Kịch bản Toán — 7 chủ đề (Trường học)

## Goal
Mỗi bài Toán 2 tập 1 là một quest ở Trường học, phủ mọi item kiểm kê (Khám phá, Hoạt động, Luyện tập, Trò chơi, Vận dụng) bằng bước đúng cơ chế, server chấm được.

## Requirements
- Nhân vật chính, nơi, tình huống mở đầu theo [story-map.md](./story-map.md). D8 + D9: chữ SGK nguyên văn; mỗi quest một câu chuyện/bối cảnh/NPC riêng, lời thoại và `feedback` không trùng quest khác, chuỗi cơ chế không trùng quest khác (`content:check` kiểm).
- 36 quest `toan2-cd1-b01` … `toan2-cd7-b36`, `region: "truong-hoc"`, `chapter` = số chủ đề (4–7 quest/chương, D6), `status: "draft"` (phase 10 đổi `active`), `review: "teacher-pending"`, mở khóa tuyến tính theo sách (bài 1 đã có từ phase 3).
- Khuôn một bài:
  - Hook + Explore: NPC Trường học đưa tình huống từ phần Khám phá (nguyên văn lời thoại/đề); `search` tìm đồ vật dùng trong bài (target `toan2-cdN-<vật>`, phase 9 đặt).
  - Learn: Khám phá thành `dialogue` + bước tương tác nhỏ (đếm thêm trên tia số…).
  - Challenge: Hoạt động + Luyện tập — mỗi bài tập thành bước theo quy tắc phase 3: tính (`riddle`/`fill-blank` nhiều ô), so sánh (`fill-blank` >, <, =), bài toán lời văn (`riddle` + `support` có tóm tắt), tia số (`fill-blank` + diagram `number-line`), cân/ca lít (`riddle` + diagram `scale`/`jug`), hình phẳng (`multi-select`, `connect`), đường gấp khúc (`riddle` + diagram `polyline`), đồng hồ (`clock`), lịch (`calendar`). Bài tính có `expression` trong kiểm kê → đáp án phải bằng giá trị code tính (checker phase 3).
  - Decision: `dialogue` chọn cách làm (kể chuyện).
  - Finale: Trò chơi của sách thành thử thách tổng hợp (`sort`/`drag-drop`/`fill-blank` theo luật trò chơi; trò 2 người chơi với NPC).
  - Reward + Unlock; "Vận dụng" và "Thực hành và trải nghiệm" (cân, đong, xem đồng hồ/lịch ở nhà, gấp cắt giấy) → bước `worksheet` + một bước mô phỏng trong game khi làm được.
- Bài "Luyện tập chung", "Ôn tập": quest dài, trộn cơ chế.
- Mỗi bước tương tác có `curriculumRef`.

## Chia việc song song (disjoint file)
| Gói | Chủ đề | Bài | File |
| --- | --- | --- | --- |
| 5a | 1–2 | 1–14 | `toan2-cd[12]-*.json` |
| 5b | 3–4 | 15–24 | `toan2-cd[34]-*.json` |
| 5c | 5–6 | 25–32 | `toan2-cd[56]-*.json` (cần `connect`, `clock`, `calendar`) |
| 5d | 7 | 33–36 | `toan2-cd7-*.json` |

## Steps
1. Mỗi gói: đọc kiểm kê, viết quest, `pnpm content:check` + `pnpm content:gaps --unit <chủ đề>` sau mỗi bài.
2. `apps/server/src/quest/toan2-quests.test.ts`: chơi hết mọi quest `toan2-*` (draft coi như active trong test) theo chuỗi mở khóa bằng `solution()`.
3. Report cuối phase.

## Verification
- `pnpm content:check`; `pnpm content:gaps --book toan2-t1` = 100%; `pnpm vitest run apps/server/src/quest/toan2-quests.test.ts`

## Risk
- Bài thao tác vật lý (gấp, cắt, ghép hình): mô phỏng `sort`/`multi-select` + phiếu hoạt động; report ghi rõ phần nào chỉ có ở phiếu.
