# Pha 1: Khung Môn → Chủ đề → Mục tiêu, schema quest mới, kiểm chống chép

**Tier:** L · **Phụ thuộc:** — · **Trạng thái:** done (25/10/2026)

## Bối cảnh

Hiện nội dung học xoay quanh kiểm kê sách: `packages/schema/src/curriculum.ts` (`BOOK_IDS = ['toan2-t1', 'tv2-t1']`, sách → chủ đề/chủ điểm → bài → mục, có trang in), quest SGK khai `lesson` (id bài) và bước khai `curriculumRef` (id mục). `tools/content/curriculum-links.ts` bắt chữ trong quest phải chứa nguyên văn câu lệnh, bài đọc và đáp án của mục (D8), và `content-gaps.ts` đo độ phủ theo 1.768 mục. Tiến độ người chơi khóa theo `(childId, questId, stepId)` (`apps/server/src/db/schema.ts:171-176`).

Kỹ năng đã có sẵn theo môn ở `content/learning/skills.json` (Toán, Tiếng Việt, English → skill). Khung mới dựng trên đó, không thay.

## Việc

1. **Schema khung học** `packages/schema/src/learning.ts` (+ test):
   - `Topic`: `id`, `subject` (id môn trong `skills.json`), `title`, `summary`, `order` (thứ tự trong môn), `gdpt` (`grade`, `strand`, `requirements[]` trích yêu cầu cần đạt của Chương trình GDPT 2018; **chỉ dùng nội bộ**), `objectives[]`.
   - `Objective`: `id`, `text` (lời của mình, câu ngắn người chơi hiểu được), `skills[]` (id trong `skills.json`), `practice[]` (dạng bài cần luyện, dùng lại enum `ExerciseType` và `MECHANIC_RULES` hiện có).
   - Không có trường sách, bài, trang, tuần học.
2. **Nội dung khung** `content/learning/topics/<mon>/<chu-de>.json`: chủ đề bao trọn kỹ năng 70 quest hiện dạy, đặt tên và gom nhóm theo mạch nội dung của chương trình (Toán: số và phép tính, hình học và đo lường; Tiếng Việt: đọc, viết, nói và nghe, kiến thức tiếng Việt), **không** theo chủ đề hay chủ điểm của sách. Bảng ánh xạ 70 quest → chủ đề ghi ở `topic-map.md` trong thư mục plan (tài liệu làm việc, không phải nguồn sự thật của code).
3. **Schema quest** (`packages/schema/src/content.ts`): thêm `topic` (bắt buộc với quest học) và `objective` trên bước học; `texts.*` đổi `author`/`section` thành `source` (`{ kind: 'folk' | 'public-domain' | 'original', title?, author?, died? }`). `lesson` và `curriculumRef` còn được nhận **chỉ** cho quest có tên trong danh sách chưa viết lại (việc 6); quest đã viết lại mà còn hai trường này là lỗi.
4. **Chuyển đổi máy một lần** (`tools/learning/migrate-quest-topics.ts`, xóa ở pha 7): thêm `topic` cho 70 quest theo bảng ánh xạ; không đụng chữ, id quest, id bước.
5. **Vân tay SGK** (`tools/learning/textbook-fingerprints.ts`): đọc `content/curriculum/**` và `texts` của 70 quest hiện tại, chuẩn hóa (NFC, chữ thường, bỏ dấu câu, gộp khoảng trắng), cắt shingle 7 từ, băm HMAC-SHA256 có khóa bí mật lấy 5 byte đầu (xem Kết quả: băm không khóa dựng lại được chữ), ghi tệp nhị phân đã sắp xếp `content/learning/textbook-fingerprints.bin` (dự kiến khoảng 1 MB). Chạy **một lần trước khi xóa kiểm kê**; ghi số shingle và sha256 của tệp vào phase file khi chạy.
6. **Kiểm chống chép** (`tools/content/no-textbook-copy.ts`, nối vào `check-content.ts`):
   - Quét mọi chữ người chơi thấy trong quest (câu lệnh, lựa chọn, đáp án dạng chữ, bài đọc, lời thoại, phản hồi), chữ ngắn hơn 7 từ bỏ qua.
   - Lỗi khi một đoạn chữ trùng từ 2 shingle trở lên; bài đọc `source.kind` là `folk` hoặc `public-domain` được miễn nhưng phải khai đủ nguồn.
   - `public-domain` bắt buộc `author` và `died`, với `died ≤ năm hiện tại − 51` (bảo hộ 50 năm sau năm mất, hết vào 31/12).
   - Danh sách `tools/content/textbook-copy-pending.json` (70 id quest lúc đầu) chỉ được co lại: quest trong danh sách mà không còn trùng thì lỗi "xóa khỏi danh sách"; quest ngoài danh sách mà trùng thì lỗi. Danh sách cụm chữ chung được phép (`allowed-common-phrases`) phải có lý do từng dòng.
