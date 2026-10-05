# Nội dung trùm vui và các cơ chế mới (05/10/2026)

Plan: `plans/dattqh/261004-1617-boss-skill-check-new-mechanics/` (phần nội dung). Chỉ thêm dữ liệu: quest, mục tiêu trên map, kiểu dáng; không sửa code, không thêm dependency.

## Đã giao

- **12 trận trùm, mỗi map một.** 10 quest mới `vuot-ai-<map>` cộng hai trận có sẵn (Cua Biển Khổng Lồ ở `kho-bau-dao-ch1`, Mèo Bánh Bao ở `nha-cua-be-ch1`). Trùm mới: 500 HP, 7 lượt, mỗi lượt đúng trừ 80 HP (Master Plan), câu hỏi theo kỹ năng của map; mỗi trùm có nhân vật, lời mở và lời thua riêng.
- **8 quest việc tốt `viec-tot-<map>`.** Mỗi quest có một bước `decision` rẽ nhánh thật (`nextStepId`: hai lựa chọn bỏ qua bước nhờ bạn, lựa chọn thứ ba dẫn tới một nhân vật giúp đỡ), như mẫu "Tìm gỗ / Đi vòng / Nhờ bạn giúp" của plan; kết thúc bằng một thử thách tương tác khác nhau (sort, classify, fill-blank, multi-select, drag-drop, connect).
- Mỗi quest mới có đủ `find-object` (ba món theo lời gợi ý đọc hiểu), `logic` (pattern, maze hoặc puzzle), `decision`, một bước đọc và đủ 8 pha. Đáp án trùm chỉ ở server (`QuestView` bỏ `answer`), thưởng do server tính.
- `boss-than-rung` (bản nháp trùng chương 1 và dùng lại `parrot-guide`) đã xóa; Thần Rừng Tinh Nghịch nay là `vuot-ai-khu-rung`, ở chương 5, với nhân vật và mục tiêu riêng.
- Hai bước logic cũ (`kho-bau-dao-ch1`, `nha-cua-be-ch1`) bỏ phần tử "?" thừa: giao diện đã tự vẽ ô "?" sau dãy.

## Số đếm (quest đang chạy, không tính quest phụ minigame)

| Map (region) | `decision` | `find-object` | `logic` | Trùm | Quest |
| --- | --- | --- | --- | --- | --- |
| khu-rung-bi-mat | 2 | 2 | 2 | 1 | `viec-tot-khu-rung` (ch3), `vuot-ai-khu-rung` (ch5) |
| truong-hoc | 2 | 2 | 2 | 1 | `viec-tot-truong-hoc` (ch2), `vuot-ai-truong-hoc` (ch4) |
| trung-tam | 1 | 1 | 1 | 1 | `vuot-ai-trung-tam` (ch2) |
| lang-ven-song | 2 | 2 | 2 | 1 | `viec-tot-lang-ven-song` (ch2), `vuot-ai-lang-ven-song` (ch4) |
| xom-mai-am | 2 | 2 | 2 | 1 | `viec-tot-xom-mai-am` (ch2), `vuot-ai-xom-mai-am` (ch4) |
| cho-phien | 2 | 2 | 2 | 1 | `viec-tot-cho-phien` (ch1), `vuot-ai-cho-phien` (ch2) |
| nong-trai | 2 | 2 | 2 | 1 | `viec-tot-nong-trai` (ch1), `vuot-ai-nong-trai` (ch1) |
| thu-vien | 2 | 2 | 2 | 1 | `viec-tot-thu-vien` (ch2), `vuot-ai-thu-vien` (ch3) |
| lau-dai | 2 | 2 | 2 | 1 | `viec-tot-lau-dai` (ch1), `vuot-ai-lau-dai` (ch3) |
| nui-tuyet | 1 | 1 | 1 | 1 | `vuot-ai-nui-tuyet` (ch2) |
| dao-bi-an | 1 | 1 | 1 | 1 | `kho-bau-dao-ch1` (có sẵn) |
| nha-cua-be | 1 | 1 | 1 | 1 | `nha-cua-be-ch1` (có sẵn) |
| **Tổng** | **20** | **20** | **20** | **12** | 18 quest mới |

Mục tiêu "≥ 20" đạt đúng 20 cho mỗi cơ chế. Mê cung và máu trùm được kiểm thêm bằng script tạm: lựa chọn đúng của mỗi mê cung đi tới ô đích, các lựa chọn sai đều chạm tường; tổng sát thương của mọi trận trùm ≥ máu.

