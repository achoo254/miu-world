---
title: "Đời sống quanh Khu rừng bí mật: dân làng và muôn thú có việc thường ngày"
status: completed
priority: P2
branch: main
created: 2026-09-30
---

# Đời sống quanh Khu rừng bí mật

## Mục tiêu
Người sở hữu muốn mọi map "sống": con vật hợp với map, NPC nhiều ngoại hình, đi lại và làm việc thường ngày với nhiều hoạt cảnh để không cứng (chim bay phải vỗ cánh; bác cầm rìu thì chặt cây, lau mồ hôi, nói chuyện phiếm), có tương tác. Làm ở Khu rừng trước; người sở hữu duyệt xong mới đưa thành plan cho các map khác.

## Quyết định (Jev, `jev-output.json`, jev-1.13.0)
Người sở hữu giao Jev quyết, nên dùng lựa chọn của Jev kể cả câu script đánh dấu `escalate`.

| Câu | Chọn | Tin cậy | Ghi chú |
| --- | --- | --- | --- |
| Dàn nhân vật | lively: 5 dân làng + ~12 con vật | 0,69 (escalate) | lean 0,20 |
| Việc thường ngày | varied_chores: việc chọn theo trọng số, không lặp liền, nhịp phụ (lau mồ hôi, vươn vai, uống nước) | 1,00 | |
| Tương tác | talk_and_react: đến gần thì dừng việc, quay lại, vẫy, bong bóng chào; bấm "Trò chuyện"/"Vuốt ve" thì người nói câu phiếm, con vật làm trò; không thưởng | 0,74 (escalate) | kèm kiến thức 0,17 |
| Tán gẫu | pairs: hai dân làng gần nhau lúc nghỉ thì nói qua lại, câu < 8 từ | 0,90 | |
| Trên trời | parrots_and_bees: vẹt bay vòng vỗ cánh, lượn, đậu ngọn cây; ong bay giữa khóm hoa | 0,31 (escalate) | parrots 0,45 |
| Nhường nhiệm vụ | calm_near_quest: tránh mục tiêu và đường mũi tên, im khi có lời nhắc quest | 1,00 | |
| Hiệu năng | nearest_by_quality: chỉ vẽ và cho chạy K nhân vật gần nhất (low 6, mid 9, high 12) | 0,99 | |
| Giảm chuyển động | calmer: chim đậu, thú làm việc tại chỗ, không nhảy vọt | 1,00 | |

## Thiết kế
- Dữ liệu: `entities.json` thêm `ambients` (id, tên, routine, model, đồ cầm tay `held`, vị trí nhà, các `spots` làm việc). Generator rừng đặt chúng cách mục tiêu quest và đường đi, không đổi `chunks.bin`.
- Runtime `apps/web/src/game/ambient/`: kịch bản thuần (việc → nhịp: đi, clip, tư thế, nói, cầm đồ, nhảy, bay), tư thế thủ công trên từng khớp (tay lau trán, vươn vai, uống nước, cánh vỗ), bong bóng lời, đạo diễn chọn K nhân vật gần nhất, lời thoại xoay vòng không lặp liền, có `{name}`.
- Tương tác đi qua nhãn nhắc sẵn có (kind `ambient`); quest luôn ưu tiên; tương tác ambient xử lý trong game, không gọi server.

## Ngân sách draw call (đo 30/09/2026, điểm xuất phát / trại)
Mỗi nhân vật Kenney là 5–9 mảnh; vẽ nguyên thì 12 nhân vật vượt ngân sách 150. Đã làm:
- `merge-parts.ts`: gộp mảnh thành một skinned mesh (xương là chính các khớp) → 1 draw call/nhân vật; áp luôn cho NPC quest nhiều mảnh.
- `props.ts`: props tĩnh gộp theo vật liệu (35 → ~15 draw call, ×2 khi có bóng).
- Chốt ngân sách trong đạo diễn: đọc draw call khung trước, bớt nhân vật xa nhất khi > 144.

| Chất lượng | Không đời sống | Có đời sống | Nhân vật vẽ |
| --- | --- | --- | --- |
| low | 62 / 59 | 70 / 68 | 6 |
| mid (mặc định) | 94 / 88 | 105 / 100 | 9 |
| high | 133 / 136 | 142 / 141 | 2–4 (chốt ngân sách) |

Mức high đã sát 150 từ trước (chunk cả map trong tầm nhìn 110 + bóng đổ), nên ở high chỉ còn vài nhân vật gần nhất.

## Dàn nhân vật rừng
Dân làng (Kenney Blocky): Bác Tiều phu (rìu), Chú Câu cá (bờ suối), Cô Làm vườn (cuốc, luống rau), Bà Nấu ăn (lửa trại gần điểm xuất phát), Bé Gánh củi (đi lại giữa đống củi và lửa trại). Thú (Cube Pets): 2 vẹt bay, 2 ong, thỏ, nai, cáo, heo rừng, gà con, cua, cá nhảy, sâu.

## Tiêu chí nghiệm thu
- [x] Mỗi nhân vật có ≥ 3 việc khác nhau, không việc nào lặp liền; người có nhịp phụ (lau mồ hôi, vươn vai…) — test `ambient-actor.test.ts` (routine ≥ 3 việc, `pickChore` không lặp liền)
- [x] Chim vỗ cánh khi bay lên, lượn khi xuống, đôi lúc đậu; ong vỗ cánh nhanh khi bay — test `ambient-actor.test.ts`
- [x] Đến gần: dừng việc, quay lại, vẫy, bong bóng chào có tên nhân vật của bé; bấm: câu phiếm/trò, rồi quay lại việc — test đơn vị + E2E `forest-life` (lời chào chứa tên bé, bấm thì `ambientReactions` = 1, không gửi tương tác quest); ảnh `evidence/life-woodcutter-chat.png`
- [x] Không che mũi tên, không đứng trên đường, im khi có lời nhắc quest — test generator (cách mục tiêu quest ≥ 5, cách đường ≥ 2) + E2E `forest-life` (đứng cạnh Vẹt 8 s: có nhân vật quanh đó, không bong bóng nào)
- [x] Draw call ≤ 150 ở mọi mức chất lượng; E2E `play` vẫn xanh; review shot cho người duyệt — E2E `forest-life` kiểm ≤ 150 ở low, mid (7 nơi), high; `play` 18/18; ảnh ở `evidence/`, video 18 s ở `.data/life/review-shots/*.webm` (không commit)
- [x] prefers-reduced-motion: chim đậu, không nhảy vọt — test `ambient-actor.test.ts`
- [x] Gate đủ 5 lệnh + web build + E2E — kiểm 01/10/2026: 75 file/543 test, typecheck, lint sạch; E2E `setup` + `play` + `forest-life` 25/25

## Sau khi người sở hữu duyệt
Viết phase áp dụng cho Trường học và các map sau (dàn nhân vật theo map, cùng runtime).
