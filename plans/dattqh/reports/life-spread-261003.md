# Rải NPC sinh hoạt hợp lý trên 11 map — báo cáo

Ngày 03/10/2026 · Plan `plans/dattqh/261003-1038-more-accessories-spread-life/` (mục "NPC sinh hoạt", pha 2) · Tier L

Người sở hữu: "mỗi map hiện tại rất lớn nhưng lượng npc sinh hoạt đang tập trung vào 1 chỗ nhiều quá… npc hiển thị ngẫu nhiên trên khu vực với bối cảnh hợp lý như ngoài đời thật".

## Kết quả

Đã sửa ở một chỗ dùng chung (`tools/world/village-life.ts`), và mười một map đều đi qua chỗ đó: mười map dựng bằng `zone-map.ts`, còn Khu rừng gọi thẳng `placeVillageLife`. Tổng số NPC mỗi map giữ nguyên, chỉ Lâu đài tăng 1 (167 → 168). Số ô có NPC tăng ở cả 11 map. Ở 10/11 map, ô đông nhất giữ được 12% trở xuống. Riêng Chợ phiên còn 17% vì 38 gian hàng nằm trong cùng một ô (xem phần Lưu ý).

## Số đo trước / sau (`pnpm exec tsx tools/world/life-audit.ts <map>`)

Map được chia thành 64 ô, mỗi ô 100 × 100 khối. "Ô có người ở" là ô có ≥ 40 cột đường (đường, ngõ, lối mòn, sân lát, ván cầu) hoặc có ít nhất một ngôi nhà. Cột "ô có người ở có NPC" là chỉ tiêu ≥ 60% của brief.

| Map | NPC trước → sau | Ô có NPC /64 | Ô có người ở có NPC | Ô đông nhất (tỉ lệ) | Gần chỗ xuất hiện (<120) | Ở cửa / giữa ngõ / trong nước, trước → sau |
| --- | --- | --- | --- | --- | --- | --- |
| Khu rừng `forest-ch1` | 243 → 243 | 26 → 34 | 11/19 (58%) → 19/19 (100%) | 29 (12%) → 29 (12%) | 38 → 39 | 0/0/0 → 0/0/0 |
| Trường học `truong-hoc` | 165 → 165 | 23 → 54 | 23/52 (44%) → 51/52 (98%) | 31 (19%) → 16 (10%) | 54 → 42 | 1/2/2 → 1/0/0 |
| Trung tâm `trung-tam` | 171 → 171 | 16 → 36 | 16/47 (34%) → 36/47 (77%) | 28 (16%) → 17 (10%) | 61 → 45 | 2/0/1 → 2/0/0 |
| Làng Ven Sông `lang-ven-song` | 140 → 140 | 17 → 45 | 16/44 (36%) → 39/44 (89%) | 24 (17%) → 9 (6%) | 5 → 7 | 0/0/5 → 0/0/0 |
| Xóm Mái Ấm `xom-mai-am` | 176 → 176 | 25 → 61 | 23/59 (39%) → 58/59 (98%) | 31 (18%) → 12 (7%) | 17 → 13 | 0/3/0 → 0/0/0 |
| Chợ phiên `cho-phien` | 269 → 269 | 9 → 56 | 9/55 (16%) → 54/55 (98%) | 119 (44%) → 47 (17%) | 100 → 61 | 0/0/1 → 0/0/0 |
| Nông trại `nong-trai` | 134 → 134 | 16 → 48 | 14/42 (33%) → 42/42 (100%) | 47 (35%) → 12 (9%) | 37 → 30 | 0/0/0 → 0/0/0 |
| Thư viện `thu-vien` | 126 → 126 | 12 → 48 | 12/60 (20%) → 48/60 (80%) | 33 (26%) → 11 (9%) | 37 → 24 | 1/2/0 → 1/0/0 |
| Lâu đài `lau-dai` | 167 → 168 | 22 → 52 | 22/56 (39%) → 48/56 (86%) | 24 (14%) → 12 (7%) | 15 → 11 | 1/0/6 → 1/0/0 |
| Núi tuyết `nui-tuyet` | 124 → 124 | 19 → 43 | 18/38 (47%) → 34/38 (89%) | 18 (15%) → 12 (10%) | 24 → 24 | 1/0/0 → 1/0/0 |
| Đảo bí ẩn `dao-bi-an` | 136 → 136 | 44 → 49 | 27/35 (77%) → 31/35 (89%) | 19 (14%) → 15 (11%) | 45 → 39 | 0/0/0 → 0/0/0 |

