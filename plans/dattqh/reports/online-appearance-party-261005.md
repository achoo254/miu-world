# Online: diện mạo, tương tác, tổ đội — report 05/10/2026

Plan: `plans/dattqh/261004-1540-online-appearance-interact-party/plan.md` (P1–P3). Tier L. Trạng thái: xong phần tự động, chờ người duyệt.

## Đã làm

- **Danh tính do server cấp (P1).** WebSocket `/api/ws` chỉ mở với cookie phiên còn hạn, người chơi đang chọn đã đồng ý chính sách và `Origin` trong danh sách cho phép (401/403 khi thiếu). `join` chỉ gửi chỗ đứng; tên, loài, trang phục, thú cưng đọc từ bảng `characters`. Lưu nhân vật (`PUT /api/character`) là người khác thấy đồ mới ngay, thay tại chỗ, không dựng lại nhân vật (thêm `wear()` vào `player-character.ts`; nút "Mặc" ở cửa hàng giờ cũng mặc ngay cho chính bé). Người khác chỉ thấy mã công khai `p-…`, không thấy mã hồ sơ. Một tab mới cùng người chơi thay tab cũ (đóng mã 4001, không nối lại vòng vòng).
- **Tương tác (P2).** Đứng gần người chơi khác, nút Tương tác mở menu chủ đề theo khung 7 của `designs/multiplayer.png`: Vẫy tay, Câu có sẵn (8 câu, đọc theo ngôn ngữ của từng người), Mời vào đội, Chặn (có xác nhận), Báo cáo (lý do chọn sẵn). Bạn máy luôn gắn nhãn và chỉ có các mục thân thiện. Danh sách mục là một mảng, chừa chỗ cho "Kết bạn". Bảng `player_blocks`, `player_reports` (migration `0011`, sinh bằng drizzle-kit).
- **Tổ đội (P3).** `PartyService` trong bộ nhớ: 2–4 người, lời mời hết hạn 60 giây, giới hạn tần suất mời, chỉ trưởng đội mời/đuổi/nhường, trưởng rời thì người vào sớm nhất lên thay, đội sống qua map (mất kết nối giữ chỗ 30 giây). Khung đội trong cột HUD trái (chân dung, vương miện, map, thú cưng, mũi tên chỉ hướng bạn cùng map do game xoay), thẻ mời có thanh thời gian, thẻ "cùng đi" khi trưởng đội qua cổng, "Đến chỗ bạn" (tự đi trên cùng map, hoặc qua cổng sang map của bạn), nhắn đội bằng câu có sẵn, sao trên tên bạn cùng đội. Bạn máy vào đội được (tự nhận lời sau 1,5 giây).
- **Sửa kèm.** Khối bot `khu-rung-bi-mat` (không phải map, trùng mã với `forest-ch1`) bỏ đi để mã bot duy nhất. Trường `action`, chữ bong bóng và chữ chat trước đây là chuỗi tự do trên dây: giờ là danh sách đóng.

## Lệch so với plan (có lý do)

- Không thêm trường `vehicle` vào presence: xe đã nằm trong trang phục do server cấp, cùng cờ `riding` sẵn có; thêm trường là lặp dữ liệu.
- Không thêm `interact-request`: vẫy tay đi bằng `emote` có `to`, mời đội bằng `party-invite`.
- Bằng chứng "không vẽ thú cưng, xe của người khác" trong plan đã cũ (đã có từ trước); việc còn thiếu là đổi đồ giữa phiên và danh tính giả mạo, đã làm.
- Cờ online của người chơi chưa có ở server (plan bạn bè pha 2), nên hub chưa đọc; online vẫn bật mặc định.

## Kiểm tra

