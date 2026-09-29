# Review Master Plan: phase 8 (Trang review + gate), phần máy làm được

Ngày: 2026-09-29. Người review: master-plan-reviewer.

## Verdict: PASS có điều kiện. Chưa mở cho người duyệt cho tới khi xử lý mục 1.

## Lệnh đã chạy
- `pnpm assets:check` OK (1103 files); `pnpm test` 25 file, 171 pass, 1 skip; `pnpm typecheck`, `pnpm lint`, `pnpm --filter @miu/web build` xanh; `pnpm audit --prod --audit-level=high` sạch; `pnpm install --frozen-lockfile --lockfile-only` "Already up to date" (lockfile khớp workspace sau khi xóa POC).
- Đọc `assets/generated/review/perf.json`: 12 lượt (ipad-gen10 và phone, CPU 4×/6×, low/mid/high, 60 s). Số trong report khớp file: draw call max 98 (iPad) / 90 (phone), tam giác max 26.6k, tải vùng đầu 2 239 377 byte thô / 568 474 byte gzip. Thiết bị iPad Gen 10 nằm trong ma trận. Chú thích trung thực: GPU desktop RTX 5070 Ti, FPS trần ~165 do vsync, không đại diện GPU mobile.
- Mở `review.html` bằng Chromium (Playwright) trên bản build: 11 mục (`review-decision`, `-account`, `-variants`, `-palette`, `-character`, `-accessories`, `-map`, `-perf`, `-security`, `-deps`, `-licenses`), 4 radio biến thể (A/B/C/Chỉnh thêm), ô FPS iPad `#ipad-fps`, không lỗi console, không phản hồi HTTP ≥ 400 kể cả sau khi cuộn hết trang. 27 thẻ `img` hiển thị chưa nạp sau khi cuộn nhưng không có lỗi mạng (khả năng ảnh lazy trong vùng thu gọn); nên xem nhanh lúc duyệt.
- Môi trường LAN đang chạy: preview `0.0.0.0:4173` (PID 4416) và server `127.0.0.1:8787` (PID 19480), do phiên implementer khởi động 20:54. `http://192.168.1.15:4173/review.html` trả 200; POST đăng ký với `Origin` 192.168.1.15 qua được kiểm Origin (400 do body rỗng), Origin lạ trả 403. Địa chỉ `10.0.14.3` không nằm trong `ALLOWED_ORIGINS` (chỉ quan trọng nếu iPad ở mạng đó).
- `.gitignore` bao `.data/`, `apps/web/playwright/.auth/` (chứa cookie phiên giả), `apps/web/test-results/`, `dist/`.

## Đối chiếu yêu cầu
Đạt: trang review có đủ 6 nhóm (ảnh, bản chơi thử, hiệu năng, bảo mật, dependency mới, license) và form chọn biến thể + ô FPS iPad; perf chạy lại một lần; code-reviewer cả đợt (0 Critical/High, 4 Medium đã sửa kèm test); report duyệt `foundation-review-260929.md` có cách duyệt, đã giao, số liệu, giới hạn, quyết định tự đưa ra, nợ, câu hỏi mở; `plan.md` cập nhật trung thực (phase 2–5 ghi "chờ CI", phase 6 "chờ người duyệt chọn").

## Việc phải làm trước khi mở trang cho người duyệt
1. [CAO, tính trung thực của báo cáo bảo mật] Kết quả "Semgrep CE chạy cục bộ: 74 luật, 96 file, 0 phát hiện" (`apps/web/review.html:91`, `foundation-review-260929.md:30`) chưa kiểm chứng được. Trên máy này không có `semgrep` (không trong PATH, không trong module Python 3.14, thư mục `%TEMP%\semgrep-mcp` rỗng) và không có Docker. Trong khi `docs/CLAUDE.md` nói Semgrep chỉ kiểm được trên CI. Yêu cầu: hoặc đính kèm bằng chứng chạy (lệnh, phiên bản, đầu ra) lưu ở `plans/dattqh/reports/`, hoặc sửa hai chỗ trên thành "chưa chạy cục bộ; chạy ở CI, chưa có kết quả". Báo cáo bảo mật đưa cho người duyệt không được nêu kết quả không có nguồn.
2. [THẤP] Sau khi người duyệt xong, dọn môi trường: tắt PID 4416 và 19480 (chỉ khi người dùng xác nhận đã xong duyệt), xóa `.data/pglite` chứa tài khoản giả của lần duyệt.
3. [THẤP] Nếu iPad kết nối qua địa chỉ khác `192.168.1.15`, khởi động lại server với `ALLOWED_ORIGINS` đúng địa chỉ đó (không đổi cổng).

## Còn lại cần người (không phải lỗi)
- Chọn biến thể Miu (A/B/C hoặc chỉnh thêm); đo FPS iPad Gen 10 ở mức Vừa.
- Cho phép commit và push để CI chạy `integration` (Postgres 17), `sast` (Semgrep), `e2e`. Tiêu chí phase 2–5 liên quan CI chỉ đóng sau đó; nếu đỏ thì sửa code, không nới test.
- Sau khi người duyệt trả kết quả: áp biến thể (thành `miu-cat`, xóa hai biến thể còn lại, `pnpm assets:character` → `assets:preview` → `assets:manifest`), ghi quyết định vào Master Plan §15, cập nhật `docs/project-roadmap.md` (task #2, #3, #7, #8, #9, #12), tắt server review.

## Quyết định Jev
Không có; mọi quyết định (chọn biến thể, cho phép push) thuộc người sở hữu.
