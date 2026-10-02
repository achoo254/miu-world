---
title: "Nội dung SGK lớp 2 tập 2 (Toán, Tiếng Việt — Kết nối tri thức): kịch bản và trò chơi mới trên các map"
description: "Đưa 100% Toán 2 tập 2 (7 chủ đề, bài 37–75) và Tiếng Việt 2 tập 2 (5 chủ điểm, tuần 19–35, 30 bài + 2 ôn tập) vào quest của Miu World, chia theo chủ đề cho 9 map (thêm Đảo bí ẩn), với trò chơi mới trong thế giới 3D."
status: pending
priority: P1
effort: "XL"
branch: dattqh/feat/sgk-lop2-tap2
tags: [content, game, world, backend, frontend]
blockedBy: []
blocks: []
created: 2026-10-02
---

# Nội dung SGK lớp 2 tập 2 thành kịch bản và trò chơi trên các map

## Overview

Người sở hữu (02/10/2026) gửi hai sách tập 2, bản scan không có lớp chữ, đã lưu ở iCloud như tập 1 (`tools/private/private-files.json`, `pnpm private:sync`) và tách trang (`.data/sgk/pages/toan-t2-NNN.pdf`, `tv-t2-NNN.pdf`):

- **Toán 2 tập 2** (142 trang PDF): chủ đề 8 Phép nhân, phép chia (bài 37–45: phép nhân, thừa số–tích, bảng nhân 2, 5, phép chia, số bị chia–số chia–thương, bảng chia 2, 5); 9 Làm quen với hình khối (46–47: khối trụ, khối cầu); 10 Các số trong phạm vi 1000 (48–54: đơn vị–chục–trăm–nghìn, số tròn trăm, tròn chục, so sánh, số có ba chữ số, viết thành tổng); 11 Độ dài và đơn vị đo độ dài, tiền Việt Nam (55–58: dm, m, km, tiền Việt Nam, thực hành đo); 12 Phép cộng, phép trừ trong phạm vi 1000 (59–63, có nhớ và không nhớ); 13 Làm quen với yếu tố thống kê, xác suất (64–67: thu thập, phân loại, kiểm đếm, biểu đồ tranh, chắc chắn–có thể–không thể); 14 Ôn tập cuối năm (68–75).
- **Tiếng Việt 2 tập 2** (145 trang PDF): tuần 19–35, 30 bài và 2 ôn tập; chủ điểm Vẻ đẹp quanh em (bài 1–8), Hành tinh xanh của em (9–16), ôn tập giữa học kì 2 (tuần 27), Giao tiếp và kết nối (17–20), Con người Việt Nam (21–24), Việt Nam quê hương em (25–30), ôn tập và đánh giá cuối học kì 2 (tuần 35). Mỗi bài có Đọc, Viết (chữ hoa Q R S T U Ư V X Y A M N Q V, nghe–viết, phân biệt chính tả, viết hoa tên riêng), Nói và nghe, Luyện tập, Đọc mở rộng.

Mục tiêu: **mọi mục nội dung của hai sách có trong game** (quest, hoặc phiếu viết in cho phần Viết), mỗi map một phần bài hợp bối cảnh của nó, mỗi map kết thúc với số bài gần bằng nhau; bài chơi được bằng trò chơi trong thế giới 3D và trong các phòng vừa dựng theo mock. Đo được: `pnpm content:gaps` báo 100% mục kiểm kê tập 2 được phủ, `content:check` đỏ khi thiếu.

## Quyết định đã chốt

Giữ nguyên mọi quyết định của plan tập 1 (`plans/dattqh/260930-0846-sgk-lop2-game-content/plan.md`): D1 dùng nguyên văn; D2 thu âm trên máy; D3 phiếu viết ngoài game; D6 chương gom nhiều quest; D8 giống sách 100% (máy kiểm); D9 phong phú, không lặp (máy kiểm); D11 luôn nói đi đâu; D12 không khóa bài; D13 hiện sách, bài, trang. Thêm (Jev, `plans/dattqh/reports/jev-261002-1139-sgk-tap2-plan.md`):

| # | Câu hỏi | Chốt |
| --- | --- | --- |
| E1 | Bài vào map nào | Theo chủ đề, cân số bài: bảng [`story-map.md`](story-map.md) (bản nháp, phase 2 chốt) |
| E2 | Map mới | Dựng **Đảo bí ẩn** theo tấm mock `designs/dao-bi-an/`; Núi tuyết để sau |
| E3 | Cách ly | Worktree `../miu-world-sgk2`, branch `dattqh/feat/sgk-lop2-tap2`, merge vào `main` sau mỗi phase |
| E4 | Mẫu trước | 4–6 quest mẫu với trò chơi mới, trang nghiệm thu, Jev duyệt, rồi mới viết hàng loạt |
| E5 | Trò chơi mới | Chơi trong thế giới 3D và các phòng (bảng trò chơi bên dưới) |

## Trò chơi mới (phase 3)

