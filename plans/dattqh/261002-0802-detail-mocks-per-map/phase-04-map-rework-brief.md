# Pha 4 — làm lại một map theo tấm mock chi tiết (bản giao việc cho agent)

Tier: L mỗi map. Plan: `plan.md` cùng thư mục. Quyết định: `plans/dattqh/reports/jev-261002-0802-detail-mocks.md`.

## Bối cảnh

Miu World là game voxel 3D học tập cho bé lớp 2, AI làm 100%, người sở hữu chỉ duyệt kết quả. Người sở hữu gửi tấm mock chi tiết từng khu (đã cắt thành khung ở `designs/<thư mục>/{c,d}-NN-*.png`) và yêu cầu: bối cảnh, NPC, không gian chi tiết như mock; nền đất mỗi map một màu hợp bối cảnh. Đích: người duyệt đặt mỗi khung mock cạnh cùng góc trong game và thấy rõ là một nơi.

Jev đã quyết (không hỏi lại):

- Làm lại bố cục theo khung toàn cảnh (công trình chính, đồi, vách đá có thác, sông, quảng trường, lối cong, cụm nhà tự nhiên thay lưới) nhưng **giữ nguyên `ZONES`** (vị trí, kích thước khu bài học) và mọi quest vẫn đặt được.
- Công trình chính đi vào được và bày đồ theo khung nội thất, ưu tiên phòng có bài học. Không dựng phòng cho mọi khung.
- Cảnh đêm: đèn lồng phát sáng (prop hộp có `glow`), không làm chu kỳ ngày đêm.

Đọc trước: `CLAUDE.md`, `.claude/rules/assets-pipeline.md`, `docs/design-cac-map.md`, generator của map mình, `tools/world/zone-map.ts`.

Người sở hữu nhắc thêm (02/10/2026):

- Nội thất phải bám sát từng khung mock (vật liệu tường/sàn, cột, cửa sổ, đèn phát sáng, đồ bày, màu); phòng đủ rộng, trần đủ cao để nhìn từ camera bám bé (tường/trần che sẽ tự mờ).
- Trong tường thành, sân, quảng trường, phố: nền lát gạch/đá (`paver`, `cobble`, `cobble-grey`), không để cỏ xanh; cỏ chỉ ở bồn hoa, vườn, ngoài thành.

## Bộ dựng chung đã có (chỉ đọc, đừng sửa)

