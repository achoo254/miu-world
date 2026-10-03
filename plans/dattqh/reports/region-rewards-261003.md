# Rương khu vực: báo cáo 03/10/2026

Người sở hữu (03/10/2026): "khi hoàn thành hết nhiệm vụ ko thấy phần thưởng thêm j đặc biệt."

Trạng thái: xong phần server, nội dung, đồ độc quyền, giao diện và tài liệu; chưa commit. Hai file test web đang đỏ vì một phiên khác đang chuyển giao diện sang song ngữ và đang sửa dở các file rương khu vực (xem "Còn lại").

## Kết quả

Mỗi khu trong 12 khu có một "Rương khu vực" chia bốn bậc. Server đếm tiến độ, server trả thưởng; bé bấm "Nhận thưởng" trên màn khu vực, rương mở ra và hiện thẻ "Chúc mừng!".

| Bậc | Điều kiện (server đếm) | Thưởng |
| --- | --- | --- |
| Quà nửa chặng | xong ≥ 50% bài học của khu (quest `main`, làm tròn lên) | Xu, XP |
| Rương khu vực | xong cả bài học | Xu, XP, một đồ mặc độc quyền, danh hiệu |
| Quà ba sao | mọi bài học đều 3 sao | Xu, XP, thêm một đồ mặc độc quyền |
| Quà trò chơi | 10 lượt minigame (side quest) trong khu, tính cả chơi lại | Xu, XP |

Số Xu và XP tăng theo số bài học của khu: khu 12 bài cho 200 Xu ở bậc rương, khu 1 bài cho 90 Xu. Danh mục nằm ở `content/region-rewards.json`, `pnpm content:check` kiểm. Tính theo lượt chơi vì có khu chỉ có 8 side quest.

## Đồ độc quyền

Có 24 đồ mặc mới, mỗi khu hai món. Mỗi món là bản đổi màu của một đồ sẵn có, khai `"unlock": {"region": "<khu>"}` trong `content/accessories/*-ruong-*.json`. Các món này không bán ở cửa hàng.

- Món của rương: mũ theo bối cảnh, ví dụ Mũ nấm rừng thần, Nón lá ven sông, Mũ giáp lâu đài, Mũ tai thỏ tuyết.
- Món của quà ba sao: cánh, khăn, balo hoặc đồ cầm tay, ví dụ Cánh lá vàng rừng thần, Sách thần thư viện, Balo vỏ sò đảo bí ẩn.

Ảnh làm bằng `PREVIEW_ONLY=ruong pnpm assets:accessories` qua lock, manifest sinh lại tự động (chỉ thêm 24 dòng). Danh hiệu theo khu, ví dụ "Nhà thám hiểm rừng xanh", "Mọt sách nhí", "Thuyền trưởng đảo bí ẩn".

## Server

- `GET /api/region-rewards` trả mọi khu kèm danh hiệu đã có. `GET /api/regions/:regionId/rewards` trả một khu. `POST /api/regions/:regionId/rewards/claim {tier}` nhận một bậc.
- Client chỉ gửi tên bậc; mọi giá trị khác trong body bị bỏ qua. Server đếm từ `quest_progress` (đã xong, sao tốt nhất) và các lượt side quest đã trả trong ledger.
- Mỗi lần nhận ghi một dòng ledger `region:<id>:<tier>`. Khóa unique (hồ sơ, nguồn) đảm bảo mỗi bậc chỉ trả một lần: nhận lại trả `granted: false`, năm lần gọi đồng thời chỉ trả một lần.
- Đồ độc quyền vào `shop_inventory` trong cùng transaction, có khóa hàng hồ sơ. Vì vậy màn tạo nhân vật thấy món là của bé, và `PUT /api/character` cho mặc.
- Không cần bảng mới, nên không có migration. Bản xuất dữ liệu đã có sẵn ledger và `shop_inventory`; xóa hồ sơ thì cascade như cũ.
- Lỗi trả về: 404 `region-not-found`, 409 `tier-not-reached`, 400 `invalid-input`; thiếu phiên 401; Origin lạ 403.
- Logic bậc là hàm thuần ở `packages/quest/src/region-reward.ts`. Schema và DTO ở `packages/schema/src/region-reward.ts`.
- `packages/voxel/src/accessory-schema.ts`: thêm `unlock.region` (món chỉ mở bằng rương, không kèm điều kiện khác); `isAccessoryOpen` coi món đó như món cửa hàng (mở khi đã sở hữu).

## Giao diện

