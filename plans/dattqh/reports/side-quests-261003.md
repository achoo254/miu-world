# Nhiệm vụ phụ cho cả 128 minigame, nhân vật mời chơi trên 12 map

Ngày 03/10/2026 · Tier L · Không commit, không dependency mới.

## Kết quả

- Cả 128 game đều có nhiệm vụ phụ `content/quests/side-<game>.json`. Có 125 file mới, 3 file mẫu cũ ở Khu rừng giữ nguyên. Mỗi nhiệm vụ gồm hai câu mời có `{name}`, một câu bé đáp, một lời giao có mục tiêu viết bằng chữ, lời khen khi thắng, lời hẹn chơi tiếp và đủ 7 câu hỏi. Mục tiêu lấy đúng `goal` chuẩn trong `content/minigames/<id>.json`. Mỗi lần thắng được 15 XP và 5 xu, giống các file mẫu.
- Có 51 nhân vật mời chơi mới, mỗi người 2–4 trò, chia đủ 12 map. Mỗi map có 8–13 trò từ 3–5 nhân vật. Trò được gán theo bảng gán map trong `minigame-research-261003.md` §3: đa số theo map gợi ý đầu tiên, rồi cân lại để map nào cũng từ 8 trò trở lên.
- Mỗi nhân vật đứng cạnh mạng đường gần một địa danh hợp với trò của mình, và các địa danh trải khắp map. Ví dụ: Cánh Cụt Trượt Băng ở bờ hồ băng, Cáo Cung Thủ ở khu luyện tập, Chó Lùa Vịt ở bờ ao cá. Nhân vật luôn có mặt dù bé đang học bài nào (không gắn chương hay quest).
- Thêm 98 người và vật sống quanh các map (ambient, id `folk-*`): 1–2 người xem quanh mỗi nhân vật mời chơi, cộng tối đa 5 người dân mỗi map ở những địa danh còn trống (Nhà của bé không thêm). Mọi người đều được đặt đủ, không ai bị bỏ.
- Mục tiêu bài học và đồ vật trên 11 map lớn không xê dịch so với HEAD: khi so lại, interactable cũ không đổi, `props` giống hệt. Phần mới chỉ là nhân vật mời chơi và người dân.

