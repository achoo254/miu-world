# CLAUDE.md — Miu World

Quy tắc hành vi cho agent trong repo này. Lý do và bối cảnh nằm ở `docs/` (bản đồ: `docs/README.md`); nguồn quyết định sản phẩm là Master Plan v3 ở gốc repo.

## Lệnh

- Chỉ dùng `pnpm` (workspace, `packageManager` khóa trong `package.json`), Node ≥ 22. Không dùng `npm`/`yarn`.
- Gate trước khi báo xong — chạy đủ 4 lệnh, đúng thứ tự CI (`.github/workflows/assets.yml`):
  `pnpm assets:check` → `pnpm test` → `pnpm typecheck` → `pnpm lint`
- Một file test: `pnpm vitest run <đường-dẫn-file>`.
- Sửa runtime POC (`apps/poc-voxel/**`) thì chạy thêm E2E: `pnpm --filter @miu/poc-voxel e2e --project poc` (tự build rồi chạy preview ở cổng 4173).
- KHÔNG chạy project `perf` trừ khi được yêu cầu đo hiệu năng: mất tới ~30 phút và ghi đè `assets/generated/review/perf.json`.

## Không được làm

- Không sửa tay `assets/manifest.json` hay `assets/LICENSES.md` — sinh lại bằng `pnpm assets:manifest`. Gate so manifest với bản build mới và sẽ đỏ.
- Không thả file vào `assets/` ngoài quy trình pack/generator (xem `.claude/rules/assets-pipeline.md`). Mọi file phải có trong manifest, license trong allowlist.
- Không đặt thư mục tên `vendor` hay `build` dưới `assets/` — hook của môi trường AI chặn các từ đó; dùng `assets/packs/` và `assets/generated/`.
- Không dùng tên, texture, asset của Minecraft. Không nhận license CC-BY, CC-BY-SA, NC. Không tự vẽ, không dùng AI tạo ảnh trả phí.
- Không hotlink: runtime chỉ tải từ origin, và chỉ file có trong manifest.
- Không cho quest/nội dung phụ thuộc Three.js; `packages/voxel` giữ thuần TypeScript (không import `three`).
- Không tính thưởng, XP, mở khóa ở client — server là nguồn sự thật (áp dụng ngay khi có backend).
- Không đưa secret hay dữ liệu thật của trẻ vào prompt, code, fixture hoặc commit.

## Hỏi người trước khi làm

Gom lại, hỏi một lần: thay đổi cách thu thập/chia sẻ dữ liệu trẻ em; chi phí; pháp lý; phạm vi sản phẩm; việc tốn công con người; quyết định còn mở ở Master Plan v3 §15. Quyết định thường ngày thì tự quyết (có thể dùng `tools/decisions/jev-decide.py` theo ngưỡng rủi ro, xem `docs/code-standards.md`).

## Dễ vấp

- Trên Windows chưa bật Developer Mode, test symlink trong `tools/assets/check-assets.test.ts` tự skip (không tạo được symlink); CI (Ubuntu) vẫn chạy. Skip này không có nghĩa là gate symlink đã được kiểm trên máy local.
- `render-preview.ts` và perf test tự sinh lại manifest khi chạy xong; nếu tự sửa file trong `assets/generated/` bằng cách khác thì phải chạy `pnpm assets:manifest`.
- Cổng cố định: dev 5173, preview/E2E 4173 (`--strictPort`). Báo cổng bận thì tìm và tắt server cũ, không đổi cổng.
- `jev-decide.py` cần `TYPESAFE_API_KEY` hoặc `TYPESAFE_TOKEN_FILE`; thiếu thì dừng, đừng tự tìm key.

## Quy trình

- Plan và report: `plans/dattqh/` (plan theo `{yymmdd-hhmm}-{slug}/`, report trong `plans/dattqh/reports/`).
- Mỗi đợt giao hàng kết thúc bằng một trang review cho người duyệt cuối (ảnh, bản chơi thử, số liệu hiệu năng, báo cáo bảo mật, dependency mới, bảng license) — mẫu hiện có: `apps/poc-voxel/review.html`.
- Commit: conventional commits tiếng Anh (`feat(assets):`, `feat(poc):`, `docs(plans):`, `build:`); không nhắc AI; không ghi mã plan/phase trong code, tên test, commit.
- Thêm dependency mới: ghi vào trang review của đợt đó để người duyệt thấy.
- Tiến độ backlog và việc đã xong: `docs/project-roadmap.md` — cập nhật khi một task Master Plan đổi trạng thái.
