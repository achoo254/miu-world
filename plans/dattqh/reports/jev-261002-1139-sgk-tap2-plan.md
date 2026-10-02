# Jev — plan nội dung SGK lớp 2 tập 2 (02/10/2026 11:39)

Người sở hữu gửi Toán 2 tập 2 và Tiếng Việt 2 tập 2 (Kết nối tri thức), giao: lưu như tập 1 rồi lập plan bổ sung nội dung, kịch bản, trò chơi mới vào các map mới. Hai sách đã ở iCloud (`miu-world/sgk/toan2-t2.pdf`, `tv2-t2.pdf`), khai trong `tools/private/private-files.json`, `pnpm private:sync` báo 6/6 đúng sha256; bản scan không có lớp chữ (142 và 145 trang), đã tách trang bằng `tools/sgk/split-pages.py`.

## Câu hỏi và quyết định (jev-1.13.0)

| Câu | Mức | Jev chọn | Độ tin cậy | Xác suất | Quyết |
| --- | --- | --- | --- | --- | --- |
| Chia bài vào map | medium | by-theme-balanced | 0,87 | 0,92 | auto |
| Map mới | medium | build-island-only | 0,82 | 0,88 · cả hai 0,05 · không 0,07 | auto |
| Cách ly | low | own-worktree | 1,00 | 1,00 | auto |
| Mẫu trước | low | samples-then-mass | 1,00 | 1,00 | auto |
| Trò chơi mới | low | world-mini-games | 1,00 | 1,00 | auto |

Nghĩa:

1. **Chia theo chủ đề, cân số bài:** mỗi chủ đề/chủ điểm vào map có bối cảnh hợp, ưu tiên map ít bài và các phòng vừa dựng; mỗi map kết thúc với số bài gần bằng nhau.
2. **Dựng Đảo bí ẩn** từ tấm mock của nó làm nơi cho các bài biển đảo của tập 2; Núi tuyết để sau.
3. **Worktree và branch riêng**, merge vào `main` sau mỗi phase (như tập 1).
4. **4–6 quest mẫu** với trò chơi mới, trang nghiệm thu, rồi mới viết hàng loạt (nghiệm thu qua Jev).
5. **Trò chơi trong thế giới 3D và các phòng:** chia nhóm, chia đều đồ vật (nhân, chia); tìm khối trụ, khối cầu trong lâu đài; khối trăm-chục-đơn vị (số đến 1000); mua bán ở sạp bằng tiền Việt Nam; đo quãng đường bằng m, km; lập biểu đồ tranh từ vật bé đếm; túi may mắn (chắc chắn, có thể, không thể); viết bưu thiếp, thư; cảnh mới cho các truyện Tiếng Việt.

Ghi vào plan `plans/dattqh/261002-1139-sgk-lop2-tap2-content/plan.md`.
