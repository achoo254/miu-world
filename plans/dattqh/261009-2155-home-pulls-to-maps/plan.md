# Nhà của bé kéo bé sang các map khác

Trạng thái: đang làm · Độ lớn: L · Nhánh: `main`

## Kết quả mong muốn

Người sở hữu (09/10/2026): "bé rất thích map nhà của bé. Nên bé ngày nào cũng chơi map đó chứ ko chơi ở các map khác". Số đếm production (chỉ đọc, 09/10): từ 04/10 mọi quest bé hoàn thành đều ở Nhà của bé (chương 1 chơi lại 52 lần trong một ngày, trùm chuồng gà 18 lần); bé mới xong 3 bài SGK và bỏ dở 3 bài ở bước 12–15 trên 17–21 bước; bé gắn với cua xanh (500 điểm chăm), trang trí nhà, tặng quà NPC ở nhà. Jev chọn hướng "nhà là nơi về, map khác góp đồ cho nhà" (1,00); người sở hữu giao Jev quyết mọi điểm (`plans/dattqh/reports/jev-261009-2155-home-pulls-to-maps.md`).

Bốn phần, giữ nguyên Nhà của bé như bé đang thích:

1. **Đồ lưu niệm cho nhà**: mỗi map khác (11 map) có một kiểu trang trí nhà riêng, nhận khi mở rương nửa đường của map đó. Kiểu trang trí hiện có vẫn miễn phí.
2. **Bài hôm nay**: mỗi ngày (giờ Việt Nam) một bài SGK ở map khác — bài đang làm dở trước, hết bài dở thì bài chưa làm, xoay vòng qua các map. Hiện ở màn Home và một chip trên HUD khi bé ở Nhà của bé, có nút "Đi ngay". Không thưởng thêm.
3. **Chuyện của bạn ở nhà tiếp ở map khác**: hai chuyện mới (mỗi chuyện 3 chương) ở map khác, do một nhân vật quen với Gấu Bánh Ngọt / Ông Cụ Trông Vườn kể; nhân vật ở nhà nhắc tới bạn ấy.
4. **Thú cưng rủ đi chơi**: ở Nhà của bé, thú cưng thỉnh thoảng nói muốn tới map của bài hôm nay. Không đổi thưởng.

## Không làm

- Không cắt hay giới hạn thưởng ở nhà (luật "chơi lại vẫn được thưởng đủ").
- Không khóa kiểu trang trí đang miễn phí; không thưởng thêm cho bài hôm nay; không nhân thưởng đi dạo.
- Không cho quest có bước ở map khác (chuyện mới đặt hẳn ở map khác, dùng mục tiêu sẵn có của map đó, không sinh lại map đó).
- Không thêm bảng hay migration: đồ lưu niệm lưu ở `shop_inventory` như đồ rương hiện nay.
- Không deploy: dừng khi gate xanh, chờ người sở hữu yêu cầu.

## Pha

| Pha | Việc | Tier |
|---|---|---|
| 1 | Schema + server đồ lưu niệm: `half.decor` trong `region-rewards.json`, `souvenir` trong `decor.json`, nhận rương nửa đường ghi kiểu vào `shop_inventory`, `PUT /api/home-decor` khóa kiểu lưu niệm chưa có, DTO tier có `decor`; test | M |
| 2 | Model + map: 11 kiểu lưu niệm trong `nha-cua-be-props.ts`, `models.json`, `assets:box-props`, `assets:manifest`, `pnpm world:nha-cua-be`, `world:walk`, 3 audit | M |
| 3 | Web đồ lưu niệm: thẻ khóa trong "Trang trí nhà" ghi cách nhận và nút tới map; bảng rương hiện đồ của tầng nửa đường | S |
| 4 | Bài hôm nay: hàm thuần `dailyLesson` trong `packages/quest` + test; thẻ ở màn Home; chip HUD ở Nhà của bé (hook nhỏ ở `play-screen.tsx`, báo phiên khác trước) | M |
| 5 | Hai chuyện mới ở Trung tâm (Voi Kẹo Bông, bạn thư của Gấu) và Nông trại (bạn của Ông Cụ): quest `yarn-*`, arc, thư, quan hệ, lời nhắc của nhân vật ở nhà | M |
| 6 | Thú cưng rủ đi chơi: câu nói theo map bài hôm nay (song ngữ) | S |
| 7 | Gate nhanh, tài liệu (`docs/design-cac-map.md`, `docs/project-roadmap.md`), trang review | S |

## Tiêu chí xong

- Server là nguồn sự thật cho đồ lưu niệm: chọn kiểu chưa có trả 403 `decor-locked`; nhận rương hai lần không ghi hai lần; test IDOR giữ nguyên.
- `content:check` báo lỗi khi một map mở (trừ Nhà của bé) không có đồ lưu niệm, hay một kiểu lưu niệm không do đúng rương của nó trao.
- `dailyLesson` cùng người, cùng ngày cho cùng bài; ưu tiên bài đang dở; không bao giờ chọn bài ở Nhà của bé.
- Các audit Nhà của bé sạch với mọi kiểu (kể cả lưu niệm), lưới đi sinh lại.
- Gate chạy: `assets:check`, `content:check`, `typecheck`, `lint`, test các tệp liên quan, `--filter @miu/web build`. Theo lời người sở hữu ("khi nào tôi yêu cầu thì mới test"), không chạy toàn bộ `pnpm test` hay E2E nếu không được yêu cầu; báo rõ phần không chạy.

## Phối hợp

Hai phiên khác trên `main` (09/10): `miu-world-ad` sửa bot memory, schema.test, docs hệ thống, unit backup; `miu-world-05` điều tra lỗi Nhà của bé ở `apps/web/src/ui/quest/*` và `play-screen.tsx`, giữ cổng 8787/5173. Chỉ `git add` tệp của plan này.