| Map | Trò | Nhân vật mời chơi (nơi đứng): trò | Người, vật mới |
| --- | --- | --- | --- |
| Khu rừng bí mật | 11 | Khỉ Chuyền Cành (bãi rừng chương 2): `rope-swing`, `doodle-climb`; Vẹt Mỏ Cong (bãi chương 3): `flappy-fly`, `dodge-fall`; Nai Đom Đóm (bãi chương 4): `firefly-torch`, `cut-rope`; Thỏ Quét Lá (bãi chương 5): `leaf-blow`, `lane-runner`; cùng Vẹt (`runner`, `penalty-kick`) và Hải ly (`egg-catch`) có sẵn | 8 |
| Trường học | 13 | Hổ Còi Vàng (Sân bóng): `goalkeeper`, `da-cau`; Hươu Bóng Rổ (Sân bóng rổ): `basketball`, `tennis-rally`; Voi Trống Hội (Sân khấu sự kiện): `drum-beat`, `call-response`, `musical-chairs`; Gấu Trúc Bút Chì (Vườn trường): `dot-copy`, `scissor-trace`, `flow-connect`; Mèo Lớp Trưởng (Ruộng lúa): `red-light`, `cuop-co`, `co-caro` | 12 |
| Trung tâm | 13 | Lân Con Rộn Ràng (Khu sự kiện theo mùa): `lion-dance-arrows`, `lantern-parade`, `balloon-rule-pop`; Voi Kẹo Bông (Khu giao dịch): `cotton-candy`, `plinko`, `bowling`; Chó Cảnh Sát Còi (Tháp đồng hồ): `traffic-cop`, `kart-race`, `slot-cars`; Gấu Mũ Bảo Hộ (Cảng biển): `crane-drop`, `train-switch`; Cáo Phi Công (Khu học tập): `jetpack-hold`, `trampoline-rescue` | 9 |
| Làng Ven Sông | 12 | Bác câu cá Sơn (Bến sông): `bobber-fishing`, `boat-race`; Khỉ Cầu Tre (Cầu đá phía đông): `monkey-bridge`, `stick-bridge`, `road-cross`; Mèo Đầm Sen (Đầm sen): `duck-catch`, `pipe-connect`; Cô Hội Làng (Quảng trường làng): `dap-nieu`, `nem-con`, `tug-of-war`; Thỏ Ô Quan (Cánh đồng lúa): `o-an-quan`, `fireworks` | 10 |
| Xóm Mái Ấm | 12 | Mèo Trà Đá (Giếng xóm): `tea-slide`, `water-pour`; Chị Thỏ Nhảy Dây (Ngõ nhỏ ánh trăng): `jump-rope`, `hopscotch`, `chuyen`; Gấu Đưa Báo (Cánh đồng lúa): `paper-route`, `trash-sort`, `blueprint-build`; Khỉ Bắn Bi (Mép hồ sen): `marbles`, `pick-sticks`; Heo Rồng Rắn (Gò đất lộng gió): `snake-dragon`, `hide-and-seek` | 10 |
| Chợ phiên | 12 | Cô bánh mì Hạnh (Gian hàng đồ ăn): `recipe-assembly`, `stack-catch`, `fruit-merge`; Chú hội chợ Tí (Phố chợ): `water-pistol`, `dart-wobble`, `ring-toss-duck`, `inflate-balloon`; Voi Bốc Hàng (Bến hàng bên kênh): `block-fit`, `balance-scale`; Mèo Gắp Thú (Cầu hình rồng): `claw-machine`, `shell-game`, `match-3` | 9 |
| Nông trại | 9 | Bò Chuông Đồng (Đồng cỏ bò sữa): `milk-cow`, `blind-goat`, `kite-fly`; Heo Kho Hàng (Nhà kho chế biến): `conveyor-sort`, `simon-says`; Chó Lùa Vịt (Ao cá): `sheepdog-herd`, `chicken-feed`; Thỏ Giữ Vườn (Ruộng ngô): `whack-mole`, `farmer-defense` | 9 |
| Thư viện | 10 | Koala Ghép Tranh (Vườn đọc sách): `jigsaw`, `sliding-tiles`, `tangram`; Gấu Trúc Đàn Phím (Sân khấu lá vàng): `piano-tiles`, `memory-pairs`; Thỏ Ngắm Sao (Bãi cỏ quanh tháp): `star-connect`, `hanoi-tower`, `ball-sort-tubes`; Nai Trí Nhớ (Cầu đá bên hồ): `whats-missing`, `pair-link` | 7 |
| Lâu đài | 10 | Cáo Cung Thủ (Khu luyện tập): `archery-wind`, `slingshot-tower`, `quick-draw`; Voi Thủ Kho (Chợ nhỏ dưới chân thành): `crate-push`, `stack-slide`; Mèo Gương Thần (Vườn hoàng gia): `light-mirrors`, `maze-trace`; Gấu Gác Hầm (Hầm ngục): `pac-maze`, `hidden-objects`, `spot-diff` | 8 |
| Núi tuyết | 8 | Cánh Cụt Trượt Băng (Bờ hồ băng): `curling`, `ice-slide`; Gấu Trắng Lăn Tuyết (Bãi người tuyết): `snowman-roll`, `snowball-fight`; Cáo Tuyết Nhảy Cầu (Khu trượt tuyết): `ski-jump`, `sled-slalom`; Nai Leo Vách (Trạm thám hiểm): `rock-climb`, `scratch-reveal` | 7 |
| Đảo bí ẩn | 9 | Cua Lướt Sóng (Bãi biển): `wave-surf`, `swim-race`; Khỉ Hái Dừa (Rừng nhiệt đới): `fruit-slice`, `photo-snap`, `bubble-shooter`; Chú ngư dân Sóng (Bờ đá hải tặc): `reel-tension`, `package-drop`; Gấu Trúc Thám Hiểm (Khu di tích cổ): `treasure-dig`, `dig-tunnel` | 7 |
| Nhà của bé | 9 | Gấu Bánh Ngọt (Sân trước nhà): `banh-chung-wrap`, `banh-xeo-flip`, `candle-cake-spin`, `wipe-clean`; Thỏ Làm Vườn (Vườn rau cạnh nhà): `garden-cycle`, `weed-pull`, `lawn-mower`; Chó Giữ Ao (Cầu tàu bên ao): `goldfish-scoop`, `path-guide` | 2 |

