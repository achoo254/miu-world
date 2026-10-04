# Báo cáo: Đồ sưu tầm 12 map và Sổ sưu tập (pha L1, plan life-expansion)

Ngày 04/10/2026 · nhánh `main` · chưa commit · tier L

## Kết quả

Bé làm xong một nhiệm vụ hoặc thắng một lượt minigame ở vùng nào thì nhận một món trong bộ của vùng đó. Món nào cũng xem được trong Sổ sưu tập. Đủ 10 món thì bé bấm "Nhận thưởng" để lấy 150 xu và một danh hiệu, mỗi bộ chỉ nhận được một lần. Server quyết định mọi thứ: món nào rơi, có đủ bộ chưa, thưởng bao nhiêu.

## Dữ liệu (`content/collectibles.json`, `content/items/*.json`)

- Có 12 bộ, mỗi bộ 10 món, tổng 120 món. Tên, mô tả và hình của từng món chỉ nằm trong `content/items/<id>.json` (`kind: "collectible"`, có thêm trường tùy chọn `en.name`). File `collectibles.json` chỉ giữ thông tin cấp bộ: id món, độ hiếm, một câu chuyện ngắn, tên bộ và danh hiệu tiếng Anh, phần thưởng. Trước đây hai file chép lặp cùng nội dung, giờ không còn.
- Hình được sửa cho đúng: mỗi món một hình riêng trong bộ của nó. 15 món chưa có hình phù hợp trong bộ Fluent Emoji thì được thay bằng món khác vừa với vùng đất và có hình đúng, ví dụ "Cần câu tre" (trước đó hiện hình diều) thay bằng "Ếch xanh bờ ao", "Khúc côn cầu" thay bằng "Xe trượt tuyết gỗ". UI dùng thêm 44 icon có sẵn trong pack, không thêm file nào vào `assets/` và không sửa manifest. 5 key icon không dùng tới đã bị bỏ.
- Câu `usedIn` cũ hứa "cho thú cưng ăn" và "nấu ăn" (việc của L2 và L3, chưa làm). Đã đổi thống nhất thành "Góp vào bộ sưu tập … trong Sổ sưu tập."
- Bỏ `food` khỏi `ItemKind` vì chưa có chỗ nào dùng. Khi làm L3 thì thêm lại.
- `pnpm content:check` giờ kiểm thêm: bộ phải trỏ tới vùng có thật, mỗi bộ đúng 10 món, một món chỉ thuộc một bộ, món trong bộ phải có file item `kind: collectible`, và item collectible nào cũng phải nằm trong một bộ (`collectibleIssues` ở `packages/schema/src/collectible.ts`).
- Đã xóa `scratch/`. Script sinh dữ liệu chỉ dùng một lần, phần còn giá trị (luật kiểm dữ liệu) đã chuyển vào content check.

## Server

- Món rơi được ghi cùng transaction với phần thưởng nhiệm vụ: một dòng ledger riêng `drop:quest:<id>[#run]` (0 XP, 0 xu) và cộng vào `inventory_items`. Không có bảng mới, không có migration.
- Chọn món (`packages/quest/src/collectible-drop.ts`): kết quả tất định theo `childId|nguồn của lượt chơi`. Ưu tiên món bé chưa có; 25% số lượt bốc từ cả bộ nên có thể ra món trùng (trùng thì cộng số lượng). Trọng số độ hiếm: thường 6, hiếm 3, quý 1. Lượt chơi gửi lại không rơi thêm, lượt chơi lại mới (run mới) thì rơi tiếp. Khi chụp ảnh thật, bé hoàn thành bộ Khu rừng sau 14 lượt.
- `completion.collectible = { itemId, mapId, owned }` báo cho client món vừa rơi. `owned = 1` nghĩa là món mới.
- `GET /api/collection` trả về các bộ (món đang có kèm số lượng, found/total, complete, claimed, reward) và danh sách danh hiệu.
- `POST /api/collection/claim {mapId}` kiểm dưới khóa hồ sơ trẻ, ghi ledger `collection:<mapId>` với số xu do server tính. Nhận lần hai thì trả `granted: false` và không trả thêm gì. Bộ chưa đủ trả 409 `set-not-complete`, bộ không tồn tại trả 404.

## Giao diện

- Sổ sưu tập (`apps/web/src/ui/collection/`), mở từ Ba lô (cả trong game lẫn trang Ba lô) và từ nút mới trên thanh bên ở Home. Có 12 tab vùng đất cuộn ngang, mỗi tab ghi x/10. Mỗi trang có tên bộ, thanh tiến độ và 10 ô: món đã có hiện hình, tên và số lượng; món chưa có hiện bóng mờ. Chạm vào ô thì hiện mô tả, độ hiếm, câu chuyện và số đang có. Ô thưởng đủ bộ có rương và nút "Nhận thưởng"; nhận xong thì hiện thẻ "Chúc mừng!" giống rương khu vực.
- Ghi chú nhỏ "Mới!" xuất hiện trên thẻ hoàn thành bài học và thẻ kết quả minigame khi có món rơi. Nếu là món trùng thì ghi ×n.
- Chữ giao diện có cả tiếng Việt và tiếng Anh (17 key mới trong `vi.json`/`en.json`). Tên món và tên bộ hiển thị bằng `<Bi>`, dùng `en` trong dữ liệu.
- Mục "Bộ sưu tập" cũ ở trang Hồ sơ giờ chỉ hiện đồ nhiệm vụ, đồ sưu tầm đã có Sổ riêng.

## Kiểm tra

| Gate | Kết quả |
| --- | --- |
| `pnpm assets:check` | OK, 16 pack, 4577 file |
| `pnpm content:check` | OK, 1825 file |
| `pnpm typecheck` | sạch (gốc, server, web) |
| `pnpm lint` | 0 lỗi, 0 cảnh báo |
| `pnpm --filter @miu/web build` | OK; cảnh báo chunk > 500 kB vẫn như trước |
| `pnpm security:dist` | OK |
| Vitest chạy theo file liên quan | server: collection (10), quest/region-reward/shop/account/content/schema/child-profile (253); web: collection, rewards, region, home, i18n, quest, minigame; packages: collectible-drop (5), collectible schema (3). Tất cả pass |

Test mới bao phủ: IDOR, nhận thưởng hai lần, bộ chưa đủ, 5 lần nhận thưởng đồng thời (chỉ trả một lần), export rồi xóa dữ liệu trẻ, rơi đúng một lần mỗi lượt và lượt mới rơi tiếp, client gửi kèm số xu bị từ chối. Các test cũ của quest-routes đếm dòng ledger nên đã được cập nhật để tính cả dòng `drop:`.

Không chạy E2E và không chạy toàn bộ `pnpm test`, đúng như yêu cầu.

## Ảnh (`plans/dattqh/261004-1035-life-expansion/screenshots/`)

Ảnh chụp từ bản build thật, server PGlite trong RAM, tài khoản phụ huynh giả. Món rơi là thật: bé chơi 18 lượt minigame qua API rồi mới chụp. Có ảnh phone (390×844) và iPad (1180×820): trang bộ, chi tiết món kèm ô thưởng, thẻ "Chúc mừng!" (phone), trang Nông trại 4/10 với bóng mờ. Sau lần chụp, CSS lưới trên iPad được sửa từ 6 cột thành 5 cột; ảnh iPad hiện tại vẫn là bản 6 cột.

## Dependency mới

Không có.
