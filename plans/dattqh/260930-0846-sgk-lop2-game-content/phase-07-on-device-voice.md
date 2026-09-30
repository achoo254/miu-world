---
phase: 7
title: "Thu âm trên máy"
status: pending
priority: P2
effort: "M"
dependencies: [2]
---

# Phase 7: Thu âm trên máy (D2)

## Goal
Bước `speak` cho trẻ tự kể/nói, ghi âm và nghe lại giọng mình ngay trên thiết bị; bật mặc định (chỉ quyền micro của trình duyệt chặn); âm thanh không gửi đi, không lưu; không có micro vẫn đi tiếp.

## Điều kiện bắt đầu
VS phase 1 (UI kit, `playwright.config.ts` + `e2e:ci`), VS phase 8 (khung thử thách, handler `quest-controller`) đã merge vào `main`.

## Requirements
- `apps/web/src/ui/challenge/speak/speak-step.tsx`: đề + gợi ý "G:" + tranh (nếu có); nút Ghi âm/Dừng/Nghe lại/Xong. `getUserMedia({ audio: true })` → `MediaRecorder` (`mimeType` theo `MediaRecorder.isTypeSupported`: webm/opus hoặc mp4/aac cho Safari iPad) → `Blob` trong state component; phát bằng `URL.createObjectURL`; khi rời bước/unmount/ẩn tab: dừng track, `revokeObjectURL`. Giới hạn 60 giây/lần. Không gửi hay lưu âm thanh ở đâu.
- Không hỗ trợ/từ chối quyền micro → hiện "Con hãy kể cho bố mẹ nghe nhé" + Xong.
- Xong gọi `POST …/complete` với body `{}`.
- CSP bản build: thêm `media-src 'self' blob:` vào `CONTENT_SECURITY_POLICY` (`apps/web/vite.config.ts`) — hiện không có `media-src` nên `<audio src="blob:…">` bị chặn; test trong `apps/web/src/content-security-policy.test.ts`.
- E2E project `speak` trong `apps/web/playwright.config.ts` với `launchOptions.args` `--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream` (Chromium); `e2e:ci` của VS 1 chạy mọi project trừ `perf` nên CI tự nhận.

## Files
- Create: `apps/web/src/ui/challenge/speak/*.tsx` (+ test), `apps/web/e2e/speak.spec.ts`
- Modify: `apps/web/vite.config.ts` (CSP `media-src`), `apps/web/src/content-security-policy.test.ts`, `apps/web/playwright.config.ts` (project `speak`), `apps/web/src/ui/quest/quest-controller.ts` (1 handler `speak`)

## Steps
1. Test trước (Vitest + jsdom, MediaRecorder/getUserMedia giả): ghi → phát → rời bước thì track dừng và URL bị revoke; từ chối quyền → vẫn Xong; CSP có `media-src 'self' blob:`.
2. E2E Chromium micro giả trên bản build: ghi 2 giây, `<audio>` phát được (sự kiện `playing`, không có `securitypolicyviolation`), Xong → bước hoàn thành qua server.
3. Hiện thực.

## Verification
- `pnpm --filter @miu/web test`; `pnpm --filter @miu/web build`; `pnpm --filter @miu/web e2e --project setup --project speak`

## Risk
- Safari iPad: MediaRecorder từ iOS 14.3, định dạng mp4/aac — chọn `mimeType` theo khả năng trình duyệt; đo trên iPad khi có máy (DEVICE-01 của VS).
