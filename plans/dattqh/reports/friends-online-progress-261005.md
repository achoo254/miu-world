# Tiến bộ học, kết bạn, công tắc online, nhà riêng — report 05/10/2026

Plan: `plans/dattqh/261004-1617-parent-area-friends/plan.md` (pha 1–6, bản thiết kế lại 05/10). Tier L. Trạng thái: xong phần tự động, chờ người duyệt và deploy.

## Đã làm

- **Tiến bộ học (pha 1).** `GET /api/learning-progress` (người chơi, trong Hồ sơ) và `GET /api/players/:id/learning-progress` (chủ tài khoản, sau cổng PIN): môn và số bài, 3 kỹ năng giỏi nhất, 3 kỹ năng cần luyện, 3 bài gợi ý (bài mới cho kỹ năng yếu, rồi bài chưa đủ 3 sao), thời gian chơi 4 tuần, chỉ số đếm. Thời gian chơi: màn chơi báo mỗi phút đang chơi (`POST /api/play-time`), server cộng vào một tổng mỗi tuần (`play_time`), hai lần báo cách nhau dưới 30 giây chỉ tính một.
- **Công tắc online và bạn máy (pha 2).** Cột `online_enabled`, `bots_enabled` (mặc định bật). Người chơi đổi trong Cài đặt; chủ tài khoản đổi cho từng người chơi ở Quản lý tài khoản. Tắt online: không vào được phòng, đang trong phòng bị đưa ra ngay (đóng `4403`, rời đội), bật lại là nối lại ngay. Tắt bạn máy: bạn máy biến mất/hiện lại ngay. Công tắc cũ trên máy (`miu.bots.enabled`) chuyển lên server một lần rồi bỏ.
- **Kết bạn (pha 3).** Không mã: chạm người chơi khác → "Kết bạn", hoặc chọn trong tab "Cùng phòng" của danh sách bạn; người nhận thấy thẻ "… muốn kết bạn với bạn" (Đồng ý/Từ chối) hoặc trả lời sau trong tab Lời mời. Hai bên cùng mời là thành bạn ngay. Giới hạn: 50 bạn, 20 lời mời đang chờ, 10 lời mời mỗi 10 phút, cùng một người không mời lại trong 10 phút. Bạn máy: trả lời sau 2–4 giây (phần lớn đồng ý), tự mời người chơi gặp lại nhiều lần, hay đi tới chỗ bạn của nó, luôn gắn nhãn. Bạn bè thấy nhau đang online ở đâu và "Đến chỗ bạn".
- **Chặn, xóa bạn, chủ tài khoản (pha 4).** Tab Đã chặn với Bỏ chặn (hai bên thấy lại nhau ngay nếu cùng phòng), xóa bạn (hai chiều), hủy lời mời. Chặn là hết quan hệ bạn và lời mời. Chủ tài khoản xem danh sách, xóa bạn, bỏ chặn cho từng người chơi; không trả lời lời mời thay người chơi.
- **Quyền riêng tư, xuất dữ liệu (pha 5).** Trang quyền riêng tư có mục "Khi chơi online" (người khác thấy gì, không chat tự gõ, bạn bè, nhà riêng, bạn máy, công tắc) và các dòng mới ở "Chúng tôi lưu gì" (thời gian chơi theo tuần, thư, công tắc, bạn bè, chặn, báo cáo). "Tải dữ liệu của tôi" thêm công tắc, thời gian chơi, thư, bạn bè, lời mời, chặn, báo cáo đã gửi; người khác chỉ hiện bằng tên nhân vật. Lời đồng ý giữ v3 theo quyết định đã ghi (Jev 0.89); trang ghi rõ phần mới sẽ vào lần nâng lời đồng ý tới.
- **Nhà riêng (pha 6).** Map Nhà của bé là room riêng của từng người chơi; vào nhà người khác khi là bạn hoặc cùng tổ đội và không chặn nhau, người lạ xin vào thì về nhà mình. "Đến chỗ bạn" và "Cùng đi" vào đúng nhà. Mỗi nhà có bạn máy hàng xóm khi có người, thêm tối đa hai bạn máy là bạn của chủ nhà ghé chơi.

## Lệch so với plan (có lý do)

- Thời gian chơi là dữ liệu mới (một tổng mỗi tuần, giữ 8 tuần): chưa có nguồn nào đo được; người sở hữu đã chốt "chỉ xem thời gian chơi". Ghi ở trang quyền riêng tư.
- Khách vào nhà bạn thấy nhà theo cách trang trí của chính mình (client dựng map theo hồ sơ của người đang chơi); chỉ room (ai gặp ai) là của chủ nhà.
- Đường dẫn tiến bộ học là `/learning-progress` vì `/progress` đã là cấp, Xu của người chơi.

## Kiểm tra

