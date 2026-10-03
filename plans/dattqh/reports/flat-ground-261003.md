# Mặt đất và đường phẳng trên mọi map (03/10/2026)

Yêu cầu của người sở hữu: "hiện tại tất cả map phần đường đang hơi nhấp nhô. sửa lại hết thành mặt phẳng, trừ những khung cảnh thực tế cần lõm xuống ví dụ ao hồ biển sông suối thác... hay nhô lên như lên núi, dốc". Việc thêm trong cùng đợt: "map trường học các ghế quay ngược với bàn học".

## Đã làm

**Lõi map phẳng.** `tools/world/zone-map.ts`: `ground.roll` giờ là tùy chọn, mặc định 0, nên mười map dựng bằng zone-map có nền phẳng ở độ cao `ground` của map. Khu rừng (`generate-forest-map.ts`) bỏ `rollingHeight` và dùng nền 12, tức chân vách đá. Chỗ cao thấp còn lại đều có chủ ý:
- Nước đào xuống: ao, hồ, sông, suối, kênh, biển. Bờ tự nhiên hạ một bậc xuống bãi cát.
- Chỗ nhô lên do `shape` của từng map: núi và dãy núi Núi tuyết, đồi lâu đài, núi và vách thác ở Trường học, thềm và núi phía bắc Trung tâm, ba đồi Xóm Mái Ấm, dãy núi Nông trại, cao nguyên và đụn cát Đảo bí ẩn, cao nguyên, đồi thông và dốc xuống phố ở Lâu đài.

**Bờ kè.** Thêm `water.quay`: bờ kè đá giữ nguyên độ cao tới mép nước. Dùng cho kênh của Trung tâm, kênh qua quảng trường Trường học và hồ dọc phố Trường học. Trước đây ở những chỗ này có một rãnh sâu một khối chạy dọc lối lát, nằm giữa lan can và mặt lát.

**Đường nằm ngang.** Áp cho mọi `routes`:
- Theo chiều dài: chiều cao lấy mỗi khối dọc đường giữa, rồi san mọi chỗ lồi hoặc lõm đúng một khối dài tới 12 khối (`levelProfile`, `packages/voxel/src/outland-levelling.ts`, có test riêng).
- Theo chiều ngang: mỗi ô của đường lấy chiều cao tại điểm gần nhất trên đường giữa, nên đường chạy dọc sườn dốc không bị nghiêng.
- Một lượt gỡ lồi lõm ở chỗ các đường gặp nhau.

Lên đồi, đường leo từng bậc 1 khối. Không còn bậc 2–3 khối nào trên đường.

**Vùng ngoài lõi.** Đồi núi giữ nguyên. Riêng đường làng được làm tròn theo khối rồi san bằng `levelProfile` (`outland-plan.ts`); test mới trong `outland-plan.test.ts` giữ cho đường không lồi lõm. Mép lõi phẳng nối sang vùng ngoài qua dải 48 khối có sẵn, không có bậc tường.

**Sửa riêng từng map:**
- Lâu đài: đồi thông phía đông thoải dần trước dốc xuống phố (trước có một gờ 2 khối chắn ngang đường phía đông).
- Núi tuyết: cầu thang đá lên dãy núi chỉ đi lên, không còn bậc 30-29-30.
- Trường học: bến "Xe buýt tới lâu đài" dời xuống chân đồi, cạnh đường.
- Xóm Mái Ấm: chậu hoa và thùng gỗ quanh giếng dời ra ngoài vòng lát.

**Dọn mã thừa.** Các vùng `FLAT` của Chợ phiên, Nông trại và Thư viện không còn tác dụng khi nền đã phẳng nên đã xóa. Sinh lại ba map này ra đúng từng byte như trước khi xóa.

**Tài liệu.** Thêm một đoạn "Mặt đất và đường" vào `docs/design-cac-map.md`.

### Ghế quay ngược bàn

Ghế hộp `th-chair` và `ld-chair` có lưng ở +z, nên người ngồi nhìn về −z. Ghế của Kenney (`chair.glb`) có lưng ở −z, nên người ngồi nhìn về +z.

Tôi viết một bước kiểm cho mọi ghế đứng cạnh bàn trên mọi map: đọc hình học GLB để biết lưng ghế ở phía nào, rồi xem người ngồi có nhìn về bàn không. Ghế quay lưng vào bàn, trước khi sửa:

| Map | Chỗ | Trước | Sau |
| --- | --- | --- | --- |
| Trường học | nhà ăn, phòng mĩ thuật, phòng đọc | 52 / 152 ghế | 0 / 152 |
| Làng Ven Sông | lớp học | 12 / 12 | 0 / 12 |
| Khu rừng | nhà kiểm lâm | 2 / 2 | 0 / 2 |
| Đảo bí ẩn | nhà chài, các nhà đối xứng | 6 / 12 | 0 / 12 |

Các chỗ còn lại đã đúng từ trước: ghế lớp học của Trường học (nhìn bàn và bảng, đã kiểm bằng ảnh), thư viện trường, phòng nhạc, Thư viện (63 ghế), Lâu đài (140 ghế), Nhà của bé.

## Số liệu: đường có nhấp nhô hay không, trước và sau

**Cách đo.** Ô đường là cột có khối trên cùng (bỏ qua cây) là khối đường (`path`, `trail`, `cobble`, `cobble-grey`, `paver`, `asphalt`) lát trên đất, cát, tuyết hoặc cỏ. Như vậy gờ, lan can, bậc xây chồng và mặt vách đá không bị tính.
- "Nhấp nhô": có ô đường kề bên cao hoặc thấp hơn 1–3 khối. Bậc lên đồi có chủ ý cũng tính vào đây.
- "Lồi lõm": hai ô kề đối diện cùng cao hơn, hoặc cùng thấp hơn.
- "Bậc ≥2": ô kề lệch 2–3 khối.