Cột "trong nước" không tính cá, cua và người cấy lúa đứng trong ruộng nước, vì những chỗ đó là đúng bối cảnh. Số "trước" cũng đã đếm lại theo cách này. Lần đo đầu tiên đếm cả 16 con cá biển ở Đảo bí ẩn, cá suối ở Khu rừng, và 4 người cấy lúa ở Trường học, Xóm Mái Ấm, Lâu đài.

## Quy tắc dùng chung (`tools/world/village-life.ts`, `spreadCast`)

Bước này chạy trước khi đặt NPC (`placeVillageLife`), nên mọi map đều qua:

1. **Ai được dời, ai đứng yên.** Chỉ dời người và vật trong một đám đông do `crowd()` tạo (cờ mới `spread`), và chỉ những routine có chỗ sống trong bảng `SETTLES`: khách đi chợ, người khuân vác, người quét, người đọc, học trò, bạn thả diều, người nấu, phơi đồ, tưới cây, làm vườn, người chèo đò hay câu cá, bò, lợn, chó, mèo, gà. Những người sau giữ nguyên chỗ: người bán hàng, thầy cô, thủ thư, bảo vệ, lính gác, người thổi kèn, người cấy, người cày, người vắt sữa, người nuôi gà ở ruộng, chuồng của họ. Ngoài ra còn thú hoang (khỉ, chim cánh cụt, gấu, chim, thỏ…), người có `facing` (đứng quầy) và mọi nhân vật generator đặt tay ở một chỗ (người đón ở bến xe, thuyền trưởng, kiểm lâm ở chòi…).
2. **Trần mỗi ô.** Không ô 100 × 100 nào giữ quá 9% số NPC của map (ít nhất 8). Người dư được chọn ngẫu nhiên theo seed trong số người tự do của ô, nên đám đông nào cũng còn người của mình. Nếu NPC đứng yên đã vượt trần (gian hàng chợ), ô đó vẫn giữ một phần ba trần cho khách đi lại, để chợ còn đông vui.
3. **Đi đâu.** Bản đồ "chỗ có người ở" được lấy mẫu mỗi 5 khối, chỉ trên đất trống, ngoài nhà và thềm cửa (cách nhà ≥ 3 ô), không giữa ngõ, không trong nước. Có bốn loại chỗ:
   - `street`: sát đường hoặc lối đi, trong vòng 3 khối;
   - `yard`: sân nhà, cách nhà 3–6 khối và gần đường;
   - `shore`: bờ nước, cách nước ≤ 3 khối và cách đường ≤ 16 khối;
   - `pasture`: bãi cỏ trống, cách đường 4–18 khối, xa nhà, không cây quanh.

   Mỗi loại NPC có chỗ hợp với nó: khách đi chợ, người khuân vác đứng bên đường; học trò, người nấu, chó, mèo, gà ở sân; người chèo đò, câu cá ở bờ nước; bò, lợn, bạn thả diều ở bãi cỏ. Họ sang ô đang thưa nhất so với lượng đất có người ở của ô, và ô gần được ưu tiên khi ngang nhau. Chỗ quanh một người vừa dời tới (±10 khối) không nhận thêm ai, để NPC không đứng chồng lên nhau. Đất hoang xa đường không bao giờ nhận NPC.
4. **Lấp ô vắng.** Mỗi ô có người ở mà còn trống thì nhận một người tự do hợp chỗ, lấy từ ô đông nhất còn dư (đang giữ quá nửa trần). Các ô quanh chỗ xuất hiện (tâm ô cách < 120 khối) không phải nhường người, để chỗ bé vừa tới vẫn đông vui.
5. Người được dời vẫn giữ tên, model và đồ cầm, nhưng bỏ `visits` (vòng đi qua các quầy cũ, giờ đã xa). Mọi thứ đều cố định theo seed của map.