Hầu hết nhân vật đứng cách địa danh của mình dưới 20 khối. Ba nhân vật đứng xa hơn: Mèo Trà Đá cách giếng xóm 27 khối, Heo Rồng Rắn cách gò đất 21 khối, và Chú hội chợ Tí đứng xa nhất, cách tâm phố chợ 46 khối, vì phố chợ toàn sạp và lối hẹp.

## Cách làm (chạy lại được)

- Nguồn duy nhất là `tools/content/side-quests/<vùng>.json`, mỗi vùng một bảng, schema ở `tools/content/side-quest-table.ts`. Mỗi bảng ghi: nhân vật (id, tên, look, `tint` nếu cần, `place` là tên địa danh hoặc `at` là cột), các trò kèm toàn bộ lời thoại, người đi cùng và người dân.
- `pnpm exec tsx tools/content/build-side-quests.ts` viết 125 file quest, upsert nhân vật vào `content/world/targets.json`, và chèn look tô màu riêng vào cuối `content/world/looks.json`. Look được chèn dạng chữ để các dòng viết tay như `1.0` giữ nguyên. Chạy hai lần liên tiếp không làm đổi gì. Bản sau tự bỏ qua file viết tay và báo nếu còn game chưa có người giao.
- Phần đặt lên map nằm ở `tools/world/side-givers.ts`, gọi từ `zone-map.ts` và `generate-forest-map.ts`:
  - Mạng đường được đọc giống `scenery-audit`: tính mọi ô đường còn hai khối trống phía trên, nên lối đi dưới vòm cổng vẫn được tính. Xe buýt, tàu và thuyền nối các mạng với nhau.
  - Nhân vật đứng ở ô gần địa danh nhất mà cách đường ≤ 2 khối. Ô đó phải là cỏ, cát, tuyết, đất hoặc mép quảng trường lát (không phải giữa lối hẹp), có trời trống phía trên, nằm ngoài nhà và bậc cửa, và cách mục tiêu khác ≥ 6 khối.
  - Nhân vật được đặt sau mọi mục tiêu bài học và không lấy số ngẫu nhiên, nên không làm xê dịch bài học nào.
- `place-quest-targets.ts`: mục tiêu chỉ nhiệm vụ phụ dùng được đặt không gắn tag. Quest phụ của chương riêng của map (Khu rừng chương 1) cũng được đặt.

## Quyết định nhỏ đã tự chốt

- **Tên người nói không còn tính là một câu thoại** (`content-variety.ts`). Trước đây tên dài từ 16 ký tự, như "Lân Con Rộn Ràng", bị báo lặp khi cùng nhân vật nói ở nhiều trò. Tên là nhãn chứ không phải nội dung. Mọi câu thoại, lời giao, lời khen và lời hẹn vẫn phải mới hoàn toàn, và cả 125 quest đều qua kiểm tra.
- **Look riêng cho 19 con vật** (`animal-monkey-khi-cau-tre`…): `content:check` chỉ cho mỗi look vẽ tối đa 6 nhân vật, nên tôi dùng màu tô như các look `animal-monkey-oi` đã có. Bốn nhân vật chibi được đổi sang bộ trang phục ít người dùng hơn.
- **Đổi chỗ đứng của ba nhân vật** sau khi sinh thử map:
  - Khỉ Bắn Bi: "Hồ sen" rộng khoảng 280 khối, giữa hồ không có bờ, nên chuyển sang "Mép hồ sen".
  - Cáo Cung Thủ: rừng thông phía đông Lâu đài là vùng map cố ý cấm đặt, nên chuyển sang "Khu luyện tập". Lời thoại đã sửa theo chỗ mới.
  - Ở Khu rừng, nhân vật đứng ở bốn bãi rừng của chương 2–5, ghi bằng tọa độ cột vì khu rừng không có địa danh ở đó.
