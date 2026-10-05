# Màn tải nhanh, đúng nhân vật, mẹo mới; chim vỗ cánh — report 06/10/2026

Plan: `plans/dattqh/261005-2246-loading-and-birds/plan.md` · Tier M · nhánh `main` · chưa push, chưa deploy.

## Kết quả

| Lỗi người sở hữu báo (05/10/2026) | Đã sửa |
| --- | --- |
| Màn tải đứng lâu ở 80–100%, cả khi quay lại map | Quay lại Trung tâm (CPU chậm 4×, mạng 20 Mbps): **8,6 s → 1,8 s** từ lúc bấm tới lúc vào chơi; phần sau khi đất quanh bé đã có: **5,5 s → 0,4 s**. Lần vào đầu: 13,6 s → 6,8 s. |
| Màn tải hiện nhân vật mặc định | Màn tải vẽ đúng loài của người chơi và hàng ô các món đang mặc; khi chưa biết thì đảo trống, không bao giờ hiện nhân vật khác. |
| Mẹo không đổi (2 câu) | 28 mẹo song ngữ phủ các tính năng; đổi mẹo mỗi 6 giây, không lặp ngay mẹo vừa hiện. |
| Chim bay không vỗ cánh | Đã kiểm khi chạy: skin gộp có theo cánh, nhưng nhịp vỗ cũ quá nhỏ. Nay cánh dang rộng hơn, vỗ biên độ lớn, thân nhấp nhô theo nhịp, lượn ngắn. |

## 1. Màn tải

### Cách đo

- Bản build production (`vite build` + `vite preview` ở 4173, server PGlite trong RAM), Playwright 1 worker, tài khoản thử có trang phục (`hat-witch-pink`, `backpack-brown`) và thú cưng `cun-con`.
- Hai map: Khu rừng (`forest-ch1`) và Trung tâm (`trung-tam`, map đông nhất), mỗi map ở `quality=low` và `quality=high`.
- Bốn lần vào mỗi map: lần đầu (cache trống), hai lần quay lại (HUD "Bản đồ" rồi "Quay lại game", không tải lại trang), một lần tải lại trang.
- Điều kiện giống máy thật: CDP giả lập CPU chậm 4× và mạng 20 Mbps, trễ 40 ms. Đo thêm một lượt không giả lập, xem bảng ở cuối mục.
- Mốc thời gian lấy từ `window.__miuStats.boot`: mili giây từ lúc game bắt đầu dựng tới từng mốc. Mốc này nay có sẵn trong code để đo lại về sau.

### Trước khi sửa: thời gian đi đâu (giả lập chậm)

Thanh tải cũ có 5 mốc bằng nhau. Mốc 80% là lúc dựng xong đất quanh bé (`settle`). Sau mốc đó game còn tải mọi model, rồi mới tới thú cưng, phần dựng còn lại và khung hình đầu.

| Đoạn (ms) | Rừng low, lần đầu | Rừng low, quay lại | Trung tâm high, lần đầu | Trung tâm high, quay lại |
| --- | ---: | ---: | ---: | ---: |
| React đọc dữ liệu người chơi (trước khi dựng game) | 2307 | 465 | 2302 | 672 |
| Renderer + manifest | 264 | 71 | 283 | 77 |
| Dữ liệu map | 669 | 481 | 671 | 427 |
| Dựng đất quanh bé (tới mốc 80%) | 503 | 429 | 2176 | 1955 |
| **Model, từ 80%: đồ vật (`props`) chiếm gần hết** | **4251** | **3221** | **7393** | **5135** |
| Thú cưng (tải sau model) | 150 | 109 | 8 | 5 |
| Dựng phần còn lại + khung hình đầu | 389 | 239 | 731 | 368 |

Nguyên nhân (đã đo):

1. `loadProps` chờ từng model đồ vật một (`for … await`): mỗi file tốn một lượt mạng cộng thời gian parse. Trung tâm có hàng chục model, nên đoạn này mất 5–7 s.
2. Mỗi lần vào map, kể cả quay lại đúng map đó, game tải và parse lại mọi GLB và đọc lại manifest.
3. Kế hoạch vùng ngoài (`planOutland` + `outlandEntities`) được tính lại mỗi lần, khoảng 325 ms khi CPU chậm 4×.
4. Thú cưng chỉ bắt đầu tải sau khi mọi model xong.
5. `settle` chờ mọi vùng trong tầm nhìn cộng phần tải trước (110 + 96 khối ở `high`), dù khung hình đầu không cần tới.
6. Thanh tải đứng yên ở 80% trong suốt đoạn model, nên trông như treo.

### Đã sửa

