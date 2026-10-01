# Jev: chọn việc cho đợt tiếp theo (01/10/2026)

Sau khi kéo `main` lên `7b402b8`, người sở hữu yêu cầu "dùng Jev quyết định các công việc tiếp theo rồi dùng skill AgentKit thực hiện". Mỗi việc ứng viên là một câu Choice "làm ngay / để sau", để có xác suất riêng cho từng việc. Thêm ba câu nữa: deploy staging, đồng bộ worktree SGK và cách chạy.

Gọi `tools/decisions/jev-decide.py` (model jev-1.13.0). Đầu vào và đầu ra nằm ở `plans/dattqh/261001-0815-next-batch/jev-{input,output}.json`. Theo chỉ thị của người sở hữu, lựa chọn của Jev được dùng kể cả khi script báo `escalate`.

| Câu | Stakes | Chọn | Tin cậy | Xác suất | Script |
|---|---|---|---|---|---|
| Kiểm nghiệm đời sống rừng | low | now | 0,97 | now 0,98 · later 0,02 | auto |
| Màn hoàn thành theo trình tự | low | now | 1,00 | now 1,00 | auto |
| Tách trang review khỏi bản phát hành | low | now | 0,04 | now 0,52 · later 0,48 | escalate |
| Server kiểm sở hữu trang phục | low | now | 0,22 | now 0,61 · later 0,39 | escalate |
| Nén atlas KTX2 | low | later | 0,59 | later 0,80 · now 0,20 | escalate |
| SGK phase 9 | medium | wait_for_samples | 1,00 | wait 1,00 | auto |
| Đồng bộ worktree SGK | low | fast_forward_now | 0,62 | ff 0,81 · leave 0,19 | auto |
| Deploy staging | medium | deploy_after_gate | 1,00 | deploy 1,00 | auto |
| Cách chạy | low | sequential | 0,35 | sequential 0,67 · parallel 0,33 | escalate |

Áp dụng:
- Đã làm ngay: `pnpm private:sync` (4 file, đúng sha256) và fast-forward worktree `../miu-world-sgk` lên `7b402b8`.
- Đợt này làm tuần tự theo thứ tự xác suất "now": kiểm nghiệm đời sống rừng, rồi màn hoàn thành, rồi tách review khỏi bản phát hành, rồi kiểm sở hữu trang phục. Mỗi việc chạy gate và commit riêng.
- Để sau: KTX2 (chờ số đo iPad thật) và SGK phase 9 (chờ người sở hữu nghiệm thu quest mẫu).
- Sau khi gate và E2E xanh: deploy `main` lên staging.

Plan triển khai: `plans/dattqh/261001-0815-next-batch/plan.md`.

Đính chính (cùng ngày): câu "Server kiểm sở hữu trang phục" mô tả sai hiện trạng. `PUT /api/character` đã kiểm điều kiện mở khóa level/quest (403 `equipment-locked`, có test), và `unlock` chỉ nhận `level`/`quest`, nên chưa có trang phục nào là vật phẩm túi đồ. Vì vậy không viết thêm code; chỉ sửa mục nợ trong `docs/project-roadmap.md`.
