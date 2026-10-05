# Online: thấy phụ kiện, tương tác và tổ đội

**Trạng thái:** P1–P3 xong phần tự động (05/10/2026), chờ người duyệt; report `plans/dattqh/reports/online-appearance-party-261005.md`. Chưa làm: màn kiểm duyệt báo cáo (plan `261004-1617-moderation-safety`), danh sách chặn/bỏ chặn và mục "Kết bạn" (đã làm ở plan `261004-1617-parent-area-friends`, 05/10/2026), hành vi rời đội theo tính cách của bạn máy (B2 của plan bot).

Người sở hữu (04/10/2026): "các nhân vật online thấy nhau ko nhìn được phụ kiện của người khác được và chưa tương tác với nhau được, chưa lập tổ đội được. tính năng tổ đội cũng chưa có."

Tầng: **L** (server + schema + client + UI, đổi giao thức WebSocket). Nối tiếp B2 của `261003-2330-bilingual-npc-stories-bots` (tổ đội 2–4, báo cáo/chặn, công tắc tắt khẩn cấp) và Master Plan v3 §8.

## Kết quả mong muốn

1. Bé A nhìn bé B thấy đúng B đang mặc, đang dắt thú cưng nào, đang cưỡi xe nào; B đổi đồ thì A thấy ngay, không cần vào lại map.
2. Đứng gần người chơi khác, bé bấm nút tương tác (như với NPC) để: vẫy tay, gửi câu có sẵn, mời vào tổ đội, chặn, báo cáo.
3. Tổ đội 2–4 bạn: mời, nhận/từ chối, rời, trưởng đội mời/đuổi/nhường; thấy danh sách đội trên màn hình (tên, map, thú cưng); nhắn câu có sẵn cho cả đội; "đến chỗ bạn"; trưởng đội qua cổng thì đội được hỏi "cùng đi". Tổ đội sống qua nhiều map; bạn máy cũng vào đội được.

## Không làm (ghi rõ)

- Gõ chữ tự do, giọng nói: chỉ câu có sẵn và emote (Master Plan §8).
- Thưởng, XP, mở khóa chung theo đội và co-op quest: Bậc 2 của Master Plan, plan riêng. Phần thưởng vẫn tính theo từng hồ sơ ở server.
- Kết bạn lâu dài, danh sách bạn: plan `261004-1617-parent-area-friends` (kết bạn trong game, người nhận đồng ý, kết bạn được với bạn máy). Menu tương tác ở P2 chừa chỗ cho mục "Kết bạn".

## Điều đã quét được (bằng chứng)

- Máy chủ chuyển nguyên `outfit` mà bé tự gửi (`packages/schema/src/multiplayer.ts`, `apps/server/src/multiplayer/multiplayer-hub.ts`); phía vẽ dùng chung `loadPlayerCharacter` (`remote-player-manager.ts:69`). Chuỗi đồ có đi tới, nên nguyên nhân "không thấy phụ kiện" phải **tái hiện bằng hai máy khách thật** trước khi sửa.
- Chắc chắn thiếu: `pet` có trong presence nhưng `RemotePlayerManager` không vẽ; xe (`vehicle`) bị `dressCharacter` bỏ qua và chỉ `vehicle-ride.ts` mới đặt; không có thông điệp đổi trang phục giữa phiên; `emote`/`chat` chỉ phát chung, không nhắm người; không có khái niệm đội.
- Bot mặc `clothes-dress-pink` và `hat-straw` không có trong danh mục (934 mục), nên hai bạn máy đó thiếu đồ (kiểm bằng `buildAccessoryCatalog`).
- WebSocket **không xác thực**: id là chuỗi ngẫu nhiên, tên/đồ/loài do máy khách tự khai, không kiểm Origin. Tổ đội, chặn, báo cáo cần danh tính thật nên phải sửa chỗ này trước.

## Phase

### P1 — Danh tính và diện mạo do server cấp (M) — xong 05/10/2026

- WS đọc cookie phiên (dùng `readSessionToken` + `findSession`), lấy hồ sơ bé đang chọn; không có phiên thì từ chối (bot đi đường nội bộ, không qua WS). Kiểm `Origin` như `origin-check.ts`.
- `join` không còn mang `displayName/species/outfit/pet`: server đọc từ bảng `characters`. Chống giả mạo trang phục và tên.
- Thêm thông điệp `appearance` (server → khác) khi bé lưu `PUT /character` (hub nhận sự kiện nội bộ, phát cho room đang có bé đó). `presence` thêm `vehicle` (đồ cưỡi đang bật, hoặc null).
- `RemotePlayerManager`: vẽ thú cưng đi theo, vẽ xe, thay đồ tại chỗ khi nhận `appearance` (dùng `dressCharacter`/`undressCharacter`, không dựng lại nhân vật).
- Sửa 2 mã đồ sai của bot.
- Kiểm: test hub (cookie sai bị từ chối, tên/đồ lấy từ DB), test `appearance`, tái hiện hai tab ở `/play` thấy đồ của nhau.

### P2 — Tương tác giữa người chơi (M) — xong 05/10/2026

