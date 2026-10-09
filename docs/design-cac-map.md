# Thiết kế mẫu: thế giới và các map chủ điểm

Mock của người sở hữu (01/10/2026, hai ảnh, mỗi map có cận cảnh và toàn cảnh), chuẩn tạo hình khi dựng map trung tâm (Trường học) và các map chủ điểm bằng `tools/world/generate-*-map.ts`. Quyết định dùng mock thế nào: `plans/dattqh/reports/jev-261001-2315-map-mocks.md`. Plan: `plans/dattqh/261001-2106-more-maps-lesson-regroup/`.

Chữ trong ảnh, biển hiệu và đồ vật là gợi ý tạo hình, không phải asset: map chỉ dùng block, pack có license và prop dựng bằng code (xem `.claude/rules/assets-pipeline.md`). Mock Trường học trước đó: [`design-truong-hoc.md`](design-truong-hoc.md).

Ảnh gốc: `designs/the-gioi/mock-a-truong-hoc-va-cac-khu.png` (khung `a-*`), `designs/the-gioi/mock-b-toan-canh-cac-khu.png` (khung `b-*`).

## Cấu trúc theo mock

Hai ảnh toàn cảnh vẽ một vùng 256 × 256: Trường học ở giữa, quanh là Làng, Rừng, Hồ/Sông, Chợ, Nông trại, Núi, Bến tàu. Trong game: map Trường học dựng như ảnh đó. Từ 02/10/2026 trung tâm là map riêng **Trung tâm** (`trung-tam`, `HUB_REGION` trong `tools/world/zone-map.ts`; người sở hữu: nơi các bạn gặp nhau khi chơi online, ở giữa màn chọn map), có cổng sang cả mười map (từ 03/10/2026 thêm cổng về Nhà của bé); mỗi map có cổng về Trung tâm. Quảng trường cũ trong map Trường học giữ các cổng của nó.

## Thế giới (`designs/the-gioi/`)

| File | Nội dung cần có |
| --- | --- |
| `a-01-toan-canh-khu-vuc-256.png`, `b-01-toan-canh-khu-vuc-256.png` | Toàn cảnh: trường mái đỏ có tháp đồng hồ ở giữa, nhà đa năng mái xanh; đường nhựa có vạch qua đường và đèn; quanh là làng mái nhiều màu, ruộng và nông trại có cối xay gió, chợ, rừng, sông uốn quanh, hồ có cầu gỗ, bến tàu có hải đăng, núi đá có thác ở rìa; cây hoa hồng nhạt xen cây xanh. |
| `a-16-npc-nhan-vat.png` | Dàn người: bạn học, thầy giáo, cô giáo, bác bảo vệ, cô lao công, người bán hàng, nông dân, thủ thư, lính gác, người lớn khác. |
| `a-17-hoat-dong-tuong-tac.png` | Hoạt động: nói chuyện (bong bóng lời), mua hàng ở sạp, trồng cây và tưới nước, nhận nhiệm vụ ở bảng có dấu "!", đọc sách. |
| `b-04-ho-song-toan-canh.png` | Hồ, sông: mặt nước rộng, cầu tàu gỗ, thuyền buồm, nhà ven hồ, hải đăng đỏ trắng. Dùng cho Làng Ven Sông. |
| `b-09-ben-tau-toan-canh.png` | Bến tàu: bãi cát, cầu tàu, thuyền, quán ven bến, hải đăng trên mỏm đá. Dùng cho Làng Ven Sông. |
| `b-10-duong-chinh-toan-canh.png` | Đường chính: đường thẳng có vạch qua đường, đèn đường hai bên, hàng cây, nhà hai bên. Dùng quanh trường ở map trung tâm. |
| `b-12-hoang-hon-toan-canh.png` | Cả vùng lúc hoàng hôn (gợi ý ánh sáng chiều). |

## Từng map

