# Phương tiện lái (khe `vehicle`): báo cáo 03/10/2026

Người sở hữu (03/10/2026): thêm khoảng 50 phương tiện bé lái được, mở theo cấp; "lưu ý thiết kế hướng của đồ vật khi gắn lên người phải chuẩn"; sau đó thêm: "bé chưa có hành động ngồi, khi lái xe yêu cầu phải thay đổi tư thế ngồi hoặc đứng tùy phương tiện".

## Thiết kế

- **Dữ liệu.** Phương tiện dùng chung định dạng voxel của phụ kiện (`boxes`, `palette`, `variants`, biến thể màu qua `variantOf`). Schema (`packages/voxel/src/accessory-schema.ts`) có thêm trường `ride`, chỉ dành cho khe `vehicle` và bắt buộc với khe này:
  - `pose`: `stand` (đứng: ván trượt, scooter, ván bay, ván tên lửa), `sit` (ngồi duỗi chân: mây, thảm bay, xe vịt, thiên nga, bí ngô, rồng, phi thuyền) hoặc `drive` (ngồi lái, tay cầm vô lăng hoặc tay lái: ô tô, xe ba bánh, xe buýt, máy cày, tàu hỏa, xe cứu hỏa, xe bọ rùa, xe kem đạp).
  - `height`: mặt sàn dưới chân với `stand`, hoặc mặt ghế với `sit`/`drive` (đơn vị model).
  - `float`: xe bay (mây, thảm, ván bay, phi thuyền) nhấp nhô nhẹ.
  - `attachNode` của phương tiện luôn là `ground`. Schema kiểm cả hai chiều: phương tiện phải có `ride` và `ground`, món khác không được có.
- **Quy ước hướng.** Mặt trước phương tiện nằm ở +z, cũng là hướng nhìn của model nhân vật. Điều này đã kiểm trong code: `rotation.y = facing`, `facing = atan2(dirX, dirZ)`, quai balo ở z > 0, giày có mũi ở +z. Tâm phương tiện nằm ở x = 0, z = 0, ngay dưới bé; voxel y = 0 là mặt đất.
- **Không đeo lên người.** `dressCharacter` bỏ qua khe `vehicle` (sửa 1 dòng). Phần lái nằm trong file mới `apps/web/src/game/player/vehicle-ride.ts`:
  - `equippedVehicle` tìm phương tiện trong bộ đồ đang mặc.
  - `createVehicleMesh` dựng 1 mesh, dùng chung material với phụ kiện. Mesh treo dưới root nhân vật và bù lại độ nâng, nên bánh xe chạm đất.
  - `rideLift`: với `stand` bằng `height`; với `sit`/`drive` bằng `height − 0,1`. Số 0,1 đo trên rig: ở clip `sit`/`drive` root hạ 0,2 và mông cách gốc chân 0,1 model. Mọi loài đều dùng rig Kenney character-a với cùng tỉ lệ.
  - `VehicleRide` giữ trạng thái thuần: lên/xuống, tự xuống khi chạm nước, không lên xe được khi đang ở dưới nước, độ nâng, nhấp nhô. Khi bật giảm chuyển động (reduced motion) thì đứng yên, không nhấp nhô.
  - `createRideControl` nối phần lái vào game.
- **Lái trong game** (`game.ts`, sửa tối thiểu):
  - HUD gửi lệnh bridge `{ type: 'ride', on }`. Game báo lại bằng event `{ type: 'vehicle', vehicle: { name, riding } | null }`, và snapshot có thêm `vehicle`. Event `loading` (sang map khác) xóa giá trị này.
  - Khi đang lái: root nhân vật được nâng thêm `liftWorld`, nhân vật giữ tư thế `idle` (`stand`) hoặc clip `sit`/`drive` của rig thay cho idle/walk/sprint (`player-character.ts`: tham số `seated`), camera bám theo sau như khi chạy.
  - `PlayerController.riding` đổi tốc độ: 8,5 khối/giây, giữ Chạy thì 10 (đi bộ 3,4, chạy 6,2).
  - Thân va chạm không đổi, nên bước, trèo, tường và nhảy (kể cả nhảy đôi) giữ như cũ.
  - Giải phóng: mesh dựng ở lần lên xe đầu tiên, ẩn khi xuống xe, `dispose` khi rời game.
- **HUD.** Nút mới `apps/web/src/ui/hud/ride-button.tsx` (NEW SCREEN trên M3.2) nằm trên joystick, chỉ hiện khi bé đã trang bị phương tiện. Chữ trên nút là "Lái xe" hoặc "Xuống xe", kèm biểu tượng ô tô của bộ Fluent đã có trong manifest (`props/automobile.png`). Nút có `aria-pressed`, màu lấy từ token, tự ẩn khi có màn hình che game.
- **Xem trước.** Creator preview hiện bé ngồi hoặc đứng trên xe đã chọn, giữ đúng tư thế của xe; emote xong thì quay về tư thế đó. Trang `preview.html` (`acc=` có phương tiện) cũng đặt xe dưới bé. Nhóm ảnh `accessories` chụp mỗi mẫu xe 2 ảnh: `item-<id>.png` (chính diện 3/4, yaw 35) và `item-<id>-side.png` (ngang, yaw 90), đều theo tư thế của xe.
- `MIN_OPEN_ITEMS.vehicle` = 10.

