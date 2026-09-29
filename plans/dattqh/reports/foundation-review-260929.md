# Foundation review — Master Plan v3 task #2, #3, #7, #8, #9, #12

Date: 2026-09-29 · Plan: `plans/dattqh/260929-1911-foundation-after-poc-gate/` · Status: **Chờ người duyệt**

## Cách duyệt
1. Trên máy dev chạy server và bản preview, mở cho LAN (thay `<ip-LAN>` bằng IP máy dev):
   ```sh
   ALLOWED_ORIGINS=http://<ip-LAN>:4173,http://localhost:4173 pnpm --filter @miu/server start
   pnpm --filter @miu/web build && pnpm --filter @miu/web preview --host 0.0.0.0
   ```
   Server dùng PGlite ở `.data/pglite` (dữ liệu giả của lần duyệt, xóa được).
2. Mở `http://<ip-LAN>:4173/review.html`: làm theo 3 bước ở đầu trang (tạo tài khoản bằng email giả → đồng ý → tạo hồ sơ → chọn hồ sơ → Chơi thử).
3. Trên **iPad Gen 10**, mở `http://<ip-LAN>:4173/play?quality=mid` (sau khi đăng nhập và chọn hồ sơ trên iPad), đi dạo 2–3 phút, ghi FPS ở góc trái trên.
4. Chọn biến thể Miu, cho ý kiến 4 mục, nhập FPS iPad, bấm **Sao chép kết quả duyệt** và gửi lại.

