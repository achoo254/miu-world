# Quần áo cho bé: 51 bộ theo cấp, mặc đúng hướng trên mọi động tác

Ngày 03/10/2026 · Tier M · Plan: `plans/dattqh/261003-1038-more-accessories-spread-life/plan.md`

Người sở hữu (03/10/2026): thêm quần áo bé chọn được, khoảng 50 bộ mở theo cấp; "lưu ý thiết kế hướng của đồ vật khi gắn lên người phải chuẩn".

## Thiết kế

- **Một bộ quần áo là một món khe `clothes`** trong `content/accessories/clothes-*.json`. Thay vì `boxes`, món có `parts`: khối theo khớp `torso`, `arm-left`, `leg-left` (tay, chân phải tự lật gương như thân nhân vật), trên đúng lưới voxel của thân (`voxelSize` 0,05, gốc ở khớp, mặt trước +z). Box có thêm cờ `sym` (vẽ đối xứng qua x = 0) như trang phục cũ. Schema chặn: clothes phải có `torso`, chỉ dùng `parts`, gắn `torso` với offset/xoay 0; món khác không được có `parts` (`packages/voxel/src/accessory-schema.ts`).
- **Một mesh skinned mỗi bộ, 1 draw call**: `accessoryPieces` (`packages/voxel/src/voxel-accessory.ts`) tách bộ thành 5 mảnh; `wearClothes` (`apps/web/src/game/character/character-clothes.ts`) ghép các mảnh thành một `SkinnedMesh` dùng chính bộ xương và bind pose của thân, mỗi đỉnh gắn khớp của mảnh. Mọi clip (đứng, đi, chạy, nhảy, emote) kéo từng mảnh đúng như kéo phần thân bên dưới. `dressCharacter` chỉ thêm một nhánh gọi hàm này.
- **Không z-fight, dáng cũ giữ nguyên**: 4 model loài của bé (`miu-cat`, `rabbit`, `fox`, `bear`) giờ dựng với trang phục mới `content/outfits/underlayer.json` (lớp lông thân/tay/chân lọt vào trong mọi bộ đồ ít nhất 1 voxel). Mỗi loài khai `clothes` trong `content/characters.json` là bộ riêng của nó (mèo: Váy nơ hồng, thỏ: Quần yếm xanh dương, cáo: Áo khoác xanh dương, gấu: Gi lê cam và quần soóc), chép box-đúng-box từ trang phục cũ. Khi bé chưa chọn quần áo (mọi bé hiện có), game và trang tạo nhân vật mặc bộ đó (`withOwnClothes`), nên không bé nào thiếu đồ và dáng cũ không đổi. NPC giữ trang phục nướng sẵn, GLB của 28 NPC không đổi byte nào.
- **Trang tạo nhân vật**: bỏ tab khóa "Áo — Sắp có"; tab "Quần áo" không có ô "Không đeo"; chưa chọn thì ô bộ riêng của loài được đánh dấu. `stats.outfit` vẫn chỉ liệt kê món bé chọn.
- **Server**: không đổi code; khe `clothes` được kiểm như mọi khe (một món mỗi khe, mở theo cấp).
- **Ảnh**: icon (`pnpm assets:accessories`) vẽ bộ đồ như đang mặc trên Miu rồi bỏ thân đi (`preview-main.ts`); ảnh duyệt mỗi mẫu gốc 3 góc: trước, sau, đang chạy nhìn ngang (`item-clothes-*.png`, `-back`, `-sprint`). Ảnh nhân vật trong `render-preview.ts` mặc bộ riêng của loài.
- `MIN_OPEN_ITEMS.clothes` = 10.

## Món theo cấp (51 món, 25 mẫu gốc + 26 biến thể màu)

