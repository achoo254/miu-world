# Ngân sách vẽ của mười hai map — 19/10/2026

Pha 1 của `plans/dattqh/261004-1617-mvp-gate-launch-readiness/plan.md`. Số liệu đầy đủ: `assets/generated/review/map-budget.json` (trang review, mục "Ngân sách vẽ của mười hai map").

## Cách đo

- Project E2E `budget` (`apps/web/e2e/map-budget.spec.ts`), chạy tay, không chạy trên CI: `pnpm --filter @miu/web e2e --project setup --project budget`, khoảng 17 phút, 1 worker.
- Khung iPad Gen 10 (820 × 1180, tỉ lệ điểm ảnh 2). Mỗi điểm đo là chỗ xuất hiện hoặc điểm đầu một chương của map. Ở mỗi điểm, camera quay 8 lần, mỗi lần 45°, và cứ 250 ms lấy mẫu một lần trong khi xe, thuyền, dân làng vẫn chạy. Giữ lại số cao nhất của draw call, tam giác, texture và geometry (hai số sau mới thêm vào `window.__miuStats`).
- Mức Cao đo ở mọi điểm (52 điểm). Mức Vừa và Thấp chỉ đo ở chỗ xuất hiện của mỗi map, vì mức thấp hơn vẽ ít hơn cùng một cảnh. Tổng cộng 76 lượt.
- Máy đo dùng GPU Apple M4 (ANGLE Metal). Ở cùng một cảnh, GPU máy dev đếm nhiều hơn GL phần mềm của CI khoảng 25 draw call; số tam giác thì không phụ thuộc GPU. Phép đo này không cho FPS của iPad thật: số đó do DEVICE-01 đo.

## Kết quả

Ngân sách (Master Plan §12): ≤ 150 draw call, ≤ 150k tam giác.

| Mức | Draw call cao nhất | Tam giác cao nhất | Texture cao nhất |
| --- | --- | --- | --- |
| Thấp | 83 | 95,8k | 63 |
| Vừa | 113 | 153,0k (Làng ven sông, chỗ xuất hiện) | 101 |
| Cao | 186 (Khu rừng bí mật, chỗ xuất hiện) | 196,4k (Nhà của bé, chương 1) | 106 |

- **Mức Vừa:** draw call đều trong ngân sách. Tam giác vượt ở đúng một điểm: chỗ xuất hiện của Làng ven sông, 153k, hơn ngân sách khoảng 2%.
- **Mức Cao:** 13 điểm vượt ngân sách (draw call, tam giác, hoặc cả hai): Khu rừng bí mật (chỗ xuất hiện, chương 2), Làng ven sông (chỗ xuất hiện), Nhà của bé (chỗ xuất hiện, chương 1), Trung tâm (chỗ xuất hiện, chương 1, chương 3), Xóm mái ấm (chỗ xuất hiện, chương 1), Nông trại (chương 1), Đảo bí ẩn (chỗ xuất hiện).

Lần đo ngày 01/10/2026 (`perf.json`, chỉ Khu rừng, lộ trình tự đi) cho mức Cao tối đa 108 draw call. Từ đó tới nay mỗi map đã thêm 1.200–16.600 đồ vật, nên con số tăng là điều dự đoán được.

## Vật còn vượt và cách xử lý

Phần chưa kiểm: mức Cao khác mức Vừa ở hai chỗ, tầm nhìn (110 so với 64 khối) và bóng đổ (`quality.ts`). Bóng đổ cộng thêm một lượt vẽ cho mọi vật đổ bóng nằm trong khung 48 × 48 khối quanh bé, cộng mọi lô đồ gộp có cờ `|shadow` (`entities/props.ts`); một lô trải rộng nên gần như luôn nằm trong khung bóng. Giả thuyết là bóng đổ chiếm phần lớn số draw call vượt ở mức Cao. Chưa đo tách riêng hai yếu tố này.

Đề xuất, theo thứ tự:

1. **Đo trên iPad trước (DEVICE-01, việc của người).** Ngân sách draw call chỉ là số thay cho FPS. Nếu iPad Gen 10 giữ ≥ 30 FPS ở mức Cao tại Khu rừng và Trường học, thì giữ nguyên mức Cao.
2. **Nếu iPad tụt FPS ở mức Cao:** tách lô đồ gộp đổ bóng thành các ô 32 × 32 khối, để bóng chỉ vẽ các ô gần bé; hoặc giảm tầm nhìn mức Cao từ 110 xuống khoảng 90 khối. Làm xong thì chạy lại project `budget`.
3. **Mức Vừa:** chỉ có một điểm vượt về tam giác, khoảng 2%. Có thể giảm tầm nhìn mức Vừa từ 64 xuống 60 khối, hoặc gộp hàng rào và cây ở chỗ xuất hiện của Làng ven sông. Việc nhỏ này để sau lần đo iPad, vì bé đang chơi ở mức Vừa mà chưa ai báo giật.

Chưa đổi gì trong cách dựng map ở đợt này: mọi cách giảm đều làm cảnh xa nghèo đi, trong khi đích của người sở hữu là thế giới "thật sinh động".