| Map | File | Nội dung cần có |
| --- | --- | --- |
| Trường học (trung tâm) | `designs/truong-hoc/v2-a-02-cong-truong.png` … `v2-a-06-khu-vui-choi.png`, `v2-b-02-toan-canh-phia-truoc.png`, `v2-b-03-goc-nhin-phia-sau.png` | Cổng trụ đá, cánh cổng sắt, xe buýt vàng; sân trường có tượng đài và đài phun nước, ghế đá, bồn hoa; nhà đa năng mái vòm xanh với sân bóng rổ đỏ; vườn khoa học có nhà kính và luống gỗ; khu vui chơi có xích đu, cầu trượt, nhà hoa. |
| Trường học, trong nhà | `designs/truong-hoc/v2-a-11-phong-hoc.png` … `v2-a-15-phong-chuc-nang.png` | Phòng học (bảng xanh, bàn gỗ), phòng thư viện (kệ sách, bàn đọc; dùng cả cho phòng đọc của map Thư viện), hành lang, cầu thang gỗ, phòng chức năng (bảng, giá vẽ, đàn, tranh). |
| Làng Ven Sông | `designs/lang-ven-song/a-07-lang-can-canh.png`, `b-06-lang-toan-canh.png` | Nhà mái ngói đỏ và cam, tường vàng, cửa sổ xanh, hàng rào gỗ, sạp gỗ bán rau hoa, lối lát đá, cây xanh và cây hoa, một tháp nhọn giữa làng; thêm hồ, bến tàu theo khung thế giới. |
| Chợ phiên | `designs/cho-phien/a-08-cho-can-canh.png`, `b-07-cho-toan-canh.png` | Sạp gỗ mái vải sọc đỏ trắng, xanh trắng, vàng; thùng rau quả đầy màu; quảng trường lát gạch; nhà quanh chợ; người mua bán đi lại. |
| Nông trại | `designs/nong-trai/a-09-nong-trai-can-canh.png`, `b-05-nong-trai-toan-canh.png` | Ruộng rau quả chia ô có hàng rào gỗ, cối xay gió gỗ, nhà mái đỏ, chuồng đỏ mái xám, bò sữa, nông dân đội nón, cây hoa hồng nhạt. |
| Khu rừng bí mật | `designs/khu-rung-bi-mat/a-10-rung-can-canh.png`, `b-08-rung-toan-canh.png` | Suối có cầu gỗ, vách đá có thác, cây xanh dày và cây hoa hồng nhạt, lối mòn. |
| Núi tuyết | `designs/nui-tuyet/b-11-nui-toan-canh.png` | Núi đá nhiều tầng, thác, cầu treo gỗ (map riêng từ 02/10/2026, theo `nui-tuyet/d-*`). |

Thư viện, Xóm Mái Ấm, Lâu đài chưa có khung riêng: dựng theo phong cách chung ở trên (mái nhiều màu, hoa, hàng rào, đèn), phòng đọc Thư viện theo `v2-a-12-thu-vien-trong-truong.png`.

Nhân vật mời chơi minigame (nhiệm vụ phụ, 03/10/2026): mỗi map 3–5 nhân vật, mỗi nhân vật 2–4 trò, đứng cạnh mạng đường gần một địa danh trải khắp map, kèm vài người, vật quanh đó; bảng nguồn ở `tools/content/side-quests/<vùng>.json`, sinh quest bằng `pnpm exec tsx tools/content/build-side-quests.ts` rồi `pnpm world:<map>`.

## Mock chi tiết từng khu (02/10/2026)

Chín tấm mock chi tiết, mỗi tấm 8–19 khung (toàn cảnh, cận cảnh, nội thất, cảnh đêm), cắt theo lề trắng thành `designs/<thư mục>/{c,d}-NN-<tên>.png`; ảnh gốc giữ cạnh khung (`mock-d-chi-tiet.png`, riêng tấm các khu quanh trường ở `the-gioi/mock-c-chi-tiet-cac-khu.png`). Quyết định dùng thế nào: `plans/dattqh/reports/jev-261002-0802-detail-mocks.md`.

