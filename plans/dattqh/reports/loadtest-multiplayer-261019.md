# Đo tải hub online (pha 6 moderation-safety)

Ngày: 19/10/2026. Plan: `plans/dattqh/261004-1617-moderation-safety/plan.md` (pha 6). Công cụ: `pnpm loadtest` (`tools/loadtest/`). Đây là số đo trên máy dev, với server local; không đo trên production.

## Kết luận

- Một room trên máy dev chịu tốt tới 100 người chơi cùng 24 bạn máy (chưa có lỗi, độ trễ phát cảm xúc p95 18 ms, trễ vòng lặp server p99 tệ nhất 41,5 ms). Ở 125 người thì đã xuống cấp (trễ vòng lặp p99 189 ms).
- Toàn server, khi rải người chơi trên 10 map có bạn máy (108 bạn máy đều chạy): 300 người ổn (trễ vòng lặp p99 tệ nhất 29,5 ms, CPU đỉnh 47% một nhân), 400 người xuống cấp (234 ms).
- Đề xuất giới hạn: **80 người mỗi room** và **200 người tổng** trên một server. Chưa cài giới hạn nào vào code (theo yêu cầu: báo cáo, không tự cài).
- Server hiện không có giới hạn người mỗi room và không có giới hạn tổng; đây là việc theo dõi (xem mục Giới hạn).

## Máy đo

- CPU: Apple M4, 10 nhân.
- RAM: 16 GB.
- Node v24.18.0. Server và công cụ đo chạy cùng máy, qua loopback (không TLS, không proxy, không độ trễ mạng thật).
- Máy dùng chung với các phiên khác. Mỗi lượt đo chờ tải trung bình dưới 8 và RAM trống trên 30%, và chờ các job nặng khác kết thúc. Một lúc chỉ một lượt đo.

## Phương pháp

- Mỗi bước (số người) chạy một server mới: `apps/server` với `PGLITE_DIR=memory`, `PASSWORD_LOGIN=1`, cổng 8787, chỉ bind 127.0.0.1. Công cụ không đọc biến môi trường production (không DATABASE_URL, không Google) và không có tùy chọn trỏ tới URL khác.
- Mỗi người chơi giả đi đúng luồng của web: đăng ký qua route mật khẩu test, đồng ý chính sách, lấy vé một lần, mở `/api/ws`, gửi `join`, rồi gửi `update` mỗi 95 ms (nhịp của client) và phát cảm xúc, nói câu có sẵn thi thoảng (15–25 giây một lần, chat 40–60 giây một lần).
- Người chơi đầu tiên của mỗi room (watcher) vẫy tay mỗi giây để đo độ trễ; những người khác đo thời gian từ lúc gửi tới lúc nhận. Đây là độ trễ một chiều qua server trên cùng đồng hồ máy.
- Khởi động 10 giây, đo cửa sổ 30 giây. Mỗi bước dài khoảng một phút kể cả khởi động server và đăng ký.
- Đo từ tiến trình server (qua `loop-probe.ts` nạp bằng `--import`, không sửa mã server): CPU, RSS, và độ trễ vòng lặp sự kiện (p50, p99, max) mỗi giây. Tiến trình công cụ tự đo CPU và độ trễ vòng lặp của chính nó để biết client có bị nghẽn không.
- Băng thông ra là tổng byte các client nhận được trong cửa sổ, đo ở phía client.
- Bước nào vượt ngưỡng thì dừng các bước lớn hơn. Ngưỡng (`loadtest-lib.ts`): độ trễ cảm xúc p95 > 150 ms; trễ vòng lặp server p99 > 50 ms (tệ nhất trong các giây); CPU server đỉnh > 90% một nhân; server đóng kết nối không do công cụ; client tự nghẽn (p99 > 50 ms).

## Kết quả

Kịch bản `room`: tất cả người chơi trong `trung-tam`, nơi có 24 bạn máy.

| Người | Kết nối | Bạn máy thấy | Tin/giây tới client | KB/s tới client | CPU server TB / đỉnh (%) | RSS đỉnh (MB) | Trễ vòng lặp p50 / p99 tệ nhất / max (ms) | Độ trễ cảm xúc p50 / p95 / p99 (ms) | Client loop p99 (ms) | Client CPU (%) | Đóng bởi server | Kết quả |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 10 | 24/24 | 1 954 | 284 | 9 / 20 | 616* | 11,0 / 18,4 / 26,9 | 1 / 2 / 13 | 11,8 | 5 | 0 | ổn |
| 25 | 25 | 24/24 | 8 540 | 1 260 | 18 / 21 | 228 | 11,0 / 28,1 / 97,8 | 1 / 5 / 15 | 11,9 | 16 | 0 | ổn |
| 50 | 50 | 24/24 | 30 032 | 4 472 | 35 / 38 | 235 | 11,1 / 31,1 / 48,3 | 1 / 13 / 17 | 12,1 | 34 | 0 | ổn |
| 100 | 100 | 24/24 | 111 752 | 16 799 | 38 / 42 | 264 | 11,0 / 41,5 / 67,4 | 1 / 18 / 27 | 11,8 | 38 | 0 | ổn |
| 125 | 125 | 24/24 | 170 077 | 25 635 | 59 / 75 | 279 | 11,0 / 188,6 / 256,2 | 8 / 122 / 230 | 12,1 | 59 | 0 | xuống cấp (trễ vòng lặp) |
| 150 | 150 | 24/24 | 243 582 | 36 769 | 77 / 90 | 427 | 11,6 / 359,4 / 359,4 | 16 / 89 / 334 | 12,2 | 77 | 0 | xuống cấp (trễ vòng lặp, CPU) |

