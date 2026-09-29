# Brainstorm — Kế hoạch tiếp theo sau POC Gate

Date: 2026-09-29 · Input: đề xuất của người sở hữu (`miu-world-next-steps-after-poc-gate.md`), Master Plan v3, `plans/dattqh/reports/poc-review-260929.md`, `assets/generated/review/perf.json`, cấu trúc repo.

## Kết luận
Giữ hướng lớn của đề xuất: chốt quyết định (C) → Monorepo + Backend Foundation (A) song song Visual (B) → tích hợp Web + engine → Vertical Slice → đo 3 máy thật → MVP Gate → Multiplayer. Bổ sung 4 quyết định kỹ thuật do Jev chọn (Vite SPA, Drizzle + PGlite, backend trước, đọc hiểu nhẹ) và sửa 1 mâu thuẫn với quy tắc repo (runtime Three.js không được nằm trong `packages/voxel`).

## Brainstorm contract
- **Outcome:** plan kế tiếp có thứ tự, stable ID và quyết định kiến trúc đủ để AI dựng Foundation mà không phải tự đoán.
- **Constraints:** `packages/voxel` giữ TS thuần (không `three`); server tính thưởng; CSP chặt, không script bên thứ ba; không dữ liệu thật của trẻ; không đổi quyết định "đo 3 máy trước MVP"; máy dev không có Docker/psql.
- **Non-goals:** multiplayer, loài Thỏ/Cáo/Gấu, Kim cương, đặt/phá block, màn Đọc hiểu M2.3, cửa hàng.
- **Acceptance:** 6 quyết định §15 và 4 quyết định kỹ thuật dưới đây được ghi vào Master Plan §15 và `docs/system-architecture.md`; bảng stable ID có trong `docs/project-roadmap.md`; plan Foundation tạo theo thứ tự đã chốt.

## Quyết định §15 (Q3–Q8) — chấp nhận nguyên đề xuất
| # | Chốt | Hệ quả cần ghi |
| --- | --- | --- |
| Q3 | Không đặt/phá block ở thế giới chính | — |
| Q4 | Bản đồ thiết kế sẵn theo Region | Generator seed chỉ là công cụ dựng map |
| Q5 | Tách Subject và Skill | Phần thưởng MVP phải có **Skill XP** (đề xuất đang thiếu) |
| Q6 | Không dùng Kim cương ở MVP | Ẩn ô Kim cương trên HUD |
| Q7 | MVP chỉ Mèo | — |
| Q8 | Multiplayer Bậc 1 sau MVP | Bậc 1 theo §8: emote, câu có sẵn, báo cáo/chặn, phụ huynh bật |

## Quyết định kỹ thuật (TypeSafe Jev)
Mô hình `jev-1.13.0`, Choice, qua `tools/decisions/jev-decide.py`. Người sở hữu giao Jev quyết định; ngưỡng tự quyết ở mức medium là confidence ≥ 0.8, dưới ngưỡng thì vẫn theo lựa chọn của Jev nhưng đánh dấu để người sở hữu có thể đảo lại.

| Câu hỏi | Jev chọn | Xác suất | Conf | Ghi chú |
| --- | --- | --- | --- | --- |
| Framework app web | Vite + React SPA | 0.69 (static export 0.26, App Router 0.05) | 0.54 | **Dưới ngưỡng**; lệch Master Plan §7 (Next.js). Dùng lại hạ tầng POC (CSP, worker, E2E); landing SEO làm trang tĩnh riêng nếu cần |
| ORM + DB dev | Drizzle + PGlite; Postgres thật trong CI | 1.00 | 1.00 | Không bắt người cài Docker |
| Thứ tự sau Monorepo | Backend Foundation trước (theo đề xuất gốc) | 0.56 (slice + đo sớm 0.27, slice không đo 0.17) | 0.34 | **Dưới ngưỡng**; trùng ý người sở hữu nên giữ. Rủi ro còn lại ghi ở dưới |
| Đọc hiểu trong slice | Đọc lá thư/manh mối khi khám phá (skill `doc-hieu`), 3 thử thách Toán; không làm M2.3 | 0.97 | 0.95 | Đưa Character Creator vào slice (tiêu chí §16 đầu tiên, đề xuất bị thiếu) |

