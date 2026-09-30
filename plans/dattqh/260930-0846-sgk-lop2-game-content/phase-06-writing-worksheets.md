---
phase: 6
title: "Phiếu viết ngoài game"
status: pending
priority: P2
effort: "M"
dependencies: [1]
---

# Phase 6: Phiếu viết ngoài game (D3)

## Goal
Phần Viết của Tiếng Việt và phần thực hành/vận dụng ở nhà của Toán có phiếu in từ khu phụ huynh; game nhắc tới phiếu, không nhận, không chấm, không lưu bài viết.

## Requirements
- Phiếu dựng LÚC GỌI từ kiểm kê (`content/curriculum/**`), không có bản sao thứ hai: `GET /api/worksheets?lesson=<lessonId>` và `GET /api/worksheets/:lessonId` trả `Worksheet` (DTO trong `packages/schema/src/worksheet.ts`): `lessonId`, `bookId`, `title`, `blocks[]` gom từ các section/item có quy tắc `worksheet` (phase 3):
  - `letter`: chữ hoa cần viết + ô kẻ 4 ô li + "Tô theo mẫu chữ hoa trang N SGK / vở Tập viết".
  - `copy-line`: câu viết ứng dụng (nguyên văn).
  - `dictation`: đoạn nghe–viết nguyên văn, ghi "Bố mẹ đọc chậm từng cụm".
  - `paragraph-prompt`: đề viết đoạn + dòng gợi ý "G:" + số dòng kẻ trống.
  - `activity`: hoạt động cùng phụ huynh (cân, đong, xem đồng hồ/lịch, gấp cắt hình, kể lại cho người thân).
  - mỗi block giữ `curriculumRef`.
- Server nạp kiểm kê một lần lúc khởi động (loader mới trong `apps/server/src/worksheet/`, đọc cùng thư mục `content/curriculum`). Route sau cổng PIN phụ huynh (`requireParentGate`, khu phụ huynh hiện có); không cần hồ sơ trẻ; không endpoint ghi.
- Web: `apps/web/src/ui/parent/worksheets/` — danh sách theo sách/tuần/bài, trang in (CSS `@media print`, A4, ẩn nav), nút "In phiếu" (`window.print()`). Dùng token/kit của VS phase 1.
- Bước quest `worksheet` hiện "Nhờ bố mẹ in phiếu bài …" + nút "Đã hiểu".
- `content:coverage` tính phủ qua phiếu từ `curriculumRef` của bước `worksheet` trong quest (cột riêng, phase 3) — phiếu tự nó không phủ gì.

## Files
- Create: `packages/schema/src/worksheet.ts` (+ test), `apps/server/src/worksheet/{worksheet-routes,worksheet-builder}.ts` (+ test), `apps/web/src/ui/parent/worksheets/*.tsx` (+ test render, print CSS)
- Modify (1 dòng mỗi file): `apps/server/src/app.ts` (gắn route), `apps/web/src/ui/app-shell.tsx` (route `/parent/worksheets`, sau VS phase 5)

## Steps
1. Test trước: builder dựng đúng block cho một bài TV và một bài Toán từ fixture kiểm kê; API: chưa qua PIN → 403, qua PIN → 200, bài lạ → 404; web render từng loại block, `@media print` ẩn nav.
2. Hiện thực.
3. In thử 2 phiếu (1 TV, 1 Toán) ra PDF bằng Playwright `page.pdf()` cho trang review.

## Verification
- `pnpm vitest run packages/schema apps/server/src/worksheet`; `pnpm --filter @miu/web test`; web build

## Risk
- Mẫu chữ hoa bằng font thường không giống chữ viết tay trường học: phiếu dẫn trang SGK/vở Tập viết phụ huynh đã có.
