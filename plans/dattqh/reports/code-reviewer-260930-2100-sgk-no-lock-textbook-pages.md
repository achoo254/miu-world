# Review: quest SGK không khóa nhau + hiện trang/tên bài

Reviewer độc lập (code-reviewer), 2026-09-30, worktree `miu-world-sgk`, branch `dattqh/feat/sgk-lop2-content`. Kết luận: DONE_WITH_CONCERNS. Server, schema, gate nội dung, vòng import ESM và bí mật đáp án đều đúng; không còn tham chiếu `questWarnings`, `LoadedQuests`, `TEXTBOOK_QUEST_ID`, `questCatalogReport`.

| # | Mức | Phát hiện | Xử lý |
| --- | --- | --- | --- |
| 1 | High | Dòng sách/trang trong HUD (`.textbook-ref--compact`) tràn khỏi khung tracker ~44px ở màn 390px; tên bài không bị cắt | Đã sửa: `max-width: 100%`; thêm E2E điện thoại kiểm dòng và nhãn trang nằm trong khung |
| 2 | Medium | Ghi chú bảo mật của `QuestView` bị tách khỏi nó khi chèn `QuestTextbook` | Đã sửa: dời `QuestTextbook` lên trên ghi chú |
| 3 | Medium | `.claude/rules/quest-content.md` chưa ghi luật không khóa và `lesson` | Đã sửa |
| 4 | Low | `questTextbooks` bỏ qua lỗi đọc kiểm kê, báo lỗi gây hiểu nhầm | Đã sửa: ghép `issues` vào thông báo |
| 5 | Low | `content-catalog` import `worksheet/curriculum-books` (ngược tầng) | Giữ: chạy đúng, dời module để sau |
| 6 | Low | Luật "một bài" chưa kiểm `texts[].section` | Đã sửa + test |
| 7 | Low | Test web `data-state=open` chỉ đọc fixture; E2E không dùng id SGK | Giữ: luật thật đã có test ở schema/catalog |
| 8 | Low | Nền nhãn trang trùng nền tracker | Đã sửa: dùng `--color-tile-2` |
| 9 | Low | `acceptance-page.ts` tự suy bài từ `curriculumRef` | Đã sửa: dùng `quest.lesson` |

Câu hỏi mở từ review: "Nhiệm vụ hôm nay" chọn quest mở đầu tiên theo catalog, không phải bài cô vừa giao; `truong-hoc` còn `v1` tới phase 10.
