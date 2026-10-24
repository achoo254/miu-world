# Pha 5: Viết lại 34 quest Tiếng Việt

**Tier:** XL · **Phụ thuộc:** 3 (người sở hữu đã duyệt mẫu) · **Trạng thái:** pending

## Bối cảnh

34 file `content/quests/tv2-*.json` (trừ mẫu) chép bài đọc, bài thơ của tác giả còn bảo hộ, bảng từ ngữ, câu hỏi đọc hiểu, bài luyện từ và câu, nói và nghe. Mỗi quest khoảng 30 KB; mỗi quest có một hoặc nhiều mục `texts` (bài đọc) mà nhiều bước bám vào. Đây là phần nặng nhất vì bài đọc mới quyết định toàn bộ câu hỏi đi kèm.

## Việc

1. **Danh mục bài đọc trước, câu hỏi sau**: lập bảng bài đọc mới cho cả 34 quest (chủ đề, độ dài mục tiêu, nguồn dự kiến: ca dao, đồng dao, câu đố, truyện cổ tích kể lại, tác giả hết bảo hộ, hoặc tự viết), lưu ở `reading-list.md` trong thư mục plan. Kiểm năm mất của từng tác giả `public-domain` và ghi nguồn tra cứu. Hỏi Jev duyệt bảng này trước khi viết câu hỏi.
2. Chia 4–5 đợt theo chủ đề; mỗi người viết sở hữu trọn file quest của đợt.
3. Mỗi quest: viết bài đọc theo bảng (khai `source`), bảng từ ngữ, rồi câu hỏi đọc hiểu, luyện từ và câu, nói và nghe theo luật viết ở pha 3 và mục tiêu của chủ đề; câu chuyện bao quanh bỏ chữ lớp Hai; gỡ `lesson`, `curriculumRef`, thay bằng `objective`; gỡ id khỏi `textbook-copy-pending.json`.
4. Phần thu âm trên máy (D2) và bước `speak`: đổi câu mẫu theo bài đọc mới; không đổi cơ chế.
5. Hết mỗi đợt: `content:check` xanh, Jev duyệt trên trang nghiệm thu, lưu quyết định; đợt xong vào hàng release (T5), hỏi người sở hữu trước khi deploy.

## File

Sửa: `content/quests/tv2-*.json` (34 file trừ mẫu), `tools/content/textbook-copy-pending.json`, `apps/server/src/quest/tv2-quests.test.ts`.
Mới: `reading-list.md` (trong plan).

## Kiểm tra

- `pnpm content:check` (chống chép, nguồn bài đọc và năm mất, phủ mục tiêu, D9, D11), `pnpm vitest run apps/server/src/quest/tv2-quests.test.ts`, `typecheck`, `lint`; CI xanh.
- Độ dài bài đọc trong ±20% bài cũ; câu hỏi đọc hiểu trả lời được từ chính bài đọc mới (kiểm bằng người viết thứ hai đọc chéo trong đợt).

## Rủi ro

- Bài dân gian trùng bản đã biên tập trong SGK: vân tay vẫn quét; trùng mà không kể lại được thì đổi bài.
- Văn tự viết đều giọng giữa 34 quest: kiểm không lặp câu của D9 áp cả cho bài đọc; Jev đọc mẫu ngẫu nhiên mỗi đợt.
