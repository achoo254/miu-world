# Chuẩn kỹ thuật

Lệnh cụ thể và danh sách cấm cho agent: `CLAUDE.md`. File này giải thích các lựa chọn và chính sách phía sau.

## Ngôn ngữ và công cụ

- TypeScript strict cho mọi thứ (cấu hình chung: `tsconfig.base.json`); ESLint với `--max-warnings=0` (`eslint.config.js`). Luật lint là nguồn chuẩn — không nhắc lại ở đây.
- pnpm workspace (`pnpm-workspace.yaml`): `apps/*` là ứng dụng chạy được, `packages/*` là thư viện dùng chung. Package nội bộ đặt tên `@miu/<tên>`.
- Script tooling (asset, world) viết TypeScript chạy bằng `tsx`; khai báo trong `package.json` gốc theo tiền tố nhóm (`assets:*`, `world:*`).
- Tên file kebab-case, mô tả rõ chức năng.

## Kiểm thử

- Mỗi task có acceptance test viết trước khi code.
- Vitest cho logic thuần (`tools/`, `packages/`, `apps/*/src`): phạm vi quét ở `vitest.config.ts`. Logic cần kiểm được ngoài trình duyệt thì đặt trong `packages/`.
- Playwright cho runtime trong trình duyệt (`apps/poc-voxel/e2e/`): project `poc` là kiểm hành vi; project `perf` là đo hiệu năng dài, không chạy thường xuyên.
- Generator phải xác định (cùng input → cùng byte output); kiểm bằng chạy lại và so hash.
- Không làm yếu test để qua gate. Test không chạy được vì giới hạn môi trường thì skip có điều kiện ngay trong test (bắt đúng mã lỗi, như test symlink trên Windows), không xóa, và CI phải còn chạy nó.
- Thay đổi về đăng nhập, phân quyền, thưởng, dữ liệu trẻ em: kèm test bảo mật tự động (IDOR, chống gian lận, CSP) — áp dụng khi có backend.

## Định nghĩa "xong"

1. Bốn gate CI xanh (`assets:check`, `test`, `typecheck`, `lint`); runtime đổi thì E2E `poc` xanh.
2. Agent review độc lập (`code-reviewer`) và đã xử lý phát hiện; phát hiện không sửa phải ghi lý do trong report.
3. Plan/report trong `plans/dattqh/` cập nhật; tài liệu `docs/` cập nhật nếu đổi hành vi người dùng thấy, kiến trúc, lệnh, hay quyết định.
4. Cuối đợt giao hàng: trang review cho người duyệt cuối.

## Ra quyết định

- Quyết định thường ngày: AI tự quyết. Có thể dùng TypeSafe Jev qua `tools/decisions/jev-decide.py`; ngưỡng tự quyết theo mức rủi ro nằm trong hằng `AUTO_THRESHOLD` của script (rủi ro cao luôn chuyển người).
- Quyết định quan trọng (chi phí, an toàn trẻ em, phạm vi sản phẩm, pháp lý, việc tốn công người): gom lại hỏi một lần, kèm phương án và đề xuất.
- Ghi quyết định đã chốt vào Validation Log của plan; quyết định kiến trúc bền vững chuyển vào sổ quyết định ở `system-architecture.md`.

## Dependency và chuỗi cung ứng

- Khóa phiên bản qua `pnpm-lock.yaml`; CI cài bằng `--frozen-lockfile`.
- Dependency mới: AI tự review, liệt kê trong trang review của đợt. `npm audit`/SAST trong CI là việc của Master Plan task #3 (chưa có).
- Không thêm script hay analytics bên thứ ba vào client.

## Commit

Conventional commits tiếng Anh, scope theo vùng (`assets`, `poc`, `plans`…). Không nhắc AI; không ghi mã plan, phase hay mã finding trong commit, tên test, comment code.