- `loadProps` tải mọi model cùng lúc rồi xử lý theo thứ tự cũ (`apps/web/src/game/entities/props.ts`).
- Model bắt đầu tải ngay khi có `entities.json`, song song với lúc dựng đất: nhân vật, mục tiêu quest, đồ vật, thú cưng, và model của người, vật quanh chỗ xuất phát (`preloadAmbientModels`). Việc nào lỗi sẽ báo lỗi khi được chờ, không có lỗi "unhandled" (`apps/web/src/game/game.ts`).
- `ModelCache` / `GAME_MODELS` (`apps/web/src/game/asset-loader.ts`) giữ các model đã parse qua các lần vào map, gồm map đang chơi và map trước đó. Model không dùng ở hai lần gần nhất thì bỏ. Mọi nơi dùng model đều clone hoặc chỉ đọc. `Game.dispose()` vẫn giải phóng phần GPU như cũ; renderer mới tự upload lại. Preview của màn tạo nhân vật dùng cache riêng.
- Manifest đọc một lần mỗi trang (`AssetRegistry.shared()`), bắt đầu đọc ngay khi màn chơi mở, song song với API người chơi.
- Kế hoạch vùng ngoài giữ cho 2 map gần nhất. Ảnh atlas tải song song với các file map (`apps/web/src/game/world/world-data.ts`).
- Khung hình đầu chỉ chờ đất trong 48 khối quanh bé (`settle(x, z, reach)`). Phần còn lại của tầm nhìn và vùng phía trước vào dần ở các khung sau, như lúc bé đi lại. Ảnh review (`shot=`) vẫn chờ đủ (`apps/web/src/game/world/world-renderer.ts`).
- Thanh tải chạy theo phần việc thật: file map 0–18%; đất (22%) và model (50%, tăng theo từng file xong) chạy song song; 95% khi dựng xong; khung hình đầu thì đóng màn tải. Mốc 80% không còn đứng lâu nữa.
- Các API không cần cho khung hình đầu đã không chặn từ trước (người mời minigame, người kể chuyện chạy nền). API người chơi (`/character`, `/progress`, `/quests`, `/player-positions`) là cần: chúng quyết định map, chương, trang phục và chỗ đứng.

### Sau khi sửa (cùng điều kiện giả lập chậm)

| Map | Chất lượng | Lần vào | Bấm → vào chơi (trước) | Bấm → vào chơi (sau) | Từ lúc có đất quanh bé → vào chơi (trước) | (sau) |
|---|---|---|---:|---:|---:|---:|
| Khu rừng | low | Lần đầu | 8.5 s | 6.1 s | 4.8 s | 0.7 s |
| Khu rừng | low | Quay lại 1 | 5.0 s | 1.3 s | 3.6 s | 0.3 s |
| Khu rừng | low | Quay lại 2 | 5.2 s | 1.5 s | 3.6 s | 0.3 s |
| Khu rừng | low | Tải lại trang | 5.8 s | 3.5 s | 3.6 s | 0.6 s |
| Khu rừng | high | Lần đầu | 10.0 s | 6.1 s | 4.8 s | 0.7 s |
| Khu rừng | high | Quay lại 1 | 6.7 s | 1.7 s | 3.6 s | 0.3 s |
| Khu rừng | high | Quay lại 2 | 6.7 s | 1.7 s | 3.6 s | 0.3 s |
| Khu rừng | high | Tải lại trang | 7.3 s | 3.5 s | 3.6 s | 0.7 s |
| Trung tâm | low | Lần đầu | 11.7 s | 7.0 s | 7.8 s | 0.5 s |
| Trung tâm | low | Quay lại 1 | 7.1 s | 1.5 s | 5.4 s | 0.4 s |
| Trung tâm | low | Quay lại 2 | 7.1 s | 1.6 s | 5.4 s | 0.3 s |
| Trung tâm | low | Tải lại trang | 7.8 s | 3.7 s | 5.5 s | 0.4 s |
| Trung tâm | high | Lần đầu | 13.6 s | 6.8 s | 8.1 s | 0.5 s |
| Trung tâm | high | Quay lại 1 | 8.6 s | 1.8 s | 5.5 s | 0.4 s |
| Trung tâm | high | Quay lại 2 | 8.7 s | 1.8 s | 5.5 s | 0.4 s |
| Trung tâm | high | Tải lại trang | 9.4 s | 3.6 s | 5.6 s | 0.5 s |

Ghi chú về cột "sau":

- Ở lần vào đầu, model tải trùng lúc với dựng đất, nên cột "từ lúc có đất → vào chơi" nhỏ một phần vì vậy. Cột "bấm → vào chơi" là con số người chơi cảm thấy.
- Khi quay lại Trung tâm `high`, 1,8 s chia ra như sau: React đọc dữ liệu người chơi 0,68 s, dữ liệu map 0,14 s, dựng đất 0,30 s, model 0,06 s (đã có trong cache), dựng phần còn lại 0,14 s, khung hình đầu 0,24 s.
- Lần vào đầu giờ chủ yếu là thời gian tải file. JS và API mất khoảng 2,3 s. Các file GLB chạy song song nhưng vẫn phải tải hết qua mạng 20 Mbps.

