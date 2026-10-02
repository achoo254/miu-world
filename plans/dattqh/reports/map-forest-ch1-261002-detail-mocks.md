# Khu rừng bí mật (forest-ch1) theo mock chi tiết — báo cáo pha 4

Ngày 02/10/2026. Bản giao việc: `plans/dattqh/261002-0802-detail-mocks-per-map/phase-04-map-rework-brief.md`.

## Đối chiếu từng khung (ảnh `assets/generated/review/forest-ch1/mock__*.png`)

| Khung | Mức | Còn thiếu |
| --- | --- | --- |
| `c-10-rung` (rừng cận cảnh) | gần | Đã có: lối mòn viền hoa, nấm, bụi lá khối và đèn lồng; suối rộng có cầu gỗ tay vịn với đèn ở đầu cột; vách đá xám nhiều tầng có thác trắng phía sau bên phải; cây xanh xen cây hoa hồng. Còn thiếu: nước suối nhạt (màu `water` dùng chung, không sửa), vách thấp hơn mock vì map chỉ cao 48 khối. |
| `a-10-rung-can-canh` (rừng) | gần | Lối đi giữa vào rừng, suối bên phải, cầu gỗ ở góc phải trước, đèn lồng cột gỗ, hoa và nấm. Còn thiếu: nước nhạt như trên; cây trong mock thân to hơn ở hàng gần. |
| `b-08-rung-toan-canh` (toàn cảnh) | gần | Suối uốn, cầu gỗ, vách đá xám có thác đổ xuống hồ rồi chảy ra suối, cây hoa hồng rải rác. Còn thiếu: núi đá phía xa (vùng ngoài map không có núi), vài cây lá cam ở tiền cảnh thuộc góc chương 1 (giữ nguyên). |

## Thay đổi chính

- Góc chương 1 (x < 96, z < 100) giữ nguyên: cây, đá, đạo cụ, quest, cầu và đá qua suối vẫn như cũ. Cây ở góc được đặt bằng đúng luật cũ (cùng dãy số ngẫu nhiên), chỉ chặt vài cây trên lối mòn mới rời gốc cổ thụ đi về phía đông.
- Ngoài góc: suối rộng dần từ x ≈ 92 (9–11 khối); vách đá ba tầng (7, 15, 24 khối) ở (134, 98) có mặt dựng đứng, thác 5 khối rộng với suối nhỏ trên đỉnh, vệt trắng và bọt nước (prop hộp), hồ dưới chân chảy ra suối; vách cũ ở đông nam (690, 720) làm lại theo cùng kiểu. Cầu gỗ thứ hai (x = 112) có tay vịn và đèn ở bốn đầu cột.
- Lối mòn mới: từ gốc cổ thụ men chân vách tới cầu, qua suối tới trại; nhánh tới hồ thác. Viền lối hoa, nấm, dương xỉ, bụi lá khối (xanh, hồng), đèn lồng cột gỗ mỗi 12 khối; lối dài giữa các bãi viền thưa hơn. Mặt đất quanh cảnh rải hoa và nấm dày như mock.
- Cây: ngoài góc, phần lớn cây lá cam đổi thành xanh, khoảng 1/9 cây xanh thành cây hoa hồng; cây lớn thân 2×2, tán khối 7–9 khối dọc lối và quanh trại; trên vách chỉ 1/3 ô mọc cây để lộ đá xám.
- Trại người rừng (110, 24): đống lửa có giá nấu, bốn ghế gỗ khúc, hai lều, chòi gỗ mở (bàn, ghế, đèn treo, giỏ nấm, thùng), đèn lồng cột ở bốn góc, đống củi, giá dụng cụ, biển chỉ đường.
- Chòi kiểm lâm (đi vào được, cửa quay về đống lửa): sàn gỗ, cửa kính, bậu hoa, đèn hai bên cửa; trong phòng có bản đồ rừng, kệ hũ mật/nấm, giường cuộn, bàn có sách và đèn treo, hai ghế, giá dụng cụ, thùng, xô, giỏ nấm, chậu cây, thảm. Landmark `choi-kiem-lam` đặt giữa phòng trên sàn.
- Bốn bãi bài học chương 2–5 (`DISTRICTS` không đổi): mỗi bãi thêm bốn đèn lồng cột, một lều, đống lửa và ghế gỗ.
- Landmark mới: `thac-nuoc`, `cau-go-qua-suoi`, `loi-mon-hoa`, `trai-nguoi-rung`, `choi-kiem-lam`, `thac-rung-sau` (sau bốn landmark cũ).

