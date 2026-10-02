# Pha 2 — dựng một map mới theo tấm mock chi tiết (bản giao việc cho agent)

Tier: L mỗi map. Plan: `plan.md` cùng thư mục. Khuôn: `plans/dattqh/261002-0802-detail-mocks-per-map/phase-04-map-rework-brief.md` — **đọc hết tệp đó trước**: bộ dựng chung, prop hộp, góc chụp, vòng sửa–chụp–so, kiểm tra, quy tắc đều áp nguyên ở đây. Tệp này chỉ ghi phần khác.

## Khác với bản giao việc cũ

- Đây là **map mới**, chưa có generator: viết `tools/world/generate-<map>-map.ts` bằng `generateZoneMap` (`tools/world/zone-map.ts`), xuất `generate<TênMap>()` và gọi `runIfMain(import.meta.url, generate…)` như `tools/world/generate-lau-dai-map.ts`. Lệnh `pnpm world:<map>` đã khai trong `package.json`. Bạn tự đặt `ZONES` (khu bài học) theo bảng của map mình bên dưới; mỗi khu đủ rộng cho 4–6 bài sau này (khoảng 60 × 50 khối trở lên), nền phẳng ở mức `ground`.
- Nền riêng (`soil`) đã có khối: Trung tâm `grass-hub`; Núi tuyết `grass-snow` (mặt tuyết, cạnh đất phủ tuyết); Đảo bí ẩn `grass-island`. Khối mới khác: `ice` (băng, đi được), `lava` (dung nham, tự sáng), `crystal` (pha lê xanh, tự sáng); có sẵn `snow`, `sand`, `water`, `cobble`, `cobble-grey`, `paver`, `trail`, `planks`, `lantern`, `iron`, `rock-moss`… (`content/blocks.json`). Đừng thêm khối mới; cần thì ghi đề xuất vào báo cáo.
- Vùng đất ngoài: dùng theme có sẵn (`OUTLAND_THEMES` trong `packages/voxel/src/outland.ts`), ghi lý do chọn trong báo cáo; không thêm theme.
- Cổng: map Trung tâm (`trung-tam`) là trung tâm (`HUB_REGION`); map chủ điểm để mặc định (cổng về Trung tâm cạnh chỗ xuất hiện). Map Trung tâm khai `gates` sang **mười** map: `truong-hoc`, `khu-rung-bi-mat`, `lang-ven-song`, `xom-mai-am`, `cho-phien`, `nong-trai`, `thu-vien`, `lau-dai`, `nui-tuyet`, `dao-bi-an`.
- Góc chụp: `content/world/mock-views/<map>.json`, frame là `<thư mục designs>/<tên khung không đuôi>` (vd `nui-tuyet/d-04-khu-truot-tuyet`); đủ mọi khung `d-*` của map. Prop hộp: `content/world/box-props/<map>.json`, tiền tố id `tt-` (Trung tâm), `nt-` (Núi tuyết), `dba-` (Đảo bí ẩn).
- Test: thêm **một dòng** cho map của mình vào `MAPS` trong `tools/world/zone-maps.test.ts` (và import generator) bằng Edit; agent khác cũng sửa tệp này, Edit lỗi vì tệp đổi thì đọc lại rồi làm lại. Chạy `pnpm vitest run tools/world/zone-maps.test.ts -t "<map> map"`.
- Đường dẫn công cụ: `<LOCK>` = `/private/tmp/claude-501/-Users-hoandat-inet-gitlab-miu-world/51070a80-962b-4736-8834-dd97764a344e/scratchpad/tools/with-lock.mjs`; `<COMPARE>` = `…/scratchpad/tools/compare.py` (cùng thư mục), ảnh ghép ra ở `…/scratchpad/`. Ghép: `~/.claude/skills/.venv/bin/python3 <COMPARE> <map id>`.
- Mọi lệnh ghi `assets/` chung (`pnpm assets:box-props`, `pnpm assets:manifest`, `pnpm assets:preview`) chạy qua `node <LOCK> …`.
- Có hai phiên Claude khác đang sửa `apps/web/**` trên `main`: không đụng `apps/**`.

## Hợp đồng địa danh cho quest chào mừng (bắt buộc)

Phiên chính viết một quest chào mừng chương 1 cho mỗi map; mục quest đứng quanh landmark có **đúng tên** dưới đây (`ctx.landmark(id, tên, x, z)`). Mọi landmark trong bảng này phải: nằm trong khu chương 1, ngoài trời, trên nền khu ở mức `ground` (đứng được, không trên mái, không trong nhà), cách nhau ít nhất 10 khối và cách landmark đầu tiên không quá 30 khối, quanh mỗi cái có chỗ trống đứng được trong bán kính 6 khối. Các landmark khác (phòng trong nhà, khu xa) đặt tự do, tên tùy.