Không giả lập (Mac dev, mạng localhost), bấm → vào chơi:

| Map | low: lần đầu / quay lại / tải lại | high: lần đầu / quay lại / tải lại |
| --- | --- | --- |
| Khu rừng | 1,38 / 0,69 / 1,16 s | 1,30 / 0,74 / 1,26 s |
| Trung tâm | 1,30 / 0,82 / 1,27 s | 1,27 / 0,69 / 1,22 s |

Lượt đo trước khi sửa trên máy này (Khu rừng, không thú cưng): sau mốc 80% mất 0,24–0,36 s. Máy dev nhanh nên không thấy lỗi; lỗi chỉ lộ ra khi CPU chậm và mạng có độ trễ thật.

Draw call không đổi so với trước khi sửa. Đo trên GPU Mac, 1,5 s sau khi vào chơi: Khu rừng `high` 178–183, Trung tâm `high` 305–309; trước khi sửa là 180–186 và 306–309. Ngân sách 150 được kiểm trên CI bằng GL phần mềm, đó là thước đo chuẩn của repo (`e2e/stats.ts`). E2E `play` và `maps` (Trung tâm) vẫn qua.

## 2. Nhân vật trên màn tải

- `LoadingOverlay` nhận `look = { species, outfit }`. Đảo vẽ ảnh của loài đó (`SPECIES_ART`, cùng nguồn với chân dung HUD). Bên dưới là hàng ô các món đang mặc theo thứ tự ô của tủ đồ: mũ, kính, khăn, đồ đeo lưng, cánh, giày, đồ cầm tay, quần áo (khi chưa chọn thì là quần áo mặc định của loài), xe. Ảnh món lấy từ ảnh ô của màn tạo nhân vật.
- Trước khi dữ liệu người chơi về, màn tải dùng hình dáng đã lưu trong phiên (`sessionStorage`, chỉ loài và id món, khóa theo id người chơi). Quay lại map hay tải lại trang thì hiện đúng nhân vật ngay. Lần đầu trong phiên thì đảo trống vài trăm mili giây, không hiện Miu thay cho người chơi.
- Đã chụp màn tải khi chạy thật: mèo với hàng ô mũ, cặp, áo.

## 3. Mẹo

- Có 28 mẹo song ngữ (`loading.tips` trong `vi.json` / `en.json`), thay cho `loading.tipPortal` và `loading.tipTalk`. Chủ đề: trò chuyện và nhận nhiệm vụ, thẻ nhiệm vụ tự đi, cổng dịch chuyển, "Đi tới đây" trên bản đồ, cửa hàng, xu và thưởng khi chơi lại, sổ sưu tập, thú cưng, bếp, minigame, kết bạn, tổ đội, thử thách cùng đội, trái tim và chương chuyện của nhân vật, thành tích, hành trình, cây kỹ năng, cổng tri thức, trang trí nhà, thời khóa biểu, lái xe, xe buýt/tàu/thuyền/cáp treo, chép vở, phiếu chép vở, chế độ Song ngữ, nút "Quay lại" khi kẹt, bạn máy, người và vật trong làng.
- Giọng văn hợp mọi lứa tuổi: gọi "bạn", không dỗ dành (theo `.claude/rules/product-audience.md`). Tên nút trích trong mẹo khớp đúng chữ trên UI ở cả hai thứ tiếng.
- Mẹo đổi mỗi 6 giây khi tải lâu. Một `freshPicker` dùng chung cho cả trang, nên mẹo không lặp ngay sau mẹo vừa hiện, kể cả khi sang lần tải sau.
- Có kiểm tra tự động: `pnpm content:check` (`tools/content/check-locales.ts`) báo đỏ khi một pool lặp lại một dòng, hoặc `loading.tips` có dưới 20 mẹo. Có thêm unit test cho kích thước pool, việc xoay vòng và không lặp.

## 4. Chim vỗ cánh

