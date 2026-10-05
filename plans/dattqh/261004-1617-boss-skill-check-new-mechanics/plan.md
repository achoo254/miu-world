# Trùm vui, Skill Check và các cơ chế chơi còn thiếu

**Trạng thái:** pha 1–3 xong; pha 4 xong ở server (còn nối giao diện cổng); pha 5 đang làm (trùm ở 3 quest: Đảo bí ẩn, Nhà của bé, Thần Rừng bản nháp); pha 6 chưa làm (rà lại 05/10/2026) · **Tier:** L · **Nhánh:** `main` · **Ngày:** 04/10/2026
**Nguồn:** Master Plan §5 (bảng "Cơ chế tương tác": Lựa chọn hành động, Skill Check, Boss), §6 (V1: Lựa chọn hành động M2.7/M3.8, Skill Check M3.9, Boss M3.10, English Challenge, Logic puzzle, Tìm đồ vật).

## Kết quả mong muốn

1. Cuối mỗi map có một trận **trùm vui**: đố vui nhiều lượt dùng kỹ năng của map, thanh máu giảm theo mỗi lượt đúng (Master Plan: mỗi kỹ năng trừ 80 HP trên 500 HP), thua thì thử lại không mất gì, thắng nhận thưởng đầy đủ như quest.
2. **Skill Check** hoạt động ở cổng/rương/phòng bí mật: thiếu cấp kỹ năng thì được dẫn tới quest luyện đúng kỹ năng đó (phần cổng do plan `261003-1602` pha 5 dựng; plan này làm phần chấm điều kiện và đường dẫn luyện tập nếu pha 5 chưa có).
3. Bốn cơ chế mới dùng được trong quest dữ liệu (không sửa code khi thêm bài): **lựa chọn hành động** (Tìm gỗ / Đi vòng / Nhờ bạn giúp, mỗi nhánh có hệ quả trong chuyện), **logic** (dãy quy luật, đường đi, ghép hình), **tìm đồ vật** (ẩn trong cảnh 3D theo gợi ý đọc hiểu), **ghép câu** (xếp thẻ từ thành câu, nếu chưa đủ bằng `sort`/`connect`).

## Không làm (ghi rõ)

- Không máu/đánh nhau bạo lực: trùm là "quái vật rừng" đố vui, hiệu ứng nhẹ nhàng, không âm thanh đáng sợ.
- Không mở khóa nhiệm vụ (đã bỏ hẳn, Master Plan §15 #33): Skill Check chỉ mở rương/phòng thưởng thêm, không chặn quest.
- Không tính thưởng ở client.

## Hiện trạng đo được (04/10/2026)

- Schema thử thách ở `packages/schema/src/content.ts` đã có: `drag-drop`, `sort`, `quiz`, `classify`, `fill-blank`, `multi-select`, `clock`, `calendar`, `connect`, `minigame`, cộng bước `riddle`, `read`, `speak`, `worksheet`. Chưa có: `decision`, `logic`, `find-object`, `boss`.
- `content/learning/skills.json`: Toán 14 kỹ năng, Tiếng Việt 8, English 1.
- Không có mã nào về boss/skill-check trong `packages`, `apps/web/src`, `apps/server/src`.

## Pha

| Pha | Tier | Nội dung | File sở hữu |
| --- | --- | --- | --- |
| 1 | M | Schema và runtime cho `decision` (nhánh + hệ quả có `next` trong chuyện) và `find-object` (mục tiêu `search` kèm gợi ý chữ, chấm ở server); thêm vào `content:check` | `packages/schema/src/content.ts`, `packages/quest`, `apps/server/src/quest` |
| 2 | M | Cơ chế `logic` (quy luật dãy, mê cung ngắn, ghép hình) và rà `ghép câu` có đủ bằng cơ chế hiện có; giao diện theo mock cảnh (không cửa sổ trắng), có Hướng dẫn/Gợi ý/Đáp án như mọi thử thách | `apps/web/src/ui/challenge/**` |
| 3 | L | Trùm: schema `boss` (HP, danh sách đòn = câu hỏi theo kỹ năng, số lượt, lời thoại thắng/thua), runtime ở server (HP là trạng thái phiên, thưởng tính ở server, chơi lại đủ thưởng theo quyết định "thưởng mỗi lần chơi lại"), màn trùm theo mock M3.10, âm thanh nhẹ | `packages/schema`, `apps/server/src/quest`, `apps/web/src/ui/challenge/boss/**` |
| 4 | M | Skill Check: bảng điều kiện `{kỹ năng, cấp}` trên cổng/rương (dữ liệu trong `entities`/`targets`), server kiểm cấp thật, thiếu thì mở quest luyện gần nhất; thêm kiểm `content:check` cho điều kiện tham chiếu kỹ năng có thật | `apps/server/src/quest`, `content/world/targets.json`, giao diện cổng |
| 5 | L | Nội dung: 12 trận trùm (mỗi map một, nhân vật và lời thoại riêng, không lặp), ≥ 20 bài dùng `decision`, ≥ 20 `find-object`, ≥ 20 `logic` rải trên các map; sinh lại map liên quan + 3 audit | `content/quests/**`, `content/world/**`, generator map |
| 6 | S | Tài liệu: `docs/` mô tả cơ chế mới, mục trang review | `docs/`, `apps/web/review.html` |

## Phụ thuộc và file dùng chung

- Pha 4 phụ thuộc cây kỹ năng của `261003-1602` pha 5; nếu phiên kia chưa xong thì pha 4 chỉ làm phần kiểm điều kiện ở server, giao diện cổng nối sau.
- `decision` dùng trường `next` của chuyện: kiểm không có nhánh cụt (thêm vào `content:check`).
- Sinh lại map đụng generator mọi map: chạy một phiên một lúc, không song song với phiên đặt NPC khác.

## Tiêu chí xong

- Quest dùng cả bốn cơ chế mới và trận trùm chơi trọn vòng ở ít nhất 3 map; thêm một bài mới chỉ bằng dữ liệu.
- Sửa điểm/HP/thưởng ở client không đổi được kết quả (test server).
- Skill Check thiếu cấp thì dẫn tới quest luyện đúng kỹ năng, đủ cấp thì mở.
- `content:check` đỏ khi nhánh `decision` cụt hoặc điều kiện tham chiếu kỹ năng không tồn tại.
- Gate chung đủ 5 lệnh + build web.

## Câu hỏi mở

1. ~~Trận trùm có giới hạn thời gian không?~~ **Đã chốt (Jev 04/10/2026 (`reports/jev-261004-1648-open-questions.md`)): không.** Cân nhắc ban đầu: Đề xuất: **không**, vì trẻ lớp 2 cần đọc kỹ; chỉ có hiệu ứng nhịp nhẹ.