- `zone-map.ts`: spec có `soil: { grass, path }` (nền riêng của map; vùng đất ngoài map theo nó); ngữ cảnh `ctx.soil.{grass,path}` (id khối), `ctx.keptOut(x, z, pad)`.
- Khối mới (`content/blocks.json`): cỏ theo map `grass` (trường), `grass-forest`, `grass-village`, `grass-hamlet`, `grass-farm`, `grass-library`, `grass-castle`, `grass-market`; `cobble` (đá lát ấm), `cobble-grey`, `paver` (đá lát gạch), `trail` (đường đất), `farmland` (đất cày), `wheat` (lúa vàng, đặt cao một khối trên mặt đất, đi xuyên được), `lantern` (khối đèn vàng, đèn tường), `iron` (sắt đen).
- `scenery.ts`: `cottagePalette(ctx)` (có `finish`: chân đá, khung gỗ, kính, bậu hoa, nóc, đầu hồi, ống khói, đèn tường), `streetHouses(ctx, route, {setback, gap, sides})` (dãy nhà hai bên đường quay cửa ra đường, vườn trước, rào, bụi, đèn), `laneVerge(ctx, route, {spacing, lampEvery})` (viền lối: đèn lồng, bụi khối, hoa, rào), `STREET_LANTERN` (cột đèn lồng mảnh phát sáng — dùng thay `lampRow`/`light-curved`), `cottageRow`, `hamlet`, `fieldPlot`, `flowerBed`, `bambooHedge`, `jetty`.
- `structures/landmarks.ts`: `placeTower` (tháp tròn mái nhọn có cờ), `placeBanner` (cờ treo có huy hiệu), `placeGateArch` (cổng vòm mái ngói có cờ, trả về chỗ đèn, biển), `placeArchBridge` (cầu đá vòm), `placePlaza` (quảng trường tròn lát đá có viền), `placeWaterfall` (thác xuống vách vào hồ).
- `structures/countryside.ts`: `placeStall` (sạp mái sọc dốc, kệ sau, thùng hai bên; trả `counter`, `seller`, `shelf`, `crates`), `placeWindmill` (chân đá, cánh mạng lưới), `placeFountain` + `placeCatStatue` (tượng mèo trắng bằng khối — mock trường, chợ, lâu đài, trung tâm đều có), `placeLighthouse`, `placeWell`, `placeCottage`.
- `structures/buildings.ts`: `placeHouse(world, x0, z0, w, d, wallHeight, baseY, {wall, roof, trim, ...finish})` trả `door`, `lamps`, `boxes` (đầu bậu hoa); `placeCastle`, `placeMountain`.
- `structures/world-writer.ts`: `facingWriter(world, origin, facing)` + `FRAME`, `frameCell`, `turnCell`, `facingOf` để dựng công trình trong khung riêng rồi xoay mặt ra hướng bất kỳ.
- `structures/school.ts`: lớp học, nội thất (`FurnitureKind`), sân bóng rổ, nhà kính, luống.
- `village-life.ts`: `crowd(routine, names[], models[], at, radius, count, held?)`, `person(letter a–r)`, `animal(...)`. Vai: `vendor`, `shopper`, `porter`, `ferryman`, `rice-planter`, `kite-flyer`, `home-cook`, `laundry`, `waterer`, `milker`, `hen-keeper`, `ploughman`, `sweeper`, `school-guard`, `pupil`, `teacher`, `reader`, `librarian`, `sentry`, `trumpeter`, `cow`, `pig`, `dog`, `cat`, `chick` (và `fisher`, `gardener`, `cook`, `bunny`, `deer`, `fox`…). Tên tiếng Việt, đa dạng, không lặp.
- Map thí điểm đã làm: `tools/world/generate-lang-ven-song-map.ts` (cổng làng, quảng trường, sạp, tháp chuông, cối xay giữa ruộng lúa, cầu đá, đường làng có nhà hai bên) — xem làm mẫu cách dùng bộ dựng.

Cần thêm khối dựng chung? Đừng sửa tệp chung: viết helper riêng của map trong tệp mới `tools/world/structures/<map>-*.ts`, và ghi đề xuất vào báo cáo.

## Prop dựng bằng hộp (đồ pack không có)

Đồ chi tiết như mock (bảng tin, thùng hàng, bia tập bắn, ngai vàng, bàn ăn dài, đèn chùm, kệ sách có nhãn, quả địa cầu lớn, xe đẩy, bù nhìn, guồng nước, ô dù, bảng nhiệm vụ có dấu "!"…) dựng bằng hộp màu trong **tệp riêng của map** `content/world/box-props/<map>.json`:

```json
{ "version": 1, "props": { "<map-viết-tắt>-<tên>": { "boxes": [ { "from": [x,y,z], "to": [x,y,z], "color": "#rrggbb", "glow": true } ] } } }
```

Đơn vị là khối (1 = một khối); gốc ở tâm đáy; `glow` cho phần tự sáng (kính đèn, cửa sổ sáng). Id phải duy nhất trên mọi map: đặt tiền tố tên map. Mỗi prop mới thêm một dòng chiều cao vào `content/world/models.json` bằng công cụ Edit, chèn đúng vị trí sắp xếp, không viết lại cả tệp (agent khác cũng sửa tệp này; Edit lỗi vì tệp đổi thì đọc lại rồi làm lại). Rồi: `node <LOCK> pnpm assets:box-props` và `node <LOCK> pnpm assets:manifest`. Model pack đang có nằm ở `assets/packs/kenney-*` (bộ lâu đài có tháp, cờ, cổng; nội thất; thiên nhiên; sinh tồn; đồ ăn); model mới từ pack cũng cần một dòng trong `models.json` và có trong manifest.

## Góc chụp đối chiếu

