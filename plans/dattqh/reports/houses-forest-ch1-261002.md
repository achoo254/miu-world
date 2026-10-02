# Khu rừng bí mật (`forest-ch1`): chòi, lều to, cửa rộng, một mạng lối mòn

Ngày: 03/10/2026 · Plan: `plans/dattqh/261002-2216-houses-big-wide-doors/` (pha 2) · Quy tắc: `.claude/rules/world-scenery.md`

## Số đo trước / sau (`pnpm world:forest` rồi đo)

| Kiểm tra | Trước | Sau |
| --- | --- | --- |
| `room-audit` | 3 không gian có mái, 2 thiếu: chòi kiểm lâm 6x6 cửa rộng 2 `[120,14,21]`; chòi gỗ 5x5 chỉ 52% sàn trống `[101,13,24]` (bản audit cũ hơn: 4 không gian, 0 thiếu) | 9 không gian có mái, 0 thiếu |
| `scenery-audit`: cây trên đường | 3 (cột gỗ chòi kiểm lâm trên chân đá xám, có tán cây chồm sát mái) | 0 |
| `scenery-audit`: đồ chắn giữa lối | 0 | 0 |
| `scenery-audit`: nơi không cạnh đường | 13 (đầu chương 4, 5; cổng sang Trung tâm; 4 bến tàu ở chỗ xuất hiện; bến về và điểm xuống của chương 4, 5; đá qua suối; thác rừng sâu) | 0 |
| `scenery-audit`: nơi bị cắt khỏi mạng của chỗ xuất hiện | 6 (cổng chương 2, thác nước, cầu gỗ qua suối, lối mòn hoa, trại, chòi kiểm lâm) | 0 |
| `reach-audit` | mọi mục tới được; 4 điểm xuống tàu (ben-tau-rung-5..8) bị biển chỉ đường che | mọi mục tới được; chỗ xuất hiện, đầu chương, điểm xuống xe đều trống |

## Từng công trình

| Công trình | Cũ | Mới |
| --- | --- | --- |
| Chòi kiểm lâm (`placeCabin`) | 8 x 7, tường 4, cửa 2 x 2, phòng 6 x 5 | 13 x 11, tường 7 (mái cao thêm 6, cả nhà ~14 khối ≈ 10 lần bé), cửa 3 x 3 nhìn ra bếp lửa; sàn ngang mặt đất (có bậc 1 khối mỗi bậc qua `doorSteps` nếu đất thấp hơn); phòng 11 x 9, 91% sàn trống, lối giữa 3 khối từ cửa tới vách sau |
| Chòi gỗ mở (`placeShelter`) | 5 x 5, cột 4, mái ván | sàn ván 9 x 9, 8 cột gỗ cao 5, mái gỗ đỏ ba bậc (giống mái chòi kiểm lâm); mở bốn phía, mỗi khoang giữa hai cột rộng 3; 85% sàn trống |
| Lều trại (2 ở trại + 1 ở mỗi bãi rừng chương 2–5) | model `tent.glb` cao 2, không vào được | lều khối `placeTent` 9 x 11, vách 3 khối (bé không trèo lên được từ trong), nóc 6 khối có xà gỗ, cửa 3 x 3, sàn ván 7 x 9; bạt xanh lá / xanh lam xen nhau; 94% sàn trống |

Nội thất: chòi kiểm lâm bày đồ sát vách (bản đồ rừng, kệ lọ, giỏ nấm, chậu cây ở vách sau; ổ nằm một bên; bàn, hai ghế, sách ở bên kia; giá dụng cụ, thùng, xô ở góc; thảm giữa, hai đèn treo). Mỗi lều: hai ổ nằm dọc vách thấp, thảm giữa, đèn treo trên xà, giỏ và hộp ở cuối lều. Dưới chòi gỗ: bàn, hai ghế gỗ, đèn treo, giỏ nấm, thùng, giá dụng cụ ở mép sàn.

## Bố cục đã dời

- Tâm trại dời 4 khối sang đông (110,24 → 114,24) để có chỗ cho nhà to: chòi kiểm lâm phía đông (cửa nhìn sang lửa), hai lều phía tây (cửa nhìn vào trại), chòi gỗ phía đông nam. Mỗi công trình có một khoảng đất phẳng riêng; cây lưới trong vòng 4 khối quanh công trình bị đốn, cây lớn giữ cách 6 khối (không tán nào chồm lên mái hay mọc trong nhà).
- Lều ở mỗi bãi rừng chương 2–5: đổi model lều nhỏ sang lều khối ở phía đông giữa bãi; bếp lửa và ghế gỗ dời ra khỏi đường dẫn tới cửa lều. Mục quest của chương 2–5 không đặt trong lều (`canStand` tránh công trình).
- Biển chỉ đường ở chỗ xuất hiện dời từ (19,19) (giữa lối mòn, đúng chỗ xuống tàu) sang (19,13), bên ngã ba, ngoài cả hai lối.
- Bếp, khu ăn của cô nấu bếp trại (`forest-life.ts`) theo bàn dưới chòi gỗ mới.

