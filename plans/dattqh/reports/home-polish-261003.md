# Pha H: Nhà của bé đẹp như mock, tùy biến nội/ngoại thất, bản đồ nhỏ (03/10/2026)

Plan: `plans/dattqh/261003-1549-minigames-home-polish/plan.md` (pha H). Mock 14 ô: mô tả trong `plans/dattqh/261003-1320-home-timetable-vehicles/plan.md`. Người sở hữu: "phần chưa làm như mock yêu cầu làm luôn. phải đẹp như mock, cầu thang lên tầng2 quá xấu"; quy tắc mới cùng ngày: mặt đất phẳng, chỉ ao hồ trũng.

## Kết quả

### Làm đẹp (ô 1–10, 13)

- **Cầu thang mới** (`tools/world/structures/nha-cua-be-house.ts`): rộng 3 khối, bậc 1 khối, chiếu nghỉ 3 hàng giữa chừng dưới cửa sổ dài riêng, thành cầu thang gỗ sẫm (stringer) chạy theo dốc với con tiện và tay vịn (cản bé, không trèo qua), trụ đầu thang có đèn lồng ở chân và ở sàn gác, thảm đỏ viền vàng trải từng bậc, tủ nhỏ có trái tim dưới gầm, đèn tường trên chiếu nghỉ. Sàn gác sâu hơn (10 hàng thay vì 7) nên góc học tập rộng.
- **Nhà**: tầng trên trát vữa kem trong khung gỗ (thay ván trơn), hoa hồng leo dạng dây trên tường (thay cột lá khối), hộp hoa dưới cửa sổ tầng 2. Trong nhà: tường vữa kem trên chân tường ván, phòng ngủ và góc đồ chơi dán giấy hồng; sửa vệt đỏ của bậu cửa sổ mái lộ trong phòng ngủ.
- **Nội thất dày như mock**: phòng khách quanh tấm thảm (tivi, sofa kem gối hồng, bàn trà có trái cây, hai ghế bành, đèn cây, cây cảnh, đồng hồ, tranh, dây đèn lồng giữa hai dầm, cờ đuôi nheo, góc đọc dưới sàn gác, kệ sách); bếp (tủ lạnh nam châm, dãy tủ, bồn rửa, bếp nấu, giá đĩa treo tường, chuỗi tỏi/ớt/hành, bàn trà nhỏ hai ghế đẩu); bàn ăn bốn ghế có bánh kem và tô trái cây; nhà kho (kệ hũ, thùng, bao tải, dụng cụ, thang, chổi, chuỗi hành tỏi, hai đèn); góc học tập (bàn học dưới bảng thời khóa biểu, kệ sách cao kín tường đầy sách màu, giá vẽ, thảm, ghế đọc, dây đèn lồng); phòng ngủ (giường có màn che theo màu chăn, gối thú, bàn trà gấu bông, tủ quần áo, bàn trang điểm, ghế bành, đèn ngủ, thảm mèo to hơn, cờ đuôi nheo); góc đồ chơi (tàu hỏa, bóng bay, hộp quà, xếp hình, diều treo tường).
- **Ngoài nhà**: hai bồn hoa viền gỗ dày hoa (hai bông mỗi ô, trên cỏ thay đất trống), dải hoa và bụi dọc mặt nhà (chừa trước cửa), đèn sân dọc lối và lối ngang, đèn lồng dưới cổng, xích đu, chậu dâu, thêm cây hoa; ao có lau sậy, đá, súng nhỏ.
- **Ánh sáng**: mood mới `warm` (vàng ấm đèn lồng, trong nhà) và `golden` (nắng chiều vàng quanh nhà) — `PLACE_MOODS` thêm hai giá trị, `world-events.ts` thêm màu đèn cho mood.
- **Mặt đất phẳng** theo quy tắc mới: `roll: 0`, chỉ ao và suối đào xuống.
- **Khối mới** (47–53, atlas dựng lại qua khóa): `plaster`, `plaster-yellow`, `plaster-blue`, `wallpaper-pink`, `roof-green`, `roof-purple`, `roof-brown` (tô từ texture Kenney sẵn có, không vẽ tay).

### Tùy biến nội thất (ô 11) và ngoại thất (ô 12)

