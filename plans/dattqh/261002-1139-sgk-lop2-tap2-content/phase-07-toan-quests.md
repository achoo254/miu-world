---
phase: 7
title: "Kịch bản Toán tập 2"
status: pending
priority: P1
effort: "XL"
dependencies: [6]
---

# Phase 7: Kịch bản Toán tập 2 (bài 37–75)

## Goal
39 quest (một mỗi bài) phủ 100% mục kiểm kê Toán 2 tập 2, đặt theo `story-map.md`, dùng trò chơi phase 3 và cơ chế tập 1.

## Khuôn
Phase 5 của tập 1 (`plans/dattqh/260930-0846-sgk-lop2-game-content/phase-05-toan-quests.md`): đáp án số tính bằng code từ `expression`, nguyên văn, kho phản hồi ≥ 3 đúng + ≥ 3 sai mỗi bước, lời dẫn không trùng giữa quest, mục không chơi được trong game thì qua phiếu (phase 9), cờ giáo viên ở `plans/dattqh/reports/sgk-toan2-t2-teacher-flags.md`.

## Chia gói song song (theo chủ đề, tệp quest riêng)
| Gói | Chủ đề | Bài | Map chính |
| --- | --- | --- | --- |
| 7a | 8 Phép nhân, phép chia | 37–45 | Nông trại |
| 7b | 9 Hình khối; 14 ôn 68–71 | 46–47, 68–71 | Lâu đài |
| 7c | 10 Số trong phạm vi 1000 | 48–54 | Thư viện, Chợ |
| 7d | 11 Độ dài, tiền Việt Nam | 55–58 | Làng Ven Sông, Chợ |
| 7e | 12 Cộng trừ 1000; 14 ôn 72–75 | 59–63, 72–75 | Đảo bí ẩn |
| 7f | 13 Thống kê, xác suất | 64–67 | Xóm Mái Ấm |

## Validation
- `pnpm content:gaps --book toan2-t2` 100%; `content:check` xanh (nguyên văn, không lặp, có `lesson`, `places`, `goTo`); test map của mọi map có bài mới.
