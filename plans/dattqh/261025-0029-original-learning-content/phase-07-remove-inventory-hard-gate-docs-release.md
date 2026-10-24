# Pha 7: Xóa kiểm kê SGK, cổng cứng, tài liệu, review, release

**Tier:** M · **Phụ thuộc:** 2, 4, 5, 6 · **Trạng thái:** pending

## Việc

1. **Xóa**: `content/curriculum/`, `packages/schema/src/curriculum.ts` (giữ `ExerciseType` và `evaluateExpression` bằng cách chuyển sang `learning.ts`), `tools/content/check-curriculum.ts`, phần kiểm kê của `curriculum-links.ts` và `content-gaps.ts`, `apps/server/src/worksheet/curriculum-books.ts`, `tools/learning/migrate-quest-topics.ts`, `tools/sgk/` còn lại (kể cả `split-pages.py` nếu có), fixture `apps/server/test/fixtures/curriculum/`, `apps/web/e2e/fixtures/quests/e2e-sgk-mechanics.json` và `sgk-mechanics.spec.ts` (đổi tên theo cơ chế, không theo sách). Schema quest bỏ hẳn `lesson`, `curriculumRef`.
2. **Cổng cứng**: `textbook-copy-pending.json` rỗng thì xóa tệp và nhánh miễn trừ; kiểm cụm cấm (pha 2) áp cả cho quest; `content:gaps` chỉ còn theo mục tiêu. Giữ `textbook-fingerprints.bin` để chặn chép lại về sau.
3. **Tệp riêng**: bỏ hai PDF SGK khỏi `tools/private/private-files.json` và nhánh tách trang trong `sync-private.ts`; giữ font HP001. File trong iCloud của người sở hữu không đụng tới.
4. **Tài liệu và luật cho agent**: `README.md` (mô tả, mục giấy phép bỏ dòng về văn bản SGK), `CLAUDE.md` (giai đoạn, lệnh `content:gaps`, tệp riêng), `.claude/rules/product-audience.md` (bỏ "phần học vẫn bám SGK"), `docs/project-overview-pdr.md`, `docs/codebase-summary.md`, `docs/system-architecture.md`, `docs/code-standards.md`, `docs/i18n.md`, `docs/design-cac-map.md`, `docs/deployment-guide.md` (301 của `/bai/`), `docs/marketing-channels.md`, `docs/store/listing.md` (mô tả và App Review Notes bỏ "Grade 2", "Vietnamese Grade 2 Math"), `docs/project-roadmap.md`; Master Plan v3 ghi chú D1/D8/D13 đã thay bằng plan này.
5. **Plan cũ**: plan tập một ghi chú D1, D8, D13 đã thay; plan tập hai đổi `status: superseded` kèm link plan này (T7).
6. **Review**: trang `apps/web/review.html` cho đợt này (số quest viết lại, độ phủ theo mục tiêu, kết quả kiểm chống chép, danh sách nguồn bài đọc, ảnh màn hình, kết quả rà clip đã đăng); chạy `pnpm bots:learning` rồi `pnpm assets:manifest`; ảnh màn chính duyệt theo `docs/screen-review.md`.
7. **Release**: CI xanh, cổng `tools/deploy/release-gate.sh` qua, hỏi người sở hữu rồi deploy production đợt cuối; kiểm 301 và trang chủ đề trên production sau deploy.

## Kiểm tra

- Gate 5 lệnh của repo theo thứ tự CI ở local (trừ full `pnpm test`), rồi CI đầy đủ (test, build web, `security:dist`, E2E) xanh.
- `git grep -nE "lớp 2|lớp Hai|SGK|sách giáo khoa|Kết nối tri thức"` trên HEAD chỉ còn trong `plans/` (bản ghi lịch sử) và chú thích lý do của kiểm cụm cấm.

## Rủi ro

- Xóa sót chỗ còn import kiểm kê: `typecheck` và build web bắt; chạy trước khi push.
- Plan và report cũ còn nhắc SGK: chấp nhận, đó là bản ghi lịch sử, không phải bề mặt sản phẩm.

## Rollback

Revert commit xóa; nội dung quest mới không phụ thuộc kiểm kê nên không cần revert pha 4, 5.
