# Nói chuyện bằng giọng với tổ đội, bạn bè và bạn máy — report 06/10/2026

Plan `plans/dattqh/261005-2335-voice-chat/plan.md` (quyết định Jev đã chốt; người sở hữu cho phép dùng TURN của Cloudflare và deploy khi xong). Tier L, cả 6 pha. Không migration, **không thêm dependency** (WebRTC, Web Audio, đọc giọng đều là API của trình duyệt). Chưa push, chưa deploy.

## Đã làm

- **Báo hiệu ở server** (`apps/server/src/multiplayer/voice-service.ts`, nối trong hub; giao thức `packages/schema/src/voice.ts`). Tin `voice-join`, `voice-leave`, `voice-mic`, `voice-speaking`, `voice-signal` (offer, answer, ICE), `voice-call`, `voice-call-reply`; server gửi `voice-state`, `voice-signal`, `voice-speaking`, `voice-call-invite`, `voice-call-ringing`, `voice-call-end`, `voice-bot-say`. Kênh của tổ đội gồm thành viên đã bấm micro, cộng bạn máy của đội khi có người chơi trong kênh; ngoài tổ đội, gọi một bạn đang online (bạn bè đọc từ DB, người nhận bấm nghe, chuông 30 giây, đang bận thì báo bận). Mỗi tin thiết lập được kiểm lại: hai đầu cùng kênh lúc này, đều là người chơi, không chặn nhau; khác thì bỏ, không báo gì cho người gửi. Giới hạn: tin thiết lập tối đa 16 KB (mọi tin khác vẫn 4 KB), 80 tin và nạp 20 tin/giây mỗi người; "đang nói" 8 tin, nạp 4/giây; gọi cách nhau 3 giây, tối đa 10 lần mỗi 10 phút. Rời hay bị mời khỏi đội, chặn, hết là bạn: ra khỏi kênh ngay; mất kết nối (đổi map) giữ chỗ 30 giây.
- **TURN** (`apps/server/src/voice/`). `GET /api/voice/ice-servers` cho người chơi đang chọn: STUN `stun.cloudflare.com:3478` cộng TURN của Cloudflare với credential 2 giờ server xin bằng `CF_TURN_KEY_ID` / `CF_TURN_API_TOKEN` (giữ 10 phút cho mọi người, bỏ URL cổng 53, không log token hay mã khóa, `Cache-Control: no-store`), 30 lần mỗi 10 phút mỗi người chơi. Thiếu khóa hay Cloudflare lỗi thì chỉ STUN (đợi 1 phút rồi mới hỏi lại). Đã thử API thật bằng khóa trong `access-tokens.json` (chỉ in hình dạng): 1 mục STUN và 1 mục TURN 6 URL, ttl 14400.
- **Client** (`apps/web/src/ui/voice/`). Lưới WebRTC chỉ âm thanh, tối đa 3 kết nối, người có mã công khai nhỏ hơn gửi offer; kết nối hỏng hay 20 giây chưa lên thì tự lập lại (1 s, gấp đôi tới 15 s). Nút 🎙️ ở đầu khung đội (bấm là vào kênh với micro bật; sau đó 🎙️/🔇 bật tắt micro, 📴 rời), nút 📞 Gọi trong danh sách bạn bè (bạn đang chơi, không phải bạn máy), thẻ "… gọi cho bạn", thanh cuộc gọi (người đang nói chuyện, micro, kết thúc, âm lượng). Phát hiện giọng trên máy (RMS, bắt đầu sau 120 ms, dừng sau 700 ms im) hoặc "Bấm giữ để nói" (nút 🎙️ thành nút giữ). Vòng sáng 🔊 cạnh tên trên nhân vật 3D và quanh ảnh trong khung đội; tắt tiếng và âm lượng từng người (Web Audio, chỉ trong lượt chơi); nhạc nền nhỏ lại khi người khác nói. Micro tắt tới khi bấm, tắt khi ẩn tab, nhả hẳn khi ra khỏi kênh, rời đội, bị chặn hay hết cuộc gọi; trang tải lại thì không tự mở lại. iPad Safari: âm thanh đánh thức ngay trong cú chạm, `playsinline`, phát qua Web Audio (âm lượng phần tử `audio` không đổi được trên iOS). Công tắc dev `?voiceRelay` buộc đi qua TURN.
- **Bạn máy nói.** Server chọn một bạn máy của đội chào khi có người vào kênh, và đáp một câu sau khi người chơi ngừng nói: câu theo độ dài lượt nói (ngắn: "Ừ!", vài câu: "Ý hay đấy!", dài: "Kể tiếp đi…"), đợi lượt (người chơi nói lại thì thôi), cách nhau ít nhất 4 giây, luân phiên bạn máy, nói nhiều hay ít theo tính cách, câu không lặp liền (`freshPicker`), kèm emote. Mỗi người chơi đọc câu bằng giọng trên máy (`speakVoiceLine`, chỉ giọng `localService`), cao độ và tốc độ từ tính cách (`botVoice`), hai bạn máy trong kênh luôn khác giọng (`distinctVoices`); vòng sáng và âm lượng riêng như người chơi; chữ hiện trong bong bóng trên bạn máy. Lúc máy đang đọc lời bạn máy, phát hiện giọng tạm nghỉ để bạn máy không "nghe" chính mình qua loa. Không chuyển lời người chơi thành chữ.
- **Cài đặt và quyền riêng tư.** Nhóm "Nói chuyện bằng giọng" (song ngữ): bật/tắt (tắt thì không có nút micro, cuộc gọi tới tự từ chối), bấm giữ để nói, âm lượng giọng nói; lưu trên máy. Trang `/privacy` thêm: giọng đi thẳng giữa trình duyệt (đã mã hóa) hoặc qua trạm chuyển tiếp của Cloudflare, không ghi, không lưu, không chuyển thành chữ; khi nối thẳng các trình duyệt biết IP của nhau; Cloudflare ở mục "Ai khác tham gia". Lời đồng ý giữ v3 (Jev).
- **deploy.sh.** `setup()` ghi thêm `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN` từ mục `rtc.live.cloudflare.com (TURN)`; lệnh con mới `turn` chỉ thay hai dòng đó trong `/etc/miu/production.env` (giữ mọi dòng khác, chạy lại được, giá trị qua ssh stdin, thiếu mục thì dừng chứ không ghi dòng rỗng). Server coi dòng rỗng là chưa đặt. Không chạy lệnh nào lên máy chủ.
- **Tài liệu.** `docs/system-architecture.md` (ranh giới "Nói chuyện bằng giọng" và sổ quyết định), `docs/deployment-guide.md` (đường lấy credential TURN, lệnh `turn`, không có giá trị), `docs/project-roadmap.md`, trang review `apps/web/review.html` (mục `review-voice`, dependency).

