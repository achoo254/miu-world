# Brief cho các lô viết lại nhiệm vụ (đọc hết trước khi sửa)

Repo: `/Users/hoandat/inet-gitlab/miu-world` (nhánh `main`, cây làm việc dùng chung với các phiên khác). Múi giờ Asia/Saigon. Nội dung trẻ đọc viết bằng **tiếng Việt**.

## Vì sao

Bé (lớp 2) than phiền phải **đứng một chỗ làm nhiệm vụ quá lâu**. Người sở hữu muốn: mỗi NPC giữ **tối đa 2 nhiệm vụ** (mọi vai), **nhiều NPC và kịch bản hơn** trong mỗi map, và bé **đi lại** giữa nhiều chỗ trong một nhiệm vụ. Ngôi sao dẫn đường của game: sống động, không bao giờ nhàm.

## Quy tắc phải đạt (máy kiểm bằng `pnpm content:spread`)

1. **≥ 4 chỗ** mỗi nhiệm vụ. "Chỗ" của một bước = `places[target]` của bài, nếu không có thì `places[step.id]`, nếu không có nữa thì chính nhân vật/đồ vật đó (`character` trong targets.json nếu có). Bước `search` (nhiều `targets`) tính mọi chỗ của nó.
2. **≤ 2 bước liền** ở cùng một chỗ (bước `reward`, `unlock` không có target thì bỏ qua; một bước `search` cắt chuỗi).
3. **Mỗi nhân vật (look loại `npc`) có mặt trong ≤ 2 nhiệm vụ**, tính mọi vai. Ngoại lệ duy nhất: Vẹt Xanh (`vet-xanh`), hướng dẫn viên Khu rừng. Đồ vật (look loại `object`) không bị giới hạn.

## Lô của bạn

File `batches/batch-<N>.json`: `quests` (mỗi bài: `file`, `keeps` = nhân vật bài này **được giữ**, `replace` = nhân vật bài này **phải bỏ**, `names`), và `looks` = các look NPC bạn được dùng cho NPC mới, kèm **số NPC tối đa** mỗi look (không vượt, vì mỗi look chỉ được vẽ tối đa 6 nhân vật trên cả game; các lô khác có phần riêng).

Trong một bài, chỉ được dùng: nhân vật trong `keeps` của chính bài đó, NPC mới của bạn, các đồ vật **đã có** trong bài (không thêm đồ vật mới), và ở Khu rừng thì Vẹt Xanh. **Không** đưa nhân vật của bài khác vào.

## Được sửa / không được sửa (mỗi file bài trong lô của bạn)

Được sửa:
- `target` của bước (và `targets` của bước `search` nếu cần) — để chuyển bước sang chủ mới.
- `goTo` của bước (dòng bảng nhiệm vụ: đi đâu, gặp ai). Bước nào đổi chủ so với bước trước thì **phải có `goTo` mới**, nêu tên NPC và chỗ, sinh động, ngắn (≤ ~90 ký tự). Ví dụ phong cách sẵn có: "Đến cột cờ giữa sân trường, Sư Tử Vàng đang chờ", "Chạy ra sân bóng, Khỉ Lanh gọi cả đội xếp hàng".
- `places` (thêm chỗ cho NPC mới / đồ vật đổi chỗ). Mỗi chỗ mới là một cụm từ mới khác các chỗ khác của bài, hợp với map: Khu rừng (rừng cây, bãi cỏ, suối, gốc cây, bụi tre…), Trường học (trong khu chủ đề của bài: sân trường, vườn trường, căng tin, xưởng đồ chơi, phòng mĩ thuật, tháp đồng hồ, hội trường — chọn chỗ con trong khu đó, ví dụ "quầy nước", "luống cải", "góc giá vẽ").
- Hội thoại của bước `dialogue` (`lines[].speaker`, `lines[].text`, `choices[].text`, `choices[].reply`), `title`, `summary`, `sevenQuestions` — **chỉ** để đổi tên/vai khi một nhân vật bị bỏ và người mới thay vào, hoặc để giới thiệu NPC mới cho mạch truyện liền lạc.

**Không được sửa**: `id` của bước và bài (tiến độ của bé tham chiếu tới), thứ tự bước, thêm/xóa bước, `kind`, `mechanic`, `prompt`, `template`, `blanks`, `options`, `answer`, `support`, `texts`, `curriculumRef`, `lesson`, `reward`, `phases`, `chapter`, `region`, `status`, `review`. **Lời SGK giữ nguyên 100%** (prompt, đề bài, bài đọc). Không sửa file nào ngoài các file bài của lô bạn và file NPC của lô bạn.

## Cách làm cho từng bài

