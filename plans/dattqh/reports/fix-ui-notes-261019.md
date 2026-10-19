# Sửa ghi chú giao diện từ lần duyệt ảnh 19/10/2026

Plan: `plans/dattqh/261019-1428-fixes-and-acceptance/plan.md`, pha 2 (giao diện chính) và pha 3 (ghi chú nhỏ). Nguồn ghi chú: `assets/generated/review/screens/review.json` (ảnh chụp từ `462d9f01`). Ảnh mới sẽ chụp trên CI ở pha 5; ở máy dev chỉ dựng tĩnh màn Chăm sóc thú cưng và màn luyện Olympic (360×740, 820×1180) bằng CSS thật để xem bố cục.

## Pha 2 — giao diện chính

| Ghi chú (ảnh) | Sửa | File |
|---|---|---|
| Nút quay lại trôi khỏi khung khi cuộn ở màn luyện Olympic (360 · 13) | Nút ← tách khỏi hàng tiêu đề và chỉ nút này dính ở góc khi cuộn. Hàng tiêu đề không dính nên không che câu hỏi, "1/10" vẫn hiện (lỗi của lần sửa trước đã revert). Trên điện thoại chữ tiêu đề nhỏ lại, hàng gọn hơn. Bài thi thử dùng cùng cách. | `apps/web/src/ui/event/olympiad/{practice-run,mock-exam}.tsx`, `olympiad.css` |
| Tên chương trên thẻ nhiệm vụ bị cắt "Chương 1: Lá..." (360 · 07) | Trên điện thoại tên nhiệm vụ hiện tối đa 2 dòng (như dòng bước), không cắt ở dòng 1 | `apps/web/src/ui/hud/hud.css` |
| Phép tính xuống dòng giữa biểu thức "(8 / + 5 = ?)" (360 · 10) | `keepMathTogether` thay khoảng trắng trong biểu thức số học bằng khoảng trắng không ngắt dòng. Áp cho câu hỏi của mọi bước học và câu hỏi Olympic (luyện, thi thử); đọc to vẫn dùng chữ gốc | `apps/web/src/ui/kit/math-text.ts` (mới), `challenge/challenge-frame.tsx`, `practice-run.tsx`, `mock-exam.tsx` |
| Cảnh tổ đội: bong bóng thoại chạm nhãn "Bông · Tương tác", nhãn chạm "★ Bông" (820 · 18) | Nhãn Tương tác đặt ngay trên thẻ tên (tính theo tỉ lệ thu nhỏ của nhân vật; trước đó điểm neo 1,9 khối không theo tỉ lệ nên lọt vào giữa thẻ tên và bong bóng). Bong bóng nâng lên để có chỗ cho nhãn. Thứ tự từ dưới lên: thẻ tên, nhãn, bong bóng | `apps/web/src/game/multiplayer/{remote-player-manager,multiplayer-nametag}.ts` |
| Bảng "Đội của bạn" che chữ đầu của bong bóng (820 · 18) | Không sửa. Bong bóng là sprite trong cảnh 3D nên bảng HUD ở mép trái che được nó khi người chơi kia đứng ở giữa màn. Trong ảnh hai người đứng cùng một chỗ và chỉ chồng khoảng 10 px; sau khi nâng bong bóng thì nhãn và thẻ tên không còn chạm nhau | — |
| "Rêu xanh cổ thụ" dùng cùng biểu tượng lá với "Lá thần" (820 · 16) | Đổi sang biểu tượng `herb` 🌿, đã có trong manifest (Fluent, MIT). Không thêm asset nên không phải sinh lại manifest | `content/items/reu-xanh-co-thu.json` |

## Pha 3 — ghi chú nhỏ

