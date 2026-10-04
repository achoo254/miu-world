# Bàn giao cho Antigravity: cook các plan hoàn thiện Master Plan v3

Ngày 04/10/2026. Người nhận: phiên Antigravity trong `/Users/hoandat/inet-gitlab/miu-world`, nhánh `main`. Người sở hữu đã duyệt hết thứ tự và mọi câu hỏi mở đã được chốt (người sở hữu hoặc Jev). **Việc đầu tiên có hạn: Pha 0 trước thứ Bảy 10/10/2026.**

## Đọc trước khi làm

1. `CLAUDE.md` ở gốc repo (luật bắt buộc) và `.claude/rules/world-scenery.md` nếu chạm map.
2. `plans/dattqh/261004-1617-master-completion-roadmap/plan.md` (bản đồ, thứ tự, luật chung).
3. Plan của việc đang làm (đường dẫn ở bảng dưới) và `plans/dattqh/reports/jev-261004-1648-open-questions.md`, `jev-261004-1953-practice-surface-output.json` (quyết định đã chốt).

## Luật phải giữ (trích CLAUDE.md và quyết định của người sở hữu)

- Trả lời người sở hữu **bằng tiếng Việt**, kể cả dòng trạng thái ngắn.
- Chỉ `pnpm`. Không tạo nhánh, worktree, PR; làm trên `main`. Không deploy production khi chưa hỏi người.
- Gate trước khi báo xong: `pnpm assets:check` → `pnpm content:check` → `pnpm test` → `pnpm typecheck` → `pnpm lint`; sửa `apps/web/**` thì thêm `pnpm --filter @miu/web build`. **E2E và bộ test đầy đủ chỉ chạy khi người sở hữu yêu cầu** (máy chỉ 1 worker, không chạy song song nhiều bộ test; không chạy project `perf`).
- Repo **công khai**: không secret, IP, dữ liệu thật của bé, không commit PDF/ảnh sách. Commit conventional commits tiếng Anh, không nhắc AI, không ghi mã plan/pha trong code, tên test hay commit. Commit từng pha.
- Thưởng, XP, Xu do **server tính**; chữ hiển thị cho bé dùng `{name}`, không lặp câu (`content:check`), song ngữ qua `t()`.
- Không chống cheat, không làm báo cáo vi phạm/kiểm duyệt, không chuỗi ngày, không giới hạn giờ chơi, không mã cheat (đã chốt).
- Việc nhỏ hằng ngày tự quyết; việc đổi cách thu thập/chia sẻ dữ liệu trẻ em, chi phí, pháp lý, phạm vi sản phẩm thì hỏi người. Quyết định mơ hồ có thể gọi Jev bằng `tools/decisions/jev-decide.py` (cần `TYPESAFE_TOKEN_FILE`, xem `docs/STAG-DEV-README.md` §3; không in khóa).
- Trước khi sửa file, chạy `git status`: có file người khác (phiên Claude khác hoặc người) đang sửa dở thì không ghi đè; thêm module riêng rồi nối một dòng. Hiện ở working tree có sửa dở `tools/world/zone-map.ts`, `tools/world/generate-trung-tam-map.ts`, `assets/generated/world/trung-tam/entities.json`, `assets/manifest.json`: **không đụng generator map** cho tới khi chúng được commit.

## Thứ tự cook

| Lượt | Plan (trong `plans/dattqh/`) | Ghi chú |
| --- | --- | --- |
| 0 | `261004-1617-live-world-events/plan.md`, **chỉ Pha 0** | Hạn 10/10/2026. Chi tiết ngay dưới |
| 1 | `261004-1617-system-screens-v1/plan.md` (bỏ pha 4 chuỗi ngày) | M |
| 1 | `261004-1617-boss-skill-check-new-mechanics/plan.md` | L; trùm không đồng hồ |
| 1 | `261004-1617-parent-area-friends/plan.md` | L; không giới hạn giờ chơi, chỉ xem |
| 2 | `261004-1617-english-subject-content/plan.md` | XL; tự viết, giọng trình duyệt |
| 3 | `261004-1617-coop-quests/plan.md` | L; bạn máy chỉ khi phụ huynh bật |
| 4 | `261004-1617-live-world-events/plan.md` các pha 1–7 | XL; có bản kỷ niệm |
| xuyên suốt | `261004-1617-mvp-gate-launch-readiness/plan.md` | L |
| hoãn | `261004-1617-moderation-safety/plan.md` | Không làm cho tới khi có người ngoài gia đình chơi |

Các plan đang chạy ở phiên khác (`261003-1602`, `261004-1035`, `261003-2330`, `261004-1540`) giữ nguyên chủ; lượt 1 chỉ nối vào khi chúng đã commit phần liên quan.