- Danh mục `content/home/decor.json` (schema `packages/schema/src/home-decor.ts`): 16 món, mỗi món 6–7 kiểu. Trong nhà: giường (7, có màn), bàn học (6), ghế (7, mọi ghế trong nhà), tủ quần áo (6), đồ trang trí (7), thảm (7), rèm cửa (7, mọi cửa sổ phòng), đèn (7). Ngoài nhà: kiểu nhà (7 phối màu mái/nóc/tường trên/tường dưới, áp cả mái chuồng gà và nhà kho vườn), hàng rào (7, có hàng rào cây), cổng (6), đèn sân (7), vườn hoa (7), lối đi (6), biển tên (7 đầu thú), cờ (6). Kiểu mới dựng bằng hộp màu (`nha-cua-be-props.ts`, 56 prop mới) hoặc dùng model Kenney/prop sẵn có; mọi model có dòng trong `content/world/models.json`.
- **Map để sẵn chỗ, game thay khi tải** (không sinh lại map): generator ghi `decorAnchors` (498 chỗ), `decorModels` (87 dòng: model, scale, độ lệch tâm, góc xoay của từng kiểu) và `decorBlocks` (39 dòng tô khối theo hộp) vào `entities.json`; kiểu mặc định là props có `slot`. Runtime (`packages/voxel/src/home-decor.ts`, thuần TS) thay props của món đã chọn, tô khối từng vùng khi vùng tải về và tô cả `horizon` (đường chân trời, bản đồ nhỏ). Tô đồng thời theo màu gốc nên phối màu không chồng nhau.
- **Server**: bảng `home_decor` (khóa `child_id`, cascade khi xóa hồ sơ), migration `apps/server/drizzle/0006_home-decor.sql` sinh bằng `drizzle-kit generate` — chỉ tạo bảng và khóa ngoại, không đụng dữ liệu cũ. `GET/PUT /api/home-decor` cùng luật với `/api/timetable` (phụ huynh đăng nhập, hồ sơ đang chọn, Origin cho phép); PUT nhận một phần, gộp với lựa chọn cũ, từ chối id không có trong danh mục (400, không ghi gì); GET luôn trả đủ mọi món (kiểu có sẵn nếu chưa chọn, hoặc nếu kiểu đã lưu bị bỏ khỏi danh mục). "Tải dữ liệu của tôi" có thêm `homeDecor` cho mỗi hồ sơ.
- **Màn "Trang trí nhà"** (`apps/web/src/ui/home-decor/`, NEW SCREEN): mở khi chạm sổ trang trí trên kệ cạnh vách phòng khách (mục tiêu `nha-trang-tri`); hai tab Trong nhà / Ngoài nhà, hàng nút món có chấm màu kiểu đang chọn, lưới thẻ kiểu (vòng màu, tên, nhãn "Kiểu có sẵn", dấu tích). "Lưu" chỉ gửi món đã đổi; nhà dựng lại ngay tại chỗ bé đứng (giữ vị trí như khi đổi nhiệm vụ). Map nhà đợi đọc lựa chọn trước khi dựng; đọc lỗi thì dựng kiểu có sẵn.
- **Kiểm tra mọi kiểu**: ba audit (`scenery`, `room`, `reach`) nay kiểm map nhà với **mọi kiểu đứng cùng lúc** (`everyDecorProp`) — không kiểu nào chắn lối, làm hẹp phòng hay chặn mục tiêu. `content:check` kiểm danh mục (model có trong manifest và catalog, khối tô là khối đặc thường).
- Xem thử không cần lưu: `?decor=bed:bed-blue,house:house-green,…` trên `/play` hoặc ảnh preview.

### Bản đồ nhỏ (ô 14)

- Mọi map: đĩa tròn góc trên phải ngay dưới các nút menu (8,5rem iPad; 6rem điện thoại; 4,5rem màn thấp), chữ "B" chỉ hướng Bắc, nền vẽ từ `horizon.bin` (khối trên cùng mỗi ô 4 × 4, màu lấy từ atlas, sáng hơn chỗ cao), mũi tên của bé theo hướng nhìn, cổng theo màu cổng dịch chuyển, nhà của bé (trên map nhà), ngôi sao nơi làm nhiệm vụ. Chạm mở cả bản đồ kèm chú thích như mock ("Bạn đang ở đây", "Nơi làm nhiệm vụ", "Nhà của {tên}", "Cổng sang Nông trại / Chợ phiên / Thư viện / Lâu đài / Núi tuyết / Đảo bí ẩn…"); chạm nền hoặc ✕ để đóng.
- Canvas 2D, vẽ 4 lần/giây (mức `low`: 2 lần/giây), không vẽ theo khung hình; nằm trong DOM của game (`apps/web/src/game/hud/minimap*.ts`, CSS ở `game.css`), React không giữ state. Ẩn trong ảnh review; `?minimap=1` giữ lại.

## Ảnh (đã xem)

