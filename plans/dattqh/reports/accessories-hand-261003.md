# Phụ kiện cầm tay (khe `hand`): thêm 51 món theo cấp — 03/10/2026

Plan: `plans/dattqh/261003-1038-more-accessories-spread-life/plan.md` (pha 1, nhóm đồ cầm tay).

## Kết quả

Khe `hand` có thêm **51 món** (trước có 22, nay có 73; 32 món mở sẵn từ cấp 1). Trong 51 món có **27 mẫu gốc mới** và 24 biến thể màu (`variantOf`). Mọi món đều gắn `arm-right`, với `voxelSize` 0.075 và `offset` [-0.15, -0.425, 0] như các món cầm tay đã có. Cán nằm ở gốc (0, 0, 0), tức là trong nắm tay. Không có vũ khí. Tên tiếng Việt không trùng với tên nào trong toàn bộ 616 phụ kiện hiện có.

### Số món theo cấp

| Cấp | Số món | Món |
| --- | --- | --- |
| 1 (mở sẵn) | 10 | Bút chì vàng, Bút chì xanh, Thước kẻ, Sách truyện đỏ, Sách truyện xanh lá, Trống bỏi, Quạt giấy đỏ, Bắp ngô luộc, Ổ bánh mì, Yo-yo đỏ |
| 2 | 4 | Diều giấy, Quạt giấy xanh, Yo-yo xanh lá, Bình tưới cây |
| 3 | 4 | Quả địa cầu, Vợt bắt bướm, Miếng dưa hấu, Trống bỏi xanh |
| 4 | 4 | Cần câu cá, Que thổi bong bóng, Diều sắc cầu vồng, Bình tưới hồng |
| 5 | 4 | Lồng đèn cá chép, Bóng bay trái tim, Micro ca sĩ nhí, Vợt bắt bướm xanh |
| 6 | 3 | Ô sọc hồng, Lồng đèn cá chép vàng, Bóng bay trái tim tím |
| 7 | 3 | Kính viễn vọng, Ô sọc xanh, Micro vàng lấp lánh |
| 8 | 3 | Đũa thần trăng khuyết, Que thổi bong bóng tím, Cần câu vàng |
| 9 | 3 | Gậy pha lê tím, Đũa thần trăng bạc, Kính viễn vọng bạc |
| 10 | 3 | Diều rồng xanh, Gậy pha lê băng, Sách cổ tích vàng |
| 11 | 2 | Gậy mặt trời, Diều rồng đỏ |
| 12 | 2 | Đèn hoa sen, Gậy pha lê hồng ngọc |
| 13 | 2 | Lông vũ phượng hoàng, Đèn hoa sen vàng |
| 14 | 2 | Quyền trượng hồng ngọc, Gậy mặt trời hồng ngọc |
| 15 | 2 | Quyền trượng kim cương, Lông vũ cầu vồng |

Món cấp cao được làm đặc biệt hơn: vàng, đá quý (hồng ngọc, kim cương, pha lê), mặt trời có mặt cười, lông vũ màu lửa, rồng và đèn hoa sen có lõi sáng.

### 27 mẫu gốc mới

- **Đồ học tập:** bút chì, thước kẻ, sách truyện, quả địa cầu, kính viễn vọng.
- **Đồ chơi:** yo-yo, diều giấy, diều rồng, que thổi bong bóng, bóng bay trái tim, micro.
- **Đồ Việt Nam:** trống bỏi, quạt giấy, lồng đèn cá chép, đèn hoa sen.
- **Đồ ăn:** bắp ngô luộc, ổ bánh mì, miếng dưa hấu.
- **Dụng cụ:** bình tưới cây, cần câu cá, vợt bắt bướm, ô.
- **Phép thuật:** đũa thần trăng khuyết, gậy pha lê, gậy mặt trời, lông vũ phượng hoàng, quyền trượng.

Mẫu gốc được viết bằng một script dựng khối voxel (để ngoài repo, trong scratch). Repo chỉ có các file `content/accessories/hand-*.json` mới.

## Kiểm tra hướng cầm khi đeo lên người