Tệp `content/world/mock-views/<map id>.json` (schema `tools/world/mock-views.ts`): mỗi khung một góc, đặt tại một landmark của map (`ctx.landmark(id, tên, x, z, y?)`), `eye`/`look` là độ lệch tính bằng khối từ landmark, `fov`. Mẫu: `content/world/mock-views/lang-ven-song.json`. Khung nội thất: đặt camera trong phòng (eye thấp, ~1,6 khối trên sàn). Khung toàn cảnh cần thấy núi, thác ở xa: thêm `"reach": 400` (số khối nạp quanh mốc, mặc định 140). Khung đêm/chiều tối: thêm `"mood": "dusk"` (bầu trời chiều tối). Khối `lantern` và hộp có `glow` tự phát sáng: dùng cho đèn, cửa sổ sáng ban đêm.

## Vòng làm việc

1. Sửa generator → `pnpm exec tsx tools/world/generate-<tệp>.ts` (hoặc `pnpm world:<map>`; ~40 s).
2. Chụp riêng ảnh đối chiếu: `PREVIEW_ONLY=mock__ node <LOCK> pnpm assets:preview <map id>` (2–3 phút; khóa bảo đảm chỉ một bản chụp chạy một lúc, chờ khóa là bình thường).
3. Ghép so sánh: `~/.claude/skills/.venv/bin/python3 <COMPARE> <map id>` → mở các tệp `cmp-<map>-*.jpg` mới nhất trong thư mục scratchpad bằng Read (mỗi lần chạy tên tệp khác).
4. So từng khung: bố cục, công trình chính, màu nền và mái, độ dày chi tiết quanh người xem (đèn, hoa, rào, thùng, người), người và vật. Sửa, lặp lại. Ít nhất ba vòng; dừng khi mọi khung đọc rõ là nơi trong mock hoặc phần còn thiếu cần quyết định ngoài phạm vi.
5. Cuối: chụp đủ bộ ảnh map (không `PREVIEW_ONLY`): `node <LOCK> pnpm assets:preview <map id>`.

## Kiểm tra (chỉ phần của mình, máy dev một worker)

- `pnpm vitest run tools/world/zone-maps.test.ts -t "<map id> map"` (Trường học: `tools/world/generate-school-map.test.ts`; Rừng: `tools/world/generate-forest-map.test.ts`) — "matches the committed output" chỉ cần map đã sinh lại; mọi test khác của map phải xanh.
- `pnpm vitest run tools/world/mock-views.test.ts tools/world/model-catalog.test.ts tools/assets/build-box-props.test.ts`
- `pnpm exec tsc --noEmit -p tsconfig.json`, `pnpm exec eslint <các tệp đã sửa> --max-warnings=0`
- Không chạy cả bộ test, không chạy E2E, không chạy `perf`.

## Quy tắc

- Chỉ sửa: generator của map (và tệp đời sống riêng nếu có), `content/world/mock-views/<map>.json`, `content/world/box-props/<map>.json`, tệp mới `tools/world/structures/<map>-*.ts`, các dòng mới trong `content/world/models.json`, dòng màu cỏ của map trong `content/palette.json` (nếu cần chỉnh màu nền), ảnh sinh ra của map. Không sửa tệp chung khác; không `git add`, không commit (phiên chính commit).
- Không asset Minecraft, không vẽ tay, không ảnh AI; chỉ khối, pack có license, prop hộp.
- Hiệu năng: tổng prop của map dưới khoảng 20.000 (Làng Ven Sông ~12.000); khối rẻ hơn prop — hình lớn dùng khối, chi tiết nhỏ dùng prop.
- Hook môi trường chặn lệnh Bash chứa chữ "target" hoặc "coverage" và truy cập `node_modules`: ghi tệp có các chữ đó bằng Write/Edit, đọc bằng Read.
- Comment code tiếng Anh theo giọng tệp hiện có; tên test, comment không ghi mã plan/pha.

## Báo cáo

Ghi `plans/dattqh/reports/map-<map id>-261002-detail-mocks.md` (tiếng Việt): mỗi khung một dòng (đạt / gần / chưa + điều còn thiếu), thay đổi chính, số prop/người/vật, kết quả kiểm tra (số test đạt/trượt, lỗi tsc/eslint), đề xuất cho bộ dựng chung, câu hỏi còn mở. Kết thúc câu trả lời bằng:

```
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: một hai câu
Concerns/Blockers: tùy
```
