---
title: "Chuyện riêng của nhân vật, đợt 2a: mọi map lên 4 mạch"
description: "22 mạch chuyện mới (khoảng 77 chương) để mỗi map có 4 mạch, theo đúng khuôn đợt 1."
status: completed
priority: P1
effort: XL
branch: main
tags: [content, npc, quests, world]
blockedBy: []
blocks: []
created: 2026-10-19
---

# Chuyện riêng của nhân vật, đợt 2a

## Kết quả mong muốn

Mỗi map trong mười hai map có 4 mạch chuyện riêng của nhân vật (hiện Trung tâm và Nông trại có 3, mười map còn lại có 2). Thêm 22 mạch mới, mỗi mạch 3–5 chương, để thế giới "thật sinh động, không chán" (đích duy nhất của người sở hữu). Đợt sau (2b) đưa mỗi map lên ít nhất 6 mạch như plan `261003-2330-bilingual-npc-stories-bots` (dòng N2).

## Quyết định (Jev qua `tools/decisions/jev-decide.py`, 19/10/2026)

- Việc kế tiếp sau đợt nghiệm thu MVP: đợt 2 chuyện riêng của nhân vật (Jev 0,70; theo cách làm đã chốt, nhận lựa chọn của Jev kể cả khi script báo `escalate`). Việc sau đó: đo tải pha 6 của `261004-1617-moderation-safety` (Jev 0,36).
- Cỡ đợt: thêm 2 mạch mỗi map (Jev 0,57). Hai map đã có 3 mạch chỉ thêm 1, nên tổng là 22 mạch.
- Làm cả mười hai map trong cùng đợt, mỗi lần sinh lại một map (Jev 0,99).

## Khuôn (giữ đúng đợt 1, report `plans/dattqh/reports/npc-stories-batch1-261005.md`)

- Mỗi mạch thuộc một nhân vật đã có hồ sơ trong `content/npcs/<map>.json` (ưu tiên nhân vật chưa có mạch), dùng tính cách, nỗi sợ, ước mơ, bí mật, món thích của hồ sơ; quest `category: "story"`, id `yarn-<slug>-<số chương>`, xếp sau mọi bài học.
- Mỗi chương: ≥ 4 nơi trên map, ≥ 2 cơ chế ngoài trắc nghiệm (kéo thả, sắp xếp, `decision`, `find-object`, `logic`…), đủ các pha như đợt 1, 7 câu hỏi có ba lớp Hướng dẫn · Gợi ý · Đáp án, thư sau chương (mỗi mạch ít nhất một thư từ nhân vật ở map khác), có tiếng Anh (`en`), chữ hiển thị dùng `{name}`, không câu nào lặp (`content:check`).
- Nội dung học bám SGK lớp 2, đánh dấu `review: "teacher-pending"`.
- Vật mới trên map khai trong `content/world/targets.json` (+ `looks.json` chép từ model có sẵn, không thêm art), rồi `pnpm world:<map>`, `pnpm world:walk <map>`, `scenery-audit`, `room-audit`, `reach-audit`, `pnpm world:quest-targets <map>`, `pnpm assets:manifest` (luật `.claude/rules/world-scenery.md`).
- Không đổi server (độ thân thiết, thư, thưởng đã có). Thưởng do server tính.

## Các pha

| # | Pha | Map | Mạch mới | Trạng thái |
|---|---|---|---|---|
| 1 | Nhóm A | Nhà của bé, Trung tâm, Khu rừng bí mật, Trường học | 2 + 1 + 2 + 2 = 7 | completed (25 chương, report `plans/dattqh/reports/npc-stories-batch2a-group-a-261019.md`) |
| 2 | Nhóm B | Làng ven sông, Xóm mái ấm, Chợ phiên, Nông trại | 2 + 2 + 2 + 1 = 7 | completed (26 chương, report `plans/dattqh/reports/npc-stories-batch2a-group-b-261019.md`) |
| 3 | Nhóm C | Thư viện, Lâu đài, Núi tuyết, Đảo bí ẩn | 2 + 2 + 2 + 2 = 8 | completed (29 chương, report `plans/dattqh/reports/npc-stories-batch2a-group-c-261019.md`) |
| 4 | Gộp, review, trang review, CI, ảnh màn hình | — | — | completed phần trước release (review và sửa, CI xanh; report `plans/dattqh/reports/npc-stories-batch2a-261019.md`); ảnh màn hình và release chờ người sở hữu duyệt |

Các pha chạy nối tiếp (mỗi pha sửa `content/world/targets.json` và sinh lại map; không chạy song song). Mỗi pha commit riêng khi `assets:check`, `content:check`, `typecheck`, `lint` và các file test liên quan xanh; bộ test đầy đủ, build web và E2E chạy trên CI sau push (luật `CLAUDE.md` mới).

## Tiêu chí xong

- `content/quests/yarn-*.json`: mỗi map đúng 4 mạch; tổng 48 mạch.
- `pnpm content:check` xanh (không câu lặp, độ phủ không tụt, audit mục tiêu quest mọi map sạch).
- Mỗi map vừa sinh lại có 3 audit sạch và lưới đi bộ mới.
- CI của commit cuối xanh; report `plans/dattqh/reports/npc-stories-batch2a-<ngày>.md` có bảng số lượng như đợt 1.

## Rủi ro

- Sinh lại map làm dời vật có sẵn: audit mục tiêu quest (`content:check`) bắt được.
- Nội dung nhiều dễ lặp ý: `content:check` chỉ bắt câu trùng nguyên văn; review cuối đọc chọn mẫu theo map.
