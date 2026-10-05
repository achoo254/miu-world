# Co-op: 2–4 bạn cùng giải một thử thách hoặc đánh một trùm

**Trạng thái:** đã duyệt (04/10/2026), sửa theo định hướng mọi lứa tuổi, luôn online (05/10/2026), chưa thi công; mọi tổ đội chơi co-op được (Jev 05/10/2026), kiểm duyệt làm trước khi có ghép đội ngẫu nhiên với người lạ · **Tier:** L · **Nhánh:** `main` · **Ngày:** 04/10/2026
**Nguồn:** Master Plan §8 (Bậc 2: "Co-op quest: 2 đến 4 bạn cùng giải một puzzle hoặc đánh một boss, dùng lại cơ chế M3.10"; điều kiện mở: có kiểm duyệt và quy trình xử lý báo cáo), §8b (bot lập tổ đội), §6 ("phòng chờ co-op").

## Kết quả mong muốn

Một đội 2–4 (người hoặc bạn máy) cùng vào một thử thách chung: mỗi bé thấy phần việc của mình, kết quả chung phụ thuộc cả đội, thưởng tính riêng cho từng bé ở server như quest thường; không ai bị bỏ rơi hay bị chê (không bảng điểm cá nhân so sánh trong thử thách).

## Mở rộng (người sở hữu, 05/10/2026): mọi nhiệm vụ chơi co-op được, kể cả boss canh khu

Quyết định (Jev, `reports/jev-261005-2320-coop-all-{input,output}.json`):

- Bước khám phá làm chung (ai nhặt đồ, nói chuyện, đọc thì cả đội đi tiếp); mọi câu hỏi/thử thách/câu đố thì mỗi thành viên tự trả lời trên màn hình mình, cả đội đi tiếp khi mọi người đã trả lời; bạn bè cổ vũ và gửi biểu tượng gợi ý, không bao giờ gửi đáp án; trùm (lớn và canh khu) là trùm đội, HP chung, mỗi người tự trả lời lượt của mình (0.97).
- Tiến độ của từng thành viên trên quest đó đều tăng; đội trưởng chọn quest; ai đã xong quest đó thì chơi một lượt chơi lại (0.99).
- Thử thách co-op riêng (mỗi người một mảnh, cùng giữ nhịp) vẫn là nội dung thêm của pha 3 và 6.

## Bạn máy mỗi con một kiểu, lúc hay lúc dở (người sở hữu, 05/10/2026)

Người sở hữu: "bot máy luôn phải tự update để khi co op làm nhiệm vụ mỗi bot máy sẽ khác nhau chứ ko giống nhau, bot máy sẽ giống người chơi lúc này lúc khác". Quyết định (Jev, `reports/jev-261005-2330-bots-variety-{input,output}.json`):

- Mỗi bạn máy có tính cách riêng (môn mạnh, môn yếu, nhanh/chậm, cẩn thận/hấp tấp, nói nhiều/ít, tâm trạng theo giờ trong ngày) và cấp kỹ năng riêng từng môn tăng dần khi nó chơi (XP riêng như người chơi); câu trả lời lấy từ cấp đó cộng tâm trạng trong ngày và độ mệt, nên cùng một bạn máy lúc nhanh nhạy, lúc trượt; nhớ người đã chơi cùng (lời chào thân hơn, nhắc lần chơi trước) (0.98).
- Bạn máy chỉ học từ lượt chơi của chính nó và số liệu gộp ẩn danh từng câu (tỉ lệ người chơi trả lời đúng, thời gian trả lời); không bao giờ dùng thao tác, câu trả lời hay lời chat của một người chơi cụ thể (0.95). Trang quyền riêng tư ghi một dòng về số liệu gộp.
- Làm cùng đợt co-op, ở pha 5 (0.52).
- Hai bạn máy trong cùng một đội không bao giờ giống nhau: khác tính cách, khác nhịp, khác lời.

## Không làm (ghi rõ)