| Tấm | Khung | Map dùng |
| --- | --- | --- |
| Các khu quanh trường | `truong-hoc/c-*` (trường, sân, nhà đa năng, vườn khoa học, khu vui chơi, đường chính, lớp, thư viện, hành lang, cầu thang, phòng chức năng); `lang-ven-song/c-07, c-11, c-12`; `cho-phien/c-08`; `nong-trai/c-09`; `khu-rung-bi-mat/c-10`; `nui-tuyet/c-14` | Trường học và map của từng khu |
| Trung tâm | `trung-tam/d-*` | Map Trung tâm (02/10/2026; trước đó là quảng trường giữa map Trường học): đài phun tượng mèo, dãy cổng có tên sang mười map, bảng nhiệm vụ "!", cửa hàng, khu giao dịch, chòi chờ tổ đội, cầu trung tâm, khu sự kiện theo mùa, lâu đài phông nền |
| Làng | `lang-ven-song/d-*` | Làng Ven Sông theo khung ngoài trời (cổng, đường làng, chợ nhỏ, cầu, cối xay, cây sinh hoạt chung, xưởng); Xóm Mái Ấm theo khung nhà (`d-03, 05, 07, 13, 14`) |
| Chợ | `cho-phien/d-*` | Chợ phiên |
| Nông trại | `nong-trai/d-*` | Nông trại |
| Thư viện | `thu-vien/d-*` | Thư viện |
| Lâu đài | `lau-dai/d-*` | Lâu đài |
| Núi tuyết | `nui-tuyet/d-*` | Núi tuyết (02/10/2026), nền `grass-snow`, hồ `ice`, hang `crystal` |
| Đảo bí ẩn | `dao-bi-an/d-*` | Đảo bí ẩn (02/10/2026), nền `grass-island` và cát, khu thử thách `lava`, hang và đền `crystal` |

Mỗi map một nền riêng (khối cỏ theo map, đá lát, đường đất; `soil` trong generator, vùng đất ngoài map theo nó). Góc chụp đặt cạnh từng khung: `content/world/mock-views/<map>.json` (camera tính từ một landmark của map, `mood: dusk` cho khung đêm); `pnpm assets:preview <map>` chụp thành `assets/generated/review/<map>/mock__<thư mục>__<khung>.png`, trang review đặt cạnh khung mock. Đồ chi tiết pack không có dựng bằng hộp màu trong `content/world/box-props/<map>.json` (`glow` cho phần tự sáng).

Mặt đất và đường (người sở hữu, 03/10/2026: "phần đường đang hơi nhấp nhô, sửa lại hết thành mặt phẳng"): lõi mọi map phẳng ở độ cao nền của map (`ground` trong `ZoneMapSpec` không còn nhấp nhô, `roll` mặc định 0; Khu rừng cũng phẳng). Chỉ địa hình có chủ ý mới cao thấp: nước đào xuống (ao, hồ, sông, suối, kênh, biển; bờ tự nhiên hạ một bậc xuống bãi cát, bờ kè đá khai `water.quay` giữ nguyên độ cao tới mép nước như kênh ở Trung tâm và quảng trường Trường học), và chỗ nhô lên do `shape` của map (núi Núi tuyết, đồi lâu đài, thềm Trung tâm, đồi Xóm Mái Ấm, núi Nông trại, cao nguyên Đảo bí ẩn, dốc từ cao nguyên xuống phố ở Lâu đài). Mỗi đường (`routes`) nằm ngang trên bề rộng của nó và dọc theo nó không lồi lõm một khối (`levelProfile`, `packages/voxel/src/outland-levelling.ts`); lên đồi thì leo từng bậc 1 khối. Vùng ngoài lõi giữ đồi núi tự nhiên, đường của nó cũng được làm phẳng như vậy; mép lõi nối sang vùng ngoài thoai thoải qua 48 khối, không có bậc.

Map chưa có bài SGK mở kèm một quest chào mừng (Trung tâm, Núi tuyết, Đảo bí ẩn: `content/quests/trung-tam-ch1.json`, `nui-tuyet-ch1.json`, `kho-bau-dao-ch1.json` — tên tệp xếp sau `forest-ch1` để bé mới vẫn bắt đầu ở Khu rừng; Jev, `plans/dattqh/reports/jev-261002-1619-open-snow-island.md`); mục quest đặt quanh các landmark cùng tên ở khu chương 1 của map.