## Map sinh lại và audit

Sinh lại lần lượt từng map (một job một lúc): `forest-ch1`, `truong-hoc`, `trung-tam`, `lang-ven-song`, `xom-mai-am`, `cho-phien`, `nong-trai`, `thu-vien`, `lau-dai`, `nui-tuyet`. `dao-bi-an`, `nha-cua-be` không đổi. Sau mỗi lần: `scenery-audit` 0 cây trên đường, 0 vật chắn lối hẹp, 0 nơi xa đường, 0 nơi đứt mạng; `room-audit` 0 nhà thiếu chuẩn; `reach-audit` mọi mục tiêu tới được, chỗ xuất hiện trống. Mục tiêu có sẵn không xê dịch (so với bản trước); chỉ một người giao quest phụ ở Nông trại (`be-chan-ga-con`) dời chỗ vì người giao quest phụ luôn đặt sau cùng. Hai cảnh báo "only 7 blocks" (`tv2-t14-b25`, `toan2-cd6-b30`) có từ trước. Sau mỗi map chạy `pnpm assets:manifest`; regions `.bin` không đổi, chỉ `entities.json` đổi.

Catalogue: thêm 55 kiểu dáng mới trong `content/world/looks.json` (đều dùng model đã có trong manifest; trùm cao 1,8–3 khối) và 133 mục tiêu trong `content/world/targets.json`.

## Quyết định và giới hạn

- **Không sửa quest SGK.** Toàn bộ nội dung mới là quest ngoài sách, nên luật "chữ SGK giữ nguyên" không chặn gì; quest SGK chỉ đứng cạnh trên cùng map.
- **Thứ tự quest.** Danh sách quest, cổng vào map (`questForRegion`) và E2E chọn quest đầu tiên theo tên file. Tên `viec-tot-*`, `vuot-ai-*` xếp sau `tv2-*`, nên không quest mới nào chiếm chỗ bài học đầu (lỗi đã làm `boss-than-rung` phải về nháp). Trùm đặt ở chương cuối của map; Trung tâm và Núi tuyết mở thêm chương 2.
- **Hai điểm gắt của kiểm tra "không lặp câu"** (ghi lại, không sửa kiểm tra): tên nơi chốn ≥ 16 ký tự dùng chung cho hai mục tiêu bị coi là câu lặp, và `nextStepId` ≥ 16 ký tự lặp lại giữa các lựa chọn cũng bị coi là câu lặp. Nội dung tránh bằng tên nơi ngắn hoặc cho phần thưởng đặt ở chính trùm, và id bước ngắn. Đáp án mê cung viết bằng mũi tên (→ ↓) để mỗi mê cung không trùng chữ.
- `ak plan` không đọc được plan này (chỉ có bảng trong `plan.md`, không có file pha), nên dòng trạng thái và hàng pha 5 được sửa tay theo yêu cầu.
- Không chạy E2E (theo yêu cầu). Quest mới xếp sau mọi bài cũ nên `maps.spec` vẫn mở bài đầu của mỗi map như trước; CI sẽ chạy E2E.
- Nội dung học là bản nháp AI (`review: teacher-pending`), cần giáo viên duyệt.

## Kiểm tra

Chạy theo thứ tự CI trên máy dev, sau commit nội dung cuối:

- `pnpm assets:check`: OK, 16 pack, 4576 file.
- `pnpm content:check`: OK, 1846 file.
- `pnpm test`: lần 1 có 1 test hỏng, `paper-io.test.ts > draws every state of a round` quá 5000 ms khi cả bộ chạy (minigame không đọc quest); chạy riêng file đó 11/11 qua; chạy lại cả bộ: 476 file qua, 1 bỏ qua; 6051 test qua, 1 bỏ qua, 0 hỏng.
- `pnpm typecheck`: OK. `pnpm lint` (`--max-warnings=0`): OK, 0 cảnh báo.
- `pnpm --filter @miu/web build`: OK. Cảnh báo có từ trước, không liên quan: chunk lớn hơn 500 kB và import không có đuôi file trong config Vite.
- `pnpm security:dist`: OK, không có đáp án quest trong `apps/web/dist`.
- Không chạy E2E và Semgrep (theo yêu cầu; Semgrep chạy trên CI).
