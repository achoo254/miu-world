# Nhà của bé: cửa chính, đồ vật không đổi trạng thái, tư thế ngồi (05/10/2026)

Người sở hữu báo ba lỗi trong nhà. Chẩn đoán bằng đọc code và ảnh chụp map thật (`preview.html`, 4 góc trong và ngoài nhà); chưa sửa gì. Quyết định sửa: Jev (`jev-261005-1700-home-door-objects-seat-{input,output}.json`).

## Nguyên nhân

| Lỗi | Nguyên nhân | Bằng chứng |
| --- | --- | --- |
| Cửa chính nằm sai chỗ, gắn vào cầu thang | Lối vào thật là vòm mở, hai cánh cửa gập phẳng ở tường ngoài (`tools/world/generate-nha-cua-be-map.ts`: `H.doorLeaf` ở `home.door.x0 - 1.25` và `+ width + 1.25`), nên trong khung cửa không có cánh nào. Cánh cửa gỗ có tim cao bằng cửa đi (`ncb-under-stair-door.glb`, `ctx.propAt(H.underStairDoor, home.underStair, 270)`) đứng trên mảng tường dưới cầu thang, nhìn như cửa chính của nhà. | Ảnh trong nhà nhìn về cầu thang và ảnh mặt trước |
| Tương tác đồ vật không thấy thay đổi | Danh mục tương tác (`apps/web/src/game/interact/object-interaction-registry.ts`, khoảng 100 loại) chỉ có tư thế, câu nói, âm thanh; không có khái niệm trạng thái của đồ vật, `object-interaction-manager.ts` không đổi mesh, vật liệu hay đèn | `ObjectInteractionDef` trong `object-interaction-types.ts` |
| Ngồi nằm trong ghế | Khi `pose` là `sit`/`lay`, `controller.position.set(ox, oy, oz)` đặt bé đúng gốc của vật (cao độ sàn), không cộng chiều cao mặt ghế; trường `offset` có khai báo nhưng không loại nào dùng, bộ quản lý không đọc. `content/world/models.json` chỉ có chiều cao tổng, không có chiều cao mặt ngồi. Thêm: `tv-watch` cũng dùng `pose: 'sit'`, nên bé bị đặt vào trong cái tivi | `object-interaction-manager.ts` (hàm bắt đầu tương tác) |

## Quyết định (Jev)

| Câu | Chọn | Độ tin |
| --- | --- | --- |
| Cửa | Cửa đôi thật trong vòm lối vào, tự mở khi bé tới gần hoặc chạm, đóng lại sau; cửa tim dưới cầu thang thay bằng cửa tủ nhỏ nửa chiều cao | 0.93 |
| Hiệu ứng đồ vật | Hiệu ứng theo dữ liệu cho mỗi loại tương tác (bật/tắt sáng, màn hình động cho tivi/máy tính, một đèn ấm dùng chung gần bé cho đèn bàn, cửa và nắp mở, nước chảy, hơi bếp), áp cho mọi map, giữ ngân sách draw call (vật liệu phát sáng, tối đa 1–2 đèn thật) | 1.0 |
| Lưu trạng thái | Trong nhà riêng của người chơi: lưu ở server cùng trang trí nhà (đèn còn bật lần sau); ở map chung: chỉ trong lượt chơi, chỉ người đó thấy | 0.87 |
| Ghế | Thêm chiều cao mặt ngồi (và mặt nằm cho giường) cho mỗi model ngồi được trong `models.json`, đặt hông lên mặt ghế quay ra phía trước, có giá trị mặc định theo chiều cao model; tivi và vật tương tự dùng chỗ đứng hoặc ngồi sàn phía trước, không đưa bé vào trong vật | 1.0 |

## Thi công

Làm sau khi phiên đang sửa nhà riêng và kết bạn (`261004-1617-parent-area-friends`) commit, vì cùng đụng nhà của bé và trang trí nhà. Sau khi sinh lại map nhà: 3 audit (`scenery-audit`, `room-audit`, `reach-audit`) và `pnpm assets:manifest`.
