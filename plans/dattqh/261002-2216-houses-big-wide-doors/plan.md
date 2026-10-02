# Nhà to, cửa rộng, trong nhà đủ chỗ đi lại

Trạng thái: đang làm · Tier tổng: XL · Nhánh: `main` · Ngày: 02/10/2026

Người sở hữu (02/10/2026): "soát lại các nhà đã render phải thật rộng lối vào và không gian bên trong đủ cho nhân vật di chuyển"; "các căn nhà trong game tôi cảm giác hơi bé, ko phù hợp kích thước với nhân vật, đúng ra 1 căn nhà bình thường thì phải to gấp mấy chục lần nhân vật rồi".

## Quyết định

Jev (`plans/dattqh/reports/jev-261002-2216-house-scale.md`): dựng lại nhà to hơn, giữ cỡ nhân vật (rebuild-houses 0,47; escalate, theo quy ước dùng lựa chọn của Jev).

## Chuẩn một ngôi nhà (bé cao 1,45 khối, 1 khối ≈ 1 m)

- Nhà ở thường: mặt bằng ≥ 13 × 11 khối, tường ≥ 7 khối, mái cao thêm khoảng bằng ấy: cả nhà khoảng 9 lần chiều cao bé. Nhà công cộng (trường, thư viện, chợ, đền, nhà nghỉ) to hơn tương xứng.
- Cửa chính rộng ≥ 3 khối, cao ≥ 3 khối (`placeHouse` tự làm khi tường ≥ 5 và dài ≥ 7); sàn cao hơn đất ngoài thì có bậc mỗi bậc 1 khối (`doorSteps`; `streetHouses` tự làm).
- Trong nhà: ≥ 70% sàn trống sau khi tính đồ đạc (đồ có va chạm, `traversal`), mọi chỗ trống đi tới được từ cửa, lối đi chính rộng ≥ 2 khối.
- Nhà nào dựng ra cũng có lối vào (không còn khối nhà kín rỗng); tháp, khối trang trí không phải nhà thì đặc hoặc có cửa.

Đo bằng `pnpm exec tsx tools/world/room-audit.ts <map>` (cửa, bậc, sàn trống, tới được) và `pnpm exec tsx tools/world/reach-audit.ts <map>` (mọi mục quest, cổng, bến xe đi tới được; chỗ xuất hiện, điểm xuống xe không bị đồ chiếm).

## Số đo trước khi sửa (02/10/2026 22:30, cả 11 map)

104 không gian có mái không có lối vào ở mặt sàn, 84 cửa rộng 2, 5 cửa rộng 1, 66 cửa phải trèo 2 khối, 4 cửa trèo 3 khối, 9 phòng đồ đạc chiếm hơn 30% sàn.

## Pha

| Pha | Tier | Nội dung | Ai |
| --- | --- | --- | --- |
| 1 | M | Bộ dựng chung: `cottageSize` (13–17 × 11–12, tường 7), `placeHouse` cửa 3 × 3, `doorSteps`, `streetHouses` có bậc và lối vào rộng; công cụ `room-audit.ts`, `reach-audit.ts` | chính |
| 2 | L × 11 | Mỗi map: nhà riêng của map theo chuẩn trên, bố cục chỗ nhà to ra, nội thất giãn, sinh lại, đo, chụp lại khung mock có nhà | agent mỗi map |
| 3 | M | Nghiệm thu: đo cả 11 map, ảnh Home, docs, commit; deploy khi người sở hữu đồng ý | chính |

Bản giao việc: [`phase-02-map-brief.md`](phase-02-map-brief.md).

## Không làm

- Đổi cỡ nhân vật, camera; đổi `ZONES` hay quest; chạy E2E/cả bộ test (chỉ khi người sở hữu yêu cầu).
