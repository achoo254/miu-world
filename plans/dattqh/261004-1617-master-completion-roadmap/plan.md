# Hoàn thiện Master Plan v3: bản đồ các plan còn thiếu và thứ tự làm

**Trạng thái:** đã duyệt thứ tự (04/10/2026); đang thi công, rà tiến độ 06/10/2026 theo dòng trạng thái của từng plan và `docs/project-roadmap.md` (cột Tình trạng) · **Tier:** XL (tổng) · **Nhánh:** `main` · **Ngày:** 04/10/2026

## Kết quả mong muốn

Mọi hạng mục của Master Plan v3 (§5, §6, §8, §8b, §8c, §9, §13, §16) đều có đúng một plan chủ, có thứ tự và phụ thuộc rõ, để các phiên (kể cả phiên chạy song song ở máy khác) nhận việc mà không giẫm chân nhau.

## Không làm (ghi rõ)

- Không viết lại plan đã có; chỉ lập plan cho phần chưa có chủ.
- Không đổi quyết định đã chốt ở Master Plan §15 (không đặt/phá block ở thế giới chính, không Kim cương, không mở khóa, bot luôn gắn nhãn).
- Thứ tự đã được duyệt (04/10/2026); thi công theo bảng "Lượt". Người sở hữu (05/10/2026): SGK tập 2 và môn English để sau, tập trung việc khác trước.

## Đối chiếu Master Plan với plan hiện có (quét ngày 04/10/2026)

| Hạng mục Master Plan | Plan chủ | Tình trạng |
| --- | --- | --- |
| §5 Quest, mechanic kéo thả, sắp xếp, trắc nghiệm, đố vật thể, hỗ trợ học | `260929-2141-vertical-slice-mvp` | Xong, đang chạy production |
| §4, §6 Các map, Home, nhà của bé, xe, nhà to | các plan 261001–261003 | Xong phần tự động, đang chạy production |
| §5 Phần thưởng: Xu, cửa hàng, đồ sưu tầm, thú cưng, bếp, cây kỹ năng, Hành trình, Thành tích | `261003-1602-coins-items-skills-uses`, `261004-1035-life-expansion` | Xong cả 6 pha (05/10/2026), đang chạy production |
| §8c Song ngữ S1–S3 | `261003-2330-bilingual-npc-stories-bots` | Xong S1, S2, S3 (05/10/2026), đang chạy production |
| §8b Chuyện riêng NPC (N1–N3), bot | `261003-2330-bilingual-npc-stories-bots`; tính cách bạn máy ở `261004-1617-coop-quests` | N1, N3 xong; N2 đợt 1 (2 mạch mỗi map) đang chạy production, còn đợt sau tới ≥ 6 mạch mỗi map; B1 xong, tính cách bạn máy (một phần B3) xong ở co-op; còn B0, B2, phần tự training của B3 |
| §8 Bậc 1: diện mạo, tương tác, tổ đội | `261004-1540-online-appearance-interact-party` | P1–P3 xong, đang chạy production; màn kiểm duyệt báo cáo nằm ở `moderation-safety` (hoãn) |
| Nội dung SGK tập 2 | `261002-1139-sgk-lop2-tap2-content` | Hoãn (người sở hữu 05/10/2026: làm sau) |
| **§5, §6 Trùm, Skill Check, cơ chế còn thiếu (lựa chọn hành động, logic, tìm đồ vật, ghép câu)** | `261004-1617-boss-skill-check-new-mechanics`; trùm canh khu ở `261005-2315-zone-guardians` | Pha 1–5 xong, đang chạy production (12 trùm lớn, 42 trùm canh khu có ba lớp hỗ trợ); còn pha 6 (tài liệu) và 2 rương có cổng chưa đặt trên map |
| **§5 Môn English (mới có 1 kỹ năng, 0 quest)** | `261004-1617-english-subject-content` | Hoãn (người sở hữu 05/10/2026: làm sau); nguồn đã chốt (Tiếng Anh 2 Global Success) |
| **§6, §9 Tiến bộ học, kết bạn trong game (cả với bạn máy), luôn online** (thiết kế lại 05/10/2026: người nhận đồng ý, không mã, không cần phụ huynh duyệt) | `261004-1617-parent-area-friends` | Pha 1–6 xong, đang chạy production |
| **§9 (MP) Kiểm duyệt, token ngắn hạn, tắt khẩn cấp, đo tải (không chống cheat)** | `261004-1617-moderation-safety` | Hoãn đến khi có người ngoài gia đình chơi |
| **§8 Bậc 2: co-op quest 2–4 bạn** | `261004-1617-coop-quests` | Xong pha 1–6 và hai mục mở rộng (mọi nhiệm vụ chơi theo đội, bạn máy có cá tính), đang chạy production (bản `48f86ff9`, 06/10/2026) |
| **§8 Bậc 3, §6 Live: sự kiện có thời hạn (Thử thách Olympic Toán), bảng xếp hạng nhóm** | `261004-1617-live-world-events` | Pha 0 (luyện thi Olympic Toán) xong; pha 1–4, 6, 6b đang thi công (06/10/2026); pha 5 (bảng xếp hạng nhóm) và 7 (đo tải) chờ `moderation-safety` |
| **§6 Hộp thư, Skill Up, chuỗi ngày** | `261004-1617-system-screens-v1` | Xong, đang chạy production (chuỗi ngày bỏ theo Jev); còn cập nhật `docs/` |
| **§12, §13, §16 Nghiệm thu MVP, hiệu năng, đồng bộ tài liệu** | `261004-1617-mvp-gate-launch-readiness` | Chưa thi công (chạy xuyên suốt, chốt cuối) |

