# Pha B: map Nhà của bé (03/10/2026)

Plan: `plans/dattqh/261003-1320-home-timetable-vehicles/plan.md` (pha B, mock ô 1–10 và 13). Quyết định: `plans/dattqh/reports/jev-261003-1310-home-vehicles.md`.

## Đã dựng

- **Map `nha-cua-be`** (`pnpm world:nha-cua-be`, `tools/world/generate-nha-cua-be-map.ts`): lõi 160 × 160 khối, vùng ngoài sinh lúc chơi theo theme `farm`. Nền cỏ riêng `grass-home` (block id 46, màu `#8fd07a`; atlas dựng lại, 46 block). Bé tới trên đường làng trước cổng trước (điểm bắt đầu chương 1 = spawn, khai qua `Zone.start` mới trong `zone-map.ts`).
- **Nhà hai tầng** (`tools/world/structures/nha-cua-be-house.ts`, 33 × 23): tường đá xám dưới, gỗ trên, dầm gỗ, mái ngói đỏ, ống khói dựng từ đất sau bếp, hai cửa sổ mái, cửa vòm 3 ô (cao 4–5) có hai cánh gỗ mở áp tường, đèn lồng hai bên, hoa leo, bồn hoa dưới cửa sổ, trần gỗ dưới mái, tường lót gỗ. Tầng 1: phòng khách thông lên mái (dầm treo đèn), cầu thang gỗ dọc tường tây (6 bậc, mỗi bậc 1 khối, sâu 2) lên sàn gác có lan can; bếp; phòng ăn sau bếp (vách có lối rộng 5 ô); nhà kho có cửa sau 3 × 3 ra chuồng. Tầng 2: góc học tập trên sàn gác, phòng ngủ, góc đồ chơi. Tầng 1 trống 6 khối đến sàn trên; tầng 2 ≥ 7 khối dưới mái.
- **Nội thất theo mock**: phòng khách (tivi trên tủ, sofa kem gối hồng, bàn trà trên thảm, hai ghế bành, kệ sách, góc pouf và gấu bông, cây, tranh, đèn tường, đèn treo); bếp (tủ lạnh có nam châm, dãy tủ và bồn rửa dưới kệ đĩa, tủ bát, chảo, nồi); phòng ăn (bàn ăn bốn ghế trên thảm, bánh kem và trái cây, đèn treo, bếp lò trước ống khói, thùng táo); nhà kho (kệ hũ hai bên, thùng, bao tải, giá dụng cụ, xẻng, cuốc, thùng gỗ, đèn); góc học tập (bàn học, ghế, đèn bàn, quả địa cầu, sách, **bảng "THỜI KHÓA BIỂU"** trên tường trên bàn, hai kệ sách cao, tranh vẽ ghim tường, góc đọc với ghế bành); phòng ngủ (giường chăn hồng chấm bi gối thỏ, hai bàn đầu giường, đèn ngủ, đồng hồ, rèm hồng mọi cửa sổ, thảm mặt mèo, bàn trang điểm, tủ quần áo, **lịch "LỊCH ĐỒNG PHỤC"** cạnh tủ); góc đồ chơi (ghế bành, gấu bông, kệ đồ chơi, thảm tròn, pouf).
- **Ngoài nhà**: cổng gỗ có mái ngói trong hàng rào trắng, lối lát đá giữa hai luống hoa, lối ngang tới hai cổng bên, ghế, bù nhìn, cờ mèo, đèn đường; ngoài cổng **biển tên "Nhà của {name}"** có đầu mèo (game vẽ chữ lúc chạy, điền tên nhân vật; khi không có tên thì "bạn") và hộp thư mèo; vườn rau cạnh nhà (luống cà rốt, bắp cải, bí, hàng hướng dương, bãi cỏ, nhà kho nhỏ có giá dụng cụ, bình tưới); chuồng sau nhà (chuồng gà bằng gỗ mái ngói có cửa chui, ổ gà, máng, rơm, hai đống rơm, can sữa); ao có suối chảy ra mép map, cầu tàu gỗ, thuyền, xô cá, hoa súng; cối xay gió (đặc bên trong).
- **Sinh hoạt**: Ông nội làm vườn, Bà nội tưới rau, Cô Út cho gà ăn, chú hàng xóm vắt sữa, cô hàng xóm phơi áo, chú đưa thư, anh họ thả diều; Cún Mực, hai mèo, 12 gà, 2 bò (24 ambient).
- **Hai mục tiêu cho thời khóa biểu** (kind `object`, không model, luôn có mặt): `nha-thoi-khoa-bieu` tại [77.5, 20, 75.5] trước bàn học (bảng treo trên tường ngay trên bàn), `nha-lich-dong-phuc` tại [85.5, 20, 65.5] cạnh tủ quần áo. Chạm vào phát `{type:'interaction', targetId}` sẵn có. Mục tiêu riêng của map (`ctx.target` mới trong `zone-map.ts`) không bị gắn chapter/quest nên luôn hiện.
- **Quest chào mừng `nha-cua-be-ch1`** (bắt buộc: `content:check` đòi mọi vùng mở có quest active; cùng cách Trung tâm, Núi tuyết, Đảo bí ẩn): gặp Mèo Bánh Bao ở cổng → nhặt 3 đồ ngoài sân → đọc biển tên → xếp đồ làm vườn/đồ nấu ăn với Bố ở nhà kho nhỏ → so 16 > 13 quả trứng với Mẹ ở chuồng gà → chọn món tối → câu đố 8 + 5 ở cầu tàu → bữa cơm chiều → bước "next" chỉ lên góc học tập xem thời khóa biểu và lịch đồng phục. Nhân vật mới trong `content/world/targets.json`: `meo-banh-bao` (guide), `nha-me`, `nha-bo`, `nha-la-thu`, `nha-hoa-cuc`, `nha-chau-cay`, `nha-xo-ca`. Tên tệp xếp sau `forest-ch1`, bé mới vẫn bắt đầu ở Khu rừng. Nội dung là bản nháp AI, `review: teacher-pending`.
- **Cổng ở Trung tâm**: cổng thứ 11 màu `coral` (thêm vào `packages/voxel/src/portal-colours.ts`, tia lửa cổng dùng chung) ở góc tây nam quảng trường [378, 476], quay về đài phun; biển tên trên cổng "NHÀ CỦA BÉ" (`tt-sign-nha-cua-be`); gate `cong-nha-cua-be`. `placePortalFacing(…, 'north' | 'south')` thay cho bản chỉ quay nam.
- **Home**: nút "Về nhà" (icon nhà) đầu thanh điều hướng → `/play?region=nha-cua-be&quest=nha-cua-be-ch1` (không có quest thì `/region/nha-cua-be`). Thẻ "Nhà của {name}" trên đảo giờ mở. `HOME_REGION` dùng chung ở `apps/web/src/ui/region/regions.ts`.
- **Runtime**: `namedForPlayer` điền `{name}` vào tên, nhãn và bảng vẽ của mục tiêu (lời nhắc "Cổng sang Nhà của Mochi", biển tên); bảng vẽ chữ tự thu cỡ chữ khi dòng dài (câu đố cây cổ thụ không đổi).
- Backdrop màn vùng: `assets/generated/regions/nha-cua-be.png` (camera trên đường làng nhìn vào cổng và nhà).