Tự quyết (không cần hỏi, suy ra từ yêu cầu "runtime không phụ thuộc React"): nối React với Three.js bằng bridge tự viết, không dùng React Three Fiber.

## Cấu trúc chốt (người sở hữu xác nhận Vite + React, 2026-09-29)
Dựa trên cấu trúc người sở hữu đề xuất, chỉnh 4 chỗ:

```
apps/web/            Vite + React
  src/game/          runtime Three.js: Game.ts, world/, player/, npc/, camera, render loop (chuyển từ apps/poc-voxel/src)
  src/ui/            React: hud/, inventory/, quest/, character/  (Shop là V1, chưa tạo)
  src/game-bridge    event + store (useSyncExternalStore) nối game → React; React không điều khiển game loop
  review.html        trang review chuyển từ POC
apps/server/         Express + Drizzle: auth/, player/, quest/, inventory/  (world/ để sau)
packages/voxel/      TS thuần, KHÔNG import three (chunk, mesher, va chạm, phụ kiện) — giữ nguyên
packages/quest/      TS thuần: quest state machine, điều kiện, tính thưởng; dùng chung web + server
packages/schema/     Zod cho API + nội dung
content/  assets/  tools/
```

| Chỗ chỉnh | Lý do |
| --- | --- |
| `packages/voxel` không chứa Three.js; runtime Three.js nằm ở `apps/web/src/game` | `CLAUDE.md`: voxel giữ TS thuần. Runtime chỉ có một app dùng nên không cần package `engine` riêng (bỏ đề xuất trước của tôi) |
| Quest logic ra `packages/quest`, không nằm trong `game/Quest` | Master Plan §11, §17: quest không phụ thuộc Three.js; server phải tính lại thưởng bằng cùng logic. Game chỉ phát event tương tác (chạm vật, nói với NPC), `packages/quest` quyết định bước tiếp |
| Không tạo `packages/shared`, `packages/game-data` | Nội dung đã ở `content/`; `shared` dễ thành chỗ chứa lung tung. Tạo khi có nhu cầu thật |
| Xóa `apps/poc-voxel` sau khi chuyển runtime + review.html sang `apps/web` | Tránh hai bản runtime song song; Hướng B review ngay trên `apps/web` |

Luồng dữ liệu: `game` phát event → `packages/quest` cập nhật trạng thái (client dự đoán hiển thị) → API server tính lại, ghi DB, trả kết quả chuẩn → store → React UI. React chỉ render lại khi store đổi, không theo từng khung hình.
3. **Hướng B chưa có mock voxel làm đích.** Sinh 2–3 biến thể tỷ lệ chibi từ JSON, đặt cạnh nhau trên trang review để người sở hữu chọn một lần.
4. **Backend chỉ làm domain slice cần** dù đi trước: Auth/Parent/Child profile, Character, Quest progress, Reward (XP, Xu, Skill XP, vật phẩm). Achievement, World API để sau.

## Trade-offs
- **Vite SPA:** dựa vào giả định không cần SSR cho phần game và cổng phụ huynh; hỏng đầu tiên nếu sản phẩm cần SEO cho nhiều trang public — khi đó thêm site tĩnh riêng, không đổi app game.
- **Drizzle + PGlite:** dựa vào độ tương thích PGlite với Postgres; hỏng đầu tiên ở extension/tính năng chỉ Postgres thật có — CI chạy Postgres thật sẽ bắt được.
- **Backend trước:** dựa vào giả định GPU mobile đủ khỏe; hỏng đầu tiên nếu máy thật không đạt, khi đó gameplay đã xây trên engine phải tối ưu muộn. Giảm thiểu rẻ nhất: mở bản build trên một điện thoại sẵn có sau khi tích hợp web (Jev xếp phương án này thứ hai, 0.27).

Better approaches: đã nêu ở "Sửa so với đề xuất" (tách engine, biến thể chibi song song) — bằng chứng: quy tắc `CLAUDE.md` và việc mock hiện tại không phải voxel.

