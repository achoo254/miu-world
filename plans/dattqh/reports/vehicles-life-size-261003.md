# Xe cỡ thật, chi tiết hơn (pha A) — 03/10/2026

Plan: `plans/dattqh/261003-1320-home-timetable-vehicles/plan.md` (pha A). Người sở hữu: "kích thước của xe trong game cũng đang quá nhỏ và ko chi tiết". Quyết định Jev: dựng lại toàn bộ xe cỡ thật, chi tiết khoảng gấp ba.

## Kết quả

- Dựng lại cả 19 hình xe gốc. 50 biến thể màu dùng lại hình của xe gốc nên tổng cộng 69 món trong catalogue (con số "51" trong plan là trước khi thêm 18 biến thể `mint`). Id, tên, cấp mở khóa và danh sách biến thể giữ nguyên, kể cả các biến thể `mint`.
- Xe hơi, xe buýt, xe cứu hỏa, xe kem, xe bọ rùa: bé ngồi **trong** khoang hở. Ghế có tựa đầu nằm dưới bé, thành xe ôm quanh hông, kính chắn gió cao tới cằm, vô lăng ở chỗ tay bé. Máy kéo và xe lửa có ghế cao, vô lăng hoặc tay lái nằm trước bé. Vịt, thiên nga, bí ngô, rồng là xe để ngồi lên. Ván trượt, xe trượt scooter, ván bay, ván tên lửa vừa cỡ bàn chân bé. Thảm bay, mây, đĩa bay thì bé ngồi lên trên.
- Chi tiết thêm (tùy loại xe): lốp, vành lõm và chụp mâm, hốc bánh có viền, đèn pha viền crôm, xi-nhan, đèn hậu, gương chiếu hậu, cản trước và sau, biển số, lưới tản nhiệt có nan, táp-lô có đồng hồ, vô lăng có trục, đường cửa và tay nắm, ống xả. Xe buýt có cửa sổ, đèn báo tuyến và cửa thoát hiểm. Xe cứu hỏa có tủ đồ cửa cuốn, thang, cuộn vòi và còi đèn. Xe kem có ô cửa bán hàng, mái hiên, bảng thực đơn và cây kem trên nóc. Xe lửa có nồi hơi viền vàng, ống khói nhả khói, gạt đá và thanh truyền. Máy kéo có lốp gai và chắn bùn. Bí ngô có múi, cửa sổ tròn, đèn lồng và bánh nan. Rồng có yên, bàn đạp chân, cánh, sừng, gai và đuôi. Ván trượt có trục, đệm nâng, ốc và giấy nhám. Thảm có viền, hoa văn, tua rua và gối tựa. Mây có mặt cười.
- Bé vẫn quay mặt về phía trước. Kiểm bằng ảnh nhìn chéo, nhìn ngang và nhìn từ sau của từng xe (đã xem cả 19).

## Kích thước, số hộp, số tam giác (đơn vị thế giới: khối, ở PLAYER_SCALE 0,68)

"Hộp" là số hộp sau khi tách lưới voxel (một hộp `sym` tính là 2). Con số này không tương ứng một-một với số chi tiết, nhưng cho thấy mức tăng.

