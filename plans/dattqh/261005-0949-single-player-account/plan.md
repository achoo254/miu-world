---
title: "Mỗi tài khoản một người chơi"
description: "Chuyển mô hình tài khoản phụ huynh + hồ sơ con sang một người chơi chính mỗi tài khoản, hồ sơ phụ tùy chọn, kèm lời đồng ý v3."
status: completed
priority: P2
tier: L
branch: main
tags: [server, web, schema, legal]
blockedBy: []
blocks: []
created: 2026-10-05
---

# Mỗi tài khoản một người chơi

**Trạng thái:** xong và đưa lên production 05/10/2026 (không hỏi tuổi: người sở hữu chốt) · **Tier:** L · **Nhánh:** `main` · **Ngày:** 05/10/2026
**Nguồn:** yêu cầu người sở hữu 05/10/2026 (`.claude/rules/product-audience.md`): game cho mọi lứa tuổi, online kiểu Minecraft, sau này có mobile app, không cần phụ huynh giám sát, phụ huynh tự chịu trách nhiệm. Quyết định của Jev `account_model = plan_single_player` (0.84, rủi ro cao, áp theo quy ước; `plans/dattqh/reports/jev-261005-0949-all-ages-account.md`).

## Kết quả mong muốn

1. Người đăng nhập Google **chính là người chơi**: lần đầu đăng nhập → đồng ý chính sách v3 → tạo nhân vật → vào game. Không có bước "tạo hồ sơ cho bé", không có màn "Ai đang chơi?" khi tài khoản chỉ có một người chơi.
2. **Người chơi phụ** (tùy chọn, cho máy dùng chung như bố mẹ cho con chơi): chủ tài khoản thêm trong Quản lý tài khoản; khi có từ hai người chơi trở lên thì mới hiện màn chọn người chơi (và nút "Đổi người chơi" trong cài đặt).
3. Dữ liệu cũ giữ nguyên: mỗi tài khoản đang có hồ sơ thì hồ sơ cũ nhất thành người chơi chính, các hồ sơ còn lại thành người chơi phụ; không mất tiến độ, thưởng, đồ, vị trí.
4. Lời đồng ý v3 và trang quyền riêng tư nói đúng mô hình mới (mọi lứa tuổi, phụ huynh chịu trách nhiệm khi cho trẻ chơi bằng tài khoản của mình); mọi tài khoản đồng ý lại đúng một lần.
5. Mã và tài liệu gọi đúng tên: "người chơi" (player) thay cho "hồ sơ con" (child profile) ở API, DTO, UI, docs.

## Không làm (ghi rõ)

- Không đổi tên bảng/cột trong database (`parents`, `child_profiles`, `child_id`): đổi tên đụng khóa ngoại của 11 bảng game và mọi migration, rủi ro cao mà không đổi hành vi. Code đặt tên mới, ánh xạ về bảng cũ; ghi lý do trong `docs/system-architecture.md`.
- Không làm đăng nhập trên mobile app, không đổi cách đăng nhập (vẫn Google OAuth phía server).
- Không mở tên tự gõ cho người chơi (vẫn chọn từ danh sách; Jev quyết).
- Không thêm khai báo tuổi, không chặn theo tuổi (Jev quyết, chờ người sở hữu xác nhận).
- Không đụng luật server tính thưởng, không đổi dữ liệu game.

## Hiện trạng đo được (05/10/2026)

- Bảng `parents` (chủ tài khoản: Google `sub`, email, PIN tùy chọn), `child_profiles` (tối đa 3, `display_name` chọn từ danh sách, `language`), `sessions.active_child_id`, `consents` (bản v2). 11 bảng game khóa theo `child_id` (`characters`, `quest_progress`, `step_attempts`, `reward_ledger`, `inventory_items`, `skill_progress`, `player_positions`, `timetables`, `home_decor`, `shop_inventory`, `mail`), xóa cascade theo hồ sơ.
- Mọi route game lấy người chơi qua `activeChildId()` (`apps/server/src/auth/auth-context.ts`); 26 file ở server/web/packages dùng `childId`/`activeChildId`.
- Web: `/` → `/profiles` (màn "Ai đang chơi?") → `/create` nếu chưa có nhân vật → `/home`. Hồ sơ tạo ở `/parent` (`parent-area-screen.tsx`). PIN đã tùy chọn và đổi/gỡ được (commit `5c240093`, `d88a8965`).
- 10 migration Drizzle trong `apps/server/drizzle/`.