| Cấp | Số món | Món |
| --- | --- | --- |
| 1 (mở sẵn) | 10 | Váy nơ xanh dương (`clothes-dress-blue`), Váy nơ hồng (`clothes-dress`), Áo khoác đỏ (`clothes-jacket-red`), Áo khoác xanh dương (`clothes-jacket`), Quần yếm đỏ (`clothes-overalls-red`), Quần yếm xanh dương (`clothes-overalls`), Đồng phục học sinh (`clothes-school-uniform`), Áo phông xanh dương trái tim (`clothes-tshirt-blue`), Áo phông vàng trái tim (`clothes-tshirt`), Gi lê cam và quần soóc (`clothes-vest-shorts`) |
| 2 | 4 | Váy nơ xanh bạc hà (`clothes-dress-mint`), Quần yếm xanh lá (`clothes-overalls-green`), Đồ ngủ ngôi sao xanh (`clothes-pajamas`), Áo phông đỏ trái tim (`clothes-tshirt-red`) |
| 3 | 4 | Áo khoác xanh lá (`clothes-jacket-green`), Đồ ngủ ngôi sao hồng (`clothes-pajamas-pink`), Áo mưa vàng (`clothes-raincoat`), Gi lê xanh lá và quần soóc (`clothes-vest-shorts-green`) |
| 4 | 4 | Áo bà ba nâu (`clothes-farmer`), Áo mưa xanh dương (`clothes-raincoat-blue`), Bộ đá bóng đỏ số 10 (`clothes-sports`), Gi lê xanh than và quần nâu (`clothes-vest-shorts-navy`) |
| 5 | 4 | Áo dài cách tân đỏ (`clothes-ao-dai`), Áo bà ba chàm (`clothes-farmer-indigo`), Bộ đá bóng xanh số 10 (`clothes-sports-blue`), Đồ bơi sọc xanh (`clothes-swimsuit`) |
| 6 | 3 | Đồ đầu bếp (`clothes-chef`), Võ phục xanh đai vàng (`clothes-martial`), Đồ bơi sọc hồng (`clothes-swimsuit-pink`) |
| 7 | 3 | Áo dài cách tân vàng (`clothes-ao-dai-yellow`), Áo bác sĩ (`clothes-doctor`), Áo phao đỏ (`clothes-winter-coat`) |
| 8 | 3 | Đồ lính cứu hỏa (`clothes-firefighter`), Bộ com lê đen nơ đỏ (`clothes-tuxedo`), Áo phao tím (`clothes-winter-coat-purple`) |
| 9 | 3 | Áo dài cách tân xanh (`clothes-ao-dai-blue`), Đồ thủy thủ (`clothes-sailor`), Đồ siêu nhân đỏ (`clothes-superhero`) |
| 10 | 3 | Váy công chúa hồng (`clothes-princess`), Đồ siêu nhân xanh (`clothes-superhero-blue`), Bộ com lê trắng nơ đen (`clothes-tuxedo-white`) |
| 11 | 2 | Đồ phi hành gia (`clothes-astronaut`), Váy công chúa xanh băng (`clothes-princess-blue`) |
| 12 | 2 | Đồ phi hành gia cam (`clothes-astronaut-orange`), Áo giáp hiệp sĩ bạc (`clothes-knight`) |
| 13 | 2 | Bộ đồ ngân hà (`clothes-galaxy`), Lễ phục hoàng gia tím (`clothes-royal`) |
| 14 | 2 | Bộ đồ ngân hà hồng (`clothes-galaxy-pink`), Áo giáp hiệp sĩ vàng (`clothes-knight-gold`) |
| 15 | 2 | Váy công chúa kim cương (`clothes-princess-diamond`), Lễ phục hoàng gia vàng (`clothes-royal-gold`) |

Mẫu gốc: 4 trang phục cũ (váy nơ, quần yếm, áo khoác, gi lê + quần soóc) và 21 mẫu mới: áo phông, đồng phục học sinh, đồ ngủ, áo mưa, bộ đá bóng, áo bà ba, đồ bơi, áo dài cách tân, đầu bếp, võ phục, bác sĩ, áo phao, lính cứu hỏa, com lê, siêu nhân, thủy thủ, váy công chúa, phi hành gia, áo giáp hiệp sĩ, lễ phục hoàng gia, bộ đồ ngân hà. Tránh biểu tượng tôn giáo/được bảo hộ: áo bác sĩ dùng trái tim thay chữ thập đỏ, áo giáp dùng hình thoi.

## Kiểm hướng và va chạm

