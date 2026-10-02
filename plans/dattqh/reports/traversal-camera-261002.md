# Di chuyển, va chạm, camera: rà soát và sửa (02/10/2026)

Yêu cầu người sở hữu (02/10/2026 ~22:00): phân loại vật theo cách đi qua (đi xuyên / tự bước–trèo / chắn), tách va chạm khỏi hiển thị, mặc định không làm mờ vật nào vì che bé. Commit `b495e7d`.

## Hiện trạng trước khi sửa và nguyên nhân sai

| Phát hiện | Hệ quả |
| --- | --- |
| Va chạm chỉ theo khối (`solid` trong `content/blocks.json`); prop (bàn, thùng, quầy, đèn, rào, cửa…) không có va chạm nào | Bé đi xuyên mọi đồ vật |
| Bước lên 1 khối và tự trèo 2 khối áp cho mọi khối rắn (`grid-collision.ts`, `player-controller.ts`) | Rào, tường thấp 2 khối bị trèo qua |
| Shader nhìn xuyên (`block-material.ts`): mờ mọi thứ trong ống nhìn camera→bé, mọi thứ trong 3 khối quanh ống kính, trần trong nhà; prop mờ theo `seeThroughCopy` | Vật sát camera, cây, tường tự mờ — trái yêu cầu |
| Camera không va chạm (cố ý, quy tắc cũ "camera không bị đẩy, vật che thì mờ") | Bỏ làm mờ thì cần camera tự tránh tường |
| Không có "map Tiled" hay layer/mask va chạm; dữ liệu là lưới khối + danh sách prop | — |

## Logic mới

- `packages/voxel/src/traversal.ts`: `walk-through` · `auto-step` · `blocking`, khai bằng dữ liệu: `traversal` trong `content/blocks.json` (mặc định theo `solid`; `iron`, `glass` là `blocking`) và `content/world/models.json` (83 model `walk-through`: cây, bụi, cỏ, hoa, ruộng, nấm, lá súng, thảm, người/vật làm cảnh; 11 `blocking`: rào, cửa, lan can, cổng, đá lớn; còn lại mặc định `auto-step`).
- `prop-collision.ts`: mỗi prop rắn lấp các ô lưới mà khung bao của nó phủ ≥ 30% mỗi chiều, kèm loại; dùng chung cho game và công cụ map.
- Di chuyển: `moveAndCollide` bước lên 1 khối nhưng không bao giờ lên trên ô `blocking`; tự trèo 2 khối bỏ qua mặt `blocking`; đi xuyên = không có ô va chạm. Nhảy vẫn là nhảy.
- Hiển thị: game không truyền đường nhìn cho shader nữa (`world.update(camera)`), prop không dùng vật liệu mờ: không vật nào mờ/trong suốt vì che bé hay sát camera. Mã shader còn trong `block-material.ts` nhưng tắt.
- Camera (`camera-rig.ts`): tia từ đầu bé tới camera chạm khối/prop rắn thì camera dừng trước đó 0,35 khối (gần nhất 1 khối), đường thông thì lùi ra dần; lá cây và cây không rắn nên không đẩy camera.
- Xuống xe hay vào lại chỗ cũ mà ô bị prop chiếm thì bé đứng ô trống gần nhất (`nearestUsableSpot`).
- Công cụ map (`walkable.ts`, `map-checks.ts`, `prop-cells.ts`): phép kiểm "đi tới được" tính cả prop và luật `blocking`.

## Kiểm tra

| Case | Cách kiểm | Kết quả |
| --- | --- | --- |
| 1, 2 Bụi cỏ, ruộng → đi xuyên | `traversal.test.ts` "walks through"; prop `walk-through` không có ô va chạm (`prop-collision.test.ts`) | Đạt |
| 3, 4 Đá thấp, bậc thấp → tự bước lên/xuống; gờ 2 khối tự trèo | `traversal.test.ts` | Đạt |
| 5, 6 Tường, rào, cửa đóng → bị chặn (cả loại thấp 1–2 khối) | `traversal.test.ts` | Đạt |
| 7 Camera sau cây → cây không mờ, camera giữ khoảng cách | `traversal.test.ts` camera; shader tắt | Đạt |
| 8 Camera sau tường → tường không mờ, camera tiến lại trước tường | `camera-rig.test.ts`, `traversal.test.ts` | Đạt |
| 9 Chạy liên tục qua cỏ, thùng, rào → không giật, không kẹt, không xuyên rào | `traversal.test.ts` "mixed things" | Đạt |
| Bản đồ | Script kiểm 11 map đã sinh: mọi mục quest, cổng, bến xe vẫn đi tới được với prop rắn và luật `blocking`; chỗ xuất hiện, điểm đầu chương không bị prop chiếm | Đạt (4 điểm xuống tàu ở Khu rừng trúng biển chỉ đường: xử lý bằng `nearestUsableSpot`) |

Đã chạy: typecheck, lint, test nhân vật/camera/voxel (31 + 276), test danh mục, `assets:check`, `content:check`. Không chạy E2E và cả bộ test (người sở hữu: chỉ test khi được yêu cầu). Chưa thử trực tiếp trên thiết bị.

## Hạn chế

- Trong nhà, camera bị trần kéo sát bé (tối thiểu 1 khối): phòng hẹp nhìn chật hơn trước (trước đây trần mờ đi). Cần người sở hữu chọn nếu thấy khó nhìn.
- Va chạm prop theo ô lưới 1 khối: vật mảnh (cột đèn, chân biển) không chắn; vật phủ một phần ô chắn cả ô.
- Bé đứng sát tường quay lưng: camera không có chỗ trước tường, đứng sát 1 khối.
