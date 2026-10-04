# Hoàn thiện Master Plan v3: bản đồ các plan còn thiếu và thứ tự làm

**Trạng thái:** đã duyệt thứ tự (04/10/2026), chưa thi công · **Tier:** XL (tổng) · **Nhánh:** `main` · **Ngày:** 04/10/2026

## Kết quả mong muốn

Mọi hạng mục của Master Plan v3 (§5, §6, §8, §8b, §8c, §9, §13, §16) đều có đúng một plan chủ, có thứ tự và phụ thuộc rõ, để các phiên (kể cả phiên chạy song song ở máy khác) nhận việc mà không giẫm chân nhau.

## Không làm (ghi rõ)

- Không viết lại plan đã có; chỉ lập plan cho phần chưa có chủ.
- Không đổi quyết định đã chốt ở Master Plan §15 (không đặt/phá block ở thế giới chính, không Kim cương, không mở khóa, bot luôn gắn nhãn).
- Không bắt đầu thi công plan nào ở đây trước khi người sở hữu duyệt (mục Câu hỏi mở).

## Đối chiếu Master Plan với plan hiện có (quét ngày 04/10/2026)

| Hạng mục Master Plan | Plan chủ | Tình trạng |
| --- | --- | --- |
| §5 Quest, mechanic kéo thả, sắp xếp, trắc nghiệm, đố vật thể, hỗ trợ học | `260929-2141-vertical-slice-mvp` | Xong |
| §4, §6 Các map, Home, nhà của bé, xe, nhà to | các plan 261001–261003 | Xong phần tự động |
| §5 Phần thưởng: Xu, cửa hàng, đồ sưu tầm, thú cưng, bếp, cây kỹ năng, Hành trình, Thành tích | `261003-1602-coins-items-skills-uses`, `261004-1035-life-expansion` | Đang làm (phiên khác) |
| §8c Song ngữ S2 | `261003-2330-bilingual-npc-stories-bots` | Đang làm (phiên khác) |
| §8b Chuyện riêng NPC (N1–N3), bot | `261003-2330-bilingual-npc-stories-bots` | Đang làm (phiên khác) |
| §8 Bậc 1: diện mạo, tương tác, tổ đội | `261004-1540-online-appearance-interact-party` | Đã lập plan |
| Nội dung SGK tập 2 | `261002-1139-sgk-lop2-tap2-content` | Đã lập plan, `pending` |
| **§5, §6 Trùm, Skill Check, cơ chế còn thiếu (lựa chọn hành động, logic, tìm đồ vật, ghép câu)** | `261004-1617-boss-skill-check-new-mechanics` | **Mới** |
| **§5 Môn English (mới có 1 kỹ năng, 0 quest)** | `261004-1617-english-subject-content` | **Mới** |
| **§6, §9 Khu vực phụ huynh: tiến bộ, bạn bè bằng mã, phê duyệt, bật/tắt online** | `261004-1617-parent-area-friends` | **Mới** |
| **§9 (MP) Kiểm duyệt, token ngắn hạn, tắt khẩn cấp, đo tải (không chống cheat)** | `261004-1617-moderation-safety` | **Mới** |
| **§8 Bậc 2: co-op quest 2–4 bạn** | `261004-1617-coop-quests` | **Mới** |
| **§8 Bậc 3, §6 Live: sự kiện có thời hạn, bảng xếp hạng nhóm** | `261004-1617-live-world-events` | **Mới** |
| **§6 Hộp thư, Skill Up, chuỗi ngày** | `261004-1617-system-screens-v1` | **Mới** |
| **§12, §13, §16 Nghiệm thu MVP, hiệu năng, đồng bộ tài liệu** | `261004-1617-mvp-gate-launch-readiness` | **Mới** |

## Thứ tự và phụ thuộc

```text
(đang chạy ở phiên khác) 1602 / life-expansion / bilingual-bots / 1540 online
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
| 1 | `system-screens-v1`, `boss-skill-check-new-mechanics`, `parent-area-friends` | M, L, L |
| 2 | `moderation-safety`, `english-subject-content` | M, XL |
| 3 | `coop-quests` | L |
| 4 | `live-world-events` | XL |
| Xuyên suốt | `mvp-gate-launch-readiness` | L |

## Luật chung cho mọi plan này

- File dùng chung với phiên khác (`game.ts`, `object-interaction-*.ts`, `player-character.ts`, `game.css`): chỉ thêm module riêng rồi nối một dòng, sau khi phiên kia commit.
- Mọi giá trị thưởng do server tính; không dữ liệu thật của trẻ trong repo (repo công khai).
- Chữ hiển thị cho bé dùng `{name}`, nội dung không lặp (`content:check`), song ngữ qua `t()`.
- Gate trước khi báo xong: `pnpm assets:check` → `content:check` → `test` → `typecheck` → `lint`; sửa `apps/web/**` thì thêm `pnpm --filter @miu/web build`. E2E chỉ chạy khi người sở hữu yêu cầu (1 worker).
- Deploy production hỏi người trước mỗi lần.

## Việc của người (không AI làm thay)

DEVICE-01 (iPad Gen 10), giáo viên duyệt nội dung SGK, designer duyệt UI/mock, pháp chế duyệt văn bản đồng ý draft-3, xác minh ứng dụng Google OAuth, chơi thử với bé (task #24), chọn sách tiếng Anh và đội kiểm duyệt (xem từng plan).

## Câu hỏi mở (cần người sở hữu)

1. Duyệt thứ tự ở bảng "Lượt" ở trên, hay muốn đưa English hoặc sự kiện lên trước?
2. Sách tiếng Anh lớp 2 dùng bộ nào (chi tiết ở `english-subject-content`)?
3. Ai xử lý báo cáo vi phạm khi bật bạn bè/co-op: người sở hữu, hay ngừng ở bậc 1 như khuyến nghị Master Plan §8 (chi tiết ở `moderation-safety`)?
4. "TIMO" ở Master Plan §6 là đối tác/chương trình nào, có tài liệu sự kiện không (chi tiết ở `live-world-events`)?
5. Có làm "chuỗi ngày" (streak) không, vì áp lực lên trẻ nhỏ (chi tiết ở `system-screens-v1`)?