- **Hướng**: mặt trước mọi bộ ở +z, hướng mặt bé; trái/phải theo thân (tay trái ở +x). Test đơn vị (`character-clothes.test.ts`) dựng một rig giả và kiểm: một `SkinnedMesh` dùng chung bộ xương, mảnh nằm đúng khớp (`torso`, `arm-left/right`, `leg-left/right`), tay/chân phải là gương của trái, mặt trước tay áo hướng về +z; xoay khớp chân 90° thì ống quần đi theo mà mảnh thân đứng yên.
- **Ảnh mặc thật** (Miu, model mới): 25 mẫu gốc × 3 góc (`assets/generated/review/accessories/item-clothes-<id>.png`, `-back`, `-sprint`), cùng 51 icon (`assets/generated/accessories/clothes-*.png`). Đã xem hết: huy hiệu, ngực áo, bảng điều khiển, chữ số 10 ở lưng (đọc đúng “10” từ phía sau), nơ, thắt lưng đều ở đúng mặt; không mảnh nào lơ lửng hay lệch khớp.
- **Dáng cũ giữ nguyên**: ảnh `<loài>-turn-0.png` dựng lại bằng model mới + bộ riêng của loài, so với ảnh cũ (model có trang phục nướng sẵn): khác ≤ 131 trên 262.144 điểm ảnh, lệch màu tối đa 51/255 (chỉ ở mép khử răng cưa và bóng Lambert/Standard), nhìn giống hệt.
- **Va chạm khi chuyển động** (đo bằng script tạm, không đưa vào repo): lấy mẫu 40 khung mỗi clip idle/walk/sprint/jump/cheer/wave/yawn của `miu-cat.glb` (chân vung tới ±90° khi chạy, tay tới ±90°, cheer giơ tay 130°), đếm voxel chân/tay lọt vào phần đồ nhô khỏi dáng thân chuẩn. Kết quả 22/25 mẫu = 0. Ba mẫu có váy/vạt loe (váy nơ – dáng cũ, áo mưa, váy công chúa) có chân nằm trong lòng váy giống hệt váy nơ hiện có (204–228 voxel lúc chạy; váy công chúa rộng hơn 1 voxel mỗi bên). Đã sửa sau lần đo đầu: bỏ vạt trước/sau thả dưới hông của áo dài (chân xuyên vạt khi đi: 50 voxel → 0), thu nút đai võ phục (3 → 0). Ống tay áo chạm đầu/thân khi vung tay ở mức như tay áo cũ (tay áo phông: 119 lúc chạy); tay bồng công chúa và giáp vai hiệp sĩ thêm 18 (137), đều lọt vào trong khối đầu/thân nên không lộ ra.
- Không làm áo choàng (đã có ở khe `scarf`, và sẽ xuyên balo khe `back`); mọi chi tiết trên tay/chân nằm trong khung tay áo/ống quần chuẩn để giày khe `shoes` (rộng hơn) không z-fight.

## Kiểm tra đã chạy

- `pnpm vitest run packages/voxel apps/web/src/game/character apps/web/src/ui/creator apps/server/src/character`: 15 file, 729 test pass (mới: schema/`accessoryPieces`/`sym` ở `voxel-accessory.test.ts`; 6 test `character-clothes.test.ts`; test tab Quần áo ở `creator-screen.test.tsx`; server: áo mở mặc được, áo cấp 2 bị 403 `equipment-locked` tới khi lên Lv.2, hai bộ một lúc bị 400 `invalid-equipment`).
- Thêm: `tools/assets/kitbash-character.test.ts`, `tools/assets/character-library.test.ts`, `apps/web/src/game/content`: 3 file, 16 test pass.
- `pnpm typecheck`: server Done, web Done, 0 lỗi.
- `pnpm exec eslint --max-warnings=0 <các file đã sửa>`: 0 lỗi, 0 cảnh báo.
- `pnpm content:check`: OK — 761 file.
- `pnpm assets:check`: còn 1 lỗi không thuộc phần này — `hash mismatch: generated/review/accessories/item-hand-fishing-rod.png` (ảnh khe cầm tay của agent khác vừa vẽ lại sau lần sinh manifest gần nhất); chạy `pnpm assets:manifest` qua khóa là hết.
- E2E `pnpm exec playwright test --project setup --project creator --project account --workers=1`: 3/3 pass (18 s). Build web trong bước này có cảnh báo cũ “Some chunks are larger than 500 kB”.
- `pnpm assets:character`: chỉ 4 GLB của bé đổi (miu-cat, rabbit, fox, bear: 1 draw call, 31 clip, 420–492 tam giác); 28 GLB NPC không đổi byte nào. Manifest sinh lại qua `pnpm assets:manifest`.
- Không chạy: full `pnpm test`, `e2e:ci`, `perf` (theo brief).

