# Ba lớp hỗ trợ cho câu hỏi của trùm — report 06/10/2026

Việc tiếp theo của plan `plans/dattqh/261005-2315-zone-guardians/plan.md` (mục "còn mở" trong `reports/zone-guardians-261006.md`). Luật `.claude/rules/quest-content.md` muốn mọi thử thách có ba lớp hỗ trợ: Hướng dẫn, Gợi ý, Đáp án kèm giải thích; xem Đáp án không khóa tiến trình. Tier M. Không migration, không thêm dependency. Chưa push, chưa deploy.

## Đã làm

- **Nội dung, 260 câu.** Mỗi câu của 12 trùm lớn (80 câu: 10 trùm `vuot-ai-*` 7 câu, `kho-bau-dao-ch1` và `nha-cua-be-ch1` 5 câu) và 42 trùm canh khu (180 câu) có Hướng dẫn (1–2 dòng cách làm, không lộ đáp án), Gợi ý (không lộ đáp án), Đáp án là đúng nhãn lựa chọn đúng kèm giải thích (toán có phép tính, chính tả có luật, câu sai hấp dẫn nói vì sao sai). Đủ tiếng Việt và tiếng Anh, giọng chung cho mọi lứa tuổi, mỗi dòng mới (content:check không thấy dòng lặp ở quest khác), từ trích trong câu hỏi giữ nguyên văn. Trùm canh viết trong bảng `tools/content/guardians/<khu>.json` (`guide`, `hint`, `explain` và bản `en`), builder sinh `support` cho từng câu; trùm lớn viết thẳng trong file quest. Nội dung là bản nháp AI, chờ giáo viên duyệt.
- **Schema và content:check.** Câu trùm (`BossTurnWithSecret`) bắt buộc có `support`; luật mới kiểm mỗi câu trùm có bản tiếng Anh của ba lớp, cùng số dòng Hướng dẫn, lớp Đáp án đúng nhãn lựa chọn đúng (cả tiếng Anh khi câu có nhãn tiếng Anh). Thiếu là content:check đỏ, không quay lại được. Client vẫn nhận `QuestView` không có `answer`, `support`.
- **Server.** `POST /api/quests/:id/steps/:step/support` nhận thêm `turn` (id câu) ở bước trùm: thiếu → 400 `turn-required`, câu không có → 404. Xem Đáp án của câu chưa trúng ở trận đang đánh tính như mọi bước khác (đếm `answerViews`); đòn vẫn đánh được, trận thắng như thường, lúc chấm server bớt một sao và trả 90% XP (luật `questScore` sẵn có, server tính). Xem lại Đáp án của câu đã trúng thì không tính. Tổ đội: route hỗ trợ không qua cổng tổ đội, ai cũng xem được câu đang đánh trên màn hình mình, kể cả khi không phải lượt mình.
- **Web.** Màn trùm có thanh như mọi thử thách: Hướng dẫn · Gợi ý · Đáp án bên trái, nút đánh bên phải. Mỗi câu một bộ lớp riêng: Hướng dẫn mở ngay, Gợi ý sau một lần trượt câu đó, Đáp án sau hai lần (đếm riêng từng câu, giữ qua tải lại trang); sang câu mới thì lớp đang mở đóng lại.
- **Chống lộ đáp án.** `security:dist` quét thêm giải thích và đáp án (khi không chỉ là nhãn lựa chọn) của từng câu trùm.

## Kiểm tra (máy dev, một job nặng một lúc, bộ nhớ trống 62–63%)

- `pnpm assets:check` OK (16 pack, 4626 file); `pnpm content:check` OK (2022 file, "12 big bosses and 42 zone guardians on 12 maps").
- `pnpm test --maxWorkers=2`: 529 file qua, 1 bỏ qua (symlink Windows, có từ trước); 6491 test qua, 1 bỏ qua, 0 hỏng.
- `pnpm typecheck` 0 lỗi; `pnpm lint` 0 cảnh báo.
- `pnpm --filter @miu/web build` OK (chỉ cảnh báo chunk lớn có từ trước); `pnpm security:dist` OK.
- E2E 1 worker: `--project setup --project bosses --project coop` 8/8 qua (1,1 phút); `e2e:smoke` 14/14 qua (52 s).
- Test mới: `guardian-fight.test.ts` (đủ ba lớp song ngữ qua API, thiếu `turn` 400, câu lạ 404, xem Đáp án rồi vẫn đánh trúng, thắng 2 sao và 90% XP; xem Đáp án câu đã trúng không mất gì; tổ đội: cả hai người đều lấy được Hướng dẫn của câu đang đánh), `guardian-content.test.ts` (luật ba lớp, client không thấy `support`), `build-guardian-quests.test.ts` (bảng sang quest đủ ba lớp, ≥ 144 câu), `content-variety.test.ts`, `scan-dist.test.ts`, `boss-screen.test.tsx` (mở dần theo lần trượt của từng câu, gửi id câu, câu mới đóng lớp), `learning-step.test.tsx`; E2E `bosses` (một câu: Hướng dẫn, hai lần trượt mở Gợi ý rồi Đáp án, sau đó vẫn đánh trúng) và `coop` (tổ đội hai người đánh trùm canh, mỗi người xem Hướng dẫn trên màn hình mình). Ảnh mới cho trang review: `3b-ho-tro-dap-an` (chụp bằng `REVIEW_SHOTS=1`; các ảnh trùm khác chụp lại với thanh mới), đã chạy `pnpm assets:manifest`.

## Commit (trên `main`, chưa push)

`a304c28c` nội dung + schema + server + công cụ; `b7286e65` web; `54a7a204` E2E; `73d9314f` trang review, tài liệu kiến trúc, ảnh.

## Ghi chú và việc của người

- Thử thách co-op chế độ trùm đội (`with-*`, `team-boss`) vốn đã có đủ ba lớp (Hướng dẫn của bước, Gợi ý và Đáp án của từng câu), không đổi.
- Câu hỏi của trùm lớn chưa có bản tiếng Anh (chỉ lớp hỗ trợ mới có); chế độ tiếng Anh hiện câu hỏi tiếng Việt cùng Gợi ý tiếng Anh. Có thể dịch câu hỏi ở một đợt nội dung sau.
- Giáo viên duyệt 260 bộ hỗ trợ (bản nháp AI). Một chỗ nên xem: câu "bà nội" ở Xóm Mái Ấm giải thích «cô» là em gái của bố (cách gọi miền Bắc).
- Deploy production: theo luật vẫn hỏi người trước; không có migration.