## Mạng lối mòn

Thêm các nhánh lối mòn (khối `trail`, rộng ~3) nối vào mạng có sẵn: chỗ xuất hiện → qua cổng sang Trung tâm → các bến tàu rừng; bờ gần cầu gỗ thứ nhất → đá qua suối (đi qua cạnh hải ly); hai lối mòn ở cây cổ thụ nối với nhau (cổng chương 2 và cả khu thác, cầu, trại vào chung mạng); lối rừng sâu đi tiếp tới hồ thác thứ hai; giữa bãi rừng chương 4, 5 ra mép nơi bài học bắt đầu (chỉ thêm khi chưa có lối đi gần); giữa mỗi bãi rừng → cửa lều; trong trại: lối vào → cửa chòi kiểm lâm, → cửa hai lều, → sàn chòi gỗ. Thêm một sàn ván ngắm thác (2 x 5) từ cuối nhánh hồ ra mép hồ thác thứ nhất. Bến tàu ở chỗ xuất hiện nay đứng cách nhau ≥ 3 khối (trước đây ba tàu chồng một chỗ); bến về của mỗi bãi đặt cạnh đầu chương, cùng lối.

Chương 1 giữ nguyên để chơi: các mục quest chương 1 đặt tay không đổi, cây và đá của góc chương 1 vẫn rút theo cùng chuỗi ngẫu nhiên (nhánh mới chỉ đốn cây và bỏ đá nằm trên chính nhánh).

## Ngoại lệ có lý do

- Không còn. Gầm cầu gỗ thứ hai (`[112,9,57]`, 26 ô) là không gian có mái không phải nhà; audit đã không xếp nó thiếu.
- `room-audit` báo cửa lều rộng 9 vì coi đỉnh vách 3 khối là "chỗ đứng bên ngoài" (cao hơn sàn 3 khối, bé không trèo được); cửa thật của lều là 3 x 3.

## Ảnh

Chụp lại (qua khóa): 3 khung mock `mock__khu-rung-bi-mat__*` và 13 ảnh `forest-ch1-*` của map (thêm ảnh mới `forest-ch1-leu-trai.png`, trong lều; landmark mới `leu-trai`). Không đổi `content/world/mock-views/forest-ch1.json`: khung b-08 nay thấy mái chòi kiểm lâm to ở góc dưới trái, các khung khác như cũ. Nhóm ảnh `map` (forest-ch1-top/iso/…) chưa chụp lại.

## Kiểm tra

- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi.
- `pnpm exec eslint tools/world/generate-forest-map.ts tools/world/forest-life.ts tools/world/structures/forest-scene.ts --max-warnings=0`: sạch.
- `pnpm vitest run tools/world/generate-forest-map.test.ts`: 4/4 đạt.
- Không chạy `pnpm test`, E2E, `perf`.
- Prop: 3.502 → 3.490; người và vật: 243 (không đổi); landmark 10 → 11. Không thêm model hay prop hộp mới (lều dựng bằng khối `board`, `roof-blue`, `log`, `planks` có sẵn).

## Tệp đã sửa

`tools/world/generate-forest-map.ts`, `tools/world/structures/forest-scene.ts`, `tools/world/forest-life.ts`; sinh lại `assets/generated/world/forest-ch1/**`, ảnh `assets/generated/review/forest-ch1/**`, `assets/manifest.json` (qua lệnh chụp).

## Đề xuất cho tệp chung

- `room-audit.ts`: khi tìm cửa, ô ngoài cao hơn sàn từ 2 khối trở lên mà giữa hai ô có vách thì không nên tính là cửa (hiện đỉnh vách lều, vách thấp được tính là "cửa rộng 9, trèo 0").
- `scenery-audit.ts`: mái bằng ván (`planks`) và đá xám trên vách đá có khoảng trống phía trên đang được coi là đường khi tìm "đường gần nhất"; chòi gỗ ở đây đổi mái sang gỗ đỏ cho đúng thực tế, nhưng các map khác có mái ván có thể gặp cùng cảnh.

Status: DONE
Summary: Chòi kiểm lâm 13 x 11 tường 7 cửa 3 x 3, chòi gỗ 9 x 9, sáu lều khối 9 x 11 đi vào được; một mạng lối mòn nối mọi nơi; ba audit đều sạch (0 thiếu; 0/0/0/0; mọi mục tới được, chỗ xuống tàu trống).
Concerns: Hai audit chung đang được sửa song song (chưa commit) — số đo trên lấy theo bản hiện tại lúc 03:12.
