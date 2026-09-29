---
paths:
  - "apps/web/src/ui/**"
  - "apps/web/src/game-bridge/**"
---

# Giao diện web (React)

Lý do: Master Plan v3 §2, §6, §7; chuẩn ở `docs/code-standards.md` mục React, `docs/design-guidelines.md`.

- Mỗi màn hình ghi ở comment đầu file đang bám mock nào (`M1.3`, `M3.2`…) hoặc là NEW SCREEN (Master Plan §6). Bám luồng và chức năng, không khớp từng pixel.
- Màu, font, bo góc dùng biến CSS token; không hardcode giá trị mới.
- React không giữ state thay đổi theo khung hình. Game gửi event rời rạc qua `game-bridge` (store + `useSyncExternalStore`); vị trí/transform theo khung hình do game ghi thẳng vào phần tử neo qua ref.
- React không điều khiển game loop; chỉ gọi `start`/`stop`/`dispose` của `Game`.
- Số liệu thưởng, level, mở khóa hiển thị từ response server (có thể dự đoán bằng `packages/quest` nhưng luôn thay bằng kết quả server).
- Gọi API cùng origin bằng `fetch`; không script, font, analytics bên thứ ba; không thêm host vào CSP.
- Không hiển thị Kim cương ở MVP.