- **Kiểm khi chạy:** dựng tạm `animal-parrot.glb` thật trên trang `/preview.html`, qua đúng đường `mergeParts` → `findPoseParts` → đặt góc cánh, rồi chụp cánh ở đỉnh và đáy nhịp. Kết quả: skin gộp có theo cánh (`merged-parts` = 1, `wing-left`/`wing-right` có đủ). Nhịp cũ (±0,95 rad, cánh nhỏ) chỉ đổi **2,8%** số điểm ảnh giữa đỉnh và đáy nhịp, ở ảnh 256 px chụp cận. Nhịp mới đổi **14,2%**. Khi bay xa trên trời, nhịp cũ gần như không thấy được. Code tạm của lượt kiểm này đã gỡ, không commit.
- **Đã sửa** (`apps/web/src/game/ambient/ambient-poses.ts`, `ambient-life.ts`, `ambient-actor.ts`):
  - Khi bay, cánh dang dài 1,7× và rộng 1,25×. Cánh vỗ khoảng 3 nhịp mỗi giây với biên độ ±1,15 rad quanh góc hơi nâng; nhịp cũ là ±0,95 rad, 2,5 nhịp mỗi giây.
  - Thân nhô lên ở mỗi nhịp đập xuống, khoảng 0,14 khối.
  - Bay vòng chỉ lượn ở đoạn sà xuống dốc nhất, chưa tới 1/3 vòng (trước là 1/2). Bay tới chỗ đậu thì vỗ khi lên, lượn đoạn đầu lúc xuống, rồi vỗ lại để đáp.
  - Đậu xuống thì cánh về đúng tư thế nghỉ: `resetPose` trả cả góc và cỡ cánh.
- Áp dụng cho mọi loài bay trong lớp ambient, gồm cả map lõi lẫn vùng ngoài, vì cùng một code. Hiện loài bay có vẹt và ong; ong giữ nhịp rung riêng.
- "Giảm chuyển động": chim vốn không bay khi bật chế độ này (đã có test). Game nay đọc cả công tắc "Chuyển động: Giảm bớt" trong Cài đặt của game (`readReduceMotion`), không chỉ cài đặt của thiết bị.
- Unit test (`ambient-poses.test.ts`) kiểm:
  - góc cánh đổi qua từng khung khi bay, biên độ trên 2 rad, khoảng 3 nhịp mỗi giây;
  - hai cánh đối xứng, dang rộng khi bay và về nghỉ khi đậu;
  - lượn gần như đứng cánh, thân nhấp nhô chỉ khi vỗ;
  - đỉnh cánh trong skin gộp nâng lên khi cánh vỗ lên.

  `ambient-actor.test.ts` kiểm thêm: thời gian lượn dưới 35% thời gian bay.

## Gate và E2E (máy dev, chạy lần lượt)

| Lệnh | Kết quả |
| --- | --- |
| `pnpm assets:check` | OK — 16 packs, 4598 files |
| `pnpm content:check` | OK — 1977 files |
| `pnpm test` | 522 file, 6396 test pass, 1 bỏ qua có chủ đích |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0, 0 cảnh báo |
| `pnpm --filter @miu/web build` | thành công; cảnh báo chunk > 500 kB đã có từ trước (`accessories` 1,25 MB) |
| `pnpm security:dist` | OK — không có đáp án quest trong `dist` |
| `pnpm --filter @miu/web e2e:smoke` | 12/12 pass |
| `e2e --project setup --project play --project forest-life` | 31 pass, 1 bỏ qua (ảnh review, chỉ chạy khi `REVIEW_SHOTS=1`) |
| Thêm: `maps`, `autowalk`, `rescue`, `wayfinding` | 21/21 pass |
| Thêm: `online`, `coop`, `interactions` | 8 pass, 1 bỏ qua |

Không chạy project `perf`. Không có dependency mới.

## Commit (chưa push)

- `795afe20` perf(web): enter a map in about a second when going back to it
- `93b59478` feat(web): birds beat their wings clearly in flight
- `f9dc8d5c` feat(web): the loading screen shows the player's own character and fresh tips
- `575624c3` fix(content): type the locale pool repeat check
- `480c2404` fix(web): the language tip names the setting's choice as the screen shows it
- commit docs: report này, dòng trạng thái của plan, một dòng quyết định trong `docs/system-architecture.md`

`ak plan update` báo "plan not found" (store của `ak` đang báo index cần sửa), nên trạng thái plan được cập nhật ở dòng **Trạng thái** trong `plan.md`. Front matter vẫn để `pending`, giống plan co-op.

## Còn lại

- Lần vào đầu khi mạng chậm vẫn khoảng 6–7 s, chủ yếu là thời gian tải JS, API và các file GLB qua mạng. Muốn giảm tiếp thì cần gộp hoặc nén model, tức là đổi pipeline asset. Chưa làm.
- Khi quay lại map, dựng đất quanh bé vẫn mất khoảng 0,3 s, vì mỗi game tạo worker mới và dựng lại vùng. Có thể giữ worker và vùng giữa các lần vào, nhưng tốn bộ nhớ iPad. Chưa làm.
- Khi vừa vào chơi ở `high`, đất ở xa hơn 48 khối hiện dần trong khoảng 1 giây đầu. Ở `low` tầm nhìn chỉ 40 khối nên không thấy.
- Chưa đo trên máy chuẩn iPad Gen 10. Các số đo trên là giả lập CPU và mạng.
- `docs/project-roadmap.md` không đổi: các lỗi này không thuộc một mục Master Plan nào.