- `plans/dattqh/reports/home-polish-261003/truoc-sau-trong-nha-1.jpg`, `truoc-sau-trong-nha-2.jpg`, `truoc-sau-ngoai-nha.jpg`: trước/sau theo phòng, cầu thang, mặt tiền.
- `tuy-bien-mac-dinh-va-kieu-khac.jpg`: cùng góc chụp, kiểu có sẵn và một bộ kiểu khác (giường xanh, rèm bạc hà, thảm sao, đèn nấm, tủ tím; mái xanh dương, hướng dương, lối gạch, đèn sao, cờ sao).
- `ban-do-nho.jpg`, `ban-do-nho-dien-thoai.jpg`: đĩa bản đồ và bản đồ mở (map nhà, Trung tâm; iPad ngang, điện thoại dọc).
- Bộ ảnh review của map: `assets/generated/review/nha-cua-be/` (thêm `nha-cua-be-cau-thang.png`; ảnh `coi-xay-gio` rơi khỏi 14 ảnh cận cảnh vì có thêm landmark cầu thang).

## Kiểm tra

| Kiểm | Kết quả |
| --- | --- |
| `scenery-audit nha-cua-be` (mọi kiểu cùng lúc) | 0 cây trên đường, 0 vật chắn lối, 0 nơi xa đường, 0 nơi bị cắt khỏi mạng đường |
| `room-audit nha-cua-be` (mọi kiểu cùng lúc) | 2 không gian có mái, 0 thiếu chuẩn |
| `reach-audit nha-cua-be` (mọi kiểu cùng lúc) | mọi mục tiêu tới được (cả ba mục tiêu riêng), điểm bắt đầu trống |
| `vitest` home/decor | `packages/voxel/src/home-decor.test.ts` 6/6; `tools/world/home-decor-map.test.ts` + `tools/content/check-home-decor.test.ts` 35/35; `apps/web/src/game/hud/minimap-model.test.ts` 7/7; `home-decor-panel.test.tsx` + `play-screen.test.tsx` 10/10 (thêm test: map nhà dựng theo lựa chọn, sổ mở màn, lưu thì dựng lại tại chỗ) |
| `vitest` server | `src/home` (7 test mới: mặc định, lưu một phần, anh chị em riêng, IDOR, id lạ 400 không ghi, kiểu bị bỏ, đăng nhập/Origin), `src/db/schema.test.ts` (cascade), `security/child-data`, `security/endpoint-table`, `account-routes` (export) — 31/31 |
| `vitest` khác | `zone-maps -t nha-cua-be` 4/4 (khớp output đã sinh, đi tới mọi mục tiêu), `model-catalog`, `world-events`, `check-content`, `timetable` đều pass |
| `pnpm content:check` | OK — 1088 file |
| `pnpm exec tsc` (root, web) | sạch với file của pha này; lỗi còn lại thuộc file đang làm của agent khác (`tools/assets/prop-*.ts`, `build-emoji-props.test.ts`, `apps/web/src/ui/minigame/games/*`) |
| `eslint --max-warnings=0` trên mọi file đã sửa | sạch |
| `pnpm --filter @miu/web build` | **chưa xanh vì việc của agent khác**: `tsc` dừng ở `minigame/games/blueprint-build/logic.ts`; chạy riêng `vite build` thì bundle JS biên dịch xong, bước chép asset dừng vì `packs/fluent-emoji/…/minigame/toothbrush.png`, `leafy-green.png` chưa có trong manifest. Đã kiểm riêng: 82 model kiểu trang trí đều nằm trong manifest và được bộ quét build nhận (trường `model` của `decorModels`) |
| `pnpm assets:check` | đỏ lúc chạy vì agent khác đang chụp ảnh review sáu map (hash ảnh `thu-vien`, `xom-mai-am`… lệch, manifest đang chờ họ ghi lại); không có lỗi thuộc map nhà |
| E2E | không chạy (theo yêu cầu) |

## File đã sửa

