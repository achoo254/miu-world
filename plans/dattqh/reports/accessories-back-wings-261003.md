# Phụ kiện mới: đồ đeo lưng (`back`) và cánh (`wings`) — 03/10/2026

Thuộc plan `plans/dattqh/261003-1038-more-accessories-spread-life/` (pha 1, nhóm khe lưng + cánh).

## Kết quả

Đã thêm 102 món: 51 món khe `back`, 51 món khe `wings`. Mỗi món là một file trong `content/accessories/`, gồm món gốc (hình riêng) và biến thể màu (`variantOf`). Tổng catalogue sau khi thêm: `back` 74 món, `wings` 72 món.

Các file JSON được sinh bằng một script tạm trong scratchpad (vẽ bằng ký tự ASCII hoặc công thức, gộp ô thành hộp); repo chỉ nhận file JSON, không có script mới.

### Số món theo cấp (giống nhau cho cả hai khe)

| Cấp | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | Tổng |
| --- | - | - | - | - | - | - | - | - | - | -- | -- | -- | -- | -- | -- | ---- |
| `back` | 10 | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 2 | 2 | 2 | 51 |
| `wings` | 10 | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 2 | 2 | 2 | 51 |

Cấp 1 không có trường `unlock`; từ cấp 2 trở lên có `"unlock": {"level": N}`. Món cấp cao là đồ đặc biệt: vàng, đá quý, phát sáng, phượng hoàng, rồng.

### Mẫu gốc mới

**Đồ đeo lưng (21 mẫu gốc, 30 biến thể màu)**

| Mẫu gốc (id) | Tên | Biến thể (cấp) |
| --- | --- | --- |
| `back-cat-orange` | Balo mèo cam (1) | mèo xám (1), mèo mun (2) |
| `back-bunny-white` | Balo thỏ trắng (1) | thỏ hồng (1), thỏ nâu (2) |
| `back-panda` | Balo gấu trúc (1) | gấu trúc đỏ (6) |
| `back-frog-green` | Balo ếch xanh (1) | ếch vàng (3) |
| `back-kite-red` | Con diều đỏ (1) | diều xanh (2), diều cầu vồng (4) |
| `back-shell-pink` | Balo vỏ sò hồng (1) | vỏ sò xanh ngọc (3), vỏ sò ngọc trai (8) |
| `back-pencils` | Ống bút chì màu (1) | Hộp bút sáp màu (2) |
| `back-non-la` | Nón lá sau lưng (1) | — |
| `back-basket` | Gùi tre (3) | Gùi mây (4) |
| `back-owl-brown` | Balo cú mèo (3) | Balo cú tuyết (6) |
| `back-pineapple` | Balo quả dứa (4) | — |
| `back-drum` | Trống trường (5) | Trống hội vàng (9) |
| `back-hedgehog-brown` | Balo nhím nâu (5) | nhím kẹo hồng (7), nhím bạc hà (7) |
| `back-octopus-pink` | Balo bạch tuộc hồng (5) | bạch tuộc xanh (4), bạch tuộc tím (8) |
| `back-koi-red` | Balo cá chép đỏ (5) | cá chép vàng (8) |
| `back-jetpack-silver` | Balo phản lực bạc (6) | phản lực đỏ (9), phản lực vàng (11) |
| `back-scuba-yellow` | Bình lặn biển vàng (7) | Bình lặn biển xanh (9) |
| `back-chest-wood` | Rương báu (10) | Rương ngọc tím (12), Rương báu vàng ròng (14) |
| `back-unicorn-white` | Balo kỳ lân (10) | kỳ lân tím (10) |
| `back-dragon-egg` | Trứng rồng (11) | Trứng rồng lửa (12), Trứng rồng vàng (15) |
| `back-gem-diamond` | Balo kim cương (15) | hồng ngọc (13), ngọc lục bảo (13), ngọc xanh lam (14) |

**Cánh (19 mẫu gốc, 32 biến thể màu)**

| Mẫu gốc (id) | Tên | Biến thể (cấp) |
| --- | --- | --- |
| `wings-dragonfly-blue` | Cánh chuồn chuồn xanh (1) | xanh lá (1), đỏ (2), chuồn chuồn ngọc (7) |
| `wings-cloud-white` | Cánh mây trắng (1) | mây hồng (1), mây hoàng hôn (3) |
| `wings-heart-red` | Cánh trái tim đỏ (1) | hồng (1), tím (2) |
| `wings-star-yellow` | Cánh ngôi sao vàng (1) | xanh (2), bạc (5) |
| `wings-owl-brown` | Cánh cú mèo (1) | Cánh cú tuyết (4) |
| `wings-swallow` | Cánh chim én (1) | Cánh chim bói cá (3) |
| `wings-plane-white` | Cánh máy bay trắng (1) | đỏ (3), vàng (4) |
| `wings-cicada` | Cánh ve sầu (2) | — |
| `wings-lotus` | Cánh hoa sen (3) | hoa đào (4), hoa mai (5), sen vàng (10) |
| `wings-parrot-red` | Cánh vẹt đỏ (4) | vẹt xanh lá (5), vẹt xanh dương (9) |
| `wings-snowflake` | Cánh bông tuyết (5) | bông tuyết xanh (7) |
| `wings-crystal-ice` | Cánh pha lê băng (6) | pha lê hồng (7), thạch anh tím (8), kim cương (13) |
| `wings-crane` | Cánh hạc trắng (6) | Cánh hạc vàng (10) |
| `wings-eagle-brown` | Cánh đại bàng (6) | đại bàng trắng (8), đại bàng vàng (12) |
| `wings-sun` | Cánh mặt trời (9) | Cánh mặt trăng (8) |
| `wings-peacock` | Cánh chim công (9) | công trắng (11), công vàng (13) |
| `wings-galaxy` | Cánh dải ngân hà (10) | Cánh cực quang (12) |
| `wings-phoenix-gold` | Cánh phượng hoàng vàng (14) | Cánh phượng hoàng băng (15) |
| `wings-dragon-royal` | Cánh rồng thần vàng (14) | rồng ngọc bích (11), rồng bạch kim (15) |

