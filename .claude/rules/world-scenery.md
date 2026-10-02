# Cảnh vật trên map: đặt như ngoài đời thật

Người sở hữu (02/10/2026): "cây lại mọc giữa đường… khung cảnh phải giống như ngoài đời thật chứ đừng render lung tung không quy tắc"; "nhà phải thật rộng lối vào, không gian bên trong đủ cho nhân vật di chuyển, to gấp nhiều lần nhân vật". Áp cho mọi generator map (`tools/world/generate-*-map.ts`, `tools/world/structures/**`) và vùng ngoài (`packages/voxel/src/outland-*.ts`).

## Đường và lối đi

- Đường, ngõ, lối mòn, sân lát, quảng trường (`path`, `trail`, `cobble`, `cobble-grey`, `paver`, `asphalt`) là chỗ đi: không cây nào mọc ra từ mặt lát. Cây đứng bên mép đường, trên đất/cỏ, hoặc trong bồn cây có viền (trồng trong ô đất chừa sẵn trên sân).
- Lối đi hẹp (≤ 7 khối bề ngang) để trống phần giữa: đèn, ghế, thùng, biển đứng ở mép. Quảng trường, sân, chợ rộng hơn thì được đặt ghế, sạp, đài phun, nhưng vẫn chừa lối đi ≥ 2 khối giữa chúng.
- Trước cửa nhà (2 ô ra ngoài, rộng bằng cửa) và trong lòng cửa: không cây, không đồ.

## Nhà

- Nhà ở ≥ 13 × 11 khối, tường ≥ 7 khối; nhà công cộng to hơn tương xứng. Cửa chính ≥ 3 × 3 khối; sàn cao hơn đất thì có bậc 1 khối mỗi bậc.
- Trong nhà ≥ 70% sàn trống sau khi tính đồ có va chạm; lối đi chính ≥ 2 khối; mọi chỗ trống tới được từ cửa. Không có khối nhà kín rỗng.

## Cây, ruộng, nước

- Cây mọc trên đất, cỏ, bồn cây; không trên mái, trong nhà, giữa sân lát, trong nước (trừ loài sống ven nước đặt ở mép bờ).
- Ruộng, vườn, luống có bờ/rào và lối vào; cây trồng không lấn ra đường.
- Không vật nào lơ lửng hay chìm nửa trong khối (trừ cố ý: đèn treo, khinh khí cầu, cá).

## Va chạm

Mỗi vật có `traversal` trong danh mục (`content/world/models.json`, `content/blocks.json`; luật ở `packages/voxel/src/traversal.ts`): cây, bụi, cỏ, hoa, ruộng đi xuyên; vật thấp tự bước/tự trèo; tường, rào, cửa, lan can, đá lớn chắn hẳn. Không đổi một vật thành đi xuyên chỉ để bé lọt qua — dời vật đi.

## Kiểm tra (chạy sau mỗi lần `pnpm world:<map>`)

- `pnpm exec tsx tools/world/scenery-audit.ts <map>`: 0 cây trên đường/sân lát, 0 đồ chắn giữa lối hẹp.
- `pnpm exec tsx tools/world/room-audit.ts <map>`: không nhà nào thiếu chuẩn (không gian có mái không phải nhà — gầm cầu, mái hiên, vách đá — ghi lý do).
- `pnpm exec tsx tools/world/reach-audit.ts <map>`: mọi mục quest, cổng, bến xe tới được; chỗ xuất hiện, điểm xuống xe trống.