| Map | Khu chương 1 | Landmark bắt buộc (id → tên) |
| --- | --- | --- |
| `trung-tam` | Quảng trường trung tâm | `dai-phun-nuoc` → "Đài phun nước tượng mèo" (landmark đầu); `bang-nhiem-vu` → "Bảng nhiệm vụ"; `truoc-cua-hang` → "Trước cửa hàng"; `cong-dich-chuyen` → "Dãy cổng dịch chuyển"; `cho-to-doi` → "Chòi chờ tổ đội" |
| `nui-tuyet` | Làng núi tuyết | `cong-vao` → "Cổng vào núi tuyết" (landmark đầu); `quang-truong-lang` → "Quảng trường làng tuyết"; `tram-nhiem-vu` → "Trạm nhiệm vụ"; `truoc-cua-hang-do-am` → "Trước cửa hàng đồ ấm"; `nguoi-tuyet` → "Bãi người tuyết" |
| `dao-bi-an` | Bến tàu và bãi biển | `ben-tau` → "Bến tàu" (landmark đầu); `bai-bien` → "Bãi biển"; `ruong-cat` → "Rương vùi trong cát"; `leu-thuyen-truong` → "Lều thuyền trưởng"; `cay-dua-nghieng` → "Cây dừa nghiêng" |

Bạn chạy `pnpm content:check` không được (quest chưa có); phiên chính sẽ chạy sau.

## Map Trung tâm (`trung-tam`) — `designs/trung-tam/d-01 … d-08`

Người sở hữu (02/10/2026): map Trung tâm là nơi các bạn nhỏ **gặp nhau khi chơi online**, ở giữa thế giới; mọi map đi từ đây. Mock: quảng trường lát đá tròn có đài phun nhiều tầng và tượng mèo trắng lớn ôm sách ở giữa; phía sau là bậc thang lên lâu đài lớn (cổng có ô sáng xanh, tháp mái đỏ cờ) — phông nền, mặt tiền và sảnh đủ, không cần đi khắp bên trong; dãy cổng dịch chuyển vòm đá có ô sáng màu riêng và biển tên từng map (d-06: Làng, Rừng xanh, Núi tuyết, Đảo bí ẩn, Lâu đài… — đủ mười map); cửa hàng gỗ có mái sọc, biển "Cửa hàng", quầy, kệ (d-02, đi vào được); khu giao dịch: nhiều bàn sạp nhỏ giữa người chơi (d-03); bảng nhiệm vụ / sự kiện lớn có dấu "!" vàng (d-04); chòi chờ tổ đội mái xanh, ghế dài, biển "Team" (d-05); kênh nước vòng quanh, cầu đá vòm, cầu trung tâm có cột đèn lồng, cờ đỏ huy hiệu mèo, biển chỉ đường gỗ (Khu sống, Khu học tập, Khu mua bán, Lâu đài, Thư viện, Cảng biển — d-07); khu sự kiện theo mùa: sân khấu có màn hình, cây hoa anh đào hồng, dây cờ, bóng bay, sạp (d-08); tháp đồng hồ, khinh khí cầu và khí cầu bay trên trời (prop hộp lơ lửng), nhà mái xanh quanh rìa. Rất đông người: nhiều bạn nhỏ (vai `pupil`, `kite-flyer`, `shopper`…) đi lại, đứng thành nhóm như người chơi online, có tên tiếng Việt khác nhau; người bán ở cửa hàng và sạp.

Khu (gợi ý, tự chỉnh): 1 Quảng trường trung tâm; 2 Khu giao dịch và cửa hàng; 3 Khu sự kiện theo mùa; 4 Sân trước lâu đài. Biển tên cổng: prop hộp chữ pixel như `th-sign-*` của map Trường học (`content/world/box-props/truong-hoc.json`, chữ 4 × 5 ô, dấu tiếng Việt ở hàng trên); viết thêm script tạo biển chữ trong tệp riêng của map nếu cần, kết quả vẫn nằm trong `box-props/trung-tam.json`.

## Map Núi tuyết (`nui-tuyet`) — `designs/nui-tuyet/d-01 … d-15` (thêm `b-11`, `c-14`)