## Thiết kế

- Thêm cột `child_profiles.is_primary boolean not null default false` + chỉ mục duy nhất từng phần `(parent_id) where is_primary`. Migration backfill: hồ sơ có `created_at` nhỏ nhất của mỗi tài khoản thành `is_primary = true`.
- Đồng ý chính sách và tạo người chơi chính chạy trong **một transaction** (khóa dòng tài khoản; `acceptPolicy` trong `apps/server/src/player/player-routes.ts`): tên mặc định là tên đầu tiên còn trống trong danh sách (đổi trong Quản lý tài khoản), phiên đang mở chọn luôn người chơi đó. Phiên mới (`createSession`) luôn chọn sẵn người chơi chính. Thêm người chơi phụ cũng tự chữa nếu tài khoản thiếu người chơi chính.
- Web: không có người chơi nào được chọn thì tài khoản một người chơi tự chọn người đó; chỉ khi có ≥ 2 người chơi mới hiện màn chọn, và mục "Đổi người chơi" trong Cài đặt chỉ hiện khi đó. Nút giao máy ở Quản lý tài khoản dẫn tới màn chọn khi có người chơi phụ.
- Mã lỗi `no-active-child` giữ nguyên (web ánh xạ theo mã).
- Người chơi chính không xóa riêng được (xóa = xóa tài khoản); người chơi phụ xóa như hồ sơ hiện nay. Tổng số người chơi giữ tối đa 3.
- `/auth/me` trả thêm `players: [{ id, displayName, primary }]` để web biết có cần màn chọn người chơi không.
- API: route `/children` đổi thành `/players` (web là client duy nhất, đổi cùng lúc, không giữ đường cũ); DTO `ChildProfileDto` → `PlayerDto` trong `packages/schema`.

## Pha

| Pha | Tier | Nội dung | File sở hữu |
| --- | --- | --- | --- |
| 1 | M | Migration `is_primary` + backfill (sao lưu `.data/pglite` trước khi chạy ở máy dev; production theo `docs/deployment-guide.md`, hỏi người trước); server tạo người chơi chính sau khi đồng ý, phiên chọn sẵn người chơi chính; chặn xóa người chơi chính; `/auth/me` có `players`; test IDOR và test migration | `apps/server/src/db/schema.ts`, `apps/server/drizzle/**`, `apps/server/src/auth/**`, `apps/server/src/child-profile/**` |
| 2 | M | Đổi tên ở code: `/children` → `/players`, DTO `PlayerDto`, biến `childId` ở tầng route/web (DB giữ tên cũ); cập nhật mọi chỗ gọi | `packages/schema/src/account.ts`, `apps/server/src/**`, `apps/web/src/ui/**` |
| 3 | M | Web: luồng đăng nhập → đồng ý → tạo nhân vật → Home; màn chọn người chơi chỉ khi có ≥ 2 người chơi; Quản lý tài khoản có mục "Người chơi phụ trên máy dùng chung"; bản dịch vi/en | `apps/web/src/ui/app-shell.tsx`, `apps/web/src/ui/account/**`, `apps/web/src/ui/creator/**`, `apps/web/src/ui/i18n/locales/*.json` |
| 4 | S | Lời đồng ý v3 + trang quyền riêng tư: mọi lứa tuổi, chủ tài khoản là người chơi, phụ huynh chịu trách nhiệm khi cho trẻ chơi bằng tài khoản của mình, người chơi phụ; nâng `consent.version` và `privacy.consentVersion` lên v3 | `content/legal/*.json` |
| 5 | S | Kiểm tra và tài liệu: sửa unit test và E2E (`account-flow`, `mvp-loop`, `e2e/fixtures`), trang review (ảnh luồng mới), `docs/project-overview-pdr.md` (Luồng tài khoản), `docs/system-architecture.md` (sổ quyết định: tên DB giữ nguyên), `.claude/rules/server-and-child-safety.md`, `.claude/rules/product-audience.md` (bỏ mục "Còn lại từ thiết kế cũ") | `apps/web/e2e/**`, `apps/web/review.html`, `docs/**`, `.claude/rules/**` |

Thứ tự: 1 → 2 → 3; 4 làm song song với 3 nhưng phát hành cùng lúc (đồng ý v3 bật cùng luồng mới); 5 cuối.