### Cách gắn

- Đồ lưng: `attachNode: torso`, `voxelSize: 0.0625`, `offset: [0,0,0]` như `back-dino`; thân nằm ở z −11…−7 (mặt hình quay ra sau lưng), bốn quai giống mọi balo cũ (vắt qua vai, xuống ngực). Chi tiết nổi (mũi, mỏ, khóa rương, đỉnh nón lá, gân vỏ sò, mặt kim cương) nhô thêm 1 khối ra sau.
- Cánh: `attachNode: torso`, `voxelSize: 0.08`, `offset: [0,-0.15,0.2]` như các cánh cũ; cánh phải vẽ từ x = 1 ra ngoài, cánh trái là ảnh gương (x → −x−w), có khối dây đeo giữa lưng như mọi cánh cũ, nên hai cánh đối xứng và mọc từ giữa bả vai.
- Số hộp mỗi mẫu: đồ lưng 21–105, cánh 21–125; các cánh cũ 50–135. Test ngân sách tam giác (`MAX_ACCESSORY_TRIANGLES`) qua hết.

## Kiểm tra

- **Schema và tên:** dựng toàn bộ catalogue bằng `buildAccessoryCatalog` được 616 món ở 9 khe (`back` 74, `wings` 72). Không có id hay tên nào trùng, kể cả với các món mà agent khác thêm cùng lúc. Có 2 tên đã đổi vì trùng với món tay sẵn có ("Đèn ông sao đỏ/vàng"): mẫu đèn ông sao được thay bằng mẫu Balo nhím.
- **`pnpm content:check`:** `content:check OK — 761 files`. Mọi món đều có ảnh, mỗi khe vẫn có ≥ 20 món mở từ cấp 1.
- **`pnpm vitest run packages/voxel apps/web/src/game/character`:** 13 file, 713 test, tất cả đều qua (lần chạy cuối). Ở một lần chạy trước có 51 test đỏ, đều là món `clothes-*` của agent khác khi họ đang sửa dở; riêng nhóm `back-`/`wings-` khi đó cũng đã qua 146/146, gồm cả kiểm ngân sách tam giác và biến thể màu cùng hình.
- **Ảnh icon** (`PREVIEW_ONLY=back-` / `wings-` … `pnpm assets:accessories`, sau đó chạy lại theo từng nhóm nhỏ vì máy render bị treo khi nhiều agent cùng dùng): đủ 102 ảnh ở `assets/generated/accessories/`. Ảnh `back-*`/`wings-*` cũ cũng được vẽ lại, nội dung giống hệt. Manifest do lệnh render tự ghi lại.
- **Ảnh đeo trên Miu** (`PREVIEW_ONLY=item-back-` / `item-wings-` … `pnpm assets:preview accessories`, nhìn từ sau lưng): đã xem đủ 21 mẫu lưng và 19 mẫu cánh. Kết quả:
  - Đồ lưng nằm giữa lưng, quai vắt qua vai, mặt hình (mặt con vật, hoa văn) quay ra sau, không lẹm vào người. Tai thỏ, sừng kỳ lân, đầu diều nằm sau đầu nên một phần bị đầu che.
  - Cánh mọc từ giữa bả vai, hai bên đối xứng, không lơ lửng.
  - Đã sửa sau lần xem đầu: vẽ lại cánh mặt trời (tia đứt khúc), cánh phượng hoàng (dáng cục, không ra cánh) và cánh rồng thần (xương rối). Đổi đuôi diều từ trắng sang nâu vì đuôi trắng nhìn như rời ra. Đã render và xem lại cả bốn món.
- Không chạy E2E và `pnpm test`, theo yêu cầu.

## Ghi chú

- Đuôi của Miu chọc ra phía sau lưng nên hiện thành vạch trắng đè lên mọi đồ lưng, cả balo cũ như `back-dino` và `back-school-blue`. Lỗi này có từ trước và do rig nhân vật, không phải do món mới.
- Các file nằm trong `content/accessories/back-*.json` và `wings-*.json` (102 file mới), cùng ảnh trong `assets/generated/accessories/` và `assets/generated/review/accessories/`. Chưa commit.

Status: DONE
Summary: Đã thêm 51 món khe `back` (21 mẫu gốc) và 51 món khe `wings` (19 mẫu gốc), chia cấp 1 → 15 theo đúng bảng (10/4×4/3×5/2×5) và đủ ảnh. Đã kiểm hướng đeo trên Miu. `content:check` qua; test voxel + character qua 713/713.
Concerns/Blockers: Đuôi Miu đè lên mọi đồ lưng, là lỗi có từ trước, ngoài phạm vi việc này. Lệnh render vẫn có thể treo khi chạy lâu, nên render theo nhóm `PREVIEW_ONLY` nhỏ.