## Nhà của bé (03/10/2026)

Mock của người sở hữu (14 ô, ảnh gửi trong phiên, không có trên đĩa; mô tả từng ô trong plan `plans/dattqh/261003-1320-home-timetable-vehicles/plan.md`). Ô 1–10 và 13 làm ngày 03/10; làm đẹp lại theo mock, cầu thang mới, tùy biến nội/ngoại thất (ô 11, 12) và bản đồ nhỏ (ô 14) trong pha H (`plans/dattqh/261003-1549-minigames-home-polish/plan.md`, report `plans/dattqh/reports/home-polish-261003.md`).

- Map `nha-cua-be` (`pnpm world:nha-cua-be`, `tools/world/generate-nha-cua-be-map.ts`): lõi 160 × 160 khối, nền `grass-home` phẳng (chỉ ao và suối trũng xuống), vùng ngoài theo `farm`. Bé tới ở đường làng trước cổng (điểm bắt đầu của chương là cổng, khai bằng `start` của zone); vào từ cổng mặt cam ở góc tây nam quảng trường Trung tâm (`cong-nha-cua-be`) hoặc nút "Về nhà" ở Home. Ánh sáng: trong nhà vàng ấm đèn lồng (mood `warm`), quanh nhà nắng chiều vàng (mood `golden`).
- Nhà hai tầng (`structures/nha-cua-be-house.ts`): tường đá dưới, trên trát vữa kem trong khung gỗ, mái ngói đỏ có ống khói và hai cửa sổ mái, cửa vòm 3 ô có đèn hai bên, hoa hồng leo và hộp hoa dưới cửa sổ. Trong nhà tường vữa kem trên chân tường ván, tầng 2 phía đông dán giấy hồng; đèn lồng treo dầm, đèn tường, dây đèn lồng, cờ đuôi nheo. Cầu thang gỗ dọc tường tây: rộng 3 khối, bậc 1 khối, chiếu nghỉ 3 hàng dưới cửa sổ riêng, thành cầu thang gỗ sẫm có con tiện và tay vịn, trụ đầu/cuối có đèn, thảm đỏ trải bậc, tủ nhỏ dưới gầm. Tầng 1: phòng khách thông lên mái, bếp, phòng ăn, nhà kho có cửa sau ra chuồng, nhà vệ sinh ở đầu tây nhà kho (cửa đôi tự mở khi bé tới gần; bồn cầu để ngồi "Đi vệ sinh", lavabo "Rửa tay" và gương "Soi gương" cạnh đó, máy giặt "Giặt đồ" dưới cửa sổ, thảm chùi chân giữa phòng, buồng tắm kính bé bước vào đứng dưới vòi sen rồi tự bước ra). Sau vườn rau, cuối lối đi phụ: Phòng truyền thống (`structures/nha-cua-be-trophy-hall.ts`), nhà riêng 15 × 13 cùng màu nhà chính; tủ huy hiệu sự kiện ở tường sau, 5 bảng thành tích trên tủ, bục cúp bộ sưu tập dọc hai tường bên; món bé chưa có hiện đồ mờ. Tầng 2: góc học tập trên sàn gác (kệ sách cao kín tường), phòng ngủ (giường có màn), góc đồ chơi.
- Ngoài nhà: sân trước có lối đá giữa hai bồn hoa viền gỗ dày hoa, dải hoa dọc mặt nhà, cổng gỗ có mái và đèn, đèn sân, ghế, xích đu, bù nhìn, cờ mèo; biển tên "Nhà của {name}" có đầu mèo và hộp thư mèo ngoài cổng; vườn rau cạnh nhà; chuồng sau nhà; ao có suối, cầu tàu, súng, lau sậy; cối xay gió.
- Ba mục tiêu riêng của map, luôn có mặt: `nha-thoi-khoa-bieu` (bảng trên tường, trên bàn học), `nha-lich-dong-phuc` (cạnh tủ quần áo) mở bảng thời khóa biểu / lịch đồng phục; `nha-trang-tri` (sổ trên kệ cạnh vách phòng khách) mở màn "Trang trí nhà".
- Tùy biến (ô 11, 12): danh mục kiểu ở `content/home/decor.json` (16 món, mỗi món 6–7 kiểu: giường, bàn học, ghế, tủ quần áo, đồ trang trí, thảm, rèm, đèn; kiểu nhà, hàng rào, cổng, đèn sân, vườn hoa, lối đi, biển tên, cờ). Generator viết mọi kiểu vào `entities.json` (`decorAnchors`, `decorModels`, `decorBlocks`; kiểu mặc định là props có `slot`); game thay props và tô lại khối khi tải map (`packages/voxel/src/home-decor.ts`), không sinh lại map. Lựa chọn lưu theo hồ sơ bé ở server (`/api/home-decor`, bảng `home_decor`). Ba audit kiểm với mọi kiểu đứng cùng lúc. Xem thử: `?decor=bed:bed-blue,house:house-green`.
- Bản đồ nhỏ (ô 14, mọi map): đĩa tròn góc trên phải dưới nút menu, vẽ từ `horizon.bin` (khối trên cùng mỗi ô 4 × 4), mũi tên của bé, cổng theo màu cổng, nhà của bé, nơi làm nhiệm vụ; chạm mở cả bản đồ kèm chú thích (`apps/web/src/game/hud/minimap*.ts`).
- Đồ dựng bằng hộp riêng của map: `content/world/box-props/nha-cua-be.json`, sinh bằng `pnpm exec tsx tools/world/structures/nha-cua-be-props.ts`.
- Nhà kéo bé ra các map khác (09/10/2026; plan `plans/dattqh/261009-2155-home-pulls-to-maps/`; người sở hữu: bé chỉ chơi Nhà của bé mỗi ngày): mỗi map khác có một kiểu trang trí lưu niệm (`souvenir` trong `content/home/decor.json`; 11 kiểu: thảm Lá rừng xanh, rèm Sóng sông xanh, cờ tháp đồng hồ, bàn lớp học, giường Trời sao Thư viện, tủ Lâu đài, rào Ngói Xóm Mái Ấm, lồng đèn chợ phiên, đèn bí ngô, thảm Bông tuyết, cờ mỏ neo), trao khi nhận rương nửa đường của map đó (`half.decor` trong `content/region-rewards.json`, ghi vào `shop_inventory` như đồ rương; `PUT /api/home-decor` trả 403 `decor-locked` khi chưa có). Kiểu lưu niệm không bán ở Cửa hàng và không làm kiểu mặc định. Generator chạy riêng `nha-cua-be-props.ts` ghi đè cả tệp box-props (mất các model của phòng truyền thống, ổ thú cưng, cửa nhà tắm): thêm kiểu mới thì gộp vào tệp đã có. "Bài hôm nay" (`packages/quest/src/daily-lesson.ts`): mỗi ngày giờ Việt Nam một bài SGK ở map khác (bài đang dở trước, rồi các map lần lượt), hiện thành thẻ ở màn Home và chip trên HUD khi bé ở nhà; thú cưng chào bé ở nhà bằng câu rủ tới map đó (`pet.say.outing`). Không thưởng thêm. Chuyện của bạn ở nhà tiếp ở map khác: "Kẹo bông gửi Gấu" ở Trung tâm (arc `voi-keo-mat-ong` của Voi Kẹo Bông, quest `yarn-voi-keo-mat-ong-1..3`) và "Con vịt gỗ dẫn đàn" ở Nông trại (arc `vit-go-dau-dan` của Chó Lùa Vịt, bạn già của Ông Cụ, quest `yarn-vit-go-dau-dan-1..3`); Gấu và Ông Cụ ở nhà có câu nhắc bạn. Hai chuyện chỉ dùng nhân vật đứng sẵn trên map: vật `st-*`/`vt-*` gắn với một quest chỉ hiện trong quest đó, nên muốn dùng vật riêng thì phải thêm mục tiêu và sinh lại map.