| Xe | Dài×Cao×Rộng trước | Dài×Cao×Rộng sau | Mũi trước→sau | Hộp trước→sau | Màu trước→sau | Tam giác trước→sau |
| --- | --- | --- | --- | --- | --- | --- |
| bus-yellow (drive) | 2.38×0.94×1.36 | 3.23×1.57×1.87 | 1.23→1.19 | 58→616 | 10→18 | 630→3472 |
| carpet-red (sit) | 1.66×0.30×1.02 | 2.08×0.47×1.36 | 0.85→1.02 | 16→156 | 4→6 | 168→734 |
| cloud-white (sit) | 1.28×0.47×1.10 | 2.30×0.81×1.74 | 0.64→0.94 | 13→544 | 7→7 | 164→3488 |
| dragon-gold (sit) | 2.38×0.89×1.36 | 3.44×1.66×2.30 | 1.15→1.45 | 54→548 | 9→11 | 692→2900 |
| duck-car-yellow (sit) | 1.83×1.19×1.19 | 2.47×1.32×1.45 | 1.06→1.23 | 35→616 | 8→12 | 422→3410 |
| fire-truck (drive) | 2.08×0.89×1.36 | 3.32×1.45×1.87 | 1.02→1.19 | 60→592 | 12→21 | 718→3584 |
| hoverboard-blue (stand) | 1.53×0.26×0.77 | 1.62×0.38×0.85 | 0.85→0.81 | 12→222 | 4→7 | 138→756 |
| ice-cream-strawberry (drive) | 1.62×1.32×1.28 | 3.06×2.13×1.62 | 1.10→1.19 | 29→658 | 9→25 | 398→3500 |
| ladybug-red (drive) | 1.62×0.94×1.19 | 2.25×1.28×1.62 | 0.89→1.06 | 47→702 | 7→14 | 600→3336 |
| pumpkin-carriage (sit) | 1.53×0.77×1.36 | 1.91×1.40×1.53 | 0.77→0.89 | 50→710 | 8→11 | 640→3442 |
| rocket-board-red (stand) | 1.96×0.47×0.94 | 2.34×0.47×1.02 | 0.98→1.19 | 14→210 | 6→7 | 178→1200 |
| scooter-pink (stand) | 1.57×0.89×1.02 | 1.91×1.06×1.02 | 0.85→0.98 | 20→108 | 7→9 | 280→588 |
| skateboard-red (stand) | 1.62×0.26×0.85 | 1.70×0.30×0.77 | 0.81→0.85 | 14→136 | 5→9 | 152→532 |
| starship (sit) | 1.53×0.38×1.53 | 1.70×0.89×1.70 | 0.72→0.85 | 20→250 | 4→7 | 240→2054 |
| swan-white (sit) | 1.79×1.32×1.19 | 2.42×1.49×1.36 | 1.02→1.23 | 35→492 | 6→10 | 444→3120 |
| toy-car-red (drive) | 1.83×0.85×1.36 | 2.42×1.10×1.53 | 1.02→1.28 | 51→552 | 9→18 | 596→2884 |
| tractor-red (drive) | 1.83×1.02×1.45 | 2.55×1.36×1.70 | 1.23→1.36 | 51→434 | 7→14 | 626→2748 |
| train-red (drive) | 1.87×1.02×1.02 | 2.42×1.87×1.36 | 1.28→1.53 | 48→590 | 7→15 | 576→3218 |
| tricycle-red (drive) | 1.45×0.85×1.28 | 2.04×1.02×1.10 | 0.94→1.10 | 31→400 | 6→12 | 406→1830 |
| **Tổng 19 hình** | | | | 658→8536 | | 8068→46796 |

- Độ cao chiều "Cao" tính cả phần nhô lên: kính chắn gió, khói xe lửa, cây kem trên nóc xe kem.
- Ô tô dài 2,42 khối (tính cả cản), cao 1,10 khối tới mép kính chắn gió. Ghế cao 9/16 đơn vị mô hình, khoảng 0,38 khối (trước là 6/16).
- Xe nhiều tam giác nhất: xe cứu hỏa 3584, xe kem 3500, mây 3488, xe buýt 3472, bí ngô 3442. Mỗi bé có tối đa một xe trong cảnh, vẫn một draw call, nên chiếm khoảng 2,4% ngân sách ~150k tam giác mỗi cảnh.

## Ngân sách tam giác (phiên chính đã duyệt)

`packages/voxel/src/voxel-accessory.ts` thêm `MAX_VEHICLE_TRIANGLES = 4000` (có chú thích lý do). `voxel-accessory.test.ts` áp ngân sách này khi `slot === 'vehicle'`, các slot khác giữ 1500. Mục tiêu của tôi là ≤ ~3500 mỗi xe. Riêng xe cứu hỏa ở 3584, vẫn dưới trần 4000.

## Mã và dữ liệu

- Hình xe viết bằng code để còn sửa được về sau: `tools/assets/vehicle-voxel-grid.ts` là lưới voxel. Nó có các khối hộp, đĩa, vòng, ellipsoid "vuông góc" (để bớt bậc thang), bánh xe, và lệnh đối xứng qua x = 0. Lưới được tách lại thành hộp, nửa x ≥ 0 kèm `sym`. Hình từng xe nằm ở `vehicle-models-{cars,rides,boards}.ts`. `tools/assets/build-vehicles.ts` ghi file `content/accessories/<id>.json`: id, tên, mở khóa và biến thể lấy từ file hiện có; màu đậm/nhạt suy ra được tính lại cho từng biến thể. Lệnh chạy: `pnpm exec tsx tools/assets/build-vehicles.ts [phần-id…]`, rồi `pnpm assets:accessories`. Tôi không sửa `package.json`, nên lệnh này chưa có alias `pnpm`.
- `tools/assets/build-vehicles.test.ts`:
  - kiểm đối xứng, và kiểm lưới tách thành hộp rồi đọc lại vẫn đúng từng ô;
  - mỗi hình xe gốc trong content có đúng một model;
  - mỗi file xe phải khớp đúng từng byte với file mà model của nó sinh ra. Sửa JSON bằng tay sẽ làm test đỏ, nên hãy sửa model.
