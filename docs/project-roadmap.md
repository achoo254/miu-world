# Lộ trình

**Đây là ý định, không phải hành vi đã giao.** Nguồn: Master Plan v3 §13 (vertical slice, phase, gate), §14 (backlog P0 24 việc), §16 (tiêu chí nghiệm thu MVP). Phase sau chỉ bắt đầu khi gate của phase trước đạt; chưa có ngày cụ thể.

## Giai đoạn

| Giai đoạn | Phạm vi |
| --- | --- |
| POC | Chứng minh hướng asset không tự vẽ và hiệu năng voxel trên mobile |
| MVP | Vertical slice: Home Base + Khu rừng bí mật chương 1, Mèo, một quest trọn vòng, server tính thưởng, tài khoản phụ huynh |
| V1 | Trường học, Thư viện, Lâu đài; Thỏ, Cáo, Gấu; skill check, boss; cửa hàng |
| Live World | Sự kiện có thời hạn (cổng TIMO) |
| MP | Multiplayer theo 3 bậc; bậc 1 (thấy nhau) chỉ mở khi có báo cáo/chặn và phụ huynh bật được |

## Trạng thái backlog P0

Chỉ ghi task đã bắt đầu; các task còn lại đang ở trạng thái chưa làm theo thứ tự Master Plan §14. Cập nhật bảng này khi một task đổi trạng thái.