## Kiểm tra (máy dev, một job nặng một lúc, bộ nhớ trống 61–64%)

- `pnpm assets:check` OK (16 pack, 4626 file); `pnpm content:check` OK (2022 file).
- `pnpm test --maxWorkers=2` (lượt cuối, sau khi sửa theo review): 534 file qua, 1 bỏ qua (symlink Windows, có từ trước); 6554 test qua, 1 bỏ qua, 0 hỏng.
- `pnpm typecheck` 0 lỗi; `pnpm lint` 0 lỗi, 0 cảnh báo.
- `pnpm --filter @miu/web build` OK (hai cảnh báo có từ trước: cấu hình Vite `configLoader: 'native'` và chunk > 500 kB); `pnpm security:dist` OK.
- E2E `e2e:smoke`: 14/14 qua (53,6 s). `--project setup --project online --project coop --project voice` với khóa TURN thật trong env (không in; đã kiểm log không chứa token): 8/8 qua, kể cả lượt buộc đi qua TURN (`relay: true`, âm thanh chạy hai chiều). Không có khóa trong env thì lượt TURN tự bỏ qua (CI).
- Lượt chạy đầu của `coop` hỏng vì hàng nút voice mới làm khung đội cao thêm, đẩy thẻ "Chơi cùng" ra ngoài màn hình; đã chuyển nút voice lên đầu khung đội (khung không cao thêm), chạy lại qua.
- Test mới: `voice-service.test.ts` (người ngoài đội và đội khác không nhận gì, người bị chặn không nhận, người thứ ba không nhận cuộc gọi hộ, rời/bị mời khỏi đội, giới hạn tần suất và kích thước, giữ chỗ khi đổi map, gọi bạn: đổ chuông, nghe, từ chối, hết giờ, bận, hết là bạn, chặn), `bot-voice.test.ts` (chào, đợi lượt, không nói chen, câu mới theo giọng, khác giọng), `voice-routes.test.ts` (đăng nhập, không có người chơi, giới hạn, STUN khi thiếu khóa, Cloudflare lỗi thì STUN và không log token), `config.test.ts`, `voice-manager.test.ts` và `voice-controls.test.tsx` (micro tắt tới khi bấm, bật/tắt, ẩn tab, bấm giữ để nói, bị từ chối micro, trang tải lại không tự mở, offer/answer, relay, vòng sáng, lời bạn máy theo giọng và âm lượng, cuộc gọi, cài đặt), `multiplayer-session.test.ts`, E2E `voice.spec.ts` (micro giả của Chromium đọc một "giọng" sinh lúc chạy, `e2e/fake-voice.ts`; tiếng bíp mặc định quá ngắn để tính là đang nói).

