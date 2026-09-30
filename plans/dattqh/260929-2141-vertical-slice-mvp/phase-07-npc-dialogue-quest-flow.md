---
phase: 7
title: "NPC hội thoại + mở đầu quest + tracker"
status: completed
priority: P1
effort: "M"
dependencies: [3, 5, 6]
---

# Phase 7: NPC hội thoại + mở đầu quest + tracker (SLICE-05, task #14)

## Goal
Gặp NPC → hội thoại (M3.3) → nhận quest (M2.2) → tracker chỉ bước hiện tại; mọi bước `dialogue`/`search` hoàn thành qua server. Bước `read` và `riddle` (dùng khung thử thách + panel hỗ trợ) do phase 8 làm.
<!-- Updated: Red Team - phase 7 gọi `read` dùng khung thử thách/quiz của phase 8 trong khi phase 8 phụ thuộc phase 7 (vòng phụ thuộc); chuyển UI read/riddle sang phase 8 -->
<!-- Updated: Validation - Jev offline_behavior=block_with_retry (0.99): mất mạng thì giữ UI, hiện banner, khóa nút gửi, tự thử lại khi có mạng; không tính hay xếp hàng cục bộ -->
<!-- Updated: Validation - Jev streak_in_mvp=defer_v1: không có UI chuỗi ngày ở HUD/dialogue -->
<!-- Updated: Red Team - `speechSynthesis` trên Chrome/Edge có giọng "remote" (localService=false) gửi văn bản ra máy chủ của hãng, trái §9 không dịch vụ bên thứ ba -->
- "Nghe lại": chỉ dùng giọng `localService === true` của `speechSynthesis` (`vi-VN`); nếu không có giọng cục bộ hoặc không hỗ trợ thì ẩn nút; test chọn giọng bỏ giọng remote.

## Requirements
- Dialogue UI (M3.3): bong bóng tên NPC + lời thoại, lựa chọn "Giúp tớ nhé! / Cho tớ hỏi thêm… / Xem nhiệm vụ"; nút "Nghe lại" dùng Web Speech API (`speechSynthesis`, `vi-VN`, bỏ qua nếu không hỗ trợ — không dịch vụ ngoài).
- Controller quest phía web (`apps/web/src/ui/quest/quest-controller.ts`, không trong runtime game): nhận `interaction {targetId}` → tìm step hiện tại khớp target → mở UI tương ứng (dialogue/read/riddle/challenge) → gọi API → cập nhật store + `set-world-state`.
<!-- Updated: phase 2 - step `trigger: "auto"` (ch1: `read-letter` mở ngay khi tìm đủ 3 manh mối; `open-gate` ngay sau `open-chest`, là bước trả thưởng) do controller tự gửi/mở ngay khi bước trước xong, không chờ tương tác; thiếu bước này thì trẻ mở rương mà không nhận thưởng. -->
- Step `trigger: "auto"`: controller mở/gửi ngay khi bước trước xong (ch1: đọc lá thư sau khi tìm đủ manh mối; mở cổng ngay sau rương, bước cuối nên thưởng trả ở đây).
- Tracker HUD: tiêu đề bước hiện tại + tiến độ tìm (0/3); mũi tên chỉ hướng tới target (game vẽ, nhận target id qua lệnh bridge).
- Bước `search`: controller gửi `{ target }` cho từng manh mối chạm được (thứ tự tùy ý); tracker "n/3" chỉ lấy từ response server; chạm lại manh mối đã tìm không đổi gì.
- Bước `read`, `riddle`: controller chỉ định tuyến tới màn của phase 8 (handler `read`/`riddle` có sẵn khung rỗng ném "chưa hỗ trợ" trong phase này và được phase 8 hiện thực).
- Mất mạng giữa chừng: giữ UI, hiện banner (phase 1), khóa nút gửi và tự thử lại khi có mạng; không tính cục bộ, không xếp hàng hành động.

- Mọi chữ lấy từ quest (lời thoại, tiêu đề, tracker) đi qua `fillPlayerName(text, character.name)`; không hiển thị `{name}` thô và không cứng "Miu" (chỉ thị người sở hữu 2026-09-30, xem plan.md).

## Files
- Create: `apps/web/src/ui/dialogue/*.tsx`, `apps/web/src/ui/quest/*.ts(x)` (+ test), `apps/web/e2e/quest-flow.spec.ts`
- Modify: `apps/web/src/ui/play/play-screen.tsx`, `apps/web/src/game/game.ts` (xử lý lệnh `set-target-hint` đã khai báo kiểu ở phase 1; mũi tên chỉ hướng)

## Steps
1. Test trước: controller map target→step, gọi API đúng, không tiến khi server báo sai; dialogue a11y; speech tắt êm khi không hỗ trợ.
2. UI + controller + tracker.
3. E2E `quest-flow`: nói chuyện với Vẹt → nhận quest → tìm 3 manh mối theo thứ tự đảo (spawnAt) → tracker 3/3 → Vẹt/Hải ly hội thoại. (Đọc lá thư và cây cổ thụ được thêm vào E2E này ở phase 8.)

## Verification
- `pnpm vitest run --project web`; E2E `quest-flow` xanh (dùng tài khoản setup + server PGlite); `pnpm --filter @miu/web e2e:ci` xanh

## Kết quả (2026-09-30)
- Hội thoại M3.3 (`ui/dialogue/`): tên + ảnh NPC, từng câu, lựa chọn của nội dung kèm câu đáp, "Xem nhiệm vụ", "Nghe lại" chỉ với giọng `vi` cục bộ (`localService`), không có thì ẩn nút; mọi chữ qua `fillPlayerName`.
- Controller (`ui/quest/`): hàm thuần `quest-flow.ts` (bước theo target, bước `auto`, mũi tên, trạng thái thế giới, đếm manh mối) + hook `use-quest-controller.ts` nghe event qua store; tìm manh mối gửi `{ target }`, số n/3 lấy từ server; bước `auto` tự chạy (đọc thư, mở cổng); mất mạng chặn + thử lại đúng lệnh đang chờ; game dừng render khi hội thoại/thử thách mở.
- Không lặp: `freshPicker` (`packages/quest/src/pick-fresh.ts`) cho câu "chưa đến lượt"/"tìm thấy"; hiển thị `feedback` của server khi có.
- Mũi tên chỉ hướng trong game (`set-target-hint`, 1 draw call). E2E `quest-flow`: Vẹt → nhận quest → mũi tên chỉ `clue-box` → tìm 3 manh mối theo thứ tự đảo → 3/3 → bước đọc thư tự mở; NPC chưa tới lượt không lặp câu.
- Bước `read`/`riddle`/`challenge` hiện khung "sắp có" tới phase 8.

## Risk
- Controller phình to: tách theo loại step, mỗi handler một file.
