# Lô G9: 30 minigame

Ngày 04/10/2026 · Danh mục và luật: [research 2, §3 và §5](minigame-research-2-261003.md) · Quy tắc chạm: [research 1, §2](minigame-research-261003.md) · Khung: [`docs/minigames.md`](../../../docs/minigames.md)

## Kết quả

- Đủ 30 game của hàng G9. Mỗi game có thư mục `apps/web/src/ui/minigame/games/<id>/` (`logic.ts`, `draw.ts`, `index.ts`, `<id>.test.ts`; `folk-riddle` có thêm `riddles.ts`) và file `content/minigames/<id>.json`. Không game nào phải thay bằng game dự phòng: mỗi game có một cơ chế riêng, khác 128 trò cũ và khác các trò còn lại trong lô.
- Bot test (`describeMinigame`) chạy trên 3 màn hình × 5 seed. Cả 30 file test, 467 test, đều xanh (1 test bỏ qua là file đo điểm tạm, đã xóa). Bot thắng, không chạm thì thua, cùng seed cho cùng kết quả, `draw` chạy được mọi trạng thái. Mỗi game có thêm 1–3 test luật riêng.
- 14 game có thêm test "người chơi kém phải thua": chạm bừa (`oan-tu-xi`, `folk-riddle`, `pay-exact`, `fruit-skewer`, `shopping-memory`, `cookie-cutter`, `chain-pop`, `hoa-dang`), chạm liên tục (`clock-catch`, `rice-pound`, `rice-plant`, `carp-waterfall`, `spinning-top`) và quật vợt bằng chạm nhanh (`butterfly-net`). Những luật chống chạm bừa nằm ở mục "Thay đổi so với danh mục".
- Âm thanh dùng `GameEvent.note`: chày giã gạo (trống), quất con quay (vỗ tay), chuông khi chuỗi sứa sáng, domino đổ, nam châm hút, đèn hoa đăng tới nơi, bước đi trên bản đồ. Lô này không dùng nốt giữ (`hold`).
- Hình: thêm 12 emoji qua lock (`raised-fist`, `victory-hand`, `raised-hand`, `seal`, `jellyfish`, `boomerang`, `toolbox`, `flag-in-hole`, `cloud-with-rain`, `kiwi-fruit`, cùng `mango` và `tangerine` mà lô khác đã thêm trước) và 3 dòng `REUSED` (`paperclip`, `nut-and-bolt`, `alarm-clock`). Những thứ không có emoji thì vẽ bằng hình khối: con quay, cối và chày, tờ tiền, quân domino, mặt đồng hồ, que xiên, vợt, bàn pinball, cần gạt, khuôn bánh, thác nước, lưới lục giác.
- Gate đã chạy: `pnpm content:check` OK (1520 file); eslint `--max-warnings=0` trên 30 thư mục và `sprites.ts` sạch; `pnpm typecheck` không có lỗi ở file G9. Còn lỗi ở file của lô khác, xem mục "Còn mở".

## Bảng game

Điểm bot là thấp nhất–cao nhất trên 8 seed (iPad ngang / iPad dọc / điện thoại). Idle là điểm cao nhất khi không chạm gì (3 seed × 3 màn hình). Dấu "!" nghĩa là có lượt kết thúc trước giờ: hết tim, hết bó mạ, hoặc xong cả hai tấm bột.

