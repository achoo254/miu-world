# Nông trại: nhà to, cửa rộng, cảnh như ngoài đời, một mạng đường liền

Ngày: 02–03/10/2026 · Map: `nong-trai` · Tier: L · Plan: `plans/dattqh/261002-2216-houses-big-wide-doors/` (pha 2) và phần "Mạng đường" của `.claude/rules/world-scenery.md`.

## Số đo trước / sau

| Kiểm tra | Trước (bản đã commit, đo 02/10 22:50 và 03/10 02:30) | Sau (`pnpm world:nong-trai`, 03/10) |
| --- | --- | --- |
| `room-audit` | 182 không gian có mái, **8 thiếu chuẩn**: nhà kính cửa 2 rộng; 4 cối xay gió cửa 1 rộng; 3 silo rỗng kín, không có lối vào | 96 không gian có mái, **0 thiếu chuẩn** (đo bằng bản audit mới nhất fc0fd14, vòng dưới mái hiên không còn tính là trong nhà) |
| `scenery-audit` cây trên đường | 0 | **0** |
| `scenery-audit` đồ chắn giữa lối | 3 (2 bàn picnic, 1 ô dù ở khu nghỉ: vòng lát quanh gốc cây hẹp như một lối) | **0** |
| `scenery-audit` nơi không cạnh đường | 10 (điểm đầu chương 1, cổng sang Trung tâm, bến xe phía nam, thác đông, hồ, bãi cỏ ven sông, ruộng lúa mì, ruộng ngô, đồng cỏ bò sữa) | **0** |
| `scenery-audit` nơi cắt khỏi mạng của chỗ xuất hiện | 22 (gần như cả trang trại bài học, cầu đá, trang trại B, C, xóm) | **0** |
| `reach-audit` | mọi mục tới được, chỗ bắt đầu trống | **mọi mục tới được, chỗ bắt đầu trống** |

Ghi chú: số "trước" của `room-audit` đo bằng bản audit lúc đó (mái tới 9 rồi 24 khối, còn tính vòng mái hiên); bản cũ không bắt được cửa 2 rộng của nhà có mái hiên thấp, nên các nhà trang trại cũ (13 × 8, tường 4, cửa 2 × 2), chuồng gà (9 × 6, tường 3), nhà câu cá (7 × 6, tường 3), lều đồng cỏ (11 × 7, tường 4) không hiện trong số 8 dù cũng thiếu chuẩn. Tất cả đã sửa (bảng dưới).

## Từng công trình

| Công trình | Cũ | Mới |
| --- | --- | --- |
| Nhà ở trang trại A, B, C | 13 × 8, tường 4, cửa 2 × 2 | 13 × 11, tường 7, cửa 3 × 3, sàn ván chạy qua ngưỡng cửa, lối đất ra đường sân; thẳng hàng mặt trước chuồng đỏ; hộp thư dời sang cạnh cửa |
| Nhà nông trại (d-12), nhà chính | 15 × 9, tường 5 | 17 × 13, tường 7, cửa 3 × 3 quay ra đường vào cổng, mái hiên trên hai cột gỗ không chắn cửa; bên trong 2 kệ hũ, bàn bếp (95% sàn trống) |
| Nhà nông trại, chái kho | 9 × 7, tường 4 | 13 × 11, tường 7, cửa 3 × 3, bao bột và can sữa bên trong; cả hai cửa lát đá cuội ra tới đường |
| Nhà câu cá (d-07) | 7 × 6, tường 3, bên ao, cửa không ra đường | 13 × 11, tường 7, bên kia ao (bờ đông), cửa 3 × 3 quay ra đường phía nam trang trại; thùng, sọt, củi bên trong |
| Chuồng gà | 9 × 6, tường 3 | 13 × 11, tường 5, cửa 3 × 3 ra đường làng, sàn ván, ổ rơm sau; sân gà rào riêng phía đông (cổng ra đường), chuồng lợn ra đường phía nam |
| Lều bò ở 7 đồng cỏ | 11 × 7, tường 4, cửa 2 × 2 | 15 × 11, tường 5, cửa 3 × 3, nền đất |
| Nhà kính (d-05) | cửa 2 rộng | cửa 3 × 3, sàn lát chạy qua cửa; 80% sàn trống |
| Nhà kho chế biến (d-08) | cửa 2 rộng, gác trần rỗng kín | cửa 3 × 3, đèn hai bên dời ra mép cửa mới; gác trên trần ván lấp đặc (không còn khối rỗng kín); 84% sàn trống |
| 4 cối xay gió | cửa 1 rộng | cửa 3 × 3 (mở từ trong tâm ra ngoài vòng chân đá) |
| 3 silo | vỏ tròn rỗng, không cửa | đặc |
| Chuồng đỏ (bài học và 3 trang trại) | đã đạt (cửa 5–7 rộng) | giữ nguyên; thêm sân lát/lối đất từ cửa ra đường |
| Nhà dân dọc đường (`streetHouses` chung) | tự to ra từ pha 1 | xóm nông dân dựng lại dọc hai ngõ của nó (thay `hamlet` lưới không đường) quanh quảng trường đá cuội có giếng; lối vườn mỗi nhà nối ra ngõ |

