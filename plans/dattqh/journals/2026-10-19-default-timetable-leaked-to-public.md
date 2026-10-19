---
title: Thời khóa biểu mặc định lộ ra cho người lạ
date: 2026-10-19
summary: "Mở đăng nhập cho mọi người biến thời khóa biểu mặc định của lớp thật thành rò rỉ; đã gỡ ở production, sửa code đã release"
---

# Thời khóa biểu mặc định lộ ra cho người lạ

# Thời khóa biểu mặc định lộ ra cho người lạ

**Date**: 2026-10-19 07:53
**Severity**: High
**Component**: `apps/server/src/timetable` (`GET /api/timetable`), cấu hình production
**Status**: Resolved ở production (gỡ cấu hình; sửa code đã release trong `462d9f01`)

## Chuyện gì xảy ra
Đợt cook plan `plans/dattqh/261004-1617-mvp-gate-launch-readiness/`, quét bảo mật (`plans/dattqh/reports/security-sweep-261019.md`) phát hiện `GET /api/timetable` trả thời khóa biểu mặc định của một lớp có thật (tên trường, tên và số điện thoại giáo viên) cho **mọi** tài khoản chưa tự nhập thời khóa biểu. Từ 12/10/2026 đăng nhập mở cho tất cả mọi người, nên một người lạ bất kỳ đăng nhập Google là đọc được.

## Sự thật khó nghe
Không có bug nào trong code cả, và đó mới là chỗ đau. Tính năng được thiết kế khi chỉ có gia đình chơi: "tài khoản nào chưa có thì dùng lịch của nhà mình" là hợp lý. Ngày mở đăng nhập, không ai rà lại các tính năng đang phục vụ dữ liệu riêng của chủ nhà. Bảy ngày dữ liệu của một giáo viên thật nằm sau một nút đăng nhập ai cũng bấm được. Bực nhất là bài học này lẽ ra phải đi kèm quyết định mở đăng nhập, không phải đợi một đợt quét tình cờ.

## Chi tiết kỹ thuật
- Nguồn rò: biến `TIMETABLE_DEFAULT_FILE` trong env production, áp cho mọi tài khoản không có bản riêng.
- Xử lý ngay (người sở hữu duyệt): gỡ dòng đó khỏi env production, restart `miu-server` một lần; health 200 qua loopback và qua domain, revision vẫn `4a7382ac`.
- Sửa code: bản mặc định chỉ cấp cho tài khoản liệt kê trong `TIMETABLE_DEFAULT_ACCOUNTS`; không đặt thì production không cấp cho ai. Có test.
- Kèm theo: `GET` mail với id không phải uuid trả 500 → nay 404.
- Gate: `assets:check`, `content:check`, `test` (7219 passed, 1 skipped), `typecheck`, `lint`, web build, `security:dist` đều xanh.

## Đã cân nhắc
- Xóa hẳn tính năng mặc định: bỏ, vì gia đình vẫn cần; danh sách cho phép giữ được tiện ích mà mặc định là đóng.
- Chỉ sửa code rồi chờ release: bỏ, vì dữ liệu vẫn lộ đến lúc deploy; gỡ env là chặn được ngay mà không đổi bản build.

## Nguyên nhân gốc
Giả định "người dùng = gia đình" được nướng vào hành vi mặc định, rồi đối tượng đổi (gia đình → công khai) mà không có bước rà lại các tính năng dựa trên giả định đó.

## Bài học
Khi đối tượng người dùng đổi, rà lại **từng** tính năng đang phục vụ dữ liệu riêng của chủ nhà hay mặc định kiểu "ai cũng thấy". Mặc định phải đóng; mở bằng danh sách cho phép.

## Việc tiếp theo
- Release bản sửa thời khóa biểu qua cổng `tools/deploy/release-gate.sh` (hỏi người trước khi deploy).
- Còn mở, cùng gốc "mở cho người lạ": voice trong party lộ IP public cho thành viên party vì người lạ vào được (TURN chỉ bật với `?voiceRelay`); font HP001 phục vụ cho mọi tài khoản; kiểm duyệt vẫn hoãn. Ngoài ra: nấu ăn không cần nguyên liệu.
- Ngân sách map: E2E thủ công `budget` đo 12 map (76 lượt, 17 phút) — Mid trong ngân sách draw call, tam giác vượt 2% ở một điểm; High vượt ở 13 điểm (tối đa 186 call, 196k tam giác). Chờ số đo iPad (DEVICE-01) rồi mới cắt cảnh vật.
- Docs và Master Plan đã đồng bộ (§15 #36–#53; §16 viết lại bằng chứng vì tên E2E cũ đã bỏ); trang review có mục lục, form DEVICE-01, bảng việc của người, bảng ngân sách.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
