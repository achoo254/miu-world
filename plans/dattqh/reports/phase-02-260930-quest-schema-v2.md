# Phase 2 — Quest schema v2, runtime, nội dung ch1 (2026-09-30)

Plan: `plans/dattqh/260929-2141-vertical-slice-mvp/phase-02-quest-schema-runtime-content.md` (tier L). Trạng thái: xong.

## Kết quả

- `packages/schema/src/content.ts`: `QuestDefinition` v2, phân theo `status` (`active` | `stub`). Bảy loại bước: `dialogue`, `search`, `read`, `riddle`, `challenge` (`drag-drop` | `sort` | `quiz`), `reward`, `unlock`. Bước học có `answer` + `support` (Hướng dẫn, Gợi ý, Đáp án kèm giải thích). Luật cấp quest: id bước duy nhất; đủ 8 pha, trỏ tới bước có thật và đúng thứ tự; đủ 7 câu hỏi thiết kế; ≥ 2 cơ chế khác trắc nghiệm; kiểm đáp án khớp dữ liệu bước (lựa chọn có thật, tổng kéo thả đạt được, thứ tự sắp xếp là hoán vị và khác thứ tự hiển thị). Schema tác giả dùng `strictObject`: key gõ sai làm gate đỏ thay vì bị bỏ im lặng.
- `packages/schema/src/game.ts`: `StepAnswer`, `StepCompleteRequest`, `QuestView`. Parse định nghĩa qua `QuestView` bỏ `answer`, `support`, `sevenQuestions`, `phases`, `review` (test duyệt đệ quy mọi key của quest ch1 thật).
- `packages/quest`: `checkAnswer` (chỉ chạy ở server), `completeStep` nhận `{ answer?, target? }` và theo dõi `found` cho bước `search` (thứ tự tùy ý, tìm lại không đổi gì), `nextStep` (dùng được trên `QuestView`), `questCatalogIssues`/`questTargetIssues` dùng chung cho server và gate.
- `apps/server`: catalog dùng kiểm tra chung; route `complete` nhận đáp án/target; fixture test chuyển sang v2, thêm stub `quest-soon` và test "quest mới chỉ bằng JSON" chạy qua API.
- `pnpm content:check` (`tools/content/check-content.ts`), chạy trong CI sau `assets:check`: nạp nội dung bằng chính loader của server; báo file JSON không có validator; ghi rõ hai kiểm tra chưa chạy (target trên map, id vật phẩm).
- ESLint: web và package thuần không được import `content/quests` hay dùng glob wildcard ngay dưới `content/` (thử bằng file probe: 5/5 mẫu bị chặn, glob `content/accessories/*.json` vẫn qua).
- Nội dung: `content/quests/forest-ch1.json` (11 bước, `review: "teacher-pending"`), `forest-ch2.json` stub.

## Kiểm chứng

- `pnpm assets:check` OK (12 packs, 1068 file); `pnpm content:check` OK (17 file, 2 ghi chú); `pnpm test` 30 file, 214 test pass (trước đợt: 185); `pnpm typecheck` sạch; `pnpm lint` 0 warning; `pnpm --filter @miu/web build` OK, quét `apps/web/dist` không thấy chuỗi đáp án; E2E setup/account/play 8/8.
- Test flaky có từ trước, không do đợt này: `apps/server/src/auth/auth-routes.test.ts` thỉnh thoảng đỏ (rate limit/khóa PIN, 1/5 lần với thay đổi, 1/8 lần trên code gốc khi stash thay đổi). Chưa sửa.
- Cảnh báo không chặn: `MaxListenersExceededWarning` (11 listener trên `[Server]`) trong test server, có từ trước.

## Review độc lập (code-reviewer)

Không có phát hiện critical; route không có đường gian lận mới; không đáp án nào tới client. Đã sửa: mảnh kéo thả giá trị 0 lọt chấm (giờ `value ≥ 1`, `total ≥ 1`); stub mở khóa quest khác làm quest đó khóa vĩnh viễn (stub không được `unlock`); key gõ sai bị bỏ im lặng (`strictObject`); comment/tài liệu nói client chấm đáp án (đã sửa: chỉ server chấm); glob né ESLint; file quest sai đuôi lọt gate. Để lại cho phase sau: đoán đáp án số bằng script (phase 3 có rate limit); `found` lưu DB (phase 3).

## Ghi chú cho giáo viên duyệt nội dung ch1

- Câu đố 8 + 5 là cộng có nhớ trong phạm vi 20 (lớp 2 theo chương trình 2018); cần chốt lớp mục tiêu.
- Thử thách 10 quả táo là đếm, đang gắn skill `phep-cong` vì `skills.json` chưa có kỹ năng đếm.
- Toán đã kiểm: 8 − 3 = 5; 9 < 15 < 27 < 34; 8 + 5 = 13; đáp án đọc hiểu "Bạn Hải ly" khớp lá thư.

## Câu hỏi còn mở

- Ở production, server có nên từ chối khởi động khi còn nội dung `teacher-pending` không? Hiện `review` chỉ là nhãn; rule repo nói giáo viên duyệt trước khi tới trẻ. Đề xuất: chặn ở production, làm trong phase 10 (gate review).