| Task | Nội dung | Trạng thái | Bằng chứng |
| --- | --- | --- | --- |
| #1 | Chốt quyết định còn mở (§15) | Hoàn thành (2026-09-29) | Master Plan §15 #3–#8, #16–#18 |
| #2 | Sửa plan, `CLAUDE.md`, cấu trúc repo | Hoàn thành (2026-09-29) | `plans/dattqh/260929-1911-foundation-after-poc-gate/` |
| #3 | Monorepo Vite + React / Express / Drizzle, CI (audit, Semgrep, Postgres 17, E2E) | Hoàn thành (2026-09-29, CI xanh) | như trên |
| #7 | Tài khoản phụ huynh (Google OAuth), hồ sơ trẻ, cổng PIN, đồng ý (bản nháp draft-3: thêm đếm hỗ trợ/số lần sai) | Hoàn thành phần kỹ thuật; văn bản đồng ý chờ pháp chế | `plans/dattqh/reports/foundation-review-260929.md` |
| #8 | Data model + API nhân vật, tiến độ, thưởng tối thiểu | Hoàn thành (2026-09-29) | như trên |
| #9, #12 | Miu chibi (biến thể A), phụ kiện co theo nhân vật, palette pastel ấm | Hoàn thành (duyệt bằng Jev theo ủy quyền, 2026-09-29); dựng lại bằng thân khối theo mock voxel `designs/character.png` (2026-09-30), người sở hữu duyệt tạo hình Mèo; nhân vật chuyển sang ghép từ thư viện bộ phận + trang phục dùng chung (2026-09-30) | `plans/dattqh/reports/jev-260929-foundation-review-decisions.md`, `plans/dattqh/260930-1457-miu-voxel-chibi/plan.md` |
| #5 | Tìm nguồn asset + license gate | Hoàn thành (Đã qua gate review) | `plans/dattqh/260929-0842-asset-sourcing-and-voxel-poc/` |
| #6 | POC voxel | Hoàn thành (Đã qua gate review, chốt chỉnh visual) | `plans/dattqh/reports/poc-review-260929.md` |
| #4 | Design token + bộ component UI (hướng A "Đảo mây kẹo hồng"), màn Tạm dừng, Đang tải, Mất mạng | Hoàn thành (2026-09-30); token tạm, chờ mock voxel (#23) | `plans/dattqh/260929-2141-vertical-slice-mvp/phase-01-design-tokens-and-ui-kit.md` |
| #12, #13, #16 | Khu rừng ch1: 9 vật thể tương tác theo mạch quest (entities v2), bảng đố cây cổ thụ, di chuyển/camera không xuyên khối | Hoàn thành (2026-09-30); draw call ≤ 150 ở mức Cao | `plans/dattqh/260929-2141-vertical-slice-mvp/phase-06-forest-interactables.md` |
| #22 | Bảo mật vertical slice: bảng endpoint, IDOR, chống gian lận, dữ liệu trẻ chỉ bộ đếm, quét đáp án trong bundle, CSP; E2E trọn vòng `mvp-loop` | Hoàn thành phần tự động (2026-09-30); đo iPad (DEVICE-01), giáo viên duyệt nội dung, pháp chế duyệt đồng ý là việc của người | `plans/dattqh/260929-2141-vertical-slice-mvp/phase-10-security-e2e-review-gate.md` |
| #10 | Character Creator: chọn loài (Mèo, Thỏ, Cáo, Gấu; server lưu loài), 7 loại phụ kiện (Mũ, Kính, Khăn, Balo, Cánh, Giày, Cầm tay) mỗi loại ≥ 20 món mở từ Lv.1 có ảnh từng món, thêm đồ mở theo level/quest (server kiểm), preview voxel 3D + 4 hoạt ảnh, chọn tên | Hoàn thành (2026-09-30); 3 loài mới mở theo yêu cầu người sở hữu (2026-09-30); mở rộng phụ kiện lên 7 loại, 157 món (2026-10-01, Master Plan mục quyết định 31); Áo là V1; chờ designer duyệt UI | `plans/dattqh/260929-2141-vertical-slice-mvp/phase-04-character-creator.md` |
| #11 | Home (đảo render sẵn + vùng nhấn khu vực), chọn khu vực, danh sách chương/quest, HUD gameplay | Hoàn thành (2026-09-30); Home là màn React trên ảnh đảo (lệch Master Plan §4 "một cảnh 3D", quyết định `home_scene`, ghi §15 ở phase 10) | `plans/dattqh/260929-2141-vertical-slice-mvp/phase-05-home-region-hud.md` |
| #14 | Hội thoại NPC, nhận quest, tracker + mũi tên chỉ hướng, tìm manh mối qua server | Hoàn thành (2026-09-30) | `plans/dattqh/260929-2141-vertical-slice-mvp/phase-07-npc-dialogue-quest-flow.md` |
| #17, #18 | 3 thử thách Toán (kéo thả, sắp xếp, trắc nghiệm) + đọc thư + câu đố, hỗ trợ Hướng dẫn/Gợi ý/Đáp án không khóa tiến trình | Hoàn thành (2026-09-30); nội dung học chờ giáo viên duyệt; thử Safari iPad thật ở DEVICE-01 | `plans/dattqh/260929-2141-vertical-slice-mvp/phase-08-math-challenges-learning-support.md` |
| #19, #20 | Hoàn thành nhiệm vụ (sao, XP thực nhận, Xu, vật phẩm, Skill XP), Level Up, Mở khóa; Ba lô, Hồ sơ + Bộ sưu tập | Hoàn thành (2026-09-30); Hành trình/Thành tích là V1 | `plans/dattqh/260929-2141-vertical-slice-mvp/phase-09-rewards-backpack-collection.md` |
| #21 | Script asset pipeline: ghép mesh, đổi bảng màu, atlas một texture, render ảnh đại diện và ảnh review, kiểm license và ngân sách | Hoàn thành (2026-10-01); nén KTX2 hoãn có số đo (mục Nợ đã biết) | `tools/assets/`, `plans/dattqh/261001-1905-atlas-ktx2-decision/` |
| — | Nhạc nền: 32 bài CC0 (Komiku) phát ngẫu nhiên không lặp liền theo cảnh (nhà, đi dạo rừng/trường, đang làm nhiệm vụ, bài học, hoàn thành), theo nút Âm thanh, tắt khi ghi âm, nhỏ lại khi đọc to | Hoàn thành (2026-10-01, Master Plan mục quyết định 32); nghe thử trên iPad thật ở DEVICE-01 | `apps/web/src/ui/sound/music.ts`, `pnpm assets:music` |
| #15 | Quest bằng dữ liệu: schema v2, runtime chấm đáp án, `pnpm content:check` trong CI, nội dung Khu rừng ch1 + stub ch2 | Hoàn thành phần dữ liệu và runtime (2026-09-30); nội dung học chờ giáo viên duyệt; `content:check` kiểm target trên map và chữ quest dùng `{name}` (tên nhân vật), không cứng "Miu" | `plans/dattqh/260929-2141-vertical-slice-mvp/phase-02-quest-schema-runtime-content.md` |

## Mã ổn định ↔ task Master Plan

Mã chỉ dùng trong plan và roadmap, không dùng trong code, tên test, commit.

