# Review Master Plan: phase 4 (kiểm lại) và phase 5

Ngày: 2026-09-29. Người review: master-plan-reviewer.

## Verdict
| Phase | Verdict |
| --- | --- |
| 4 FOUNDATION-02 (kiểm lại) | PASS (tiêu chí Postgres CI còn mở tới lần push đầu) |
| 5 FOUNDATION-04 | PASS (có ghi chú nhỏ, không chặn) |

## Lệnh đã chạy
`pnpm assets:check` OK; `pnpm test` 22 file, 145 pass, 1 skip; `pnpm typecheck`, `pnpm lint` xanh; `pnpm --filter @miu/server db:check` sạch; `pnpm --filter @miu/web build` xanh; `pnpm audit --prod --audit-level=high` không có lỗ hổng. Kiểm quy tắc chặn import: `import "three"` trong `packages/quest/src/x.ts` bị ESLint `no-restricted-imports` báo lỗi.

## Phase 4: xác minh các xử lý
- H1: `trust proxy 'loopback'` (`app.ts:55`), `xfwd: true` cho dev và preview (`vite.config.ts:31`), limiter IP riêng cho login. Đã chấp nhận: server chỉ nghe loopback, http-proxy nối thêm IP thật vào cuối `X-Forwarded-For`, Express lấy địa chỉ phải nhất không tin cậy nên XFF giả bị bỏ. Nợ triển khai đã ghi ở `docs/project-roadmap.md:53`.
- H2: giữ chỗ lượt PIN bằng `UPDATE ... WHERE pin_failed_count < 5 RETURNING` trước khi verify (`auth-routes.ts:144-151`), có test song song.
- H3: trần hàng đợi 32, quá thì 503 `server-busy` (`secret-hashing.ts`, `app.ts:32`).
- H4, M1, M3, L1, L3, L5: có test đi kèm; migration 0000 có 3 index FK và unique `consents_parent_version`.
- Việc reviewer yêu cầu: test PATCH/DELETE/select theo cổng đã thêm; `eslint-disable` đã gỡ; `ALLOWED_ORIGINS` LAN ở `CLAUDE.md:39`; nợ `email-taken`, trust proxy, bundle ở `docs/project-roadmap.md:53-54`. Đạt.
- Sửa lại migration 0000 chấp nhận được vì chưa từng commit hay áp vào DB thật; sau commit đầu thì cấm sửa tay (rule `server-and-child-safety.md`).

## Phase 5: đối chiếu yêu cầu
Đạt:
- `packages/quest`: `completeStep` (`unknown-step`, `out-of-order`, `already-completed`, thưởng chỉ ở bước cuối, không đột biến đầu vào) và `levelFromXp` (chặn XP âm hoặc lẻ, chặn ở level cuối), có test biên. Không import three/React (lint rule kiểm chứng).
- API: `GET/PUT /character`, `GET /progress`, `POST /quests/:questId/steps/:stepId/complete`, `GET /inventory`, tất cả qua `requireParent` + `activeChildId` (kiểm hồ sơ thuộc phụ huynh mỗi request).
- Chống gian lận: thưởng chỉ lấy từ catalog, body bị bỏ qua (có test); transaction khóa dòng `quest_progress` (`FOR UPDATE`) + unique `(child_id, source)` + `ON CONFLICT DO NOTHING`; lặp bước trả `repeated: true` không cộng thêm; nhảy bước 409; quest khóa 409; quest/bước lạ hoặc id sai định dạng 404.
- Tổng: XP và Xu tính từ ledger; Skill XP và vật phẩm từ bảng tổng hợp cập nhật cùng transaction; có test chuỗi ngẫu nhiên seed so với ledger.
- Kim cương không có trong DTO (`game.ts`) và có test.
- Catalog: `content/quests/*.json` (chưa có quest thật, fixture ở `apps/server/test/fixtures/quests/`), validate `QuestDefinition`, id trùng, skill lạ, `unlock` trỏ quest lạ đều làm server không khởi động.

## Quyết định của implementer
| Quyết định | Kết luận | Lý do |
| --- | --- | --- |
| Quest khóa nếu có quest khác liệt kê nó trong `unlock` và chưa quest nào trong số đó xong (OR) | Chấp nhận | Khớp ví dụ Master Plan §11 (`"unlock": ["forest-ch2"]`); dễ nới sau |
| Lặp bước đã xong trả 200 `repeated: true` kèm thưởng ghi lần đầu | Chấp nhận | Đúng yêu cầu "lặp lại trả kết quả cũ, không cộng thêm" |
| XP/Xu từ tổng ledger, kỹ năng/vật phẩm từ bảng tổng hợp | Chấp nhận | Ledger là nguồn sự thật; có test đối chiếu |
| Mặc phụ kiện không cần sở hữu, chỉ kiểm catalog + 1 món mỗi slot | Chấp nhận cho MVP | Đúng nguyên văn phase ("chỉ gồm accessory id có trong catalog"); chưa có phụ kiện mở khóa bằng thưởng |

## Việc cần làm tiếp (không chặn PASS, theo ưu tiên)
1. [TRUNG BÌNH] Nội dung `unlock` có thể tạo vòng khép kín (A mở B, B mở A) hoặc không có quest gốc thì mọi quest trong đó khóa vĩnh viễn. Thêm kiểm tra vào `loadQuests` (phát hiện vòng, hoặc yêu cầu mỗi thành phần liên thông có ít nhất một quest gốc) kèm test.
2. [TRUNG BÌNH] Ghi ngữ nghĩa `unlock` (OR, quest không ai mở thì mở sẵn) vào `.claude/rules/quest-content.md` và comment của `QuestDefinition.unlock` trong `packages/schema/src/content.ts`, để người viết nội dung SLICE không phải đoán.
3. [THẤP] Ghi nợ: khi phụ kiện thành phần thưởng thì `PUT /character` phải kiểm sở hữu qua inventory (server là nguồn sự thật cho mở khóa). Đặt ở `docs/project-roadmap.md`. Phase 6 phải chuyển file mặt sang `content/faces/` như plan (hiện `content/accessories/` chỉ có `backpack-brown`, `hat-witch-pink`).
4. [THẤP] Sau khi bản đồng ý đổi, phiên đang chơi vẫn giữ `active_child_id` và các route game không kiểm lại đồng ý (chỉ `select` kiểm). Chấp nhận khi chưa có người dùng thật; ghi vào nợ trước ra mắt.
5. [THẤP] Các test đồng thời (5 request cùng bước, tối đa 3 hồ sơ, PIN song song) chạy trên PGlite một kết nối nên chưa chứng minh khóa dòng thật. Kết quả job `integration` Postgres 17 sau push mới là bằng chứng; nếu đỏ thì sửa code, không nới test.
6. Cập nhật trạng thái phase 4 và 5 trong `plan.md` và front matter phase file cho trung thực khi CI xanh.

Câu hỏi chưa giải quyết: không có. Không gọi Jev; mọi quyết định trên dễ đảo và không đổi dữ liệu trẻ.
