---
title: "Màn tải nhanh, đúng nhân vật, mẹo mới; chim vỗ cánh"
description: "Sửa bốn lỗi người sở hữu báo 05/10/2026: tải lâu ở 80–100%, màn tải hiện nhân vật mặc định, mẹo không đổi, chim bay không vỗ cánh."
status: pending
priority: P1
tier: M
branch: main
tags: [web, game]
created: 2026-10-05
---

# Màn tải nhanh, đúng nhân vật, mẹo mới; chim vỗ cánh

**Trạng thái:** đã lập (05/10/2026); làm ngay sau plan co-op (`261004-1617-coop-quests`) vì dùng chung `play-screen.tsx`, `game.ts`, file bản dịch; xong thì deploy production (người sở hữu đã cho phép, 05/10/2026) · **Tier:** M

## Chẩn đoán (đọc code, 05/10/2026)

| Lỗi | Nguyên nhân | Chỗ |
| --- | --- | --- |
| Tải lâu ở 80–100%, cả khi quay lại map | Thanh tiến độ có 5 mốc; sau mốc 80% (`world.settle()`) còn tải thú cưng, dựng nhân vật/đồ vật/sự sống, tạo bộ quản lý tương tác, online, bản đồ nhỏ, gọi API, rồi mới `ready` ở khung hình đầu; không báo tiến độ, không cho vào chơi sớm | `apps/web/src/game/game.ts` (mốc tiến độ, `loadPetCompanion`, phát `ready`) |
| Màn tải hiện nhân vật mặc định | `LoadingOverlay` luôn vẽ `MiuOnIsland` không truyền loài/trang phục; `play-screen.tsx` có sẵn `species`/`outfit` nhưng không truyền | `apps/web/src/ui/system/loading-overlay.tsx`, `apps/web/src/ui/play/play-screen.tsx` |
| Mẹo không đổi | Chỉ 2 câu `loading.tipPortal`, `loading.tipTalk`, chọn theo `viaPortal` | `loading-overlay.tsx`, `apps/web/src/ui/i18n/locales/*.json` |
| Chim không vỗ cánh | Model `animal-parrot.glb` **có** nút `wing-left`, `wing-right` (đã kiểm file) và các clip `idle`, `walk`…; nhiều khả năng clip của mixer ghi đè góc cánh mà `ambient-poses.ts` đặt mỗi khung hình (thứ tự cập nhật), cần đo khi chạy | `apps/web/src/game/ambient/ambient-actor.ts`, `ambient-poses.ts`, `ambient-life.ts` |

### Đọc thêm về chim (05/10/2026)

- Chỉ có một loài bay là vẹt (`ambient-routines.ts`, `parrot`); vùng ngoài dùng cùng lớp ambient.
- Thứ tự mỗi khung hình đúng: `mixer.update` rồi `applyWings` ghi đè `rotation.z` của `wing-left/right` (`ambient-life.ts`), nên giả thuyết "clip ghi đè cánh" **không đúng**.
- Model: cánh là tấm phẳng 0,47 × 0,2 × 0,6 gắn ở mép thân (gốc nút ở chỗ khớp, xoay quanh z là vỗ lên xuống, đúng trục); thân rộng 1,25. Cánh nhỏ, bay xa (vòng bán kính 7 trên trời) nên nhịp vỗ ±0,95 rad gần như không thấy; lúc lượn (`glide`) cánh gần như đứng yên nửa vòng.
- Nghi vấn còn lại cần đo khi chạy: skin gộp (`merge-parts.ts`, xương là chính nút phần) có cập nhật cánh không; nếu có thì vấn đề là nhìn không rõ → tăng biên độ và kích thước cánh khi bay (phóng cánh theo trục x), thêm nhịp nâng thân theo nhịp vỗ, giảm thời gian lượn.

## Việc làm

1. Đo trước khi sửa: thời gian từng đoạn từ mốc 80% tới `ready` (lần đầu và lần quay lại), trên `quality=low/high`; ghi số vào report. Sửa theo số đo: chạy song song việc độc lập, không chờ API không cần cho khung hình đầu, cho vào chơi khi vùng gần bé xong rồi tải phần còn lại ở nền, giữ cache model/dữ liệu giữa các lần vào map; thanh tiến độ phản ánh đúng các đoạn còn lại.
2. Màn tải vẽ đúng nhân vật của người chơi (loài, trang phục) như ảnh chân dung ở HUD.
3. Mẹo: một pool mẹo song ngữ phủ các tính năng (cửa hàng, sổ sưu tập, thú cưng, bếp, minigame, bạn bè, tổ đội, co-op, chuyện NPC và trái tim, thành tích, hành trình, cây kỹ năng, cổng tri thức, trang trí nhà, xe, tàu/xe buýt, phiếu viết, song ngữ…), đổi mẹo khi tải lâu, không lặp ngay mẹo vừa hiện (`freshPicker`), `content:check`/test chống lặp.
4. Chim: vỗ cánh khi bay, lượn khi hạ; sửa thứ tự mixer/tư thế hoặc tắt clip ghi đè cánh; áp cho mọi loài bay trong sự sống ambient và vùng ngoài.

## Tiêu chí xong

- Số đo trước/sau trong report; thời gian từ 80% tới vào chơi giảm rõ ở lần quay lại.
- Unit test: màn tải nhận loài/trang phục; pool mẹo đủ và không lặp; cánh chim có góc thay đổi khi bay (test tư thế).
- Gate 5 lệnh, build web, `security:dist`; E2E smoke + `play` + `forest-life`; deploy production từ bản xuất sạch.