Ngoài ra, có hai chỉnh nhỏ áp cho mọi NPC, không chỉ người được dời:

- Nhà (`home`) và chỗ làm (`work-*`) của NPC không đặt giữa ngõ hẹp (≤ 7 khối, đúng luật của `scenery-audit`). Lỗi này trước gặp ở Trường học 2, Xóm Mái Ấm 3, Thư viện 2, nay là 0.
- Ở map dựng bằng `zone-map`, NPC không đứng trong hồ, giếng, đài phun nước do generator xây (`inWater` có xét khối nước trên mặt đất). Lỗi này trước gặp ở Làng Ven Sông 5, Lâu đài 6, Trung tâm 1, Trường học 2, Chợ phiên 1, nay là 0.

Các hằng số (`SPREAD_SHARE` 0.09, `MIN_CAP` 8, `KEEP_FREE` 1/3, `SPAWN_KEEP` 120, `SPOT`, `SETTLES`) nằm ở đầu `village-life.ts`. Đổi ở đó là áp cho cả 11 map.

## Chỉnh riêng từng map

- **Chợ phiên** (`generate-cho-phien-map.ts`): khách đứng trước quầy (mỗi hai gian một người, do `shopperRounds` tạo thêm) được đánh dấu `spread`, nên số dư theo trần sẽ ra các phố khác của thị trấn. 38 người bán ở ô quảng trường giữ nguyên, vì người sở hữu đã quyết định giữ mọi gian hàng (02/10/2026). Ô đó còn 47 NPC (trước 119).
- **Khu rừng** (`generate-forest-map.ts`): chỉ truyền thêm `isWay` (lối mòn) và `spawn` cho `placeVillageLife`. Phần sống quanh trại (`forest-life.ts`) không đổi.
- Không map nào khác cần chỉnh riêng.

## File đã sửa

- `tools/world/village-life.ts`: thêm `spreadCast`, `livedSpots`, `distanceField`, `inLane`; `LifeGround` có thêm `isWay`, `spawn`, `nearBuilding?`; `Resident.spread`; `crowd()` đặt `spread: true`; export `LIFE_CELL`.
- `tools/world/zone-map.ts`: truyền `isWay` (khối đường trên mặt đất hoặc lát cao một khối), `nearBuilding` (vùng `keepOut` của nhà), `spawn` và `inWater` có xét nước do generator xây.
- `tools/world/generate-forest-map.ts`, `tools/world/generate-cho-phien-map.ts`: chỉnh như trên.
- `tools/world/scenery-audit.ts`: tách `readGeneratedMap`, `blockIds`, `wayChecks` để dùng chung, và export `LANE_WIDTH`. Kết quả audit không đổi: 11/11 map vẫn 0/0/0/0.
- `tools/world/life-audit.ts` (mới).
- `assets/generated/world/*/entities.json` của 11 map. Chỉ phần `ambients` đổi, file vùng (`regions/*.bin`, `horizon.bin`) không đổi. Riêng Khu rừng còn đổi cả mục quest và `chapterSpawns` (xem Lưu ý).
- `assets/manifest.json`: sinh lại một lần qua `with-lock.mjs pnpm assets:manifest` (1455 file pack, 2114 file sinh). Diff của manifest có cả file phụ kiện của các agent khác đang làm song song.

## Kiểm tra đã chạy

