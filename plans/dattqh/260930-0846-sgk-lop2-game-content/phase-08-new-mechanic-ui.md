---
phase: 8
title: "UI cơ chế mới"
status: pending
priority: P1
effort: "L"
dependencies: [2]
---

# Phase 8: UI cơ chế mới

## Goal
Mọi cơ chế mới của phase 2 chơi được trên web bằng chuột, cảm ứng và bàn phím, trong khung thử thách + 3 lớp hỗ trợ của VS phase 8, với minh họa vẽ lúc chạy.

## Điều kiện bắt đầu
VS phase 8 (`challenge-frame`, `support-panel`, handler trong `quest-controller`) và VS phase 1 (token, kit, `e2e:ci`) đã merge vào `main`.

## Requirements
- Component (`apps/web/src/ui/challenge/mechanics/`): `classify-challenge` (kéo thẻ vào nhóm bằng Pointer Events; phương án chạm-chạm và bàn phím: chọn thẻ → chọn nhóm), `fill-blank-challenge` (ô trống chọn từ danh sách), `multi-select-challenge`, `clock-challenge` (đọc giờ: chọn/nhập; đặt giờ: kéo kim hoặc nút +/−), `calendar-challenge` (lưới tháng, chọn ngày), `connect-challenge` (chạm điểm A rồi B để nối đoạn; hiện độ dài nếu có); `read-step` của VS 8 thêm `textRef` (lấy từ `texts` của `QuestView`) + nút nghe (`speechSynthesis`, giọng local; không có thì ẩn nút); `sort` hỗ trợ item có tranh.
- Minh họa (`apps/web/src/ui/challenge/illustrations/`): SVG theo `IllustrationRef` — `clock`, `number-line`, `ruler`, `scale` (cân đĩa + quả cân kg), `jug` (ca/can lít), `shapes` (điểm, đoạn, tứ giác theo tọa độ), `polyline` (đường gấp khúc có nhãn cm), `picture-card` (icon Fluent + chú thích). Màu từ token CSS.
- Đăng ký handler từng cơ chế trong `quest-controller` (1 dòng/cơ chế); UI chỉ gửi `answer`, server chấm.
- a11y: dùng được bằng bàn phím, có nhãn cho trình đọc màn hình, `touch-action` đúng cho kéo trên iPad.
- E2E project `sgk-mechanics` trong `apps/web/playwright.config.ts`.

## Files
- Create: `apps/web/src/ui/challenge/mechanics/*.tsx` (+ test), `apps/web/src/ui/challenge/illustrations/*.tsx` (+ test), `apps/web/e2e/sgk-mechanics.spec.ts`
- Modify: `apps/web/src/ui/quest/quest-controller.ts` (đăng ký), `apps/web/src/ui/challenge/read-step.tsx` (textRef, nghe), `apps/web/playwright.config.ts` (project)

## Steps
1. Test trước: mỗi component render từ bước mẫu (fixture dạng `QuestView`), thao tác chuột/cảm ứng/bàn phím tạo đúng `answer`; minh họa đúng số kim/vạch/đỉnh theo params.
2. Hiện thực; E2E chơi quest fixture `quest-sgk` (phase 2) qua mọi cơ chế với `hasTouch`.
3. Ảnh chụp từng cơ chế cho trang review.

## Verification
- `pnpm --filter @miu/web test`; `pnpm --filter @miu/web build`; `pnpm --filter @miu/web e2e --project setup --project sgk-mechanics`

## Risk
- Kéo thả trên iPad: dùng lại pattern Pointer Events của VS 8; mọi cơ chế kéo có phương án chạm-chạm.