## Món theo cấp (51 món, 19 mẫu gốc)

| Cấp | Món |
| --- | --- |
| 1 (10) | Ván trượt đỏ, Ván trượt xanh dương, Xe scooter hồng, Xe scooter xanh lá, Xe ba bánh đỏ, Xe ba bánh xanh dương, Ô tô tí hon đỏ, Ô tô tí hon xanh dương, Xe vịt vàng, Xe kem dâu |
| 2 | Ván trượt xanh lá, Xe scooter tím, Xe ba bánh vàng, Xe vịt trắng |
| 3 | Xe kem bạc hà, Ô tô tí hon hồng, Xe buýt nhỏ vàng, Ván trượt cầu vồng |
| 4 | Máy cày đỏ, Xe buýt nhỏ xanh dương, Xe vịt hồng, Xe kem sô-cô-la |
| 5 | Tàu hỏa nhỏ đỏ, Máy cày xanh lá, Xe buýt nhỏ hồng, Xe cứu hỏa nhỏ |
| 6 | Ván bay xanh dương, Tàu hỏa nhỏ xanh dương, Máy cày cam |
| 7 | Đám mây trắng, Ván bay hồng, Tàu hỏa nhỏ xanh lá |
| 8 | Thảm bay đỏ, Đám mây hồng, Ván bay xanh lá |
| 9 | Ván tên lửa đỏ, Thảm bay xanh dương, Đám mây hoàng hôn |
| 10 | Ván tên lửa bạc, Thảm bay tím, Xe bọ rùa đỏ |
| 11 | Xe bí ngô, Ván tên lửa vàng |
| 12 | Xe bọ rùa vàng, Đám mây cầu vồng |
| 13 | Xe thiên nga trắng, Thảm bay vàng |
| 14 | Xe thiên nga hồng, Xe rồng vàng |
| 15 | Xe rồng ngọc bích, Phi thuyền ngôi sao |

Mẫu gốc: ván trượt, scooter, xe ba bánh, ô tô tí hon, xe vịt, xe kem đạp, xe buýt nhỏ mui trần, máy cày, tàu hỏa hơi nước, xe cứu hỏa, ván bay, đám mây có mặt cười, thảm bay, ván tên lửa, xe bọ rùa, xe bí ngô, xe thiên nga, xe rồng, phi thuyền ngôi sao.

Tên đều là tiếng Việt tự nhiên và không trùng nhau (có test kiểm). Số tam giác mỗi xe từ 138 đến 682, dưới ngân sách 1.500.

## Kiểm hướng và độ khớp

- **Ảnh** (`assets/generated/review/accessories/item-vehicle-*.png`, 38 ảnh, mỗi mẫu gốc có ảnh chính diện và ảnh ngang). Đã xem từng ảnh:
  - Đầu xe, đèn pha, đầu vịt, đầu thiên nga, đầu rồng, đầu bọ rùa, nồi hơi tàu và mũi ván đều ở phía bé nhìn tới. Ở ảnh ngang, đầu xe nằm bên trái, đúng với yaw 90.
  - Bánh xe chạm đất.
  - Bé đứng trên mặt ván. Với xe `sit`/`drive`, bé ngồi trên ghế, chân duỗi trong thân xe, không lơ lửng và không lún qua sàn.
  - Với xe `drive`, tay bé chạm vô lăng (ô tô, máy cày, tàu) hoặc tay lái (xe kem).
- **Icon** (`assets/generated/accessories/vehicle-*.png`): đủ 51 ảnh, đã xem bảng ghép.
- **Test tự động cho mọi mẫu gốc** (`vehicle-ride.test.ts`):
  - không voxel nào dưới mặt đất, và xe có bánh thì chạm đất;
  - có voxel ngay dưới tâm bé (mặt ván hoặc ghế) và khoảng trống ngay trên;
  - với xe ngồi: vùng chân duỗi (x ±6, ghế +1…+6, z 0…8 voxel) trống hoàn toàn;
  - với xe lái: có vật để cầm ở chỗ tay của tư thế `drive`;
  - mesh treo đúng `−rideLift`.

## Test đã chạy