## Stable ID (chỉ dùng trong plan và roadmap, không trong code/test/commit)
| ID | Nội dung | Master Plan task |
| --- | --- | --- |
| FOUNDATION-01 | Monorepo: `apps/web` Vite+React, `apps/server` Express, `packages/schema`, CI thêm `pnpm audit` + SAST | #3 |
| FOUNDATION-02 | Tài khoản phụ huynh, hồ sơ trẻ, đồng ý phụ huynh (session cookie httpOnly) | #7 |
| FOUNDATION-03 | Shared schema (Zod) cho API + nội dung | #3, #8, #15 |
| FOUNDATION-04 | Data model + API nhân vật, tiến độ, thưởng tối thiểu | #8, #19 (phần server) |
| ENGINE-01 | Chuyển runtime POC vào `apps/web/src/game`, game-bridge sang React, chuyển review.html, xóa `apps/poc-voxel` | #11, #13 (phần nền) |
| VISUAL-01..03 | Miu chibi, phụ kiện, palette block | #9, #12 |
| SLICE-01..11 | Creator, Home+HUD, map rừng, di chuyển, NPC, quest runtime, khám phá, 3 thử thách Toán, hỗ trợ học, thưởng/Level Up, ba lô | #10–#20 |
| DEVICE-01 | Đo trên máy chuẩn iPad Gen 10 × Low/Mid/High (chốt 2026-09-29, thay bộ 2 Android + 1 iPhone; thay cho "POC-06 Device Gate" — chưa làm, đã dời) | §12, §16 |

## Đồng bộ docs/rules theo Master Plan (việc đầu tiên)
Người sở hữu xác nhận: `docs/`, `.claude/rules/`, `CLAUDE.md`, `README.md` phải bám Master Plan v3; bản hiện tại lấy phạm vi từ plan POC nên đang lệch. Đã rà:

| Chỗ lệch | Bằng chứng | Hướng sửa |
| --- | --- | --- |
| Rules chỉ phủ asset và runtime POC | `.claude/rules/` chỉ có `assets-pipeline.md`, `voxel-runtime.md` (trỏ `apps/poc-voxel/...`) | Thêm rule theo Master Plan: server-authoritative + an toàn trẻ em + IDOR (§8, §9), UI bám mock + design token (§2, §6), quest/nội dung bằng dữ liệu có schema, 8 pha, 7 câu, 3 lớp hỗ trợ (§5, §11); sửa `voxel-runtime.md` theo cấu trúc `packages/engine` + `apps/web` |
| README, codebase-summary, design-guidelines coi POC là sản phẩm | "Repo đang ở giai đoạn POC", token tạm và font trỏ `apps/poc-voxel/src/` | Viết lại theo giai đoạn MVP; POC là sandbox review |
| `CLAUDE.md` gate E2E chỉ có project `poc` | mục Lệnh | Thêm gate cho `apps/web`, `apps/server` khi có |
| Quyết định §15 ghi "chờ chốt" | `project-overview-pdr.md` (Q3, Q5), `project-roadmap.md` task #1 | Chuyển sang đã chốt sau khi Master Plan §15 cập nhật |
| Thiếu tóm tắt bền vững cho §5, §9, §11 | `docs/` không có data model, luồng phụ huynh | Bổ sung vào `system-architecture.md` và `project-overview-pdr.md`, trỏ về Master Plan thay vì chép |

Thứ tự: sửa Master Plan trước (vì là nguồn chuẩn), rồi mới cập nhật docs/rules theo nó. Chỉ mục nào đã được người sở hữu duyệt mới được đưa vào Master Plan.

**Framework:** người sở hữu đã xác nhận Vite + React (2026-09-29); cập nhật Master Plan §7 (bỏ Next.js, chốt bridge tự viết thay R3F, Drizzle + PostgreSQL) trước khi sửa docs/rules.

## Việc trước khi bắt đầu
- Commit các thay đổi đang dở (50 ảnh review, manifest, docs, Master Plan, test symlink).
- Cập nhật Master Plan §7 (Vite thay Next.js, Drizzle), §15 (chuyển Q3–Q8 sang "Đã chốt"), `docs/system-architecture.md`, `docs/project-roadmap.md`.

## Câu hỏi chưa giải quyết
1. Đã giải: số 164.8 FPS / 128 draw call / 33.4k tam giác / 1.48 MB đo trên PC của người sở hữu, không đại diện mobile. Máy chuẩn từ nay là iPad Gen 10.
2. Đã giải: Vite + React được người sở hữu xác nhận.
3. Có commit các thay đổi đang dở trước đợt mới không.
