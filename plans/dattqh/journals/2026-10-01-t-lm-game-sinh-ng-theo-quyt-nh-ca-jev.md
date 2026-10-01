---
title: Đợt làm game sinh động theo quyết định của Jev
date: 2026-10-01
summary: "Năm tính năng sinh động, cây cao hơn, 70 quest SGK vào main; staging 6c6f71e"
---

# Đợt làm game sinh động theo quyết định của Jev

## What happened
- Làm theo quyết định review của Jev (plan `plans/dattqh/261001-0941-review-decisions-jev/`): thế giới ăn mừng khi xong quest (lệnh `celebrate`, pháo giấy), đồ vật phản ứng ở mọi cơ chế (`object-reactions.ts`), sự kiện bất ngờ (`world-events.ts`: mưa rồi cầu vồng, đom đóm, thú chạy tới chào), đảo Home sống động (`stage-life.tsx`: thác chảy theo `stage-decor.json`, bướm, nhân vật vẫy tay), thú cưng (`content/pets.json`, cột `characters.pet`, migration `0003_character-pet`).
- Người sở hữu yêu cầu cây cao hơn: `treeHeight()` dùng chung, thân 6–9 khối, thêm một tầng tán; bố cục rừng gần như giữ nguyên.
- Nội dung SGK: hai agent viết 34 quest Tiếng Việt (735/735 mục) và 36 quest Toán (1033/1033 mục) trong worktree, rebase rồi fast-forward vào `main`. Tất cả ở trạng thái `draft`.

## Lessons
- Hoạt ảnh lặp vô hạn trên phần tử bấm được làm Playwright chờ "stable" mãi: animate phần ruột bên trong, không animate khung bấm.
- `renderShots` xóa sạch thư mục đích: file dữ liệu sinh ra không được nằm chung thư mục ảnh render.
- Đổi `regions.json` sang nhiều dòng làm hỏng regex `withHotspots`; đã sửa.
- Agent con chạy song song nhiều chạm giới hạn tài khoản: giữ tối đa 2.
- Lệnh xóa cache theo URL của Cloudflare không phải lúc nào cũng tới tầng cache trên.

## Verification
Gate 5 lệnh trên `main` đã gộp: 80 file / 702 test; `e2e:ci` xanh; staging `6c6f71e`, 24/24 asset khớp sha256.

## Next steps
- SGK phase 9 (đặt mục tiêu `tv2-*`/`toan2-*` lên map rừng và Trường học) và phase 10 (kích hoạt quest, bỏ `forest-ch2`).
- Hai ảnh review bản đồ trên staging sẽ tự đúng khi cache Cloudflare hết hạn (≤ 4 giờ).

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
