---
phase: 8
title: "3 thử thách Toán + hỗ trợ học"
status: pending
priority: P1
effort: "L"
dependencies: [1, 3, 7]
---

# Phase 8: 3 thử thách Toán + hỗ trợ học (SLICE-08, 09; task #17, #18)

## Goal
Kéo thả (M2.4), sắp xếp (M2.5/M3.6), trắc nghiệm có hỗ trợ (M2.6), với Hướng dẫn / Gợi ý / Đáp án kèm giải thích (M2.8) không khóa tiến trình.

## Requirements
<!-- Updated: Red Team - nhận UI bước `read` (lá thư) và `riddle` (cây cổ thụ 8 + 5) từ phase 7 để tránh vòng phụ thuộc 7 ↔ 8 -->
- Bước `read` (lá thư): màn đọc ngắn + 1–2 câu hỏi hiểu (skill `doc-hieu`) dùng khung thử thách + quiz + panel hỗ trợ; bước `riddle` (cây cổ thụ "8 + 5 = ?", M3.4): bàn phím số chạm lớn, có hỗ trợ 3 lớp. Handler của controller (`quest-controller.ts`, phase 7) được hiện thực ở đây.
<!-- Updated: Validation - Jev support_answer_penalty=xp_minus_10_percent (0.72/0.58, dưới ngưỡng): xem đáp án làm XP quest giảm 10% khi hoàn thành (Xu/Skill XP/vật phẩm giữ nguyên) và sao giảm; thông điệp UI khích lệ, hiển thị số XP thực nhận từ server -->
- Khung thử thách chung (`apps/web/src/ui/challenge/challenge-frame.tsx`): tiêu đề, thanh tiến độ bước, XP dự kiến (từ QuestView), nút Quay lại/Tạm dừng, dải nút Hướng dẫn · Gợi ý · (Làm lại) · Kiểm tra; màn cận cảnh 2D (DOM/CSS), game `stop()` khi mở (§12).
- Kéo thả: kéo quả táo vào giỏ đủ 10 (hoặc chọn số còn thiếu như M2.4); Pointer Events, vùng thả lớn ≥ 48px, không phụ thuộc HTML5 drag API (iPad).
<!-- Updated: Red Team - Safari iPad cuộn/phóng to trang khi kéo nếu thiếu touch-action; Playwright `page.touchscreen` chỉ có `tap`, không kéo -->
- Phần tử kéo/thả đặt `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`; dùng `setPointerCapture`, `pointercancel` trả vật về chỗ cũ; không để trang cuộn khi đang kéo.
- Sắp xếp: kéo đá số vào ô theo thứ tự bé→lớn, "Làm lại".
- Trắc nghiệm: 4 lựa chọn lớn, câu đề + minh họa icon.
- Hỗ trợ học: panel 3 tab (Hướng dẫn từng bước / Gợi ý / Đáp án) gọi `POST …/support`; xem Đáp án vẫn cho hoàn thành bước (server chấp nhận đáp án đúng sau khi xem); hiển thị thông điệp khích lệ, không phạt nặng (theo quyết định validation về trừ XP).
- Phản hồi đúng/sai thân thiện (không đỏ gắt), âm thanh Kenney tùy chọn (theo cài đặt âm lượng phase 1).
- a11y: thao tác thay thế bằng chạm-chọn (chạm vật rồi chạm ô) cho trẻ khó kéo.

## Files
- Create: `apps/web/src/ui/challenge/{challenge-frame,drag-drop-challenge,sort-challenge,quiz-challenge,support-panel,read-step,riddle-step}.tsx` (+ test), `apps/web/e2e/challenges.spec.ts`
- Modify: `apps/web/src/ui/quest/quest-controller.ts`, `tools/assets/sources.json`/manifest nếu thêm âm thanh từ pack Kenney đã có

## Steps
1. Test trước (web, jsdom + pointer events giả lập): mỗi loại tạo đúng `answer` gửi server; sai → thử lại; support panel gọi đúng layer; xem đáp án rồi nộp đúng → hoàn thành.
2. Component + khung.
3. E2E `challenges` (hasTouch, viewport iPad 820×1180): chạm-chọn bằng `page.touchscreen.tap` cho cả 3 thử thách; kéo thả kiểm bằng chuỗi `PointerEvent` `pointerType: "touch"` gửi qua `page.dispatchEvent`/CDP `Input.dispatchTouchEvent` (không dùng `touchscreen` vì chỉ tap); mở Đáp án một lần ở test riêng (XP thực nhận 90, xem test phase 3). Thêm vào E2E `quest-flow` (phase 7) các bước đọc lá thư và cây cổ thụ.

## Verification
- `pnpm vitest run --project web`; E2E `challenges` xanh trên viewport iPad

## Risk
- Pointer capture khác nhau giữa Safari iPad và Chromium: E2E chạy Chromium với touch; ghi rủi ro Safari vào DEVICE-01 checklist (người thử trên iPad).