- Không chat tự do; chỉ câu có sẵn và emote (Master Plan §9).
- Không xếp hạng đối đầu giữa bé trong co-op; chỉ hợp tác.
- Không bắt buộc co-op để hoàn thành bài học: mọi quest học vẫn chơi được một mình (không khóa quest, Master Plan §15 #33).
- Không ghép đội ngẫu nhiên với người lạ khi `moderation-safety` (đang hoãn) chưa làm; co-op chỉ trong tổ đội đã mời và nhận (Jev 0.33, chọn `any_party`, `reports/jev-261005-2200-coop-*.json`).

## Hiện trạng đo được (04/10/2026)

- Plan `261004-1540` (P3) sẽ có `PartyService`, giao thức `party-*`, `party-goto`, khung đội; bot là thành viên hợp lệ.
- Trùm và cơ chế mới nằm ở plan `261004-1617-boss-skill-check-new-mechanics` (pha 3).
- Khung minigame có luồng thưởng server và chơi lại đủ thưởng (`apps/web/src/ui/minigame`).

## Pha

| Pha | Tier | Nội dung | File sở hữu |
| --- | --- | --- | --- |
| 1 | M | **Phòng chờ co-op**: trưởng đội chọn thử thách co-op ở NPC/cổng, cả đội thấy "sẵn sàng", đếm ngược, thoát trước khi bắt đầu không mất gì; giao diện theo mock cảnh | `apps/web/src/ui/coop/**` (mới) |
| 2 | L | **Phiên co-op ở server**: `CoopSession` giữ trạng thái chung (bước, HP trùm, ai đang làm gì) theo thành viên đội, đồng bộ qua hub; chống một bé phá hỏng (không có hành động gây thua riêng), mất kết nối thì bạn máy/AI điền chỗ hoặc thử thách tạm dừng 60 giây rồi giữ phần đã làm | `apps/server/src/coop/**` (mới), `apps/server/src/multiplayer` |
| 3 | M | **Loại thử thách co-op** (dữ liệu, không sửa code khi thêm): *mỗi người một mảnh* (ghép đáp án chung: người A giữ số, người B giữ phép tính), *cùng giữ nhịp* (giữ cửa/kéo cầu cùng lúc), *trùm đội* (mỗi bé trả lời một đòn, HP chung); schema `coop` bọc quest hiện có | `packages/schema`, `packages/quest` |
| 4 | M | **Thưởng**: mỗi bé nhận như quest thường (server tính riêng từng hồ sơ, theo quyết định "thưởng mỗi lần chơi lại, mỗi lần chạy trả một lần"), thêm danh hiệu/đồ riêng cho co-op; chống bơm thưởng bằng bot-farm (giới hạn tần suất theo hồ sơ, không giới hạn thưởng cơ bản) | `apps/server/src/reward` |
| 5 | L | **Bạn máy trong co-op**: bot nhận lời mời, vào phiên, chơi theo tính cách và cấp kỹ năng riêng (mục "Bạn máy mỗi con một kiểu"), tâm trạng và độ mệt đổi theo lúc, nhãn "Bạn máy"; khi chỉ có một người chơi thì tự thêm bạn máy vào chỗ trống nếu công tắc bạn máy của người chơi đang bật (mặc định bật; Jev 0.93) | `apps/server/src/multiplayer/bot-runner.ts` |
| 6 | L | **Nội dung**: ≥ 12 thử thách co-op (mỗi map một, bối cảnh hợp: dựng cầu ở Làng Ven Sông, cùng nấu ở Nhà của bé…), kiểm chống lặp, sinh lại map liên quan + 3 audit | `content/quests/**`, `content/world/**` |

## Phụ thuộc và file dùng chung

- Đã xong: `261004-1540` P3 (tổ đội), `boss-skill-check-new-mechanics` pha 3 (trùm), `parent-area-friends` (bạn bè, công tắc bạn máy). Online luôn bật (người sở hữu gỡ công tắc 05/10/2026). `moderation-safety` chỉ cần trước khi ghép đội ngẫu nhiên.
- `multiplayer-hub.ts` và `bot-runner.ts` được nhiều plan sửa: làm lần lượt, không song song.

## Tiêu chí xong

- Đội 2–4 người (có bạn máy) hoàn thành một thử thách mỗi loại, mất kết nối một người không làm hỏng phiên.
- Mỗi bé nhận thưởng đúng một lần mỗi lần chạy, do server tính; client sửa số không đổi được kết quả (test).
- Rời đội, mất kết nối hoặc bị chặn giữa phiên thì phiên đóng êm hoặc bạn máy điền chỗ, người chơi về bản đồ, không mất tiến độ học.
- Gate chung đủ 5 lệnh + build web; E2E hai tab một ca khi được yêu cầu.

## Câu hỏi mở

1. ~~Tự ghép bạn máy khi chỉ có một bé~~ **Đã chốt lại (Jev 05/10/2026): tự thêm khi công tắc bạn máy của người chơi bật (mặc định bật).** Quyết định cũ (04/10/2026): chỉ khi phụ huynh bật. Cân nhắc ban đầu: bật mặc định hay chỉ khi phụ huynh bật? Đề xuất: **chỉ khi phụ huynh bật**, nhất quán với công tắc bạn máy hiện có.
