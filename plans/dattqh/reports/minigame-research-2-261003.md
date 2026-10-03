# Research 2: 180 dạng minigame mới cho bé 7–8 tuổi (tổng 308)

Ngày 03/10/2026 · Tiếp nối [report 128 game](minigame-research-261003.md) · Người viết: agent researcher.

## Kết luận

- Danh mục có **180 dạng minigame mới**, mỗi dạng một cơ chế lõi riêng. Cộng với 128 trò đã làm là **308 trò**, vượt mục tiêu 300. Không id nào trùng với 128 thư mục trong `apps/web/src/ui/minigame/games/` hay 128 file `content/minigames/*.json` (đã kiểm bằng script).
- Danh mục chia thành 26 họ: 22 trong 23 họ của report đầu (không có game mới nào thuộc họ WHK, đập chạm mục tiêu) và 4 họ mới, gồm **NUM** (số, hình, đo lường), **CHU** (chữ, tiếng, vần), **SCI** (khoa học nhỏ) và **ARC** (arcade cổ điển). Về độ phức tạp: 115 game cỡ S, 59 cỡ M, 6 cỡ L. Về độ khó: 51 Dễ, 115 Vừa, 14 Khó.
- **Map nào cũng có ít nhất 20 game mới hợp bối cảnh** (yêu cầu là 14). Ít nhất là Khu rừng, Chợ phiên và Lâu đài, mỗi map 20 game; nhiều nhất là Trung tâm với 53 game.
- **44 game tập nhẹ Toán và Tiếng Việt**: 33 game Toán (đếm, so sánh, chục và đơn vị, cộng trừ, đồng hồ, đo cm, chia đều, hình, quy luật) và 11 game Tiếng Việt (tiếng, dấu thanh, đồng dao, nối từ, câu). Yêu cầu tối thiểu là 25. Không game nào là phiếu bài tập: con số hay con chữ là luật của trò chơi, ví dụ cổng phép tính trong game chạy, kim đồng hồ đang quay, chuột túi nhảy trên trục số, chạm đúng tiếng cuối của bài "Chi chi chành chành".
- **41 game mang văn hóa Việt**: trò dân gian (đánh đu, nhảy bao bố, nhảy sạp, cờ gánh, kéo cưa lừa xẻ, bắt trạch trong chum, pháo đất, đánh khăng, bỏ khăn, đi cà kheo…), lễ hội và nghề (thổi cơm thi, thả đèn hoa đăng, múa rối nước, tranh Đông Hồ, gốm Bát Tràng, tò he, xin chữ ông đồ, mâm ngũ quả), truyện và truyền thuyết (Sơn Tinh, cây tre trăm đốt, túi ba gang, Tấm Cám, cá chép vượt Vũ Môn).
- **Sáu lô G6–G11, mỗi lô 30 game.** Lô nào cũng có 19–20 game S, 9–10 game M và 1 game L, gồm 17–20 họ, 7–8 game Toán/Tiếng Việt và có game cho cả 12 map.
- **Hình ảnh**: 193 tên Fluent Emoji mà các game dùng đều có thư mục 3D trong `microsoft/fluentui-emoji@1ffb34c752ec`; không game nào thiếu hình. 92 tên đã có trong `sprites.ts`. 26 tên đã có file trong pack (thư mục `icons/` hoặc `props/`), chỉ cần thêm một dòng `REUSED`. **75 tên phải tải** (khoảng 2,3 MB nếu mỗi file khoảng 30 KB). Danh sách ở §6.
- **Rủi ro chính nằm ở âm thanh**: `playNote` hiện chỉ phát nốt có độ dài cố định. `dan-bau` cần trượt cao độ, còn `hold-notes` và `music-box` cần nốt giữ dài. Phải mở rộng API của host trước lô có các game này (xem §5).

## Quy ước đọc bảng

