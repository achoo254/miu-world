---
title: Làm theo quyết định của Jev trên trang review — game sinh động hơn, mở viết quest SGK
status: pending
created: 2026-10-01
branch: main
---

# Làm theo quyết định review của Jev

Quyết định: `../reports/jev-261001-0941-review-decisions.md`. Tiêu chí của người sở hữu: game code 100% bằng AI phải thật sinh động, trẻ chơi không chán. Thứ tự dưới đây xếp theo tác động lên trải nghiệm của bé và độ phụ thuộc; mỗi phase làm theo kiểu dùng lại được (dữ liệu trong `content/`, runtime chung cho mọi map).

| # | Việc | Tier | Ghi chú | Trạng thái |
|---|---|---|---|---|
| 1 | **Cả thế giới ăn mừng** khi xong quest: dân làng, muôn thú gần đó reo, pháo giấy, Vẹt hát trong cảnh 3D, trước màn thưởng | M | Dùng runtime đời sống rừng (`game/ambient`); dữ liệu phản ứng theo routine; tôn trọng giảm chuyển động | Done (lệnh `celebrate`: mọi dân làng, thú đang được vẽ quanh bé ăn mừng theo dữ liệu routine; pháo giấy 1 draw call; màn thưởng chờ 2,6 s) |
| 2 | **Đồ vật phản ứng khi chơi** ở mọi màn cơ chế (táo nảy vào giỏ, đá lắc lư, hũ kẹo cười, thẻ từ bật lên) | M | Một lớp hoạt ảnh chung cho mọi cơ chế, không sửa từng quest | Done (`object-reactions.ts` trong khung chung: đồ chờ nhấp nhô, đồ đang chọn lắc lư, đồ rơi vào vùng thả bật nảy và vùng "nuốt"; chuyển động phần ruột, vùng chạm đứng yên) |
| 3 | **Sự kiện bất ngờ trong rừng** giữa các bước (thỏ cuỗm manh mối phải đuổi, mưa rồi cầu vồng, đom đóm lúc chiều) | L | Kịch bản sự kiện bằng dữ liệu theo map; xoay vòng không lặp liền; không chặn quest, không thưởng ở client | Done (`world-events.ts`: mưa rồi cầu vồng, đom đóm lúc hoàng hôn, thú chạy tới chào; `events` trong `regions.json`; mỗi hiệu ứng 1 draw call; mưa tắt ở mức low và khi giảm chuyển động) |
| 4 | **Sự sống trên đảo Home/Bản đồ**: thác chảy, chim và bướm bay ngang, nhân vật của bé vẫy tay trên đảo | M | Lớp hoạt ảnh trên ảnh render sẵn, vị trí theo dữ liệu khu; giảm chuyển động thì đứng yên | Pending |
| 5 | **Thú cưng đi theo nhân vật** (chọn trong Tạo nhân vật, server lưu) | L | Model Kenney Cube Pets sẵn có; ngân sách draw call; schema + API nhân vật | Pending |
| 6 | **Quest mẫu SGK theo nghiệm thu**: lời thoại vui nhộn hơn ở 6 mẫu; đánh dấu đáp án do AI tự chọn cho giáo viên | M | Chữ SGK giữ nguyên văn; chỉ đổi lời dẫn | Pending |
| 7 | **Viết hàng loạt quest SGK** (phase 4, 5, 9 của plan SGK) theo cách của mẫu đã duyệt | XL | Chạy trong worktree `../miu-world-sgk` theo plan SGK | Pending |
| 8 | Trang review: mục "Quyết định" hiện kết quả của Jev; gate, `e2e:ci`, deploy staging | S | | Pending |

## Tiêu chí xong
- [ ] Mỗi hướng chỉnh của Jev có trong game, chơi được trên iPad (cảm ứng), có E2E và ảnh/video review
- [ ] Không phase nào thêm code riêng cho một map hay một quest: sự kiện, phản ứng, ăn mừng là dữ liệu + runtime chung
- [ ] Draw call ≤ 150 ở mọi mức chất lượng; giảm chuyển động được tôn trọng
- [ ] Gate, web build, `e2e:ci` xanh sau mỗi phase