## Lượt 0: Pha 0 "Thử thách Olympic Toán" (làm ngay)

**Kết quả:** trên màn Home có banner/nút "Thử thách Olympic Toán" (Jev 04/10/2026: màn từ Home trước, **không đổi map**, cổng 3D ở Khu rừng thêm sau như lối vào thứ hai). Bé mở màn luyện phủ lên cảnh tạm dừng, theo mock cảnh (không cửa sổ trắng), mock tham khảo ở repo anh em `bai-tap-lop-2/plans/dattqh/260928-0613-the-gioi-hoc-tap-cua-miu/screens/generated/34`–`46` và `screens/extracted/06-event-timo.png`.

**Tên hiển thị:** "Thử thách Olympic Toán". **Không** dùng chữ "TIMO" ở bất kỳ chữ nào bé hay người ngoài thấy, trong nội dung công khai của repo, tên file nội dung, tên khóa dịch (đặt id kiểu `olympic-*`).

**Nội dung:**
- 5 chủ đề: tư duy logic; số học; lý thuyết số; hình học; tổ hợp. Dạng bài khối 2: cái cân, dãy số/hình có quy luật, tuổi và ngày tháng, cộng trừ 2–3 chữ số, cân bằng phép tính, chẵn lẻ, chia đều, ghép phép tính, đếm hình 2D/3D, quan sát hình khối 3D, chia đồ vật vào nhóm, đếm trường hợp, thành lập số.
- Mỗi chủ đề 8–10 câu luyện (có Hướng dẫn/Gợi ý/Đáp án giải thích như mọi thử thách); **thi thử** 25 câu trắc nghiệm, mỗi câu đúng 4 điểm (tối đa 100), sai hoặc bỏ trống không trừ điểm, đồng hồ 60 phút **tùy bé bật**, hết giờ nộp phần đã làm, không phạt. Cấu trúc này khớp vòng loại thật khối 2 ngày 10/10/2026.
- **Đề tự viết hoàn toàn mới.** Không chép đề, lời giải, hình từ `bai-tap-lop-2/content/TIMOK2.pdf` hay từ hệ thống thi của ban tổ chức (có bản quyền, cấm sao chép; repo này công khai). Chỉ dùng khung chủ đề. Độ khó tương đương khối 2, kiểm đáp án đúng bằng test (mỗi câu có đáp án tính được bằng code).
- Nội dung ở dạng dữ liệu (`content/events/` hoặc `content/olympiad/`, schema Zod trong `packages/schema`, kiểm bằng `content:check`: không trùng câu, đáp án nằm trong lựa chọn, mỗi chủ đề đủ số câu); dùng lại cơ chế thử thách sẵn có (`quiz`, `sort`, `drag-drop`, `connect`, `fill-blank`, `classify`).
- Hình dùng Fluent Emoji/asset sẵn trong manifest; hình thêm mới theo quy trình `pnpm assets:props` rồi `pnpm assets:manifest`.

**Thưởng:** huy hiệu theo điểm bé tự đạt, 4 bậc: Khuyến khích ≥ 20, Đồng ≥ 40, Bạc ≥ 60, Vàng ≥ 80 (trên 100), không xếp hạng với ai. **Server chấm điểm từ đáp án bé gửi và ghi huy hiệu**; đáp án đúng không nằm trong bundle web (`pnpm security:dist` phải sạch). Chơi lại được, mỗi lượt thi thử trả đủ thưởng như quy ước "thưởng mỗi lần chơi lại", huy hiệu giữ bậc cao nhất.

**Kiểm:** unit test cho chấm điểm (25 câu, mốc 20/40/60/80, bỏ trống, hết giờ), schema, `content:check`, gate đủ 5 lệnh + build web. Không chạy E2E trừ khi người sở hữu yêu cầu.

**Đóng:** sau 10/10/2026 màn có thể giữ làm khu luyện; quyết định giữ hay ẩn do người sở hữu.

**Bàn giao lại:** viết report ngắn ở `plans/dattqh/reports/` (đã làm gì, số câu mỗi chủ đề, kết quả 5 lệnh gate kèm số lỗi/cảnh báo, điều chưa kiểm), cập nhật `docs/project-roadmap.md` (đánh dấu Pha 0 xong), và báo người sở hữu bằng tiếng Việt. Không deploy: hỏi người sở hữu, vì cần lên production trước 10/10 để bé dùng.

## Câu lệnh gợi ý để dán vào Antigravity

> Đọc `plans/dattqh/261004-1617-master-completion-roadmap/handoff-antigravity.md` rồi cook Lượt 0 (Pha 0 của plan `261004-1617-live-world-events`). Trả lời bằng tiếng Việt. Làm trên `main`, không đụng generator map, không deploy. Xong thì báo gate và hỏi tôi trước khi deploy.