7. **Độ phủ theo mục tiêu**: `content-gaps.ts` thêm chế độ theo chủ đề: mục tiêu được phủ khi các bước khai `objective` đó đủ cơ chế theo `MECHANIC_RULES` của từng dạng trong `practice`. Chủ đề còn quest trong danh sách chưa viết lại thì chưa tính vào cổng; cổng theo mục tiêu thành lỗi cứng cho chủ đề đã viết xong. Kiểm nguyên văn D8 trong `curriculum-links.ts` tắt hẳn (mâu thuẫn với luật mới); phần kiểm độ phủ theo kiểm kê giữ tới pha 7 cho quest chưa viết lại.
8. **Test mở rộng**: fixture một chủ đề `gdpt.grade: 3` với hai mục tiêu và một quest, nạp qua schema, catalog server và `content:check` mà không sửa code.

## File

Mới: `packages/schema/src/learning.ts` (+ test), `content/learning/topics/**`, `content/learning/textbook-fingerprints.bin`, `tools/learning/migrate-quest-topics.ts`, `tools/learning/textbook-fingerprints.ts` (+ test), `tools/content/no-textbook-copy.ts` (+ test), `tools/content/textbook-copy-pending.json`, `topic-map.md` (trong plan).
Sửa: `packages/schema/src/content.ts` (+ test), `tools/content/check-content.ts`, `tools/content/curriculum-links.ts` (+ test), `tools/content/content-gaps.ts`, `tools/content/content-variety.ts` (nếu đọc `lesson`), 70 file `content/quests/{toan2,tv2}-*.json` (chỉ thêm `topic`), `apps/server/src/content/content-catalog.ts` (nạp chủ đề), fixture server `apps/server/test/fixtures/**`.

## Kiểm tra

- `pnpm vitest run` các file test mới và sửa; `pnpm content:check` xanh với 70 quest trong danh sách chưa viết lại.
- Test kiểm chống chép: một đoạn chép từ bài đọc cũ bị bắt; đoạn diễn đạt lại không bị bắt; tác giả mất 1980 bị từ chối, mất 1960 được nhận.
- Test fixture lớp 3 xanh; `pnpm typecheck`, `pnpm lint` xanh; CI xanh sau push.

## Rủi ro

- Ngưỡng shingle sai thì báo nhầm hoặc lọt: chỉnh ngưỡng bằng test trên mẫu thật trước khi bật lỗi.
- Gom chủ đề sai mạch làm khó thêm lớp sau: chủ đề đặt theo mạch của chương trình, không theo cấu trúc sách.

## Rollback

Revert commit của pha; dữ liệu người chơi không đổi vì id quest và id bước giữ nguyên.

## Kết quả (25/10/2026)