- **Luật mới trong `content:check`:** người giao nhiệm vụ phụ phải có mặt ở mọi chương (không gắn `chapter`, `chapters` hay `quest`). Luật này có test riêng.
- **`scenery-audit` giờ đếm mỗi nhân vật mời chơi là một "nơi"**, nên nhân vật phải đứng cạnh mạng đường của chỗ xuất hiện. Cả 12 map đều đạt 0 lỗi.

## Kiểm tra

- `pnpm world:<map>` chạy qua lock cho đủ 12 map. Cảnh báo "only 7 blocks" của `tv2-t14-b25` (Xóm Mái Ấm) và `toan2-cd6-b30` (Thư viện) đã có từ trước: các mục tiêu bài học không đổi.
- Ba bản audit trên 12 map:
  - `scenery-audit`: tất cả 0 (cây trên đường, đồ chắn giữa lối, nơi xa đường, nơi bị tách khỏi mạng).
  - `room-audit`: tất cả "0 short".
  - `reach-audit`: tất cả "every target reached; starts clear".
- `pnpm assets:manifest` (qua lock): 1560 file pack và 2961 file sinh. `pnpm assets:check`: OK, 16 pack, 4521 file.
- `pnpm content:check`: OK, 1319 file. `pnpm content:spread`: 0/74 quest vi phạm, 0 nhân vật vượt giới hạn.
- `pnpm typecheck`: sạch (root, server, web). ESLint `--max-warnings=0` trên 14 file đã sửa: sạch.
- Vitest, chạy từng file, một worker:

  | File | Kết quả |
  | --- | --- |
  | `build-side-quests.test.ts` | 23/23 |
  | `side-givers.test.ts` | 6/6 |
  | `check-content.test.ts`, `content-variety.test.ts`, `quest-spread.test.ts` | 31/31 |
  | `zone-maps.test.ts` (thêm kiểm tra nhân vật mời chơi và người đi cùng) | 50/50 |
  | `generate-forest-map.test.ts` | 4/4 |
  | `generate-school-map.test.ts` | 5/5 |
  | `packages/schema/src/game.test.ts`, `home-decor-map.test.ts`, `mock-views.test.ts`, `model-catalog.test.ts` | 50/50 |

- Không chạy E2E và không chạy full `pnpm test`, đúng yêu cầu. Không sửa `apps/**` nên không cần build web.

## File

- Mới:
  - `tools/content/side-quest-table.ts`, `build-side-quests.ts`, `build-side-quests.test.ts`
  - `tools/content/side-quests/*.json` (12 file)
  - `tools/world/side-givers.ts`, `side-givers.test.ts`
  - `content/quests/side-*.json` (125 file)
- Sửa:
  - `tools/world/zone-map.ts`, `generate-forest-map.ts`, `chapters/place-quest-targets.ts`, `scenery-audit.ts`
  - `tools/world/zone-maps.test.ts`, `generate-forest-map.test.ts`
  - `tools/content/check-content.ts`, `check-content.test.ts`, `content-variety.ts`
  - `content/world/targets.json` (51 mục mới), `content/world/looks.json` (19 look mới)
  - `assets/generated/world/*/entities.json` (12 map), `assets/manifest.json` (sinh lại)
  - `docs/design-cac-map.md` (thêm một đoạn)

## Còn để phiên chính

- Ảnh chân dung trong hộp thoại: 51 nhân vật mới hiện chữ cái đầu tên trên huy hiệu, vì `npc-portrait.tsx` chỉ có icon cho Vẹt, Hải ly và cây cổ thụ. File đó nằm ngoài phạm vi của tôi.
- Bảng chọn trò: nhân vật có 3–4 trò sẽ mở màn chọn trò. Màn này đã có sẵn, nhưng chưa được kiểm trên E2E với 4 trò.
- `docs/minigames.md` chưa ghi cách thêm nhiệm vụ phụ bằng bảng và builder (file ngoài danh sách được sửa). Nên thêm một dòng trỏ tới `tools/content/side-quests/` và lệnh build.
- Trang review của đợt này và ảnh toàn cảnh (`pnpm world:overview`, `pnpm assets:home`) chưa làm lại. Nhân vật mới không làm đổi địa hình.
