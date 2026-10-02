# Jev: mở Núi tuyết và Đảo bí ẩn (02/10/2026 16:3x)

Mô hình `jev-1.13.0`, script `tools/decisions/jev-decide.py`. Bối cảnh gửi: game học lớp 2 làm 100% bằng AI, nguyện vọng duy nhất là sinh động; luồng chơi đi theo quest (màn vùng, cổng trung tâm, check "mỗi vùng mở có quest"); bài tập 2 chưa kiểm kê; có tiền lệ quest câu chuyện ngoài sách (`forest-ch1`).

| Câu | Stakes | Lựa chọn | Xác suất | Quyết |
| --- | --- | --- | --- | --- |
| Hai map chưa có bài thì mở thế nào | medium | **story-quest**: mở ngay, mỗi map một quest câu chuyện chào mừng | story-quest 0,98 · explore-only 0,01 · wait-for-lessons 0,01 | auto |
| Núi tuyết trong bản đồ bài tập 2 | low | **rebalance-ten**: plan tập 2 chia lại bài cho 10 map ở pha 2 | rebalance-ten 0,97 · keep-nine 0,03 | auto |

Áp dụng: plan `plans/dattqh/261002-1619-nui-tuyet-dao-bi-an-maps/plan.md` (F1, F2); plan tập 2 ghi thêm F2.