| id | Tên | Điều khiển | Mục tiêu (giây) | Bot | Idle | Ảnh |
|---|---|---|---|---|---|---|
| `pinball` | Bắn bi pinball | giữ hoặc chạm nửa trái/phải để bật cần gạt | 300 điểm, 3 bi (90) | 930–1110 / 635–1245! / 535–750 | 25 | [ngang](minigames-g9-261003/pinball-landscape.png) · [đt](minigames-g9-261003/pinball-phone.png) |
| `boomerang-throw` | Ném boomerang | vuốt để ném, chạm để bắt | 20 quả (60) | 83–141 / 141–160 / 141–160 | 0 | [ngang](minigames-g9-261003/boomerang-throw-landscape.png) · [đt](minigames-g9-261003/boomerang-throw-phone.png) |
| `cloud-blaster` | Tưới mây khô | giữ và kéo vòi (chỉ phun khi đang chạm) | 30 mây, 3 tim (60) | 79 / 53 / 51 | 0 | [ngang](minigames-g9-261003/cloud-blaster-landscape.png) · [đt](minigames-g9-261003/cloud-blaster-phone.png) |
| `domino-chain` | Domino đổ dây chuyền | kéo để dựng, chạm để đẩy | 3 đường (90) | 15 / 11–16 / 11 | 0 | [ngang](minigames-g9-261003/domino-chain-landscape.png) · [đt](minigames-g9-261003/domino-chain-phone.png) |
| `shikaku-fields` | Chia ruộng | kéo khoanh thửa, chạm để bỏ thửa | 3 cánh đồng (90) | 23–25 | 0 | [ngang](minigames-g9-261003/shikaku-fields-landscape.png) · [đt](minigames-g9-261003/shikaku-fields-phone.png) |
| `current-drift` | Dòng nước đưa thư | chạm thả/nhấc đá, chạm chai để thả | 4 đảo (90) | 12–14 / 15–16 / 10–11 | 0 | [ngang](minigames-g9-261003/current-drift-landscape.png) · [đt](minigames-g9-261003/current-drift-phone.png) |
| `circle-chick` | Rào bắt gà con | chạm ô để dựng rào | 4 gà (90) | 9–12 | 0 | [ngang](minigames-g9-261003/circle-chick-landscape.png) · [đt](minigames-g9-261003/circle-chick-phone.png) |
| `dots-boxes` | Ô vuông nối chấm | chạm cạnh | thắng 1 ván 4×4 (120) | 5–7 | 0 | [ngang](minigames-g9-261003/dots-boxes-landscape.png) · [đt](minigames-g9-261003/dots-boxes-phone.png) |
| `bumper-cars` | Xe điện đụng | kéo | 6 xe (60) | 20–31 / 17–24 / 17–24 | 3 | [ngang](minigames-g9-261003/bumper-cars-landscape.png) · [đt](minigames-g9-261003/bumper-cars-phone.png) |
| `skate-tricks` | Trượt ván làm trò | vuốt lên để nhảy, vuốt trái/phải/xuống để làm trò | 15 trò (60) | 68–71 | 0 | [ngang](minigames-g9-261003/skate-tricks-landscape.png) · [đt](minigames-g9-261003/skate-tricks-phone.png) |
| `mini-golf` | Golf mini | kéo ngược rồi thả | 6 lỗ (90) | 18–22 / 19–22 / 16–17 | 0 | [ngang](minigames-g9-261003/mini-golf-landscape.png) · [đt](minigames-g9-261003/mini-golf-phone.png) |
| `butterfly-net` | Rón rén bắt bướm | kéo chậm, nhấc tay để chụp | 10 bướm (60) | 40–52 / 40–44 / 33–36 | 0 | [ngang](minigames-g9-261003/butterfly-net-landscape.png) · [đt](minigames-g9-261003/butterfly-net-phone.png) |
| `folk-riddle` | Câu đố dân gian | chạm hình (có chữ) | 7 câu, 3 tim (90) | 27 | 0 | [ngang](minigames-g9-261003/folk-riddle-landscape.png) · [đt](minigames-g9-261003/folk-riddle-phone.png) |
| `cookie-cutter` | Dập khuôn bánh quy | chạm | 12 bánh trên 2 tấm (60) | 18! / 20! / 20! | 0 | [ngang](minigames-g9-261003/cookie-cutter-landscape.png) · [đt](minigames-g9-261003/cookie-cutter-phone.png) |
| `hoa-dang` | Thả đèn hoa đăng | chạm dọc bờ sông | 12 đèn (60) | 42–51 / 30–50 / 26–45 | 0 | [ngang](minigames-g9-261003/hoa-dang-landscape.png) · [đt](minigames-g9-261003/hoa-dang-phone.png) |
| `oan-tu-xi` | Oẳn tù tì nhanh trí | chạm 1 trong 3 tay | 12 lượt đúng (60) | 28 | 0 | [ngang](minigames-g9-261003/oan-tu-xi-landscape.png) · [đt](minigames-g9-261003/oan-tu-xi-phone.png) |
| `spinning-top` | Đánh quay | vuốt để ném, chạm để quất | 40 giây quay, 3 con (60) | 59 | 0 | [ngang](minigames-g9-261003/spinning-top-landscape.png) · [đt](minigames-g9-261003/spinning-top-phone.png) |
| `rice-plant` | Cấy lúa thẳng hàng | chạm đúng lúc | 40 cây, bó 60 cây mạ (60) | 60! | 0 | [ngang](minigames-g9-261003/rice-plant-landscape.png) · [đt](minigames-g9-261003/rice-plant-phone.png) |
| `shopping-memory` | Nhớ đồ đi chợ | chạm | 4 chuyến chợ (90) | 6–8 / 7–8 / 7–8 | 0 | [ngang](minigames-g9-261003/shopping-memory-landscape.png) · [đt](minigames-g9-261003/shopping-memory-phone.png) |
| `rice-pound` | Giã gạo | chạm theo nhịp | 35 nhịp đúng (60) | 74 | 0 | [ngang](minigames-g9-261003/rice-pound-landscape.png) · [đt](minigames-g9-261003/rice-pound-phone.png) |
| `clock-catch` | Đồng hồ báo thức | chạm để dừng kim | 8 lần đúng giờ (60) | 14–15 | 0 | [ngang](minigames-g9-261003/clock-catch-landscape.png) · [đt](minigames-g9-261003/clock-catch-phone.png) |
| `fruit-skewer` | Xiên que theo mẫu | chạm quả trên băng chuyền | 8 que (60) | 13–17 | 0 | [ngang](minigames-g9-261003/fruit-skewer-landscape.png) · [đt](minigames-g9-261003/fruit-skewer-phone.png) |
| `low-to-high` | Số bé lên số lớn | chạm thẻ | 6 lượt không sai (90) | 13 | 0 | [ngang](minigames-g9-261003/low-to-high-landscape.png) · [đt](minigames-g9-261003/low-to-high-phone.png) |
| `pay-exact` | Trả tiền vừa đủ | chạm tờ tiền | 10 món (90) | 46–51 | 0 | [ngang](minigames-g9-261003/pay-exact-landscape.png) · [đt](minigames-g9-261003/pay-exact-phone.png) |
| `treasure-map-steps` | Đi theo bản đồ kho báu | chạm ô | 6 bản đồ (90) | 22–24 | 0 | [ngang](minigames-g9-261003/treasure-map-steps-landscape.png) · [đt](minigames-g9-261003/treasure-map-steps-phone.png) |
| `seal-balance` | Hải cẩu đội bóng | kéo | 35 giây bóng đứng vững (60) | 48–59 / 43–59 / 43–59 | 23 | [ngang](minigames-g9-261003/seal-balance-landscape.png) · [đt](minigames-g9-261003/seal-balance-phone.png) |
| `tile-flood` | Lan màu | chạm màu (bảng màu hoặc ô) | 3 bàn (90) | 15–16 | 0 | [ngang](minigames-g9-261003/tile-flood-landscape.png) · [đt](minigames-g9-261003/tile-flood-phone.png) |
| `carp-waterfall` | Cá chép vượt Vũ Môn | chạm lúc nước êm | 12 mỏm (60) | 26–33 | 0 | [ngang](minigames-g9-261003/carp-waterfall-landscape.png) · [đt](minigames-g9-261003/carp-waterfall-phone.png) |
| `magnet-sweep` | Nam châm dọn sân | kéo | 30 đồ sắt (60) | 101–127 / 113–135 / 74–81 | 0 | [ngang](minigames-g9-261003/magnet-sweep-landscape.png) · [đt](minigames-g9-261003/magnet-sweep-phone.png) |
| `chain-pop` | Sứa sáng dây chuyền | một chạm mỗi màn | 6 màn, 3 ngọc trai (90) | 9–16! / 8–17! / 9–16! | 0 | [ngang](minigames-g9-261003/chain-pop-landscape.png) · [đt](minigames-g9-261003/chain-pop-phone.png) |