Plan mở sau ngày lập bản đồ, đều đã lên production (06/10/2026): `261005-0949-single-player-account` (một người chơi chính mỗi tài khoản), `261005-1715-interactions-alive` (tương tác với đồ vật), `261005-2246-loading-and-birds` (tải nhanh, chim vỗ cánh), `261005-2305-pets-alive` (thú cưng sống động), `261005-2315-zone-guardians` (trùm canh khu có ba lớp hỗ trợ), `261005-2335-voice-chat` (nói chuyện bằng giọng trong tổ đội và với bạn bè).

## Thứ tự và phụ thuộc

```text
(đã xong) 1602 / life-expansion / bilingual-bots / 1540 online
        │
        ├─ system-screens-v1 ──────────────┐  (độc lập, nhỏ, làm sớm)
        ├─ boss-skill-check-new-mechanics ─┼─► coop-quests ─► live-world-events
        │      (cần 1602 P5: cây kỹ năng)  │        ▲               ▲
        ├─ english-subject-content         │        │               │
        │      (cần S2 và cơ chế mới)      │   moderation-safety ┘
        ├─ parent-area-friends ────────────┘        ▲
        │      (cần 1540 P2: chặn/báo cáo)──────────┘
        └─ mvp-gate-launch-readiness (chạy xuyên suốt, chốt cuối)
```

Quy tắc xếp thứ tự: (1) việc không phụ thuộc và rủi ro thấp trước; (2) mọi thứ cho trẻ thấy nhau thêm (bạn bè, co-op, sự kiện) chỉ mở sau `moderation-safety` và `parent-area-friends` (Master Plan §8 "Khuyến nghị", §9); (3) `mvp-gate-launch-readiness` mở sớm để đo, đóng cuối.

| Lượt | Plan | Tier |
| --- | --- | --- |
| 0 | `live-world-events` Pha 0: luyện thi vòng loại TIMO khối 2, hạn 10/10/2026 (nếu người sở hữu chọn làm) | M |
| 1 | `system-screens-v1`, `boss-skill-check-new-mechanics`, `parent-area-friends` | M, L, L |
| 2 | ~~`english-subject-content`~~ hoãn (người sở hữu 05/10/2026: làm sau); `moderation-safety` hoãn đến khi có người ngoài gia đình chơi | XL |
| 3 | `coop-quests` | L |
| 4 | `live-world-events` | XL |
| Xuyên suốt | `mvp-gate-launch-readiness` | L |

Bàn giao cho phiên Antigravity cook: `handoff-antigravity.md` (cùng thư mục).

## Luật chung cho mọi plan này

- File dùng chung với phiên khác (`game.ts`, `object-interaction-*.ts`, `player-character.ts`, `game.css`): chỉ thêm module riêng rồi nối một dòng, sau khi phiên kia commit.
- Mọi giá trị thưởng do server tính; không dữ liệu thật của trẻ trong repo (repo công khai).
- Chữ hiển thị cho bé dùng `{name}`, nội dung không lặp (`content:check`), song ngữ qua `t()`.
- Gate trước khi báo xong: `pnpm assets:check` → `content:check` → `test` → `typecheck` → `lint`; sửa `apps/web/**` thì thêm `pnpm --filter @miu/web build`. E2E chỉ chạy khi người sở hữu yêu cầu (1 worker).
- Deploy production hỏi người trước mỗi lần.

## Việc của người (không AI làm thay)

DEVICE-01 (iPad Gen 10), giáo viên duyệt nội dung SGK, designer duyệt UI/mock, pháp chế duyệt văn bản đồng ý draft-3, xác minh ứng dụng Google OAuth, chơi thử với bé (task #24), chọn sách tiếng Anh và đội kiểm duyệt (xem từng plan).

## Câu hỏi mở: đã chốt hết (04/10/2026)

Thêm: phụ huynh **không** có giới hạn giờ chơi (người sở hữu); trùm không đồng hồ, bạn máy co-op chỉ khi phụ huynh bật, đồ giới hạn có bản kỷ niệm, giọng đọc dùng trình duyệt, giữ server tính thưởng (Jev). Chi tiết: `reports/jev-261004-1648-open-questions.md`.


1. ~~Duyệt thứ tự~~ **Đã duyệt (người sở hữu, 04/10/2026)**, riêng Pha 0 của `live-world-events` (luyện thi trước 10/10) được Jev chọn làm ngay và xếp đầu bảng.
2. ~~Sách tiếng Anh~~ **Đã chốt (Jev): tự viết theo khung chương trình.**
3. ~~Ai xử lý báo cáo vi phạm~~: **đã chốt 04/10/2026, bỏ qua** vì game chỉ có người sở hữu và bé; `moderation-safety` hoãn, mở lại trước khi có người ngoài gia đình chơi.
4. ~~TIMO là gì~~ **Đã làm rõ và chốt (Jev): kỳ thi Olympic Toán quốc tế; game dùng tên chung "Thử thách Olympic Toán", không dùng nhãn TIMO.** Ngày thi khối 2: 10/10/2026 (vòng loại, 60 phút, 25 câu trắc nghiệm).
5. ~~Chuỗi ngày~~ **Đã chốt (Jev): không làm.** (cũ: có làm "chuỗi ngày" (streak) không, vì áp lực lên trẻ nhỏ (chi tiết ở `system-screens-v1`)?
