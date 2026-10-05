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
- Playwright ở `apps/web/e2e/`: project `setup` tạo phụ huynh giả + hồ sơ qua API; mỗi file `<tên>.spec.ts` là một project (`account`, `play`, `creator`, `home`, `quest-flow`, `challenges`, `mvp-loop`); `pnpm --filter @miu/web e2e:ci` chạy mọi project trừ `perf` (CI dùng lệnh này, thêm spec mới là tự vào CI). `perf` là đo hiệu năng dài, không chạy thường xuyên. Spec cần tiến độ quest riêng tự tạo phụ huynh mới (`freshChild` trong `quest-api.ts`), không đổi phiên dùng chung. Server E2E dùng PGlite trong RAM, không có dữ liệu thật. Chờ theo trạng thái (DOM, `window.__miuStats`), không chờ theo thời gian.
- **Ngân sách thời gian test** (giữ nguyên dù game có thêm bao nhiêu map, quest): E2E có timeout mặc định 45 s. Một test chạy quá 30 s phải tự khai timeout dài hơn bằng `test.setTimeout`, kèm comment ghi lý do; không khai thì reporter `e2e/time-budget-reporter.ts` đánh đỏ. Trên CI, E2E chia 4 phần chạy song song trên 4 máy GitHub (`--shard`, mỗi máy 1 worker, chia theo từng test nhờ `fullyParallel`); mỗi phần không quá 480 s (`E2E_SUITE_BUDGET_SECONDS` trong `playwright.ci.config.ts`), phần nào gần chạm thì tăng số phần trong `.github/workflows/ci.yml`, không nâng ngân sách. Sau mỗi lượt, reporter in 10 test chậm nhất.
  - Không thử lại hàng loạt (`retries: 0`) và CI dừng sau 10 test hỏng (`maxFailures`): một test hỏng là lỗi cần sửa, không chờ hết timeout hai lần.
  - Kiểm tra tăng theo lượng nội dung (mọi quest, mọi target, mọi map) đặt ở Node (`content:check`, vitest). E2E chỉ lấy mẫu, ví dụ chương đầu và chương cuối của mỗi vùng, để thời gian chạy không tăng theo nội dung. `maps.spec` mỗi lượt chỉ mở 3 map mẫu và đi một chuyến cho mỗi loại xe; lượt hằng đêm (CI `schedule`, hoặc chạy tay `workflow_dispatch`) đặt `E2E_ALL_MAPS=1` để mở mọi map.
  - Tư liệu cho trang duyệt (video, ảnh chờ cảnh đẹp) chỉ chạy khi đặt `REVIEW_SHOTS=1`.
  - Trên máy dev chỉ chạy 1 worker và không chạy nhiều bộ test cùng lúc, vì nhiều trình duyệt chạy song song làm treo máy (máy 16 GB dùng chung nhiều dự án). Trên máy dev: `pnpm --filter @miu/web e2e:smoke` (nhóm test gắn tag `@smoke`, vài phút, phủ đăng nhập, Home, chơi, quest, map, phiếu) hoặc đúng project đang sửa; lượt đầy đủ để CI chạy. Test mới quan trọng và nhanh thì gắn `{ tag: '@smoke' }`. Server E2E build web bằng `vite build` (không `tsc`, typecheck là gate riêng).
  - Vượt ngân sách thì sửa test (tách nhỏ, cắt thời gian chờ, chuyển kiểm tra sang Node), không nâng con số ngân sách.
- Chữ trong game gọi người chơi bằng tên nhân vật: nội dung viết `{name}`, UI điền bằng `fillPlayerName`; mọi câu lặp lại (phản hồi, lời NPC, lời mời thử lại) chọn từ pool bằng `freshPicker`, không lặp ngay. `content:check` chặn chữ quest cứng "Miu".
- Đáp án quest chỉ ở server: web không import `content/quests`; `pnpm security:dist` (CI, sau build web) quét bundle.
- Generator phải xác định (cùng input → cùng byte output); kiểm bằng chạy lại và so hash.
- Không làm yếu test để qua gate. Test không chạy được vì giới hạn môi trường thì skip có điều kiện ngay trong test (bắt đúng mã lỗi, như test symlink trên Windows), không xóa, và CI phải còn chạy nó.
- Thay đổi về đăng nhập, phân quyền, thưởng, dữ liệu trẻ em: kèm test bảo mật tự động (IDOR, chống gian lận, CSP).