## Thay đổi so với danh mục

Các thay đổi dưới đây có hai lý do. Một là chặn kiểu chạm bừa mà vẫn thắng: test "người chơi kém" đã chứng minh từng trường hợp. Hai là hạ mục tiêu cho bé 7–8 tuổi thắng sau 1–3 lần chơi.

- `oan-tu-xi`: mục tiêu 12 thay cho 15. Chọn sai thì nghỉ 2 giây, nên chạm bừa (đúng 1/3 số lần) chỉ được khoảng 9 điểm.
- `folk-riddle`: 4 hình, mỗi câu chỉ chọn một lần. Chọn sai thì mất 1 trong 3 tim. Danh mục ghi "sai không trừ", nhưng nếu giữ vậy thì chạm bừa vẫn đạt mục tiêu. Mục tiêu là 7 câu thay cho 8, và hình chỉ chạm được sau khi dòng thứ hai đã hiện.
- `chain-pop`: mục tiêu là 6 màn thay cho 8. Thiếu sứa sáng thì mất 1 trong 3 ngọc trai, sứa phải bơi vào 1 giây rồi mới chạm được, và màn nào cũng có một chỗ chạm đủ sáng.
- `shopping-memory`: mục tiêu là 4 chuyến thay cho 5. Nhặt nhầm lần thứ hai thì mẹ dặn lại danh sách mới. Không trừ điểm, nhưng chạm bừa không còn đi hết chuyến được.
- `pay-exact`: đưa thừa thì cô bán hàng trả lại cả khay, không chỉ tờ cuối, và đếm tiền mất 2,6 giây. Giá chỉ từ 2 đến 20 nghìn (mức dễ, theo quyết định của người sở hữu).
- `clock-catch`: dừng sai thì kim quay lùi 45 phút. Kim chạy 1 giờ trong 3 giây.
- `rice-plant`: bó mạ có 60 cây, và mỗi lần lấy mạ mất 0,4 giây.
- `rice-pound`: chạm lệch nhịp làm hai chày va nhau, bạn chờ 1 giây rồi giã chậm lại. Mục tiêu là 35 nhịp thay cho 40.
- `carp-waterfall`: nước mạnh kéo dài 1,4–1,8 giây nên nhảy liều mất nhiều mỏm hơn được. Mục tiêu là 12 mỏm thay cho 15.
- `spinning-top`: quất khi con quay chưa lắc thì quay đổ. Có 3 con quay. Mục tiêu là 40 giây thay cho 45.
- `cloud-blaster`: vòi chỉ phun khi đang chạm (danh mục ghi "tự phun"), nếu không thì để yên vòi giữa màn hình cũng thắng.
- `seal-balance`: chỉ tính giây khi bóng nghiêng dưới khoảng 13°. Mục tiêu là 35 thay cho 45 (bỏ mặc thì được khoảng 23).
- `pinball`: mục tiêu là 300 điểm thay cho 500. Bi mới lăn vào từ bên hông, nên phải bật cần gạt mới lên tới chuông. Mỗi bi được trả lại một lần nếu rơi trong 3 giây đầu.
- `low-to-high` (6 thay cho 8 lượt), `fruit-skewer` (8 thay cho 10 que), `butterfly-net` (10 thay cho 8 bướm, vì bot bắt rất dễ).
- `cookie-cutter`: đúng 2 tấm bột, lượt chơi kết thúc khi cả hai tấm hết chỗ. Bánh méo vẫn chiếm chỗ trên tấm bột.

## Còn mở

- `pnpm typecheck` báo lỗi ở file của lô khác, không phải G9: `games/bottle-rocket/logic.ts` (biến `HUD_SAFE_TOP` khai báo mà không dùng) và `games/simple-circuit/simple-circuit.test.ts` (sai kiểu `wires`).
- Ảnh chụp dùng theme mặc định (meadow), không đặt `region` theo map của từng game.
- Chưa có trẻ chơi thử, nên các mục tiêu trên mới dựa vào bot và ước lượng nhịp chơi của bé.