## Kiểm tra

| Kiểm | Kết quả |
| --- | --- |
| `scenery-audit nha-cua-be` | 0 cây trên đường, 0 vật chắn lối, 0 nơi xa đường, 0 nơi bị cắt khỏi mạng đường |
| `room-audit nha-cua-be` | 2 không gian có mái, 0 thiếu chuẩn. Nhà: 850 ô sàn (cả hai tầng), cửa 3 ô, bậc 0, **87% sàn trống**, 100% tới được. Nhà kho nhỏ: 12 ô, cửa 3, 92% trống |
| `reach-audit nha-cua-be` | mọi mục tiêu tới được (cả hai bảng tầng 2 qua cầu thang); điểm bắt đầu trống |
| `scenery/room/reach-audit trung-tam` | 0 / 284 không gian, 0 thiếu / mọi mục tiêu tới được |
| `pnpm assets:check` | OK — 16 pack, 4303 file |
| `pnpm content:check` | OK — 1017 file |
| `pnpm typecheck` | sạch |
| `pnpm lint` | sạch (0 warning) |
| `pnpm --filter @miu/web build` | OK; cảnh báo chunk > 500 kB (`accessories-*.js` 1,2 MB) có từ trước, không do pha này; `pnpm security:dist` OK |
| `vitest tools/world/zone-maps.test.ts` | 40/40 (cả 10 map; nhà: 160 × 160, ≥ 10 interactable, ≥ 6 người, ≥ 15 con vật; các map khác output không đổi) |
| `vitest` khác | `model-catalog`, `generate-world-overview`, `mock-views`, `generate-school-map`, `check-content`, `quest-spread`, `content-variety`, `interactables` (+2 test `namedForPlayer`), `home-screens` (15/15) đều pass |
| E2E | **chưa chạy** (theo yêu cầu). Đã sửa `home.spec.ts` (thẻ nhà mở, href "Về nhà") và `maps.spec.ts` (thêm `nha-cua-be` vào danh sách map mở cạnh guide trong ngân sách draw call; test mới: cổng coral ở Trung tâm → nhà, tới đúng điểm bắt đầu, cổng nhà → Trung tâm) |

## Ảnh preview (đã xem)

