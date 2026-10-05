# Cây kỹ năng, Cổng tri thức, Hành trình, Thành tích (05/10/2026)

Plan: `plans/dattqh/261003-1602-coins-items-skills-uses/` (pha 5 và 6). Không thêm dependency, không đổi schema database (mọi thưởng mới đi qua `reward_ledger` và `shop_inventory` sẵn có, nên không có migration).

## Đã giao

- **Cây kỹ năng trong Hồ sơ.** Mỗi môn một tab (Toán, Tiếng Việt, English); mỗi kỹ năng có hàng 10 lá, lá sáng theo cấp; thanh điểm tới cấp sau; quà của cấp kế tiếp (Xu, ảnh món đồ nếu có) và số quà đã nhận. Số liệu từ `GET /api/skill-tree`.
- **Quà mỗi cấp kỹ năng.** Dữ liệu ở `content/progression/skill-gifts.json`: Xu cho mọi cấp 2–10 (10 → 80 Xu) và 10 món đồ mặc theo chủ đề trên 10 cấp (ví dụ "Kính đọc sách" ở Đọc hiểu Lv.3, "Mũ nhà toán học" ở Phép cộng Lv.5, "Mũ học giả uyên bác" ở Đọc hiểu Lv.10). Server trả quà một lần mỗi cấp (ledger `skill-gift:<kỹ năng>:<cấp>`) trong cùng transaction với Skill XP đạt cấp (hoàn thành quest, thi Olympic). Cấp đã đạt trước khi có quà được trả bù ở lần Skill XP tiếp theo của kỹ năng đó. Màn "Kỹ năng lên cấp" liệt kê quà (Xu, món độc quyền, "Đã cất vào tủ đồ"); màn này hiện cả khi lượt chỉ trả quà bù.
- **Đồ mặc phần thưởng.** 20 món mới (10 quà kỹ năng, 10 thành tích) là biến thể màu của phụ kiện có sẵn, ảnh render bằng generator (`PREVIEW_ONLY=-ky-nang-` / `-thanh-tich-` `pnpm assets:accessories`), manifest sinh lại. Khóa mới `unlock: { award: true }`: chỉ mặc khi đã nhận (server kiểm ở `PUT /api/character`, màn Tạo nhân vật ghi "Quà kỹ năng hoặc thành tích").
- **Cổng tri thức (M3.9).** Bảng theo mock: tên cổng, kỹ năng và cấp cần, cấp hiện tại, thanh tiến độ, kho báu bên trong, nút "Đến luyện tập {kỹ năng}" tới quest luyện đúng kỹ năng (`content:check` kiểm quest luyện có thưởng kỹ năng đó). Bài học không bao giờ chờ cổng (luật "không mở khóa"): thiếu cấp thì "Đi tiếp, để sau mở", bước quest vẫn hoàn thành, chỉ kho báu đóng; bảng chỉ hiện một lần mỗi cổng mỗi lượt vào game. Đủ cấp thì server trả kho báu một lần mỗi lượt chơi quest có bước mở cổng (`gate:<target>@quest:<id>[#lượt]`, đúng luật mỗi lượt chơi lại đều thưởng), banner trên game báo kho báu bằng câu chọn từ pool 4 câu không lặp liền. Server chỉ tính cổng là mục tiêu của chính bước đó (search/find-object: mục tiêu vừa tìm); client gửi `target` khác không mở được gì.
- **Hành trình.** `/journey`: các vùng đất theo thứ tự thế giới (ảnh nền khu, số bài xong/tổng, tích khi trọn vẹn, "Chưa ghé thăm"), dòng thời gian mới nhất trước (60 mục) với tab Tất cả / Nhiệm vụ / Nhận đồ / Phát triển. Server dựng từ `reward_ledger` (ngày ghi sẵn) và `quest_progress`: nhiệm vụ, trò chơi, vật phẩm rơi và đồ mua, quà khu vực, bộ sưu tập, quà kỹ năng, thành tích, cổng, Olympic, quà thư; lên cấp và kỹ năng lên cấp tính lại từ tổng cộng dồn. Không thu thêm dữ liệu.
- **Thành tích.** 63 mục trong `content/progression/achievements.json`: Khám phá 15, Học tập 17, Trò chơi 14, Sưu tầm 11, Sự kiện 6; 10 mục có món độc quyền. 24 loại chỉ số đều tính từ dữ liệu có sẵn (bài xong theo vùng, ba sao, lượt chơi, trò chơi khác nhau, trùm thắng, cấp, cấp kỹ năng và môn, Xu kiếm được, đồ sưu tầm, bộ sưu tập, rương, đồ mặc, đồ mua, Olympic, quà thư, cổng, quà kỹ năng). `/achievements`: cúp với số đã nhận, tab theo nhóm, danh sách (chờ nhận lên đầu), thẻ chi tiết với phần thưởng và "Nhận thưởng" / "Chưa hoàn thành", thẻ "Chúc mừng!" sau khi nhận (huy chương, phần thưởng, lên cấp nếu có, "Mặc thử ngay"). Mô tả gọi người chơi bằng `{name}`; tên và mô tả không trùng nhau (`content:check` kiểm).
- **Lối vào.** Trang chủ thêm "Hành trình" và "Thành tích" (huy hiệu số thành tích chờ nhận); Hồ sơ thay dòng "Sắp có" bằng hai nút; menu Tạm dừng trong game (nút Menu của HUD) có hai mục. Hai màn có thanh bên Hành trình / Thành tích / Cửa hàng như mock.
- Chữ giao diện qua i18n vi + en (67 khóa và 1 pool câu); tên kỹ năng, thành tích, đồ là nội dung tiếng Việt như các nội dung khác.

