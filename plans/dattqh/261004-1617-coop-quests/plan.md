# Co-op: 2–4 bạn cùng giải một thử thách hoặc đánh một trùm

**Trạng thái:** đã duyệt (04/10/2026), chỉ thi công sau khi kiểm duyệt xong · **Tier:** L · **Nhánh:** `main` · **Ngày:** 04/10/2026
**Nguồn:** Master Plan §8 (Bậc 2: "Co-op quest: 2 đến 4 bạn cùng giải một puzzle hoặc đánh một boss, dùng lại cơ chế M3.10"; điều kiện mở: có kiểm duyệt và quy trình xử lý báo cáo), §8b (bot lập tổ đội), §6 ("phòng chờ co-op").

## Kết quả mong muốn

Một đội 2–4 (người hoặc bạn máy) cùng vào một thử thách chung: mỗi bé thấy phần việc của mình, kết quả chung phụ thuộc cả đội, thưởng tính riêng cho từng bé ở server như quest thường; không ai bị bỏ rơi hay bị chê (không bảng điểm cá nhân so sánh trong thử thách).

## Không làm (ghi rõ)

- Không chat tự do; chỉ câu có sẵn và emote (Master Plan §9).
- Không xếp hạng đối đầu giữa bé trong co-op; chỉ hợp tác.
- Không bắt buộc co-op để hoàn thành bài học: mọi quest học vẫn chơi được một mình (không khóa quest, Master Plan §15 #33).
- Không mở cho người thật khi `moderation-safety` chưa xong.

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
| 5 | M | **Bạn máy trong co-op**: bot nhận lời mời, vào phiên, chơi với tỉ lệ đúng/sai điều chỉnh được, nhãn "Bạn máy"; khi chỉ có một bé thì tự ghép bạn máy nếu phụ huynh bật | `apps/server/src/multiplayer/bot-runner.ts` |
| 6 | L | **Nội dung**: ≥ 12 thử thách co-op (mỗi map một, bối cảnh hợp: dựng cầu ở Làng Ven Sông, cùng nấu ở Nhà của bé…), kiểm chống lặp, sinh lại map liên quan + 3 audit | `content/quests/**`, `content/world/**` |

## Phụ thuộc và file dùng chung

- Cần xong: `261004-1540` P3 (tổ đội), `boss-skill-check-new-mechanics` pha 3 (trùm), `moderation-safety` (kiểm duyệt, công tắc khẩn cấp), `parent-area-friends` pha 2 (công tắc online).
- `multiplayer-hub.ts` và `bot-runner.ts` được nhiều plan sửa: làm lần lượt, không song song.

## Tiêu chí xong

- Đội 2–4 người (có bạn máy) hoàn thành một thử thách mỗi loại, mất kết nối một người không làm hỏng phiên.
- Mỗi bé nhận thưởng đúng một lần mỗi lần chạy, do server tính; client sửa số không đổi được kết quả (test).
- Tắt online (phụ huynh) hoặc công tắc khẩn cấp thì phiên đóng êm, bé về bản đồ, không mất tiến độ học.
- Gate chung đủ 5 lệnh + build web; E2E hai tab một ca khi được yêu cầu.

## Câu hỏi mở

1. Tự ghép bạn máy khi chỉ có một bé: bật mặc định hay chỉ khi phụ huynh bật? Đề xuất: **chỉ khi phụ huynh bật**, nhất quán với công tắc bạn máy hiện có.