`assets/generated/review/nha-cua-be/`: `nha-cua-be-toan-canh.png`, `-tren-cao.png`, `-cong-truoc.png`, `-san-truoc.png`, `-phong-khach.png`, `-bep-an.png`, `-nha-kho.png`, `-goc-hoc-tap.png`, `-phong-ngu.png`, `-goc-do-choi.png`, `-vuon-rau.png`, `-kho-vuon.png`, `-chuong-ga.png`, `-cau-tau.png`, `-coi-xay-gio.png`, `-nha-va-vuon.png`; backdrop `assets/generated/regions/nha-cua-be.png`. So với mô tả mock: ô 1 (ngoài nhà, cửa vòm, đèn, hoa leo, cửa sổ mái, ống khói, hàng rào, hộp thư mèo, cờ mèo, ao + cầu tàu, cối xay gió), ô 2 (cắt ngang: phòng khách thông tầng, sàn gác lan can, cầu thang), ô 3–7, 8–10 và 13 đều có. Không có ảnh mock trên đĩa nên chưa có `content/world/mock-views/nha-cua-be.json` (test mock-views đòi file khung).

## File đã sửa ngoài danh sách được giao (cần phiên chính biết)

- `content/quests/nha-cua-be-ch1.json` (mới) — bắt buộc để vùng mở chơi được (`play-screen` chọn vùng theo quest; `content:check` đòi quest active cho vùng mở). Không ai khác sở hữu.
- `packages/voxel/src/portal-colours.ts` — thêm màu `coral` (một dòng dữ liệu).
- `tools/assets/generated.json` — thêm glob `generated/world/nha-cua-be/**` (thiếu thì manifest không nhận map).
- `tools/assets/render-preview.ts` — thêm `nha-cua-be` vào `ZONE_MAPS` (một dòng).
- `apps/web/e2e/home.spec.ts`, `apps/web/e2e/maps.spec.ts` — test liệt kê vùng/map.
- `tools/world/structures/xom-mai-am-home.ts` — chỉ export `lineInside` để dùng lại.

Không đụng `apps/server/**`, `packages/schema/src/timetable*`, `apps/web/src/ui/timetable/**`, `apps/web/src/ui/play/**`, `content/accessories/**`, file xe. Không thêm dependency.

## Việc còn cho phiên chính (pha D)

- Chạy `pnpm --filter @miu/web e2e:ci` (thêm 2 test: nhà mở cạnh guide; cổng coral). Chưa xác minh trực tiếp camera đi theo bé trong nhà (ảnh preview dùng camera đứng; trần tầng 1 cao 6 khối, camera mặc định ~3,5 khối trên chân).
- Trang review (`apps/web/review.html`, `apps/web/src/review/review-main.ts`) chưa có mục Nhà của bé.
- Ảnh đảo Home (`world:overview` + `assets:home`) không đổi: đảo nhà vẫn là nhà nhỏ một tầng; thẻ trên đảo là DOM nên đã hiện mở. Muốn đảo giống nhà hai tầng thì dựng lại hai lệnh đó.
- E2E `home.spec.ts` "every region as a card with nothing overlapping" nay có thẻ nhà mở thay cho ghim khóa: vị trí nhãn không đổi (`hotspot` 56/88) nhưng thẻ rộng hơn ghim, cần xem kết quả trên iPad/điện thoại.
- `docs/project-roadmap.md` chưa cập nhật (việc của phiên chính khi gom pha).

## Đề xuất sửa CLAUDE.md

- Dòng "Mục tiêu quest trên map đặt … khi chạy `pnpm world:<map>` (`forest`, …, `dao-bi-an`)": thêm `nha-cua-be`.
- "Mười một map chơi được: lõi 800 × 48 × 800 …" → "Mười hai map chơi được: lõi 800 × 48 × 800 (Nhà của bé `nha-cua-be` lõi 160 × 160) …".
- "Trung tâm (`trung-tam`) là map trung tâm có cổng sang mười map" → "… có cổng sang mười map và cổng về Nhà của bé".
- Có thể thêm: "Nhà của bé: thời khóa biểu và lịch đồng phục là hai mục tiêu `nha-thoi-khoa-bieu`, `nha-lich-dong-phuc` trên tường tầng 2; đồ dựng bằng hộp sinh bằng `tools/world/structures/nha-cua-be-props.ts`."

## Câu hỏi còn mở

- Không có câu hỏi chặn. Tên gia đình (Mẹ, Bố, Ông nội, Bà nội, Cô Út, Mèo Bánh Bao) và nội dung quest là bản nháp chờ giáo viên/người sở hữu duyệt.

Status: DONE_WITH_CONCERNS
Summary: Map `nha-cua-be` đã dựng theo mock ô 1–10 và 13 (nhà hai tầng đủ phòng, sân, vườn, chuồng, ao, biển tên mèo), có hai mục tiêu thời khóa biểu/lịch đồng phục, cổng coral ở Trung tâm và nút "Về nhà"; ba audit về 0, gate tĩnh, typecheck, lint, build đều sạch.
Concerns: E2E chưa chạy (đã sửa spec); camera đi theo trong nhà chưa thử trực tiếp; đã sửa vài file ngoài danh sách (liệt kê ở trên); ảnh đảo Home và trang review chưa cập nhật.