- Gate sau các sửa của review: `pnpm assets:check` OK (16 pack, 4596 file); `pnpm content:check` OK (1868 file); `pnpm test` 497 file, 6256 test qua, 1 skip (sẵn có); `pnpm typecheck` sạch; `pnpm lint` sạch (0 warning); `pnpm --filter @miu/web build` qua (chỉ cảnh báo chunk > 500 kB và cảnh báo config loader của Vite, đều có từ trước); `pnpm security:dist` OK.
- Test mới: `progress-routes.test.ts` (luật mạnh/yếu/gợi ý, tuần theo giờ Việt Nam, IDOR, cổng PIN, thời gian chơi không cộng trùng), `player-settings-routes.test.ts`, `friend-routes.test.ts` (lời mời, hai bên cùng mời, từ chối, hủy, giới hạn 50/20, chặn xóa quan hệ, bạn máy gắn nhãn, không trường nhận dạng, IDOR mọi route của người chơi và của chủ tài khoản), `hub-settings.test.ts`, `hub-friends.test.ts`, `hub-homes.test.ts` (nhà riêng, khách bị đưa về khi hết là bạn/rời đội, bạn máy theo nhà), web `progress-panel`, `account-players-panel`, `online-setting`, `friends-panel` và thêm vào `multiplayer-session.test.ts`. Test xóa tài khoản và xuất dữ liệu đếm thêm các bảng mới.
- E2E một lượt, 1 worker (`setup`, `online`, `account`, `home`): 14/14 qua trong 35,6 s; `online` có thêm bước hai người kết bạn (B mời trên menu, A đồng ý trên thẻ, hai danh sách bạn thấy nhau). Lượt này chạy trước các sửa của review; các sửa có test đơn vị và `pnpm test` chạy lại xanh.

## Review độc lập

Agent `code-reviewer` trên toàn bộ diff: không có Critical. Đã sửa (commit `fix(friends): …`, có test):

- High: chặn và câu trả lời lời mời không khóa cùng nhau, nên một cặp vừa chặn có thể thành bạn → chặn, xóa quan hệ và lời mời trong một transaction cùng khóa hàng người chơi; câu trả lời đọc lại lời mời sau khi khóa; danh sách bạn không bao giờ cho thấy người đã chặn đang online. High: cùng một mã bạn máy đứng ở nhiều nhà (vị trí, "Đến chỗ bạn", tổ đội nhầm) → bạn máy trong nhà là bản riêng `<bạn máy>@<chủ nhà>`.
- Medium: quyền vào nhà chỉ xét lúc vào → khách hết là bạn, rời/bị mời khỏi đội, bị chặn thì về nhà mình ngay. Tắt online lúc kết nối đang mở dở bị bỏ qua → hub nhớ người chơi đã tắt. Ba câu ở trang quyền riêng tư chưa khớp code (chỗ đứng gửi khi "Đến chỗ bạn", thời điểm lần cộng thời gian chơi, tắt online vẫn thấy bạn bè online) → sửa chữ, file xuất có thêm thời điểm đó, tắt online thì danh sách bạn không cho thấy ai online.
- Low: thời gian chơi báo mỗi 30 giây bị cộng gấp đôi → mỗi lần cộng không quá thời gian từ lần trước; tập "đã mời" của bạn máy không giới hạn → có giới hạn; thẻ lời mời còn sau khi trả lời trong danh sách → bỏ; công tắc cũ trên máy bị xóa trước khi lưu lên server → xóa sau; lượt "Đến chỗ bạn" không xảy ra để lại kế hoạch vào nhà → hết hạn sau 60 giây; thêm test IDOR cho trả lời, hủy, xóa bạn, bỏ chặn bởi tài khoản khác.
- Không sửa (ghi lại): `goto`/vào nhà hỏi cơ sở dữ liệu mỗi lần (giới hạn bởi 20 tin/giây của kết nối, đủ ở quy mô hiện tại); công tắc của người chơi trong bộ nhớ trang không xóa khi đổi người chơi (đọc lại khi mở Cài đặt); khách vẫn nghĩ mình ở nhà bạn sau khi server từ chối (server đưa về nhà mình, lần nối lại bị từ chối lần nữa).

## Việc của người / còn mở

- Deploy: migration `0012_play-time`, `0013_player-online-settings`, `0014_friends` (sao lưu cơ sở dữ liệu trước; cần người cho phép như mọi lần deploy production).
- Lời đồng ý: bạn bè, chặn, báo cáo, thời gian chơi theo tuần đang ở trang quyền riêng tư, chưa trong lời đồng ý (v3). Nâng lời đồng ý ở lần tới là quyết định của người.
- Kết bạn mở cho mọi người chơi online; báo cáo vẫn chưa có màn kiểm duyệt (plan `261004-1617-moderation-safety`). Hiện chỉ người sở hữu và bé chơi.
- Chủ tài khoản tắt online cho người chơi phụ thì người chơi đó vẫn tự bật lại được trong Cài đặt (đúng quyết định "cài đặt của người chơi", không đặt tính năng sau phụ huynh); nếu muốn chủ tài khoản khóa hẳn thì cần người quyết.
- Đoạn cuối trang quyền riêng tư đổi lời hứa cũ "đổi cách thu dữ liệu thì hỏi đồng ý lại" thành "thay đổi lớn mới hỏi lại; bạn bè, chặn, báo cáo, thời gian chơi vào lần nâng lời đồng ý tới" để đúng với quyết định giữ v3. Luật repo yêu cầu nâng phiên bản khi thêm dữ liệu trẻ: cần người sở hữu xác nhận rõ.
