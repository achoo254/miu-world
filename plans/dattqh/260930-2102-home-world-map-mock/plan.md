---
title: "Home và Bản đồ thế giới theo mock M1.1 / M1.4"
description: "Làm lại bố cục Home và màn Bản đồ cho sát mock designs/design-reference-miu-game-world-mockup.png (ô 1 và 4), trong giới hạn các quyết định MVP đã chốt."
status: completed
priority: P2
effort: "1d"
branch: main
tags: [frontend, ui]
created: 2026-09-30
---

# Home và Bản đồ thế giới theo mock

## Bối cảnh

Người dùng (30/09/2026): "màn hình home và chọn map chưa được như kỳ vọng, thiết kế lại theo đúng chuẩn design mock nhất có thể". Mock: `designs/design-reference-miu-game-world-mockup.png`, ô 1 (Trang chủ) và ô 4 (Bản đồ thế giới – Chọn khu vực).

Ràng buộc đã chốt (không mở lại):
- Master Plan §15 #6: không hiện Kim cương. Chuỗi ngày (streak): defer. Thẻ sự kiện TIMO, mục "Sự kiện": Live World.
- Master Plan §15 #21: Home là màn React trên ảnh đảo render sẵn (`pnpm assets:home`); không dựng cảnh 3D thứ hai. `docs/design-guidelines.md`: mock là chuẩn cho luồng, thông tin, bố cục; không phải cho hình dạng/màu môi trường (game là voxel).
- Quyết định Jev trong phiên này (nhãn khu vực chồng nhau trên điện thoại): khu khóa thành chấm ổ khóa, chạm hiện tên. Giữ cho màn hẹp; màn đủ rộng dùng thẻ nhãn như mock.
- Phiên song song SGK (`dattqh/feat/sgk-lop2-content`) thêm dòng sách/bài/trang vào ô nhiệm vụ; giữ data-id `home-today-quest`, `region-quest-<id>`, `region-play-<id>` và chừa chỗ cho dòng đó.

## Thiết kế

| Mock | Làm | Ghi chú |
|------|-----|---------|
| Thanh trên: avatar, tên, Lv, XP, Xu, bánh răng | `PlayerBadge` (có Xu) + nút Cài đặt tròn góc phải | Không Kim cương, không chuỗi ngày |
| Thanh dọc trái: Nhiệm vụ, Sự kiện, Bản đồ | Thanh dọc: Nhiệm vụ, Bản đồ, Ba lô | Sự kiện là Live World |
| Thế giới đảo nổi tràn màn hình | Sân khấu đảo dùng chung (`WorldStage`) chiếm phần lớn màn | Ảnh đảo voxel hiện có |
| Nhãn khu vực: thẻ trắng 2 dòng (tên + môn), khu khóa có ổ khóa và "Sắp mở"/"Cần Lv.15" | Thẻ 2 dòng khi đảo đủ rộng; chấm ổ khóa + bong bóng khi hẹp | Thêm trường `subject` (tùy chọn) vào khu vực |
| Miu đứng góc trái dưới | Chân dung nhân vật của bé (loài đã chọn) vẫy tay ở góc trái dưới sân khấu | Ảnh render có nền phẳng nên giữ khung tròn |
| "Nhiệm vụ hôm nay": 3 dòng, mỗi dòng +XP, mũi tên | Tối đa 3 quest chơi được, mỗi dòng tiêu đề + "+XP" (từ server) + vào chơi | XP lấy từ `reward` của quest do server trả |
| Thẻ TIMO Challenge | Không làm | Live World |
| Bản đồ: thế giới tràn màn, cùng nhãn | Màn Bản đồ dùng cùng `WorldStage`, tiêu đề "Bản đồ thế giới", nút về Trang chủ | Thay danh sách thẻ hiện tại |

## Acceptance

- Home và Bản đồ ở iPad ngang/dọc và điện thoại: không nhãn nào che nhau hay tràn màn; mọi khu chạm được (E2E kiểm).
- Không có Kim cương, chuỗi ngày, sự kiện.
- Giữ data-id cũ mà test và phiên SGK dựa vào.
- 5 gate + build web + E2E xanh.

## Ngoài phạm vi (đề xuất sau)

- ~~Ảnh thế giới nhiều đảo~~: làm luôn trong đợt này theo yêu cầu người dùng (xem Kết quả).
- Ảnh nhân vật nền trong suốt cho giao diện.

## Kết quả (30/09/2026)

- `apps/web/src/ui/world/` (`WorldStage`): đảo + thẻ khu vực dùng chung cho Home và Bản đồ; thẻ hai dòng khi đảo rộng ≥ 40rem, chấm ổ khóa + bong bóng khi hẹp hơn.
- Home: thanh trên (huy hiệu + nút Cài đặt tròn), thanh dọc Nhiệm vụ/Bản đồ/Ba lô (thành hàng ngang dưới 64rem), chân dung nhân vật của bé ở góc trái dưới sân khấu, "Nhiệm vụ hôm nay" tối đa 3 dòng có +XP (`today-quests.tsx`).
- Bản đồ thế giới: đảo tràn trang, cao vừa màn hình, tiêu đề "Bản đồ thế giới".
- `subject` (tùy chọn) trong `content/world/regions.json`.
- E2E: iPad dọc/ngang cho Home và Bản đồ — 7 thẻ, không thẻ nào chồng nhau, chồng chân dung hay tràn màn; điện thoại — 6 chấm khóa chạm được, bong bóng nằm trong màn.
- Cảnh nhiều đảo (người dùng yêu cầu 30/09/2026, "hiện tại đâu giống mock"): map voxel `the-gioi` 128×48×128 (`pnpm world:overview`), 7 đảo nổi đáy nhọn — rừng + cây cổ thụ + thác nước ở giữa, trường (cột cờ), thư viện (cột trắng), lâu đài (4 tháp + tháp chính, cờ), núi tuyết (thông), nhà của bé (hàng rào, hoa), đảo bí ẩn (đá, nấm) — cầu gỗ trên không. Thêm 4 khối từ Kenney Voxel Pack (tuyết, gạch đỏ, gạch xám, gỗ đỏ) + 2 màu palette. Render bằng `preview.html?world=the-gioi` (file mới, không đụng `game.ts`) từ camera dùng chung; nhãn đặt ở mép trước dưới mỗi đảo như chú thích. `the-gioi` không vào `dist/` (chỉ `generated/home/world.png`).
- Sửa theo review: tên link dòng nhiệm vụ lấy từ nội dung (đọc được XP, tiến độ); bong bóng `aria-hidden`, bỏ `aria-expanded` giả; kích thước chân dung theo sân khấu; `subject` qua `say()` và `content:check`; `100dvh`; test thuần cho `todayQuests`; E2E điện thoại kiểm chồng lấn mọi thẻ ở Home và Bản đồ.

- E2E điện thoại mới bắt được một chồng lấn thật trên Home (thẻ "Khu rừng bí mật" lấn chấm "Trường học" 2px, vì đảo Home hẹp hơn Bản đồ do lề trang). Sửa: Home bỏ lề ngang dưới 40rem để đảo rộng như Bản đồ; đảo < 22rem thì thẻ khu mở bỏ icon lấp lánh.

## Bằng chứng (30/09/2026, dữ liệu giả lập)

Ảnh chụp các màn đã sửa trong phiên, ở `evidence/`: khu phụ huynh (chưa có hồ sơ, hai hồ sơ, đang đổi tên; iPad dọc và điện thoại), Home và Bản đồ thế giới (điện thoại, iPad dọc, iPad ngang), Home trên điện thoại khi chạm vào một khu đang khóa.
