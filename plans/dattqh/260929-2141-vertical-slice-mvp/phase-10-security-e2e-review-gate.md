---
phase: 10
title: "Bảo mật, E2E trọn vòng, hiệu năng, trang review"
status: pending
priority: P1
effort: "M"
dependencies: [4, 5, 6, 7, 8, 9]
---

# Phase 10: Bảo mật, E2E trọn vòng, hiệu năng, trang review (task #22, gate)

## Goal
Chứng minh tiêu chí Master Plan §16 bằng test tự động, chạy lại perf một lần, và kết thúc đợt bằng trang review cho người duyệt cuối (§17).

## Requirements
- Test bảo mật (#22): bảng endpoint → test IDOR cho mọi endpoint mới (quests, support, `PUT /character` đồ khóa); chống gian lận: sửa request (reward, answer đúng giả, bước nhảy, gọi đồng thời, gọi support rồi dò) không đổi kết quả; CSP: E2E kiểm header/meta, không request ngoài origin trên mọi trang (`/`, `/create`, `/play`, `/review.html`).
<!-- Updated: Red Team - lộ đáp án qua bundle; nhật ký hành vi trẻ -->
- Test chống lộ đáp án: quét `apps/web/dist` (JS, JSON, HTML) không chứa đáp án hay `"answer"` của quest trong `content/quests/**`; quét mọi response API trừ `support` với `layer: "answer"` không chứa đáp án. Test dữ liệu trẻ: schema DB không có cột nội dung trả lời và không có bảng theo sự kiện có dấu thời gian về hỗ trợ/đáp án.
<!-- Updated: Validation (Jev support_answer_penalty=xp_minus_10_percent) + Red Team - level curve: 100 XP đúng ngưỡng Lv.2, xem đáp án làm còn 90 XP nên không lên level; vòng chính không được xem đáp án -->
- E2E trọn vòng (`apps/web/e2e/mvp-loop.spec.ts`, viewport iPad + touch): Google giả (dùng `apps/web/e2e/fake-google-server.ts` hiện có) → PIN → đồng ý → hồ sơ → Creator (đổi mũ) → Home → Khu rừng ch1 → Vẹt → 3 manh mối → lá thư → 3 thử thách (KHÔNG xem đáp án) → cây cổ thụ → thưởng 100 XP → Level Up Lv.1→2 → Mở khóa ch2 → Ba lô có Lá thần. Một test riêng xem Đáp án một lần và khẳng định XP thực nhận 90, không Level Up, sao 2. Chạy trong CI job `e2e` qua `e2e:ci`.
- Test "thêm quest chỉ bằng dữ liệu": fixture quest thứ hai JSON đi qua content:check + API + controller.
- Perf chạy lại một lần (project `perf`, iPad + phone) với entity mới; so ngân sách §12; ghi `perf.json`.
- code-reviewer toàn đợt + reviewer thường trực theo Master Plan; xử lý phát hiện.
<!-- Updated: Validation - Jev ipad_review_access=lan_password_login (0.73/0.47, dưới ngưỡng, người sở hữu có thể đảo). Red Team: Google chỉ nhận https hoặc http://localhost làm redirect URI nên IP LAN không hoàn tất luồng Google; tunnel là dịch vụ bên thứ ba -->
- Cách người duyệt mở trên iPad: server và bản preview chạy trên LAN (như đợt Foundation, `ALLOWED_ORIGINS` theo IP LAN) với `PASSWORD_LOGIN=1` (chỉ dev/test, bị từ chối ở production) và dữ liệu giả; không dùng dịch vụ tunnel. Nếu người sở hữu muốn thử luồng Google trên iPad thì cần một hostname https cố định đã đăng ký làm redirect URI: đó là việc của người (credential), không làm trong plan.
- Trang review: luồng MVP (ảnh từng màn), bản chơi thử qua LAN, hiệu năng, báo cáo bảo mật, dependency mới, license, danh sách nội dung học chờ giáo viên duyệt, checklist DEVICE-01 cho iPad (FPS/nhiệt/pin 15 phút ở Low/Mid/High, Safari kéo thả).
- Report `plans/dattqh/reports/mvp-slice-review-{yymmdd}.md`; cập nhật roadmap (#4, #10–#20, #22).
<!-- Updated: Red Team - quyết định validation lệch chữ Master Plan phải được ghi vào §15; docs kiến trúc/tiêu chuẩn thay đổi -->
- Ghi vào Master Plan §15 (mục "Đã chốt", đánh dấu Jev, ngày): Home là màn React với ảnh đảo render sẵn thay vì cảnh 3D dùng chung (lệch §4 và task #11); MVP chỉ Mũ + Balo, Áo/Giày/Cánh ở V1 (lệch §5); xem đáp án giảm 10% XP và quy tắc sao; chỉ đếm số lần sai/hỗ trợ, không lưu nội dung trả lời; không có chuỗi ngày (V1); Decision chỉ kể chuyện; mất mạng thì chặn và thử lại; Tính cách chỉ là nhãn.
- Docs: cập nhật `docs/system-architecture.md` (chấm thử thách ở server, dữ liệu đếm), `docs/codebase-summary.md` (thư mục `ui/kit`, `ui/challenge`, `content/quests`, `tools/content`), `docs/code-standards.md` (`content:check`, E2E projects, chống lộ đáp án), `docs/project-roadmap.md`.

## Files
- Create: `apps/web/e2e/mvp-loop.spec.ts`, test bảo mật mới trong `apps/server/src/**`
- Modify: `apps/web/review.html`, `apps/web/src/review/review-main.ts`, `docs/*` (như trên), `Miu World — Master Development Plan v3 (3D theo mockup + Multiplayer).md` (§15), `.github/workflows/ci.yml` (chỉ nếu cần thêm bước; job e2e đã gọi `e2e:ci` từ phase 1)

## Steps
1. Viết E2E trọn vòng + test bảo mật còn thiếu; chạy tới xanh.
2. Perf một lần; render-preview; manifest.
3. Review (code-reviewer + reviewer thường trực); sửa.
4. Trang review + report; mở server + preview trên LAN cho người duyệt; nhận kết quả (Jev quyết nếu người sở hữu ủy quyền); tắt tiến trình và xóa `.data/pglite` của lần duyệt.

## Verification
- 4 gate + `pnpm content:check` + `pnpm --filter @miu/web build` + `pnpm --filter @miu/web e2e:ci` (setup/account/play/creator/home/quest-flow/challenges/mvp-loop) xanh local và CI; job CI `integration` (Postgres 17) xanh với migration `0002`

## Risk
- E2E dài dễ flaky trên CI (GL phần mềm): chờ theo trạng thái (poll stats/DOM), không chờ theo thời gian.
