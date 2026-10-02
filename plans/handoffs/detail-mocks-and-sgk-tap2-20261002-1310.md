---
handoff-version: 1
generated: 2026-10-02T06:10:00Z
generator: ak:handoff@2.0.0
focus: "Bàn giao phiên: plan map theo mock chi tiết (261002-0802) gần xong, plan nội dung SGK tập 2 (261002-1139) đã lập, cần viết tệp pha; tiếng Việt."
workspace: /Users/hoandat/inet-gitlab/miu-world
branch: main
head: e01ed9f
---

# HANDOFF: Map theo mock chi tiết (nghiệm thu còn lại) và plan nội dung SGK tập 2

## Mission and current status

"Bàn giao phiên: plan map theo mock chi tiết (261002-0802) gần xong, plan nội dung SGK tập 2 (261002-1139) đã lập, cần viết tệp pha; tiếng Việt."

Mục tiêu người sở hữu (02/10/2026): 8 map giống các tấm mock chi tiết (bối cảnh, NPC, không gian, nền đất màu riêng mỗi map); sau đó đưa nội dung SGK lớp 2 tập 2 vào các map với kịch bản và trò chơi mới.

Done:
- 125 khung mock đã cắt vào `designs/<map>/{c,d}-*.png`; Jev quyết 7 câu (`plans/dattqh/reports/jev-261002-0802-detail-mocks.md`).
- Nền riêng mỗi map, bộ dựng chung, góc chụp đối chiếu từng khung, 8 map làm lại (báo cáo `plans/dattqh/reports/map-*-261002-detail-mocks.md`), đèn phát sáng, camera không bị cảnh đẩy + vật che mờ, chợ đông người, ngân sách tam giác/draw call cho đám đông, bộ xếp quest theo landmark cùng tên.
- Commit và push đủ gate: `a3a9e9f` (map), `e01ed9f` (plan). Gate: 969/969 test, typecheck, lint, assets/content check, build web, security:dist, E2E 74 đạt / 2 bỏ qua.
- Sách tập 2 ở iCloud (`miu-world/sgk/toan2-t2.pdf`, `tv2-t2.pdf`), khai trong `tools/private/private-files.json`, đã tách trang. Plan tập 2 đủ 10 tệp pha: `plans/dattqh/261002-1139-sgk-lop2-tap2-content/`.

Remaining:
- Plan mock chi tiết pha 6: chụp lại ảnh review cả 8 map (sau sửa chung cuối: màu nước, sàn nhà, cầu tàu), báo cáo đối chiếu tổng, kiểm trang review.
- Bắt đầu plan tập 2 (pha 1 kiểm kê ‖ pha 3 trò chơi mới) trong worktree riêng.

Urgency: người sở hữu hết quota, sẽ tiếp tục ở phiên mới.

## Scope and guardrails

- Workspace: `/Users/hoandat/inet-gitlab/miu-world` (repo công khai GitHub `achoo254/miu-world`).
- In scope: hoàn tất nghiệm thu plan mock chi tiết; thực hiện plan tập 2 theo tệp pha.
- Out of scope: Núi tuyết (Jev để sau); chu kỳ ngày đêm; perf project trừ khi người sở hữu yêu cầu.
- Constraints: trả lời người sở hữu bằng tiếng Việt, commit tiếng Anh conventional, không nhắc AI, không mã plan/pha trong code/commit; quyết định không tự quyết được gửi Jev (`tools/decisions/jev-decide.py`, `TYPESAFE_TOKEN_FILE` trong iCloud, không in khóa); máy dev một worker, không chạy song song nhiều bộ test; cổng cố định (5173, 4173, 8787, 5199).
- Plan tập 2 chạy trong worktree riêng `../miu-world-sgk2`, branch `dattqh/feat/sgk-lop2-tap2` (Jev E3); chỉ tạo khi bắt đầu thực hiện.
- Safety boundaries: không commit PDF, ảnh trang sách, credential; quét secret trước push (`git log -p origin/main..HEAD`); không sửa tay `assets/manifest.json` (dùng `pnpm assets:manifest`); không xóa `.data/pglite`.

