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

- Tạm lấy **hồng** làm màu chính (plan cũ có hai bộ: hồng–xanh và tím–indigo). Token chính thức chốt khi có mock voxel (Master Plan task #4).
- Giao diện tách lớp khỏi logic, dùng design token và component chung để đổi diện mạo không phải viết lại chức năng.
- Token tạm hiện có: biến CSS ở đầu `apps/poc-voxel/src/styles.css`. Dùng lại chúng thay vì hardcode giá trị mới.

## Font, icon, âm thanh

- Font tự host (OFL, có tiếng Việt): **Baloo 2** cho tiêu đề/HUD, **Nunito** cho nội dung. Khai báo dùng chung ở `apps/poc-voxel/src/fonts.css`.
- Icon vật phẩm, tiền tệ, HUD, huy hiệu: Microsoft Fluent Emoji 3D (MIT); bỏ emoji dính thương hiệu.
- Khung, nút, banner: CSS + token, không dùng ảnh vẽ tay. Ảnh đại diện, thumbnail render từ model 3D bằng script.
- Số và chữ trên vật thể (viên đá số, thẻ chữ) vẽ lúc chạy bằng canvas texture.
- Âm thanh, VFX: pack Kenney (CC0). "Nghe lại" dùng Web Speech API.

## Hạn chế đã chấp nhận

Asset từ nhiều pack (Kenney, Fluent Emoji, KayKit sau này) có thể lệch phong cách và kém chi tiết hơn mock. Giảm bằng bảng màu chung, flat shading, UI thống nhất bằng token; stakeholder xác nhận chất lượng ở gate POC.