- Generator luôn để trống chỗ chân bé duỗi khi ngồi, và xóa mọi ô nằm dưới mặt đất.
- `apps/web/src/game/player/vehicle-ride.ts` không phải sửa. Mũi xe vẫn tính tự động từ bounding box.
- `vehicle-ride.test.ts`: kỳ vọng `liftWorld` trước đây ghi cứng ghế 6/16. Nay đọc chiều cao ghế từ chính ô tô (`rideLift`). Các test về chỗ ngồi vừa bé, chân, tay cầm và mũi xe < 3 khối giữ nguyên ngưỡng, và tất cả xe đều qua.

## Ảnh

- Icon 69 món: `assets/generated/accessories/vehicle-*.png`, chạy `PREVIEW_ONLY=vehicle- pnpm assets:accessories` qua lock.
- Ảnh bé đang lái (chéo và ngang) cho 19 hình: `assets/generated/review/accessories/item-vehicle-*.png`, chạy `PREVIEW_ONLY=item-vehicle- pnpm assets:preview accessories` qua lock. Các file này nằm ngoài danh sách file được giao, nhưng chỉ là ảnh xe do chính bộ render đó sinh. Nếu không chạy lại thì chúng còn là ảnh xe cũ.
- `assets/manifest.json` được sinh lại bằng `pnpm assets:manifest` qua lock.
- Ảnh mẫu:
  - `assets/generated/review/accessories/item-vehicle-toy-car-red.png` và `-side.png`
  - `item-vehicle-bus-yellow.png`, `item-vehicle-dragon-gold.png`, `item-vehicle-train-red-side.png`, `item-vehicle-cloud-white.png`, `item-vehicle-scooter-pink.png`
  - icon `assets/generated/accessories/vehicle-pumpkin-carriage.png`

## Kiểm tra đã chạy

- `pnpm vitest run tools/assets/build-vehicles.test.ts apps/web/src/game/player/vehicle-ride.test.ts packages/voxel/src/voxel-accessory.test.ts`: 3 file, 941 test đều qua.
- `pnpm typecheck`: sạch (root, apps/web, apps/server).
- eslint `--max-warnings=0` trên các file đã sửa và file mới: sạch.
- `pnpm assets:check`: OK, 16 pack, 4278 file.
- `pnpm content:check`: **đỏ 1 lỗi không thuộc pha này**: `nha-cua-be-ch1.json: phase learn starts before the phase that precedes it`. Đây là map nhà đang làm dở ở pha B. Phần phụ kiện và xe không có lỗi nào.
- Chưa chạy: E2E và `pnpm test` toàn bộ (theo ràng buộc, phiên chính sẽ chạy).

## Rủi ro cần phiên chính để ý

- **Mũi xe dài hơn.** `rideReach` dừng bé trước tường theo cả hai trục, bất kể hướng xe quay. Mũi dài nhất trước kia khoảng 1,28 khối (xe lửa); nay là xe lửa 1,53, rồng 1,45, máy kéo 1,36, ô tô 1,28 (trước 1,02). Trong ngõ hẹp hay khi tự đi tới mục tiêu sát tường, bé đi xe sẽ dừng xa tường hơn một chút. `e2e/autowalk.spec.ts` (ô tô tự lái tới Sư Tử Vàng) và `play.spec.ts` (ván trượt) là chỗ cần xem kết quả.
- Icon của rồng trông nhỏ trong ô vuông, vì máy ảnh khung theo cả cánh lẫn đuôi.

Status: DONE_WITH_CONCERNS
Summary: Đã dựng lại 19 hình xe (69 món kể cả biến thể) theo cỡ thật với nhiều chi tiết hơn; bé ngồi trong hoặc đứng trên xe đúng hướng; ảnh đã render lại và đã xem; test, typecheck, eslint, assets:check đều qua; ngân sách xe nâng lên 4000 tam giác như đã duyệt.
Concerns: content:check đỏ vì file map của pha B; mũi xe dài hơn trước (tối đa 1,53 khối) nên cần xem E2E tự đi bằng xe; chưa chạy E2E.