| Lệnh | Kết quả |
| --- | --- |
| `pnpm vitest run packages/voxel apps/server/src/character apps/web/src/game/player apps/web/src/ui/creator` | 21 file, 786 test, pass |
| `pnpm vitest run apps/web/src/game apps/web/src/ui/hud apps/web/src/game-bridge` | 21 file, 135 test, pass |
| `pnpm typecheck` | exit 0, 0 lỗi |
| `pnpm exec eslint --max-warnings=0 <các file đã sửa>` | exit 0 |
| `pnpm --filter @miu/web e2e --project setup --project play --workers=1` | 23/23 pass, 67 s; có bước build web; test xe mới mất 2 s |
| `pnpm content:check` | đỏ, 64 lỗi, tất cả là "has no picture" của món khe khác (mũ, giày, cánh…) do các agent khác chưa vẽ; 0 lỗi về phương tiện |

Test mới:

- `apps/web/src/game/player/vehicle-ride.test.ts`:
  - tốc độ 8,5 và 10, đi bộ/chạy giữ nguyên;
  - bật/tắt, không có xe thì không lên;
  - tự xuống khi chạm nước, không lên được khi ở dưới nước;
  - độ nâng, có nhấp nhô; đứng yên khi giảm chuyển động;
  - tư thế theo xe: ván trượt và scooter đứng, mây và thảm ngồi, ô tô và tàu lái;
  - lệnh `ride` → controller, mesh, event, `dispose`;
  - độ khớp của 19 mẫu gốc.
- `apps/web/src/ui/hud/ride-button.test.tsx`: nút chỉ hiện khi có xe; gửi `ride on` và `ride off`.
- `apps/web/src/game-bridge/game-store.test.tsx`: reducer `vehicle`, `loading` xóa xe, lệnh `ride` đi tới game.
- `apps/server/src/character/character-routes.test.ts`: nhận xe mở; từ chối xe cấp 4 với 403 `equipment-locked`; từ chối hai xe cùng lúc với 400.
- `apps/web/e2e/play.spec.ts`: trẻ mới trang bị ván trượt qua API → bấm "Lái xe" → `riding` → giữ W thì tốc độ trên 7,5 → bấm "Xuống xe".

Không chạy: `pnpm test` toàn bộ, `e2e:ci` toàn bộ, `perf` (theo giao việc).

## File đã sửa hoặc thêm

- **Mới:**
  - `apps/web/src/game/player/vehicle-ride.ts`, `vehicle-ride.test.ts`
  - `apps/web/src/ui/hud/ride-button.tsx`, `ride-button.css`, `ride-button.test.tsx`
  - `content/accessories/vehicle-*.json` (51 file)
  - `assets/generated/accessories/vehicle-*.png` (51 file)
  - `assets/generated/review/accessories/item-vehicle-*.png` (38 file)
- **Sửa:**
  - `packages/voxel/src/accessory-schema.ts`: `ride`, `VEHICLE_NODE`, `MIN_OPEN_ITEMS.vehicle = 10`
  - `apps/web/src/game/character/character-accessories.ts`: bỏ qua xe, 1 dòng
  - `apps/web/src/game/entities/player-character.ts`: clip `sit`/`drive`, tham số `seated`
  - `apps/web/src/game/player/player-controller.ts`: `riding`, `RIDE_SPEED`, `RIDE_RUN_SPEED`
  - `apps/web/src/game/game.ts`
  - `apps/web/src/game-bridge/game-store.ts`
  - `apps/web/src/game/debug/stats-overlay.ts`: `speed`, `riding`
  - `apps/web/src/game/preview/character-preview.ts`
  - `apps/web/src/preview/preview-main.ts`
  - `apps/web/src/ui/hud/hud.tsx`
  - `apps/web/src/ui/kit/ui-art.ts`: icon `automobile`
  - `tools/assets/render-preview.ts`: ảnh ngang và tư thế của xe; vẫn giữ chế độ không watch file
  - các file test đã kể ở trên
- **Manifest:** các lệnh render tự sinh lại `assets/manifest.json`.

## Dependency mới

Không có.

Status: DONE_WITH_CONCERNS
Summary: Đã có 51 phương tiện (19 mẫu gốc) mở theo cấp 1–15, có nút "Lái xe"/"Xuống xe". Khi lái, bé đứng, ngồi hoặc ngồi lái tùy xe; xe quay đúng hướng bé và đặt ngay dưới bé; bé đi nhanh hơn (8,5/10 khối/giây) và tự xuống xe khi chạm nước. Unit, typecheck, lint và E2E `play` đều pass.
Concerns:
- `pnpm content:check` còn đỏ, chỉ vì ảnh món của các khe khác (agent khác) chưa vẽ.
- Xe to hơn thân va chạm (giữ nguyên theo yêu cầu) nên khi áp sát tường, phần mũi xe có thể lấn hình vào tường.
- Lúc tự đi theo thẻ nhiệm vụ mà đang lái thì chạy 10 khối/giây; trên máy FPS thấp có thể vượt quá điểm mốc một chút, rồi tự quay lại.
- Hằng số `SEAT_ABOVE_FEET = 0,1` đo trên rig hiện tại. Nếu đổi rig hoặc tỉ lệ chân thì cần đo lại, và test độ khớp sẽ không tự phát hiện việc này.
