---
title: "Nói chuyện bằng giọng với bạn bè, tổ đội và bạn máy"
description: "Voice giữa bạn bè và trong tổ đội qua WebRTC, bạn máy nói bằng giọng riêng theo tính cách; không ghi âm, không lưu."
status: pending
priority: P1
tier: L
branch: main
tags: [web, server, multiplayer]
created: 2026-10-05
---

# Nói chuyện bằng giọng với bạn bè, tổ đội và bạn máy

**Trạng thái:** xong phần tự động cả 6 pha (06/10/2026), mọi gate và E2E liên quan xanh, kể cả lượt buộc đi qua TURN thật; chưa deploy (không có migration; trước `release` chạy `tools/deploy/production/deploy.sh turn` để ghi khóa TURN vào env production; người sở hữu đã cho phép deploy, 05/10/2026); report `plans/dattqh/reports/voice-chat-261006.md` · **Tier:** L
**Nguồn:** người sở hữu (05/10/2026): "khi kết bạn và tổ đội có thể voice được với nhau. bot máy voice được". Thay cho dòng "không chat tự do" của Master Plan §9 theo định hướng mọi lứa tuổi (`.claude/rules/product-audience.md`). Quyết định: Jev (`reports/jev-261005-2335-voice-{input,output}.json`).

## Hiện trạng (05/10/2026)

- Chỉ có câu có sẵn và emote; chặn và báo cáo đã có; tổ đội 2–4 (`party-service.ts`), bạn bè xin và nhận.
- Đọc to bằng giọng tổng hợp trên máy (`apps/web/src/ui/dialogue/speech.ts`, không dùng giọng gửi lên máy chủ hãng); bước nói có ghi âm trên máy, không gửi, không lưu (`use-voice-recorder.ts`).
- Production nằm sau Cloudflare trên máy dùng chung, IP gốc ẩn, chỉ mở HTTPS/WebSocket.

## Quyết định (Jev, 05/10/2026)

| Câu | Chọn | Độ tin |
| --- | --- | --- |
| Ai nghe ai | Trong tổ đội: một kênh voice chung; ngoài tổ đội: gọi voice một bạn trong danh sách bạn bè (bạn nhận mới nối); không bao giờ với người lạ hay người đứng gần không phải bạn | 0.99 |
| Micro | Tắt đến khi người chơi bấm nút micro; sau đó mở micro theo phát hiện giọng, có "bấm giữ để nói" trong cài đặt; vòng sáng khi đang nói trên nhân vật và khung đội; tắt tiếng và âm lượng từng người; chặn ai thì cắt voice hai chiều; không bao giờ ghi âm, không lưu | 0.99 |
| Bạn máy | Nói lời của mình bằng giọng tổng hợp trên máy, mỗi bạn máy một cao độ/tốc độ theo tính cách (plan co-op, mục bạn máy); khi người chơi nói thì phản ứng (đợi lượt, câu ngắn hợp lúc, emote), không chuyển lời người chơi thành chữ | 0.97 |
| Đường truyền | WebRTC nối thẳng giữa tối đa 4 người, báo hiệu qua WebSocket của game; STUN miễn phí của Cloudflare; TURN của Cloudflare làm đường dự phòng (gói miễn phí dư so với nhu cầu); IP gốc vẫn ẩn, không mở cổng mới | 0.99 (Jev đánh dấu cần người xem: cần người sở hữu tạo khóa TURN) |
| Lời đồng ý | Giữ v3; trang quyền riêng tư thêm dòng: giọng đi thẳng giữa người chơi (hoặc qua trạm chuyển tiếp), game không ghi và không lưu | 0.71 |

## Khóa TURN (05/10/2026)

Người sở hữu cho phép tạo khóa trong tài khoản Cloudflare của họ. Đã tạo khóa TURN `miu-world-voice` bằng API; mã khóa và token nằm trong `access-tokens.json` trong iCloud (mục `rtc.live.cloudflare.com (TURN)`, cùng chỗ các credential khác, `docs/STAG-DEV-README.md` §3), không vào repo. Đã thử xin credential ngắn hạn (`generate-ice-servers`, ttl 300): trả 2 mục ICE (STUN, TURN). Lúc deploy thêm hai biến vào file env production ngoài repo; ghi đường lấy credential vào `docs/deployment-guide.md`.

## Pha

| Pha | Tier | Nội dung |
| --- | --- | --- |
| 1 | M | Báo hiệu ở server: thông điệp `voice-*` (offer/answer/ice, bật/tắt micro, đang nói) chỉ chuyển giữa thành viên cùng đội hoặc hai bạn đang gọi; kiểm quyền mỗi thông điệp, giới hạn kích thước và tần suất; chặn thì không chuyển; gọi bạn: mời, nhận, từ chối, hết giờ |
| 2 | M | Cấp thông tin TURN ngắn hạn: server xin credential từ API TURN của Cloudflare bằng khóa trong file env ngoài repo, trả cho client đã đăng nhập, không ghi log; thiếu khóa thì chỉ dùng STUN |
| 3 | L | Client: lưới WebRTC tối đa 3 kết nối, nút micro trong khung đội và danh sách bạn bè, phát hiện giọng, bấm giữ để nói, vòng sáng khi nói, tắt tiếng/âm lượng từng người, nhạc nền nhỏ lại khi có người nói; mất kết nối tự nối lại; rời đội hay ẩn tab thì tắt micro; chạy được trên iPad Safari |
| 4 | M | Bạn máy nói: lời của bạn máy đọc bằng giọng trên máy theo tính cách (cao độ, tốc độ), phát như một người trong kênh (vòng sáng, âm lượng riêng); phản ứng khi người chơi nói theo phát hiện giọng; lời không lặp (`freshPicker`) |
| 5 | S | Cài đặt và trang quyền riêng tư (song ngữ): bật/tắt voice, bấm giữ để nói, âm lượng voice; dòng quyền riêng tư |
| 6 | S | Kiểm tra: unit test báo hiệu (người ngoài đội không nhận, bị chặn không nhận, IDOR), test UI micro và tắt tiếng, E2E hai tab nối voice bằng micro giả của Chromium; tài liệu `docs/system-architecture.md`, trang review (không thêm dependency) |

## Không làm

- Không ghi âm, không lưu, không chuyển lời người chơi thành chữ ở bất kỳ đâu.
- Không voice với người lạ, không voice theo khoảng cách.
- Không tự dựng TURN trên máy production dùng chung (lộ IP gốc, mở cổng).

## Tiêu chí xong

- Hai người trong một đội nghe nhau qua mạng thường và khi buộc đi qua TURN; người bị chặn không nghe được.
- Bạn máy trong đội nói bằng giọng riêng, hai bạn máy khác giọng.
- Gate 5 lệnh, build web, `security:dist`, E2E liên quan; deploy production khi người sở hữu cho phép.