Kịch bản `spread`: người chơi rải đều trên 10 map có bạn máy (trừ nhà của bé). Tất cả 108 bạn máy chạy.

| Người | Kết nối | Bạn máy thấy | Tin/giây tới client | KB/s tới client | CPU server TB / đỉnh (%) | RSS đỉnh (MB) | Trễ vòng lặp p50 / p99 tệ nhất / max (ms) | Độ trễ cảm xúc p50 / p95 / p99 (ms) | Client loop p99 (ms) | Client CPU (%) | Đóng bởi server | Kết quả |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 100 | 100 | 108/108 | 13 767 | 2 007 | 26 / 34 | 252 | 10,9 / 38,2 / 47,4 | 1 / 11 / 19 | 12,0 | 23 | 0 | ổn |
| 200 | 200 | 108/108 | 43 838 | 6 497 | 31 / 37 | 266 | 11,0 / 35,5 / 203,2 | 1 / 9 / 18 | 12,0 | 30 | 0 | ổn |
| 300 | 300 | 108/108 | 90 427 | 13 523 | 38 / 47 | 464 | 11,0 / 29,5 / 43,5 | 1 / 13 / 21 | 12,0 | 38 | 0 | ổn |
| 400 | 400 | 108/108 | 155 697 | 23 374 | 61 / 85 | 289 | 11,0 / 233,6 / 233,6 | 5 / 58 / 126 | 12,5 | 59 | 0 | xuống cấp (trễ vòng lặp) |

\* RSS đỉnh của bước 10 người (616 MB) cao hơn các bước sau (228–279 MB). Chưa điều tra nguyên nhân; có thể là phần khởi động của server đầu tiên, vì mỗi bước là một server mới. Số RSS chỉ mang tính tham khảo.

Ghi chú: "Trễ vòng lặp tệ nhất" là giá trị lớn nhất trong các giây của cửa sổ, nên nhạy với nhiễu một giây. Bước 200 của kịch bản spread có max 203 ms trong một giây, nhưng p99 trung bình thì chỉ 35 ms: một giây đột biến, không phải xu hướng.

## Giới hạn

- **Đề xuất: 80 người mỗi room.** Ở 100 người, trễ vòng lặp p99 tệ nhất là 41,5 ms, gần ngưỡng 50 ms, nên 100 không phải là giới hạn an toàn. 80 để lại khoảng 20% đệm. Chưa đo đúng 80 người; đây là suy ra từ 50 và 100, cần đo lại trên máy đích nếu muốn chắc.
- **Đề xuất: 200 người tổng trên một server.** Ở 300 người (rải, 30 mỗi room) vẫn ổn với CPU đỉnh 47%; 400 thì xuống cấp. 200 là khoảng một phần ba dưới mức ổn đã đo. Giới hạn tổng là ràng buộc chính khi nhiều room cùng có người; 80 mỗi room không đủ để bảo vệ server khi có nhiều room đông.
- Số đo là trên Apple M4 của máy dev, một tiến trình Node đơn luồng cho server. Máy production có cấu hình và số nhân khác; chưa đo, nên không suy ra được giới hạn cho production.
- Không có mạng thật, TLS, proxy hay nhiều máy. Với người chơi thật, độ trễ cộng thêm mạng.
- Công cụ đo chạy trong một tiến trình. Ở 125 và 150 người, CPU client lên tới 59% và 77%, nhưng độ trễ vòng lặp của chính client chỉ khoảng 12 ms, nên điểm nghẽn là server, không phải client.
- Độ trễ đo gồm cả thời gian client xử lý trên cùng một tiến trình; với client ổn định (p99 khoảng 12 ms), con số này đủ dùng để so sánh.
- Bạn máy là bạn máy thật của server (chạy trong tiến trình server), nên số đo đã gồm chi phí bạn máy. Không đo được riêng tác động của bạn máy vì không có cờ tắt bạn máy trong công cụ.
- Kịch bản `room` chỉ có 24 bạn máy (đó là số cấu hình của `trung-tam`; map nào cũng có tối đa 24). Vì vậy "100 bạn máy" của plan được đo qua kịch bản `spread`: 108 bạn máy trên 10 map (plan ghi 100, con số thật theo cấu hình là 108; nhà của bé 4 bạn máy không tính vì là map phòng riêng).
- Bước 300 người của kịch bản spread chạy lần đầu bị tôi dừng khi có yêu cầu tạm dừng (yêu cầu của người điều phối lúc chụp ảnh phát hành), nên chạy lại sau đó. Số liệu trong bảng là từ lần chạy hoàn chỉnh.
- Mỗi bước chỉ bắt đầu khi tải trung bình dưới 8 và không có job nặng khác; tiến trình ngoài vẫn có thể làm lệch số đo trong cửa sổ, và điều này không được kiểm soát.
- Lúc kiểm tra typecheck và lint, `pgrep` thấy tiến trình vitest của phiên khác đang chạy. Tôi không dừng chúng, và đã chạy hai lệnh đó lúc đó, nên đã vi phạm quy tắc một job nặng một lúc. Kết quả typecheck và lint vẫn sạch.

