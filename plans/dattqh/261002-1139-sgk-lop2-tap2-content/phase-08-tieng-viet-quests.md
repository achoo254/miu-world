---
phase: 8
title: "Kịch bản Tiếng Việt tập 2"
status: pending
priority: P1
effort: "XL"
dependencies: [6]
---

# Phase 8: Kịch bản Tiếng Việt tập 2 (tuần 19–35)

## Goal
32 quest (30 bài + ôn giữa kì 2 + ôn cuối kì 2) phủ 100% mục kiểm kê Tiếng Việt 2 tập 2, đặt theo `story-map.md`; Đọc, Nói và nghe, Luyện tập trong game (cảnh truyện, đọc hiểu, từ ngữ, câu, dấu câu, thu âm trên máy); Viết qua phiếu (phase 9).

## Khuôn
Phase 4 của tập 1 (`plans/dattqh/260930-0846-sgk-lop2-game-content/phase-04-tieng-viet-quests.md`): bài đọc nguyên văn trong `texts`, giọng thoại vui, kho phản hồi xoay vòng, không lặp, cờ giáo viên ở `plans/dattqh/reports/sgk-tv2-t2-teacher-flags.md`.

## Chia gói song song (theo chủ điểm)
| Gói | Chủ điểm | Bài | Map chính |
| --- | --- | --- | --- |
| 8a | Vẻ đẹp quanh em | 1–8 | Làng Ven Sông, Xóm Mái Ấm, Nông trại |
| 8b | Hành tinh xanh của em + ôn giữa kì | 9–16, ôn giữa kì | Khu rừng, Đảo, Trường học |
| 8c | Giao tiếp và kết nối | 17–20 | Thư viện |
| 8d | Con người Việt Nam | 21–24 | Đảo, Lâu đài, Trường học |
| 8e | Việt Nam quê hương em + ôn cuối kì | 25–30, ôn cuối kì | Làng Ven Sông, Chợ, Đảo, Trường học, Xóm Mái Ấm |

## Validation
- `pnpm content:gaps --book tv2-t2` 100%; `content:check` xanh; thu âm Nói và nghe chạy (E2E `speak` mở rộng một bài tập 2).