Không bỏ ngôi nhà nào. Dời: nhà câu cá (sang bờ đông ao), luống bí (dời đông 10 khối nhường đường ngô), hàng hướng dương ngắn 1 ô, chuồng gà và sân gà, chuồng lợn, bảng nhiệm vụ (ra sát đường vào cổng), mốc `chuong-ga`, `chuong-lon`, `bang-nhiem-vu`, `nha-nong-trai` (giữ tên, đổi chỗ theo công trình mới). `ZONES` và tên mốc quest giữ nguyên.

## Mạng đường (đường đất giữa ruộng, đá cuội trong sân)

Đường mới: nhánh ra cổng sang Trung tâm; đường ruộng qua ruộng lúa mì của trang trại A ra đường cái; đường sân trước chuồng và nhà của từng trang trại A, B, C; đường ngô xuyên ruộng ngô vào trang trại bài học tới sân cối xay rồi ra đường làng; lối vào đồng cỏ bò sữa; đường từ trang trại C xuống hồ và dọc bờ hồ; đường bãi cỏ bờ nam sông từ cầu tây qua cầu đá tới thác đông; hai ngõ của xóm. Trong trang trại bài học: lối lùa gia súc giữa hai bãi rào (cừu tây, bò đông), đường phía nam dọc chuồng lợn tới cửa nhà kho, nhánh tới cửa nhà kính và khu nghỉ, lối xuống cầu câu ao cá, lối vườn cây, đường qua bến xe phía nam. Sân chợ, sân trước chuồng bò lát đá cuội; mặt cầu đá vòm lát đá xám giữa hai lan can, nên đường đi liền qua sông. Khu nghỉ: sân vuông lát đá, cây lớn đứng trong bồn đất viền đá xám. Đèn, rào, hoa ven đường không đặt lên lối rẽ (rào dọc đường không chắn ngang đường ruộng).

## Ngoại lệ có lý do

Không có nhà nào thiếu chuẩn. Không gian có mái còn lại không phải nhà: gầm cầu đá vòm (3 × 10, dưới mặt cầu) và lòng tháp 4 cối xay gió (7 × 6, cửa 3 rộng); cả hai đều đạt `room-audit`. Lều bò và chuồng gà tường 5 (không phải 7): là chuồng vật nuôi chứ không phải nhà ở; cửa vẫn 3 × 3, trong rộng.

## Góc chụp đối chiếu

Đã chụp lại cả 15 khung `mock__` từ map cuối, qua khóa chụp. Đổi góc: d-07 (từ đầu cầu câu nhìn sang nhà câu cá bên kia ao, như mock) và d-12 (lùi ra đường để thấy cả mặt trước nhà, mái hiên, bảng nhiệm vụ). Các khung khác giữ góc, vẫn đọc đúng nơi (cổng, khu trồng trọt, chuồng bò, nhà kính, vườn cây, nhà kho, chợ, bảng nhiệm vụ, khu nghỉ, cối xay và lò bánh, khu mở rộng, trang trại A).

## Kiểm tra

- `pnpm exec tsx tools/world/room-audit.ts nong-trai`: 96 không gian có mái, 0 thiếu chuẩn.
- `pnpm exec tsx tools/world/scenery-audit.ts nong-trai`: 0 cây trên đường, 0 đồ chắn giữa lối, 0 nơi không cạnh đường, 0 nơi bị cắt khỏi mạng.
- `pnpm exec tsx tools/world/reach-audit.ts nong-trai`: mọi mục tới được, chỗ bắt đầu trống.
- `pnpm vitest run tools/world/zone-maps.test.ts -t "nong-trai"`: 4 đạt, 32 bỏ qua (test của map khác), 0 trượt.
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi (lần chạy giữa chừng có lỗi ở `generate-thu-vien-map.ts` của agent khác; lần cuối 0).
- `pnpm exec eslint tools/world/generate-nong-trai-map.ts tools/world/structures/nong-trai-farm.ts --max-warnings=0`: sạch.
- Không chạy `pnpm test`, E2E, perf (theo yêu cầu người sở hữu).

Tệp đã sửa: `tools/world/generate-nong-trai-map.ts`, `tools/world/structures/nong-trai-farm.ts`, `content/world/mock-views/nong-trai.json`, map sinh lại `assets/generated/world/nong-trai/**`, 15 ảnh `assets/generated/review/nong-trai/mock__*.png` (manifest do lệnh chụp tự sinh lại). Không thêm prop hộp hay dòng `models.json`.

