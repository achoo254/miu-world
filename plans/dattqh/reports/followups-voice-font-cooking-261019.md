# Followups 19/10/2026: voice relay cho người lạ, ngừng phục vụ font HP001, nấu ăn an toàn khi gọi đồng thời

Trạng thái: xong, chưa commit (theo yêu cầu). Cỡ việc: M.

## 1. Voice: người lạ trong đội chỉ nối qua TURN

- `packages/schema/src/voice.ts`: `VoiceMember.friend: boolean` (bắt buộc). Server tính; `false` với chính mình, với bạn máy, và với người chơi khi DB chưa trả lời.
- `apps/server/src/multiplayer/voice-service.ts`: bộ nhớ đệm quan hệ bạn theo cặp (`friendships`, chỉ chứa câu trả lời DB đã xác nhận) và câu hỏi đang chờ theo cặp (`asking`, mã tăng dần).
  - Hỏi DB (`areFriends`) cho mọi cặp người chơi trong kênh đội mỗi khi có người `voice-join`; có câu trả lời `true` thì đẩy lại `voice-state` cho đội.
  - `befriended(a, b)` (mới; hub gọi khi `request` trả `befriended` và khi `friend-answered` được chấp nhận, kể cả link mời): bỏ câu trả lời cũ, hỏi lại DB, không bao giờ tin trước.
  - `unfriended(a, b)`: kết thúc cuộc gọi như trước, hủy câu hỏi đang chờ, đặt `false` ngay, đẩy lại state.
  - Câu trả lời về muộn sau khi kết bạn/hết bạn thì bị bỏ (mã câu hỏi không khớp); DB lỗi thì giữ "không phải bạn", lần vào kênh sau hỏi lại. Ra khỏi kênh (`drop`) thì xóa mọi cặp của người đó.
  - Cuộc gọi: người kia luôn `friend: true` (cuộc gọi chỉ bắt đầu sau khi DB xác nhận là bạn ở bước nghe máy, và kết thúc khi hết là bạn).
- `apps/server/src/multiplayer/multiplayer-hub.ts`: gọi `voice.befriended` ở hai chỗ nêu trên.
- `apps/web/src/ui/voice/peer-mesh.ts`: `sync(self, targets: MeshTarget[])` với `{ id, relay }`; mỗi kết nối tạo với `iceTransportPolicy` riêng (`relay` hoặc `all`), kể cả kết nối trả lời offer. Đổi quy tắc relay của một người (kết bạn/hết bạn) thì đóng và lập lại kết nối đó. `setConfig` chỉ còn mang danh sách ICE server.
- `apps/web/src/ui/voice/voice-manager.ts`: `relay = ?voiceRelay || !friend`; không có URL `turn:`/`turns:` trong ICE servers (khi server không có khóa TURN hoặc khi dùng STUN dự phòng) thì không nối với người không phải bạn, offer của họ cũng bị bỏ qua (không lỗi). Nếu TURN có thêm hoặc mất đi khi tải lại ICE thì đồng bộ lại danh sách kết nối. Quy tắc này do client của chính mình áp dụng, client bên kia làm gì cũng không ảnh hưởng.
- Docs: `docs/system-architecture.md` (dòng "Nói chuyện bằng giọng").

## 2. Font HP001: không phục vụ cho ai

- `apps/server/src/worksheet/worksheet-routes.ts`: `GET /api/worksheets/fonts/:file` luôn trả 404 `font-not-found`, kể cả khi chưa đăng nhập và kể cả khi tệp có trên máy. Đã bỏ `fontDir`, `HANDWRITING_FONT_FILES`, `config.handwritingFontDir` và biến env `HANDWRITING_FONT_DIR` (env schema là `z.object`, khóa thừa bị bỏ qua, nên dòng `HANDWRITING_FONT_DIR` còn trong env production không làm server lỗi khi khởi động).
- Web không cần sửa logic: `useModelHand` thấy `document.fonts.load` bị từ chối khi gặp 404, nên phiếu in không có chữ mẫu (test `worksheets-screen.test.tsx` đã có trường hợp này). Chỉ sửa comment trong `oli.tsx` và `worksheets.css`.
- `apps/web/e2e/worksheets.spec.ts`: bỏ nhánh `MODEL_HAND` (nhánh này sẽ đỏ trên máy dev có font) và thay bằng kiểm `.oli-model` = 0. Chưa chạy E2E (đúng yêu cầu).
- `docs/deployment-guide.md` (dòng 81 và 148): font không được phục vụ, production không cần nữa, `deploy.sh fonts` giữ lại nhưng không dùng. Comment trong `tools/deploy/production/deploy.sh` cũng ghi là không dùng; lệnh vẫn giữ nguyên.