"Trước" là map đã commit (HEAD 1c78e5b), "sau" là bản sinh lại.

| Map | Ô đường nhấp nhô (trước → sau) | Lồi lõm | Bậc ≥2 | Nền cỏ/đất nhấp nhô |
| --- | --- | --- | --- | --- |
| Khu rừng | 15,29% → 0,96% | 11 → 0 | 0 → 0 | 23,8% → 0,8% |
| Trường học | 7,87% → 0,29% | 77 → 0 | 11 → 0 | 20,0% → 4,3% |
| Trung tâm | 5,04% → 0,19% | 29 → 0 | 29 → 0 | 18,9% → 1,0% |
| Làng Ven Sông | 16,02% → 0,27% | 25 → 0 | 0 → 0 | 20,5% → 0,8% |
| Xóm Mái Ấm | 15,83% → 0,85% | 57 → 0 | 8 → 0 | 24,2% → 4,8% |
| Chợ phiên | 3,82% → 0,13% | 18 → 0 | 6 → 0 | 14,2% → 0,7% |
| Nông trại | 3,44% → 0,07% | 16 → 0 | 0 → 0 | 10,1% → 6,9% |
| Thư viện | 13,82% → 0,36% | 79 → 0 | 0 → 0 | 10,1% → 1,0% |
| Lâu đài | 0,97% → 0,27% | 4 → 0 | 6 → 0 | 11,8% → 6,2% |
| Núi tuyết | 10,76% → 1,48% | 19 → 0 | 0 → 0 | 51,3% → 44,3% |
| Đảo bí ẩn | 9,65% → 0,35% | 10 → 0 | 0 → 0 | 19,7% → 6,4% |

Phần nhấp nhô còn lại là những chỗ có chủ ý: đường leo đồi hay núi từng bậc 1 khối, bờ dốc xuống cầu ở Khu rừng, dốc từ cao nguyên xuống phố ở Lâu đài. Phần nền cỏ còn nhấp nhô nằm trên núi, đồi và dốc.

**Đường vùng ngoài** (đo trên đường giữa, ngoài lõi, theo bộ số liệu thử của `outland-plan.test.ts`):

| Kiểu vùng ngoài | Lồi lõm trước → sau | Số cột đường |
| --- | --- | --- |
| river | 136 → 5 | 44.574 |
| castle | 130 → 6 | 42.742 |
| farm | 128 → 1 | 40.034 |

**Mép lõi với vùng ngoài.** Bước đầu tiên từ mép lõi ra ngoài lệch tối đa 0 khối ở 7 map và 1 khối ở Lâu đài và Núi tuyết. Riêng Trung tâm lệch 2 khối ở 7 cột gần bến cảng. Đảo bí ẩn có toàn bộ mép là biển.

## Kiểm tra

- Ba lệnh audit trên cả 11 map đều 0: 0 cây trên đường, 0 vật chắn lối hẹp, 0 nơi xa đường, 0 nơi bị tách khỏi mạng; mọi nhà đạt chuẩn; mọi mục tiêu tới được và chỗ xuất hiện đều trống. Hai lỗi chỉ hiện sau khi làm phẳng (bến xe lâu đài, chậu hoa ở giếng) đã sửa.
- `pnpm vitest run`:
  - `tools/world/zone-maps.test.ts` (9 map của tôi, bỏ `nha-cua-be`): 36 đạt, 4 bỏ qua.
  - `generate-forest-map.test.ts`: 4 đạt.
  - `generate-school-map.test.ts`: 5 đạt.
  - `structures/path.test.ts`, `outland-levelling.test.ts`, `outland-plan.test.ts`, `outland-region.test.ts`, `outland-life.test.ts`: 27 đạt.
- `pnpm assets:manifest`: 1560 file pack + 2921 file sinh. `pnpm assets:check`: OK, 16 pack, 4481 file. `pnpm content:check`: OK, 1092 file.
- `tsc --noEmit -p tsconfig.json`: 0 lỗi. `eslint --max-warnings=0` trên các file đã sửa: sạch.
- Không chạy E2E và không chạy toàn bộ `pnpm test`, theo yêu cầu.

## Ảnh

Ảnh review đã chụp lại:
- `assets/generated/review/<map>/<map>-toan-canh.png` và mock toàn cảnh của Làng Ven Sông, Xóm Mái Ấm, Thư viện, Khu rừng, Lâu đài, Trung tâm.
- Cả 12 ảnh `assets/generated/review/outland/*-ngoai.png`.

Ảnh so sánh trước/sau trong `plans/dattqh/reports/flat-ground-261003/`: Làng Ven Sông toàn cảnh (các đường đồng mức trên nền đã mất), đường làng vùng ngoài, ghế nhà ăn Trường học, ghế nhà chài Đảo bí ẩn. Tôi đã mở xem các ảnh: nền phẳng, đường lên đồi theo bậc, ghế nhìn về bàn.

## Việc cho phiên khác

- `nha-cua-be` cũng dựng bằng `zone-map.ts`, nên phần làm phẳng đường và mặc định `roll` 0 cũng áp vào map này. File đã commit của nó cần sinh lại (`pnpm world:nha-cua-be`) thì test `zone-maps.test.ts › nha-cua-be` mới khớp. Đó là việc của phiên phụ trách Nhà của bé.
- Ảnh review khác của các map chưa chụp lại: cận cảnh landmark, `tren-cao`, các khung mock. Hình chung vẫn đúng nhưng chi tiết mặt đất trong các ảnh đó là của bản cũ.