- Schema: `emote` và `chat` thêm `to` tùy chọn; `interact-request` (mời vẫy, mời đội). Server kiểm cùng room và khoảng cách ≤ ~6 khối.
- Client: người chơi khác vào hệ nhắc "gần nhất" của `object-interaction-manager` (nút tương tác sẵn có), mở menu chủ đề: Vẫy tay, Câu có sẵn, Mời vào đội, Chặn, Báo cáo. Giao diện theo mock cảnh (không cửa sổ trắng).
- Chặn/báo cáo: bảng `player_blocks`, `player_reports`; người bị chặn không còn thấy hay bị thấy trong room; báo cáo vào hàng đợi (chưa có màn kiểm duyệt: ghi rõ ở trang review).
- Công tắc online là cài đặt của chính người chơi, mặc định bật (plan `261004-1617-parent-area-friends` pha 2 làm phần lưu ở server và màn Cài đặt; ở đây hub chỉ cần tôn trọng cờ đó nếu đã có).

### P3 — Tổ đội (L) — xong 05/10/2026

- Server: `PartyService` trong bộ nhớ (id đội, trưởng, thành viên 2–4, lời mời có hạn 60 giây, giới hạn tần suất mời). Đội độc lập với room nên đi qua map vẫn giữ.
- Giao thức: `party-invite`, `party-reply`, `party-leave`, `party-kick`, `party-promote`, `party-state` (danh sách + map + thú cưng), `party-chat` (câu có sẵn), `party-goto` (đến chỗ bạn — cùng map hoặc cổng tới map đó), `party-travel` (trưởng qua cổng, đội được hỏi).
- Bot là thành viên hợp lệ (hub xử lý như người, gắn nhãn "[Bạn máy]"); bot chấp nhận/rời đội theo tính cách — phần hành vi nằm ở B2 của plan bot, ở đây chỉ mở cửa giao thức.
- Client: khung đội ở mép màn hình (tên, chấm màu cùng map, thú cưng), nhắc mời, nhắn đội bằng câu có sẵn, vòng tròn màu/biểu tượng trên đầu bạn cùng đội, chỉ hướng tới bạn đội.
- Kiểm: test `PartyService` (vào/ra/đuổi/nhường/hết hạn/đủ 4), test giao thức; hai tab E2E một ca (chỉ chạy khi được yêu cầu theo quy tắc test của repo).

## Kết quả thi công (05/10/2026)

- P1: WS kiểm cookie phiên + người chơi đang chọn (`findActivePlayer`, chung với route game) và `Origin`; `join` chỉ còn chỗ đứng, server đọc tên/loài/đồ/thú cưng từ `characters`; `appearance` phát khi `PUT /api/character` lưu; người khác thấy mã công khai `p-…`. Thú cưng và xe của người khác đã được vẽ từ trước (bằng chứng trong plan đã cũ), giờ thay đồ, xe, thú cưng tại chỗ (`PlayerCharacter.wear`). Không thêm trường `vehicle`: xe đã nằm trong trang phục do server cấp, cộng cờ `riding`. Hai mã đồ sai của bot đã được sửa trước đó; sửa thêm: bỏ khối bot `khu-rung-bi-mat` (không phải map, trùng mã với `forest-ch1`).
- P2: vẫy tay và câu có sẵn nhắm một người (`to`, cùng room, ≤ 6 khối); không thêm `interact-request` riêng vì mời đội đi bằng `party-invite`. Menu tương tác theo khung 7 của mock, chừa chỗ một dòng cho "Kết bạn". `player_blocks`, `player_reports` (migration `0011`). Cờ online của người chơi chưa có ở server nên hub chưa đọc.
- P3: `PartyService` trong bộ nhớ, giao thức `party-*`, khung đội trong cột HUD trái (chân dung, vương miện trưởng đội, map, thú cưng, mũi tên chỉ hướng bạn cùng map), thẻ mời và thẻ "cùng đi", huy hiệu sao trên tên bạn cùng đội. Bạn máy nhận lời mời sau 1,5 giây.
- Kiểm: test `PartyService`, hub (giả DB), WebSocket thật với PGlite, phiên client với socket giả, UI; E2E `online` hai trình duyệt (thấy đồ, đổi đồ thấy ngay, lập đội, chặn).

## Phụ thuộc và file dùng chung

- Đang có sửa dở ở `game.ts`, `object-interaction-*.ts`, `player-character.ts` (phiên khác, plan `261004-1035-life-expansion`). P1 server/schema không đụng; P1–P3 phía client chỉ vào các file đó **sau khi phiên kia commit**, hoặc thêm module riêng trong `apps/web/src/game/multiplayer/` và chỉ nối vài dòng ở `game.ts`.
- Schema đổi → cập nhật `docs/` mô tả giao thức multiplayer và trang review.

## Tiêu chí nghiệm thu

- Hai tài khoản khác nhau vào cùng map thấy trang phục, thú cưng, xe của nhau; đổi đồ cập nhật không cần vào lại.
- Không client nào giả được tên, loài, đồ của người khác (test từ chối).
- Mời → nhận → cả hai thấy khung đội; đội 4 người từ chối người thứ 5; trưởng rời thì nhường tự động; đi qua map vẫn trong đội.
- Chặn một người: hai bên không thấy nhau; mọi chữ trên đường truyền thuộc danh sách câu có sẵn.
- Gate: `pnpm assets:check`, `content:check`, `test`, `typecheck`, `lint`, build web.

## Câu hỏi mở

1. ~~Mặc định online~~ **Đã chốt (người sở hữu, 05/10/2026, định hướng mọi lứa tuổi): bật mặc định, người chơi tự tắt trong Cài đặt; không cần phụ huynh bật.**
2. Người chơi thật thấy tên bé thật hay biệt danh trong danh sách chọn (`characterNames`)? Hiện đã dùng tên chọn từ danh sách, giữ nguyên.