Mock: núi đá nhiều tầng phủ tuyết, thông tuyết dày, lâu đài trên đỉnh xa, nhiều thác đổ xuống hồ băng lớn có tảng băng nổi, cầu đá vòm nhiều nhịp, làng nhà gỗ mái tuyết; làng (d-02): đường lát đá, nhà gỗ hai tầng đèn vàng, cờ xanh bông tuyết, tháp đồng hồ, cột đèn; cổng vào (d-03): cổng gỗ–đá có cờ bông tuyết, đèn, lính gác áo ấm; khu trượt tuyết (d-04): dốc trắng, cờ đỏ, ván trượt, nhà nghỉ gỗ, cột cáp treo; cáp treo (d-05): cabin đỏ trên dây lên đỉnh — dùng làm `rides` (xe "Cáp treo", nhãn "Lên cáp treo", model prop hộp cabin); đỉnh núi và đài quan sát (d-06): mái vòm kính thiên văn, lan can, cờ; hồ băng (d-07) nền `ice` dưới vách thác; thác băng (d-08) và cầu gỗ treo; hang động băng (d-09): bên trong tường pha lê `crystal` phát sáng, cầu gỗ, đèn; trạm thám hiểm (d-10): nhà gỗ, chảo ăng-ten, cờ, thùng; nội thất (d-11 nhà dân có lò sưởi, d-12 cửa hàng đồ ấm có kệ áo mũ khăn, d-13 nhà nghỉ có đèn chùm, quầy, thảm đỏ, d-14 trạm nhiệm vụ có bảng bản đồ) — đi vào được, ưu tiên cửa hàng, nhà nghỉ, trạm nhiệm vụ; hoàng hôn (d-15) góc `mood: dusk` trên mỏm đá. Người: dân làng áo ấm, người trượt tuyết, nhà thám hiểm, người bán; vật: chim cánh cụt, gấu trắng, cáo, thỏ, nai (pack có sẵn).

Khu (gợi ý): 1 Làng núi tuyết (cổng, quảng trường, trạm nhiệm vụ, cửa hàng); 2 Khu trượt tuyết và ga cáp treo; 3 Hồ băng và thác băng; 4 Hang động băng và trạm thám hiểm; 5 Đỉnh núi và đài quan sát (cao: nối bằng cáp treo; nền khu vẫn phẳng).

## Map Đảo bí ẩn (`dao-bi-an`) — `designs/dao-bi-an/d-01 … d-14`

Đọc thêm yêu cầu ở `plans/dattqh/261002-1139-sgk-lop2-tap2-content/phase-04-dao-bi-an-map.md` (bài tập 2 vào sau; giờ chỉ dựng map). Mock: quần đảo trên biển xanh trong, đảo chính có núi đá cao và thác, nhiều đảo nhỏ quanh, bãi cát trắng, dừa; bến tàu (d-02) cầu gỗ dài, đèn treo, thùng, thuyền buồm (`SAILING_SHIP`); bãi biển (d-03): rương kho báu, cua, vòm đá xa; rừng nhiệt đới (d-04) cây lớn, dây leo, cầu treo gỗ; thác nước (d-05) giữa tàn tích có ô sáng xanh; khu di tích cổ (d-06): cổng đá có ký hiệu phát sáng, bậc; hang (d-07 lối vào có đèn đuốc và rào gỗ; d-08 bên trong: cầu gỗ, hồ nước, pha lê tím xanh phát sáng); đền thờ (d-09): sảnh đá, viên pha lê lớn sáng trên bệ; khu thử thách (d-10): khối đá có ký hiệu trên nền dung nham `lava`; núi lửa xa (d-11) dòng `lava`; bờ đá và hang hải tặc (d-12): thuyền cờ đầu lâu, cầu gỗ, đuốc; rừng đêm (d-13, `mood: dusk`): nấm và pha lê sáng, trăng; kho báu (d-14): phòng có đống vàng, rương, tượng vàng, ánh sáng. Biển dùng `water` (mức `water.level`) phủ quanh, đảo dùng `shape`. Người: ngư dân, thủy thủ, nhà thám hiểm, trẻ em; vật: cua, cá, vẹt, khỉ (pack có sẵn). Đi giữa đảo bằng thuyền (`rides` vehicle "Thuyền", nhãn "Lên thuyền").

Khu (gợi ý): 1 Bến tàu và bãi biển; 2 Rừng nhiệt đới và thác nước; 3 Khu di tích cổ và đền thờ; 4 Hang động và kho báu; 5 Bờ đá hải tặc.

## Chỉ sửa

Generator và `tools/world/structures/<map>-*.ts` mới, `content/world/{mock-views,box-props}/<map>.json`, dòng mới trong `content/world/models.json`, một dòng trong `tools/world/zone-maps.test.ts`, ảnh sinh ra của map (`assets/generated/world/<map>/`, `assets/generated/props/<tiền tố>-*`, `assets/generated/review/<map>/`) và manifest qua lệnh. Không `git add`, không commit. Không sửa `content/world/regions.json`, `targets.json`, `content/quests/**`, `apps/**`, tệp dựng chung.

## Báo cáo

`plans/dattqh/reports/map-<map>-261002-new-map.md` (tiếng Việt): mỗi khung một dòng (đạt / gần / chưa + điều thiếu), khu (`ZONES` tọa độ), landmark bắt buộc (tọa độ), số prop/người/vật, theme vùng ngoài và lý do, kết quả kiểm tra (test đạt/trượt, tsc, eslint), đề xuất, câu hỏi mở. Kết thúc bằng khối `Status / Summary / Concerns`.