## Đề xuất cho tệp dùng chung

1. `placeHouse` (`structures/buildings.ts`): khi có `floor`, đặt luôn sàn dưới ngưỡng cửa (hàng `z0` ở các cột cửa). Hiện ngưỡng là cỏ, nên sàn nhà tách khỏi lối vườn trong mạng đường; map này tự lát ngưỡng cho nhà của mình, còn nhà của `streetHouses` thì chưa.
2. `laneVerge` (`scenery.ts`): kiểm `free()` cho từng cọc của đoạn rào, không chỉ cọc đầu; hiện đoạn rào có thể chắn ngang một lối rẽ. Map này bọc `ctx.prop` để bỏ cọc nằm trên đường.
3. `widenRoundDoor` và `joinWalks` nay có ở Làng Ven Sông và Nông trại (bản riêng mỗi map): nên chuyển vào `structures/countryside.ts` / `scenery.ts`.
4. `placeArchBridge`: mặt cầu nên là khối đường (đá lát) để mạng đường đi liền qua cầu mà không cần map tự lát lại.

## Câu hỏi còn mở

Không có.

## Bổ sung 03/10: cửa mọi nhà nằm trên mạng đường

`scenery-audit` (b90db34) nay kiểm cửa của mọi không gian có mái từ 60 ô sàn: trên map đã sinh lại ở 214e82b có 6 cửa không cạnh đường và 2 cửa trên đoạn đường tách khỏi mạng.

- 6 cửa không cạnh đường là lều bò ở sáu đồng cỏ. Mỗi lều có thêm đường đất từ cửa ra đường gần nhất (rào đồng cỏ tự mở chỗ đường đi qua): lều đồng cỏ trang trại A sang ngõ trang trại A; lều đồng cỏ phía tây ra đường tây; lều đồng cỏ phía bắc theo khe giữa vườn cam và đồng cỏ xuống đường đông bắc; lều đồng cỏ phía đông bắc lên đường đông bắc; lều đồng cỏ gần xóm lên đường làng; lều đồng cỏ bò sữa nối bằng cách kéo dài lối vào đồng cỏ tới cửa lều.
- Nhà chính của nhà nông trại: ô ngay ngoài cửa (dưới mái hiên) gần bậu cửa sổ bằng ván hơn gần lối đá, nên mạng của nó là bậu cửa. Đã lát đá cuội nền dưới mái hiên, nối với lối đá ra đường.
- Nhà ở trang trại C: đường sân dừng cách cột cửa hai ô; đã kéo dài tới hết cửa.

Số đo sau (`pnpm world:nong-trai` trên HEAD f1413b9):

- `scenery-audit`: 0 cây trên đường, 0 đồ chắn giữa lối, 0 nơi không cạnh đường, 0 nơi bị cắt khỏi mạng (trước: 0/0/6/2).
- `reach-audit`: mọi mục tới được, chỗ bắt đầu trống.
- `room-audit`: 96 không gian có mái, 2 thiếu chuẩn, nhưng không phải nhà: gầm cầu câu ván trên ao cá (3 × 8, tại 334, 9, 461) và gầm cầu tàu trên hồ (3 × 8, tại 698, 9, 526). Đây là ô đáy nước dưới mặt ván, y 9 dưới mặt nước 10, báo "cửa 2 rộng". Lỗi này chỉ xuất hiện với bản `tools/world/room-audit.ts` đang sửa dở, chưa commit, trong cây làm việc (mái phải phủ ít nhất hai ô bên cạnh, leo tối đa 2). Với bản đã commit, map này cho 0 thiếu chuẩn. Đề xuất cho audit: bỏ qua ô đứng dưới nước. Tôi không lấp gầm cầu để né audit.
- `tsc`: 0 lỗi; `eslint --max-warnings=0` trên hai tệp của map: sạch; `pnpm vitest run tools/world/zone-maps.test.ts -t "nong-trai"`: 4 đạt, 32 bỏ qua, 0 trượt.
- Không chụp lại ảnh: các đường mới nằm ngoài các khung mock; nền đá dưới mái hiên chỉ đổi rất ít khung d-12.

Status: DONE_WITH_CONCERNS
Summary: Mọi nhà và công trình của Nông trại đạt chuẩn và mọi cửa nhà nằm trên một mạng đường nối về chỗ xuất hiện. scenery-audit 0/0/0/0, reach-audit xanh, tsc/eslint sạch, test của map đạt.
Concerns: room-audit theo bản đang sửa dở (chưa commit) báo 2 gầm cầu ván dưới nước là "cửa 2 rộng". Đây không phải nhà; bản audit đã commit cho 0.