- Đã xem ảnh đeo trên Miu của cả 27 mẫu gốc: `PREVIEW_ONLY=item-hand- pnpm assets:preview accessories` cho ra 38 ảnh ở `assets/generated/review/accessories/item-hand-*.png`. Đã xem thêm tư thế `walk` từ phía trước-trái, vì lúc đi tay vung ra trước.
- Cán nằm trong nắm tay và đầu dùng hướng lên hoặc ra trước. Bình tưới có quai trên nắm tay và vòi chĩa ra trước. Yo-yo treo dưới tay bằng dây. Bánh mì và bắp ngô có giấy hoặc vỏ nằm trong tay.
- Có ba chỗ phải sửa sau lần xem đầu:
  - **Lồng đèn cá chép và đèn hoa sen:** trước đặt trên đầu que. Nay treo bằng dây từ móc ở đầu que, chìa ra phía ngoài người.
  - **Cần câu:** trước chĩa thẳng ra trước, nên dây và cá đâm vào mặt khi đi. Nay chĩa ra trước và chếch ra ngoài theo Euler (30, 0, 30). Dây được tính theo hướng thẳng xuống đất trong thế giới, cá treo ở cuối dây. Dây cũng được rút ngắn để cá không thõng tới ngang ngực.
  - **Kính viễn vọng:** trước chĩa ra trước nên che mặt khi đi. Nay chếch ra ngoài.
- Cũng đã sửa vài khối lơ lửng: tua dưới lồng đèn cá, đuôi diều rồng, ngôi sao trong trăng khuyết. Bong bóng xà phòng bay quanh que thổi là cố ý.
- Ảnh icon của 51 món đã xem cả bảng: không món nào bị cắt hay lơ lửng ngoài ý muốn.

## Lệnh đã chạy

| Lệnh | Kết quả |
| --- | --- |
| `pnpm content:check` | `content:check OK — 761 files` (exit 0) |
| `pnpm vitest run packages/voxel apps/web/src/game/character` | 13 file, 713 test pass, 0 fail; trong đó có test ngân sách tam giác (≤ 1500) cho mọi món và mọi màu |
| `PREVIEW_ONLY=hand- … pnpm assets:accessories` (qua lock) | Icon của 27 mẫu gốc; 25 icon biến thể do người điều phối chạy lại từng lô nhỏ sau khi sửa lỗi treo |
| `PREVIEW_ONLY=item-hand- … pnpm assets:preview accessories` (qua lock) | 38 ảnh đeo (exit 0) |
| Kiểm trùng tên toàn catalogue | 616 phụ kiện, 0 tên trùng |

Không chạy E2E và không chạy `pnpm test` (theo yêu cầu). Không commit.

## Lỗi công cụ tìm thấy dọc đường

Lần render thứ 31 trong một lượt luôn bị treo. Nguyên nhân: mỗi trang preview tải khoảng 620 module JSON phụ kiện. Khi trang chuyển sang ảnh tiếp theo, các request còn dở bị hủy, Vite giữ kẹt kết nối, và tới khoảng trang thứ 31 thì không trả module nữa. Cách sửa (chờ `networkidle` sau mỗi ảnh) đã được thử ở bản copy trong scratch: 73/73 ảnh qua. Người điều phối đã đưa vào `f017546`.

Status: DONE
Summary: Thêm 51 món cầm tay (27 mẫu gốc mới, 24 biến thể màu), phân theo cấp 10/4/4/4/4/3/3/3/3/3/2/2/2/2/2. Đã xem hướng cầm trên Miu ở tư thế đứng và đi, sửa lồng đèn (giờ treo), cần câu và kính viễn vọng. `content:check` và vitest (713 test) đều pass.
Concerns/Blockers: Lúc đi tay vung ra trước nên các món dài (que, gậy, cần câu) có lúc lướt sát má, giống các món cầm tay cũ. Người điều phối báo các lượt render dài vẫn có lúc treo sau `f017546`, nên vẫn cần chạy theo lô nhỏ; lượt 38 ảnh của tôi không bị treo.
