---
phase: 3
title: "Trò chơi mới trong thế giới 3D"
status: pending
priority: P1
effort: "XL"
dependencies: []
---

# Phase 3: Trò chơi mới trong thế giới 3D

## Goal
Các loại bước quest mới cho tập 2, chơi ngay trong map và các phòng (Jev E5), dùng chung ba lớp hỗ trợ (Hướng dẫn, Gợi ý, Đáp án), đáp án ở server, không khóa tiến trình.

## Khuôn
Phase 2 và 8 của tập 1 (`plans/dattqh/260930-0846-sgk-lop2-game-content/phase-02-quest-schema-new-mechanics.md`, `phase-08-new-mechanic-ui.md`): schema Zod trong `packages/quest`, chấm ở server, UI cảnh theo mock quest (memory: không modal trắng), E2E chạm trên khung iPad.

## Trò chơi
| Id cơ chế | Chơi thế nào | Chấm |
| --- | --- | --- |
| `group-share` | Kéo đồ vật trong cảnh (trứng, táo, gà) vào các nhóm/rổ bằng nhau; ghi phép nhân/chia | số nhóm × số mỗi nhóm, hoặc số mỗi phần |
| `shape-hunt` | Chạm các vật hình khối trụ/khối cầu trong phòng hay quanh công trình (tháp, cột, đèn, quả địa cầu) | tập id vật đúng |
| `place-value` | Xếp khối trăm/chục/đơn vị (kệ sách: hộp 100, chồng 10, cuốn 1) để được số; đọc/viết số ba chữ số | số |
| `market-pay` | Chọn tờ tiền/đồng xu trả đúng giá ở sạp (giá ba chữ số), nhận tiền thừa | tổng tiền |
| `pace-measure` | Đi giữa hai mốc trên map; đồng hồ đo hiện m (hoặc km theo tỉ lệ bài); chọn đơn vị, ước lượng | số + đơn vị |
| `picture-graph` | Đếm vật trong khu (gà, bò, hoa), đặt hình vào cột biểu đồ tranh, trả lời câu hỏi | các cột + câu trả lời |
| `lucky-bag` | Rút từ túi (hình vẽ các quả bóng màu), chọn chắc chắn/có thể/không thể | nhãn |
| `postcard` | Soạn thiệp/thư theo khung (lời chào, lời chúc, kí tên) bằng thẻ từ; bản in qua phiếu viết | đủ phần bắt buộc (mở, cờ giáo viên) |
| `story-scene` | Cảnh truyện cho bài đọc/kể chuyện: nhân vật diễn trong map, câu hỏi đọc hiểu tại chỗ | như đọc hiểu tập 1 |

Mỗi cơ chế: schema + validate trong `content:check`, runtime chấm (`packages/quest`), UI (`apps/web/src/ui/...`), vật trong thế giới dùng prop hộp/model có sẵn (`content/world/box-props/<map>.json`, `content/world/models.json`), test đơn vị, một E2E chạm.

## Requirements
- Không gì của quest/nội dung phụ thuộc Three.js (`packages/quest` thuần TS).
- Không tính thưởng ở client.
- Mỗi cơ chế tắt được hiệu ứng nặng ở mức `low`; giữ ngân sách khung hình (150 draw call, ~150k tam giác).

## Validation
- `pnpm test`, `typecheck`, `lint`, build web, E2E dự án mới `sgk2-mechanics`; ảnh từng cơ chế cho trang review.