## Đã giao
| Hạng mục | Kết quả | Bằng chứng |
| --- | --- | --- |
| Master Plan + docs/rules (DOCS-01) | §1, §5, §7, §14, §15 chốt Q3–Q8, stack web (#16–#18); "Còn cần bạn chốt": Không còn. 3 rule mới (server + an toàn trẻ em, web UI, quest/nội dung), rule runtime đổi đường dẫn | Master Plan, `docs/`, `.claude/rules/` |
| Monorepo (FOUNDATION-01) | `apps/web` Vite + React 19 + React Router, `apps/server` Express 5, `packages/{schema,quest,voxel}`; CI `ci.yml`: 4 gate + build web + `pnpm audit` + Semgrep + test Postgres 17 | `.github/workflows/ci.yml` |
| Database (FOUNDATION-03) | Drizzle, 9 bảng, migration SQL `apps/server/drizzle/0000_initial-schema.sql`; PGlite dev/test, Postgres CI; xóa hồ sơ cascade | `apps/server/src/db/` |
| Tài khoản phụ huynh + hồ sơ trẻ (FOUNDATION-02) | Đăng ký/đăng nhập/đăng xuất, đồng ý (bản nháp), PIN phụ huynh, tối đa 3 hồ sơ, tên từ danh sách, xóa cứng; UI đủ luồng | E2E `account-flow.spec.ts`, 7 ảnh `review/ui/` |
| Nhân vật, tiến độ, thưởng (FOUNDATION-04) | `packages/quest` (bước tuyến tính, thưởng ở bước cuối, level); API character/progress/inventory/complete step; ledger append-only + bảng tổng hợp | `quest-routes.test.ts` |
| Miu chibi + palette (VISUAL-01..03) | 3 biến thể (đầu ≈1.0/1.15/1.3×), khối mặt gộp mesh, 1 draw call, 652 tam giác, 31 clip; phụ kiện co theo biến thể; palette pastel ấm | 83 ảnh review, `kitbash-character.test.ts` |
| Runtime vào app web (ENGINE-01) | Lớp `Game` + game-bridge; nhãn Vẹt là React; `/play` cần hồ sơ; build chỉ copy 122 file runtime; `apps/poc-voxel` đã xóa | E2E `play.spec.ts` 6/6 |

## Kiểm tra
- `pnpm assets:check`, `pnpm test` (171 pass, 1 skip symlink trên Windows), `pnpm typecheck`, `pnpm lint`, `pnpm --filter @miu/web build`: xanh.
- E2E `setup + account + play`: 8/8 pass (không request ngoài origin, không lỗi console, 1 canvas, rời `/play` giải phóng hết, bản build chỉ phục vụ asset runtime). CI có job E2E riêng.
- `pnpm audit --prod --audit-level=high`: không có lỗ hổng. Semgrep CE (`p/typescript`, `p/nodejs`) chạy cục bộ: 0 phát hiện trên 96 file.
- Review độc lập: `code-reviewer-260929-auth-review.md` (4 High + 4 Medium đã sửa kèm test), review cả đợt `code-reviewer-260929-foundation-batch-review.md` (0 Critical/High; 4 Medium đã sửa kèm test). Reviewer thường trực theo Master Plan: `master-plan-review-260929-*.md` (phase 1–7 PASS).
- Ảnh bản đồ và nhân vật sinh lại cho cùng hash (review shot dùng bước thời gian cố định).

## Hiệu năng (giả lập) vs ngân sách Master Plan §12
Chromium headless, GPU **NVIDIA RTX 5070 Ti** (desktop), CPU throttle qua CDP, 60 s/lượt theo autopilot. FPS bị trần ~165 do vsync của màn hình máy đo.

| Thiết bị (viewport) | CPU chậm | Chất lượng | FPS TB | FPS thấp nhất 1 s | Draw call max | Tam giác max |
| --- | --- | --- | --- | --- | --- | --- |
| iPad Gen 10 820×1180 @2 | 4× / 6× | low | 164.7 / 164.4 | 161.8 / 156.8 | 54 / 55 | 15.1k |
| iPad Gen 10 820×1180 @2 | 4× / 6× | mid | 164.6 / 164.6 | 158.5 / 158.8 | 70 | 18.1k |
| iPad Gen 10 820×1180 @2 | 4× / 6× | high | 164.8 / 164.8 | 163.8 / 160.8 | 98 | 26.6k |
| Phone 412×915 @2.625 | 4× / 6× | low–high | 164.5–164.8 | 152.8–163.8 | 49–90 | 13.9k–24.8k |

- Ngân sách: ≤150 draw call ✅ (tối đa 98 ở viewport iPad; phone tối đa 90, POC đo 91 trên cùng viewport phone) · ≤150k tam giác ✅ (tối đa 26.6k) · tải vùng đầu ≤8 MB ✅ (**2.14 MB thô / 0.54 MB gzip**, gồm JS React + runtime, manifest, thế giới, model, font).
- Giới hạn: GPU desktop mạnh hơn nhiều iPad; giả lập không đo GPU mobile, nhiệt, pin. Điểm dữ liệu mobile thật đầu tiên là FPS iPad người duyệt ghi ở bước 3. Đo đủ Low/Mid/High + nhiệt + pin 15 phút vẫn là DEVICE-01 trước MVP.

## Quyết định tự đưa ra trong đợt (người sở hữu có thể đảo)
| Quyết định | Lý do |
| --- | --- |
| Cổng phụ huynh mở 15 phút ngay sau đăng ký và đăng nhập mật khẩu; chọn hồ sơ cho trẻ thì khóa lại | Mật khẩu đã chứng minh là phụ huynh; giao máy cho trẻ đóng khu phụ huynh |
| Chọn hồ sơ không cần PIN, nhưng cần đồng ý bản chính sách hiện hành | Trẻ tự chọn hồ sơ của mình trên máy dùng chung |
| Nhân vật mặc định tên "Miu", tên nhân vật chọn từ `content/names/character-names.json` | Master Plan §9: không tên tự do |
| Quest mở khi bất kỳ quest nào liệt kê nó trong `unlock` đã xong; catalog từ chối vòng `unlock` | Khớp ví dụ Master Plan §11 |
| Server chạy bằng `tsx`, chưa đóng gói production | Chưa có môi trường triển khai |
| Bảng màu "trước" hiển thị bằng mẫu màu (không giữ ảnh bản đồ cũ) | Ảnh review chỉ được sinh bởi generator |

## Lệch so với plan (có chủ đích)
- Phase 6 sửa thêm `character-accessories.ts` (tham số `scale`) và `preview-main.ts` (`accScale`) để phụ kiện co theo biến thể.
- Không commit trong đợt (chưa được giao); CI chưa chạy lần nào.

## Nợ trước khi có người dùng thật
- Văn bản đồng ý là bản nháp (`requiresLegalReview: true`), cần pháp chế duyệt (NĐ 13/2023).
- Xác minh email (cần nhà cung cấp email, DNS); đăng ký báo "email đã có" nên dò được email.
- Triển khai: `trust proxy` theo reverse proxy thật, rate limit trong bộ nhớ (một instance), bước đóng gói server.
- Phụ kiện thành phần thưởng thì `PUT /api/character` phải kiểm sở hữu.
- Tách trang review/preview và ảnh review khỏi bản build phát hành.

## Việc sau khi người duyệt trả kết quả
1. Áp biến thể được chọn thành `miu-cat` (thay spec trong `content/characters.json`), xóa 2 biến thể còn lại, `pnpm assets:character` → `pnpm assets:preview` → `pnpm assets:manifest`.
2. Ghi quyết định vào Master Plan §15, cập nhật `docs/project-roadmap.md` (task #2, #3, #7, #8, #9, #12), ghi FPS iPad vào report này.
3. Nếu "Chỉnh thêm": một vòng chỉnh ở phase 6 rồi duyệt lại phần visual.
4. Push để CI chạy `integration` (Postgres 17) và `sast`; đỏ thì sửa code, không nới test.

## Câu hỏi mở
- Chọn biến thể Miu nào (A/B/C hay chỉnh thêm)?
- FPS trên iPad Gen 10 ở mức Vừa?
- Có cho phép commit và push đợt này để CI chạy không?