| Mã | Nội dung | Task §14 |
| --- | --- | --- |
| DOCS-01 | Đồng bộ Master Plan, `docs/`, `.claude/rules/`, `CLAUDE.md`, README | #1, #2 |
| FOUNDATION-01 | Monorepo: `apps/web` Vite + React, `apps/server` Express, `packages/schema`, CI thêm `pnpm audit` + SAST | #3 |
| FOUNDATION-02 | Tài khoản phụ huynh, hồ sơ trẻ, cổng phụ huynh, đồng ý | #7 |
| FOUNDATION-03 | Schema dùng chung (Zod) + database | #3, #8, #15 |
| FOUNDATION-04 | Data model + API nhân vật, tiến độ, thưởng tối thiểu | #8, #19 (phần server) |
| ENGINE-01 | Runtime POC vào `apps/web/src/game`, game-bridge, chuyển trang review, xóa `apps/poc-voxel` | #11, #13 (phần nền) |
| VISUAL-01..03 | Miu chibi, phụ kiện, palette block | #9, #12 |
| SLICE-01..11 | Creator, Home + HUD, map rừng, di chuyển, NPC, quest runtime, khám phá, 3 thử thách Toán, hỗ trợ học, thưởng/Level Up, ba lô | #10–#20 |
| DEVICE-01 | Đo trên máy chuẩn iPad Gen 10 ở Low/Mid/High (FPS, nhiệt, pin 15 phút) | §12, §16 |

## Gate kế tiếp

- **Gate POC (Đã qua - 2026-09-29):** Đã duyệt với kết quả: giữ kiến trúc kitbash/generator/mesher, chuyển sang tinh chỉnh visual (nhân vật chibi, palette phụ kiện & block); dời chốt số liệu hiệu năng sang đo máy thật trước nghiệm thu MVP (máy chuẩn: iPad Gen 10, chốt 2026-09-29).
- **Gate Foundation (Đã qua - 2026-09-29):** monorepo, tài khoản phụ huynh (Google) + hồ sơ trẻ, API nhân vật-tiến độ-thưởng, Miu chibi A + palette, runtime trong `apps/web`; CI xanh. Report: `plans/dattqh/reports/foundation-review-260929.md`.
- **Nội dung SGK lớp 2 tập 1 (Đã kích hoạt - 2026-10-01):** plan `plans/dattqh/260930-0846-sgk-lop2-game-content/` — 70 quest đang chơi được, mở từ đầu, không khóa nhau: 34 bài Tiếng Việt ở Khu rừng bí mật (chương 2–19), 36 bài Toán ở Trường học (7 khu theo chủ đề, khu đã mở). Phủ 100% (Toán 1033/1033, Tiếng Việt 735/735 mục; phần Viết qua phiếu in); `content:check` lỗi nếu độ phủ tụt. Mục tiêu trên map đặt tự động từ `content/world/targets.json` + `looks.json`. Chờ giáo viên duyệt (`reports/sgk-*-teacher-flags.md`).
- **Gate Vertical slice MVP (chờ người duyệt, 2026-09-30):** plan `plans/dattqh/260929-2141-vertical-slice-mvp/` xong 10 phase; trang review `apps/web/review.html`, report `plans/dattqh/reports/mvp-slice-review-260930.md`. Trước nghiệm thu MVP: DEVICE-01 (iPad Gen 10), giáo viên duyệt nội dung học, designer duyệt UI/mock voxel (#23), chơi thử với trẻ (#24).

## Nợ đã biết (trước nghiệm thu MVP)

- Đo trên máy chuẩn iPad Gen 10 ở Low/Mid/High (FPS, nhiệt, pin sau 15 phút).
- Nén texture KTX2: hoãn (Jev 0,98, 01/10/2026). Atlas block là một PNG 512 px, 53 KB, khoảng 1,3 MB bộ nhớ GPU; KTX2 cần thêm transcoder WebAssembly và `wasm-unsafe-eval` trong CSP để tiết kiệm chưa tới 1 MB. Xem lại khi atlas vượt 2048 px hoặc lần đo iPad cho thấy bộ nhớ texture là vấn đề. Lý do: `plans/dattqh/261001-1905-atlas-ktx2-decision/`.
- Triển khai server: staging đã chạy tại `miu-staging.hoandat.com` bằng bundle production (`pnpm --filter @miu/server bundle`), IP thật của khách đi đúng qua chuỗi proxy. Production chạy tại `miu.hoandat.com` trên .65 từ 30/09/2026; deploy production phải hỏi người trước mỗi lần. Xem `docs/deployment-guide.md`.
- Khi phụ kiện trở thành vật phẩm thưởng trong túi đồ: `PUT /api/character` phải kiểm sở hữu qua túi đồ. Hiện server đã kiểm điều kiện mở khóa theo level/quest của từng trang phục (403 `equipment-locked`); `unlock` chỉ nhận `level`/`quest`, chưa có trang phục nào là vật phẩm.
- Xác minh ứng dụng Google OAuth (màn đồng ý, chính sách quyền riêng tư) và pháp chế duyệt văn bản đồng ý draft-3 — trước khi có người dùng thật.
- Đưa KayKit vào (chế độ tải tay đã hỗ trợ).
