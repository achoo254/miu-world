# Pha 1: Phân loại test đỏ thường trực

**Tier:** S · **Phụ thuộc:** — · **Trạng thái:** completed

## Bối cảnh

Mỗi lượt CI mang khoảng 22–26 E2E đỏ và 4–6 unit test đỏ (danh sách ở `plan.md`, mục "Hiện trạng đo được"). Trước khi xóa hay chuyển test nào (pha 4), cần biết từng cái đỏ vì đâu, để không xóa mất dấu một lỗi thật. Nhiều lỗi trông như test cũ (selector `hud-tracker-textbook`, `hud-tracker-count`, `online-party-fold`, `play-pet-care` không còn), nhưng có cái có thể là lỗi thật: chuyến xe còn cách điểm đến 53–735 khối (`maps.spec.ts:147`), HUD iPad chồng lấn (`hud-layout.spec.ts:90`, `:107`, đúng kiểu "nhãn tương tác bị thẻ nhiệm vụ đè"), bài đọc dài không cuộn được bằng vuốt (`sgk-mechanics.spec.ts:129`), 154 draw call ở nhà có đèn bật (`interactions.spec.ts:174`).

## Việc

1. Tải trace của lượt mới nhất trên `main` vào scratchpad, không vào repo: `gh run download <id> -n playwright-traces-<n> -D <scratchpad>/traces-<n>` cho 4 shard. Mở bằng `pnpm --filter @miu/web exec playwright show-trace <zip>` hoặc đọc `error-context.md`, ảnh `test-failed-*.png` trong từng thư mục.
2. Với mỗi E2E đỏ ở cả hai lượt và mỗi E2E chỉ đỏ một lượt, ghi một dòng: test (file:line, tiêu đề), lỗi, loại (`lỗi thật` / `test cũ` / `chập chờn`), bằng chứng (dòng code hay ảnh trace cho thấy điều đó, ví dụ selector đã đổi tên ở commit nào: `git log -S '<data-id>' -- apps/web/src`), hướng xử lý (`giữ và sửa` nếu thuộc luồng smoke ở pha 4, `chuyển sang Node` kèm file đích, `xóa` kèm lý do).
3. Với 8 test "did not run" (phần còn lại của `bosses`, `speak`, `voice`): ghi "chưa chạy trên CI từ khi có", hướng xử lý theo bảng ở pha 4.
4. Với unit test đỏ của job `check`: xác nhận nguyên nhân là thời gian (đối chiếu log ba lượt `37627177732`, `37628698618`, `37630093033`), chuyển cho pha 2.
5. Lỗi thật ngoài luồng smoke: thêm một dòng vào báo cáo để pha 7 đưa vào `docs/project-roadmap.md` và trang review. Không sửa sản phẩm ở pha này.
6. Không chạy E2E trên máy dev để phân loại. Chỉ khi trace không đủ để kết luận một test thuộc luồng smoke, chạy đúng project đó một lần: `pnpm --filter @miu/web e2e --project setup --project <tên>` (1 worker, kiểm tải máy trước theo `~/.claude/rules/process-management.md`).

## File

Mới: `plans/dattqh/reports/test-triage-<yymmdd-hhmm>.md` (bảng phân loại). Không sửa code.

## Kiểm tra

- Mọi dòng `✘` của hai lượt `37628698618`, `37627177732` và mọi unit test đỏ đều có một dòng trong bảng (đếm khớp: 21 E2E hỏng cả hai lượt + 4 chỉ một lượt + 8 không chạy + 4 unit).
- Mỗi dòng `lỗi thật` có bằng chứng từ trace hay code, không chỉ suy đoán.

## Rủi ro, hoàn tác

Phân loại sai một lỗi thật thành `test cũ` thì pha 4 xóa nó: giảm bằng cách bắt buộc bằng chứng cho từng dòng và để lỗi thật ngoài smoke hiện trên trang review. Pha này chỉ thêm một report, không cần hoàn tác.

## Todo

- [x] Tải log và trace các lượt CI đỏ
- [x] Phân loại từng E2E đỏ (lỗi thật, test cũ, môi trường CI, chập chờn) kèm bằng chứng
- [x] Ghi 8 test did not run và 4 unit test đỏ
- [x] Chạy lại đúng test khi trace chưa đủ (sgk-mechanics:129, home:112)
- [x] Report `plans/dattqh/reports/test-triage-261007-2221.md`