1. Đọc cả bài (mạch truyện, ai giao, các bước). Chạy `pnpm content:spread` để thấy số chỗ và chuỗi dài nhất hiện tại.
2. Bỏ nhân vật trong `replace`: giao các bước của họ cho NPC mới (hoặc nhân vật `keeps`), đổi `speaker` và viết lại các câu nhắc tới họ (cả `summary`, `sevenQuestions`, `choices`) cho khớp nhân vật mới (ví dụ thay Sư Tử Vàng bằng Bác Voi Gác Cổng thì bỏ "bờm vàng", thêm nét của voi).
3. Rải bước: mỗi chuỗi > 2 bước liền ở một chỗ thì chia ra: chuyển bước sang **NPC mới ở chỗ mới** (cách tốt nhất: bé gặp bạn mới), hoặc sang một chỗ khác đã có của bài. Một kịch bản hay: NPC mới nhờ bé giúp đúng việc của bài tập (đếm cà rốt cho Thỏ, đo dây cho Nhện…) — chỉ trong `goTo`, không đổi đề.
4. Bước `dialogue` phải ở với NPC (không ở đồ vật). Bước thử thách ở NPC hoặc đồ vật đều được.
5. Đạt cả ba quy tắc cho mọi bài trong lô. Cố gắng 5–6 chỗ cho bài dài.

## NPC mới

- Ghi vào `batches/batch-<N>-npcs.json`: `{"<id>": {"name": "<Tên>", "look": "<look>"}}`.
- Id: `<id-bài>-<slug-tên>` (ví dụ `toan2-cd1-b01-voi-gac-cong`), kebab-case, chỉ chữ thường không dấu, số và gạch ngang.
- Tên: tiếng Việt, hợp ngoại hình: look `animal-fox` → "Cáo …"; `chibi-cat-…` → "Mèo …", `chibi-rabbit-…` → "Thỏ …", `chibi-fox-…` → "Cáo …", `chibi-bear-…` → "Gấu …"; `person-*` → người (Trường học: "Cô Lan", "Thầy Minh", "Bác bảo vệ Tư", "Chị lao công Hoa"; Khu rừng: "Bác tiều phu Sơn", "Chị hái nấm Mai"…); `calf*` → "Bê …". **Không trùng** tên trong `batches/existing-npc-names.json`, không trùng nhau trong lô, mỗi tên có tên riêng (không chỉ "Cáo"). Nhân vật giống loài nhưng khác tên là khác người.
- Mỗi NPC mới dùng trong 1 bài (tối đa 2 bài trong lô của bạn). Không vượt số slot mỗi look.
- Thêm vào catalogue: `python3 plans/dattqh/261001-1948-more-quest-npcs-spread-steps/batches/add-npcs.py plans/dattqh/261001-1948-more-quest-npcs-spread-steps/batches/batch-<N>-npcs.json` (an toàn khi lô khác chạy cùng lúc; chạy lại sau khi sửa file NPC).

## Câu chữ

- Mọi câu mới phải **mới hoàn toàn**: không chép câu có sẵn, không lặp giữa các bài (máy kiểm `content-variety`). Tên người chơi luôn là `{name}`, không bao giờ "Miu".
- Giọng: vui, gần gũi trẻ 7 tuổi, câu ngắn, có hành động ("đang loay hoay", "vẫy tay gọi").

## Kiểm tra (chạy khi xong mỗi bài và khi xong lô)

- `pnpm content:spread` — các bài của bạn: `places ≥ 4`, `longest run ≤ 2`; dòng tổng kết liệt kê nhân vật vượt giới hạn: không được có nhân vật nào từ bài của bạn.
- `pnpm content:check` — **bỏ qua** hai loại lỗi tạm thời: `… targets <id>, which map … does not place` / `… hides in chapter …` (map sẽ được sinh lại sau khi mọi lô xong) và lỗi của bài **không** thuộc lô bạn (lô khác đang sửa). Mọi lỗi khác của bài bạn (schema, `{name}`, lặp câu, SGK) phải sửa hết.
- Không chạy `pnpm test`, E2E, sinh map hay build (máy dùng chung; người điều phối chạy sau). **Không** dùng git (add/commit/stash/reset/checkout).
- Lưu ý môi trường: lệnh Bash nào chứa chữ "target" bị hook chặn — dùng Read/Grep/Edit cho các file JSON, hoặc viết script Python ra file rồi chạy.

## Báo cáo khi xong

Liệt kê mỗi bài: số chỗ, chuỗi dài nhất, NPC mới (id, tên, look), nhân vật đã bỏ. Kết thúc bằng:
`Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` và `Summary: …`
