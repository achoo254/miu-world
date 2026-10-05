# Mọi tương tác có hoạt cảnh, đúng chỗ, đồ vật phản hồi — báo cáo (05/10/2026)

Plan: `plans/dattqh/261005-1715-interactions-alive/plan.md` (pha 1–5). Kèm việc người sở hữu thêm giữa chừng: bỏ công tắc tắt online (game luôn online), commit riêng.

## Kết quả

| Pha | Làm gì | File chính |
| --- | --- | --- |
| 1 Động tác | 23 tư thế, mỗi tư thế một động tác dựng bằng code (`rest`, `lay`, `sleep`, `swing`, `watch`, `wash`, `cook`, `study`, `stretch`, `open`, `tap`, `hug`, `dance`, `smell`, `kick`, `eat`, `drink`, `fish`, `pet`, `water`, `sweep`, `cheer`, `wave`); bảng tư thế → động tác/clip/chỗ đặt một chỗ; xương trả về tư thế nghỉ mỗi khung (không còn đầu cúi mãi sau khi vuốt ve); nghiêng thân theo trục của chính bé (`YXZ`). 73 kiểu tương tác (65 cũ, gán lại tư thế đúng nghĩa; thêm cửa chính, tủ gầm cầu thang, hộp quà, xếp hình, vỏ ốc, lá thư, đàn piano, cầu trượt). Khớp model theo từ nguyên vẹn của tên file: hết các khớp sai cũ (`garden` → đèn, `workbench` → ghế, `cardboardBox` → bảng, `cabinetBed` → giường, `cabinetTelevision` → tivi, đom đóm → lửa trại, biển "nhà của bé" → cửa, mọi đồ trang trí → gấu bông) | `apps/web/src/game/interact/player-actions.ts`, `interaction-poses.ts`, `object-interaction-registry.ts`, `entities/player-character.ts` |
| 2 Chỗ ngồi, nằm, đu | `seats`/`lie`/`front`/`screen` trong `content/world/models.json` cho mọi model ngồi/nằm/màn hình mà các map đặt (cả mọi kiểu trang trí nhà), đo từ hình học model; hông trên mặt ghế quay ra trước, nằm dọc nệm chân về cuối giường, xem tivi ngồi trên sàn trước màn hình; controller chờ ở chỗ đứng trống trước ghế (`nearestUsableSpot`), không bao giờ vào trong vật; nút tương tác thành "Đứng dậy" khi đang ngồi; camera quay nhìn bé từ chỗ đứng đó. Xích đu: ván + dây là phần chuyển động riêng của model, bé ngồi trên ván và đung đưa như con lắc (24°, chu kỳ 2,4 s), đứng yên khi giảm chuyển động. Người khác thấy bé ngồi (`sit` của giao thức, trước đây bị bỏ qua) ở đúng chỗ thân | `interaction-geometry.ts`, `object-interaction-manager.ts`, `game.ts`, `multiplayer/remote-player-manager.ts` |
| 3 Hiệu ứng | Mỗi kiểu có `effect` hoặc `noEffect` (lý do): `light` (hào quang + một đèn thật dùng chung gần bé, không ở `low`), `glow`, `screen` (tivi hoạt hình, máy tính dòng chữ), `open` (cửa/nắp có bản lề), `door` (tự mở khi tới gần), `spin`, `sway`, `water`, `steam`, `symbols` (tim, nốt nhạc, sao, bong bóng, Zzz, lấp lánh). Hạt và hào quang: 2 draw call cho cả map; màn hình đang bật 1/cái; phần chuyển động 1/phần. Trạng thái bật/mở: nhà riêng lưu server (`GET`/`PUT /api/home-objects`, bảng `home_objects`, migration `0015`), map chung theo lượt, chỉ người đó thấy | `object-effects.ts`, `effect-particles.ts`, `object-states.ts`, `entities/props.ts`, `apps/server/src/home/home-object-routes.ts`, `apps/web/src/ui/play/use-home-objects.ts` |
| 4 Cửa nhà | Hai cánh cửa thật trong vòm (1,5 × 4, đầu trong cao 5 dưới đỉnh vòm), bản lề hai bên, mở vào trong khi bé tới gần 3,2 khối hoặc chạm, đóng sau khi bé đi xa; tủ gầm cầu thang còn nửa chiều cao (1,12), mở được, bên trong có chổi và hộp đồ chơi. Tủ áo (6 màu), tủ lạnh, hòm thư mèo, hòm thư nông trại có cánh/nắp mở và đồ bên trong. Sinh lại `nha-cua-be`; 3 audit sạch | `tools/world/structures/nha-cua-be-props.ts`, `generate-nha-cua-be-map.ts`, `tools/assets/build-box-props.ts` (`parts`) |
| 5 Kiểm tra máy | Test danh mục (mọi tư thế có động tác, mọi kiểu có hiệu ứng hoặc lý do, nhãn tắt song ngữ, mọi map và mọi kiểu trang trí có đủ dữ liệu ngồi/nằm/màn hình/phần mở, không model "trông dùng được" thiếu kiểu); `pnpm world:interactions` báo theo map; E2E `interactions.spec.ts` (project `interactions`) | `interaction-catalogue.test.ts`, `tools/world/interaction-coverage.ts`, `apps/web/e2e/interactions.spec.ts` |

