# Map gấp 50: lõi giữ nguyên, vùng ngoài sinh lúc chạy

**Trạng thái:** xong phần tự động (02/10/2026), đã gửi lên production cho người sở hữu duyệt; còn phase 7 (danh mục model) · **Tier:** XL · **Nhánh:** `main` · Quyết định: Jev (`plans/dattqh/reports/jev-261002-0606-maps-x50.md`)

## Kết quả mong muốn

Người sở hữu (02/10/2026 06:06): "mỗi map còn chưa đủ rộng, bé đi 1 lúc là hết rồi. tăng size lên gấp 50 lần đi".

- Mỗi map trong 8 map rộng **5.760 × 5.760 block** (gấp ~52 diện tích 800 × 800; đi bộ ngang ~28 phút).
- Map 800 × 800 hiện có là **lõi**, giữ nguyên tọa độ (0…800): bài học, cổng, xe, đời sống, vị trí đã lưu của bé không đổi. Vùng ngoài trải từ −2.432 tới 3.328 trên mỗi trục.
- Vùng ngoài sinh theo seed của map ngay lúc chơi (worker), không có file trong git: đồi, sông, hồ, rừng, đường, ruộng, làng có nhà; người làm nghề và vật nuôi ở làng; chỗ ngắm cảnh và cảnh nhỏ để tìm; bến xe ở mép lõi ra các làng xa và ở mỗi làng về lõi. Mỗi map có chủ đề vùng ngoài theo lõi (làng sông nhiều sông, nông trại nhiều ruộng, rừng nhiều cây…).
- Máy không nặng hơn: chỉ giữ các vùng gần bé trong bộ nhớ (thưa theo vùng 128 × 128, bỏ vùng xa); chân trời vùng ngoài thô theo ô lớn, mờ dần vào trời.

Ngoài phạm vi: bài học mới ở vùng ngoài; phần thưởng khi tìm thấy (vùng ngoài không thưởng gì, như dân làng); nhiều người chơi.

## Ràng buộc

- `packages/voxel` thuần TypeScript, không `three`; generator vùng ngoài xác định (cùng seed → cùng block), dùng cho cả web worker và test.
- Ngân sách: ≤ 150 draw call; tam giác trong ngân sách E2E; bộ nhớ block ~ vài chục MB; tạo một vùng trong worker vài chục ms.
- Server: vị trí đã lưu nới biên cho vùng ngoài (hợp đồng API đổi, cùng đợt release).
- Repo công khai: không thêm file map lớn.

## Phase

1. **Lưu thưa và tọa độ âm (L).** `SparseWorld` trong `packages/voxel` (vùng 128 × 48 × 128, khóa theo vùng, `get`/`chunkData` với tọa độ âm, bỏ vùng); `RegionStream` theo biên thế giới; worker nhận file lõi hoặc sinh vùng ngoài rồi gửi block về; va chạm, nước, `usableSpot`, renderer theo biên mới; bỏ vùng xa ở cả main và worker.
2. **Generator vùng ngoài (L).** `packages/voxel/src/outland*.ts`: bố cục (đường, làng, sông, hồ, ruộng, rừng, chỗ ngắm cảnh) và block từng vùng; nối mép lõi (độ cao mép lõi ghi trong `entities.json`); chủ đề theo map; test xác định, mép vùng liền, đường đi được từ mép lõi tới làng.
3. **Lõi không còn đồi viền (M).** Các generator lõi bỏ `rim`, ghi `outland` (seed, chủ đề, độ cao mép) vào `entities.json`; sinh lại 8 map.
4. **Đời sống và đi lại vùng ngoài (M).** Người, vật nuôi, prop, bến xe vùng ngoài tính từ bố cục lúc tải map và gộp vào danh sách sẵn có (chỉ vẽ cái gần, như hiện nay); bến xe mép lõi ↔ làng xa.
5. **Chân trời vùng ngoài (M).** Lưới thô theo ô 64 block từ hàm địa hình; camera far và màu trời theo tầm mới.
6. **Server, kiểm, docs, review, deploy (M).** Nới biên vị trí; E2E (đi ra vùng ngoài, viền thế giới, draw call); ảnh review vùng ngoài; docs; deploy production (người sở hữu đã cho deploy đợt trước một lần; đợt này hỏi lại).

7. **Đồ vật đổi hàng loạt (M).** Người sở hữu (02/10/2026 06:2x): "sau này còn bổ sung nhiều đồ vật nữa nên code tối ưu 1 chút nếu có yêu cầu thay đổi nào thì đổi hàng loạt". Đã có: mọi prop đi qua một chỗ (`PropField`) nên làm mờ khi che bé áp cho mọi đồ vật, kể cả đồ thêm sau. Còn: gom chiều cao, clip và thuộc tính của mọi model (đang rải ở `SCENERY_MODELS`, `DRESSING_HEIGHTS`, `LIFE_HEIGHTS`, `OUTLAND_MODEL_HEIGHTS` và từng generator) về một danh mục dữ liệu `content/world/models.json` (Zod), generator và runtime đọc từ đó; thêm đồ mới = thêm một dòng.
8. **Camera theo sau lưng (S).** Người sở hữu (06:21, ảnh): camera chưa quay ra sau khi bé đi ngang. Đã làm: camera luôn dần xoay ra sau lưng theo hướng đi; hướng đi chốt theo góc cần lúc đặt, nên giữ cần sang ngang không đi vòng tròn.

## Kết quả (02/10/2026)

- Generator vùng ngoài (`outland-plan.ts`, `outland-region.ts`, `outland-life.ts`, 20 test): mỗi chủ đề 34–38 làng, > 320 người, > 320 con vật, 50–54 bến xe; sinh một vùng 4–8 ms (Node). Thân cây vùng ngoài là `tree-log` (đi xuyên được như ở lõi); mặt nước ở `waterLevel` như lõi.
- Game: `SparseWorld` giữ vùng gần bé, `region.worker.ts` dựng vùng (sinh + file lõi phủ lên), bỏ vùng xa ở cả hai worker; người và vật dựng dần theo khoảng cách; chân trời vùng ngoài ô 64 block, mờ hẳn ở 1.800 block.
- Lõi bỏ đồi viền, ghi `outland` (seed, chủ đề, độ cao mép, tỉ lệ model); server nhận vị trí −2.560…3.456.
- E2E: 74 đạt (thêm đi ngang giữ thẳng và camera ra sau; đi từ lõi ra vùng ngoài; mép thế giới); unit 958.
- Còn chỉnh: sân làng có mảng xám lổn nhổn, vài làng ít nhà; danh mục model một chỗ (phase 7).

## Nghiệm thu

- [x] Mỗi map 5.760 × 5.760, lõi không đổi tọa độ; bé đi từ lõi ra vùng ngoài liền mạch, không tường, không rơi.
- [x] Vùng ngoài có đường, làng có người và vật, ruộng, rừng, sông/hồ, chỗ ngắm cảnh; bến xe ra làng xa và về.
- [x] Bộ nhớ block giới hạn (vùng xa bị bỏ), draw call ≤ 150 ở E2E vùng ngoài.
- [x] Gate 5 lệnh + web build + `e2e:ci` xanh trong 480 s; `security:dist`.
- [x] Ảnh review vùng ngoài từng map.
- [ ] Mọi prop mờ khi che bé hoặc sát ống kính (đã làm); danh mục model một chỗ.
- [x] Đi ngang: camera ra sau lưng, bé đi thẳng (E2E `play`).
