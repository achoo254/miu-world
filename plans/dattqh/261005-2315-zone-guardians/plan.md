---
title: "Boss canh khu và boss trên bản đồ"
description: "Mỗi map một boss lớn cộng 3–4 boss canh khu, mọi boss hiện trên bản đồ nhỏ và bản đồ lớn; boss lớn chơi được theo tổ đội."
status: pending
priority: P2
tier: L
branch: main
tags: [content, web, world]
created: 2026-10-05
---

# Boss canh khu và boss trên bản đồ

**Trạng thái:** đã lập (05/10/2026); làm sau `261005-2305-pets-alive`; xong thì deploy production (người sở hữu cho phép, 05/10/2026) · **Tier:** L
**Nguồn:** người sở hữu (05/10/2026): "boss nên hiển thị trên minimap ko. 1 map chỉ 1 boss ít quá so với kích cỡ map ko" → chọn phương án B. Jev (`reports/jev-261005-2310-bosses-{input,output}.json`) chọn hiện boss trên bản đồ (0.19) và giữ 1 boss (0.77); người sở hữu chọn thêm boss canh khu, quyết định của người sở hữu được dùng.

## Hiện trạng (05/10/2026)

- 12 trận trùm, mỗi map một, là quest ở chương cuối (`vuot-ai-<map>` và hai trận ở Đảo bí ẩn, Nhà của bé): 7 câu, mỗi câu đúng trừ 80/500 HP, thua không mất gì, chơi lại đủ thưởng.
- Bản đồ nhỏ và bản đồ lớn chỉ đánh dấu mục tiêu quest hiện tại, người kể chuyện, người giao minigame; boss không hiện trừ khi đang là quest hiện tại.

## Kết quả mong muốn

1. Mọi boss (lớn và canh khu) có biểu tượng riêng, thân thiện, luôn hiện trên bản đồ nhỏ và bản đồ lớn; chạm vào để tự đi tới như quest.
2. Mỗi map có 3–4 boss canh khu, mỗi khu chính một: nhân vật riêng, câu hỏi theo kỹ năng các bài của khu đó, trận ngắn 4–5 câu, lời thoại không lặp, thưởng mỗi lần chơi lại (server tính); tổng khoảng 36–48 boss canh.
3. Mọi boss (lớn và canh khu) chơi được theo tổ đội trong co-op như mọi nhiệm vụ (người sở hữu 05/10/2026; trùm đội HP chung, mỗi người tự trả lời lượt mình; plan `261004-1617-coop-quests`).
4. Không khóa gì: boss không chặn bài học, không cần đánh boss canh để gặp boss lớn.

## Pha

| Pha | Tier | Nội dung |
| --- | --- | --- |
| 1 | S | Biểu tượng boss trên bản đồ nhỏ và bản đồ lớn, đi tới bằng chạm |
| 2 | L | Nội dung boss canh khu cho 12 map (nhân vật, câu theo kỹ năng của khu, lời thắng/thua), id sắp sau bài học (luật `content:check`); sinh lại từng map một, 3 audit, `assets:manifest` |
| 3 | S | Mọi boss chơi theo tổ đội (nối chế độ co-op cho mọi nhiệm vụ) |
| 4 | S | Kiểm tra: test bản đồ có boss, `content:check` đếm boss mỗi map, E2E đánh một boss canh; tài liệu |

## Tiêu chí xong

- Mỗi map 1 boss lớn + ≥ 3 boss canh, đều hiện trên bản đồ; gate 5 lệnh, build web, `security:dist`, E2E liên quan; deploy production.
