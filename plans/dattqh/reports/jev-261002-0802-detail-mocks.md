# Jev — mock chi tiết từng khu (02/10/2026 08:02)

Người sở hữu gửi chín tấm mock chi tiết (125 khung) và giao: cắt ghép theo từng map, đối chiếu với các map đã dựng, nâng bối cảnh, NPC, không gian lên chi tiết như mock, đổi màu nền đất theo bối cảnh (hiện map nào cũng một nền xanh), việc không tự quyết được thì để Jev quyết rồi làm.

## Khung đã cắt

Cắt tự động theo lề trắng giữa các khung (`designs/<map>/`), ảnh gốc giữ cạnh khung:

| Tấm | Thư mục | Khung |
| --- | --- | --- |
| Chi tiết các khu (trường và quanh trường) | `truong-hoc/c-*`, `lang-ven-song/c-07,11,12`, `cho-phien/c-08`, `nong-trai/c-09`, `khu-rung-bi-mat/c-10`, `nui-tuyet/c-14`; gốc `the-gioi/mock-c-chi-tiet-cac-khu.png` | 19 |
| Lâu đài | `lau-dai/d-*` | 13 |
| Làng | `lang-ven-song/d-*` | 14 |
| Đảo bí ẩn | `dao-bi-an/d-*` | 14 |
| Chợ | `cho-phien/d-*` | 10 |
| Núi tuyết | `nui-tuyet/d-*` | 15 |
| Nông trại | `nong-trai/d-*` | 14 |
| Thư viện | `thu-vien/d-*` | 14 |
| Trung tâm | `trung-tam/d-*` | 8 |

## Rà map hiện có so với mock

- Nền: mọi map một khối cỏ, bảng màu kéo về xanh bạc hà nhạt (`grass` `#b4dc9a`, độ đậm 0,6); mock có cỏ xanh đậm khác nhau theo khu, quảng trường và lối lát đá, đất cày, ruộng lúa vàng.
- Bố cục: map phẳng, nhà xếp hàng như lưới, bãi cỏ trống lớn; mock có công trình chính ở giữa, đồi, vách đá có thác, sông, quảng trường, lối cong, cụm nhà tự nhiên.
- Công trình: lâu đài chỉ là vòng tường thấp và một sảnh mái phẳng (mock: nhiều tháp cao mái nhọn đỏ, cờ, hào, cầu đá vòm); nhà thô (mock: chân đá, tường kem, khung gỗ, cửa sổ có khung và hộp hoa, mái ngói chìa, ống khói, đèn cửa).
- Cận cảnh: quanh bé thiếu lối lát, đèn, hoa, hàng rào, thùng, biển; mock dày chi tiết ở mọi khung cận cảnh.
- Trong nhà: chỉ Trường học có lớp đi vào được; mock có đại sảnh, thư viện, phòng ăn, nhà dân, xưởng, chuồng, kho.

## Câu hỏi và quyết định (jev-1.13.0)

| Câu | Mức | Jev chọn | Độ tin cậy | Xác suất | Quyết |
| --- | --- | --- | --- | --- | --- |
| Đảo bí ẩn, Núi tuyết | medium | reference-for-later | 0,26 | 0,51 · dựng ngay 0,47 · gộp 0,02 | escalate → dùng lựa chọn của Jev |
| Trung tâm | medium | plaza-in-school-hub | 0,98 | 0,99 | auto |
| Trong nhà | low | walk-in-key-rooms | 0,98 | 0,99 | auto |
| Màu nền | low | ground-blocks-per-map | 0,99 | 1,00 | auto |
| Tấm Làng | low | split-by-theme | 0,90 | 0,93 | auto |
| Độ sâu làm lại | medium | rework-layout-keep-zones | 1,00 | 1,00 | auto |
| Cảnh đêm | low | warm-lamps-and-dusk | 0,99 | 1,00 | auto |

Nghĩa:

1. **Đảo bí ẩn, Núi tuyết:** giữ khung làm tham chiếu, đưa hai map vào roadmap; đợt này dồn sức cho 8 map có sẵn. Câu sát nút (0,51 so với 0,47): người sở hữu muốn dựng ngay thì nói một câu là mở đợt sau.
2. **Trung tâm:** quảng trường giữa map Trường học: đài phun có tượng, mỗi map một cổng vòm có tên (các cổng đang có), bảng nhiệm vụ có dấu "!", sạp cửa hàng, biển chỉ đường, chòi chờ.
3. **Trong nhà:** công trình chính của mỗi map đi vào được, bày đồ theo khung nội thất (đại sảnh có ngai và thảm đỏ, sảnh thư viện có kệ và quả địa cầu, nhà dân có bàn và giường, chuồng có bò), ưu tiên phòng có bài học.
4. **Màu nền:** thêm khối nền theo map (cỏ trường xanh tươi, cỏ rừng xanh đậm, cỏ làng ấm, cỏ đồng vàng nông trại, cỏ lâu đài, cỏ vườn thư viện; đá lát quảng trường, đất cày, đất rừng), mỗi map chọn cỏ của mình và lát quảng trường; vùng đất quanh map theo nền của map.
5. **Tấm Làng:** Làng Ven Sông theo các khung ngoài trời (cổng, đường làng, chợ nhỏ, cầu qua sông, guồng nước, cối xay gió, cây hoa sinh hoạt chung); Xóm Mái Ấm theo các khung nhà (nhà có vườn, giếng, nội thất nhà, chuồng, vườn rau).
6. **Độ sâu:** làm lại bố cục từng map theo khung toàn cảnh (công trình chính ở giữa, đồi và vách đá có thác, sông, quảng trường, lối cong, cụm nhà tự nhiên thay lưới), giữ nguyên vị trí khu bài học và các quest vẫn qua.
7. **Cảnh đêm:** đèn, lồng đèn, cửa sổ sáng ấm lúc chiều tối với bầu trời buổi tối có sẵn; không làm chu kỳ ngày đêm.

Ghi vào plan `plans/dattqh/261002-0802-detail-mocks-per-map/plan.md`.