## Endpoint

| Endpoint | Việc |
| --- | --- |
| `GET /api/skill-tree` | Kỹ năng theo môn, cấp, điểm tới cấp sau, quà từng cấp và đã nhận chưa |
| `GET /api/skill-check/:targetId` | (có sẵn) thêm `reward` của cổng; tính cấp bằng một truy vấn thay vì cả bảng tiến độ |
| `POST /api/quests/:questId/steps/:stepId/complete` | (có sẵn) thêm `gates` (kho báu đã trả) và `completion.skillGifts` |
| `GET /api/journey` | Tiến độ vùng đất và dòng thời gian |
| `GET /api/achievements` | Mọi thành tích với tiến độ, đã đạt, đã nhận |
| `POST /api/achievements/:achievementId/claim` | Trả một lần dưới khóa người chơi; 404 id lạ, 409 `achievement-not-reached`; bỏ qua mọi giá trị khác client gửi |

## Test thêm

- Server: `progression/skill-tree-routes.test.ts` (5), `progression/achievement-routes.test.ts` (7: giá server dù client gửi số khác, nhận lặp và 5 lần đồng thời chỉ trả một, món độc quyền vào tủ và mặc được, IDOR người chơi tài khoản khác 404 và không thấy/nhận tiến độ của nhau, 401/403 origin), `progression/journey-routes.test.ts` (5), `quest/knowledge-gate.test.ts` (5: thiếu cấp vẫn đi tiếp, trả một lần mỗi lượt kể cả gửi lặp và đồng thời, lượt sau trả lại, `target` giả không mở gì, IDOR). Cập nhật `quest-routes.test.ts` (quà kỹ năng ở lượt thứ hai), `voxel-accessory.test.ts` (khóa `award`).
- Schema: `achievement.test.ts` (6: kiểm catalogue, mục tiêu vượt nội dung, chữ trùng, món độc quyền trao hai lần, nguồn ledger).
- Web: `journey/progress-screens.test.tsx` (5), `quest/skill-check-modal.test.tsx` (viết lại, 5), `rewards.test.tsx` (cây kỹ năng trong Hồ sơ, quà trên màn Kỹ năng lên cấp).

## Gate