## 3. Nấu ăn: an toàn khi gọi đồng thời

- `apps/server/src/cooking/cooking-routes.ts`: vẫn nấu miễn phí như cũ. Việc trừ nguyên liệu và cộng món nằm trong một `db.transaction`, có `lockChild` (khóa dòng `child_profiles`, export từ `shop-routes.ts`). Trừ nguyên liệu bằng `greatest(qty - n, 0)` khi `qty > 0`, đúng hành vi cũ `min(qty, n)`: chỉ trừ trong `shop_inventory`, không đụng `inventory_items`. Món nấu được upsert bằng `onConflictDoUpdate qty + n`. Nguyên liệu xử lý theo thứ tự id. Response giữ nguyên.
- Test mới: 12 lần nấu đồng thời. Kết quả: 12 món, nguyên liệu về 0, không âm.

## Kiểm tra đã chạy

| Lệnh | Kết quả |
|---|---|
| `pnpm vitest run apps/server/src/multiplayer/voice-service.test.ts` | 22/22 (4 test mới về `friend`) |
| `pnpm vitest run apps/web/src/ui/voice/voice-manager.test.ts` | 25/25 (3 test mới: bạn → `all`, người lạ → `relay` cả khi trả lời offer; đổi quan hệ thì lập lại kết nối; không có TURN thì không có peer với người lạ) |
| `pnpm vitest run apps/server/src/worksheet/worksheet-routes.test.ts` | 4/4 |
| `pnpm vitest run apps/server/src/cooking/cooking-routes.test.ts` | 4/4 (1 test mới) |
| Chạy chung 9 file đã đụng hoặc liên quan (thêm `voice-controls`, `bot-voice`, `hub-friends`, `worksheets-screen`, `config`) | 97/97 |
| `pnpm typecheck` | sạch, 0 lỗi |
| `pnpm lint` (`eslint --max-warnings=0`) | sạch, 0 cảnh báo |
| `pnpm --filter @miu/web build` | build xong; chỉ có cảnh báo chunk size và cảnh báo vite config native, cả hai đã có từ trước |

Không chạy: E2E, cả bộ test, `assets:check`, `content:check` (không đụng asset hay nội dung).

## Rủi ro còn lại

- Test nấu đồng thời không làm lộ lỗi của code cũ: chạy với route cũ thì vẫn qua, kể cả khi tăng lên 40 lần nấu. Harness PGlite trong bộ nhớ xếp các request lần lượt, nên test này chỉ là lưới chặn hồi quy. Độ an toàn đến từ cách viết (transaction, khóa dòng, cập nhật bằng SQL), chưa có phép thử đỏ/xanh nào trên Postgres thật chứng minh.
- Lúc mới vào kênh đội, hai người là bạn sẽ nối qua relay trước (khi có TURN), rồi lập lại kết nối thẳng khi DB trả lời, thường trong vài chục ms. Nếu không có TURN, họ chỉ nối sau khi có câu trả lời.
- Kết bạn hay hết bạn qua đường không phát `PlayerEvents` (hiện chưa thấy đường nào như vậy) sẽ chỉ cập nhật ở lần vào kênh sau. Riêng hướng nguy hiểm (đang là bạn thành hết bạn) thì luôn có sự kiện `unfriended`.
- `friend` là trường bắt buộc trong schema strict. Tab đang mở bản web cũ sẽ không đọc được `voice-state` mới cho tới khi tải lại trang, nên voice của tab đó dừng tạm thời, giống mọi lần đổi giao thức trước.
- Chính sách quyền riêng tư (`content/legal/privacy-vi.json`) vẫn đúng ("khi nối thẳng… biết IP của nhau") nhưng chưa nói rằng giờ chỉ bạn bè mới nối thẳng. Muốn sửa câu chữ thì phải nâng phiên bản chính sách, việc này cần người quyết, nên chưa đụng.
- Production: dòng `HANDWRITING_FONT_DIR` và thư mục `/opt/miu/fonts` trên máy chủ vẫn còn nhưng không được đọc nữa. Dọn hay không là việc của người, cần hỏi trước khi làm trên production.
