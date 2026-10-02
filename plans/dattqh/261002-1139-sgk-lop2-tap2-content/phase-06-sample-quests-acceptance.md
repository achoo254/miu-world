---
phase: 6
title: "Quest mẫu và nghiệm thu"
status: pending
priority: P1
effort: "M"
dependencies: [1, 3]
---

# Phase 6: Quest mẫu và nghiệm thu

## Goal
4–6 quest mẫu tập 2, khác dạng bài, khác map, dùng các trò chơi mới; trang nghiệm thu; Jev duyệt (Jev E4, memory: các cổng nghiệm thu sau qua Jev) trước khi viết hàng loạt.

## Khuôn
Quest mẫu và trang nghiệm thu của tập 1: `tools/sgk/acceptance-page.ts`, `tools/sgk/acceptance-template.html`, `tools/sgk/review-quests.ts`; quy tắc D8 (nguyên văn), D9 (không lặp), D11 (luôn nói đi đâu), D13 (sách, bài, trang).

## Chọn mẫu (gợi ý, chốt khi làm)
| Mẫu | Bài | Trò chơi | Map |
| --- | --- | --- | --- |
| 1 | Toán 39 Bảng nhân 2 | `group-share` | Nông trại |
| 2 | Toán 46 Khối trụ, khối cầu | `shape-hunt` | Lâu đài |
| 3 | Toán 56 Giới thiệu tiền Việt Nam | `market-pay` | Chợ phiên |
| 4 | Toán 65 Biểu đồ tranh | `picture-graph` | Xóm Mái Ấm |
| 5 | TV bài 21 Mai An Tiêm | `story-scene` | Đảo bí ẩn (hoặc map tạm nếu phase 4 chưa xong) |
| 6 | TV bài 4 Tết đến rồi (viết thiệp chúc Tết) | `postcard` | Xóm Mái Ấm |

## Requirements
- Quest ở trạng thái `draft` tới khi duyệt; chữ SGK đánh dấu trên trang nghiệm thu; ảnh màn hình từng cơ chế; bản chơi thử (`?spawnAt=` / ảnh `shot=play`).
- Gửi Jev duyệt theo tiêu chí: đúng sách, vui, không lặp, bé biết đi đâu; ghi report `plans/dattqh/reports/jev-<ngày>-sgk-tap2-samples.md`; góp ý áp vào mẫu trước khi mở rộng.

## Validation
- `content:check` xanh với mẫu; E2E chơi trọn hai mẫu.
