# Hướng dẫn thiết kế

Nguồn: Master Plan v3 §2 (art direction, quy tắc bám mock), §10 (phong cách hiển thị). Mock ở `designs/`; danh sách màn hình theo mock ở `designs/mock-requirement-ui.md` và Master Plan §6.

## Bám mock

- Mock hiện tại (M1, M2, M3) là nguồn chuẩn cho **luồng màn hình, thông tin hiển thị, cơ chế chơi** — không phải cho hình dạng hay màu của nhân vật và môi trường (mock là render 3D mượt, game là voxel).
- Khi có mock voxel cho một màn hình, mock mới ghi đè mock cũ của màn đó; hai bên mâu thuẫn thì hỏi trước khi làm.
- Làm đúng luồng và chức năng trước, không khớp từng pixel.
- Mỗi màn hình ghi rõ bám mock nào, phiên bản nào (ví dụ `M3.2`).
- Màn NEW SCREEN phải theo visual language của ba mock hiện có.

## Art direction voxel (đề xuất, chờ mock voxel xác nhận)

- Thế giới, nhân vật, NPC, vật phẩm dựng từ khối; màu tươi, ánh sáng mềm, hợp trẻ em.
- Camera third-person; Home Base và World Map dùng chung một cảnh đảo nổi.
- HUD giữ cấu trúc M3.2: avatar + thanh XP, nhiệm vụ, bản đồ, ba lô, menu, joystick, nút Tương tác và Chạy.
- Một atlas + một material cho khối, flat shading, ánh sáng đơn giản (có thể bake AO vào đỉnh) — lựa chọn này ràng buộc bởi ngân sách hiệu năng, không chỉ thẩm mỹ.
- Bảng màu chung cho khối và asset tint: `content/palette.json` (đổi màu ở đây, không hardcode trong generator).

## Màu và token giao diện

- Hướng đã chọn cho các màn trước khi vào game: **A · Đảo mây kẹo hồng** (chọn ngày 30/09/2026 trong ba hướng mock). Nền trời xanh chuyển hồng, mây, đảo khối nổi; panel trắng bo tròn; nút chính hồng, nút phụ xanh dương. Hướng này bám sát visual language của M1–M3. Token vẫn là bản tạm cho tới khi có mock voxel (Master Plan task #4).
- Giao diện tách lớp khỏi logic, dùng design token và component chung để đổi diện mạo không phải viết lại chức năng.
- Token nằm ở `apps/web/src/ui/tokens.css`, là nơi duy nhất chứa giá trị màu. Muốn dùng giá trị mới thì thêm token trước. Cuối file có vài tên cũ (`--ink`, `--accent`, `--surface`…) giữ cho HUD của game (`apps/web/src/game/game.css`).
- Component dùng chung nằm ở `apps/web/src/ui/kit/`: kiểu nút (`buttonClass`), icon, ảnh Miu, cảnh bầu trời (`SkyScene`), bàn phím PIN, thanh tiến độ, hộp thoại `Modal` (giữ focus bên trong, Esc để đóng, trả focus về chỗ cũ). Màn hệ thống (Tạm dừng, Mất mạng, Đang tải) ở `apps/web/src/ui/system/`. Class dùng chung nằm ở `apps/web/src/ui/styles.css`. Dựng màn mới từ đây trước khi viết style riêng.
- Icon và ảnh mà giao diện React hiển thị phải khai báo trong `apps/web/src/ui/kit/ui-art.ts`. Bản build chỉ chép các file có trong danh sách đó, và báo lỗi nếu file không có trong manifest.
- Tạo hình nhân vật theo mock voxel `designs/character.png` (người sở hữu chốt 2026-09-30; với nhân vật, mock này là chuẩn cả hình dạng lẫn màu): mèo trắng chibi đầu to, tai hồng, mắt to có đốm sáng, miệng cười, ria, má hồng, váy hồng nơ trắng. Thân dựng bằng khối trong `content/bodies/`; loài khác (Thỏ, Cáo, Gấu) là thêm file body, chưa làm ở MVP.
- Ảnh Miu hiện lấy từ bộ render của trang review (`assets/generated/review/character/`), nền màu phẳng, không trong suốt. Vì vậy giao diện luôn đặt ảnh vào khung cùng màu nền, hoặc hòa màu bằng `multiply` lên nền tint. Khi có ảnh nhân vật riêng cho giao diện, đổi đường dẫn trong `ui-art.ts`.

## Font, icon, âm thanh

- Font tự host (OFL, có tiếng Việt): **Baloo 2** (700, 800) cho tiêu đề/HUD, **Nunito** (400, 700) cho nội dung. Khai báo dùng chung ở `apps/web/src/ui/fonts.css`.
- Icon vật phẩm, tiền tệ, HUD, huy hiệu: Microsoft Fluent Emoji 3D (MIT); bỏ emoji dính thương hiệu.
- Khung, nút, banner: CSS + token, không dùng ảnh vẽ tay. Ảnh đại diện, thumbnail render từ model 3D bằng script.
- Số và chữ trên vật thể (viên đá số, thẻ chữ) vẽ lúc chạy bằng canvas texture.
- Âm thanh, VFX: pack Kenney (CC0). "Nghe lại" dùng Web Speech API.

## Hạn chế đã chấp nhận

Asset từ nhiều pack (Kenney, Fluent Emoji, KayKit sau này) có thể lệch phong cách và kém chi tiết hơn mock. Giảm bằng bảng màu chung, flat shading, UI thống nhất bằng token; stakeholder xác nhận chất lượng ở gate POC.