- Map, kit: `tools/world/generate-nha-cua-be-map.ts`, `tools/world/structures/nha-cua-be-house.ts`, `tools/world/structures/nha-cua-be-props.ts`; `tools/world/zone-map.ts`, `tools/world/map-kit.ts` (thêm thuần: `decorSpot`, `decorBlocks`, `decor`/`moods` của spec; `offsetOf`, `addSlotted` — đã báo phiên chính trước khi agent làm phẳng sửa hai file này); `tools/world/{scenery,room,reach}-audit.ts` (kiểm với mọi kiểu); `tools/world/home-decor-map.test.ts` (mới).
- Nội dung, asset: `content/home/decor.json` (mới), `content/blocks.json`, `content/palette.json`, `content/world/models.json` (80 dòng mới; giường hồng đổi chiều cao vì có màn), `content/world/box-props/nha-cua-be.json`; sinh lại: atlas, box props, `assets/generated/world/nha-cua-be/**`, `assets/generated/review/nha-cua-be/**`, `assets/manifest.json` (qua lệnh, qua khóa).
- Schema, voxel: `packages/schema/src/home-decor.ts` (mới), `packages/schema/src/account.ts` (`homeDecor` trong export), `packages/voxel/src/world-entities.ts` (trường thêm, tùy chọn), `packages/voxel/src/home-decor.ts` + test (mới).
- Server: `apps/server/src/db/schema.ts`, `apps/server/drizzle/0006_home-decor.sql` + `meta/` (sinh), `apps/server/src/home/home-decor-routes.ts` + test (mới), `apps/server/src/app.ts`, `apps/server/src/auth/account-routes.ts` + test, `apps/server/src/db/schema.test.ts`, `apps/server/src/security/child-data.test.ts`.
- Web: `apps/web/src/game/game.ts`, `game.css`, `world/world-data.ts`, `scene/world-events.ts`, `hud/minimap.ts`, `hud/minimap-model.ts` + test (mới); `apps/web/src/ui/home-decor/**` (mới); `apps/web/src/ui/play/play-screen.tsx` + test.
- Kiểm nội dung: `tools/content/check-content.ts` (đăng ký `home/decor.json` và kiểm), `tools/content/check-home-decor.test.ts` (mới).
- Tài liệu: `docs/design-cac-map.md` (mục Nhà của bé).

Không đụng `apps/web/src/ui/{minigame,challenge,quest}/**`, `packages/quest/**`, `packages/schema/src/content.ts`, `content/quests/**`, `content/minigames/**`. Không thêm dependency. Không commit.

## Việc cho phiên chính

- **Chính sách riêng tư**: trang `content/legal/privacy-vi.json` liệt kê từng loại dữ liệu theo hồ sơ bé; lựa chọn trang trí nhà (chỉ là id kiểu, không chữ tự gõ, không định danh) là một dòng mới cần thêm ("kiểu trang trí nhà bé chọn"). Quy tắc `server-and-child-safety.md` nói thêm trường dữ liệu trẻ phải hỏi người và sửa chính sách; pha H được giao đúng việc này nên tôi làm bảng, còn câu chữ chính sách (và có nâng phiên bản lời đồng ý hay không) để phiên chính/Jev chốt — tôi không sửa văn bản pháp lý.
- Chạy `e2e:ci`: bản đồ nhỏ là phần tử mới ở góc trên phải; `hud-layout.spec.ts` chưa đo nó. Đã tính chỗ theo nút menu ở ba cỡ màn hình và xem ảnh trên trang preview (có nạp token), nhưng chưa xem trên `/play` thật với HUD React. Nên thêm nó vào danh sách "không chồng nhau" của spec đó.
- `generate-world-overview.test.ts` đỏ: hotspot `nha-cua-be` tính ra x 60, `regions.json` ghi 56. Tôi không sửa code đảo nổi/overview; có thể do thay đổi chưa commit của agent làm phẳng (`outland-plan.ts`, `structures/path.ts`). Chạy lại `pnpm world:overview` sau khi họ xong.
- Build web và `assets:check` chờ agent minigame/ảnh review hoàn tất (xem bảng).
- Home screen chưa có lối vào màn trang trí (file Home không thuộc phạm vi được giao); hiện mở từ sổ trong nhà.

## Câu hỏi còn mở

- Có thêm dòng "kiểu trang trí nhà" vào chính sách riêng tư và nâng phiên bản lời đồng ý không (đề xuất: thêm dòng, không nâng phiên bản vì không phải dữ liệu cá nhân) — để Jev/người sở hữu chốt.

Status: DONE_WITH_CONCERNS
Summary: Nhà của bé đẹp lại theo mock (cầu thang gỗ có chiếu nghỉ, tay vịn, đèn, thảm; nội thất dày, vữa kem, giấy hồng, ánh vàng; sân đầy hoa), tùy biến nội/ngoại thất 16 món × 6–7 kiểu lưu theo hồ sơ ở server và hiện ngay trong nhà, bản đồ nhỏ có chú thích trên mọi map; ba audit về 0 với mọi kiểu cùng lúc, test và lint sạch.
Concerns: build web và assets:check đang đỏ vì việc dở của agent khác; E2E và bản đồ nhỏ trên HUD thật chưa xem; câu chữ chính sách riêng tư cho dữ liệu mới cần chốt; world-overview test đỏ không do pha này.
