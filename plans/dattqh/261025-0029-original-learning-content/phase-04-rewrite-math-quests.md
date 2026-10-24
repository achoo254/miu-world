# Pha 4: Viết lại 36 quest Toán

**Tier:** L · **Phụ thuộc:** 3 (người sở hữu đã duyệt mẫu) · **Trạng thái:** pending

## Bối cảnh

36 file `content/quests/toan2-*.json` (trừ quest đã làm mẫu ở pha 3) đang chép câu lệnh, số liệu và đáp án của Toán 2 tập một; khoảng 1.000 mục kiểm kê. Đáp án số đã tính bằng code (`evaluateExpression` ở `packages/schema/src/curriculum.ts`), nên phần lớn việc là thay bộ số và lời bài toán.

## Việc

1. Chia quest theo chủ đề của khung (pha 1) thành 3–4 đợt; mỗi đợt một người viết (subagent) sở hữu trọn các file quest của đợt đó, không hai người cùng sửa một file.
2. Mỗi quest: viết lại theo luật viết ở pha 3; bộ số mới cùng vùng số và độ khó; bài toán có lời văn đổi bối cảnh sang thế giới Miu (NPC, nơi chốn của map); đáp án qua biểu thức để code tính; gỡ `lesson`, `curriculumRef`, thay bằng `objective`; gỡ id khỏi `textbook-copy-pending.json`.
3. Hết mỗi đợt: `content:check` xanh, chủ đề nào xong trọn thì cổng phủ mục tiêu thành lỗi cứng cho chủ đề đó; hỏi Jev (`tools/decisions/jev-decide.py`) duyệt đợt dựa trên trang nghiệm thu, lưu quyết định vào `plans/dattqh/reports/`.
4. Đợt nào xong và CI xanh thì đưa vào hàng release (T5): gom 1–2 đợt một lần, hỏi người sở hữu trước khi deploy.

## File

Sửa: `content/quests/toan2-*.json` (36 file trừ mẫu), `tools/content/textbook-copy-pending.json`, `apps/server/src/quest/toan2-quests.test.ts` (bỏ kiểm nguyên văn, giữ kiểm đáp án và cơ chế).

## Kiểm tra

- `pnpm content:check` (chống chép, phủ mục tiêu, D9, D11, mục tiêu trên map), `pnpm vitest run apps/server/src/quest/toan2-quests.test.ts`, `typecheck`, `lint`; CI xanh.
- Số câu luyện mỗi mục tiêu không ít hơn bản cũ (`pnpm content:gaps` theo mục tiêu).

## Rủi ro

- Đổi số làm lệch dạng bài (ví dụ cộng không nhớ thành có nhớ): kiểm vùng số và có nhớ hay không bằng test theo mục tiêu.
- Bạn máy tự học (`pnpm bots:learning`) dựa vào nội dung bước: chạy lại số liệu cho trang review sau đợt cuối.
