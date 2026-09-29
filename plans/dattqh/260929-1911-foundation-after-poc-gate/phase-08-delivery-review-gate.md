---
phase: 8
title: "Trang review + gate"
status: pending
priority: P1
effort: "S"
dependencies: [7]
---

# Phase 8: Trang review + gate

## Overview
Kết thúc đợt bằng một lần duyệt cuối (CLAUDE.md, Master Plan §17): người duyệt xem trang review, chơi thử, chọn biến thể Miu, đọc báo cáo bảo mật.

## Requirements
- `apps/web/review.html` thêm mục: biến thể Miu (từ phase 6) + form chọn; báo cáo bảo mật (session, CSRF, IDOR, chống gian lận, Semgrep, `pnpm audit`); bảng dependency mới của đợt; bảng license (có sẵn); hiệu năng.
- Chạy lại perf một lần (project `perf`, được phép trong phase này vì runtime đã chuyển chỗ) → `assets/generated/review/perf.json`, so với số POC; thêm viewport iPad Gen 10 (820×1180 @2x, cảm ứng) vào ma trận.
- Máy chuẩn iPad Gen 10 (quyết định người sở hữu 2026-09-29): người duyệt mở `/play` qua LAN trên iPad ở `?quality=mid`, đi dạo 2–3 phút, ghi FPS vào form duyệt; số này là điểm dữ liệu mobile thật đầu tiên. Đo đủ Low/Mid/High + nhiệt + pin 15 phút vẫn là DEVICE-01 trước MVP.
<!-- Updated: 2026-09-29 - máy chuẩn iPad Gen 10 -->
- `code-reviewer` review toàn đợt; report ở `plans/dattqh/reports/`.
- Report duyệt `plans/dattqh/reports/foundation-review-{yymmdd}.md` (mẫu: `poc-review-260929.md`): cách duyệt, đã giao, số liệu, giới hạn, quyết định.
- Sau khi người duyệt trả kết quả: áp biến thể được chọn (đổi tên thành `miu-cat`, xóa 2 biến thể còn lại, `pnpm assets:manifest`); ghi quyết định vào Master Plan §15; cập nhật `docs/project-roadmap.md` (task #2, #3, #7, #8, #9, #12 đổi trạng thái); tắt server review.

## Implementation Steps
1. Hoàn thiện review.html + chạy perf.
2. `code-reviewer`; xử lý phát hiện.
3. Chạy 4 gate + E2E `play`; phục vụ review qua LAN (cổng 4173) cho người duyệt.
4. Nhận kết quả, áp dụng, cập nhật docs, tắt server.

## Success Criteria
- [ ] Trang review đủ 6 nhóm (ảnh, bản chơi thử, hiệu năng, bảo mật, dependency mới, license)
- [ ] Người duyệt đã chọn biến thể; `content/` chỉ còn một Miu
- [ ] Roadmap + Master Plan cập nhật; mọi gate xanh; không còn tiến trình dev/preview chạy

## Risk Assessment
- Người duyệt chọn "Chỉnh thêm". Xử lý: một vòng chỉnh ở phase 6 rồi duyệt lại chỉ phần visual.