## Người và vật

- Mới ở cảnh thác/trại: Ông Câu cá (câu ở hồ thác), Cô Nấu bếp trại, Chú Tiều phu Lâm, Bác Kiểm lâm Sơn, Chị Hái nấm Mai, ba bé thám hiểm (Na, Bin, Su — cỡ trẻ em, cầm kính lúp), Ông Ngắm thác; Hươu sao và Hươu con, Cáo đỏ, Thỏ xám, Vẹt bên thác.
- Toàn map: 187 người/vật (42 người, 145 con vật), 3.502 prop (trước 2.666; dưới ngân sách 20.000), 85 interactable (không đổi).
- Không có sóc trong pack (`kenney-cube-pets` không có), nên chim dùng vẹt và không có sóc.

## Tệp đã sửa / thêm

- `tools/world/generate-forest-map.ts`, `tools/world/forest-life.ts` (thêm tham số `scene`).
- Mới: `tools/world/structures/forest-scene.ts` (vách tầng, thác, cây lớn, chòi kiểm lâm, chòi mở, viền lối).
- Mới: `content/world/box-props/forest-ch1.json` (tiền tố `kr-`: đèn lồng cột, đèn treo, bảng bản đồ, giá dụng cụ, kệ hũ, ghế khúc gỗ, giỏ nấm, bọt thác, vệt thác), chín dòng `generated/box-props/kr-*` trong `content/world/models.json`.
- Mới: `content/world/mock-views/forest-ch1.json` (khung toàn cảnh dùng `reach: 260`).
- Sinh lại: `assets/generated/world/forest-ch1/*`, `assets/generated/box-props/kr-*.glb`, manifest, ảnh `assets/generated/review/forest-ch1/` (15 ảnh). Không đổi `content/palette.json` (màu `grass-forest` hiện tại hợp mock).

## Kiểm tra

- `pnpm vitest run tools/world/generate-forest-map.test.ts`: 4/4 đạt (gồm "matches the committed output", đi bộ tới mọi target).
- `pnpm vitest run tools/world/mock-views.test.ts tools/world/model-catalog.test.ts tools/assets/build-box-props.test.ts`: 12/12 đạt.
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi. `eslint` ba tệp TS đã sửa, `--max-warnings=0`: 0 lỗi, 0 cảnh báo.
- Không chạy cả bộ test, E2E, `perf` (theo bản giao việc). Ảnh `review/map/forest-ch1-*` (góc chương 1) không chụp lại.

## Đề xuất cho bộ dựng chung

- `placeWaterfall` (landmarks.ts) chỉ chạy được trên dốc thoai thoải; vách tầng có mặt dựng + thác + vệt trắng/bọt như `forest-scene.ts` (`cliffRise`, `placeFalls`) có thể đưa thành bộ dựng chung cho Nông trại, Làng Ven Sông.
- `trailVerge` là bản `laneVerge` không cần `ZoneMapContext`; nếu gộp, `laneVerge` có thể gọi nó.
- Màu `water` dùng chung khá nhạt so với mock (xanh dương đậm); nếu đổi phải đổi chung cho mọi map.

## Câu hỏi còn mở

- Cảnh mock nằm ngay phía đông góc chương 1 (x 96–165). Nếu ý "giữ nguyên góc chương 1" là cả vùng 192 × 192 cũ, cần dời cảnh thác/trại ra xa hơn (cảnh và góc chụp đều đặt theo landmark nên dời được).