- Khung: 9 chủ đề Toán, 12 chủ đề Tiếng Việt, 64 mục tiêu (`content/learning/topics/**`); ánh xạ ở [`topic-map.md`](./topic-map.md). 70 quest đã có `topic` (chỉ thêm khóa, không đổi chữ hay id).
- Schema: `packages/schema/src/learning.ts` (Topic, Objective, `topicIssues`; `EXERCISE_TYPES` và `evaluateExpression` chuyển từ `curriculum.ts`, file cũ dùng lại). Quest: `topic`; bước học: `objective`, `expression` (chỉ ở bản soạn, client không nhận; test route đã thêm hai khóa vào danh sách cấm lộ); bài đọc: `source` (`folk`, `public-domain` có `author` và `died`, `original`). Quest có `topic` chịu luật quest học dù id là gì.
- Server nạp chủ đề lúc khởi động (`apps/server/src/content/learning-topics.ts`, `ContentCatalog.learning`).
- Vân tay: băm **HMAC-SHA256 có khóa bí mật** (5 byte đầu), sau khi bỏ hết dấu thanh (`hoà`/`hòa`, chép không dấu đều bị bắt). **26.588 shingle** (đọc 40.506), `content/learning/textbook-fingerprints.bin` 132.940 byte, sha256 `1523d40a0efdf6caed3972c7a5743cc17d6503ba21a04917f4daa0ef6aedfd27` (test khóa sha này). Khóa nằm ngoài git: iCloud `ENV production/miu-world/textbook-fingerprint.key` và GitHub secret `MIU_FINGERPRINT_KEY` (CI truyền vào bước Content gate và Unit tests). Thiếu khóa: CI đỏ, máy khác chỉ cảnh báo. Khóa không đổi được về sau (cần văn bản SGK để sinh lại tệp). Bản băm không khóa đầu tiên dựng lại được nguyên văn (code-reviewer chạy thử, 66/66 từ) nên đã thay trước khi commit; nó chưa từng vào git.
- Kiểm chống chép (`tools/content/no-textbook-copy.ts`): chạy trên 630 quest và 21 chủ đề dưới 1 giây. Ngưỡng 2 shingle trên một dòng; thêm kiểm chữ cả bước ghép lại (bắt câu bị cắt thành nhãn ngắn; bài sắp xếp ghép theo thứ tự đáp án) với điều kiện 2 shingle **liền nhau** (8 từ liên tục), để các cụm thông dụng ở nhiều dòng không cộng dồn. Cụm chung được phép (`allowed-common-phrases.json`, có lý do): đếm 1–10, dãy thứ trong tuần, cách tả kim đồng hồ, "số có hai chữ số với số có hai chữ số"; không áp cho thân bài đọc. Câu gợi ý định nghĩa "tác giả" của quest canh giữ thư viện được viết lại (sửa ở bảng `tools/content/guardians/thu-vien.json` rồi sinh lại), không đưa vào danh sách được phép.
- Bài đọc `folk`/`public-domain` vẫn bị quét; trùng thì phải có mục trong `tools/content/allowed-traditional-passages.json` (quest, bài, lý do). `folk` bắt buộc `title`.
- Danh sách chờ chỉ được là tập con của 70 id gốc (`tools/content/textbook-copy-baseline.ts`). Liên kết sách gồm cả `lessonId` của bước phiếu viết (phiếu đang in chữ SGK từ kiểm kê), nên quest có phiếu viết chỉ ra khỏi danh sách khi pha 6 cho phiếu nguồn mới.
- Chữ của chủ đề (tên, tóm tắt, mục tiêu) cũng qua kiểm; 6 mục tiêu trùng tên bài sách đã viết lại.
- Độ phủ theo mục tiêu: `pnpm content:gaps --topics [--missing]`; cổng cứng cho chủ đề không còn quest chờ viết lại; chỉ đếm quest `active` (`tools/content/learning-links.ts`). Cổng độ phủ theo kiểm kê giờ chỉ tính các bài còn quest chờ viết lại.
- Kiểm nguyên văn D8 đã tắt. `curriculum-links.ts` còn kiểm id, đếm độ phủ kiểm kê và **so đáp án với sách** cho quest còn chờ (giữ tới pha 7, để gõ nhầm đáp án vẫn bị bắt).
- Fixture lớp 3 (`apps/server/test/fixtures/learning-grade3/`): chủ đề Tiếng Việt lớp 3 "Đọc thông báo và tin ngắn", một quest; qua schema, catalog server, kiểm chống chép và độ phủ mà không sửa code (`tools/content/learning-links.test.ts`). Toán lớp 3 sẽ cần mở rộng `evaluateExpression` (nhân, chia) và `CALCULATED_SKILLS`: tiêu chí 3 mới đạt cho những dạng bài đã có cơ chế.
- Sư phạm: thêm mục tiêu đọc to (`doc-truyen-doc-to`, `doc-tho-doc-to`, dạng `doc-thanh-tieng`) và hiểu từ trong bài (`doc-truyen-tu-ngu`); `cong-tru-co-nho-hai-dau` luyện cả tính và so sánh; đổi tên chủ đề "Ki-lô-gam và lít". `gdpt.requirements` là **tóm tắt** yêu cầu cần đạt (Toán gần nguyên văn, Tiếng Việt diễn đạt lại), chỉ dùng căn chỉnh nội bộ.

### Lệch so với việc đã ghi

- Luật "quest trong danh sách chờ mà không còn trùng thì phải gỡ" chỉ áp khi quest **cũng không còn liên kết sách** (`lesson`, `curriculumRef`, `author`, `section`). Lý do: quest Toán chưa viết lại có thể không trùng shingle nào (câu lệnh ngắn) nhưng vẫn là bản chép sách; bắt gỡ khỏi danh sách lúc đó sẽ làm nó chịu luật quest đã viết lại khi chưa viết.
- Thêm `expression` cho bước học (không có trong việc 3): thay vai trò kiểm đáp án theo kiểm kê, để "đáp án số tính bằng code" vẫn được máy kiểm sau khi bỏ `curriculumRef`. Một biểu thức cho câu đố, câu hỏi chọn, kéo thả; ô điền khai theo id ô (`{ "b5": "8 + 5" }`), chỉ ô có phép tính. Câu đố tính toán (`phep-cong`, `phep-tru`, `bai-toan-loi-van`, `thanh-phan-phep-tinh`, `hon-kem`) của quest đã viết lại bắt buộc có `expression`; ô điền và câu hỏi chọn chưa bắt buộc (người viết tự khai, review đọc).
- `evaluateExpression` chỉ có cộng, trừ; nội dung lớp 3 có phép nhân sẽ cần mở rộng hàm này (ghi lại, chưa làm vì ngoài phạm vi).

### Kiểm tra đã chạy

`pnpm content:check` OK (2.171 file); `pnpm typecheck` và `pnpm lint` sạch; `pnpm vitest run --maxWorkers=1 tools/content tools/learning packages/schema apps/server/src/content apps/server/src/quest/quest-routes.test.ts`: 40 file, 369 test xanh. Review: [`code-reviewer-261025-0203-phase-1-learning-framework.md`](../reports/code-reviewer-261025-0203-phase-1-learning-framework.md) (1 Critical, 4 High, 6 Medium đã sửa; L3 giữ nguyên: kiểm chống chép luôn đọc vân tay và danh sách của repo; L6 ghi nhận: tác phẩm đồng tác giả, khuyết danh chưa có trường).