Các quy ước về sao, thua nhẹ, độ khó, cỡ S/M/L và 12 mã map giữ nguyên như [report đầu, phần "Quy ước đọc bảng"](minigame-research-261003.md#quy-ước-đọc-bảng). Quy tắc chạm cũng giữ nguyên như §2 của report đó: một cử chỉ chính (nhiều nhất hai), vùng chạm ≥ 2 × 2 cm, không bắt bé đọc mới chơi được, lượt 30–90 s. Ngoại lệ có chủ ý là 11 game họ CHU: trong các game này, đọc tiếng chính là nội dung chơi, nên chữ phải in to và luôn đi kèm hình.

Một game được tính là **khác cơ chế** khi khác ít nhất một trong ba thứ so với **mọi** game trong 128 trò và trong 179 game mới còn lại: động tác tay, mục tiêu, hoặc cách thắng/thua. Chỉ đổi hình hoặc đổi luật lọc (ví dụ "chỉ đập số chẵn") thì không tính. Cách kiểm và các cặp gần nhau nhất nằm ở §2.

Các trò đã chủ ý loại:

- **Có tính may rủi hoặc dính tới cờ bạc**: lô tô, cờ cá ngựa (gieo xúc xắc), máy quay số, mọi kiểu "quay thưởng".
  - `oan-tu-xi` không còn may rủi: bạn ra tay trước, bé chỉ phải chọn đúng theo luật.
  - `jar-estimate` là ước lượng rồi đếm lại, không đặt cược gì.
- **Có bạo lực với người**: Thánh Gióng, Thạch Sanh, đấu vật, đấm bốc, bắn tăng, bóng ném vào người.
  - Xe điện đụng và bi sắt là trò hội chợ, thể thao.
  - Nước chỉ dùng để tưới mây và dập lửa.

## 1. Họ cơ chế

| Mã | Họ cơ chế | Số game |
|---|---|---|
| RUN | Chạy, bay, leo | 7 |
| CAT | Hứng | 2 |
| DOD | Né, sống sót | 3 |
| AIM | Ngắm, ném | 7 |
| TIM | Chạm đúng lúc | 4 |
| MUS | Âm nhạc, nhịp | 7 |
| MEM | Trí nhớ | 5 |
| SRT | Phân loại, xếp thứ tự | 3 |
| PUZ | Đố, cờ, logic | 23 |
| MAZ | Mê cung | 4 |
| DRW | Vẽ | 2 |
| PHY | Vật lý | 8 |
| BLD | Xây, dựng | 6 |
| RAC | Đua, lái | 3 |
| SPO | Thể thao | 5 |
| COK | Nấu ăn | 2 |
| FSH | Câu, vớt | 2 |
| FRM | Nông trại | 4 |
| CLN | Dọn dẹp | 1 |
| SEE | Quan sát | 2 |
| FOL | Trò chơi dân gian | 15 |
| FES | Lễ hội, truyền thuyết | 8 |
| NUM | Số, hình, đo lường (mới) | 33 |
| CHU | Chữ, tiếng, vần (mới) | 11 |
| SCI | Khoa học nhỏ (mới) | 9 |
| ARC | Arcade cổ điển (mới) | 4 |

Bốn họ mới được tách riêng vì cần thêm hạ tầng: NUM và CHU cần sinh đề có kiểm (số và chữ đúng với lớp 2), SCI cần mô phỏng nhỏ (nổi chìm, bóng đổ, mạch điện, đòn bẩy), ARC cần va chạm nảy liên tục.

## 2. Kiểm trùng với 128 trò đã làm

Cách kiểm:

1. Đối chiếu id với `ls apps/web/src/ui/minigame/games` và `content/minigames/*.json`: không id nào trùng.
2. Đọc lại bảng 128 trò, rồi với mỗi game mới tìm trò gần nhất về cử chỉ, mục tiêu và cách thắng/thua.
3. Bỏ hoặc sửa ý tưởng chỉ là reskin. 13 game được lấy từ danh sách dự phòng của report đầu và thiết kế lại để khác cơ chế: `helix-drop`, `skate-tricks`, `hole-in-wall`, `cat-mouse`, `balloon-guard`, `cloud-blaster`, `pinball`, `mini-golf`, `air-hockey`, `parachute-land`, `spinning-top`, `odd-one-out`, `lights-out`.

Các cặp gần nhau nhất và điểm khác:

| Game mới | Game đã có gần nhất | Khác ở |
|---|---|---|
| `gravity-flip` | `runner` | Đổi mặt bám (trần/sàn) thay cho nhảy theo cung; chướng ngại ở cả hai phía |
| `zigzag-path` | `lane-runner` | Không có làn: mỗi chạm đổi hướng chéo, thua khi rơi khỏi mép đường |
| `crowd-gates` | `lane-runner` | Không né vật: chọn cổng theo phép tính, thắng theo số bạn cuối đường |
| `skate-tricks` | `runner` | Điểm đến từ trò làm trên không, phải xong trước lúc tiếp đất |
| `carp-waterfall` | `stick-bridge`, `doodle-climb` | Chờ nhịp nước yếu rồi mới nhảy; không đo độ dài, không lái |
| `rain-barrel` | `egg-catch` | Không di chuyển vật hứng: xoay tấm lá để đổi hướng giọt nước |
| `butterfly-net` | `firefly-torch` | Tốc độ kéo là luật chính: đi nhanh thì bướm bay mất |
| `bat-trach` | `whack-mole` | Phải bám theo mục tiêu đang chạy trong 2 s, không chạm một lần |
| `hole-in-wall` | `red-light` | Khớp tư thế với hình lỗ, không phải đi/dừng |
| `cat-mouse` | `pac-maze` | Cổng mở đóng theo nhịp; thắng bằng cách dụ mèo bị chặn |
| `balloon-guard` | `leaf-blow` | Bảo vệ một vật đang bay lên, đẩy vật rơi ra khỏi đường bay |
| `cloud-blaster`, `fire-hose` | `water-pistol` | Phun tự động theo hàng mây xuống dần; vòi cứu hỏa bay cong và lửa to dần (chọn đám cần dập trước) |
| `frisbee-dog` | `basketball` | Người bắt đang chạy, đĩa bay cong, phải ném đón trước |
| `mini-golf` | `marbles` | Đưa bóng vào lỗ qua tường bật, tính số gậy; không bắn bi khác |
| `petanque` | `curling` | Ném bổng rơi xuống, không xoa băng; bi sau đẩy bi trước |
| `pinball` | `plinko` | Bé điều khiển cần gạt suốt lượt, không chỉ chọn chỗ thả |
| `breakout` | `tennis-rally` | Đỡ bóng để phá hết gạch, không đấu với máy |
| `swing-push` | `jump-rope` | Nhún đúng pha để tích đà (cộng hưởng), không phải nhảy qua dây |
| `sack-race` | `jump-rope`, `swim-race` | Nhịp do chính cú nhảy trước quyết định (chạm lúc tiếp đất), có đua với bạn |
| `chi-chi` | `quick-draw` | Đoán trước tiếng cuối của bài đồng dao (đọc tiếng), không phản xạ với tín hiệu |
| `oan-tu-xi` | `balloon-rule-pop` | Chọn 1 trong 3 theo luật thắng/thua đổi mỗi lượt, không phải chạm/không chạm |
| `snap-match` | `memory-pairs` | So với lá ngay trước (nhớ 1 bước), thẻ không úp, tranh nhanh với máy |
| `stone-path-memory` | `simon-says` | Nhớ đường đi trên cả mặt suối (vị trí), không phải chuỗi 4 nút |
| `tidy-room`, `shopping-memory` | `whats-missing` | Đặt lại vị trí cũ, hoặc nhớ rồi tìm trong cảnh lớn; không hỏi món nào biến mất |
| `lunchbox-pack` | `trash-sort` | Ràng buộc mỗi hộp đủ 4 nhóm, không trùng; không phải thùng theo loại |
| `sink-float` | `conveyor-sort` | Đoán trước rồi xem kết quả vật lý; không có hình mẫu trên thùng |
| `nesting-dolls` | `hanoi-tower` | Lồng vào nhau theo cỡ liền kề, không có luật chuyển cột |
| `lights-out` | `pipe-connect` | Một chạm đổi 5 ô; không xoay ống |
| `unblock-ferry` | `crate-push`, `sliding-tiles` | Mỗi khối chỉ trượt theo trục của nó, mục tiêu là mở lối cho một khối |
| `tile-triple` | `pair-link`, `match-3` | Khay 7 chỗ, gom 3 ô; ô bị đè chưa chạm được |
| `bus-jam` | `ball-sort-tubes` | Khách cần lối ra trên lưới và xe đến theo thứ tự màu |
| `rotating-maze` | `maze-trace`, `ice-slide` | Xoay cả mê cung, bi tự lăn theo trọng lực |
| `merge-2048` | `fruit-merge` | Lưới vuốt cả bàn, không thả vật lý |
| `knot-untangle`, `tile-flood` | `flow-connect` | Kéo đỉnh cho hết cắt nhau / chọn màu lan vùng; không vẽ đường |
| `dig-channel` | `dig-tunnel`, `pipe-connect` | Đào mương cho nước hạt chảy; không có đá rơi, không xoay ô |
| `pull-pin` | `cut-rope` | Câu đố thứ tự rút chốt, không đung đưa |
| `circle-chick` | `sheepdog-herd` | Theo lượt: mỗi khúc rào, gà một bước; không lùa liên tục |
| `robot-path` | `maze-trace` | Lập trình trước rồi chạy, không kéo trực tiếp |
| `rice-pound` | `drum-beat`, `call-response` | Đánh nhịp xen với bạn (nhịp chẵn), không theo nốt chạy hay nhại câu |
| `keo-cua` | `milk-cow` | Kéo liên tục qua lại trùng pha tay bạn, không vuốt rời |
| `hold-notes` | `piano-tiles` | Giữ đúng độ dài nốt, không chạm |
| `firefly-sync` | `call-response` | Đồng bộ theo nhịp trôi dần, không nhại lại câu |
| `lantern-light` | `firefly-torch` | Giữ nhiều vật cùng lúc khỏi tắt (chia sự chú ý), không tìm kiếm |
| `thoi-com-thi` | `banh-xeo-flip` | Một thanh lửa phải giữ trong vùng, không quản lý nhiều chảo |
| `clock-catch` | `dart-wobble` | Dừng kim theo giờ đọc được trên mặt số |
| `to-he-roll` | `inflate-balloon` | Lăn qua lại để dài ra theo thước rồi cắt; đơn vị cm |
| `cake-decorate` | `recipe-assembly` | Đếm số lượng, không xếp thứ tự |
| `fair-share` | `fruit-slice` | Một nét cắt, thắng khi các phần bằng nhau |
| `pottery-wheel` | `scissor-trace` | Vuốt dáng trên vật đang quay so với đường viền |
| `ong-do-calligraphy` | `scissor-trace` | Tốc độ nét quyết định độ đậm mực |
| `magic-letters` | `dot-copy` | Nhận dạng chữ vẽ ở bất kỳ đâu, không nối chấm |
| `paper-fold-cut`, `one-stroke-house` | `scissor-trace`, `lawn-mower` | Đoán hình sau khi mở giấy gấp; đi qua mọi cạnh (không phải mọi ô) |
| `net-cast`, `ice-fishing` | `bobber-fishing` | Quăng phủ một vùng có trễ; đoán lỗ băng cá sắp tới |
| `chopsticks` | `claw-machine` | Giữ để kẹp và di chậm cho khỏi rơi, không cần gắp tự động |
| `hole-grow` | `leaf-blow` | Hố lớn dần theo đồ đã hút, không đẩy vào khung |
| `paper-io` | `lawn-mower`, `snake-dragon` | Khoanh vòng để chiếm vùng, vệt có thể bị cắt |
| `melting-floes` | `road-cross` | Sống trên các tảng đang chìm, không qua làn |
| `bird-flock` | `snake-dragon` | Đàn bay theo có độ trễ, không dài ra, không tự cắn đuôi |
| `seal-balance`, `stilts-walk` | `monkey-bridge` | Giữ bóng trên đế di động (con lắc ngược); bước chân bên nghiêng thay vì kéo ngược |
| `bottle-flip` | `basketball` | Lực vuốt quyết định số vòng lộn và việc chai đứng |
| `bumper-cars`, `drift-corner` | `kart-race`, `slot-cars` | Đẩy xe khác ra khỏi sàn; giữ để ôm cua quanh cột |
| `ferry-dock`, `parachute-land` | `path-guide` | Cập bến hoặc đáp với vận tốc nhỏ, có quán tính và gió |
| `high-dive` | `ski-jump` | Một chạm để dừng vòng lộn, không có pha lấy đà |

Bên trong 180 game mới cũng có vài cặp gần nhau. Chúng đã được giữ vì mục tiêu khác hẳn:

- `hole-grow` (hố lớn dần) và `magnet-sweep` (chỉ hút đồ sắt, phải mang tới hộp mới thả);
- `low-to-high` (nhớ vị trí số), `bamboo-hundred` (đếm cách theo bước) và `book-shelf-order` (chèn vào dãy đang có);
- `three-span-bag` (chọn nhiều số cho vừa sức chứa) và `make-ten` (cặp đôi trong khi ô dâng lên);
- `fair-share` (cắt hình) và `penguin-share` (chia vật rời);
- bốn biến thể mê cung: `rotating-maze` (xoay cả mê cung), `portal-maze` (cổng dịch chuyển), `mirror-twins` (hai bạn đi đối xứng), `bat-echo` (chỉ thấy đường khi dơi kêu).

**Ý tưởng đã bỏ vì trùng cơ chế** (dùng làm dự phòng sau khi được sửa lại):

- trùng với game đã làm:
  - `paper-plane` gần `frisbee-dog`;
  - `color-switch` gần `flappy-fly`;
  - `tetris` gần `block-fit`;
  - `jenga` gần `pick-sticks`;
  - `connect-four` gần `co-caro`;
  - `freeze-dance` gần `red-light`;
  - `pearl-dive` và `lunar-lander` gần `jetpack-hold`;
  - `hill-climb` gần `slot-cars`;
  - `greasy-pole` gần `tug-of-war`;
  - `bubble-tea` gần `water-pour`;
  - `dalgona` gần `scissor-trace`;
  - `arrow-escape` gần `pick-sticks`;
- trùng với game mới trong danh mục này:
  - `cradle-rock` gần `swing-push`;
  - `veggie-chop` gần `rice-plant`;
  - `plank-sum` gần `three-span-bag`.

## 3. Danh mục 180 game mới

Cột "Lô" là G6–G11 (ghi số 6–11). Cột Map ghi map hợp bối cảnh, map đầu tiên là gợi ý chính.

| # | id | Tên | Luật chơi | Điều khiển | Thắng: mục tiêu 1★ | Thua (nhẹ) | Họ | Map | Khó | Cỡ | Lô | Nguồn / cảm hứng |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `bird-flock` | Đàn chim bay chữ V | Kéo chim đầu đàn; cả đàn bay theo sau với độ trễ; đưa cả đàn qua các vòng mây | Kéo | 15 vòng với ≥ 5 chim trong 60 s | Chim lạc: bay về đàn sau 3 s | RUN | FO DA | Vừa | M | 8 | [Flocking](https://en.wikipedia.org/wiki/Flocking) |
| 2 | `carp-waterfall` | Cá chép vượt Vũ Môn | Cá chép bơi ngược thác theo các mỏm đá; nước dội từng đợt; chạm để nhảy lên mỏm trên khi đợt nước đang yếu | Chạm | Lên 15 mỏm trong 60 s | Nhảy lúc nước mạnh: trôi xuống 1 mỏm | RUN | LS LD | Vừa | S | 9 | [Cá chép (truyền thuyết vượt Vũ Môn)](https://vi.wikipedia.org/wiki/C%C3%A1_ch%C3%A9p) |
| 3 | `gravity-flip` | Lật trọng lực | Bé chạy tự động trong hang đá; chạm để rơi lên trần hoặc xuống sàn, tránh cột băng và hố | Chạm | Chạy 400 m trong 60 s | Vấp: chậm lại 1 s | RUN | NU LD | Vừa | S | 10 | [Gravity Guy](https://en.wikipedia.org/wiki/Gravity_Guy) |
| 4 | `helix-drop` | Bóng xuống tháp xoắn | Tháp tròn có các tầng khuyết; bóng nảy tại chỗ; xoay tháp cho bóng rơi qua khe, tránh mảng đỏ | Kéo ngang để xoay tháp | Xuống 20 tầng trong 60 s | Chạm mảng đỏ: bóng nảy lên 1 tầng, mất 1/3 tim | RUN | LD TT | Vừa | M | 7 | [Helix Jump (Voodoo, 2019) – hyper-casual](https://en.wikipedia.org/wiki/Hypercasual_game) |
| 5 | `skate-tricks` | Trượt ván làm trò | Ván tự chạy; vuốt lên để bật, khi đang bay vuốt một hướng để làm trò; trò chỉ tính khi xong trước lúc chạm đất | Vuốt | 15 trò trong 60 s | Làm trò dở mà chạm đất: ngã, đứng dậy sau 1 s | RUN | TT XM | Vừa | M | 9 | [Tony Hawk's Pro Skater](https://en.wikipedia.org/wiki/Tony_Hawk%27s_Pro_Skater) |
| 6 | `wall-jump` | Nhảy vách hẻm núi | Bé bám vách, chạm để bật sang vách bên kia; tránh mỏm băng, nhặt sao | Chạm | Lên 60 m trong 60 s | Trúng mỏm: tụt 5 m | RUN | NU FO | Vừa | S | 11 | [Hyper-casual (CrazyLabs: cơ chế)](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) |
| 7 | `zigzag-path` | Đường zíc zắc | Bóng tự lăn chéo trên con đường gấp khúc; chạm để đổi hướng chéo cho bóng không rơi khỏi mép; nhặt ngọc | Chạm | Qua 60 khúc rẽ trong 60 s | Rơi khỏi đường: quay lại khúc trước | RUN | FO NU DA | Vừa | S | 6 | [ZigZag (Ketchapp)](https://en.wikipedia.org/wiki/Ketchapp) |
| 8 | `butterfly-net` | Rón rén bắt bướm | Bướm bay lượn; đưa vợt lại gần thật chậm (đi nhanh bướm giật mình bay xa) rồi thả tay để chụp | Kéo chậm, thả để chụp | 8 bướm trong 60 s | Bướm sợ: bay xa, không trừ | CAT | FO NT NB | Vừa | S | 9 | [Animal Crossing (bắt bọ)](https://en.wikipedia.org/wiki/Animal_Crossing) |
| 9 | `rain-barrel` | Hứng mưa vào chum | Mưa rơi; kéo để xoay tấm lá chuối, giọt nước trượt theo lá vào chum đang cạn; chum đầy thì đổi chum | Kéo để xoay lá | Đầy 4 chum trong 60 s | Hết giờ | CAT | LS NT XM | Vừa | M | 7 | [WarioWare microgames](https://www.mariowiki.com/Microgame) |
| 10 | `balloon-guard` | Hộ tống bóng bay | Bóng bay tự bay lên; kéo chiếc ô gạt lá, hạt dẻ, đá nhỏ đang rơi ra khỏi đường bóng | Kéo ô | Bay lên 100 m trong 60 s | Bóng chạm vật: chậm lại; 3 lần thì tới đích sớm | DOD | FO TT NU | Vừa | M | 7 | [Rise Up (hyper-casual, 2018)](https://en.wikipedia.org/wiki/Hypercasual_game) |
| 11 | `hole-in-wall` | Chui qua lỗ tường | Bức tường xốp có lỗ hình dáng người tiến tới; chạm để đổi tư thế (đứng, quỳ, giơ tay, dang chân) cho khớp lỗ | Chạm để đổi tư thế | Qua 12 tường trong 60 s | Không khớp: tường xốp đẩy bé ngã nhẹ, mất 1/3 tim | DOD | TT SC | Dễ | S | 8 | [Brain Wall (Hole in the Wall)](https://en.wikipedia.org/wiki/Brain_Wall) |
| 12 | `melting-floes` | Băng trôi tan dần | Bé và ba bạn đứng trên các tảng băng; tảng nứt rồi chìm sau vài giây; chạm tảng kề để nhảy sang | Chạm tảng kề | Trụ 60 s, nhặt 10 cá | Rơi xuống nước: bơi lên tảng gần nhất, mất 1/3 tim | DOD | NU DA | Vừa | M | 11 | [Mario Party minigames](https://www.mariowiki.com/List_of_Mario_Party_minigames) |
| 13 | `bank-shot` | Bóng bật tường | Bạn đứng sau chồng thùng; ngắm cho bóng bật vào tường rồi tới tay bạn; đường chấm chỉ hiện tới lần bật đầu | Kéo để ngắm, thả để ném | 8 lần tới tay / 12 bóng | Hết bóng | AIM | SC TT | Vừa | S | 10 | [Clubhouse Games 51](https://en.wikipedia.org/wiki/Clubhouse_Games:_51_Worldwide_Classics) |
| 14 | `boomerang-throw` | Ném boomerang | Vuốt để ném; boomerang bay vòng cung qua chùm quả rồi quay về; chạm để bắt khi nó về | Vuốt, chạm | 20 quả trong 60 s | Không bắt được: chờ 2 s lấy cái mới | AIM | FO DA | Vừa | M | 9 | [Boomerang](https://en.wikipedia.org/wiki/Boomerang) |
| 15 | `cloud-blaster` | Tưới mây khô | Mây khô trôi xuống từng hàng; kéo vòi phun qua lại, vòi tự phun lên; mây đủ ướt thì thành mưa rơi xuống ruộng | Kéo ngang | 30 mây thành mưa trong 60 s | Mây chạm đất: mất 1/3 tim | AIM | NT NU | Vừa | M | 9 | [Space Invaders](https://en.wikipedia.org/wiki/Space_Invaders) |
| 16 | `fire-hose` | Bé làm lính cứu hỏa | Lửa nhỏ bùng ở các ô cửa và to dần; kéo vòi, tia nước bay cong theo trọng lực; dập tắt hẳn từng đám | Giữ và kéo | Dập 15 đám trong 60 s | Lửa to: chuông kêu, không thua giữa chừng | AIM | XM TT | Dễ | S | 6 | [WarioWare microgames](https://www.mariowiki.com/Microgame) |
| 17 | `frisbee-dog` | Ném đĩa cho cún | Cún chạy ngang sân; vuốt (vuốt cong thì đĩa lượn) để đĩa rơi đúng chỗ cún sắp tới | Vuốt | 8 lần cún bắt / 12 đĩa | Hết đĩa | AIM | NB FO TT | Vừa | S | 7 | [Disc dog](https://en.wikipedia.org/wiki/Disc_dog) |
| 18 | `paint-splat` | Ném màu tô tranh | Quả bóng màu đổi màu theo vòng; chạm vào vùng tranh khi bóng đang mang đúng màu của vùng đó | Chạm | Tô kín 3 tranh trong 90 s | Ném lệch màu: vùng bị lem, ném lại | AIM | SC TT NB | Dễ | S | 11 | [Splatoon (phủ màu)](https://en.wikipedia.org/wiki/Splatoon) |
| 19 | `skipping-stones` | Ném thia lia | Vuốt ngang mặt hồ; vuốt càng thẳng, nhanh và thấp thì đá nảy càng nhiều lần; nhặt sao trên mặt nước | Vuốt | 30 lần nảy với 6 viên | Hết đá | AIM | LS DA NU | Dễ | S | 8 | [Stone skipping](https://en.wikipedia.org/wiki/Stone_skipping) |
| 20 | `chain-pop` | Sứa sáng dây chuyền | Sứa bơi lượn; chạm một lần cho một vòng sáng nở ra, sứa chạm vòng thì cũng nở sáng; mỗi màn chỉ một lần chạm | Chạm | Qua 8 màn (đủ số sứa sáng) | Thiếu sứa: chơi lại màn đó | TIM | DA LS | Dễ | S | 9 | [Hyper-casual (CrazyLabs: cơ chế)](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) |
| 21 | `micro-mix` | Thử thách chớp nhoáng | Chuỗi trò 5 giây liên tiếp, chỉ dùng chạm và vuốt: hái táo, đóng cửa, tắt đèn, đuổi ruồi, bắt bóng…; nhanh dần | Chạm, vuốt | Thắng 12 trò trong 90 s | Thua một trò: mất 1 tim / 4 | TIM | TT NB | Vừa | L | 11 | [WarioWare microgames](https://www.mariowiki.com/Microgame) |
| 22 | `pop-lock` | Mở khóa rương | Kim quay quanh ổ khóa; chạm khi kim chạm chấm vàng; mỗi lần đúng kim đổi chiều | Chạm | Mở 4 khóa (6 chấm mỗi khóa) trong 60 s | Hụt: khóa đó làm lại | TIM | LD DA | Vừa | S | 7 | [Hyper-casual (CrazyLabs: cơ chế)](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) |
| 23 | `yo-yo` | Chơi yo-yo | Vuốt xuống để thả; chạm khi yo-yo xuống tới đáy dây để nó cuộn lên; đúng lúc thì được làm trò | Vuốt, chạm | 20 lần cuộn trong 60 s | Lỡ: dây chùng, thả lại | TIM | NB XM | Dễ | S | 10 | [Yo-yo](https://en.wikipedia.org/wiki/Yo-yo) |
| 24 | `bird-choir` | Dàn đồng ca chim | Năm chú chim trên dây điện hát theo nhịp; một chú hát lệch nhịp hoặc lệch tông; chạm chú đó | Chạm | 10 lần đúng trong 60 s | Sai: chim kêu "chíp?", không trừ | MUS | FO LS NT | Vừa | S | 11 | [Rhythm Heaven](https://en.wikipedia.org/wiki/Rhythm_Heaven) |
| 25 | `dan-bau` | Đàn bầu | Dải cao độ uốn lượn chạy tới; kéo cần đàn lên xuống cho chấm âm nằm trên dải | Kéo lên/xuống | Bám dải 70% thời gian | Hết bài | MUS | LS TV | Vừa | S | 6 | [Đàn bầu](https://en.wikipedia.org/wiki/%C4%90%C3%A0n_b%E1%BA%A7u) |
| 26 | `firefly-sync` | Đom đóm nháy cùng nhịp | Đàn đom đóm nháy theo một nhịp đổi dần; chạm để đèn của bé nháy trùng nhịp, đom đóm nháy trùng thì bay theo bé | Chạm theo nhịp | Rủ 20 đom đóm trong 60 s | Lệch nhịp: đom đóm bay đi, không trừ | MUS | FO LS | Vừa | S | 8 | [Rhythm Heaven / đồng bộ nhịp](https://en.wikipedia.org/wiki/Rhythm_game) |
| 27 | `hold-notes` | Tiếng sáo diều | Nốt sáo dài ngắn chạy tới vạch; giữ ngón đúng độ dài từng nốt | Giữ, thả | Đúng 70% nốt | Hết bài | MUS | LS NT | Vừa | S | 7 | [Guitar Hero (nốt giữ)](https://en.wikipedia.org/wiki/Guitar_Hero) |
| 28 | `music-box` | Hộp nhạc | Nghe một câu nhạc 4–6 nốt; chạm ô trên trống hộp nhạc để cắm chốt, quay thử, sửa tới khi giống | Chạm ô | 4 câu trong 90 s | Hết giờ: hiện chốt sai | MUS | TV NB | Khó | M | 10 | [Music box](https://en.wikipedia.org/wiki/Music_box) |
| 29 | `pitch-stairs` | Cầu thang nốt nhạc | Nghe hai nốt (nhũ băng sáng theo nốt); chạm mũi tên lên nếu nốt sau cao hơn, xuống nếu thấp hơn; bé leo cầu thang | Chạm 2 nút | Lên 15 bậc trong 60 s | Sai: đứng yên | MUS | NU TV | Vừa | S | 10 | [Ear training](https://en.wikipedia.org/wiki/Ear_training) |
| 30 | `rice-pound` | Giã gạo | Hai chày giã luân phiên; bạn giã nhịp lẻ, bé chạm nhịp chẵn; nhịp nhanh dần | Chạm theo nhịp | 40 nhịp đúng trong 60 s | Lỡ nhịp: chày bạn đợi, không trừ | MUS | NT LS | Dễ | S | 9 | [Cối giã gạo (Wiki VN)](https://vi.wikipedia.org/wiki/C%E1%BB%91i_gi%C3%A3_g%E1%BA%A1o) |
| 31 | `customer-memory` | Nhớ món khách gọi | Khách nói món rồi ngồi chờ, bong bóng lời biến mất; chạm khách rồi chạm đúng món | Chạm khách, chạm món | 12 khách trong 90 s | Mang nhầm: khách nhắc lại 1 lần | MEM | CP TT | Vừa | M | 11 | [Diner Dash](https://en.wikipedia.org/wiki/Diner_Dash) |
| 32 | `shopping-memory` | Nhớ đồ đi chợ | Mẹ đưa danh sách bằng hình trong 5 s; đi dọc các sạp (cuộn ngang), chạm đúng các món đã nhớ | Chạm | 5 chuyến chợ trong 90 s | Nhặt nhầm: bỏ lại sạp, không trừ | MEM | CP | Dễ | S | 9 | [Kim's Game](https://en.wikipedia.org/wiki/Kim%27s_Game) |
| 33 | `snap-match` | Ai nhanh mắt | Bài lật từng lá; chạm khi lá mới giống lá ngay trước; máy cũng tranh chạm | Chạm | Ăn 10 lần trước máy trong 60 s | Chạm sai: mất 1 lá | MEM | TV XM | Dễ | S | 8 | [Snap (card game)](https://en.wikipedia.org/wiki/Snap_(card_game)) |
| 34 | `stone-path-memory` | Nhớ đường đá qua suối | Các viên đá (tảng băng) trên suối sáng lần lượt thành một đường; sau đó bé chạm lại đúng đường đó | Chạm | Qua 6 con suối (đường dài 4 → 8) | Sai: đá chìm nhẹ, xem lại đường | MEM | LS FO NU | Vừa | S | 10 | [Corsi block-tapping test](https://en.wikipedia.org/wiki/Corsi_block-tapping_test) |
| 35 | `tidy-room` | Đồ về đúng chỗ | Xem phòng gọn trong 4 s; em bé bày bừa; kéo từng món về đúng chỗ cũ | Kéo | 3 phòng trong 90 s | Đặt sai: món nhảy về giữa phòng | MEM | NB XM | Dễ | S | 6 | [Spatial ability](https://en.wikipedia.org/wiki/Spatial_ability) |
| 36 | `lunchbox-pack` | Hộp cơm đủ chất | Mỗi hộp cần đủ 4 nhóm (cơm, rau, thịt cá, quả); món trôi qua; kéo vào ngăn, không trùng nhóm | Kéo | 8 hộp trong 90 s | Hộp thiếu: tính nửa | SRT | SC NB | Dễ | S | 7 | [PBS KIDS games](https://pbskids.org/games) |
| 37 | `nesting-dolls` | Búp bê lồng nhau | 6–8 búp bê to nhỏ gần bằng nhau; kéo búp bê nhỏ vào búp bê lớn hơn liền kề tới khi còn một | Kéo | 3 bộ trong 90 s | Sai cỡ: búp bê bật ra | SRT | NB TV CP | Vừa | S | 11 | [Matryoshka doll](https://en.wikipedia.org/wiki/Matryoshka_doll) |
| 38 | `odd-one-out` | Con nào khác? | 5 hình nhảy múa; chạm hình khác nhóm (màu, loài, công dụng); nhanh dần | Chạm | 15 lượt đúng trong 60 s | Sai: không trừ | SRT | TV SC FO | Dễ | S | 8 | [Odd One Out](https://en.wikipedia.org/wiki/Odd_One_Out) |
| 39 | `ant-lemmings` | Đàn kiến về tổ | Kiến đi thẳng, gặp tường thì quay lại; chạm một kiến để nó đứng chặn (kiến khác quay đầu) hoặc nằm làm cầu qua khe | Chạm kiến | 20 kiến về tổ trong 90 s | Kiến lạc ra ngoài: không trừ | PUZ | FO NT | Vừa | L | 8 | [Lemmings](https://en.wikipedia.org/wiki/Lemmings_(video_game)) |
| 40 | `bus-jam` | Khách lên xe buýt | Khách áo màu đứng kín bến; chạm khách có lối ra để đưa lên xe buýt cùng màu đang đỗ; xe đầy thì chạy | Chạm | 5 xe đầy trong 90 s | Hàng chờ đầy: bàn làm lại | PUZ | TT XM | Vừa | M | 8 | [Hyper-casual (CrazyLabs: cơ chế)](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) |
| 41 | `bus-lines` | Vẽ tuyến xe buýt | Nhà và trạm có hình (tròn, vuông, tam giác); kéo nối thành tuyến; khách đứng chờ tới đúng trạm cùng hình | Kéo vẽ tuyến | Chở 40 khách trong 90 s | Trạm quá đông: trạm nhấp nháy, không thua giữa chừng | PUZ | TT XM | Khó | L | 6 | [Mini Metro](https://en.wikipedia.org/wiki/Mini_Metro_(video_game)) |
| 42 | `circle-chick` | Rào bắt gà con | Mỗi lần bé dựng một khúc rào, gà con chạy một bước về phía mép; vây gà trước khi nó ra mép | Chạm ô | Vây 4 gà trong 90 s | Gà thoát: gà tự về chuồng, ván mới | PUZ | NT NB | Vừa | M | 9 | [Hyper-casual (CrazyLabs: cơ chế)](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) |
| 43 | `dots-boxes` | Ô vuông nối chấm | Lần lượt nối một cạnh; ai khép ô thì được ô và đi tiếp; đấu máy | Chạm cạnh | Thắng 1 ván 4×4 | Thua: ván mới, máy dễ hơn | PUZ | SC TV | Vừa | M | 9 | [Dots and boxes](https://en.wikipedia.org/wiki/Dots_and_boxes) |
| 44 | `five-fruit-tray` | Bày mâm ngũ quả | Đặt 5 loại quả lên mâm hình hoa; hai ô kề nhau không cùng loại và mâm đủ 5 loại | Kéo | 4 mâm trong 90 s | Kề trùng: quả lăn ra | PUZ | NB CP | Vừa | S | 10 | [Mâm ngũ quả (Wiki VN)](https://vi.wikipedia.org/wiki/M%C3%A2m_ng%C5%A9_qu%E1%BA%A3) |
| 45 | `gear-train` | Bánh răng quay | Kéo bánh răng vào chốt cho chuỗi bánh nối từ tay quay tới cối xay | Kéo | 3 máy trong 90 s | Hết giờ | PUZ | LD NT | Vừa | M | 10 | [Gear train](https://en.wikipedia.org/wiki/Gear_train) |
| 46 | `ice-bridge` | Đóng băng làm cầu | Hồ chia ô; chạm ô nước để đóng băng, mỗi ô tốn 1 bông tuyết; nối bờ này sang bờ kia với ít bông tuyết nhất | Chạm ô | 4 hồ trong 90 s | Thiếu bông tuyết: hồ làm lại | PUZ | NU | Vừa | S | 7 | [Shortest path problem](https://en.wikipedia.org/wiki/Shortest_path_problem) |
| 47 | `knight-hop` | Mã đi tìm sao | Quân mã đi hình chữ L; chạm ô hợp lệ để nhặt hết sao trên bàn 5×5 | Chạm | 4 bàn trong 90 s | Ô không hợp lệ: không đi | PUZ | LD | Vừa | S | 10 | [Knight (chess)](https://en.wikipedia.org/wiki/Knight_(chess)) |
| 48 | `knot-untangle` | Gỡ rối dây bóng | Các bóng bay nối dây chéo nhau; kéo bóng cho không dây nào cắt nhau | Kéo | 3 chùm trong 90 s | Hết giờ | PUZ | CP TV | Vừa | M | 11 | [Planarity](https://en.wikipedia.org/wiki/Planarity) |
| 49 | `lights-out` | Bật đèn cửa sổ | Chạm một cửa sổ thì nó và 4 cửa kề đổi sáng/tối; thắp sáng cả lưới 3×3 rồi 4×4 | Chạm | 3 bàn trong 90 s | Kẹt: nút làm lại, gợi ý | PUZ | LD TT | Khó | M | 6 | [Lights Out](https://en.wikipedia.org/wiki/Lights_Out_(game)) |
| 50 | `mastermind` | Đoán mã ngọc | Rương khóa bằng 3 viên ngọc màu; đoán, rương báo bao nhiêu viên đúng chỗ, bao nhiêu đúng màu sai chỗ | Chạm ngọc | Mở 2 rương, mỗi rương ≤ 8 lần đoán | Hết lượt: hiện mã | PUZ | LD DA | Khó | M | 7 | [Mastermind / Hit and Blow](https://en.wikipedia.org/wiki/Mastermind_(board_game)) |
| 51 | `nonogram` | Tranh ô số | Lưới 5×5, mỗi hàng/cột ghi số ô cần tô; chạm ô để tô cho hiện hình con vật | Chạm | 2 tranh trong 90 s | Hết giờ: hiện các ô đúng | PUZ | TV SC NU | Khó | M | 10 | [Nonogram](https://en.wikipedia.org/wiki/Nonogram) |
| 52 | `peg-solitaire` | Nhảy quân còn một | Bàn tam giác 15 lỗ; quân nhảy qua quân kề vào lỗ trống, quân bị nhảy qua được nhặt ra | Chạm quân, chạm lỗ | Còn ≤ 2 quân trong 90 s | Kẹt: nút lùi | PUZ | LD TV | Khó | M | 8 | [Peg solitaire](https://en.wikipedia.org/wiki/Peg_solitaire) |
| 53 | `reef-sweeper` | Dò đá ngầm | Mỗi ô cát ghi số đá ngầm quanh nó; mở ô an toàn, giữ để cắm cờ lên đá; bàn 5×5 có 3 đá | Chạm mở, giữ cắm cờ | 3 bàn trong 90 s | Mở trúng đá: đá lộ ra, mất 1/3 tim | PUZ | DA | Khó | M | 6 | [Minesweeper](https://en.wikipedia.org/wiki/Minesweeper_(video_game)) |
| 54 | `reversi` | Cờ lật | Đặt quân kẹp quân máy theo hàng ngang, dọc, chéo để lật màu; bàn 6×6 | Chạm ô | Nhiều quân hơn máy khi hết bàn | Thua: máy dễ hơn | PUZ | SC TT | Khó | M | 7 | [Reversi](https://en.wikipedia.org/wiki/Reversi) |
| 55 | `river-crossing` | Qua sông chở đồ | Thuyền chở bé và một thứ; chó không ở lại riêng với gà, gà không ở lại riêng với thóc; chở hết sang bờ kia | Chạm đồ, chạm thuyền | 2 bài trong 90 s | Sai luật: gà mổ thóc (vui), làm lại | PUZ | LS NT | Vừa | S | 7 | [River crossing puzzle](https://en.wikipedia.org/wiki/River_crossing_puzzle) |
| 56 | `robot-path` | Rô-bốt hút bụi | Xếp dãy lệnh (đi, rẽ trái, rẽ phải) rồi bấm chạy; rô-bốt phải hút hết bụi, không đụng đồ | Chạm lệnh, chạm Chạy | 4 phòng trong 90 s | Đụng đồ: rô-bốt dừng, sửa lệnh | PUZ | NB TV | Vừa | M | 7 | [Logo / turtle graphics](https://en.wikipedia.org/wiki/Turtle_graphics) |
| 57 | `seat-logic` | Xếp chỗ tiệc vua | Bàn tiệc 4–5 ghế; gợi ý bằng hình (thỏ ngồi cạnh rùa, mèo không ngồi cạnh chuột); kéo khách vào ghế cho đúng hết | Kéo | 4 bàn tiệc trong 90 s | Sai: khách cau mày, kéo lại | PUZ | LD NB | Khó | M | 11 | [Zebra puzzle (logic xếp chỗ)](https://en.wikipedia.org/wiki/Zebra_Puzzle) |
| 58 | `sudoku-mini` | Sudoku quả 4×4 | Lưới 4×4 với 4 loại quả; mỗi hàng, cột, ô 2×2 có đủ 4 loại; kéo quả vào ô trống | Kéo (hoặc chạm quả rồi chạm ô) | 3 bàn trong 90 s | Sai luật: quả rung, không trừ | PUZ | TV SC | Vừa | M | 6 | [Sudoku](https://en.wikipedia.org/wiki/Sudoku) |
| 59 | `tile-flood` | Lan màu | Chạm một màu, vùng từ góc lan sang các ô kề cùng màu; phủ cả lưới một màu trong số bước cho phép | Chạm màu | 3 bàn trong 90 s | Hết bước: bàn mới | PUZ | TT NT | Vừa | S | 9 | [Flood-It / flood fill](https://en.wikipedia.org/wiki/Flood_fill) |
| 60 | `tile-triple` | Xếp ba ô giống | Các ô hình chồng nhiều lớp; chạm ô không bị đè để đưa xuống khay 7 chỗ; 3 ô giống nhau trong khay thì biến mất | Chạm | Dọn 2 bàn trong 90 s | Khay đầy: bàn làm lại, giữ điểm | PUZ | CP TV TT | Vừa | M | 7 | [Mahjong solitaire / tile-matching](https://en.wikipedia.org/wiki/Mahjong_solitaire) |
| 61 | `unblock-ferry` | Thoát kẹt bến thuyền | Thuyền dài ngắn nằm dọc ngang; kéo trượt thuyền theo chiều của nó cho thuyền vàng ra cửa sông | Kéo | 3 bàn trong 90 s | Kẹt: nút lùi | PUZ | LS DA | Vừa | M | 10 | [Rush Hour (puzzle)](https://en.wikipedia.org/wiki/Rush_Hour_(puzzle)) |
| 62 | `bat-echo` | Dơi con tìm đường | Hang tối; kéo để bay, chạm để kêu, vách hang sáng lên 1 s quanh dơi; tới cửa hang có trăng | Kéo, chạm | Qua 4 hang trong 90 s | Chạm vách: dơi choáng 1 s | MAZ | FO NU | Vừa | M | 8 | [Animal echolocation](https://en.wikipedia.org/wiki/Animal_echolocation) |
| 63 | `mirror-twins` | Hai bạn soi gương | Vuốt để đi một ô; bạn trong gương đi cùng lúc nhưng ngược trái phải; cả hai phải cùng đứng trên ngôi sao của mình | Vuốt 4 hướng | 4 bàn trong 90 s | Kẹt: nút lùi | MAZ | LD TV | Khó | M | 10 | [Reflection symmetry](https://en.wikipedia.org/wiki/Reflection_symmetry) |
| 64 | `portal-maze` | Mê cung cổng phép | Mê cung có các cặp cổng cùng màu; đi vào cổng này thì ra cổng kia; kéo tìm đường tới rương | Kéo | 4 mê cung trong 90 s | Hết giờ | MAZ | LD DA | Vừa | S | 11 | [Maze](https://en.wikipedia.org/wiki/Maze) |
| 65 | `rotating-maze` | Mê cung xoay | Kéo vòng quanh tâm để xoay cả mê cung; bi lăn theo trọng lực tới cửa ra | Kéo xoay | 4 mê cung trong 90 s | Kẹt: nút làm lại | MAZ | LD NU | Vừa | M | 6 | [Labyrinth (marble game)](https://en.wikipedia.org/wiki/Labyrinth_(marble_game)) |
| 66 | `one-stroke-house` | Vẽ nhà một nét | Hình ngôi nhà phong bì và các hình khác; vẽ đi qua mọi cạnh đúng một lần, không nhấc tay | Kéo vẽ | 6 hình trong 90 s | Kẹt: nét mờ đi, vẽ lại | DRW | TV XM SC | Vừa | S | 7 | [Eulerian path (vẽ một nét)](https://en.wikipedia.org/wiki/Eulerian_path) |
| 67 | `paper-fold-cut` | Gấp giấy cắt hoa | Giấy gấp đôi, gấp tư, gấp sáu (bông tuyết); vuốt một nét cắt; mở ra phải giống mẫu | Vuốt | 5 hình trong 90 s | Khác mẫu: thử lại | DRW | SC NB NU | Vừa | M | 6 | [Paper snowflake](https://en.wikipedia.org/wiki/Paper_snowflake) |
| 68 | `bottle-flip` | Lật chai | Vuốt lên với lực vừa đủ để chai lộn một vòng rồi đứng trên bàn, bậc, ghế | Vuốt lên | 8 lần đứng / 15 | Đổ: chai lăn, lượt sau | PHY | TT XM SC | Vừa | S | 11 | [Bottle flipping](https://en.wikipedia.org/wiki/Bottle_flipping) |
| 69 | `current-drift` | Dòng nước đưa thư | Chai thư trôi theo dòng; chạm để đặt 3 tảng đá lái dòng, rồi thả chai cho chai tới đảo | Chạm đặt đá, chạm thả | 4 đảo trong 90 s | Chai trôi lạc: bàn làm lại | PHY | DA LS | Vừa | M | 9 | [Hyper-casual (CrazyLabs: cơ chế)](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) |
| 70 | `dig-channel` | Đào mương dẫn nước | Kéo ngón để đào đất; nước chảy theo mương tới chậu tắm của vịt; tránh dẫn nước vào hố bùn | Kéo đào | 4 màn trong 90 s | Nước vào bùn: màn làm lại | PHY | NT LS NB | Vừa | L | 7 | [Where's My Water?](https://en.wikipedia.org/wiki/Where%27s_My_Water%3F) |
| 71 | `marble-run` | Đường bi lăn | Chạm các máng gỗ để đổi chiều nghiêng; bi thả xuống phải lăn vào đúng cốc cùng màu | Chạm máng | 12 bi đúng cốc trong 90 s | Sai cốc: không trừ | PHY | TV NB | Vừa | M | 6 | [Rolling ball sculpture (marble run)](https://en.wikipedia.org/wiki/Rolling_ball_sculpture) |
| 72 | `parachute-land` | Nhảy dù xuống đảo | Gió đẩy dù ngang; kéo để lái, đáp đúng chữ X trên bãi | Kéo ngang | 5 lần đáp trúng / 8 | Đáp lệch: vẫn có điểm theo khoảng cách | PHY | DA NU | Dễ | S | 10 | [Parachuting](https://en.wikipedia.org/wiki/Parachuting) |
| 73 | `pull-pin` | Rút chốt | Bi màu và bùn bị chặn bởi các chốt; vuốt rút chốt đúng thứ tự cho bi rơi vào cốc, không lẫn bùn | Vuốt chốt | 4 bàn trong 90 s | Bùn vào cốc: bàn làm lại | PHY | TT NT | Vừa | M | 8 | [Pull the Pin](https://en.wikipedia.org/wiki/Pull_the_Pin) |
| 74 | `rain-shield` | Che mưa cho cún | Vẽ một nét làm mái; mưa rơi 10 s, không giọt nào chạm cún | Kéo vẽ | 5 màn trong 90 s | Ướt: cún lắc mình, chơi lại màn | PHY | NB XM | Vừa | M | 8 | [Crayon Physics Deluxe (vẽ vật lý)](https://en.wikipedia.org/wiki/Crayon_Physics_Deluxe) |
| 75 | `seal-balance` | Hải cẩu đội bóng | Bóng nằm trên mũi hải cẩu; kéo hải cẩu qua lại để giữ bóng không rơi (con lắc ngược) | Kéo | Giữ bóng tổng 45 s | Rơi: bóng mới sau 1 s | PHY | DA TT | Vừa | S | 9 | [Pinniped (hải cẩu xiếc)](https://en.wikipedia.org/wiki/Pinniped) |
| 76 | `card-house` | Dựng nhà bài | Kéo từng lá bài đặt thành hình chữ A; kéo nhanh thì tay run, nhà lắc | Kéo chậm | 3 tầng nhà bài trong 90 s | Đổ: dựng lại tầng đó | BLD | LD TV | Vừa | M | 7 | [House of cards](https://en.wikipedia.org/wiki/House_of_cards) |
| 77 | `cup-stacking` | Xếp cốc thi đấu | Chạm cốc theo thứ tự để dựng tháp 3-3-3 rồi gỡ xuống; chạm sai thứ tự thì tháp đổ | Chạm | 4 lượt dựng-gỡ trong 60 s | Đổ: dựng lại tháp đó | BLD | SC NB | Dễ | S | 6 | [Sport stacking](https://en.wikipedia.org/wiki/Sport_stacking) |
| 78 | `domino-chain` | Domino đổ dây chuyền | Kéo dựng domino dọc đường cong, cách đều; chạm quân đầu để đẩy; chuỗi phải tới chuông | Kéo đặt, chạm đẩy | 3 đường trong 90 s | Hở chỗ: chuỗi dừng, dựng thêm | BLD | TT NB | Vừa | M | 9 | [Domino effect](https://en.wikipedia.org/wiki/Domino_effect) |
| 79 | `ice-sculpt` | Tạc tượng băng | Khối băng có bóng mẫu (cá, cánh cụt); chạm ô băng ngoài bóng để gõ đi; gõ nhầm ô trong bóng thì tượng mẻ | Chạm | 3 tượng ≥ 90% trong 90 s | Mẻ: trừ 5% độ đẹp | BLD | NU | Dễ | S | 11 | [Ice sculpture](https://en.wikipedia.org/wiki/Ice_sculpture) |
| 80 | `roof-tiles` | Lợp ngói trước mưa | Mái nhà chia ô; ngói phải lợp từ dưới lên, hàng trên đè hàng dưới; kéo ngói vào ô hợp lệ; mưa đến thì chỗ hở bị dột | Kéo | 3 mái kín trong 90 s | Dột: xô hứng nước, lợp tiếp | BLD | XM LD | Dễ | S | 10 | [WarioWare microgames](https://www.mariowiki.com/Microgame) |
| 81 | `sand-castle` | Xây lâu đài cát | Giữ để xúc cát vào xô (tới vạch), thả rồi chạm chỗ để úp; ướt quá thì sụt, khô quá thì vỡ | Giữ, chạm | 3 lâu đài 4 tháp trong 90 s | Tháp vỡ: xây lại | BLD | DA | Dễ | S | 8 | [Sand art and play](https://en.wikipedia.org/wiki/Sand_art_and_play) |
| 82 | `bumper-cars` | Xe điện đụng | Xe chạy theo ngón tay trên sàn tròn; đẩy xe máy ra khỏi sàn | Kéo | Đẩy 6 xe ra trong 60 s | Bị đẩy ra: vào lại sau 2 s | RAC | TT CP | Vừa | M | 9 | [Bumper cars](https://en.wikipedia.org/wiki/Bumper_cars) |
| 83 | `drift-corner` | Ôm cua | Xe tự chạy; giữ ngón để xe ôm vòng quanh cột ở góc cua, thả để chạy thẳng | Giữ, thả | Qua 30 góc cua trong 60 s | Văng khỏi đường: đặt lại góc vừa rồi | RAC | TT NU | Vừa | S | 11 | [Hyper-casual (CrazyLabs: cơ chế)](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) |
| 84 | `ferry-dock` | Cập bến phà | Phà trôi theo đà và dòng nước; kéo để chỉnh hướng; cập bến thật chậm, đúng ô | Kéo | 6 lần cập bến trong 90 s | Cập mạnh: phà nảy ra, thử lại | RAC | LS DA | Vừa | S | 7 | [Lunar Lander (thể loại)](https://en.wikipedia.org/wiki/Lunar_Lander_(video_game_genre)) |
| 85 | `air-hockey` | Khúc côn cầu bàn hơi | Kéo vợt đẩy đĩa vào khung máy, chặn đĩa của máy | Kéo | Thắng 5 bàn trước máy | Thua ván: máy chậm hơn | SPO | TT NU | Vừa | M | 7 | [Air hockey](https://en.wikipedia.org/wiki/Air_hockey) |
| 86 | `high-dive` | Nhảy cầu | Bé lộn vòng khi rơi; chạm để duỗi người, thân càng thẳng lúc chạm nước càng ít bọt | Chạm | 5 cú đẹp / 8 | Bụng chạm nước: tiếng bẹp vui, không trừ | SPO | DA LS | Dễ | S | 11 | [Diving (sport)](https://en.wikipedia.org/wiki/Diving_(sport)) |
| 87 | `mini-golf` | Golf mini | Kéo ngược để chọn hướng và lực; bóng bật tường, qua cầu, vào lỗ | Kéo ngược, thả | 6 lỗ với ≤ 18 gậy | Quá 5 gậy một lỗ: bóng tự đặt cạnh lỗ | SPO | NB TT DA | Dễ | M | 9 | [Miniature golf](https://en.wikipedia.org/wiki/Miniature_golf) |
| 88 | `petanque` | Ném bi sắt | Ném bi bổng rơi gần bi mục tiêu; vuốt lên dài/ngắn quyết định chỗ rơi; bi sau có thể đẩy bi trước | Vuốt lên | Thắng 2/3 ván với máy | Thua ván: ván sau | SPO | TT XM | Vừa | M | 8 | [Pétanque](https://en.wikipedia.org/wiki/P%C3%A9tanque) |
| 89 | `volleyball-beach` | Bóng chuyền bãi biển | Bóng đổ bóng xuống cát; kéo bé tới chỗ bóng sắp rơi, bé tự đỡ; chạm khi bóng trên đầu để đập | Kéo, chạm | Thắng 5 điểm trước máy | Thua ván: ván mới, máy chậm hơn | SPO | DA SC | Vừa | M | 6 | [Beach volleyball](https://en.wikipedia.org/wiki/Beach_volleyball) |
| 90 | `chopsticks` | Thi gắp đậu bằng đũa | Kéo đũa tới hạt đậu, giữ để kẹp, kéo sang bát; di nhanh quá thì hạt rơi | Giữ và kéo | 20 hạt trong 60 s | Rơi: hạt lăn về đĩa | COK | NB CP | Vừa | S | 10 | [Chopsticks](https://en.wikipedia.org/wiki/Chopsticks) |
| 91 | `cookie-cutter` | Dập khuôn bánh quy | Tấm bột trước mặt; chạm để dập khuôn tròn, sao, tim sao cho các bánh không chồng nhau và được nhiều bánh nhất | Chạm | 12 bánh trên 2 tấm | Chồng: bánh đó méo, không tính | COK | NB CP | Vừa | S | 9 | [Cooking Mama](https://en.wikipedia.org/wiki/Cooking_Mama) |
| 92 | `ice-fishing` | Câu cá lỗ băng | Bóng cá bơi dưới băng giữa các lỗ; chạm một lỗ để thả câu nơi cá sắp tới; cá cắn thì lên | Chạm lỗ | 10 cá trong 60 s | Lỗ trống: kéo câu lên, không trừ | FSH | NU | Dễ | S | 6 | [Ice fishing](https://en.wikipedia.org/wiki/Ice_fishing) |
| 93 | `net-cast` | Quăng chài | Đàn cá bơi lượn; vuốt để quăng chài, độ dài vuốt quyết định độ xa; chài rơi sau 1 s, cá kịp chạy | Vuốt | 30 cá trong 60 s | Chài trống: kéo lại, không trừ | FSH | LS DA | Vừa | S | 11 | [Cast net](https://en.wikipedia.org/wiki/Cast_net) |
| 94 | `paddy-water` | Mở cống ruộng bậc thang | Ruộng cao thấp nối nhau; chạm cống để mở/đóng; nước mỗi ruộng phải tới vạch, không tràn | Chạm cống | 3 sườn đồi trong 90 s | Tràn: ruộng dưới ngập, xả bớt | FRM | NT | Vừa | M | 11 | [Ruộng bậc thang (Wiki VN)](https://vi.wikipedia.org/wiki/Ru%E1%BB%99ng_b%E1%BA%ADc_thang) |
| 95 | `paper-io` | Cày ruộng khoanh vùng | Máy cày để lại vệt; vẽ vòng quay về ruộng nhà thì vùng trong vòng thành của bé; trâu đi ngang vệt thì vệt đứt | Kéo | Chiếm 50% cánh đồng trong 90 s | Vệt đứt: về ruộng nhà, giữ phần đã có | FRM | NT | Vừa | M | 10 | [Paper.io (Voodoo)](https://en.wikipedia.org/wiki/Voodoo_(company)) |
| 96 | `rice-plant` | Cấy lúa thẳng hàng | Bé lùi dần trên ruộng; chạm để cắm mạ đúng vạch mờ cách đều | Chạm | 40 cây mạ thẳng hàng trong 60 s | Lệch: cây nghiêng, không trừ | FRM | NT LS | Dễ | S | 9 | [Paddy field](https://en.wikipedia.org/wiki/Paddy_field) |
| 97 | `rice-winnow` | Sảy gạo giúp Tấm | Vuốt lên để hất gạo khỏi nia; gió thổi trấu bay đi; hất vừa cao thì gạo rơi lại nia, cao quá gạo bay theo | Vuốt lên | 5 nia sạch trong 60 s | Gạo bay: nia đó ít sao | FRM | NT XM | Dễ | S | 6 | [Winnowing (sảy) – truyện Tấm Cám](https://en.wikipedia.org/wiki/Winnowing) |
| 98 | `hole-grow` | Hố hút dọn sân | Kéo cái hố; đồ nhỏ hơn miệng hố rơi vào, hố to dần và hút được đồ to | Kéo | Hút 80% sân trong 60 s | Hết giờ | CLN | TT XM | Dễ | S | 7 | [Hole.io](https://en.wikipedia.org/wiki/Hole.io) |
| 99 | `snow-tracks` | Ai đi qua đây? | Dấu chân trên tuyết hiện dần theo đường; chạm con vật để lại dấu đó (thỏ, cáo, chim, cánh cụt) | Chạm | 10 lượt đúng trong 60 s | Sai: dấu hiện thêm | SEE | NU FO | Dễ | S | 7 | [Animal track](https://en.wikipedia.org/wiki/Animal_track) |
| 100 | `who-swapped` | Ai đổi chỗ? | Nhìn sạp hàng 3 s; chớp mắt, hai món đổi chỗ cho nhau; chạm đúng hai món đó | Chạm | 8 lượt đúng trong 90 s | Sai: chớp lại, xem chậm | SEE | CP LD | Vừa | S | 8 | [Change blindness](https://en.wikipedia.org/wiki/Change_blindness) |
| 101 | `bat-trach` | Bắt trạch trong chum | Con trạch trơn uốn trong chum nước; đặt ngón lên trạch và bám theo nó 2 s là bắt được; tuột khỏi trạch thì nó lặn | Giữ và kéo theo | 6 con trong 60 s | Tuột: trạch lặn 1 s rồi nổi chỗ khác | FOL | LS NT | Vừa | S | 8 | [VinWonders: 23 trò chơi dân gian ngày Tết](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian-ngay-tet/) |
| 102 | `bo-khan` | Bỏ khăn | Các bạn ngồi vòng tròn, thỉnh thoảng ngoái nhìn; giữ để chạy vòng, thả khăn sau lưng bạn đang không nhìn, chạy về chỗ trước khi bạn đứng dậy | Giữ để chạy, chạm để thả | 6 lần thoát trong 60 s | Bị thấy: bạn đuổi, lượt sau | FOL | SC XM | Vừa | S | 7 | [VinWonders: trò chơi dân gian](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian/) |
| 103 | `cap-cua` | Cắp cua bỏ giỏ | Cua bò ngang trên bãi; kéo từng con vào giỏ; nắp giỏ để mở lâu thì cua bò ra, chạm nắp để đậy | Kéo cua, chạm nắp | 12 cua trong giỏ trong 60 s | Cua thoát: không trừ | FOL | DA LS | Vừa | S | 6 | [Wiki VN: trò chơi truyền thống](https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_tr%C3%B2_ch%C6%A1i_truy%E1%BB%81n_th%E1%BB%91ng_c%E1%BB%A7a_Vi%E1%BB%87t_Nam) |
| 104 | `cat-mouse` | Mèo đuổi chuột | Vòng các bạn nắm tay, giơ tay hạ tay theo nhịp; dẫn chuột luồn qua chỗ tay đang giơ, mèo theo sau bị chặn khi tay hạ | Kéo chuột | Mèo bị chặn 6 lần trong 60 s | Mèo chạm: chuột về giữa vòng | FOL | SC XM | Vừa | M | 11 | [VinWonders: 23 trò chơi dân gian ngày Tết](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian-ngay-tet/) |
| 105 | `chi-chi` | Chi chi chành chành | Đặt ngón lên lòng bàn tay bạn và giữ; bài đồng dao hiện từng tiếng; nhấc ngón đúng tiếng cuối "ập!" (có tiếng giả gần giống) | Giữ, thả | Thoát 7/10 lượt | Bị nắm: lượt sau | FOL | XM SC | Dễ | S | 6 | [Chi chi chành chành (Wiki VN)](https://vi.wikipedia.org/wiki/Chi_chi_ch%C3%A0nh_ch%C3%A0nh) |
| 106 | `co-ganh` | Cờ gánh | Bàn 5×5 có đường chéo; mỗi lượt đi một bước; khi "gánh" (đứng giữa 2 quân máy) hay "vây" thì quân máy đổi thành quân bé | Chạm quân, chạm đích | Nhiều quân hơn máy sau 90 s | Thua: máy dễ hơn | FOL | XM TT LS | Khó | L | 10 | [Cờ gánh (Wiki VN)](https://vi.wikipedia.org/wiki/C%E1%BB%9D_g%C3%A1nh) |
| 107 | `danh-khang` | Đánh khăng | Chạm để hất que ngắn lên; chạm lần nữa khi que lên cao nhất để đánh xa | Chạm 2 lần | Tổng 100 m với 6 lượt | Hụt: lượt sau | FOL | NT XM | Dễ | S | 8 | [Tip-cat (đánh khăng)](https://en.wikipedia.org/wiki/Tip-cat) |
| 108 | `keo-cua` | Kéo cưa lừa xẻ | Hai bạn kéo cưa; kéo qua lại cùng nhịp tay bạn (vạch nhịp hiện trên lưỡi cưa); đúng nhịp thì khúc gỗ đứt nhanh | Kéo qua lại | Xẻ 6 khúc gỗ trong 60 s | Lệch nhịp: cưa kẹt 1 s | FOL | XM LS FO | Dễ | S | 11 | [Kéo cưa lừa xẻ (Wiki VN)](https://vi.wikipedia.org/wiki/K%C3%A9o_c%C6%B0a_l%E1%BB%ABa_x%E1%BA%BB) |
| 109 | `nhay-sap` | Nhảy sạp | Các đôi sào tre mở khép theo nhịp; chạm để nhảy vào khoảng mở và nhảy ra trước khi khép | Chạm | 30 bước đúng trong 60 s | Vướng sào: chuỗi về 0 | FOL | SC TT LS | Vừa | S | 6 | [Nhảy sạp (Wiki VN)](https://vi.wikipedia.org/wiki/Nh%E1%BA%A3y_s%E1%BA%A1p) |
| 110 | `oan-tu-xi` | Oẳn tù tì nhanh trí | Bạn ra tay trước, đề bảo "thắng" hoặc "thua"; chạm búa/kéo/bao đúng trong 2 s | Chạm | 15 lượt đúng trong 60 s | Sai: không trừ | FOL | SC XM TT | Vừa | S | 9 | [Brain Age 2 (Oẳn tù tì theo lệnh)](https://en.wikipedia.org/wiki/Brain_Age_2:_More_Training_in_Minutes_a_Day!) |
| 111 | `phao-dat` | Pháo đất | Vẽ vòng để nặn bát đất mỏng đều, rồi vuốt mạnh xuống để úp; thành mỏng vừa thì nổ to, mỏng quá thì thủng | Vẽ vòng, vuốt | 6 tiếng nổ to trong 60 s | Thủng: nặn lại | FOL | NT LS | Vừa | S | 10 | [Pháo đất (Wiki VN)](https://vi.wikipedia.org/wiki/Ph%C3%A1o_%C4%91%E1%BA%A5t) |
| 112 | `sack-race` | Nhảy bao bố | Chạm đúng lúc bao vừa chạm đất để bật tiếp; liền nhịp thì nhanh, chạm sớm thì ngã | Chạm | Về nhất/nhì với 3 bạn | Ngã: đứng dậy 1 s | FOL | SC TT NT | Dễ | S | 8 | [Nhảy bao bố (Wiki VN)](https://vi.wikipedia.org/wiki/Nh%E1%BA%A3y_bao_b%E1%BB%91) |
| 113 | `spinning-top` | Đánh quay | Vuốt để quăng con quay vào vòng; quay chậm dần và lắc; chạm đúng lúc nó lắc để quất dây cho quay tiếp | Vuốt, chạm | Giữ quay tổng 45 s (3 con) | Đổ: quăng con mới | FOL | XM SC | Vừa | S | 9 | [Đánh quay (Wiki VN)](https://vi.wikipedia.org/wiki/%C4%90%C3%A1nh_quay) |
| 114 | `stilts-walk` | Đi cà kheo | Bé đứng trên cà kheo nghiêng dần về một bên; chạm chân bên đang nghiêng để bước và lấy lại thăng bằng; đường có ụ đất | Chạm trái/phải | Đi 100 m trong 60 s | Ngã: đứng lên ở chỗ ngã | FOL | TT NT | Vừa | S | 11 | [VinWonders: 23 trò chơi dân gian ngày Tết](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian-ngay-tet/) |
| 115 | `swing-push` | Đánh đu | Đu tự đung đưa; chạm khi đu tới điểm cao phía sau để nhún thêm đà (chạm sai lúc mất đà); đu chạm dải lộc treo thì lấy được | Chạm | Lấy 5 lộc trong 60 s | Chạm sai: đu chậm lại | FOL | TT XM LS | Dễ | S | 10 | [Đánh đu (Wiki VN)](https://vi.wikipedia.org/wiki/%C4%90%C3%A1nh_%C4%91u) |
| 116 | `dong-ho-print` | In tranh Đông Hồ | Giấy dó chạy trên băng; chạm để in từng lớp màu khi giấy khớp vạch; các lớp phải chồng khít | Chạm | 5 tranh trong 90 s | Lệch: tranh lem, vẫn có điểm | FES | TV CP | Vừa | S | 8 | [Tranh Đông Hồ (Wiki VN)](https://vi.wikipedia.org/wiki/Tranh_%C4%90%C3%B4ng_H%E1%BB%93) |
| 117 | `hoa-dang` | Thả đèn hoa đăng | Dòng sông có thuyền, lục bình trôi; chạm để thả đèn đúng lúc dòng chảy đưa đèn lọt qua khe tới khúc quanh | Chạm | 12 đèn tới khúc quanh trong 60 s | Đèn vướng: tắt nhẹ, không trừ | FES | LS | Dễ | S | 9 | [Water lantern (đèn hoa đăng)](https://en.wikipedia.org/wiki/Water_lantern) |
| 118 | `lantern-light` | Thắp đèn phố Hội | Dãy đèn lồng mờ dần; chạm để thắp lại; khi có đoàn khách đi qua, phố phải sáng ≥ 8 đèn | Chạm | 10 đoàn khách qua phố sáng | Phố tối: khách đứng chờ | FES | LS TT | Dễ | S | 11 | [Phố cổ Hội An](https://vi.wikipedia.org/wiki/Ph%E1%BB%91_c%E1%BB%95_H%E1%BB%99i_An) |
| 119 | `ong-do-calligraphy` | Xin chữ ông đồ | Tô theo nét chữ Phúc, An, Tâm…; đi chậm thì mực đậm, nhanh quá mực nhạt, lệch thì mực loang | Kéo theo nét | 4 chữ đẹp trong 90 s | Nét nhạt: tô lại nét đó | FES | TT TV | Vừa | S | 10 | [Thư pháp Việt Nam (Wiki VN)](https://vi.wikipedia.org/wiki/Th%C6%B0_ph%C3%A1p_Vi%E1%BB%87t_Nam) |
| 120 | `pottery-wheel` | Nặn gốm Bát Tràng | Bàn xoay quay; kéo lên xuống dọc thành bình để vuốt dáng cho trùng đường viền mẫu | Kéo | 4 bình ≥ 80% trong 90 s | Lệch: vuốt tiếp | FES | CP LS | Vừa | S | 6 | [Gốm Bát Tràng (Wiki VN)](https://vi.wikipedia.org/wiki/G%E1%BB%91m_B%C3%A1t_Tr%C3%A0ng) |
| 121 | `rising-water` | Sơn Tinh dâng núi | Nước lên từng đợt ở các chỗ khác nhau (có sóng báo trước); giữ trên đồi để nâng đồi cao hơn nước; giữ làng khô tới hết trận | Giữ đồi | ≥ 6/8 nhà khô sau 60 s | Nhà ướt: dân lên đồi, không thua giữa chừng | FES | LS TV | Vừa | M | 6 | [Sơn Tinh – Thủy Tinh](https://en.wikipedia.org/wiki/S%C6%A1n_Tinh_%E2%80%93_Th%E1%BB%A7y_Tinh) |
| 122 | `thoi-com-thi` | Thổi cơm thi | Chạm để thêm củi, lửa tự nhỏ dần; giữ lửa trong vùng "vừa" cho cơm chín; lửa to quá cơm khê | Chạm | 3 nồi cơm ngon trong 90 s | Khê: nồi đó tính nửa điểm | FES | LS NT | Dễ | S | 11 | [VinWonders: 23 trò chơi dân gian ngày Tết](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian-ngay-tet/) |
| 123 | `water-puppet` | Múa rối nước | Con rối (chú Tễu, trâu, vịt) đi theo đường mờ trên mặt ao theo nhạc; kéo để rối luôn trùng bóng mẫu | Kéo | Trùng 70% thời gian | Hết bài | FES | LS TT | Vừa | S | 7 | [Water puppetry](https://en.wikipedia.org/wiki/Water_puppetry) |
| 124 | `bamboo-hundred` | Cây tre trăm đốt | Các đốt tre ghi số rải khắp; chạm theo thứ tự đếm (từng 1, 2, 5, 10) để nối tre; đủ đốt thì hô "khắc nhập" | Chạm | 3 cây tre trong 90 s | Sai số: đốt rung, không trừ | NUM | FO NT | Dễ | S | 7 | [Cây tre trăm đốt (Wiki VN)](https://vi.wikipedia.org/wiki/C%C3%A2y_tre_tr%C4%83m_%C4%91%E1%BB%91t) |
| 125 | `block-count` | Đếm khối hộp | Chồng khối lập phương (có khối bị che); chạm số khối đúng | Chạm số | 10 lượt đúng trong 90 s | Sai: chồng xoay cho thấy mặt sau | NUM | SC TT NU | Vừa | S | 6 | [Spatial ability](https://en.wikipedia.org/wiki/Spatial_ability) |
| 126 | `book-shelf-order` | Xếp sách theo số | Từng cuốn sách có số (12…98) đến; kéo vào kệ đúng chỗ để dãy luôn tăng dần | Kéo | 20 sách trong 90 s | Sai chỗ: sách nghiêng, kéo lại | NUM | TV | Vừa | S | 7 | [Insertion sort](https://en.wikipedia.org/wiki/Insertion_sort) |
| 127 | `cable-car` | Đưa khách lên cáp treo | Cabin chạy vòng liên tục, mỗi cabin chở 4; nhóm 1–4 khách chờ; chạm để cho nhóm vào khi cabin còn đủ chỗ đi ngang | Chạm | 40 khách lên đỉnh trong 90 s | Nhóm không vừa: chờ cabin sau | NUM | NU | Vừa | S | 11 | [Aerial lift](https://en.wikipedia.org/wiki/Aerial_lift) |
| 128 | `cake-decorate` | Trang trí bánh theo đơn | Khách giơ đơn "3 dâu, 5 nến, 2 kẹo"; kéo đồ lên bánh tới đủ số; thừa thì chạm để gỡ | Kéo, chạm | 8 bánh trong 90 s | Sai số: khách lắc đầu, sửa tiếp | NUM | NB CP | Dễ | S | 7 | [Papa Louie (Flipline)](https://en.wikipedia.org/wiki/Papa_Louie) |
| 129 | `clock-catch` | Đồng hồ báo thức | Kim đồng hồ chạy nhanh; bạn hỏi giờ (7 giờ, 8 giờ rưỡi, 3 giờ 15 phút); chạm để dừng kim đúng giờ | Chạm | 8 lần đúng giờ trong 60 s | Dừng sai: kim chạy tiếp, không trừ | NUM | NB TT SC | Vừa | S | 9 | [Clock face (xem giờ)](https://en.wikipedia.org/wiki/Clock_face) |
| 130 | `croc-compare` | Cá sấu tham ăn | Hai đĩa số hoặc nhóm đồ; vuốt miệng cá sấu về phía nhiều hơn, vuốt xuống nếu bằng nhau (dấu >, <, =) | Vuốt trái/phải/xuống | 20 lượt đúng trong 60 s | Sai: cá sấu ngáp, không trừ | NUM | LS SC | Dễ | S | 7 | [Inequality (dấu >, <)](https://en.wikipedia.org/wiki/Inequality_(mathematics)) |
| 131 | `crowd-gates` | Đoàn bạn đông vui | Đoàn bạn chạy tới các cặp cổng ghi phép tính (+5, −3, ×2); vuốt sang cổng làm đoàn đông hơn; cuối đường cần đủ bạn để đẩy chiếc xe | Vuốt trái/phải | Về đích với ≥ 30 bạn | Ít bạn: vẫn về đích, chỉ ít sao | NUM | TT SC NU | Vừa | M | 10 | [Count Masters (Freeplay, 2021) – hyper-casual](https://en.wikipedia.org/wiki/Hypercasual_game) |
| 132 | `domino-match` | Domino chấm | Nối domino có số chấm khớp đầu; bé và máy đi lần lượt, ai hết quân trước thắng | Chạm quân, chạm đầu | Thắng 1 ván | Thua: ván mới | NUM | XM TT | Vừa | M | 10 | [Dominoes](https://en.wikipedia.org/wiki/Dominoes) |
| 133 | `fair-share` | Chia bánh đều | Vuốt một nét cắt qua bánh; các phần phải bằng nhau cho 2, 3, 4 bạn | Vuốt | 8 bánh chia đều trong 60 s | Lệch: phần to hơn hiện màu, cắt lại | NUM | NB CP | Vừa | S | 10 | [Slice It!](https://en.wikipedia.org/wiki/Slice_It!) |
| 134 | `fruit-skewer` | Xiên que theo mẫu | Mẫu xiên lặp (đỏ-vàng-đỏ-vàng, hay A-B-C); trái cây chạy trên băng; chạm để xiên đúng quả tiếp theo của mẫu | Chạm | 10 que đúng trong 60 s | Xiên sai: que đó làm lại | NUM | CP NB | Dễ | S | 9 | [Pattern](https://en.wikipedia.org/wiki/Pattern) |
| 135 | `hand-span` | Đo bằng gang tay | Đặt gang tay nối tiếp dọc đồ vật (chạm chỗ đặt), rồi chọn số gang; đặt chồng hay hở thì kết quả lệch | Chạm | 8 đồ vật trong 90 s | Sai: xem các gang hiện màu | NUM | SC NB | Dễ | S | 11 | Toán 2 (kho `content/curriculum/toan2-t1`) |
| 136 | `head-count` | Đếm người vào nhà | Các bạn chạy vào, chạy ra ngôi nhà (có bạn trèo qua cửa sổ); khi cửa đóng, chạm số bạn còn trong nhà | Chạm số | 6/8 lượt đúng | Sai: xem lại lượt chậm hơn | NUM | XM NB | Vừa | S | 10 | [Brain Age](https://en.wikipedia.org/wiki/Brain_Age:_Train_Your_Brain_in_Minutes_a_Day!) |
| 137 | `hundred-chart` | Bảng trăm ô | Bảng 1–100 thiếu mảnh; kéo mảnh số vào đúng chỗ (hàng hơn kém 10, cột hơn kém 1) | Kéo | 8 mảnh trong 90 s | Sai: mảnh bật ra | NUM | TV SC | Vừa | S | 8 | Toán 2 (kho `content/curriculum/toan2-t1`) |
| 138 | `jar-estimate` | Đoán hũ kẹo | Hũ kẹo hiện 3 s; kéo kim ước lượng; sau đó kẹo đổ ra xếp thành từng chục để đếm lại | Kéo kim | Gần đúng (±20%) 6/8 lượt | Xa: xem đếm lại, không trừ | NUM | CP NB | Dễ | S | 10 | [Estimation](https://en.wikipedia.org/wiki/Estimation) |
| 139 | `kangaroo-hop` | Chuột túi nhảy trục số | Chuột túi nhảy đều mỗi bước (+2, +5, +10); chạm vào ô trên trục số nơi nó sẽ đáp để đặt cà rốt trước | Chạm | 12 cà rốt đặt đúng trong 60 s | Sai: chuột túi nhảy qua, không trừ | NUM | NT TT | Vừa | S | 6 | [Number line](https://en.wikipedia.org/wiki/Number_line) |
| 140 | `lift-numbers` | Thang máy số | Khách cầm thẻ "3 chục 5 đơn vị"; các tầng ghi số (31–40…); chạm tầng để đưa thang tới, đón trả nhiều khách một lượt | Chạm tầng | 15 khách tới nơi trong 90 s | Khách chờ lâu: tự đi cầu thang, không trừ | NUM | TT XM | Vừa | M | 11 | [Tiny Tower (thang máy)](https://en.wikipedia.org/wiki/Tiny_Tower) |
| 141 | `low-to-high` | Số bé lên số lớn | Các số hiện 2 s trong ô rồi úp; chạm các ô theo thứ tự từ bé đến lớn | Chạm | 8 lượt đúng trong 90 s | Sai: ô đúng kế tiếp tự lật | NUM | TV SC | Vừa | S | 9 | [Brain Age](https://en.wikipedia.org/wiki/Brain_Age:_Train_Your_Brain_in_Minutes_a_Day!) |
| 142 | `make-ten` | Ghép đôi tròn chục | Ô số dâng lên từ đáy; chạm hai số cộng bằng 10 (sau đó 100) để xóa | Chạm 2 ô | 20 cặp trong 90 s | Ô chạm trần: dừng, giữ điểm | NUM | SC TV | Vừa | S | 6 | [Number bond](https://en.wikipedia.org/wiki/Number_bond) |
| 143 | `math-race` | Đua xe tính nhẩm | Xe của bé tăng tốc mỗi khi chạm đúng kết quả phép cộng, trừ trên biển đường; 3 xe máy cùng đua | Chạm đáp án | Về nhất/nhì | Sai: xe chậm 1 s | NUM | TT | Vừa | S | 8 | [Brain Age](https://en.wikipedia.org/wiki/Brain_Age:_Train_Your_Brain_in_Minutes_a_Day!) |
| 144 | `merge-2048` | Gộp số đôi | Vuốt cả bàn 4×4; hai ô cùng số chạm nhau gộp thành tổng; tạo được ô 64 | Vuốt 4 hướng | Ô 64 trong 90 s | Bàn đầy: giữ ô lớn nhất | NUM | TV TT | Vừa | M | 8 | [2048](https://en.wikipedia.org/wiki/2048_(video_game)) |
| 145 | `pay-exact` | Trả tiền vừa đủ | Món hàng ghi giá; chạm các tờ tiền (1, 2, 5, 10 nghìn đồng) bỏ vào khay cho đủ đúng giá | Chạm | 10 món trong 90 s | Thừa: người bán trả lại tờ cuối | NUM | CP | Vừa | S | 9 | [Tiền Việt Nam (Wiki VN)](https://vi.wikipedia.org/wiki/Ti%E1%BB%81n_Vi%E1%BB%87t_Nam) |
| 146 | `penguin-share` | Chia cá cho cánh cụt | 12 con cá, 3–4 bạn cánh cụt; chạm cá để đưa cho bạn đang thiếu; xong khi ai cũng bằng nhau | Chạm cá, chạm bạn | 8 lượt chia đều trong 90 s | Lệch: bạn nhiều hơn trả cá lại | NUM | NU | Dễ | S | 7 | [Fraction (chia đều)](https://en.wikipedia.org/wiki/Fraction) |
| 147 | `photo-finish` | Ảnh về đích | Cuộc đua vụt qua vạch; sau đó chạm bạn về thứ hai (thứ ba, thứ tư…) | Chạm | 10 lượt đúng trong 60 s | Sai: xem chậm lại | NUM | TT SC | Dễ | S | 8 | [Photo finish](https://en.wikipedia.org/wiki/Photo_finish) |
| 148 | `polyline-length` | Đường gấp khúc | Các điểm có ghi cm giữa chúng; kéo nối thành đường gấp khúc từ nhà kiến tới tổ có tổng dài đúng số yêu cầu | Kéo nối | 6 đường trong 90 s | Sai tổng: đường mờ đi, nối lại | NUM | SC FO | Vừa | S | 6 | [Polygonal chain (đường gấp khúc)](https://en.wikipedia.org/wiki/Polygonal_chain) |
| 149 | `seesaw-logic` | Ai nặng nhất? | Các bập bênh cho biết từng cặp ai nặng hơn; chạm bạn nặng nhất (rồi nhẹ nhất) | Chạm | 8 lượt đúng trong 60 s | Sai: hiện thêm một bập bênh gợi ý | NUM | CP TT SC | Vừa | S | 11 | [Big Brain Academy](https://en.wikipedia.org/wiki/Big_Brain_Academy) |
| 150 | `shape-sorter` | Hộp thả hình | Khối hình rơi từ trên; chạm nắp hộp để xoay cho lỗ cùng hình nằm dưới khối | Chạm để xoay | 25 khối lọt trong 60 s | Không lọt: khối nảy ra ngoài | NUM | NB SC | Dễ | S | 11 | [Hyper-casual (CrazyLabs: cơ chế)](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) |
| 151 | `shikaku-fields` | Chia ruộng | Lưới ruộng có số; kéo hình chữ nhật quanh mỗi số sao cho số ô bằng số đó, phủ kín ruộng | Kéo | 3 ruộng trong 90 s | Hết giờ: hiện 1 ô gợi ý | NUM | NT | Khó | M | 9 | [Shikaku](https://en.wikipedia.org/wiki/Shikaku) |
| 152 | `tens-bundles` | Bó que tính | Que tính rải trên bàn; kéo khoanh đúng 10 que để bó; ghép đủ số bạn hỏi (47 = 4 bó và 7 que) | Kéo khoanh | 6 số trong 90 s | Khoanh sai số que: dây tuột | NUM | SC | Vừa | S | 6 | [Base ten blocks](https://en.wikipedia.org/wiki/Base_ten_blocks) |
| 153 | `three-span-bag` | Túi ba gang | Chim thần chở ra đảo; ngọc to nhỏ có số; chọn ngọc sao cho tổng vừa khít số gang ghi trên túi (VD 12) | Chạm ngọc | 6 túi vừa khít trong 90 s | Quá túi: ngọc rơi ra, chọn lại | NUM | DA | Vừa | S | 11 | [Cây khế – ăn khế trả vàng (Wiki VN)](https://vi.wikipedia.org/wiki/C%C3%A2y_kh%E1%BA%BF_(truy%E1%BB%87n)) |
| 154 | `to-he-roll` | Nặn tò he | Kéo qua lại để lăn bột dài ra theo thước kẻ; chạm để cắt đúng số xăng-ti-mét khách cần | Kéo, chạm | 8 que đúng cm trong 60 s | Dài/ngắn: nặn lại | NUM | CP TT | Dễ | S | 6 | [Tò he (Wiki VN)](https://vi.wikipedia.org/wiki/T%C3%B2_he) |
| 155 | `treasure-map-steps` | Đi theo bản đồ kho báu | Bản đồ ghi "3 bước ⬆, 2 bước ➡"; chạm ô theo chỉ dẫn; đúng thì đào được quà | Chạm ô | 6 bản đồ trong 90 s | Sai: quay lại đầu bước đó | NUM | DA FO | Dễ | S | 9 | [Treasure map](https://en.wikipedia.org/wiki/Treasure_map) |
| 156 | `water-jugs` | Đong nước đủ lít | Ba can 3 l, 5 l, 8 l; chạm can nguồn rồi can đích, rót tới khi đầy hoặc cạn; đong đúng số lít cho bò uống | Chạm 2 can | 3 bài trong 90 s | Kẹt: nút làm lại | NUM | NT XM | Khó | S | 8 | [Water pouring puzzle](https://en.wikipedia.org/wiki/Water_pouring_puzzle) |
| 157 | `flag-commands` | Giơ cờ theo lệnh | Hai tay cầm cờ đỏ, xanh; lệnh hiện bằng chữ kèm hình ("Đỏ lên!", "Xanh đừng hạ!"); vuốt lên/xuống ở nửa màn hình của cờ đó | Vuốt lên/xuống | 20 lệnh đúng trong 60 s | Sai: không trừ | CHU | SC TT | Vừa | S | 10 | [Mario Party – Shy Guy Says](https://www.mariowiki.com/List_of_Mario_Party_minigames) |
| 158 | `folk-riddle` | Câu đố dân gian | Câu đố hiện từng dòng ("Con gì đuôi ngắn tai dài…"); chạm hình đáp án, đoán càng sớm càng nhiều sao | Chạm | 8 câu đúng trong 90 s | Sai: dòng tiếp theo hiện, không trừ | CHU | XM TV | Dễ | S | 9 | [Câu đố (Wiki VN)](https://vi.wikipedia.org/wiki/C%C3%A2u_%C4%91%E1%BB%91) |
| 159 | `magic-letters` | Nét chữ phép màu | Bong bóng mang chữ cái (a, ă, â, o, ô, ơ…) bay xuống; vẽ đúng chữ đó ở đâu cũng được để bóng nổ | Kéo vẽ | 20 bóng trong 90 s | Bóng chạm đất: mất 1/3 tim | CHU | LD TV | Vừa | M | 11 | [Hyper-casual (CrazyLabs: cơ chế)](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) |
| 160 | `nu-na-nu-nong` | Nu na nu nống | Hàng chân các bạn; bài đồng dao điểm từng chân theo từng tiếng; chạm trước cái chân sẽ bị co ở tiếng cuối | Chạm | 8 lượt đúng trong 90 s | Sai: xem bài đếm chậm lại | CHU | XM SC | Vừa | S | 10 | [Nu na nu nống (Wiki VN)](https://vi.wikipedia.org/wiki/Nu_na_nu_n%E1%BB%91ng) |
| 161 | `picture-crossword` | Ô chữ hình | Ô chữ nhỏ 3–4 từ gợi ý bằng hình; kéo chữ cái vào ô; chỗ giao nhau dùng chung chữ | Kéo chữ | 3 ô chữ trong 90 s | Chữ sai: bật ra | CHU | TV | Khó | M | 8 | [Crossword / ô chữ Olympia](https://en.wikipedia.org/wiki/Crossword) |
| 162 | `sentence-train` | Đoàn tàu câu | Các toa chở từng từ lộn xộn; chạm theo thứ tự để nối thành câu đúng với tranh | Chạm | 8 câu trong 90 s | Sai: toa lùi lại | CHU | TT SC | Dễ | S | 7 | Tiếng Việt 2 (kho `content/curriculum/tv2-t1`) |
| 163 | `story-order` | Xếp tranh kể chuyện | 4 tranh của một truyện quen (Thỏ và Rùa, Sự tích…) bị xáo; kéo vào đúng thứ tự | Kéo | 6 truyện trong 90 s | Sai: tranh rung, không trừ | CHU | TV NB | Dễ | S | 8 | Tiếng Việt 2 (kho `content/curriculum/tv2-t1`) |
| 164 | `tone-mark` | Mũ phép dấu thanh | Đồ vật kèm chữ thiếu dấu ("ca" cạnh con cá); kéo đúng dấu sắc, huyền, hỏi, ngã, nặng lên chữ | Kéo dấu | 15 chữ đúng trong 60 s | Sai: chữ đọc to dấu sai cho vui, không trừ | CHU | TV SC | Vừa | S | 6 | [Vietnamese alphabet (dấu thanh)](https://en.wikipedia.org/wiki/Vietnamese_alphabet) |
| 165 | `word-chain` | Nối từ | Tiếng cuối của từ trước là tiếng đầu của từ sau ("học sinh → sinh nhật → nhật kí"); chọn 1 trong 3 thẻ để rồng chữ dài thêm | Chạm | Rồng dài 12 từ trong 90 s | Sai: thẻ bay đi, không trừ | CHU | TV SC XM | Vừa | S | 6 | [Shiritori (nối từ)](https://en.wikipedia.org/wiki/Shiritori) |
| 166 | `word-maze` | Mê cung đồng dao | Lưới ô tiếng; từ ô đầu đi sang ô kề theo đúng câu đồng dao, ca dao ("Con mèo mà trèo cây cau") | Kéo qua ô | 4 câu trong 90 s | Ô sai: rung, không trừ | CHU | TV SC | Vừa | S | 8 | [Đồng dao (Wiki VN)](https://vi.wikipedia.org/wiki/%C4%90%E1%BB%93ng_dao) |
| 167 | `word-search` | Tìm từ ẩn | Bảng chữ 6×6; vuốt thẳng qua các chữ để tìm từ theo hình gợi ý | Vuốt | 6 từ trong 90 s | Hết giờ: hiện từ còn lại | CHU | TV SC | Vừa | M | 7 | [Word search](https://en.wikipedia.org/wiki/Word_search) |
| 168 | `bottle-rocket` | Tên lửa nước | Vuốt lên xuống để bơm hơi tới vạch xanh, chạm để phóng khi bệ đang nghiêng đúng; tên lửa bung dù đáp xuống bãi | Vuốt bơm, chạm phóng | 5 lần đáp vào bãi / 8 | Bơm quá: nước phụt, bơm lại | SCI | SC NT | Vừa | M | 10 | [Water rocket](https://en.wikipedia.org/wiki/Water_rocket) |
| 169 | `color-mix` | Pha màu | Khách cần màu (cam, xanh lá, tím, hồng); chạm hai lọ màu gốc để pha; màu pha hiện trong chậu | Chạm 2 lọ | 10 màu đúng trong 60 s | Sai: chậu đổ đi, không trừ | SCI | SC TV TT | Dễ | S | 8 | [Color mixing](https://en.wikipedia.org/wiki/Color_mixing) |
| 170 | `magnet-sweep` | Nam châm dọn sân | Kéo nam châm qua sân cát; đinh, chìa khóa, kẹp giấy bám vào, đồ nhựa gỗ thì không; mang tới hộp đồ nghề để thả | Kéo | 30 đồ sắt vào hộp trong 60 s | Nam châm đầy: nặng, đi chậm | SCI | NB XM | Dễ | S | 9 | [Magnet](https://en.wikipedia.org/wiki/Magnet) |
| 171 | `sail-wind` | Thuyền buồm theo gió | Mũi tên gió đổi hướng; kéo để xoay cánh buồm sao cho thuyền đi tới; buồm sai góc thì thuyền đứng | Kéo xoay buồm | Tới 5 phao trong 90 s | Đứng gió: không trừ | SCI | LS DA | Vừa | M | 6 | [Point of sail](https://en.wikipedia.org/wiki/Point_of_sail) |
| 172 | `seesaw-launch` | Bập bênh bắn bóng | Chạm chọn độ cao thả bao cát xuống đầu bập bênh; bóng ở đầu kia bay xa theo độ cao thả, rơi vào rổ | Chạm | 6 bóng vào rổ / 10 | Hết bao | SCI | SC TT | Dễ | S | 11 | [Lever](https://en.wikipedia.org/wiki/Lever) |
| 173 | `shadow-shade` | Bóng râm cho mèo | Kéo mặt trời trên vòm trời để bóng cây, bóng nhà che con mèo đang ngủ; mèo đổi chỗ | Kéo | 10 lần che trong 60 s | Hết giờ | SCI | FO NT NB | Vừa | S | 7 | [Shadow](https://en.wikipedia.org/wiki/Shadow) |
| 174 | `simple-circuit` | Nối mạch thắp đèn | Kéo dây nối từ pin qua công tắc tới bóng đèn thành vòng kín; đèn sáng thì xong | Kéo dây | 4 mạch trong 90 s | Hở mạch: đèn nhấp nháy, nối tiếp | SCI | SC TV | Vừa | M | 11 | [Electrical network](https://en.wikipedia.org/wiki/Electrical_network) |
| 175 | `sink-float` | Chìm hay nổi | Đồ vật trên băng chuyền; vuốt lên (nổi) hoặc xuống (chìm) để đoán, rồi đồ rơi vào chậu cho xem kết quả | Vuốt lên/xuống | 15 lần đoán đúng trong 60 s | Đoán sai: xem đồ chìm nổi, không trừ | SCI | LS DA NB | Dễ | S | 8 | [Buoyancy](https://en.wikipedia.org/wiki/Buoyancy) |
| 176 | `sun-rain-balance` | Nắng mưa cho cây | Thanh nắng và thanh nước của cây giảm dần; kéo đám mây che hay mở mặt trời; thiếu hay thừa đều chậm lớn | Kéo mây | Cây ra 5 quả trong 60 s | Cây héo: lớn chậm, không chết | SCI | FO NT NB | Dễ | S | 10 | [PBS KIDS games](https://pbskids.org/games) |
| 177 | `barrel-climb` | Leo kho thóc | Bao thóc lăn xuống các dốc nghiêng; bé tự chạy, chạm để nhảy qua bao, vuốt lên ở chân thang để leo | Chạm, vuốt lên | Lên đỉnh 2 lần trong 90 s | Trúng bao: ngồi 1 s | ARC | NT LD | Vừa | M | 6 | [Donkey Kong (1981)](https://en.wikipedia.org/wiki/Donkey_Kong_(1981_video_game)) |
| 178 | `breakout` | Phá gạch | Kéo thanh đỡ; bóng nảy phá các hàng gạch; hứng quả rơi để thanh to ra | Kéo ngang | Phá 40 viên trong 90 s | Bóng rơi: bóng mới, mất 1/3 tim | ARC | TT LD SC | Vừa | M | 8 | [Breakout](https://en.wikipedia.org/wiki/Breakout_(video_game)) |
| 179 | `cube-hop` | Nhảy đổi màu kim tự tháp | Kim tự tháp khối; ô nào bé nhảy lên thì đổi màu; tránh quả bóng nảy từ đỉnh xuống | Chạm ô kề để nhảy | Đổi màu 2 tháp (21 ô) trong 90 s | Rơi khỏi tháp hay trúng bóng: mất 1/3 tim | ARC | LD TT | Vừa | M | 10 | [Q*bert](https://en.wikipedia.org/wiki/Q*bert) |
| 180 | `pinball` | Bắn bi pinball | Chạm nửa trái/phải màn hình để bật cần gạt; giữ bi trên bàn, bắn trúng chuông và đèn | Chạm trái/phải | 500 điểm với 3 bi | Hết bi | ARC | TT CP | Vừa | L | 9 | [Pinball](https://en.wikipedia.org/wiki/Pinball) |

## 4. Nhóm theo yêu cầu

**Toán, 33 game (NUM)**: `bamboo-hundred`, `block-count`, `book-shelf-order`, `cable-car`, `cake-decorate`, `clock-catch`, `croc-compare`, `crowd-gates`, `domino-match`, `fair-share`, `fruit-skewer`, `hand-span`, `head-count`, `hundred-chart`, `jar-estimate`, `kangaroo-hop`, `lift-numbers`, `low-to-high`, `make-ten`, `math-race`, `merge-2048`, `pay-exact`, `penguin-share`, `photo-finish`, `polyline-length`, `seesaw-logic`, `shape-sorter`, `shikaku-fields`, `tens-bundles`, `three-span-bag`, `to-he-roll`, `treasure-map-steps`, `water-jugs`.

**Tiếng Việt, 11 game (CHU)**: `flag-commands`, `folk-riddle`, `magic-letters`, `nu-na-nu-nong`, `picture-crossword`, `sentence-train`, `story-order`, `tone-mark`, `word-chain`, `word-maze`, `word-search`.

Toán và Tiếng Việt có tổng 44 game, chia đều 7–8 game mỗi lô. Nội dung bám chương trình lớp 2:

- số đến 100 rồi đến 1000, chục và đơn vị;
- cộng trừ qua 10;
- bảng nhân 2 và 5 (trong `crowd-gates`);
- xem giờ;
- đo độ dài bằng cm, đo bằng gang tay;
- đường gấp khúc;
- chia đều;
- tiền Việt Nam (chỉ `pay-exact`; bài này nằm ở tập 2, repo hiện mới kiểm kê tập 1).

Số và chữ sinh theo seed. Bộ sinh phải kiểm phạm vi lớp 2, giống cách `content:check` đang kiểm nội dung bài học.

**Văn hóa Việt, 41 game** (các game họ FOL, FES và game có chủ đề Việt ở họ khác): `carp-waterfall`, `dan-bau`, `hold-notes`, `rice-pound`, `five-fruit-tray`, `chopsticks`, `paddy-water`, `rice-plant`, `rice-winnow`, `bat-trach`, `bo-khan`, `cap-cua`, `cat-mouse`, `chi-chi`, `co-ganh`, `danh-khang`, `keo-cua`, `nhay-sap`, `oan-tu-xi`, `phao-dat`, `sack-race`, `spinning-top`, `stilts-walk`, `swing-push`, `dong-ho-print`, `hoa-dang`, `lantern-light`, `ong-do-calligraphy`, `pottery-wheel`, `rising-water`, `thoi-com-thi`, `water-puppet`, `bamboo-hundred`, `pay-exact`, `three-span-bag`, `to-he-roll`, `folk-riddle`, `nu-na-nu-nong`, `tone-mark`, `word-chain`, `word-maze`.

### Gán map (map nào cũng có ít nhất 20 game mới)

| Mã | Map (id) | Game mới | Game mới hợp bối cảnh |
|---|---|---|---|
| FO | Khu rừng bí mật (`forest`) | 20 | `bird-flock`, `wall-jump`, `zigzag-path`, `butterfly-net`, `balloon-guard`, `boomerang-throw`, `frisbee-dog`, `bird-choir`, `firefly-sync`, `stone-path-memory`, `odd-one-out`, `ant-lemmings`, `bat-echo`, `snow-tracks`, `keo-cua`, `bamboo-hundred`, `polyline-length`, `treasure-map-steps`, `shadow-shade`, `sun-rain-balance` |
| SC | Trường học (`truong-hoc`) | 46 | `hole-in-wall`, `bank-shot`, `paint-splat`, `lunchbox-pack`, `odd-one-out`, `dots-boxes`, `nonogram`, `reversi`, `sudoku-mini`, `one-stroke-house`, `paper-fold-cut`, `bottle-flip`, `cup-stacking`, `volleyball-beach`, `bo-khan`, `cat-mouse`, `chi-chi`, `nhay-sap`, `oan-tu-xi`, `sack-race`, `spinning-top`, `block-count`, `clock-catch`, `croc-compare`, `crowd-gates`, `hand-span`, `hundred-chart`, `low-to-high`, `make-ten`, `photo-finish`, `polyline-length`, `seesaw-logic`, `shape-sorter`, `tens-bundles`, `flag-commands`, `nu-na-nu-nong`, `sentence-train`, `tone-mark`, `word-chain`, `word-maze`, `word-search`, `bottle-rocket`, `color-mix`, `seesaw-launch`, `simple-circuit`, `breakout` |
| TT | Trung tâm (`trung-tam`) | 53 | `helix-drop`, `skate-tricks`, `balloon-guard`, `hole-in-wall`, `bank-shot`, `fire-hose`, `frisbee-dog`, `paint-splat`, `micro-mix`, `customer-memory`, `bus-jam`, `bus-lines`, `lights-out`, `reversi`, `tile-flood`, `tile-triple`, `bottle-flip`, `pull-pin`, `seal-balance`, `domino-chain`, `bumper-cars`, `drift-corner`, `air-hockey`, `mini-golf`, `petanque`, `hole-grow`, `co-ganh`, `nhay-sap`, `oan-tu-xi`, `sack-race`, `stilts-walk`, `swing-push`, `lantern-light`, `ong-do-calligraphy`, `water-puppet`, `block-count`, `clock-catch`, `crowd-gates`, `domino-match`, `kangaroo-hop`, `lift-numbers`, `math-race`, `merge-2048`, `photo-finish`, `seesaw-logic`, `to-he-roll`, `flag-commands`, `sentence-train`, `color-mix`, `seesaw-launch`, `breakout`, `cube-hop`, `pinball` |
| LS | Làng ven sông (`lang-ven-song`) | 34 | `carp-waterfall`, `rain-barrel`, `skipping-stones`, `chain-pop`, `bird-choir`, `dan-bau`, `firefly-sync`, `hold-notes`, `rice-pound`, `stone-path-memory`, `river-crossing`, `unblock-ferry`, `current-drift`, `dig-channel`, `ferry-dock`, `high-dive`, `net-cast`, `rice-plant`, `bat-trach`, `cap-cua`, `co-ganh`, `keo-cua`, `nhay-sap`, `phao-dat`, `swing-push`, `hoa-dang`, `lantern-light`, `pottery-wheel`, `rising-water`, `thoi-com-thi`, `water-puppet`, `croc-compare`, `sail-wind`, `sink-float` |
| XM | Xóm Mái Ấm (`xom-mai-am`) | 32 | `skate-tricks`, `rain-barrel`, `fire-hose`, `yo-yo`, `snap-match`, `tidy-room`, `bus-jam`, `bus-lines`, `one-stroke-house`, `bottle-flip`, `rain-shield`, `roof-tiles`, `petanque`, `rice-winnow`, `hole-grow`, `bo-khan`, `cat-mouse`, `chi-chi`, `co-ganh`, `danh-khang`, `keo-cua`, `oan-tu-xi`, `spinning-top`, `swing-push`, `domino-match`, `head-count`, `lift-numbers`, `water-jugs`, `folk-riddle`, `nu-na-nu-nong`, `word-chain`, `magnet-sweep` |
| CP | Chợ phiên (`cho-phien`) | 20 | `customer-memory`, `shopping-memory`, `nesting-dolls`, `five-fruit-tray`, `knot-untangle`, `tile-triple`, `bumper-cars`, `chopsticks`, `cookie-cutter`, `who-swapped`, `dong-ho-print`, `pottery-wheel`, `cake-decorate`, `fair-share`, `fruit-skewer`, `jar-estimate`, `pay-exact`, `seesaw-logic`, `to-he-roll`, `pinball` |
| NT | Nông trại (`nong-trai`) | 31 | `butterfly-net`, `rain-barrel`, `cloud-blaster`, `bird-choir`, `hold-notes`, `rice-pound`, `ant-lemmings`, `circle-chick`, `gear-train`, `river-crossing`, `tile-flood`, `dig-channel`, `pull-pin`, `paddy-water`, `paper-io`, `rice-plant`, `rice-winnow`, `bat-trach`, `danh-khang`, `phao-dat`, `sack-race`, `stilts-walk`, `thoi-com-thi`, `bamboo-hundred`, `kangaroo-hop`, `shikaku-fields`, `water-jugs`, `bottle-rocket`, `shadow-shade`, `sun-rain-balance`, `barrel-climb` |
| TV | Thư viện (`thu-vien`) | 35 | `dan-bau`, `music-box`, `pitch-stairs`, `snap-match`, `nesting-dolls`, `odd-one-out`, `dots-boxes`, `knot-untangle`, `nonogram`, `peg-solitaire`, `robot-path`, `sudoku-mini`, `tile-triple`, `mirror-twins`, `one-stroke-house`, `marble-run`, `card-house`, `dong-ho-print`, `ong-do-calligraphy`, `rising-water`, `book-shelf-order`, `hundred-chart`, `low-to-high`, `make-ten`, `merge-2048`, `folk-riddle`, `magic-letters`, `picture-crossword`, `story-order`, `tone-mark`, `word-chain`, `word-maze`, `word-search`, `color-mix`, `simple-circuit` |
| LD | Lâu đài (`lau-dai`) | 20 | `carp-waterfall`, `gravity-flip`, `helix-drop`, `pop-lock`, `gear-train`, `knight-hop`, `lights-out`, `mastermind`, `peg-solitaire`, `seat-logic`, `mirror-twins`, `portal-maze`, `rotating-maze`, `card-house`, `roof-tiles`, `who-swapped`, `magic-letters`, `barrel-climb`, `breakout`, `cube-hop` |
| NU | Núi tuyết (`nui-tuyet`) | 24 | `gravity-flip`, `wall-jump`, `zigzag-path`, `balloon-guard`, `melting-floes`, `cloud-blaster`, `skipping-stones`, `pitch-stairs`, `stone-path-memory`, `ice-bridge`, `nonogram`, `bat-echo`, `rotating-maze`, `paper-fold-cut`, `parachute-land`, `ice-sculpt`, `drift-corner`, `air-hockey`, `ice-fishing`, `snow-tracks`, `block-count`, `cable-car`, `crowd-gates`, `penguin-share` |
| DA | Đảo bí ẩn (`dao-bi-an`) | 25 | `bird-flock`, `zigzag-path`, `melting-floes`, `boomerang-throw`, `skipping-stones`, `chain-pop`, `pop-lock`, `mastermind`, `reef-sweeper`, `unblock-ferry`, `portal-maze`, `current-drift`, `parachute-land`, `seal-balance`, `sand-castle`, `ferry-dock`, `high-dive`, `mini-golf`, `volleyball-beach`, `net-cast`, `cap-cua`, `three-span-bag`, `treasure-map-steps`, `sail-wind`, `sink-float` |
| NB | Nhà của bé (`nha-cua-be`) | 35 | `butterfly-net`, `frisbee-dog`, `paint-splat`, `micro-mix`, `yo-yo`, `music-box`, `tidy-room`, `lunchbox-pack`, `nesting-dolls`, `circle-chick`, `five-fruit-tray`, `robot-path`, `seat-logic`, `paper-fold-cut`, `dig-channel`, `marble-run`, `rain-shield`, `cup-stacking`, `domino-chain`, `mini-golf`, `chopsticks`, `cookie-cutter`, `cake-decorate`, `clock-catch`, `fair-share`, `fruit-skewer`, `hand-span`, `head-count`, `jar-estimate`, `shape-sorter`, `story-order`, `magnet-sweep`, `shadow-shade`, `sink-float`, `sun-rain-balance` |

## 5. Chia lô G6–G11

Cách chia: xếp 180 game theo cỡ L → M → S, trong mỗi cỡ thì theo họ, rồi chia lần lượt cho 6 lô theo kiểu rắn (6‑7‑8‑9‑10‑11‑11‑10‑…). Sau đó chạy 20.000 lần thử đổi chỗ hai game cùng cỡ giữa hai lô, giữ lần đổi nào làm tăng số map phủ, số họ, hoặc làm số game Toán/Tiếng Việt đều hơn giữa các lô.

| Lô | Số game | S / M / L | Số họ | Map | Toán + Tiếng Việt | Game |
|---|---|---|---|---|---|---|
| G6 | 30 | 19 / 10 / 1 | 18 | 12/12 | 8 | `bus-lines`, `barrel-climb`, `paper-fold-cut`, `rising-water`, `rotating-maze`, `marble-run`, `lights-out`, `reef-sweeper`, `sudoku-mini`, `sail-wind`, `volleyball-beach`, `fire-hose`, `cup-stacking`, `tone-mark`, `word-chain`, `pottery-wheel`, `cap-cua`, `chi-chi`, `nhay-sap`, `rice-winnow`, `ice-fishing`, `tidy-room`, `dan-bau`, `block-count`, `kangaroo-hop`, `make-ten`, `polyline-length`, `tens-bundles`, `to-he-roll`, `zigzag-path` |
| G7 | 30 | 19 / 10 / 1 | 20 | 12/12 | 7 | `dig-channel`, `card-house`, `rain-barrel`, `word-search`, `balloon-guard`, `mastermind`, `reversi`, `robot-path`, `tile-triple`, `helix-drop`, `air-hockey`, `frisbee-dog`, `sentence-train`, `hole-grow`, `one-stroke-house`, `water-puppet`, `bo-khan`, `hold-notes`, `bamboo-hundred`, `book-shelf-order`, `cake-decorate`, `croc-compare`, `penguin-share`, `ice-bridge`, `river-crossing`, `ferry-dock`, `shadow-shade`, `snow-tracks`, `lunchbox-pack`, `pop-lock` |
| G8 | 30 | 19 / 10 / 1 | 18 | 12/12 | 8 | `ant-lemmings`, `breakout`, `picture-crossword`, `bat-echo`, `merge-2048`, `pull-pin`, `rain-shield`, `bus-jam`, `peg-solitaire`, `bird-flock`, `petanque`, `skipping-stones`, `sand-castle`, `story-order`, `word-maze`, `hole-in-wall`, `dong-ho-print`, `bat-trach`, `danh-khang`, `sack-race`, `snap-match`, `firefly-sync`, `hundred-chart`, `math-race`, `photo-finish`, `water-jugs`, `color-mix`, `sink-float`, `who-swapped`, `odd-one-out` |
| G9 | 30 | 19 / 10 / 1 | 19 | 12/12 | 7 | `pinball`, `boomerang-throw`, `cloud-blaster`, `domino-chain`, `shikaku-fields`, `current-drift`, `circle-chick`, `dots-boxes`, `bumper-cars`, `skate-tricks`, `mini-golf`, `butterfly-net`, `folk-riddle`, `cookie-cutter`, `hoa-dang`, `oan-tu-xi`, `spinning-top`, `rice-plant`, `shopping-memory`, `rice-pound`, `clock-catch`, `fruit-skewer`, `low-to-high`, `pay-exact`, `treasure-map-steps`, `seal-balance`, `tile-flood`, `carp-waterfall`, `magnet-sweep`, `chain-pop` |
| G10 | 30 | 19 / 10 / 1 | 17 | 12/12 | 7 | `co-ganh`, `cube-hop`, `paper-io`, `mirror-twins`, `music-box`, `crowd-gates`, `domino-match`, `gear-train`, `nonogram`, `unblock-ferry`, `bottle-rocket`, `bank-shot`, `roof-tiles`, `flag-commands`, `nu-na-nu-nong`, `chopsticks`, `ong-do-calligraphy`, `phao-dat`, `swing-push`, `stone-path-memory`, `pitch-stairs`, `fair-share`, `head-count`, `jar-estimate`, `parachute-land`, `five-fruit-tray`, `knight-hop`, `gravity-flip`, `sun-rain-balance`, `yo-yo` |
| G11 | 30 | 20 / 9 / 1 | 20 | 12/12 | 7 | `micro-mix`, `magic-letters`, `melting-floes`, `cat-mouse`, `paddy-water`, `customer-memory`, `lift-numbers`, `knot-untangle`, `seat-logic`, `simple-circuit`, `paint-splat`, `ice-sculpt`, `lantern-light`, `thoi-com-thi`, `keo-cua`, `stilts-walk`, `net-cast`, `portal-maze`, `bird-choir`, `cable-car`, `hand-span`, `seesaw-logic`, `shape-sorter`, `three-span-bag`, `bottle-flip`, `drift-corner`, `wall-jump`, `seesaw-launch`, `high-dive`, `nesting-dolls` |

Số game mới của từng map trong mỗi lô. Ô nào cũng ≥ 1, nên giao xong lô nào thì map nào cũng có thêm trò:

| Lô | FO | SC | TT | LS | XM | CP | NT | TV | LD | NU | DA | NB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G6 | 2 | 12 | 7 | 6 | 6 | 2 | 3 | 7 | 3 | 5 | 5 | 4 |
| G7 | 5 | 7 | 9 | 7 | 4 | 2 | 6 | 6 | 4 | 5 | 3 | 6 |
| G8 | 5 | 8 | 10 | 4 | 6 | 2 | 6 | 10 | 3 | 2 | 4 | 3 |
| G9 | 3 | 5 | 9 | 6 | 5 | 6 | 7 | 3 | 1 | 1 | 6 | 8 |
| G10 | 2 | 6 | 8 | 5 | 7 | 4 | 5 | 5 | 6 | 6 | 2 | 8 |
| G11 | 3 | 8 | 10 | 6 | 4 | 4 | 4 | 4 | 3 | 5 | 5 | 6 |

**Khung cần bổ sung trước khi giao lô** (để 6 agent không viết lại cùng một thứ):

- **Âm thanh** (cần trước G6, G7, G10): `playNote(midi, voice)` hiện phát nốt có độ dài cố định.
  - `dan-bau` cần một giọng trượt cao độ liên tục.
  - `hold-notes` và `music-box` cần nốt giữ dài.
  - Đề xuất thêm sự kiện `noteOn`/`noteOff` (hoặc trường `hold`) vào `GameEvent`. Host sẽ giữ oscillator cho tới khi có `noteOff` và đổi tần số theo `note` mới. Vẫn dùng Web Audio, không cần file âm thanh.
- **Bộ nhận dạng nét vẽ** (cần trước G11): `magic-letters` phải nhận ra chữ bé vẽ.
  - Đề xuất tự viết bộ so mẫu kiểu $1 Unistroke (khoảng 100 dòng, so với mẫu nét chữ đã chuẩn hóa), không thêm dependency.
  - `one-stroke-house` và `paper-fold-cut` chỉ cần hình học đơn giản.
- **Sinh đề Toán và Tiếng Việt**: một helper dùng chung để sinh số, phép tính, giờ và từ theo `rng`, kẹp vào phạm vi lớp 2. Đây là invariant của hệ thống nên làm sẵn một lần, theo quy tắc DRY của repo.
- **Vật lý**: helper tròn/hộp hiện có đủ cho `pinball`, `breakout`, `mini-golf`, `bumper-cars` và `seal-balance`.
  - `dig-channel` (nước dạng hạt trong lưới đất) và `rain-shield` (giọt mưa nảy trên một đường gấp khúc) chỉ cần hạt + va chạm với đoạn thẳng.
  - `card-house` dựng nhà bài theo kịch bản, không cần thân cứng thật.
  - Vẫn chưa cần planck.js.

## 6. Hình ảnh và âm thanh

**Không game nào thiếu hình.** Script đã so 193 tên emoji trong bảng dưới với cây `microsoft/fluentui-emoji@1ffb34c752ec` (1.595 thư mục có PNG 3D): tên nào cũng có. Vật không có emoji thì vẽ bằng hình khối, ghi ở cột "Vẽ bằng hình khối". Ví dụ: con quay, bi sắt, sào nhảy sạp, nia, cối giã, que tính, tờ tiền, quân domino, lá bài, mạch điện. Ở cột Fluent Emoji, tên không có dấu là đã có trong `sprites.ts`; dấu ¹ là có file trong pack, chỉ cần thêm một dòng `REUSED`; dấu ² là phải tải.

**Đã có file trong pack, chỉ cần thêm vào `REUSED` của `sprites.ts` (26)**: Alarm clock, Artist palette, Blue book, Books, Chopsticks, Door, Flute, Gear, Green book, Locked, Mirror, Nesting dolls, Nut and bolt, Old key, Orange book, Paintbrush, Paperclip, Railway car, Ribbon, Ring buoy, Scissors, Scroll, Straight ruler, Unlocked, Window, World map.

**Phải tải qua `tools/assets/sources.json` (75), rồi chạy `pnpm assets:fetch` và `pnpm assets:manifest`**: Amphora, Ant, Bat, Battery, Bento box, Blossom, Boomerang, Bowl with spoon, Brick, Bus stop, Candle, Carp streamer, Carpentry saw, Castle, Chair, Chequered flag, Child, Cloud with rain, Clutch bag, Crescent moon, Crocodile, Cup with straw, Dog, Down arrow, Dragon, Elephant, Ferry, Fishing pole, Flag in hole, Fly, Hammer, Horse, Ice, Ice hockey, Jellyfish, Kiwi fruit, Ladder, Left arrow, Locomotive, Magic wand, Mango, Mountain, Mountain cableway, Office building, Parachute, Person cartwheeling, Person gesturing ok, Person kneeling, Person standing, Pig, Racing car, Raised back of hand, Raised fist, Raised hand, Right arrow, Robot, Rooster, School, Seal, Shopping bags, Shortcake, Skier, Tangerine, Teacup without handle, Toolbox, Top hat, Tractor, Triangular flag, Umbrella, Up arrow, Victory hand, Water buffalo, Water wave, Wind face, Yo-yo.

Một số tên trong danh sách tải (Child, Water wave, Racing car, Chequered flag, Teacup without handle, Water buffalo…) report đầu đã đề xuất, nhưng lô G1–G5 làm bằng hình thay thế nên chưa tải. Khi tải, nên gom yêu cầu của cả lô về phiên chính một lần, vì `sources.json` và `sprites.ts` là file dùng chung.

Các điểm cần người duyệt xem:

- **Mặt người**: `hole-in-wall` dùng 4 tư thế từ 4 emoji (Person standing, Person kneeling, Person gesturing ok, Person cartwheeling). Màu da theo bản mặc định (vàng) của Fluent.
- **Chữ Việt trên canvas** (họ CHU, `chi-chi`, `nu-na-nu-nong`, `ong-do-calligraphy`): dùng font Baloo 2 hoặc Nunito đã có trong pack. Cả hai có bộ ký tự tiếng Việt, nhưng nên chụp `/minigame.html?game=tone-mark&at=5` để kiểm dấu chồng (ặ, ễ, ở).
- **Con trạch** (`bat-trach`) không có emoji, vẽ bằng đường cong. **Chú Tễu** (`water-puppet`) cũng không có, dùng Water buffalo và Duck làm con rối.

Âm thanh dùng Web Audio cho 9 game nhạc, nhịp: `dan-bau`, `hold-notes`, `music-box`, `pitch-stairs`, `bird-choir`, `firefly-sync`, `rice-pound`, `nhay-sap`, `keo-cua`. Game nào cũng phải có dấu hiệu hình (vòng nhịp, vạch nốt), để bé chơi được cả khi tắt tiếng.

| id | Fluent Emoji (tên thư mục, bản 3D) | Vẽ bằng hình khối | Đủ hình? |
|---|---|---|---|
| `bird-flock` | Bird, Cloud | vòng mây | Có |
| `carp-waterfall` | Fish, Water wave ², Dragon ² | thác, mỏm đá | Có |
| `gravity-flip` | Gem stone, Ice ², Rock | trần, sàn cuộn | Có |
| `helix-drop` | Star, Gem stone | tháp trụ, đĩa tầng, bóng | Có |
| `skate-tricks` | Skateboard, Star | dốc, bậc thềm | Có |
| `wall-jump` | Star, Ice ² | hai vách cuộn | Có |
| `zigzag-path` | Gem stone, Evergreen tree | đường gấp khúc | Có |
| `butterfly-net` | Butterfly, Tulip, Blossom ² | vợt | Có |
| `rain-barrel` | Cloud with rain ², Droplet, Amphora ², Leafy green | tấm lá (đa giác) | Có |
| `balloon-guard` | Balloon, Umbrella ², Chestnut, Fallen leaf | — | Có |
| `hole-in-wall` | Person standing ², Person kneeling ², Person gesturing ok ², Person cartwheeling ² | tường xốp, lỗ | Có |
| `melting-floes` | Penguin, Ice ², Fish | tảng băng | Có |
| `bank-shot` | Volleyball, Child ², Package | tường, đường chấm | Có |
| `boomerang-throw` | Boomerang ², Mango ², Coconut, Palm tree | đường bay chấm | Có |
| `cloud-blaster` | Cloud, Cloud with rain ², Droplet, Sheaf of rice | tia nước | Có |
| `fire-hose` | Fire, Firefighter, Fire engine, House, Droplet | tia nước cong | Có |
| `frisbee-dog` | Flying disc, Dog ² | — | Có |
| `paint-splat` | Artist palette ¹, Paintbrush ¹ | tranh vùng màu | Có |
| `skipping-stones` | Rock, Water wave ², Star | vòng gợn nước | Có |
| `chain-pop` | Jellyfish ² | vòng sáng | Có |
| `micro-mix` | Red apple, Door ¹, Light bulb, Fly ², Soccer ball | khung trò | Có |
| `pop-lock` | Locked ¹, Unlocked ¹, Old key ¹ | vòng khóa, kim | Có |
| `yo-yo` | Yo-yo ² | dây | Có |
| `bird-choir` | Bird | dây điện, vòng nhịp | Có |
| `dan-bau` | Musical note | dây đàn, cần đàn | Có |
| `firefly-sync` | Evergreen tree, Crescent moon ² | đom đóm (hạt Kenney) | Có |
| `hold-notes` | Flute ¹, Kite | vạch nốt dài | Có |
| `music-box` | Musical note, Gear ¹ | lưới chốt | Có |
| `pitch-stairs` | Musical note, Ice ², Up arrow ², Down arrow ² | bậc | Có |
| `rice-pound` | Cooked rice, Sheaf of rice | cối, chày | Có |
| `customer-memory` | Teacup without handle ², Cup with straw ², Glass of milk, Beverage box, Child ² | bàn | Có |
| `shopping-memory` | Basket, Shopping bags ², (rau quả theo map) | sạp | Có |
| `snap-match` | (emoji theo map) | mặt bài | Có |
| `stone-path-memory` | Rock, Water wave ², Child ² | suối | Có |
| `tidy-room` | Teddy bear, Books ¹, Kite, Soccer ball | phòng, kệ | Có |
| `lunchbox-pack` | Cooked rice, Leafy green, Fish, Cut of meat, Banana, Bento box ² | ngăn hộp | Có |
| `nesting-dolls` | Nesting dolls ¹ | — | Có |
| `odd-one-out` | (emoji theo map) | — | Có |
| `ant-lemmings` | Ant ², Leaf fluttering in wind | địa hình | Có |
| `bus-jam` | Bus, Child ² | bến, ô chờ | Có |
| `bus-lines` | Bus, Bus stop ², House, School ² | tuyến, trạm | Có |
| `circle-chick` | Baby chick | lưới lục giác, rào | Có |
| `dots-boxes` | — | chấm, cạnh | Có |
| `five-fruit-tray` | Banana, Watermelon, Mango ², Tangerine ², Grapes, Pineapple | mâm | Có |
| `gear-train` | Gear ¹ | chốt, cối xay | Có |
| `ice-bridge` | Snowflake, Ice ², Penguin | lưới hồ | Có |
| `knight-hop` | Horse ², Star | bàn cờ | Có |
| `knot-untangle` | Balloon | dây | Có |
| `lights-out` | Window ¹, Castle ² | lưới | Có |
| `mastermind` | Gem stone, Locked ¹ | chốt báo | Có |
| `nonogram` | — | lưới, số | Có |
| `peg-solitaire` | Gem stone | bàn lỗ | Có |
| `reef-sweeper` | Rock, Triangular flag ² | ô cát | Có |
| `reversi` | — | bàn, quân | Có |
| `river-crossing` | Dog ², Chicken, Sheaf of rice, Canoe | sông | Có |
| `robot-path` | Robot ², Left arrow ², Right arrow ², Up arrow ² | lưới phòng | Có |
| `seat-logic` | Rabbit, Turtle, Cat face, Mouse face, Crown | bàn, ghế | Có |
| `sudoku-mini` | Red apple, Banana, Grapes, Tangerine ² | lưới | Có |
| `tile-flood` | — | lưới màu | Có |
| `tile-triple` | (emoji theo map) | ô, khay | Có |
| `unblock-ferry` | Canoe, Sailboat | thuyền (khối dài), lưới | Có |
| `bat-echo` | Bat ², Crescent moon ² | vách hang | Có |
| `mirror-twins` | Mirror ¹, Star, Child ² | hai lưới đối xứng | Có |
| `portal-maze` | Wrapped gift, Child ² | cổng màu | Có |
| `rotating-maze` | Star | mê cung tròn, bi | Có |
| `one-stroke-house` | House, Envelope | đỉnh, cạnh | Có |
| `paper-fold-cut` | Scissors ¹, Snowflake | giấy gấp | Có |
| `bottle-flip` | Chair ² | chai (hình vẽ) | Có |
| `current-drift` | Rock, Desert island, Envelope | mũi tên dòng chảy | Có |
| `dig-channel` | Duck, Droplet | đất, nước hạt | Có |
| `marble-run` | — | máng, bi | Có |
| `parachute-land` | Parachute ², Desert island | chữ X, mũi tên gió | Có |
| `pull-pin` | — | ống, chốt, bi | Có |
| `rain-shield` | Dog ², Cloud with rain ², Droplet | nét vẽ | Có |
| `seal-balance` | Seal ², Volleyball | — | Có |
| `card-house` | Castle ² | lá bài | Có |
| `cup-stacking` | — | cốc | Có |
| `domino-chain` | Bell | quân domino | Có |
| `ice-sculpt` | Ice ², Hammer ² | lưới băng | Có |
| `roof-tiles` | House, Cloud with rain ², Bucket | ngói | Có |
| `sand-castle` | Bucket, Castle ², Spiral shell | tháp cát | Có |
| `bumper-cars` | Racing car ², Automobile | sàn tròn | Có |
| `drift-corner` | Racing car ² | đường, cột cua | Có |
| `ferry-dock` | Ferry ², Water wave ² | bến, dòng chảy | Có |
| `air-hockey` | Ice hockey ² | bàn, đĩa, vợt | Có |
| `high-dive` | Water wave ² | cầu nhảy, bọt | Có |
| `mini-golf` | Flag in hole ² | sân, tường | Có |
| `petanque` | Child ² | bi sắt, sân sỏi | Có |
| `volleyball-beach` | Volleyball, Palm tree | lưới, sân cát | Có |
| `chopsticks` | Chopsticks ¹, Beans, Bowl with spoon ² | — | Có |
| `cookie-cutter` | Cookie, Star, Red heart | tấm bột | Có |
| `ice-fishing` | Fish, Fishing pole ², Ice ², Penguin | lỗ băng, bóng cá | Có |
| `net-cast` | Fish, Tropical fish, Canoe | lưới tròn | Có |
| `paddy-water` | Sheaf of rice, Droplet | bậc ruộng, cống | Có |
| `paper-io` | Tractor ², Water buffalo ² | vùng màu | Có |
| `rice-plant` | Seedling, Farmer | ruộng nước | Có |
| `rice-winnow` | Cooked rice, Wind face ², Basket | nia | Có |
| `hole-grow` | Fallen leaf, Wastebasket, Package, Soccer ball | hố | Có |
| `snow-tracks` | Paw prints, Rabbit, Fox, Bird, Penguin | dấu chân | Có |
| `who-swapped` | (đồ vật theo map) | sạp | Có |
| `bat-trach` | Amphora ², Water wave ² | trạch (đường cong nâu), mặt nước | Có |
| `bo-khan` | Child ² | khăn | Có |
| `cap-cua` | Crab, Basket | nắp giỏ | Có |
| `cat-mouse` | Mouse face, Cat face, Child ² | vòng tay | Có |
| `chi-chi` | Raised hand ² | chữ đồng dao | Có |
| `co-ganh` | — | bàn, quân | Có |
| `danh-khang` | Wood | que, vạch đo | Có |
| `keo-cua` | Carpentry saw ², Wood | vạch nhịp | Có |
| `nhay-sap` | Child ² | sào tre | Có |
| `oan-tu-xi` | Raised fist ², Victory hand ², Raised hand ² | — | Có |
| `phao-dat` | Collision | bát đất | Có |
| `sack-race` | Child ², Chequered flag ² | bao bố | Có |
| `spinning-top` | Wood | con quay (hình nón gỗ) | Có |
| `stilts-walk` | Child ² | cà kheo, ụ đất | Có |
| `swing-push` | Ribbon ¹, Child ² | cây đu tre | Có |
| `dong-ho-print` | Pig ², Rooster ², Carp streamer ² | khuôn in | Có |
| `hoa-dang` | Lotus, Candle ², Canoe | dòng chảy | Có |
| `lantern-light` | Red paper lantern | dãy phố | Có |
| `ong-do-calligraphy` | Scroll ¹, Paintbrush ¹ | nét mẫu | Có |
| `pottery-wheel` | Amphora ² | đường viền mẫu | Có |
| `rising-water` | House, Water wave ², Mountain ² | đồi, mực nước | Có |
| `thoi-com-thi` | Fire, Cooked rice, Wood | nồi, thanh lửa | Có |
| `water-puppet` | Water buffalo ², Duck, Water wave ² | bóng mẫu, sân khấu nước | Có |
| `bamboo-hundred` | Herb | đốt tre | Có |
| `block-count` | — | khối isometric | Có |
| `book-shelf-order` | Green book ¹, Blue book ¹, Orange book ¹, Books ¹ | kệ | Có |
| `cable-car` | Mountain cableway ², Skier ² | cáp | Có |
| `cake-decorate` | Shortcake ², Strawberry, Candle ², Candy | — | Có |
| `clock-catch` | Alarm clock ¹, Rooster ² | mặt số | Có |
| `croc-compare` | Crocodile ² | đĩa | Có |
| `crowd-gates` | Child ², Chequered flag ² | cổng, đường chạy | Có |
| `domino-match` | — | quân domino | Có |
| `fair-share` | Birthday cake, Watermelon | vệt cắt | Có |
| `fruit-skewer` | Strawberry, Banana, Grapes, Tangerine ², Kiwi fruit ² | que, băng chuyền | Có |
| `hand-span` | Raised back of hand ², Straight ruler ¹ | thước gang | Có |
| `head-count` | House, Child ² | — | Có |
| `hundred-chart` | — | bảng ô | Có |
| `jar-estimate` | Jar, Candy | thước kim | Có |
| `kangaroo-hop` | Kangaroo, Carrot | trục số | Có |
| `lift-numbers` | Child ², Office building ² | buồng thang, tầng | Có |
| `low-to-high` | — | ô số | Có |
| `make-ten` | — | ô số | Có |
| `math-race` | Racing car ², Chequered flag ² | đường đua, biển | Có |
| `merge-2048` | — | ô số | Có |
| `pay-exact` | (hàng theo map) | tờ tiền vẽ bằng hình | Có |
| `penguin-share` | Penguin, Fish | — | Có |
| `photo-finish` | Rabbit, Turtle, Snail, Fox | vạch đích | Có |
| `polyline-length` | Ant ², Straight ruler ¹ | điểm, đoạn | Có |
| `seesaw-logic` | Elephant ², Pig ², Rabbit, Mouse face | bập bênh | Có |
| `shape-sorter` | — | hộp, khối hình | Có |
| `shikaku-fields` | Sheaf of rice, Seedling | lưới ruộng | Có |
| `tens-bundles` | — | que, dây buộc | Có |
| `three-span-bag` | Gem stone, Bird, Clutch bag ² | — | Có |
| `to-he-roll` | Straight ruler ¹ | thỏi bột | Có |
| `treasure-map-steps` | World map ¹, Wrapped gift, Up arrow ², Right arrow ² | lưới đảo | Có |
| `water-jugs` | Cow, Droplet | can, mực nước | Có |
| `flag-commands` | Triangular flag ², Child ² | — | Có |
| `folk-riddle` | (emoji đáp án) | — | Có |
| `magic-letters` | Balloon, Magic wand ² | nét vẽ | Có |
| `nu-na-nu-nong` | Child ² | chữ đồng dao | Có |
| `picture-crossword` | (emoji theo map) | lưới ô chữ | Có |
| `sentence-train` | Locomotive ², Railway car ¹ | toa | Có |
| `story-order` | Rabbit, Turtle | khung tranh | Có |
| `tone-mark` | Fish, Duck, Horse ², Top hat ² | thẻ dấu | Có |
| `word-chain` | Dragon ² | thẻ chữ | Có |
| `word-maze` | Cat | lưới chữ | Có |
| `word-search` | (emoji gợi ý) | lưới chữ | Có |
| `bottle-rocket` | Rocket, Parachute ², Droplet | bệ phóng, đồng hồ áp | Có |
| `color-mix` | Artist palette ¹, Paintbrush ¹ | lọ màu | Có |
| `magnet-sweep` | Magnet, Key, Paperclip ¹, Nut and bolt ¹, Toolbox ² | sân cát | Có |
| `sail-wind` | Sailboat, Wind face ², Ring buoy ¹ | buồm, mũi tên gió | Có |
| `seesaw-launch` | Basket, Basketball | bập bênh | Có |
| `shadow-shade` | Sun, Cat, Deciduous tree, House | bóng đổ | Có |
| `simple-circuit` | Battery ², Light bulb | dây | Có |
| `sink-float` | Rock, Wood, Key, Leaf fluttering in wind, Coin, Spiral shell | chậu nước | Có |
| `sun-rain-balance` | Sun, Cloud with rain ², Seedling, Red apple | 2 thanh | Có |
| `barrel-climb` | Ladder ², Sheaf of rice, Child ² | dốc, bao thóc | Có |
| `breakout` | Brick ², Star, Red apple | thanh đỡ, bóng | Có |
| `cube-hop` | Child ², Star | khối isometric | Có |
| `pinball` | Bell, Star | bàn, cần gạt, bi | Có |

## Nguồn và độ tin cậy

- **Cao** (trang chính thức, nghiên cứu, kho mã):
  - [Fluent Emoji repo](https://github.com/microsoft/fluentui-emoji): cây thư mục kiểm qua GitHub API.
  - Các quy tắc chạm có nguồn ở report đầu (NN/g, Anthony và cộng sự 2012, SRI/PBS KIDS).
  - [Brain Age](https://en.wikipedia.org/wiki/Brain_Age:_Train_Your_Brain_in_Minutes_a_Day!) (các bài Low to High, Head Count, Calculations), mô tả theo trang Wikipedia của game.
- **Trung bình** (nguồn thứ cấp nhưng đối chiếu được):
  - Wikipedia tiếng Anh và tiếng Việt cho từng game, trò dân gian, truyện. Cả 149 đường dẫn Wikipedia trong report đã kiểm bằng Wikipedia API: trang nào cũng tồn tại, và đường dẫn nào cũng là tiêu đề gốc, không qua trang chuyển hướng.
  - [Danh sách trò chơi truyền thống Việt Nam](https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_tr%C3%B2_ch%C6%A1i_truy%E1%BB%81n_th%E1%BB%91ng_c%E1%BB%A7a_Vi%E1%BB%87t_Nam).
  - [Super Mario Wiki – Microgame](https://www.mariowiki.com/Microgame) và [danh sách minigame Mario Party](https://www.mariowiki.com/List_of_Mario_Party_minigames).
  - [Clubhouse Games 51](https://en.wikipedia.org/wiki/Clubhouse_Games:_51_Worldwide_Classics).
- **Thấp hơn** (blog, trang thương mại, chỉ lấy làm cảm hứng):
  - Trò dân gian: [VinWonders: trò dân gian ngày Tết](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian-ngay-tet/), [VinWonders: 1001 trò dân gian](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian/), [Sakura: 100 trò chơi dân gian](https://sakuraschools.edu.vn/nghe-lam-cha-me/tro-choi-dan-gian/).
  - Hyper-casual: [CrazyLabs](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/), [Capermint](https://www.capermint.com/blog/hyper-casual-game-mechanics/), [GameRefinery](https://docs.gamerefinery.com/en/articles/3624452-hyper-casual).
  - Trò chơi trẻ em: [PBS KIDS](https://pbskids.org/games), [Sago Mini](https://sagomini.com/article/sago-mini-letter-to-parents/).
  - Năm game hyper-casual chưa có trang Wikipedia riêng (Helix Jump, Count Masters, Rise Up, Pop the Lock, Bus Jam). Cột Nguồn của chúng trỏ tới trang thể loại hoặc bài CrazyLabs, nên mức tin cậy thấp hơn. Đây chỉ là cảm hứng cơ chế, không lấy tên hay hình.

## Giới hạn của research

- Chưa chơi thử game nào và chưa thử với trẻ. Mục tiêu 1★ và mức Khó chỉ là ước lượng; bot test của từng lô mới chốt được số. 14 game Khó (logic, cờ, ô chữ) có thể phải hạ mục tiêu hoặc thu nhỏ bàn.
- Chưa mở trang ABCya (bản lấy về chỉ có tiêu đề), chưa xem danh sách thể loại của Poki và CrazyGames. Cơ chế của chúng đã được phủ qua các nguồn khác.
- Phạm vi Toán lớp 2 lấy theo chương trình chung. Repo mới kiểm kê tập 1 (`content/curriculum/toan2-t1`), nên `pay-exact` (tiền) và phép chia (`penguin-share`) có thể vượt phần bé đã học, nếu bé mới học tập 1.
- Mỗi map có 20–53 game mới. Một map đặt bao nhiêu NPC mời chơi là việc của pha đặt NPC, report này không tính.

## Câu hỏi còn mở

1. Có mở rộng API âm thanh (`noteOn`/`noteOff`, trượt cao độ) cho `dan-bau`, `hold-notes`, `music-box` không? Đề xuất: có, làm trong khung trước G6. Nếu không, đổi `dan-bau` sang bám dải bằng các nốt rời, và bỏ độ dài nốt của `hold-notes`. Gửi Jev.
2. Họ CHU bắt bé đọc tiếng, ngược với quy tắc "không bắt bé đọc mới chơi được" của report đầu. Đề xuất chấp nhận cho riêng 11 game này, vì bé lớp 2 đã đọc được và đây là mục tiêu của trò; chữ luôn đi kèm hình. Gửi Jev.
3. `pay-exact` (tiền) và `penguin-share` (chia) dùng nội dung tập 2. Nên giữ trong G9, G7 rồi để bộ sinh đề chỉ dùng mức dễ, hay đẩy xuống dự phòng tới khi có tập 2? Đề xuất giữ và dùng mức dễ.
4. Tải 75 emoji (khoảng 2,3 MB) theo từng game khi mở game như 106 emoji của report đầu, hay gộp atlas? Câu này vẫn chờ quyết định KTX2/atlas.

Status: DONE_WITH_CONCERNS
Summary: Đã viết danh mục 180 dạng minigame mới, khác cơ chế với 128 trò đã làm và khác nhau từng đôi (tổng 308). Trong đó có 44 game Toán/Tiếng Việt và 41 game văn hóa Việt; map nào cũng có ít nhất 20 game mới. Danh mục chia 6 lô G6–G11 × 30, lô nào cũng cân cỡ, cân họ và phủ đủ 12 map. 193 tên emoji đã kiểm với cây Fluent: không tên nào thiếu, 75 tên phải tải và 26 tên chỉ cần thêm vào `REUSED`.
Concerns: Ba game nhạc cần mở rộng API âm thanh của host (nốt giữ, trượt cao độ). Họ CHU là ngoại lệ có chủ ý của quy tắc "không bắt đọc". `pay-exact` và `penguin-share` dựa vào nội dung lớp 2 tập 2, repo chưa kiểm kê. Mục tiêu 1★ chưa được bot test xác nhận. Năm nguồn hyper-casual chỉ là trang thể loại hoặc blog.
