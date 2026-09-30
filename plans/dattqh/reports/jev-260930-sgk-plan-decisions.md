# Jev — quyết định cho plan SGK lớp 2 và API gameplay (2026-09-30)

Người sở hữu giao TypeSafe Jev quyết các câu còn treo sau red team của plan `plans/dattqh/260930-0846-sgk-lop2-game-content/` và review VS phase 3. Chỉ thị kèm theo: bảo mật, dữ liệu trẻ, bản quyền SGK chưa cần quan tâm; sản phẩm phi thương mại; dùng nội dung SGK (kể cả public) là quyết định đã chốt, không bàn lại.

- Model: `jev-1.13.0` (Choice), script `tools/decisions/jev-decide.py`, khóa đọc từ `TYPESAFE_TOKEN_FILE` (không in giá trị). Input 2.219 token, output 300 token.
- Chính sách: dùng lựa chọn Jev kể cả khi script `escalate` (tiền lệ plan vertical slice).
- State gửi Jev: mô tả dự án, chỉ thị người sở hữu, trạng thái repo (một branch `main`, 31 file VS phase 3 chưa commit, CI chạy `content:check`), `forest-ch1` → `forest-ch2` và test VS phụ thuộc, 11 phát hiện red team kỹ thuật còn lại sau khi bỏ nhóm bảo mật/pháp lý.

| Câu | Stakes | Lựa chọn | Xác suất | Conf | Script |
| --- | --- | --- | --- | --- | --- |
| `apply_red_team` | low | apply_all | apply_all 0.87, review_each 0.13, keep_plan 0.00 | 0.79 | auto |
| `parallel_isolation` | medium | worktree_branch | worktree_branch 0.93, shared_tree_protocol 0.05, sequential 0.02 | 0.90 | auto |
| `vs_phase3_step_counters` | low | minimal | minimal 0.62, keep_spec 0.27, delete_on_finish_only 0.11 | 0.43 | escalate |
| `voice_recording_default` | low | on_by_default | on_by_default 0.97, parent_toggle_off 0.02, no_recording 0.01 | 0.96 | auto |
| `chapter_grouping` | medium | group_per_chapter | group_per_chapter 0.98, one_quest_per_chapter 0.02 | 0.95 | auto |
| `forest_ch2_timing` | low | after_vertical_slice | after_vertical_slice 1.00, immediately 0.00 | 1.00 | auto |
| `school_zone_gates` | low | unlock_chain_only | unlock_chain_only 0.82, physical_gates 0.18 | 0.63 | auto |

## Đã áp dụng
- Plan SGK: D2 (thu âm bật mặc định), D4 (không cổng giữa khu), D5 (worktree `../miu-world-sgk`, branch `dattqh/feat/sgk-lop2-content`), D6 (chương gom nhiều quest; hợp đồng ghi vào VS phase 5), D7 (`forest-ch2` giữ tới VS phase 10); áp 11 phát hiện red team kỹ thuật; bỏ mọi cơ chế chỉ phục vụ bảo mật/bản quyền (cờ `internal-only`, lọc production, allowlist email, cổng pháp chế cho micro, đồng ý draft-4, Permissions-Policy).
- VS phase 3 (trước khi commit): `step_attempts` chỉ còn `wrong_count`, `answer_views`; xóa bộ đếm khi chấm xong quest; không đếm sau khi xong; xem Đáp án chỉ bị tính ở bước chưa giải, trong cùng khóa dòng với route hoàn thành; migration 0002 sinh lại (chưa từng commit); văn bản đồng ý draft-3 viết lại cho đúng.

## Bằng chứng sau khi áp dụng
- `pnpm assets:check`, `content:check`, `test` (31 file, 232 test), `typecheck`, `lint` xanh; `drizzle-kit check` "Everything's fine"; E2E setup/account/play 8/8.
- Test chập chờn khi máy tải nặng, có từ trước: `auth-routes.test.ts` (1/8 lần trên code gốc) và một lần 503 `server-busy` từ hàng đợi hash trong test quest (không tái hiện trong 4 lần chạy lại).
