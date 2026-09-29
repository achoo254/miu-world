# Quyết định Jev: duyệt cuối đợt Foundation

Ngày: 2026-09-29. Model: `jev-1.13.0` (Choice, `tools/decisions/jev-decide.py`). Theo chỉ đạo người sở hữu ("Phần review bạn tự dùng model jev để quyết định"), dùng lựa chọn của Jev kể cả khi script trả `escalate`; người sở hữu có thể đảo các mục đánh dấu dưới ngưỡng.

Căn cứ: Master Plan §2, §10, §15 #12–#14; số liệu (mỗi biến thể 652 tam giác, 1 draw call, 31 clip; headScale 0.8/0.92/1.04, torsoScale 0.85/0.78/0.70, limbScale 0.8/0.7/0.6); quan sát trực tiếp các ảnh `assets/generated/review/`: `character/miu-cat-chibi-{a,c}-turn-0.png`, `-gameplay-camera.png` (a, c), `accessories/miu-cat-chibi-b-outfit-35.png`, `map/forest-ch1-iso.png`, `ui/06-play-parrot.png`, `ui/01-login.png`. Người sở hữu đã chơi thử và đăng nhập Google thành công.

## Quan sát ảnh đã đưa vào state
- Mặt trước: 3 biến thể cùng mặt (mắt vàng cam, đồng tử đen, ánh sáng trắng, má hồng, mũi nhỏ), áo hồng, quần xanh. A: đầu chỉ hơi rộng hơn thân, cân đối. C: đầu lớn rõ so với thân, dễ thương nhất ở mặt trước nhưng thân và chân nhỏ.
- Camera gameplay (nhìn từ sau, trên cao): A che một phần thân trên nhưng áo, hai tay, đuôi, chân vẫn đọc được. C: đầu che gần hết áo, tay nhỏ xíu, chỉ còn đuôi và chân, silhouette đầu to trên chân nhỏ.
- Phụ kiện (biến thể B): mũ phù thủy hồng có sao vàng và dây balo nâu khớp đầu và thân, đọc rõ.
- Bản đồ: cỏ xanh lá rất bão hòa, cây xanh đậm, cây cam thu, lối đá xám, hai bên đất nâu; nhất quán nhưng xanh mạnh, chưa "pastel dịu".
- Ảnh chơi trong web (iPad dọc): nhân vật là Miu bản cũ (chưa áp biến thể chibi), nhìn từ sau, nhãn Vẹt dạng pill trắng, joystick và nút Chạy/Nhảy hồng đúng chỗ; cây lớn ở xa bị sương che nhạt gần như trắng.
- Màn đăng nhập: một nút "Đăng nhập bằng Google" và dòng nói chỉ nhận email đã xác minh; rất đơn giản, trống nhiều.

## Kết quả

| # | Câu hỏi | Stakes | Jev chọn | Xác suất | Confidence | Script | Cờ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `miu_variant` | medium | `miu-cat-chibi-a` | A 0.74, B 0.25, C 0.01, chỉnh thêm 0.00 | 0.66 | escalate | DƯỚI NGƯỠNG (0.8), người sở hữu có thể đảo |
| 2 | `palette` | low | `adjust` | 0.99 (giữ 0.01, quay lại POC 0.00) | 0.99 | auto | Trên ngưỡng |
| 3 | `accessories_scaling` | low | `keep` | 0.95 | 0.92 | auto | Trên ngưỡng |
| 4 | `account_flow` | low | `keep` | 0.76 (simplify 0.24) | 0.52 | escalate | DƯỚI NGƯỠNG (0.6), người sở hữu có thể đảo |
| 5 | `play_in_web` | low | `needs_fixes` | 0.58 (keep 0.42) | 0.17 | escalate | DƯỚI NGƯỠNG (0.6), rất thấp, người sở hữu có thể đảo |

FPS iPad Gen 10: chưa đo, chuyển DEVICE-01 (số đo, không quyết bằng Jev).