## Giới hạn phòng hiện có trong code

- `apps/server/src/multiplayer/multiplayer-hub.ts`: đường `join` (hàm `enter`) không kiểm số người trong room. Không có giới hạn số kết nối WebSocket (`WebSocketServer` tạo không có `maxClients`). Chỉ có `party-full` (tổ đội 2–4 người) và `friends-full` (danh sách bạn), không liên quan.
- Hệ quả: một room có thể nhận bao nhiêu người cũng được, và server không từ chối kết nối mới khi đầy.
- Việc tiếp theo (không làm trong pha này, theo yêu cầu): (1) giới hạn 80 người mỗi room, từ chối bằng thông báo thân thiện (cần thêm mã thông báo vào `MpNotice` trong `packages/schema`); (2) giới hạn 200 người tổng trong hub; (3) đo lại trên máy đích khi đã có giới hạn, để xác nhận 80 và 200. Đây là thay đổi hành vi, cần người sở hữu duyệt.

## Chỉnh sửa đi kèm

- `tools/loadtest/`: `run-loadtest.ts` (điều phối và bảng số), `host.ts` (kiểm tra máy và tiến trình server), `fake-player.ts` (người chơi giả), `loadtest-lib.ts` (hàm thuần: kiểm loopback, phần vị, ngưỡng; có test `loadtest-lib.test.ts`), `loop-probe.ts` (nạp vào server để đo).
- `package.json`: script `loadtest`.
- `docs/code-standards.md`: một mục trong phần Kiểm thử về cách chạy và phạm vi (chỉ máy dev).
- Plan pha 6: trạng thái xong.

## Kiểm tra

- `pnpm vitest run tools/loadtest/loadtest-lib.test.ts`: 14/14 đạt.
- `pnpm typecheck`: không lỗi.
- `pnpm lint` (`--max-warnings=0`): không lỗi, không cảnh báo.

## Câu hỏi còn mở

1. Người sở hữu có chấp nhận 80 người mỗi room và 200 người tổng không? Đây là đề xuất dựa trên máy dev, chưa đo trên production.
2. Có cần đo lại trên máy production (theo quy trình, không chạy tải trên máy đang phục vụ người dùng) trước khi cài giới hạn không?
3. Việc cài giới hạn có thuộc đợt này không? Báo cáo này không cài giới hạn nào.

Status: DONE_WITH_CONCERNS
Summary: Công cụ đo tải và số liệu đã hoàn tất: một room chịu tốt tới 100 người cùng 24 bạn máy, toàn server chịu tốt tới 300 người với 108 bạn máy; đề xuất 80 mỗi room và 200 tổng, chưa cài giới hạn nào vào code.
Concerns/Blockers: Server chưa có giới hạn room hay tổng; số đo là trên máy dev M4, chưa đo trên production; tôi đã chạy typecheck và lint khi có tiến trình vitest của phiên khác đang chạy.

## Quyết định sau đo (Jev qua `tools/decisions/jev-decide.py`, 19/10/2026)

- Ngưỡng dùng làm chuẩn: **60 người chơi mỗi phòng, 150 tổng** (Jev 0,81; nhận lựa chọn của Jev theo cách làm đã chốt). Chừa thêm biên so với 80/200 vì CPU của máy production chưa đo và máy đó chạy chung nhiều dự án.
- Không đo tải trên máy production dùng chung; dùng số đo máy dev cộng biên, theo dõi số liệu production khi người chơi tăng (Jev 0,97).
- Chưa cài giới hạn vào code; làm khi số người chơi cùng lúc tiến gần ngưỡng (Jev 0,91). Khi làm: giới hạn phòng và tổng ở hub, thông báo thân thiện "phòng đầy, thử map khác" (mã thông báo mới trong `packages/schema`), có test.
