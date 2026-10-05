# Tổng quan sản phẩm

Chi tiết đầy đủ: Master Plan v3 (gốc repo) §1–§6, §13, §16. File này chỉ giữ ý định, giới hạn và thuật ngữ cần để ra quyết định hằng ngày.

## Ý định

Miu World là game phiêu lưu 3D voxel online kiểu Minecraft, chạy trên web (sau này có mobile app), dành cho mọi lứa tuổi: trẻ em chơi được, người lớn cũng chơi được, vừa chơi vừa học. Game không đòi hỏi phụ huynh giám sát; phụ huynh tự chịu trách nhiệm việc trẻ chơi (người sở hữu, 05/10/2026). Kiến thức là công cụ để tiến lên, không phải LMS có thêm avatar. Vòng lặp: thế giới → khám phá → quest → dùng kỹ năng học → thử thách → phần thưởng → nhân vật mạnh lên → mở khu vực mới.

Cách làm: single-player vertical slice trước (Home Base + Khu rừng bí mật chương 1), multiplayer là giai đoạn riêng sau MVP nhưng server làm nguồn sự thật ngay từ MVP để không phải viết lại.

## Không làm (hiện tại)

- Không sinh thế giới ngẫu nhiên vô hạn; mỗi khu vực là bản đồ thiết kế sẵn, generator theo seed chỉ là công cụ dựng map (§15 #4).
- Không khớp từng pixel với mock hiện tại (mock là ảnh render AI mượt; chỉ bám luồng và chức năng).
- Không đặt/phá block ở thế giới chính và khu chung (§15 #3).
- Không dùng Kim cương ở MVP; ô Kim cương ẩn trên HUD (§15 #6).
- Không chat tự do; không P2P/WebRTC giữa người chơi.
- Không dùng tên, texture, asset của Minecraft.
- MVP chỉ có loài Mèo; Thỏ, Cáo, Gấu để V1 (§15 #7).
- Multiplayer sau MVP, mở từ Bậc 1 (thấy nhau) (§15 #8).

## Ràng buộc không suy ra được từ code

- **Asset:** chỉ CC0 (model, texture, âm thanh), MIT (icon Fluent Emoji), OFL (font) hoặc sinh bằng code. Không CC-BY/SA/NC, không tự vẽ, không AI trả phí, không voxel artist. Hệ quả chấp nhận: hình ảnh kém chi tiết hơn mock.
- **Dữ liệu người chơi và trẻ em:** người đăng nhập là người chơi chính và tự đồng ý chính sách; trẻ chơi bằng người chơi phụ trong tài khoản người lớn, người lớn đó chịu trách nhiệm; không thu tên thật, tuổi, trường của người chơi (tên chọn từ danh sách). Yêu cầu pháp lý (Nghị định 13/2023/NĐ-CP và luật dữ liệu cá nhân mới) phải được pháp chế xác nhận — tài liệu này không phải tư vấn pháp lý.
- **Chống gian lận:** mọi thưởng, kết quả thử thách, mở khóa do server tính; client chỉ hiển thị.
- **Mô hình vận hành:** AI làm 100% phần kỹ thuật; con người duyệt cuối trên trang review và làm việc máy không thay được (nội dung giáo dục, chơi thử với trẻ, kiểm duyệt cộng đồng, đo máy thật trước nghiệm thu MVP).

## Thuật ngữ

| Từ | Nghĩa |
| --- | --- |
| Miu | Nhân vật người chơi (Mèo) ở MVP; cũng là tên game |
| M1, M2, M3 (`M3.2`…) | Ba ảnh mock trong `designs/` và số panel; dùng để trỏ màn hình |
| Mock voxel | Bộ mock mới sẽ thay mock hiện tại theo từng màn hình; mock mới ghi đè mock cũ của màn đó |
| NEW SCREEN | Màn hình cần có nhưng chưa có mock (Master Plan §6) |
| Vertical slice | Một vòng lặp chơi trọn vẹn trong một khu vực nhỏ |
| MVP / V1 / Live World / MP | Các giai đoạn phát hành (xem `project-roadmap.md`) |
| Subject / Skill | Môn (Toán, Tiếng Việt, English) / kỹ năng cụ thể (Đọc hiểu, Phép cộng…); level Subject tổng hợp từ Skill; Skill XP là phần thưởng MVP (§15 #5) |
| Quest 8 pha | Hook, Explore, Learn, Challenge, Decision, Finale, Reward, Next (tiếp nối, không mở khóa gì); quest phải trả lời đủ 7 câu (đóng vai ai, ở đâu, mục tiêu, chơi gì, kiến thức nào, nhận gì, tiếp theo đi đâu) |
| Ba lớp hỗ trợ | Hướng dẫn, Gợi ý, Đáp án kèm giải thích; xem đáp án không khóa tiến trình |
| NPC Vẹt, Hải ly | Thay Cú mèo và Sóc trong mock (Cube Pets không có hai loài đó) |
| Pack | Bộ asset bên ngoài khai báo trong `tools/assets/sources.json` |
| Trang review | Trang duyệt cuối của mỗi đợt giao hàng; con người duyệt ở đây, không duyệt từng PR |
| CC | Claude Code (trong bảng phân vai của Master Plan) |

## Luồng tài khoản (§9, §11)

Đăng nhập Google → đồng ý chính sách (v3) → server tạo **người chơi chính** của tài khoản (tên đầu tiên còn trống trong danh sách) và chọn sẵn nó → tạo nhân vật → Home. Mỗi phiên mới chơi bằng người chơi chính; không có màn "Ai đang chơi?" trừ khi chủ tài khoản thêm **người chơi phụ** cho máy dùng chung (tối đa 3 người chơi; tên chọn từ danh sách; không tên thật, tuổi, trường, lớp). Mọi dữ liệu game (tiến độ quest, thưởng, túi đồ, kỹ năng) gắn với từng người chơi. Mục Quản lý tài khoản (thêm, sửa, xóa người chơi phụ; tải dữ liệu; xóa tài khoản) mở thẳng; PIN là tùy chọn, đặt, đổi hoặc gỡ từ chính mục đó. Người chơi chính chỉ xóa cùng tài khoản; xóa người chơi phụ là xóa hẳn mọi dữ liệu của người chơi đó (05/10/2026).

## Quyết định còn mở

Master Plan v3 §15 hiện không còn mục mở. Quyết định mới về sản phẩm, dữ liệu trẻ, chi phí, pháp lý: gom lại hỏi người sở hữu một lần.
