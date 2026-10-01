# Vertical slice MVP: report cuối đợt (2026-09-30)

Plan: `plans/dattqh/260929-2141-vertical-slice-mvp/` — 10/10 phase xong. Trang review cho người duyệt: `apps/web/review.html` (`/review.html` trên bản preview). Đợt này làm song song với plan nội dung SGK (worktree `../miu-world-sgk`) và một phiên restyle giao diện; phối hợp qua tin nhắn giữa phiên.

## Kết quả

Một bé chơi được trọn vòng MVP bằng chạm trên khung iPad: đăng nhập phụ huynh → PIN → đồng ý → hồ sơ → tạo nhân vật (đổi mũ, chọn tên) → Home (đảo) → Khu rừng bí mật ch1 → Vẹt giao nhiệm vụ → 3 manh mối → lá thư → Hải ly: kéo 10 quả táo, chia kẹo → xếp đá qua suối → câu đố cây cổ thụ 8 + 5 → mở rương → 3 sao, +100 XP, Lá thần → Lv.1 → 2 → mở chương 2 (sắp có) → Ba lô có Lá thần. Toàn bộ vòng này là E2E `mvp-loop` (viewport 820×1180, touch thật qua CDP), xanh.

## Tiêu chí Master Plan §16

| Tiêu chí | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Chọn Mèo, đặt tên, đổi trang phục thấy ngay trên voxel, vào thế giới | Đạt | E2E `creator`, `mvp-loop` (`__miuPreview.outfit`, `stats.outfit`) |
| Di chuyển joystick + bàn phím, va chạm, camera không xuyên khối | Đạt | E2E `play` (đi/chạy, rìa bản đồ, camera sát cây cổ thụ `cameraInsideBlock=false`) |
| Tương tác NPC và ≥ 3 vật thể | Đạt | E2E `play`: prompt + tương tác cho 9 target (2 NPC, 4 vật, cây đố, rương, cổng) |
| Quest có câu chuyện, đủ 8 pha, ≥ 2 cơ chế ngoài trắc nghiệm | Đạt | `forest-ch1`: hội thoại, tìm vật, đọc, kéo thả, sắp xếp, trắc nghiệm, đố, thưởng, mở khóa |
| Đố 8 + 5 trên cây cổ thụ mở đường tiếp | Đạt | Bảng đố vẽ lúc chạy; `content:check` so bảng với câu hỏi |
| Hướng dẫn, Gợi ý, Đáp án hoạt động, không khóa tiến trình | Đạt | E2E `challenges` (mở cả 3 lớp rồi vẫn xong chương) |
| XP, Xu, Skill XP, mở khóa do server tính; sửa client không đổi kết quả | Đạt | `quest-routes.test.ts` (bỏ giá trị client, lặp, nhảy bước, đồng thời, chuỗi ngẫu nhiên) |
| Xem đáp án giảm 10% XP, sao do server tính; vòng chính lên Lv.2 | Đạt | E2E `challenges` (90 XP, 2 sao, không Level Up), `quest-flow`/`mvp-loop` (100 XP, Lv.2) |
| Chỉ lưu bộ đếm theo bước; đáp án không có trong bundle | Đạt | `security/child-data.test.ts`, `pnpm security:dist` (CI), E2E `mvp-loop` quét response API |
| Hoàn thành mở khóa chương 2 ("sắp có") | Đạt | Màn Mở khóa + màn khu vực |
| IDOR + CSP; không script/analytics bên thứ ba | Đạt | `security/endpoint-table.test.ts` (mọi route ngoài danh sách công khai trả 401; route `:id` trả 404 cho nhà khác), E2E kiểm CSP + không request ngoài origin trên `/`, `/create`, `/play`, `/review.html` |
| Thêm quest mới chỉ bằng dữ liệu | Đạt | `quest-routes.test.ts` "plays a quest that was added only as a JSON file"; `content:check` với quest thứ hai (plan SGK) |
| Gate + E2E trọn vòng xanh; ngân sách §12 | Đạt ở local | 5 gate + build + `security:dist` xanh; `e2e:ci` 28/28; perf bên dưới. CI chưa chạy (chưa push) |
| Trang review; nội dung học đánh dấu chờ giáo viên | Đạt | `review.html` mục "Nội dung học chờ giáo viên duyệt" |

## Hiệu năng (một lần, `perf.json`)

Giả lập trên Apple M4 (ANGLE Metal), CPU chậm 4× và 6×, viewport iPad Gen 10 và phone, 60 s mỗi mức, lộ trình autopilot: 12/12 tổ hợp đạt ngân sách. FPS trung bình 60 (chạm vsync), p5 thấp nhất 52.4; draw call cao nhất 108 (≤ 150), tam giác cao nhất 27k (≤ 150k), tải vùng đầu 0.85 MB nén (≤ 8 MB). Số máy thật: DEVICE-01.

Trong đợt, thêm vật thể tương tác làm draw call ở mức Cao lên 157 (E2E `play` bắt được); đã giảm còn 146 ở điểm xuất phát bằng cách manh mối nhỏ không đổ bóng và model nhiều phần chỉ phần lớn nhất đổ bóng.

## Review code toàn đợt

`plans/dattqh/reports/code-reviewer-260930-vertical-slice-review.md`: 0 critical, 1 high, 3 medium, 10 low. Xử lý (commit `548ebbe` và sau đó):