## Backend (`apps/server`)

- Mỗi endpoint có test IDOR: phụ huynh/hồ sơ khác không đọc, sửa, xóa được; trả 404 (không 403) để không lộ tài nguyên tồn tại.
- Mỗi endpoint ghi thưởng, tiến độ, mở khóa có test chống gian lận: bỏ qua giá trị client gửi, gọi lặp không cộng thêm, sai thứ tự bị từ chối.
- Test API chạy bằng supertest trên PGlite in-memory ở máy dev; CI chạy cùng bộ test trên PostgreSQL thật.
- Migration chỉ sinh bằng `drizzle-kit generate`, commit file SQL và review như code; không `push` schema lên DB thật.
- Không log email, tên hồ sơ, token; log chỉ id. Lỗi trả client không kèm stack.
- Input validate bằng Zod từ `packages/schema`; DTO trả ra không bao giờ chứa hash mật khẩu, PIN hay token.

## React (`apps/web`)

- React không giữ state thay đổi theo khung hình (vị trí, camera, FPS): game tự ghi vào DOM qua ref; React chỉ nhận event rời rạc qua `game-bridge`.
- Màn hình ghi rõ bám mock nào (`M?.?`) hoặc là NEW SCREEN; dùng biến CSS token, không hardcode màu mới.
- Gọi API cùng origin bằng `fetch`; không script hay analytics bên thứ ba.
- Chữ giao diện đi qua lớp song ngữ (`apps/web/src/ui/i18n`, cách dùng ở [`i18n.md`](i18n.md)): không viết chuỗi tiếng Việt thẳng trong component mới; chữ SGK giữ nguyên tiếng Việt.

## Định nghĩa "xong"

1. Năm gate CI xanh (`assets:check`, `content:check`, `test`, `typecheck`, `lint`); runtime đổi thì E2E xanh; CI còn chạy `pnpm audit` và Semgrep.
2. Agent review độc lập (`code-reviewer`) và đã xử lý phát hiện; phát hiện không sửa phải ghi lý do trong report.
3. Plan/report trong `plans/dattqh/` cập nhật; tài liệu `docs/` cập nhật nếu đổi hành vi người dùng thấy, kiến trúc, lệnh, hay quyết định.
4. Cuối đợt giao hàng: trang review cho người duyệt cuối.

## Ra quyết định

- Quyết định thường ngày: AI tự quyết. Có thể dùng TypeSafe Jev qua `tools/decisions/jev-decide.py`; ngưỡng tự quyết theo mức rủi ro nằm trong hằng `AUTO_THRESHOLD` của script (rủi ro cao luôn chuyển người).
- Quyết định quan trọng (chi phí, an toàn trẻ em, phạm vi sản phẩm, pháp lý, việc tốn công người): gom lại hỏi một lần, kèm phương án và đề xuất.
- Ghi quyết định đã chốt vào Validation Log của plan; quyết định kiến trúc bền vững chuyển vào sổ quyết định ở `system-architecture.md`.

## Dependency và chuỗi cung ứng

- Khóa phiên bản qua `pnpm-lock.yaml`; CI cài bằng `--frozen-lockfile`.
- Dependency mới: AI tự review, liệt kê trong trang review của đợt. CI chạy `pnpm audit --prod --audit-level=high` và Semgrep CE (SAST); CodeQL bị loại vì repo private cần gói trả phí.
- Không thêm script hay analytics bên thứ ba vào client.

## Commit

Conventional commits tiếng Anh, scope theo vùng (`assets`, `web`, `server`, `schema`, `quest`, `plans`…). Không nhắc AI; không ghi mã plan, phase hay mã finding trong commit, tên test, comment code.
