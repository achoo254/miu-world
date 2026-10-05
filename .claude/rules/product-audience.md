# Đối tượng và định hướng sản phẩm

Người sở hữu (05/10/2026): game dành cho mọi lứa tuổi, vừa chơi vừa học; trẻ em chơi được, người lớn cũng chơi được. Đây là game online kiểu Minecraft, sau này có thêm mobile app thực sự. Game không chỉ dành cho trẻ em nên không đòi hỏi phụ huynh giám sát: phụ huynh tự chịu trách nhiệm việc trẻ em chơi trong game.

## Áp dụng khi thiết kế và viết code

- Không đặt một tính năng mới sau "phụ huynh phải bật/duyệt/ngồi cạnh". Mặc định người chơi dùng được ngay; công tắc của phụ huynh chỉ là tiện ích tùy chọn, không phải điều kiện để chơi.
- Nội dung, giao diện, nhịp chơi phải hợp cả bé lẫn người lớn: không giọng dỗ dành riêng cho trẻ nhỏ ở chỗ chung (menu, cài đặt, cửa hàng, chat); phần học vẫn bám SGK nhưng độ khó có thể tăng theo người chơi.
- Thiết kế cho nhiều nền tảng: web hôm nay, mobile app sau. Điều khiển, UI, đồng bộ dữ liệu không được phụ thuộc chuột/bàn phím hay trình duyệt khi có lựa chọn khác; logic quyết định ở server và `packages/*` để app dùng lại.
- Hướng online nhiều người chơi: người chơi là chủ thể, không phải "hồ sơ con của phụ huynh" trong tương lai.

## Điều không đổi

- Server vẫn tính thưởng, XP, mở khóa (xem `.claude/rules/server-and-child-safety.md`).
- Giữ các giới hạn an toàn cơ bản của dữ liệu cá nhân: không log email, token, mật khẩu, không đưa dữ liệu thật vào repo.

## Còn lại từ thiết kế cũ

Đã đổi (05/10/2026): PIN phụ huynh là tùy chọn, không đặt thì Khu phụ huynh luôn mở và không còn bước đặt PIN bắt buộc sau lần đăng nhập đầu. Phần còn lại của luồng "phụ huynh là chủ tài khoản, trẻ là hồ sơ con, đồng ý chính sách trước khi tạo hồ sơ" (`docs/project-overview-pdr.md`) và mục "An toàn trẻ em" trong `server-and-child-safety.md` ra đời trước định hướng này. Chúng vẫn là hành vi đang chạy; không tự gỡ hay viết lại. Việc đổi tiếp mô hình tài khoản (bỏ hồ sơ con, tuổi, nội dung đồng ý chính sách, pháp lý) ảnh hưởng dữ liệu người dùng nên phải hỏi người sở hữu trước khi làm.