| Ghi chú (ảnh) | Sửa | File |
|---|---|---|
| Bảng chỉ số và hàng nút che thú cưng (360 · 17) | Bảng Chăm sóc giờ gắn ở mép trên (`Modal placement="top"` mới; phần thế giới bên dưới giữ nét, không làm mờ). Trên điện thoại bảng gọn lại: ảnh nhỏ hơn, ba chỉ số nằm một hàng (chữ vẫn là tên cho trình đọc màn hình), các thẻ một hàng không hình, năm nút chăm sóc một hàng (mỗi nút ≥ 44 px). Bản dựng tĩnh cho thấy bảng kết thúc ở khoảng y 430 trên 360×740 và 570 trên 820×1180, nên thú cưng hiện ra bên dưới | `apps/web/src/ui/pet-care/{pet-care-panel.tsx,pet-care.css}`, `kit/{modal.tsx,modal.css,scene.css}` |
| Mũi tên vàng ló sau khay nút Chăm sóc (820 · 17) | Cùng cách sửa trên: khay giờ ở phía trên nên mũi tên dẫn đường hiện trọn trên mặt đất, không còn ló ra sau khay | như trên |
| Ảnh đại diện chạm dòng tên chương ở màn thưởng (820 · 11) | Bỏ `margin-bottom: -1.25rem` của chân dung (lề này dùng khi đặt chân dung trên đảo) ở màn thưởng | `apps/web/src/ui/rewards/rewards.css` |
| Vệt mờ dưới "Đăng xuất" (820 · 02) | Vệt mờ là đám mây xa của nền trời (62 %, 70 %) nằm ngay dưới nút. Dời xuống góc dưới bên trái (6 %, 82 %), chỗ các màn không đặt nút | `apps/web/src/ui/kit/sky-scene.tsx` |
| "Về trang chủ" ở màn chọn nhân vật nhỏ và trơn (360 · 03) | Nút ghost cỡ thường (52 px), có biểu tượng nhà như các nút "Trang chủ" khác, và viền thấy được trên thẻ trắng | `apps/web/src/ui/creator/{creator-screen.tsx,creator.css}` |
| Chữ của màn phía sau lộ ra dưới bảng sự kiện (820 · 12) | Bảng (`scene-sheet`) cao bằng màn hình giờ kéo tới mép dưới (chỉ chừa vùng an toàn), không còn dải trống để chữ Home lộ qua | `apps/web/src/ui/kit/scene.css` |
| Nhãn "Vẹt · Nói chuyện" nằm trên đầu nhân vật, Vẹt bị khuất (820 · 08) | Nhãn vẫn neo trên vật cần tương tác. Khi vật đứng ngay sau bé, nhãn tự nâng lên cách đỉnh đầu (tới chóp tai) 12 px, không còn nằm sát đầu như nhãn của chính bé. Bé che Vẹt là do góc máy: Vẹt đứng ngay sau bé trên đường nhìn. Không đổi camera hay làm mờ bé (luật không làm mờ vật vì che bé) | `apps/web/src/game/hud/prompt-placement.ts` (mới), `game/game.ts`, `game/entities/player-character.ts` (`PLAYER_TOP`) |

Không thuộc phạm vi được giao nên không sửa: nút "Quay lại game" đè góc khung Bạn bè (360 · 22), trang Ba lô lệch 3 px, nền 3D có thêm vật ở màn trùm.

## Test

- Mới: `apps/web/src/ui/kit/math-text.test.ts`, `apps/web/src/game/hud/prompt-placement.test.ts`.
- Thêm vào test có sẵn:
  - `practice-screens.test.tsx`: nút ← nằm ngoài hàng tiêu đề ở cả màn luyện và bài thi thử, "1/2" vẫn ở hàng tiêu đề, phép tính trong câu hỏi không bị ngắt dòng.
  - `remote-player-manager.test.ts`: nhãn nằm giữa thẻ tên và bong bóng.
  - `pet-care-panel.test.tsx`: bảng gắn ở mép trên.
  - `creator-screen.test.tsx`: "Về trang chủ" là nút cỡ thường, có biểu tượng.

## Câu hỏi còn mở

- Ảnh chụp lại trên CI ở pha 5 sẽ xác nhận bố cục mới của màn Chăm sóc trên điện thoại. Bản dựng tĩnh có thể lệch so với game thật về vị trí thú cưng. Ảnh 08 nên đặt bé hơi lệch khỏi đường nhìn tới Vẹt (việc của `screens.spec.ts`, do pha 4 sở hữu).
- Ở bản dựng tĩnh, nền phía sau bảng Olympic bị làm mờ đúng, nhưng ảnh CI lại cho thấy Home sắc nét sau `scene-sheet`. Có thể `backdrop-filter` bị chặn bởi một phần tử bọc ngoài trong app (backdrop root). Chưa điều tra.