- **Màn khu vực**: ảnh rương đóng cũ đã thay bằng panel thật.
  - Thanh "Hoàn thành" có mốc quà ở vị trí nửa chặng, kèm dòng mục tiêu tiếp theo.
  - Rương rung khi mở được ("Mở rương!") và đứng mở khi đã nhận.
  - Danh sách bốn bậc, mỗi bậc ghi Xu, XP, ảnh món, và một trong ba trạng thái: "Nhận thưởng", "Đã nhận" hoặc khóa kèm tiến độ.
  - Thẻ "Chúc mừng!": rương bật nắp có tia sáng, rồi lần lượt hiện Xu, XP, món độc quyền ("Đã cất vào tủ đồ"), danh hiệu mới, lên cấp nếu có. Có nút "Mặc thử ngay" mở `/create`. Huy hiệu Xu cập nhật ngay.
- **Trang chủ và Bản đồ**: khu có bậc chưa nhận hiện nhãn "Nhận thưởng" trên khu. Trên điện thoại, các nhãn xếp thành hàng dưới đảo và ghi tên khu, để không che tên khu trên đảo. Danh hiệu mới nhất hiện dưới huy hiệu của bé.
- **Thẻ hoàn thành quest bài học**: thêm khối rương của khu, gồm thanh tiến độ và câu tiếp theo, ví dụ "Còn 2 nhiệm vụ nữa tới rương!" hoặc "Rương khu vực đã sẵn sàng…".
- **Màn tạo nhân vật**: món chưa nhận ghi "Quà rương <khu>".

## Ảnh đã xem (`plans/dattqh/reports/region-rewards-261003/`)

- Cách chụp: server riêng ở cổng 8797 (PGlite trong RAM, phụ huynh giả), Vite dev 5173, cả hai chạy trong lock và đã tắt. Bé giả đã chơi hết Nhà của Mochi, 5 bài Khu rừng và 7 bài Làng Ven Sông.
- Màn khu vực: `region-ready-ipad-landscape.png`, `region-ready-phone.png` (ba bậc chờ nhận) và `region-lang-ven-song-ipad-landscape.png` (7/8 bài, mốc quà sáng).
- Thẻ "Chúc mừng!": `claim-ipad-landscape.png` (mũ len, danh hiệu), `claim-phone.png`, `claim-stars-ipad-portrait.png`. Đã nhận đủ: `region-claimed-ipad-portrait.png`.
- Trang chủ và Bản đồ: `home-ipad-landscape.png`, `home-phone.png`, `home-title-ipad-landscape.png`, `map-ipad-landscape.png`. Tủ đồ: `creator-owned-ipad-landscape.png`.
- `home-phone.png` chụp trước khi sửa: nhãn còn đè lên tên khu trên đảo, chưa xếp thành hàng dưới đảo. Chưa chụp lại vì giao diện đang được chuyển song ngữ dở dang.

## Kiểm tra

- `pnpm content:check`: OK, 1344 file. `pnpm assets:check`: OK, 4545 file.
- vitest, 10 file: 1045 test pass. Gồm:
  - region-reward (server 14 test, schema, quest);
  - endpoint-table, account, character, shop;
  - voxel-accessory;
  - check-content.
- `@miu/server typecheck`, `@miu/web typecheck`: sạch tại thời điểm chạy. `pnpm --filter @miu/web build`: OK, chỉ có cảnh báo chunk > 500 kB có từ trước. `pnpm security:dist`: OK.
- eslint `--max-warnings=0` trên mọi file đã sửa: 0 lỗi.
- Web vitest đã pass trước khi phiên song ngữ sửa file: `region-rewards.test.tsx` 9 test, creator, home, rewards.
- Chưa chạy: E2E, `pnpm test` toàn bộ (theo yêu cầu).

## Còn lại

1. Một phiên khác đang chuyển giao diện sang song ngữ (`apps/web/src/ui/i18n`) và đang sửa dở `region-rewards.ts`, `region-reward-panel.tsx`, `region-reward-badges.tsx`, `kit/modal.tsx`, `home-screen.tsx`.
   - Hiện đỏ: `apps/web/src/ui/region/region-rewards.test.tsx` và `home-screens.test.tsx` ("map books"), lỗi "Objects are not valid as a React child ({vi, en})".
   - Theo điều phối: phiên song ngữ làm xong và sửa cho các test này pass ở chế độ vi; tôi không sửa các file đó nữa.
2. Ngoài danh sách file được giao, đã sửa tối thiểu:
   - `packages/voxel/src/accessory-schema.ts` và test của nó: thêm `unlock.region`.
   - `tools/content/check-content.ts`: thêm validator cho file JSON mới.
   - `packages/schema/src/account.ts`: chỉ sửa comment.
3. Danh hiệu hiện ở Trang chủ (dưới huy hiệu của bé, nối tới Hồ sơ), ở màn khu vực và trong thẻ "Chúc mừng!". Màn Hồ sơ (`apps/web/src/ui/profile`) không nằm trong phạm vi được sửa nên chưa có mục danh hiệu.
4. Thẻ hoàn thành của minigame side quest nằm trong `ui/minigame` (ngoài phạm vi), nên chưa hiện tiến độ "Quà trò chơi".
5. `docs/project-roadmap.md` chưa cập nhật; để phiên chính làm khi commit.
