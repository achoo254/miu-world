# Pha 7: Thử nội bộ, hồ sơ store, phát hành công khai, tài liệu

**Tier:** M · **Phụ thuộc:** pha 2, 4, 5, 6 · **Trạng thái:** pending

## Việc

1. **Bản thử nội bộ:** tải bản ký lên TestFlight (nhóm thử nội bộ) và Google Play (internal testing); người sở hữu thêm người thử. Server production phải có pha 1, 2 (hỏi trước khi deploy).
2. **Hồ sơ store (vi, en)** trong `plans/dattqh/261007-2038-mobile-app-ios-android/store/`: tên, mô tả ngắn/dài, từ khóa, danh mục (Game → Giáo dục/Phiêu lưu, **không** chọn Kids Category vì game cho mọi lứa tuổi và có chat với người lạ), ảnh chụp kích thước Apple (6.9", 6.5", iPad 13") và Google (điện thoại, máy tính bảng) lấy từ game bằng công cụ ảnh review sẵn có, URL chính sách quyền riêng tư (trang `privacy-screen` hiện có, cần URL công khai), URL hỗ trợ.
3. **Nhãn quyền riêng tư:** bản nháp App Privacy (Apple) và Data safety (Google) dựng từ những gì server thực sự lưu (`apps/server/src/db/schema.ts`): định danh tài khoản Google/Apple, tiến độ, giọng nói ghi âm nếu có lưu, không quảng cáo, không theo dõi. Đường xóa tài khoản trong app và trên web.
4. **Xếp hạng tuổi:** bản nháp bảng hỏi IARC (Google) và Apple, nêu rõ có chat thoại và kết bạn với người chơi khác.
5. **Trang review:** mục Mobile trong `apps/web/review.html`: ảnh các màn điện thoại, MB của gói và từng map, dependency mới, kết quả đo máy thật, link TestFlight/Play (không công khai link mời).
6. **Tài liệu:** `docs/system-architecture.md` (app bản địa, Bearer, vé WebSocket, asset theo map), `docs/deployment-guide.md` (quy trình phát hành mobile), `docs/codebase-summary.md` (`apps/mobile`, `apps/web/src/platform`), `docs/project-roadmap.md` (mục Mobile app), `CLAUDE.md` (lệnh), Master Plan §15 (quyết định Capacitor).
7. **Thử kín trên Google Play:** tài khoản Play cá nhân phải chạy closed testing với số người thử và số ngày Google quy định (hiện là 12 người trong 14 ngày) trước khi được xin phát hành công khai; bắt đầu ngay khi bản Android đầu tiên ổn để không chậm lịch.
8. **Phát hành công khai** (sau các điều kiện bên dưới): gửi duyệt App Store kèm ghi chú cho người duyệt (tài khoản thử, cách vào chat thoại, cách báo cáo/chặn người, cách xóa tài khoản); Google Play phát hành dần (ví dụ 10% → 50% → 100%), theo dõi tỉ lệ văng trong Play Console và Xcode Organizer trước mỗi bước tăng. Bị từ chối thì sửa theo lý do và gửi lại; mỗi lần ghi vào report của pha.

## Điều kiện trước khi gửi duyệt công khai

Kiểm duyệt (`261004-1617-moderation-safety`) đã chạy trên production và có lối báo cáo/chặn trong app; pháp lý đã xác nhận (hoặc người sở hữu chọn loại Việt Nam khỏi danh sách nước cho tới khi rõ); kết quả đo máy thật đạt; người sở hữu duyệt hồ sơ store. Mỗi lần deploy production vẫn hỏi trước.

## Kiểm tra

Người sở hữu cài được bản TestFlight và Play internal, đăng nhập, vào map, xong một quest; closed testing Play đủ điều kiện; app có trang công khai trên App Store và Google Play, cài từ store và đăng nhập được; trang review có đủ mục; liên kết tài liệu kiểm bằng lệnh kiểm link sẵn có.