Thêm (yêu cầu người sở hữu giữa đợt): bỏ công tắc tắt online, giữ công tắc bạn máy; bỏ cột `online_enabled` (migration `0016`), hub không còn đóng `4403`, client không chờ bật lại; Cài đặt chỉ còn "Bạn máy"; trang quyền riêng tư, xuất dữ liệu, tài liệu cập nhật. Commit `feat(multiplayer): online is always on`.

## Phủ theo map (`pnpm world:interactions`)

13 map: 0 dòng thiếu dữ liệu, 0 model "trông dùng được" không có kiểu (đèn treo cao ngoài tầm tay ghi lý do trong `NOT_INTERACTIVE`). Nhà của bé: 37 kiểu, 2 814 vật (tính mọi kiểu trang trí).

## Kiểm tra

- Gate: `pnpm assets:check` OK (16 pack, 4 597 file); `pnpm content:check` OK (1 868 file); `pnpm test` 504 file, 6 292 qua, 1 bỏ qua (có sẵn từ trước; một lượt chạy trước đó có `region-reward-routes.test.ts` hỏng một lần rồi qua khi chạy lại, không liên quan đợt này); `pnpm typecheck` sạch; `pnpm lint` 0 lỗi, 0 cảnh báo; `pnpm --filter @miu/web build` qua (cảnh báo chunk > 500 kB có sẵn từ trước); `pnpm security:dist` OK.
- E2E (máy dev, 1 worker): `--project setup --project interactions --project home --project play` 37 qua, 1 bỏ qua (ảnh review chỉ chạy với `REVIEW_SHOTS=1`); `e2e:smoke` 11 qua.
- Audit nhà: `scenery-audit` 0 cây trên đường, 0 vật chắn lối, 0 nơi lạc mạng đường; `room-audit` 2 không gian có mái, 0 thiếu chuẩn; `reach-audit` mọi mục tới được, chỗ xuất hiện trống.
- Draw call: nhà của bé ở `quality=high`, một đèn bật và tivi mở, trên GPU máy Mac: 152 call, 217 929 tam giác (máy Mac đếm nhiều hơn GPU giả lập của CI khoảng 25 call, CI là nơi đánh giá ngân sách 150). Phần thêm của đợt: hạt + hào quang 2, màn hình đang bật 1/cái, phần chuyển động trong nhà ≤ 11 (2 cánh cửa, 2 ván xích đu, 2 cánh tủ áo, 2 cánh tủ lạnh, nắp hòm thư, cửa tủ gầm cầu thang, quả địa cầu); đèn thật không thêm call.