| Trò chơi | Bài | Nơi |
| --- | --- | --- |
| Chia nhóm, chia đều đồ vật (rổ trứng, giỏ táo, đàn gà) | Toán 37–45 | Nông trại: chuồng, vườn táo, nhà kho |
| Tìm khối trụ, khối cầu trong công trình | Toán 46–47 | Lâu đài: tháp, cột, đèn, đài phun |
| Xếp khối trăm–chục–đơn vị, đánh số sách trên kệ | Toán 48–52 | Thư viện: kệ sách, kho sách |
| Mua bán bằng tiền Việt Nam, so giá ba chữ số | Toán 53, 54, 56 | Chợ phiên: các gian hàng |
| Đi và đo quãng đường (dm, m, km) | Toán 55, 57, 58 | Làng Ven Sông: đường làng, cầu, bến |
| Đếm kho báu (cộng, trừ trong phạm vi 1000) | Toán 59–63, 72–75 | Đảo bí ẩn: kho báu, hang |
| Thu thập, kiểm đếm, lập biểu đồ tranh; túi may mắn | Toán 64–67 | Xóm Mái Ấm: sân, chuồng, vườn |
| Bưu thiếp, thư, thiệp chúc Tết (soạn trong game, in phiếu) | TV 4, 17–22 | Thư viện, Xóm Mái Ấm, Đảo |
| Cảnh truyện cho bài đọc và kể chuyện | TV mọi bài | Map của bài |

Mỗi trò chơi là một loại bước quest mới (schema `packages/quest`, runtime, UI), dùng chung ba lớp hỗ trợ (Hướng dẫn, Gợi ý, Đáp án), đáp án ở server, không khóa tiến trình.

## Phases

| # | Phase | Tier | Phụ thuộc | Status |
|---|-------|------|-----------|--------|
| 1 | [Kiểm kê SGK tập 2 thành dữ liệu](./phase-01-textbook-inventory.md) (`content/curriculum/toan2-t2`, `tv2-t2`): bài, mục, nguyên văn, đáp án, trang in | L | — | Chưa bắt đầu |
| 2 | [Chốt bản đồ bài](./phase-02-story-map-lock.md): bài → map → khu (chương) → phòng; kịch bản chủ điểm và dàn nhân vật mỗi map ([`story-map.md`](story-map.md)) | M | 1 | Chưa bắt đầu |
| 3 | [Schema + runtime + UI cho trò chơi mới](./phase-03-world-mini-games.md) (bảng trên), test và E2E mỗi cơ chế | XL | — (song song 1) | Chưa bắt đầu |
| 4 | [Map Đảo bí ẩn theo `designs/dao-bi-an/`](./phase-04-dao-bi-an-map.md) (800 × 800, bộ dựng chung, góc chụp từng khung, đời sống, cổng về trung tâm, khu bài học) | L | 2 | Chưa bắt đầu |
| 5 | [Khu bài học mới trên 8 map có sẵn](./phase-05-zones-on-existing-maps.md): `ZONES` thêm chương cho tập 2, chỗ quest (landmark trùng tên) trong các phòng vừa dựng | L | 2; sau pha 4 của plan mock chi tiết | Chưa bắt đầu |
| 6 | [4–6 quest mẫu đa dạng + trang nghiệm thu, Jev duyệt](./phase-06-sample-quests-acceptance.md) | M | 1, 3 | Chưa bắt đầu |
| 7 | [Kịch bản Toán tập 2](./phase-07-toan-quests.md) (39 bài) | XL | 6 | Chưa bắt đầu |
| 8 | [Kịch bản Tiếng Việt tập 2](./phase-08-tieng-viet-quests.md) (30 bài + 2 ôn tập) | XL | 6 | Chưa bắt đầu |
| 9 | [Phiếu viết tập 2](./phase-09-writing-worksheets.md) (chữ hoa, nghe–viết, viết hoa tên riêng, viết đoạn, thư, thiệp) | M | 1 | Chưa bắt đầu |
| 10 | [Kích hoạt, cổng phủ 100% tập 1 + tập 2, trang review, E2E `sgk-content`, roadmap](./phase-10-activation-coverage-review.md) | M | 4–9 | Chưa bắt đầu |

Song song: 1 ‖ 3 ngay từ đầu; sau 2: 4 ‖ 5 ‖ 9; sau 6: 7 ‖ 8. Phiên làm map (plan `261002-0802-detail-mocks-per-map`) đang chạy trên `main`: pha 4, 5 bắt đầu sau khi map nào xong việc của nó.

## Nghiệm thu

- `pnpm content:gaps --book toan2-t2` và `--book tv2-t2` báo 100%; `content:check` đỏ khi thiếu mục, lệch nguyên văn, lặp lời dẫn.
- Mỗi map có số bài trong khoảng ±2 của trung bình (khoảng 16 bài mỗi map trên 9 map, kể cả tập 1).
- Mỗi trò chơi mới có E2E chơi bằng chạm trên khung iPad, ảnh trên trang review.
- Đảo bí ẩn có ảnh đối chiếu từng khung mock như các map khác.
- Gate đủ: `assets:check` → `content:check` → `test` → `typecheck` → `lint`, build web, `security:dist`, `e2e:ci`.

## Rủi ro

- Lượng nội dung gấp đôi: số quest khoảng 140; giữ "không lặp" (D9) cần kho lời dẫn lớn hơn. Máy kiểm đã có từ tập 1.
- Đáp án mở (viết đoạn, kể chuyện) như tập 1: người viết chọn, ghi cờ cho giáo viên duyệt.
- Map mới và khu mới làm tăng số region, prop: đo lại hiệu năng khi người sở hữu yêu cầu (`perf`), ghi trang review.

## Validation log

- 02/10/2026: 5 câu qua Jev, đều auto (report trên).