## Chỉ thị áp dụng
1. **Biến thể A thành `miu-cat`.** Thay spec `miu-cat` trong `content/characters.json` bằng tham số của `miu-cat-chibi-a` (headScale 0.8, torsoScale 0.85, limbScale 0.8, headOffset 0, face `miu-cat-face`, accessoryScale head 1 / torso 0.9, palette và partColors giữ nguyên); xóa `miu-cat-chibi-b`, `miu-cat-chibi-c` khỏi `content/characters.json`, `assets/generated/characters/` và các ảnh review liên quan; cập nhật danh sách `VARIANTS` trong `apps/web/src/review/review-main.ts` cho khớp (hoặc bỏ mục chọn biến thể); rồi `pnpm assets:character` → `pnpm assets:preview` → `pnpm assets:manifest` → `pnpm assets:check`. Chạy lại test `tools/assets/kitbash-character.test.ts` (test byte-giống bản cũ của `miu-cat` phải đổi kỳ vọng sang hash mới, có ghi lý do) và E2E `play` (stats `outfit` vẫn đúng, ngân sách draw call/tam giác). Điều này cũng sửa điểm quan sát "trong game vẫn là Miu bản cũ".
2. **Palette: chỉnh một vòng.** Làm dịu các màu xanh lá bão hòa của cỏ và tán lá trong `content/palette.json`/`content/blocks.json` (giảm độ bão hòa, giữ tông ấm, giữ độ tương phản đủ để phân biệt lối đá, nước, cầu, cây cam thu); không đổi generator hay chunk. Sinh lại atlas, map, ảnh review (`pnpm assets:atlas`, `world:forest`, `assets:preview`, `assets:manifest`), kiểm cùng hash khi chạy hai lần, cập nhật bảng "trước/sau" trên trang review. Chạy lại `pnpm assets:check`, `pnpm test`.
3. **Phụ kiện: giữ** hệ số scale theo biến thể (chỉ giữ hệ số của biến thể A khi biến thể B/C bị xóa, theo chỉ thị 1).
4. **Luồng tài khoản: giữ nguyên** (Google, đặt PIN, đồng ý, khu phụ huynh, chọn hồ sơ, cổng PIN); không đơn giản hóa vì đồng ý, PIN, an toàn trẻ em phải giữ. Không cần thay đổi.
5. **Chơi trong web: cần sửa nhỏ** (confidence 0.17, gần hòa với "giữ"). Chỉ thị làm được theo ảnh:
   - Áp biến thể A cho người chơi (chỉ thị 1), xác nhận trong ảnh `ui/06-play-parrot.png` sinh lại bằng E2E `REVIEW_SHOTS=1`.
   - Giảm sương ở xa: cây lớn phía xa bị nhạt gần như trắng. Kiểm giá trị fog trong `apps/web/src/game/scene/sky.ts` hoặc cấu hình cảnh, đẩy khoảng bắt đầu sương xa hơn hoặc giảm độ đặc để cây xa vẫn giữ màu; giữ nguyên ngân sách draw call/tam giác và kiểm `?quality=low|mid|high`.
   - Sau chỉnh, chạy E2E `play` (8/8) và chụp lại ảnh review.
   - Không thay đổi joystick, nút Chạy/Nhảy, nhãn Vẹt (đọc rõ).

## Việc chưa quyết bằng Jev
- FPS iPad Gen 10 ở mức Vừa: chưa đo, chuyển DEVICE-01.
- Push/CI: người sở hữu quyết.

## Ghi vào tài liệu sau khi áp dụng
Ghi vào Master Plan §15: biến thể A được chọn (Jev, 2026-09-29, dưới ngưỡng), palette chỉnh một vòng, luồng tài khoản giữ nguyên. Cập nhật `docs/project-roadmap.md` (task #2, #3, #7, #8, #9, #12) và `plans/dattqh/reports/foundation-review-260929.md`.
