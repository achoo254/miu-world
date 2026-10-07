# Pha 7: Kiểm chứng, hiệu chỉnh việc xem ảnh, cập nhật roadmap và trang review

**Tier:** S · **Phụ thuộc:** pha 3, 4, 5, 6 · **Trạng thái:** pending

## Việc

1. **CI xanh 3 lượt liền** trên `main` (mọi job: `check`, `maps`, `integration`, `e2e`, `sast`). Ghi id ba lượt, thời gian từng job, thời gian reporter in cho mỗi shard `e2e`, số test chạy (11, không có "did not run"). Lượt nào đỏ: tìm nguyên nhân, sửa, đếm lại từ đầu; không bật `retries`.
2. **Thử đột biến audit** trên máy (không commit): đổi `apps/web/src/game/entities/interactables.ts:139` để bỏ ưu tiên, chạy `pnpm content:check`, chép các dòng phát hiện `ev-olympic-bang`/`ev-olympic-vom`, trả code như cũ (`git diff --quiet` để chắc). Ghi thời gian `content:check` và `pnpm world:quest-targets forest-ch1`.
3. **Hiệu chỉnh việc agent xem ảnh** một lần: tạm thêm vào `screens.spec.ts` (không commit) `page.addStyleTag` cài ba lỗi: ẩn `[data-id="event-panel-close"]`, đẩy đảo Home xuống (ví dụ `transform: translateY(35vh)` trên khung đảo), đặt nhãn Tương tác chồng lên thẻ nhiệm vụ. Chụp ba màn `04-home`, `08-play-prompt`, `12-event-panel` ở hai khổ, giao cho một subagent theo `docs/screen-review.md` mà không nói có lỗi cài sẵn. Đạt khi subagent báo ít nhất hai trong ba lỗi ở mức `block`. Không đạt thì sửa checklist hoặc dữ kiện DOM rồi thử lại; ghi cả hai lần vào report. Trả `screens.spec.ts` như cũ.
4. **Cổng deploy:** chép kết quả bốn trường hợp `deploy.sh gate` (pha 6).
5. **Report** `plans/dattqh/reports/test-strategy-<yymmdd-hhmm>.md`: số liệu trước và sau (số spec, số test, thời gian shard, thời gian job, số lượt đỏ), bảng phân loại pha 1 và 4 (đường dẫn), kết quả đột biến, hiệu chỉnh, cổng deploy, lỗi thật tìm được ngoài smoke.
6. **Roadmap và trang review:** thêm vào `docs/project-roadmap.md` (đọc lại trước, file đang có thay đổi chưa commit của phiên khác) một mục chiến lược kiểm thử đã xong và các lỗi thật ngoài smoke thành việc backlog (Validation Log câu 6: chỉ sửa trong plan này khi lỗi nằm trên luồng smoke). Trang review: mục "Màn hình trước deploy" (pha 5) kèm một đoạn ngắn về cách kiểm mới và số liệu trên.
7. Cập nhật trạng thái plan qua CLI `ak plan` (chạy `ak plan --help` trước), không sửa tay ô trạng thái.

## File

Mới: report trong `plans/dattqh/reports/`. Sửa: `docs/project-roadmap.md`, `apps/web/review.html` hoặc `apps/web/src/review/review-main.ts` (đoạn số liệu), `plan.md` (qua CLI).

## Kiểm tra

Đủ chín tiêu chí xong trong `plan.md`, mỗi cái có số liệu hoặc dòng log trong report.

## Rủi ro, hoàn tác

CI có thể đỏ vì nguyên nhân ngoài plan (một phiên khác push lỗi): ghi lại, báo phiên đó, không tính lượt đó vào ba lượt xanh. Pha này không đổi hành vi nên không cần hoàn tác.
