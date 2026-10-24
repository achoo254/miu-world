# Pha 6: Phiếu viết từ nội dung mới

**Tier:** M · **Phụ thuộc:** 1 (code); nội dung theo từng đợt của 4, 5 · **Trạng thái:** pending

## Bối cảnh

Phiếu viết (D3) in từ khu phụ huynh: `apps/server/src/worksheet/{worksheet-builder,curriculum-books,worksheet-routes}.ts` dựng phiếu từ mục kiểm kê có cơ chế `worksheet` (khoảng 148 mục: viết chữ hoa, câu ứng dụng, nghe–viết, viết đoạn, đo, vẽ hình), giữ nguyên câu chữ in trong sách; web ở `apps/web/src/ui/parent/worksheets/worksheets-screen.tsx`, schema `packages/schema/src/worksheet.ts`, E2E `apps/web/e2e/worksheets.spec.ts`. Font HP001 nằm ngoài git.

## Việc

1. Nguồn phiếu mới: bước `worksheet` trong quest mang nội dung phiếu tự viết (đề, dòng kẻ, gợi ý), gắn `objective`; builder đọc từ quest và khung chủ đề, không đọc `content/curriculum/`.
2. Danh sách phiếu trên màn khu phụ huynh nhóm theo môn và chủ đề, không theo sách, bài, trang.
3. Chữ mẫu viết chữ hoa giữ (hình chữ cái không có bản quyền); câu ứng dụng, đoạn nghe–viết, đề viết đoạn viết lại theo luật ở pha 3 cùng đợt với quest chứa nó.
4. Kiểm chống chép áp cho chữ trên phiếu như chữ trong quest.

## File

Sửa: `apps/server/src/worksheet/worksheet-builder.ts`, `apps/server/src/worksheet/worksheet-routes.ts` (+ test), `packages/schema/src/worksheet.ts` (+ test), `apps/web/src/ui/parent/worksheets/worksheets-screen.tsx` (+ test), `apps/web/e2e/worksheets.spec.ts`, fixture `apps/server/test/fixtures/**`.
Xóa ở pha 7: `apps/server/src/worksheet/curriculum-books.ts` (+ test).

## Kiểm tra

- Test builder: phiếu sinh từ quest đã viết lại, không đọc kiểm kê; test route và màn hình.
- CI: E2E `worksheets` in 2 PDF mẫu xanh; build web xanh.

## Rủi ro

- Trong lúc chuyển, phiếu của quest chưa viết lại vẫn đọc kiểm kê: builder hỗ trợ cả hai nguồn tới pha 7, nguồn cũ xóa cùng kiểm kê.