## Review độc lập (code-reviewer) và xử lý

| Phát hiện | Xử lý |
| --- | --- |
| Cao: vào nhà bạn, đồ vật bật là của mình và bật/tắt ở đó lưu đè trạng thái nhà mình | Sửa: khi ở nhà người khác (`visitingHost`), mọi thứ hiện tắt, bật/tắt chỉ trong lượt, không lưu; về nhà mình hiện lại như cũ (`ObjectStates.setKeeping`, test) |
| Cao: tìm vật gần nhất tính lại giữa vật mỗi khung (≈1,2 ms/khung, ~25 nghìn cấp phát ở Chợ phiên) | Sửa: giữa vật tính một lần khi lập danh sách; khớp model nhớ theo model + slot |
| Trung bình: chạm là bị dịch chỗ (cả khi đứng làm động tác) | Sửa: chỉ dời controller khi bé ngồi/nằm/xem (test) |
| Trung bình: chỗ đứng dậy hay chỗ xem tivi có thể ở sau tường | Sửa: chỗ phải cùng tầng, ≤ 4,5 khối và không có tường khối giữa (test) |
| Trung bình: không gỡ tương tác khi bị dời (nút "Quay lại", xe, qua cổng) | Sửa: `cancel()` ở các chỗ đó |
| Trung bình: đèn thật trên mọi map ở `mid`/`high` | Sửa: chỉ map có đèn bật được |
| Trung bình: khóa cũ không bao giờ bị xóa, có thể chạm giới hạn 96 | Sửa: chỉ lưu khóa của vật map còn có |
| Trung bình: lưu có thể tới server sai thứ tự | Sửa: lưu nối tiếp (test hook) |
| Trung bình: số liệu debug tính mỗi khung | Sửa: chỉ khi `objects=1` hoặc `stats` |
| Thấp: cấp phát quaternion/màu mỗi khung | Sửa |
| Thấp: cánh cửa `walk-through` nên đóng tay vẫn đi xuyên; người khác thấy bé nằm thành ngồi (giao thức chỉ có `sit`) | Giữ: cửa tự mở khi tới gần là ý định; không đổi giao thức theo yêu cầu |
| Thấp: khóa `playerCare.onlineHint` cũ tên | Đổi thành `playerCare.settingsHint` |
| Hai commit server và online | Không có lỗi; lưu ý: tab còn bản cũ gửi `onlineEnabled` sẽ nhận 400 sau deploy; migration `0016` bỏ cột không đảo được, deploy phải dừng server cũ trước |

## Ảnh trước/sau (không commit)

`.data/interactions/review-shots/`: `before-front-door.png`, `before-stair-cupboard.png`, `before-chair-seated.png` (camera lọt trong ghế), `before-swing.png`, `before-lamp-lit.png`, `before-tv-on.png`; `after-front-door-open.png`, `after-stair-cupboard.png`, `after-chair-seated.png`, `after-sofa-seated.png`, `after-swing.png`, `after-lamp-lit.png`, `after-tv-on.png`, `after-bed.png`, `after-wardrobe-open.png`. Sinh lại: `REVIEW_SHOTS=1 pnpm --filter @miu/web e2e --project setup --project interactions`.

## Dependency mới

Không.

## Còn lại, cho người duyệt

- Quả địa cầu và bảng thời khóa biểu trong nhà nằm cạnh mục tiêu quest (thời khóa biểu): nút tương tác thuộc quest, nên E2E không lấy mẫu được `spin` và `sweep` ở nhà (đã có unit test); trên map khác vẫn chạm được.
- Bếp và bồn rửa bát vẫn mở màn nấu ăn như trước (hành vi có sẵn), động tác chạy tiếp sau khi đóng màn.
- Đồ vật bật trong nhà riêng là trạng thái chơi như trang trí nhà (đã ghi ở trang quyền riêng tư, lời đồng ý giữ v3 theo quyết định trước).