| # | Phát hiện | Xử lý |
| --- | --- | --- |
| H1 | Chạm táo rồi chạm giỏ bị bỏ chọn ngay (click nổi bọt); bàn phím không chọn được | Sửa: chọn trong `onClick` của ô (chặn nổi bọt, dùng được Enter/Space), bỏ click sau khi kéo, cờ kéo xóa mỗi lần chạm mới (test tìm thêm lỗi ô bị gắn lại sau khi thả). Unit test bắn đủ chuỗi pointerdown/up/click; E2E `challenges` thêm đường chạm-chọn |
| M1 | Phím E/Space bấm lúc có hội thoại chạy lại khi game tiếp tục | Sửa: `PlayerInput.clear()` khi `stop()` và khi chạy lại; unit test |
| M2 | Chọn đồ lúc preview chưa tải xong thì preview không đổi | Sửa: nghe `set-outfit` từ đầu, mặc bộ mới nhất khi tải xong |
| M3 | `/play` không có `?quest=`: xong quest thì không có màn thưởng | Sửa: quest của lượt chơi chốt một lần khi vào `/play` |
| L1 | Game vẫn chạy dưới banner mất mạng; lệnh chờ có thể bị thay | Sửa: banner che game (dừng render), bỏ qua tương tác mới khi đang chờ thử lại |
| L2, L3 | `{name}` chưa điền ở tên vùng/tagline/tên vật phẩm; vài câu gọi "bé" | Sửa |
| L4 | Nút Âm thanh không tắt gì | Sửa: "Nghe lại" im lặng và ẩn khi tắt; gom thành `SoundToggle` |
| L5 | "Chơi lại" quest đã xong chỉ ra câu "chưa đến lượt" | Sửa: nhãn "Dạo lại khu rừng", pool câu "đã hoàn thành" xoay vòng |
| L6 | Công tắc dev (`spawnAt`, `outfit`…) có trong bản production | Giữ: E2E chạy trên bản production cần chúng; server vẫn chấm mọi thứ nên không gian lận được; `outfit` chỉ đổi hình phía client. Xem lại khi mở cho người dùng thật |
| L7 | Chữ bảng đố cứng trong generator | Sửa: `content:check` báo đỏ khi bảng lệch câu hỏi |
| L8 | Game tạo lại thì thế giới không đồng bộ lại | Hoãn: không có đường nào trong app làm đổi trang bị giữa `/play`; ghi nợ |
| L9 | `security:dist` là heuristic | Ghi rõ trong code: đây là chốt chặn phụ; bảo vệ thật là `QuestStepPublic` bỏ đáp án ở server |
| L10 | Lệnh E2E trong `CLAUDE.md` cũ | Sửa: `pnpm --filter @miu/web e2e:ci` |

Quy trình: commit `cbfc64b` được tạo khi `pnpm typecheck` đỏ (chỉ chạy vitest + lint); phiên SGK phát hiện, sửa ở `acf1d8f`. Sau đó mọi commit chạy đủ gate.

## Chỉ thị của người sở hữu trong đợt

- "Miu" chỉ là tên game: mọi chữ trong game gọi người chơi bằng tên nhân vật (`{name}`, `fillPlayerName`); `content:check` chặn chữ quest cứng "Miu"; nhân vật mới phải chọn tên. Master Plan §15 #29.
- Nội dung không lặp: pool phản hồi đúng/sai trong nội dung (server trả câu luân phiên), `freshPicker` cho mọi câu lặp ở UI. Master Plan §15 #30.
- Các quyết định Jev của plan ghi vào Master Plan §15 #21–#28.

## Ghi nhận

- Test server chập chờn khi máy tải nặng (nhiều phiên cùng chạy test/E2E): `auth-routes.test.ts` và `quest-routes.test.ts` thỉnh thoảng nhận 401/404/503 ở một test khác nhau mỗi lần; chạy riêng thì xanh (53/53). Có từ trước đợt, chưa điều tra nguồn gốc.
- Không thêm dependency. Script mới: `assets:home`, `security:dist`, `e2e:ci`.
- Ảnh vòng MVP cho trang review: `assets/generated/review/mvp/*.png` (sinh bởi `REVIEW_SHOTS=1` E2E `mvp-loop`).

## Việc của người trước nghiệm thu MVP

1. DEVICE-01: đo iPad Gen 10 (FPS 15 phút ở Thấp/Vừa/Cao, nhiệt, pin, kéo thả trên Safari) — checklist trong trang review.
2. Giáo viên duyệt nội dung học của ch1 (5 bước học, 3 lớp hỗ trợ, câu phản hồi).
3. Designer duyệt UI và mock voxel (#23); chơi thử với trẻ có phụ huynh đồng ý (#24).
4. Pháp chế duyệt văn bản đồng ý (draft-3).
5. Duyệt trên iPad qua LAN: chạy server với `ALLOWED_ORIGINS=http://<ip-LAN>:4173`, `PASSWORD_LOGIN=1` và `PGLITE_DIR=.data/pglite-review` (dữ liệu giả, tách khỏi dữ liệu dev), bản preview với `--host`; xong thì tắt tiến trình và chỉ xóa `.data/pglite-review`. Không xóa `.data/pglite`: đó là dữ liệu dev của người phụ trách (tài khoản, hồ sơ, tiến độ).

## Câu hỏi mở

- Có giữ công tắc dev (`?spawnAt`, `?outfit`, `?stats`) trong bản cho trẻ dùng thật không? Nếu không, cần một biến build riêng cho E2E (L6).