- `pnpm assets:check` OK (16 pack, 4596 file); `pnpm content:check` OK (1868 file); `pnpm test` 487 file, 6169 test qua, 1 skip (sẵn có); `pnpm typecheck`, `pnpm lint` sạch; `pnpm --filter @miu/web build` qua (cảnh báo chunk > 500 kB và cảnh báo config loader của Vite đều có từ trước); `pnpm security:dist` OK.
- Test mới: `party-service.test.ts` (11), `multiplayer-hub.test.ts` (18: danh tính, chữ có sẵn, tab thay thế, đổi đồ, chặn, báo cáo, đội 4 người, trưởng rời, qua map, hết grace), `multiplayer-ws.test.ts` (socket thật + PGlite: 401/403, tên/đồ từ DB, `appearance` sau `PUT`, chặn ghi DB), `multiplayer-session.test.ts`, `online.test.tsx`. Test xóa tài khoản đếm thêm hai bảng mới.
- E2E `online` (một lượt, 1 worker, dự án `setup` + `online`): hai tài khoản trong hai context thấy đồ và thú cưng của nhau, đổi đồ thấy ngay, mời → vào đội → cả hai thấy khung đội, chặn → hai bên không thấy nhau. 2 test qua trong 13,7 s.

## Review độc lập

Agent `code-reviewer` trên toàn bộ diff: không có Critical; xác nhận xác thực WS, kiểm `Origin`, không lộ mã hồ sơ, chặn ẩn hai chiều ở mọi room. Đã sửa (commit `fix(multiplayer): …`, có test):

- High: đội chỉ còn bạn máy không giải tán (bạn máy bị giữ tới khi server khởi động lại) → đội không còn người chơi thì giải tán. High: trưởng đội có thể rơi vào bạn máy → luôn trao cho người chơi vào sớm nhất; không nhường cho bạn máy được.
- Medium: thời gian chờ báo cáo mất khi nối lại → giữ ở hub theo cặp người chơi. Phiên bị thu hồi mà WS vẫn mở → kiểm lại phiên mỗi 2 phút, đóng `4401`. Bộ nhớ hub không dọn → bỏ dữ liệu chặn/diện mạo khi người chơi rời hẳn. Client nối lại mãi khi bị từ chối → giãn dần tới 1 phút.
- Low: hai tab chồng nhau thì tab mới nhất vào, tab đóng giữa chừng không đá ai; xóa người chơi khác khỏi cảnh khi tab khác vào thay; lời vẫy/câu nhắm một người không tới người đã chặn người đó; tên trong thông báo không lấy nhầm từ menu; nhãn tương tác cập nhật khi đổi tên; số liệu dev `outfit` cập nhật sau "Mặc".
- Không sửa (ghi lại): theo "Cùng đi" hay "Đến chỗ bạn" sang khu không có bài đang mở thì không có gì xảy ra (màn chơi chọn bài theo khu); câu hỏi sản phẩm bên dưới về Nhà của bé.

E2E `online` chạy một lần trước các sửa này (giới hạn một lượt Playwright của đợt); các sửa sau có test đơn vị, `pnpm test` chạy lại xanh (6178 qua, 1 skip). Hai lần chạy đầy đủ dưới tải có một test không liên quan đỏ thoáng qua (`region-reward-routes` "opens the chest…", `account-routes` "needs the PIN…"), chạy riêng và chạy lại đều xanh.

## Việc của người / còn mở

- **Nhà của bé dùng chung room:** map `nha-cua-be` là một room cho mọi người, nên người lạ có thể xuất hiện trong nhà của bé (có từ trước, nay có thêm vẫy tay và mời). Đề xuất: mỗi người chơi một room nhà riêng, chỉ bạn cùng đội vào được; cần người quyết vì là phạm vi sản phẩm.

- Báo cáo vào hàng đợi nhưng **chưa có màn kiểm duyệt** (ghi ở trang review); trước khi có người ngoài gia đình chơi cần plan `261004-1617-moderation-safety`.
- `player_blocks`, `player_reports` là dữ liệu mới về người chơi (chỉ mã, lý do chọn sẵn, map). Luật repo nói đổi cách thu dữ liệu trẻ thì sửa lời đồng ý/chính sách; plan đã duyệt hai bảng này nhưng lời đồng ý chưa nhắc. Cần người quyết có nâng phiên bản lời đồng ý hay không.
- Xuất dữ liệu tài khoản (`/api/account/export`) chưa gồm danh sách chặn/báo cáo của người chơi (giống `mail` hiện nay).
- Deploy: nginx staging/production đã chuyển tiếp `Upgrade` cho `/api/` và `ALLOWED_ORIGINS` là origin của site (`tools/deploy/*/`), nên WS mới (cần `Origin` + cookie) chạy được sau proxy; migration `0011` chạy khi deploy (cần người cho phép như mọi lần deploy production).