## File thay đổi

- Schema và dựng mesh: `packages/voxel/src/accessory-schema.ts` (`CLOTHES_NODES`, `CLOTHES_VOXEL_SIZE`, `parts`, box `sym`, luật cho khe clothes, `MIN_OPEN_ITEMS.clothes` = 10), `packages/voxel/src/voxel-accessory.ts` (`accessoryPieces`, vẽ `sym`), `packages/voxel/src/voxel-accessory.test.ts`.
- Runtime: mới `apps/web/src/game/character/character-clothes.ts` + `.test.ts`; sửa nhỏ `character-accessories.ts` (nhánh clothes), `entities/player-character.ts` và `preview/character-preview.ts` (`withOwnClothes`, `outfit` chỉ liệt kê món bé chọn), `content/characters.ts` (`clothes`), `apps/web/src/preview/preview-main.ts` (icon quần áo).
- Trang tạo nhân vật: `apps/web/src/ui/creator/creator-outfit.ts` (bỏ `COMING_SLOTS`, thêm `slotHasNone`, `wornInSlot`), `creator-screen.tsx`, `creator-screen.test.tsx`.
- Server: `apps/server/src/character/character-routes.test.ts` (không đổi code server).
- Nội dung: 51 file `content/accessories/clothes-*.json`, mới `content/outfits/underlayer.json`, `content/characters.json` (4 loài: `outfit: underlayer`, `clothes`).
- Công cụ: `tools/assets/kitbash-character.ts` (trường `clothes`), `tools/assets/render-preview.ts` (ảnh nhân vật mặc bộ của loài, ảnh kiểm quần áo sau lưng/đang chạy; đã nằm trong commit f8af921 của coordinator).
- Asset sinh lại: 4 GLB `assets/generated/characters/{miu-cat,rabbit,fox,bear}.glb`, 51 icon `assets/generated/accessories/clothes-*.png`, 75 ảnh `assets/generated/review/accessories/item-clothes-*.png`, 4 ảnh `assets/generated/review/character/*-turn-0.png`, `assets/manifest.json`.
- Tài liệu: `docs/system-architecture.md` (một dòng quyết định về quần áo).
- Không có dependency mới.

Status: DONE_WITH_CONCERNS
Summary: 51 bộ quần áo (25 mẫu gốc) mở theo cấp 1–15 đúng phân bổ, mặc như một mesh skinned theo bộ xương nên đúng hướng và đi theo mọi động tác; model bé dựng với lớp lông bên trong, bé chưa chọn đồ thì mặc bộ của loài nên dáng cũ không đổi. Test, typecheck, lint, content:check, E2E creator/account đều pass.
Concerns:
- `pnpm assets:check` còn đỏ vì một ảnh khe cầm tay của agent khác (`item-hand-fishing-rod.png`); cần sinh lại manifest sau khi các agent vẽ xong.
- Ảnh chân dung UI (`*-anim-*.png`) và các ảnh duyệt khác của nhân vật vẫn là ảnh vẽ từ model cũ; nhìn giống hệt (đã đo ở `turn-0`) nên không vẽ lại. Lần chạy `assets:preview character` sau sẽ tự vẽ bằng model mới + bộ của loài.
- Váy loe (váy nơ, áo mưa, váy công chúa) vẫn để chân lọt trong lòng váy khi chạy, như váy nơ hiện có; muốn hết hẳn thì cần váy mềm theo chân (ngoài phạm vi lần này).
- Lần render dài từng treo ở ảnh thứ ~30 (đã có f017546); ảnh `item-clothes-*` được vẽ qua nhiều lượt nhỏ, ảnh của các mẫu không đổi giữ từ lượt đầu (cùng JSON, cùng GLB).
