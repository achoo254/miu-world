# Nghiệm thu MVP và sẵn sàng phát hành: hiệu năng, tài liệu, hồ sơ cho người duyệt

**Trạng thái:** đã duyệt (04/10/2026), chạy xuyên suốt và chốt cuối · **Tier:** L · **Nhánh:** `main` · **Ngày:** 04/10/2026
**Nguồn:** Master Plan §12 (hiệu năng mobile, máy chuẩn iPad Gen 10), §13 (gate), §15 (rủi ro), §16 (tiêu chí nghiệm thu: còn 3 ô chưa đạt), `docs/project-roadmap.md` mục "Nợ đã biết".

## Kết quả mong muốn

Mọi ô của Master Plan §16 có bằng chứng; phần AI làm được thì làm xong và đo được, phần của người thì có gói hồ sơ sẵn sàng để họ duyệt một lần; `docs/` và Master Plan không còn lệch so với game đang chạy.

## Không làm (ghi rõ)

- Không tự khai "đạt" các ô cần người (iPad thật, designer, giáo viên, pháp chế, bé chơi thử): AI chỉ chuẩn bị công cụ, số liệu, hồ sơ.
- Không chạy project `perf` của E2E trừ khi người sở hữu yêu cầu đo hiệu năng (mất ~30 phút, ghi đè `assets/generated/review/perf.json`).
- Không deploy production khi chưa hỏi.

## Hiện trạng đo được (04/10/2026)

Ba ô §16 còn trống: khung hình trên iPad Gen 10 (DEVICE-01), giao diện đúng mock voxel (chờ designer), một bé chơi trọn một quest (bé đã chơi từ 01/10, chờ người xác nhận). Nợ khác: đo hiệu năng iPad sau khi thêm 12 map và 141 đồ vật 3D (draw call 164 khi xe buýt qua phố trường, ngân sách ≤ 150 ở mức Cao), xác minh Google OAuth, pháp chế duyệt đồng ý draft-3 (rồi v2/v3), `README.md` và Master Plan còn câu cũ (ví dụ §4 "Home là một cảnh 3D", §5 "MVP chỉ làm Mèo", bảng §6 số màn NEW).

## Pha

| Pha | Tier | Nội dung | Ai |
| --- | --- | --- | --- |
| 1 | M | **Ngân sách hiệu năng chủ động**: rà draw call, tam giác, bộ nhớ texture của 12 map ở Low/Mid/High bằng công cụ có sẵn (`pnpm assets:preview`, đo trong render-preview), gom vật cùng mẫu (instancing/gộp xe, đồ nhỏ), chốt số liệu so với ngân sách; **không** chạy `perf` đầy đủ nếu chưa được yêu cầu | AI |
| 2 | S | **Gói đo DEVICE-01**: kịch bản đo ngắn có hướng dẫn từng bước cho người cầm iPad (mở trang `/play`, đi lộ trình định sẵn 15 phút, ghi FPS/nhiệt/pin, mẫu nhập kết quả), trang nhập số vào trang review | AI chuẩn bị, **người đo** |
| 3 | M | **Đồng bộ tài liệu**: sửa Master Plan v3 (nhật ký quyết định mới: nhà của bé, 12 map, minigame, bot, song ngữ, không mở khóa), `docs/project-roadmap.md` (thêm các plan mới, cập nhật bảng backlog), `docs/system-architecture.md`, `docs/codebase-summary.md`, `README.md`; kiểm liên kết | AI |
| 4 | M | **Trang review hợp nhất**: một trang `apps/web/review.html` mục lục theo đợt (ảnh 12 map, bản chơi thử, số hiệu năng, báo cáo bảo mật, dependency mới, bảng license, bảng endpoint) theo quy trình "mỗi đợt giao hàng kết thúc bằng một trang review" | AI |
| 5 | M | **Bảo mật toàn hệ thống**: quét lại IDOR toàn bộ endpoint mới (cửa hàng, nhà, thú cưng, bếp, bạn bè, co-op, sự kiện), bảng endpoint, quét đáp án trong bundle (`pnpm security:dist`), `pnpm audit --prod`, rà dependency mới ghi vào review | AI |
| 6 | S | **Hồ sơ cho người**: danh sách việc cần người, mỗi việc một mục (mô tả, cách làm, nơi nhập kết quả): đo iPad, designer duyệt, giáo viên duyệt (`reports/sgk-*-teacher-flags.md`), pháp chế duyệt đồng ý, xác minh Google OAuth, xác nhận bé xong một quest, đội xử lý báo cáo | AI chuẩn bị, **người làm** |
| 7 | S | **Chốt gate**: cập nhật checklist §16 theo bằng chứng thật, ghi ô nào còn chờ ai | phiên chính |

## Phụ thuộc và file dùng chung

- Pha 3–4 phải làm sau khi các plan khác đóng để không lệch lần nữa; có thể làm từng phần mỗi khi một plan đóng.
- Pha 1 có thể đụng generator và cách dựng map (shared với các phiên đặt NPC/nội dung): chạy khi không có phiên sinh lại map khác.
- `docs/` giới hạn 800 dòng mỗi file (`docs.maxLoc`): tách file khi vượt.

## Tiêu chí xong

- Số draw call/tam giác/bộ nhớ của 12 map trong ngân sách ở Mid và High (số liệu ghi trong report), hoặc có danh sách vật còn vượt kèm cách xử lý.
- Gói đo iPad dùng được: người đo không cần hỏi thêm.
- `docs/` và Master Plan khớp game đang chạy (quét liên kết, quét số liệu cũ); roadmap liệt kê đủ plan.
- Trang review mở được và có đủ mục; checklist §16 phản ánh đúng.
- Gate chung đủ 5 lệnh + build web + `pnpm security:dist`.

## Câu hỏi mở (cần người sở hữu)

1. Khi nào định mở cho người ngoài gia đình (số bé, ngày)? Quyết định thứ tự pháp lý/OAuth/kiểm duyệt phụ thuộc điều này.
2. Có cho chạy project `perf` (30 phút, ghi đè `perf.json`) trong phiên này không, hay chỉ đo trên iPad thật?