## Current state

- Branch: `main`
- HEAD: `e01ed9f` (đã push lên `origin/main`)
- Working tree: sạch trừ thư mục chưa theo dõi `plans/handoffs/` (có sẵn từ trước, chứa tệp bàn giao này).
- Changed files: không có.
- Untracked files: `plans/handoffs/` (tệp bàn giao).
- Intentional local modifications: no
- `.data/sgk/pages/` có trang tách của cả 4 sách (gitignored).
- Không còn agent nền hay tiến trình dev nào đang chạy.

## Decisions and rationale

| Decision | Rationale | Alternative rejected | Reference |
| --- | --- | --- | --- |
| Đảo bí ẩn, Núi tuyết chỉ tham chiếu ở plan mock | Không có bài cho hai map lúc đó | Dựng ngay (0,47) | `jev-261002-0802-detail-mocks.md` |
| Quảng trường trung tâm trong map Trường học | Trường vẫn là hub | Map hub riêng | như trên |
| Khối nền riêng mỗi map (`soil`) | Data-driven, hiện cả ở preview và vùng ngoài | Tô màu lúc chạy | như trên |
| Camera không va chạm, vật che mờ, trần mờ trong nhà | Yêu cầu trực tiếp của người sở hữu | Camera kéo sát tường | memory `camera-never-pushed-fade-occluders` |
| Đám đông thưa bớt theo cả draw call và tam giác, luôn giữ 1/3 giới hạn | Chợ trống người khi cảnh nặng | Bỏ ngân sách | `apps/web/src/game/ambient/ambient-life.ts` |
| Vật thấp < 1,2 khối không đổ bóng | Rừng vượt 150k tam giác ở mức cao | Giảm cảnh | `apps/web/src/game/entities/props.ts` |
| Tập 2: chia theo chủ đề cân số bài, dựng Đảo bí ẩn, worktree riêng, mẫu trước, trò chơi trong thế giới | Jev auto cả 5 | Xem report | `plans/dattqh/reports/jev-261002-1139-sgk-tap2-plan.md` |

## Work performed

- Thêm/sửa chính: `content/blocks.json`, `content/palette.json` (khối nền, lantern, iron, wheat; nước đậm), `tools/world/zone-map.ts` (`soil`, `keptOut`, `placeNamed`), `tools/world/scenery.ts` (`streetHouses`, `laneVerge`, `STREET_LANTERN`, `SAILING_SHIP`, `jetty`), `tools/world/structures/{landmarks,countryside,buildings,world-writer}.ts`, `tools/world/mock-views.ts` + test, `tools/assets/render-preview.ts` (mock views, `PREVIEW_ONLY`, ảnh mốc trong phòng), `tools/assets/build-box-props.ts` (catalog theo map, `glow`), `apps/web/src/game/**` (camera, fade, glow, dusk, shot `play`, `face`, spawnAt, đám đông), mỗi map một generator + `tools/world/structures/<map>-*.ts` + `content/world/box-props/<map>.json` + `content/world/mock-views/<map>.json`.
- Sự cố đã khắc phục: khoảng 11:15 `scenery.ts` mất `laneVerge`/`streetHouses` vài phút do một lần thay thế đuôi tệp; đã khôi phục, mọi map sinh lại sau đó.
- Công cụ tạm (ngoài repo, scratchpad phiên cũ, có thể đã mất): `with-lock.mjs` (khóa chụp chung), `compare.py` (ghép ảnh mock/game), `play-shots.mts` (ảnh chơi thật). Có thể dựng lại nhanh nếu cần.
- 0 redactions applied.

## Verification

