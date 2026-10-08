# Phòng truyền thống ở Nhà của bé

Trạng thái: đã deploy production 08/10/2026 (revision `3179dbca`) · Độ lớn: L · Nhánh: `main`

## Kết quả mong muốn

Người sở hữu (08/10/2026) hỏi huy hiệu bé đạt được dùng vào đâu, có làm trang trí trong nhà được không; chọn "Phòng truyền thống đầy đủ". Bé có một ngôi nhà nhỏ riêng trên khuôn viên Nhà của bé (Jev chọn nhà riêng 0,89 vì nhà chính không còn tường trống):

- Tủ trưng bày 8 huy hiệu sự kiện (`content/items`, `kind: badge`): bản thường hàng dưới, bản kỷ niệm hàng trên.
- 12 bục cúp, mỗi bục một bộ của Sổ sưu tập; bộ đã nhận thưởng thì có cúp.
- 5 bảng thành tích theo nhóm (`ACHIEVEMENT_CATEGORIES`), mỗi bảng 3 ngôi sao: 1 sao khi đã nhận 1 thành tích của nhóm, 2 sao khi nhận từ một nửa, 3 sao khi nhận hết.
- Chỗ chưa có hiện mờ (đĩa xám, cúp xám, hốc sao xám). Chạm "Xem phòng truyền thống" mở bảng kê tên, cách đạt, ngày nhận.

## Không làm

- Không cho bé tự chọn bày gì (phương án khác người sở hữu không chọn).
- Khi thăm nhà bạn, phòng hiện đồ của người xem, giống đồ trang trí hiện nay; hiện đồ của chủ nhà là việc riêng.
- Không thêm bảng hay migration: ngày nhận lấy từ `reward_ledger.created_at`.

## Pha

| Pha | Việc | Tier |
|---|---|---|
| 1 | `packages/schema/src/trophy-room.ts` (DTO, luật sao, khóa trưng bày) + `GET /api/trophies` + test | S |
| 2 | Model: emoji prop cúp và huy chương thể thao; box prop tủ, bục, bảng, đồ mờ; `models.json` | M |
| 3 | Map: nhà "Phòng truyền thống" + lối nối đường + chỗ trưng bày (`trophies` trong `entities.json`) + audit + lưới đi | M |
| 4 | Runtime: `trophyProps` đặt đồ theo khóa đã có lúc dựng game; play-screen tải `/api/trophies` ở nhà | S |
| 5 | Bảng "Phòng truyền thống" (song ngữ), mục tiêu `nha-truyen-thong` | M |
| 6 | Gate, tài liệu (`docs/design-cac-map.md`, roadmap) | S |

## Tiêu chí xong

- Server là nguồn sự thật: client chỉ vẽ những gì `/api/trophies` nói bé có.
- `scenery-audit`, `room-audit`, `reach-audit`, `world:quest-targets` sạch; lưới đi sinh lại; `assets:check`, `content:check`, typecheck, lint, test liên quan, build web.
- Ảnh render trong phòng: đồ đủ và đúng hướng ở cả hai trạng thái (đã có / còn trống).