`pnpm assets:check` OK (4596 file) → `pnpm content:check` OK (1868 file) → `pnpm test` 482 file, 6112 test qua, 1 skip → `pnpm typecheck` 0 lỗi → `pnpm lint` sạch; `pnpm --filter @miu/web build` qua (cảnh báo chunk > 500 kB và font phiếu viết có từ trước), `pnpm security:dist` OK. Không chạy E2E (theo yêu cầu).

Test chập chờn khi máy bận (load average ~7 do các phiên khác): hai lượt `pnpm test` có vài test đỏ ở file không đổi (`auth-routes` giới hạn đăng nhập, `quest-routes` giới hạn bước, `collection-routes` trả 404/403/503 ở bước dựng tài khoản). Chạy lại cả bộ và chạy riêng mỗi file 8 lần lúc máy rảnh đều xanh; mã gốc `97b43096` cũng xanh khi máy rảnh. Chưa tìm ra nguyên nhân gốc của nhóm test `collection-routes` dưới tải; nên theo dõi trên CI.

## Review độc lập

Agent `code-reviewer` không thấy lỗi nghiêm trọng: mọi đường thưởng (kho báu cổng, quà kỹ năng, thành tích) do server tính, trả một lần nhờ khóa duy nhất `(child_id, source)`, thứ tự khóa không tạo vòng, `target` giả không mở được cổng. Đã sửa:

- Danh sách thành tích đọc lại sau khi nhận (phần thưởng có thể đạt thành tích khác).
- Banner kho báu: cổng thứ hai mở trong lúc banner đang hiện được ghép vào và banner chạy lại (trước đó bị mất).
- Hai câu một dòng thành pool không lặp liền: lời cổ vũ ở bảng cổng (4 câu, nói rõ kho báu mở ở lần chơi lại) và câu "đã hoàn thành thành tích" (4 câu).
- Trùm chỉ mở cổng khi thắng, không phải ở lượt đúng đầu tiên.
- Mỗi tab Hành trình hỏi server 60 sự kiện mới nhất của tab đó (`?tab=quests|items|growth`), để người chơi lại nhiều không thấy tab trống.
- Gộp "một dòng ledger + món vào tủ đồ" (rương khu vực, quà kỹ năng, thành tích) thành `grantAward`.

Ghi nhận, chưa sửa: Thành tích và Hành trình đọc cả `reward_ledger` của người chơi mỗi lần (ổn ở quy mô hiện tại; khi ledger lớn thì cần endpoint đếm riêng cho huy hiệu Trang chủ); XP của kho báu cổng ở bước cuối không hiện lên màn Lên cấp; phần thưởng thành tích được tính vào các thành tích khác (cấp, Xu, đồ mặc), như mọi nguồn XP khác; test "nhận đồng thời" chạy trên PGlite một kết nối nên chỉ kiểm logic, độ an toàn đồng thời trên Postgres dựa vào khóa duy nhất và khóa hàng người chơi.

## Không làm và lý do

- **Hai rương cổng chưa có trên map** (`ruong-go-bi-mat` ở Khu rừng, `ruong-do-choi-nha-be` ở Nhà của bé): có trong `targets.json` từ trước nhưng không quest nào đặt, nên generator không đặt chúng. Đặt lên map cần một bước quest và sinh lại map 800 × 800 cùng 3 audit; để cho đợt nội dung sau. Ba cổng đang chạy: rương vùi trong cát (So sánh số Lv.2), rương đạo cụ ảo thuật ở Trung tâm (Logic Lv.3), cánh cửa gỗ ở bài tuần 16 (Đọc hiểu Lv.3).
- **Phòng bí mật, đường tắt** của M3.9 cần dựng thêm trên map; khung dữ liệu (`skillCheck` trên bất kỳ mục tiêu nào) đã đủ cho chúng.
- Trạng thái plan sửa thẳng trong `plan.md`: plan này không theo định dạng AgentKit (`ak plan status` thấy 0 pha).
- Plan `261004-1617-boss-skill-check-new-mechanics` còn ghi pha 4 "còn nối giao diện cổng"; phần đó nay đã có ở đây, nên cập nhật dòng trạng thái plan kia khi rà lại.
