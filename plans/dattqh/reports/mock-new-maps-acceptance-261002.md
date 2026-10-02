# Nghiệm thu ba map mới: Trung tâm, Núi tuyết, Đảo bí ẩn (02/10/2026)

Plan: `plans/dattqh/261002-1619-nui-tuyet-dao-bi-an-maps/`. Quyết định: `jev-261002-1619-open-snow-island.md`. Báo cáo từng map: `map-trung-tam-261002-new-map.md`, `map-nui-tuyet-261002-new-map.md`, `map-dao-bi-an-261002-new-map.md`.

## Kết quả

- Ba map 800 × 800 mở chơi được, mỗi map một quest chào mừng (`trung-tam-ch1`, `nui-tuyet-ch1`, `kho-bau-dao-ch1`); bé mới vẫn bắt đầu ở `forest-ch1`.
- Trung tâm là map riêng ở giữa màn chọn map (ảnh `assets/generated/home/world.png`), nơi các bạn gặp nhau khi chơi online: cổng sang mười map; mọi map có cổng về Trung tâm (8 map cũ đã sinh lại). Quảng trường cũ trong map Trường học giữ các cổng của nó, thêm cổng về Trung tâm; 8 góc chụp `trung-tam/d-*` cũ của Trường học bỏ (nay thuộc map Trung tâm).
- Khối mới: `grass-snow`, `ice`, `grass-island`, `lava`, `crystal`, `grass-hub`; atlas khối 1024 px (dưới ngưỡng 2048 px của quyết định KTX2).
- Ảnh nền vùng cho ba vùng (`assets/generated/regions/{trung-tam,nui-tuyet,dao-bi-an}.png`).

## Đối chiếu mock

| Map | Khung | Đạt | Gần–đạt | Gần | Chưa |
| --- | --- | --- | --- | --- | --- |
| Trung tâm | 8 | 2 (d-04, d-07) | 2 (d-02, d-06) | 4 | 0 |
| Núi tuyết | 15 | 3 (d-03, d-12, d-14) | 0 | 12 | 0 |
| Đảo bí ẩn | 14 | 1 (d-07) | 0 | 13 | 0 |

Ảnh cặp mock / trong game ở trang review (`apps/web/review.html`, mục các map).

## Số liệu map

| Map | Prop | Người | Vật | Interactable | Vùng ngoài |
| --- | --- | --- | --- | --- | --- |
| Trung tâm | — (37 prop hộp `tt-*`) | 139 (110 bạn nhỏ tên riêng) | 32 | 30 | `castle` |
| Núi tuyết | 1.772 | 68 | 56 | 29 | `castle` |
| Đảo bí ẩn | 3.768 | 69 | 53 (+32 khỉ tĩnh) | 31 | `river` |

## Sửa thêm trong lúc làm

- Quest đảo đổi id `dao-bi-an-ch1` → `kho-bau-dao-ch1`: catalog xếp quest theo tên tệp, tên cũ làm quest đảo thành quest đầu của bé mới.
- Ba cư dân đón khách ở chỗ xuất hiện Khu rừng (thêm ở `f948881`) đứng cách 2–3 khối làm nút nói chuyện hiện ngay khi vào rừng (E2E `home` đỏ); dời ra 6–7 khối.
- Ảnh chọn map: 12 nhãn xếp lại không chồng nhau trên điện thoại và iPad hai chiều, không che ảnh chân dung (E2E `home` 12/12).

## Hạn chế đã sửa (02/10/2026 tối)

- Ảnh d-03, d-08 Trung tâm thiếu người: khi chụp một góc xa (`shot=view:…`), game dựng sẵn cư dân quanh điểm camera nhìn thay vì quanh chỗ xuất hiện; ảnh mới có người.
- Lâu đài Trung tâm thấp: ba tháp cao nhất (tháp chính, hai tháp sảnh) có thêm tầng đỉnh dựng bằng prop hộp (`tt-tower-crown-3`, `tt-tower-crown-4`: thân tháp có cửa sổ sáng, gờ, mái nhọn đỏ, cờ) vượt trần 48 khối, đỉnh khoảng y 58.
- Con vật đúng loài: thêm routine `penguin` (lạch bạch ra băng bắt cá, trượt bụng), `polar-bear` (bắt cá, ngủ trên tuyết, lăn tròn), `monkey` (nhảy giữa gốc dừa hái quả, nhào lộn), mỗi loài một kho lời riêng; Núi tuyết dùng hai routine đầu; Đảo có thêm 14 chú khỉ đi lại (khỉ ngồi trên ngọn cây vẫn giữ làm cảnh).
- Không gian tối: entities có `moods` (vùng `night`, `cave`); bé bước vào thì ánh sáng dịu dần (đèn, pha lê, dung nham, vàng nổi lên), bước ra sáng lại. Đảo: hang và kho báu, đền thờ (`cave`), rừng đêm (`night`); Núi tuyết: hang băng (`cave`). Góc chụp mock tương ứng dùng `mood` mới.

Không chạy E2E và cả bộ test theo yêu cầu người sở hữu (chỉ test khi được yêu cầu); đã chạy typecheck, lint các tệp sửa, test ambient/scene/voxel/catalog (274/274), `assets:check`, `content:check`.

Còn lại: chưa đo `perf` (chỉ chạy khi người sở hữu yêu cầu).
