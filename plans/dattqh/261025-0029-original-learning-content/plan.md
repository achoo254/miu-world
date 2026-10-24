---
title: "Nội dung học tự viết, tổ chức theo chủ đề, bỏ khái niệm sách và lớp"
description: "Thay toàn bộ văn bản SGK Toán 2 và Tiếng Việt 2 tập một chép nguyên văn (kiểm kê content/curriculum và 70 quest) bằng nội dung tự viết, tổ chức theo Môn → Chủ đề → Mục tiêu bám Chương trình GDPT 2018, không nhắc sách, bài, trang hay lớp, để sau này thêm nội dung các lớp khác mà không đổi schema."
status: in-progress
priority: P1
effort: "XL"
branch: main
tags: [content, legal, schema, frontend, backend, seo, marketing]
blockedBy: []
blocks: []
created: 2026-10-25
---

# Nội dung học tự viết, tổ chức theo chủ đề

## Bối cảnh

Hiện game chép nguyên văn hai sách Kết nối tri thức (Toán 2, Tiếng Việt 2 tập một): `content/curriculum/` (13 file, khoảng 1 MB, 1.768 mục kiểm kê) và 70 quest `toan2-*` (36), `tv2-*` (34), gồm câu lệnh, số liệu, đáp án và bài đọc của tác giả còn bảo hộ (ví dụ "Tôi là học sinh lớp 2" của Văn Giá). Máy còn **bắt buộc** chép đúng từng chữ (D8 của plan [`260930-0846-sgk-lop2-game-content`](../260930-0846-sgk-lop2-game-content/plan.md)). Repo công khai trên GitHub nên văn bản đó đang được phát hành cùng mã nguồn. Phân tích dẫn tới plan này nằm ở cuộc trao đổi ngày 25/10/2026 (gỡ nội dung học là không nên; rủi ro thật là bản quyền văn bản SGK).

## Quyết định đã chốt (người sở hữu, 25/10/2026)

| # | Câu hỏi | Chốt |
| --- | --- | --- |
| N1 | Bám SGK tới đâu | **Bỏ hẳn khái niệm sách và lớp.** Sản phẩm không nhắc "lớp 2", SGK, tên sách, số bài, số trang. Nội dung tổ chức theo **Môn → Chủ đề → Mục tiêu**, để sau này thêm nội dung lớp 3 tới 12 chỉ là thêm chủ đề. Thay D1, D8, D13 của plan tập một. |
| N2 | Bài đọc Tiếng Việt | **Dân gian + tự viết.** Ưu tiên ca dao, đồng dao, câu đố, truyện cổ tích (truyện kể lại bằng lời của mình) và tác giả đã hết thời hạn bảo hộ; còn lại tự viết. Mỗi bài đọc khai nguồn. |
| N3 | Lịch sử git công khai | **Giữ lịch sử**, chỉ thay từ commit mới. Không filter-repo, không force-push. |
| N4 | Duyệt nội dung | **Mẫu trước, rồi máy kiểm.** 4–6 quest mẫu để người sở hữu duyệt trên trang nghiệm thu; sau đó AI viết hàng loạt, máy kiểm và Jev soát từng đợt; người sở hữu duyệt trang review cuối. |

Quyết định kỹ thuật (agent tự chốt, ghi lại để người duyệt thấy):

| # | Chốt | Lý do |
| --- | --- | --- |
| T1 | Mục tiêu viết theo **yêu cầu cần đạt của Chương trình GDPT 2018** (Thông tư 32/2018/TT-BGDĐT). Mỗi chủ đề mang siêu dữ liệu nội bộ `gdpt` (môn, lớp, mạch nội dung) chỉ để căn chỉnh và mở rộng, **không hiện ra giao diện**. | Chương trình là văn bản quy phạm pháp luật, không thuộc đối tượng bảo hộ quyền tác giả (Luật SHTT Điều 15), nên trích được; SGK thì có bảo hộ. Có `gdpt.grade` thì thêm lớp 3+ không phải migration. |
| T2 | **Giữ nguyên id quest và id bước** (`tv2-t01-b01`…, coi là id mờ, không hiện ra). | Tiến độ người chơi khóa theo `(childId, questId, stepId)` (`apps/server/src/db/schema.ts:171-176`); đổi id là phải migration DB production. Quest mới sau này dùng id theo chủ đề. |
| T3 | **Kiểm chống chép bằng máy**: sinh vân tay băm n-gram từ văn bản SGK hiện có **trước khi xóa**, commit tệp băm HMAC có khóa bí mật (khóa ngoài git, ở iCloud và CI secret; không có khóa thì không thử đoán được chữ). `content:check` báo lỗi khi chữ trong quest trùng vân tay. Danh sách quest chưa viết lại chỉ được co lại; khi rỗng thì kiểm thành cổng cứng. | Thay D8 (bắt buộc giống sách) bằng luật ngược lại, CI kiểm được mà không cần file SGK. |
| T4 | URL công khai `/bai/<slug>/` chuyển **301** sang trang chủ đề `/hoc/<mon>/<chu-de>/`; sitemap và bảng route analytics đổi theo. | Giữ thứ hạng SEO đã có; slug cũ đang lấy từ tên bài của sách. |
| T5 | Deploy **theo đợt** (sau pha 2, rồi sau mỗi đợt quest viết lại); mỗi lần deploy hỏi người sở hữu như quy định trong `CLAUDE.md`. | Rút ngắn thời gian văn bản SGK còn chạy trên production. |
| T6 | Giữ nguyên D2 (thu âm trên máy), D3 (phiếu viết ngoài game), D9 (phong phú, không lặp), D11 (luôn nói đi đâu), D12 (không khóa bài) của plan tập một. | Các quyết định này không dính tới bản quyền. |
| T7 | Plan tập hai [`261002-1139-sgk-lop2-tap2-content`](../261002-1139-sgk-lop2-tap2-content/plan.md) (đang `deferred`) chuyển `superseded`: nội dung sau này viết theo khung chủ đề của plan này. | Plan đó dựa trên D1/D8 (chép nguyên văn). |