- `scenery-audit.ts` cả 11 map, chạy sau lần sinh cuối: đều "0 trees on a way, 0 solid props in a lane, 0 places off the ways, 0 places on ways cut off".
- `room-audit.ts` từng map sau khi sinh lại: đều "0 short". Số không gian có mái: forest 8, truong-hoc 248, trung-tam 284, lang-ven-song 165, xom-mai-am 174, cho-phien 350, nong-trai 93, thu-vien 545, lau-dai 365, nui-tuyet 65, dao-bi-an 13.
- `reach-audit.ts` từng map sau khi sinh lại: đều "every target reached; starts clear".
- `life-audit.ts` 11 map: kết quả ở bảng trên.
- Test, chạy lần lượt từng cái, 1 worker:
  - `pnpm vitest run tools/world/generate-forest-map.test.ts`: 4/4 pass.
  - `generate-school-map.test.ts`: 5/5 pass, sau khi sinh lại school lần cuối.
  - `model-catalog.test.ts`: 2/2 pass.
  - `zone-maps.test.ts -t "<map>"` cho 9 map (lang-ven-song, xom-mai-am, cho-phien, nong-trai, thu-vien, lau-dai, trung-tam, dao-bi-an, nui-tuyet): mỗi map 4 pass, 32 skip.
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi.
- `pnpm exec eslint` trên các file đã sửa (`village-life.ts`, `life-audit.ts`, `scenery-audit.ts`, `zone-map.ts`, `generate-forest-map.ts`, `generate-cho-phien-map.ts`) với `--max-warnings=0`: 0 lỗi, 0 cảnh báo.
- Manifest: đã đối chiếu sha256 của 11 file `entities.json` với `assets/manifest.json`, cả 11 khớp.
- Không chạy E2E, `pnpm test` hay perf, đúng theo yêu cầu.
- Cảnh báo có sẵn từ trước, không liên quan đến thay đổi này (xếp quest chạy trước bước đặt NPC):
  - thu-vien: `toan2-cd6-b30` "phòng lịch trên tháp" chỉ cách 7 khối;
  - xom-mai-am: `tv2-t14-b25` "bụi hoa tỉ muội", "vách tổ ong" chỉ cách 7 khối.

## Lưu ý

- **Chợ phiên, ô quảng trường còn 17%.** 38 người bán trong ô này là bất biến, vì mọi gian hàng đều được giữ. Muốn xuống ≤ 12% thì phải bớt gian hàng hoặc dời gian sang ô khác. Đó là quyết định sản phẩm, nên tôi không tự làm.
- **Khu rừng đổi vị trí quest chương 2–5.** Ở map này, quest chương 2–5 được đặt sau NPC và phải tránh chỗ của NPC. Khi NPC dời, 69/85 mục quest và `chapterSpawns` của chương 4, 5 (lệch 2–3 khối) đổi chỗ. Quest vẫn nằm trong khu của chương mình, và test của map cùng reach-audit đều pass. Tiến độ người chơi lưu theo id quest nên không ảnh hưởng. Mười map còn lại đặt quest trước NPC, nên quest không đổi.
- Còn 6 NPC đứng ngay thềm cửa, đều có từ trước và không phải người được dời: `truong-hoc` vendor-2, `trung-tam` home-cook-1 và dog-7, `thu-vien` pupil-22, `lau-dai` chick-13, `nui-tuyet` dog-4. Người được dời không bao giờ đứng ở thềm cửa, vì chỗ nhận cách nhà ≥ 3 ô. Muốn sửa chung cho NPC đặt tay thì cần một phép dò cửa trong generator (như `room-audit`), tốn hơn và sẽ xê dịch cả khách đứng trước quầy. Tôi chưa làm.
- Người được dời giữ tên cũ. Vài tên gắn với nơi chốn (ví dụ "Khách xem chó mèo", "Mèo hàng cá") giờ đứng ở phố hoặc sân khác. Việc dời ưu tiên ô gần, nhưng vẫn có thể xa.
- Runtime (`apps/web/src/game/ambient/*`) không cần sửa. Nó vẫn chỉ vẽ vài NPC gần nhất, mà tổng số NPC thì không đổi.

Status: DONE_WITH_CONCERNS
Summary: Đã thêm quy tắc rải NPC dùng chung trong `village-life.ts` (trần 9% mỗi ô 100 × 100, dời người tự do của đám đông tới chỗ hợp bối cảnh: đường, sân, bờ nước, bãi cỏ; lấp ô có người ở còn vắng; giữ nguyên người bán, thầy cô, bảo vệ, người làm ruộng) cùng công cụ `life-audit.ts`, rồi sinh lại 11 map. Số ô có NPC tăng ở mọi map, 77–100% ô có người ở đã có NPC, tổng số NPC giữ nguyên, và các audit, test được giao đều sạch.
Concerns/Blockers: Ô quảng trường Chợ phiên còn 17% vì 38 gian hàng được giữ theo quyết định của người sở hữu. Quest chương 2–5 của Khu rừng đổi chỗ theo NPC. Còn 6 NPC đặt tay đứng ở thềm cửa từ trước.