| Check | Command | Outcome | When |
| --- | --- | --- | --- |
| Assets | `pnpm assets:check` | OK, 2908 tệp | 02/10 12:09 |
| Content | `pnpm content:check` | OK, 292 tệp | 02/10 12:09 |
| Unit/integration | `pnpm test` | 969/969, 98 tệp | 02/10 12:09 |
| Types, lint | `pnpm typecheck`, `pnpm lint` | sạch | 02/10 12:09 |
| Build, bundle | `pnpm --filter @miu/web build`, `pnpm security:dist` | OK | 02/10 12:16 |
| E2E | `pnpm --filter @miu/web e2e:ci` | 74 đạt, 2 bỏ qua, 5,5 phút | 02/10 12:34 |

Not run:
- `perf` (chỉ chạy khi người sở hữu yêu cầu).
- Ảnh review của 8 map chưa chụp lại sau sửa chung cuối (nước, sàn, cầu tàu, vật thấp không đổ bóng).
- Sau `e01ed9f` chỉ đổi tệp plan, không cần chạy lại gate.

## Open risks and blockers

- Ba câu cầu thang trường, nhà Mẩy, khung toàn cảnh Lâu đài/Thư viện: đã quyết qua Jev (13:17), giữ nguyên cả ba; không còn việc.
- Type: risk. Owner: unknown. Impact: riêng cảnh chợ vượt khoảng 150 draw call ở một số góc; chưa đo `perf`; gộp lệnh vẽ prop là việc tối ưu riêng.
- Type: risk. Owner: phiên sau. Impact: trong nhà chưa đặt được người dân và mục quest (`village-life.ts` chỉ ngoài trời; `canStand` của zone-map so độ cao với mặt đất zone) — plan tập 2 pha 5 cần sửa.

## Exact next actions

1. **First safe step**: đọc tệp này, chạy `git status` và `git log --oneline -3` để xác nhận HEAD `e01ed9f` sạch; chạy `pnpm private:sync` (phải báo 6/6 đúng sha256).
2. Chụp lại ảnh review cả 8 map: `pnpm assets:preview forest-ch1 school truong-hoc lang-ven-song xom-mai-am cho-phien nong-trai thu-vien lau-dai` (rất lâu, chạy nền, một lần), rồi `pnpm assets:check`; xem ảnh `mock__*` cạnh khung mock trên `apps/web/review.html`; viết `plans/dattqh/reports/mock-detail-acceptance-<ngày>.md` (đạt/gần/chưa từng khung, lấy từ các báo cáo map); commit `docs(review): ...`, push.
3. Bắt đầu plan tập 2: tạo worktree `../miu-world-sgk2` (branch `dattqh/feat/sgk-lop2-tap2`) — chỉ khi người sở hữu đồng ý bắt đầu; làm pha 1 (kiểm kê, chia 7 gói song song) ‖ pha 3 (trò chơi mới) theo tệp pha.

## Source pointers

- Plan mock chi tiết: `plans/dattqh/261002-0802-detail-mocks-per-map/plan.md`, bản giao việc agent `phase-04-map-rework-brief.md`, ảnh trong nhà `anh-trong-thu-vien/`, `anh-trong-cho/`.
- Báo cáo: `plans/dattqh/reports/jev-261002-0802-detail-mocks.md`, `plans/dattqh/reports/map-*-261002-detail-mocks.md`, `plans/dattqh/reports/jev-261002-1139-sgk-tap2-plan.md`.
- Plan tập 2: `plans/dattqh/261002-1139-sgk-lop2-tap2-content/plan.md`, `story-map.md`, `phase-01` … `phase-10`.
- Plan tập 1 (khuôn): `plans/dattqh/260930-0846-sgk-lop2-game-content/`.
- Tài liệu: `docs/design-cac-map.md` (mục "Mock chi tiết từng khu"), `docs/project-roadmap.md`, `CLAUDE.md`.
- Sách: `tools/private/private-files.json`, `tools/sgk/split-pages.py`, `.data/sgk/pages/{toan-t2,tv-t2}-NNN.pdf`.