## Phases

| # | Phase | Tier | Phụ thuộc | Status |
|---|-------|------|-----------|--------|
| 1 | [Khung Môn → Chủ đề → Mục tiêu, schema quest mới, kiểm chống chép](./phase-01-learning-framework-schema-copy-guard.md) | L | — | done |
| 2 | [Gỡ sách, lớp, bài, trang khỏi bề mặt sản phẩm](./phase-02-product-surface-without-book-grade.md) | L | 1 | pending |
| 3 | [Quest mẫu và trang nghiệm thu (người sở hữu duyệt)](./phase-03-sample-quests-acceptance.md) | M | 1 | pending |
| 4 | [Viết lại 36 quest Toán](./phase-04-rewrite-math-quests.md) | L | 3 (đã duyệt) | pending |
| 5 | [Viết lại 34 quest Tiếng Việt](./phase-05-rewrite-vietnamese-quests.md) | XL | 3 (đã duyệt) | pending |
| 6 | [Phiếu viết từ nội dung mới](./phase-06-worksheets-from-new-content.md) | M | 1; nội dung từ 4, 5 | pending |
| 7 | [Xóa kiểm kê SGK, cổng cứng, tài liệu, review, release](./phase-07-remove-inventory-hard-gate-docs-release.md) | M | 2, 4, 5, 6 | pending |

Song song: 2 ‖ 3 sau pha 1. Sau khi mẫu được duyệt: 4 ‖ 5 (chia tiếp theo chủ đề, mỗi người viết sở hữu trọn file quest của mình), 6 chạy phần code ngay sau pha 1 và phần nội dung theo từng đợt của 4, 5.

## Tiêu chí nghiệm thu

1. `content/curriculum/` không còn; kiểm chống chép là cổng cứng trong `content:check` (danh sách quest chưa viết lại rỗng và đã xóa); CI xanh.
2. Giao diện game, trang công khai (`index.html`, trang chủ đề, sitemap), chuỗi i18n, tài liệu store và công cụ clip mới không còn "lớp 2", "lớp Hai", "SGK", "sách giáo khoa", "Grade 2", tên sách, số bài hay số trang; một kiểm tra máy trong `content:check` chặn các cụm này quay lại.
3. Thêm một chủ đề có `gdpt.grade` khác 2 chỉ cần thêm file nội dung, không sửa schema hay code (có test với chủ đề mẫu lớp 3 trong fixture).
4. 70 quest vẫn `active` với id cũ; mọi mục tiêu của các chủ đề đang dùng có quest phủ (`pnpm content:gaps` báo 100% theo mục tiêu); tiến độ cũ của người chơi giữ nguyên (test trên dữ liệu fixture có tiến độ của quest cũ).
5. Bài đọc nào cũng khai `source` (`folk`, `public-domain` kèm tác giả và năm mất, hoặc `original`); máy kiểm năm mất theo luật 50 năm.
6. URL `/bai/<slug>/` cũ trả 301 tới trang chủ đề tương ứng (test nginx).
7. Phiếu viết in được từ nội dung mới (E2E `worksheets` xanh trên CI).
8. Người sở hữu đã duyệt quest mẫu; mỗi đợt viết hàng loạt có quyết định Jev ghi trong `reports/`; trang review cuối đã duyệt trước khi release production.

## Rủi ro chính

| Rủi ro | Giảm thiểu |
| --- | --- |
| Văn tự viết bằng AI nhạt, đều giọng, sai độ khó | Mẫu trước (N4); bài đọc ưu tiên dân gian (N2); máy kiểm độ dài, từ ngữ, dạng bài; D9 vẫn áp. |
| Vân tay báo nhầm cụm chữ thông dụng ("phép cộng trong phạm vi 20") | Shingle 7 từ, ngưỡng nhiều shingle liên tiếp, danh sách cụm chung được phép có lý do; chỉ áp cho chữ dài hơn ngưỡng. |
| Bản dân gian vô tình lấy đúng bản đã biên tập trong SGK | Truyện cổ tích luôn kể lại bằng lời mình; ca dao, đồng dao dùng bản truyền thống và khai nguồn; vân tay vẫn quét, trùng thì phải giải thích trong `source`. |
| Văn bản SGK vẫn tìm được trong lịch sử git | Chấp nhận (N3). Nếu có yêu cầu gỡ, xử lý lúc đó (filter-repo là phương án dự phòng). |
| Mất thứ hạng SEO của trang bài | 301 từ URL cũ (T4), sitemap có `lastmod` mới. |
| Clip YouTube đã đăng còn hiện tên bài, chữ "lớp 2" | Pha 2 kiểm nội dung 6 clip đã đăng; quyết định gỡ hay giữ hỏi người sở hữu (đăng ra ngoài). |

## Ngoài phạm vi

- Nội dung lớp 3 trở lên (plan này chỉ dựng khung và chuyển nội dung hiện có).
- Viết lại lịch sử git, đổi repo sang private.
- Bản quyền font HP001 của phiếu viết (xem câu hỏi mở).
- Môn English: chỉ dọn chữ "lớp" trên giao diện nếu có, không viết lại nội dung.

## Câu hỏi mở

- Font HP001 (`tools/private/private-files.json`) không có giấy phép mở; chưa rõ được phép in trong phiếu viết phát cho người dùng hay không.