## Review độc lập (code-reviewer) và cách xử lý

Không có lỗi Critical; kiểm soát ai nghe ai (người lạ, người bị chặn, giả mạo người nhận) reviewer xác nhận đúng. Đã sửa hết trừ một mục cần người sở hữu quyết:

- **H1** Hủy cuộc gọi khi đang ở kênh đội làm server giữ "bóng ma" trong kênh đội: thêm tin `voice-hangup` (chỉ kết thúc cuộc gọi), `voice-leave` nay ra khỏi cả cuộc gọi lẫn kênh đội; test mới.
- **H2** Micro có thể bị giữ khi rời, đóng màn hay cuộc gọi kết thúc trong lúc trình duyệt đang hỏi quyền, hoặc khi bấm hai lần: một yêu cầu micro một lúc, bộ đếm thế hệ; xong lượt hỏi mà kênh đã mất thì trả micro ngay; test mới.
- **M1** Gọi quá nhanh bị bỏ im lặng, chuông đổ mãi: server trả `failed`; client tự thôi đổ chuông sau hạn + 5 s và trả micro.
- **M2** Cuộc gọi được nghe khi tab đang ẩn thì micro bật: không bao giờ bật khi ẩn, và client luôn báo server micro thật sự.
- **M3** Đọc JSON trước khi giới hạn: thùng giới hạn chạy trước khi đọc tin (tin thiết lập nhận theo phần đầu, có thùng riêng ở hub).
- **M4** iPad Safari: âm thanh bị dừng (ẩn tab, Siri, cuộc gọi) nay chạy lại khi quay lại tab hoặc chạm bất kỳ; khi chưa chạy lại thì phát qua phần tử `audio`. Vẫn cần thử máy thật.
- **Low:** lỗi của kết nối cũ không còn hạ kết nối mới; đồng ý nghe thì server đọc lại quan hệ bạn bè; giải phóng nút Web Audio của micro; dọn hẹn giờ của bạn máy khi xóa bộ nhớ; `deploy.sh turn` không bao giờ làm rỗng file env (kiểm file có, mã lỗi `grep`, xóa file tạm, giá trị rỗng thì dừng), `setup` đọc khóa TURN trước khi ghi file env; credential TURN rút còn 2 giờ và xin lại khi kết nối phải lập lại.
- **Cần người sở hữu (L8):** kênh đội nối thẳng nên trình duyệt của các thành viên biết IP công khai của nhau, kể cả thành viên chưa là bạn bè. Theo quyết định Jev (nối thẳng, TURN dự phòng) và đã ghi ở `/privacy`. Phương án: (A, đang dùng) giữ như vậy; (B) buộc qua TURN với thành viên không phải bạn bè, giấu IP, tốn băng thông TURN. Đề xuất: giữ A cho tới khi có người ngoài gia đình chơi (hiện chỉ người sở hữu và bé chơi), rồi chuyển B cùng đợt kiểm duyệt.
- Không đổi: phát hiện bạn máy bằng tiền tố `bot-` và đồng hồ `Date.now()` trong bot runner, như phần còn lại của file.

## Commit (trên `main`, chưa push)

`c89353f6` báo hiệu server; `89eebdb2` TURN; `cffdc298` bạn máy nói; `970416f2` deploy.sh; `1c5fb860` web; `bd6acba9` trang quyền riêng tư; `bf043b4f` E2E; `153abeb0` nút voice ở đầu khung đội; `3f84561a` tài liệu, roadmap, trang review; `517b447f`, `85e798ea`, `bb8787a9` sửa theo review.

## Trước khi deploy

Chạy theo thứ tự (hỏi người trước như mọi lần ở production; người sở hữu đã cho phép plan này):

1. `tools/deploy/production/deploy.sh turn` — ghi hai dòng `CF_TURN_*` vào `/etc/miu/production.env` trên .65 (in `TURN lines in env file: 2`).
2. `tools/deploy/production/deploy.sh release`.
3. Kiểm: đăng nhập rồi mở `https://miu.hoandat.com/api/voice/ice-servers`, phải có một mục `turn:`; `journalctl --namespace=miu -u miu-server` không có `voice relay credentials failed`.

## Ghi chú và việc của người

- Thử trên iPad Safari thật chưa làm được trong phiên (máy dev chỉ có Chromium): việc của người, cùng đợt DEVICE-01. Điểm nên nghe: tiếng có ra loa ngoài không khi micro đang bật, giọng bạn máy có lọt vào micro không.
- Staging chưa có khóa TURN: voice ở staging chỉ dùng STUN.
- Mức tắt tiếng, âm lượng từng người chỉ giữ trong lượt chơi (mã công khai đổi mỗi lần server khởi động).