## Tiêu chí nghiệm thu

- Tài khoản Google mới: đăng nhập → đồng ý v3 → tạo nhân vật → Home, không qua `/parent` hay `/profiles` (E2E `account-flow`).
- Tài khoản cũ có 2 hồ sơ: sau migration hồ sơ cũ nhất là người chơi chính, đăng nhập vào thẳng người chơi đó sau khi đồng ý v3; màn chọn người chơi hiện vì có 2 người chơi; tiến độ hai hồ sơ còn nguyên (test migration trên bản sao dữ liệu dev).
- Không xóa được người chơi chính qua API (409); xóa tài khoản vẫn xóa sạch.
- Mọi endpoint game vẫn qua test IDOR (người chơi của tài khoản khác trả 404).
- Gate đủ: `pnpm assets:check` → `pnpm content:check` → `pnpm test` → `pnpm typecheck` → `pnpm lint`, build web, `pnpm security:dist`, `pnpm --filter @miu/web e2e:ci` (E2E cần người yêu cầu chạy trên máy dev, theo quy ước).

## Rủi ro

| Rủi ro | Cách giảm |
| --- | --- |
| Migration lỗi trên dữ liệu thật (production) | Backfill viết idempotent, chạy thử trên bản sao `.data/pglite`; deploy và migration production hỏi người trước, có sao lưu và rollback theo `docs/deployment-guide.md` |
| Đồng ý lại v3 làm người chơi hiện tại bị chặn một lần | Chấp nhận (Jev chọn gộp đổi đồng ý vào lần này để chỉ đồng ý lại một lần); màn đồng ý hiện ngay sau đăng nhập |
| Đổi tên `/children` → `/players` sót chỗ gọi | Typecheck qua DTO dùng chung; grep `/children` bằng 0 trong `apps/web/src` |
| Người chơi trẻ dùng tài khoản riêng | Google tự giới hạn tuổi tài khoản; trẻ nhỏ chơi bằng người chơi phụ trong tài khoản người lớn, ghi rõ trong đồng ý v3 |

## Quyết định (Jev, 05/10/2026)

Input/output: `plans/dattqh/reports/jev-261005-0949-single-player-open-{input,output}.json`.

| Câu hỏi | Chọn | Độ tin | Mức |
| --- | --- | --- | --- |
| Tên người chơi | `list_only`: vẫn chọn từ danh sách; tên tự gõ xét lại cùng việc kiểm duyệt trước khi người ngoài chơi | 1.00 | auto |
| Hỏi tuổi ở đồng ý v3 | `rely_on_google`: không hỏi; dựa vào giới hạn tuổi tài khoản của Google, lời đồng ý ghi trẻ nhỏ chơi bằng người chơi phụ trong tài khoản người lớn | 0.42 | escalate |
| Số người chơi tối đa | `keep_3`: giữ 3 | 0.96 | auto |

Câu hỏi tuổi: Jev gần như phân vân (0.42), rủi ro cao (pháp lý, dữ liệu trẻ em). Áp theo quy ước, nhưng người sở hữu nên xác nhận trước pha 4.

## Kết quả thi công (05/10/2026)

- Migration `0010_primary-player.sql` (cột `is_primary`, chỉ mục duy nhất từng phần, backfill idempotent) chạy thử đúng trên bản sao database dev của worktree `miu-world-sgk`; test backfill ở `apps/server/src/db/schema.test.ts`.
- Review độc lập: 0 lỗi nghiêm trọng; đã sửa 4 điểm trung bình (transaction đồng ý + người chơi chính, web dùng `players`, nút giao máy, test migration) và phần chữ còn "hồ sơ".
- E2E trên máy dev (1 worker), 05/10/2026: lượt đầy đủ `e2e:ci` 86 test, các test hỏng còn lại không thuộc luồng tài khoản và đã sửa riêng (lọc đáp án trùm, màn kỹ năng lên cấp, chỗ đứng cạnh mục tiêu); sau đó `account`, `creator`, `mvp-loop`, `play`, `quest-flow`, `challenges`, `sgk-content`, `maps` qua 47/47 (1 bỏ qua: quay video duyệt).
- Production: release 05/10/2026 (backup trước release, migration tự chạy khi server khởi động); mọi tài khoản đồng ý lại lời đồng ý v3 một lần.

## Câu hỏi mở

- Không còn (người sở hữu chốt không hỏi tuổi, 05/10/2026).
