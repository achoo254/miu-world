# Research: 128 dạng minigame nhiệm vụ phụ cho bé 7–8 tuổi

Ngày 03/10/2026 · Pha R của plan [`261003-1549-minigames-home-polish`](../261003-1549-minigames-home-polish/plan.md) · Người viết: agent researcher.

## Kết luận

- Danh mục có **128 dạng minigame**, mỗi dạng một cơ chế lõi riêng, chia thành 23 họ. Về độ phức tạp: 73 game cỡ S, 50 cỡ M, 5 cỡ L. Map nào cũng có ít nhất 16 game hợp bối cảnh (Khu rừng, Lâu đài, Núi tuyết, Thư viện mỗi map 16; Trung tâm 43).
- **Pha F làm 3 game mẫu**: `jump-runner`, `egg-catch`, `penalty-kick`. Đây đúng là ba ví dụ người sở hữu nêu (runner, hứng trứng, bóng đá). Ba game dùng ba cử chỉ khác nhau (chạm/giữ, kéo, vuốt), nên chúng kiểm tra được cả ba đường nhập của khung. Trong lúc viết report, pha F đã tạo `content/minigames/runner.json` với id `runner` và cùng cơ chế với `jump-runner`. Hãy giữ id `runner` của pha F; `jump-runner` trong bảng chính là game đó.
- **Năm lô G1–G5, mỗi lô 25 game**. Lô nào cũng có 14 S, 10 M, 1 L, gồm 14–17 họ và có game cho cả 12 map. Vì vậy giao xong lô nào thì map nào cũng có thêm trò mới.
- **Hình ảnh**: cả 128 game vẽ được bằng Fluent Emoji 3D cộng hình khối và hạt Kenney. Tổng cộng cần 188 emoji khác nhau, đã kiểm từng tên với cây thư mục của `microsoft/fluentui-emoji` bản `1ffb34c752ec` mà repo đang dùng. Repo đã có 82 emoji, còn thiếu 106. Không game nào phải bỏ vì thiếu hình. Ba ý tưởng đã chuyển sang danh sách dự phòng vì hình hoặc vì trùng cơ chế (xem §1).
- **Âm thanh là chỗ còn hở**: Kenney Interface Sounds không có nốt nhạc lẫn tiếng con vật. Sáu game cần cao độ hoặc âm theo hướng sẽ tổng hợp tiếng bằng Web Audio (xem §4).
- **Vật lý**: chỉ `slingshot-tower` cần vật rắn xoay. Đề xuất cho khung F viết một helper va chạm hình tròn/hộp, chưa thêm dependency. Nếu sau này phải thêm thì chọn planck.js thay vì matter-js (xem §3).

## Quy ước đọc bảng

- **Khác cơ chế**: hai game được tính là khác nhau khi khác ít nhất một trong ba thứ: động tác tay, mục tiêu, hoặc cách thắng/thua. Chỉ đổi hình (reskin) thì không tính. Có cặp cùng động tác nhưng vòng chơi khác, ví dụ `boat-race` (chạm luân phiên trái/phải để chèo) và `swim-race` (chạm theo vòng nhịp, chạm loạn thì mệt). Những cặp quá gần nhau thì một game đã được chuyển xuống danh sách dự phòng.
- **Sao**: 1★ là mục tiêu ghi trong bảng. 2★ là 1,5 lần mục tiêu hoặc số lỗi còn một nửa. 3★ là 2 lần mục tiêu hoặc không lỗi nào. Với game đố: 2★ khi xong trong 2/3 thời gian, 3★ khi xong trong 1/3 thời gian hoặc bằng số bước tối thiểu. Server chấm theo mục tiêu như plan pha F.
- **Thua luôn nhẹ**: hết giờ mà chưa đạt 1★ thì hiện "Suýt được!", giữ nguyên điểm và cho chơi lại bằng một chạm. Mỗi game có tối đa 3 tim. Mất tim không làm mất điểm, và game không dừng giữa chừng nếu không ghi rõ trong bảng.
- **Khó**: độ khó với bé 7 tuổi khi nhắm mức 1★, chia Dễ / Vừa / Khó. Game Khó thì mức 1★ phải hạ xuống khi bot test cho thấy cần (xem quy tắc 6 ở §2).
- **Cỡ**: S là một vòng lặp, va chạm hình tròn/hộp, một loại đối tượng chính. M là nhiều loại đối tượng, có sinh màn hoặc AI đơn giản, hoặc lưới logic cần kiểm giải được. L là game cần vật lý dây hoặc vật rắn, AI theo lượt, hoặc nhiều hệ chạy cùng lúc.
- **Map**: FO Khu rừng bí mật · SC Trường học · TT Trung tâm · LS Làng ven sông · XM Xóm Mái Ấm · CP Chợ phiên · NT Nông trại · TV Thư viện · LD Lâu đài · NU Núi tuyết · DA Đảo bí ẩn · NB Nhà của bé.
- **Lô**: F là khung (3 game mẫu), G1–G5 là năm lô của các agent game.

## 1. Danh mục 128 dạng minigame

### Họ cơ chế

| Mã | Họ cơ chế | Số game |
|---|---|---|
| RUN | Chạy vô tận | 8 |
| CAT | Hứng | 3 |
| DOD | Né | 2 |
| AIM | Ngắm, ném, bắn | 9 |
| TIM | Chạm đúng lúc | 5 |
| MUS | Âm nhạc, nhịp | 4 |
| WHK | Đập, chạm mục tiêu | 4 |
| MEM | Trí nhớ, ghép cặp | 5 |
| SRT | Phân loại | 3 |
| PUZ | Đố, xếp hình, cờ | 14 |
| MAZ | Mê cung | 3 |
| DRW | Vẽ, theo nét | 5 |
| PHY | Vật lý, thăng bằng | 5 |
| BLD | Xây, xếp chồng | 4 |
| RAC | Đua, lái | 5 |
| SPO | Thể thao | 10 |
| COK | Nấu ăn, phục vụ | 4 |
| FSH | Câu, gắp, vớt | 4 |
| FRM | Nông trại, vườn | 6 |
| CLN | Dọn dẹp | 2 |
| SEE | Tìm kiếm, trốn tìm | 4 |
| FOL | Trò chơi dân gian | 16 |
| FES | Lễ hội, Tết, Trung thu | 3 |

Những trò đã chủ ý loại: bầu cua cá cọp, máy đẩy xu (cờ bạc, may rủi), đá gà, chọi trâu (động vật đánh nhau), đấu vật, đấm bốc (bạo lực). Súng chỉ xuất hiện dưới dạng súng nước.

### Bảng danh mục

| # | id | Tên | Luật chơi | Điều khiển | Thắng: mục tiêu 1★ | Thua (nhẹ) | Họ | Map | Khó | Cỡ | Lô | Nguồn / cảm hứng |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `lane-runner` | Chạy ba làn | Chạy tự động trên 3 làn; nhặt sao, tránh xe đẩy và khúc gỗ | Vuốt trái/phải đổi làn, vuốt lên nhảy | 25 sao trong 60 s | Vấp 3 lần thì về đích sớm, giữ sao đã nhặt | RUN | TT FO LS | Vừa | M | 5 | [Subway Surfers](https://en.wikipedia.org/wiki/Subway_Surfers) |
| 2 | `jump-runner` | Chạy nhảy qua hố | Chạy ngang tự động; nhảy qua đá và hố, nhặt quả | Chạm để nhảy, giữ lâu nhảy cao | Chạy 500 m trong 60 s | Vấp: chậm lại 1 s, không chết | RUN | FO NT DA | Dễ | S | F | [Dinosaur Game](https://en.wikipedia.org/wiki/Dinosaur_Game) |
| 3 | `flappy-fly` | Chim bay qua khe tre | Trọng lực kéo chim xuống, bay qua khe giữa hai cột tre | Chạm để vỗ cánh | Qua 10 khe trong 60 s | Chạm cột: lùi lại khe trước, mất 1/3 tim | RUN | FO DA LD | Khó | S | 5 | [Flappy Bird](https://en.wikipedia.org/wiki/Flappy_Bird) |
| 4 | `jetpack-hold` | Ba lô phản lực | Bay ngang trong thành phố; nhặt xu, tránh mây sấm | Giữ để bay lên, thả để hạ | 30 xu trong 60 s | Chạm mây: mất 1/3 tim | RUN | TT NU | Vừa | S | 4 | [Jetpack Joyride](https://en.wikipedia.org/wiki/Jetpack_Joyride) |
| 5 | `doodle-climb` | Nhảy bậc lên mây | Ếch tự nảy trên các lá/mây; lái để lên cao | Kéo ngang để lái | Lên 80 m trong 60 s | Rơi: quay về tấm gần nhất | RUN | FO NU TT | Vừa | M | 4 | [Doodle Jump](https://en.wikipedia.org/wiki/Doodle_Jump) |
| 6 | `rope-swing` | Đu dây qua rừng | Khỉ móc dây vào điểm treo gần nhất, đu rồi bay tới điểm sau | Giữ để móc dây, thả để bay | Qua 5 chặng trong 90 s | Rơi: quay lại móc trước | RUN | FO DA | Vừa | M | 4 | Stickman Hook (Madbox, 2018) – [CrazyLabs: hyper-casual mechanics](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) |
| 7 | `wave-surf` | Lướt sóng | Sóng nhấp nhô; lao xuống dốc lấy đà để bay qua đỉnh | Giữ để lao xuống, thả để bay | Vượt 5 đảo trong 60 s | Chậm: hết giờ, giữ số đảo | RUN | DA LS | Vừa | M | 3 | [Tiny Wings](https://en.wikipedia.org/wiki/Tiny_Wings) |
| 8 | `paper-route` | Giao báo xe đạp | Xe đạp chạy dọc phố; ném báo vào hộp thư (phải ném trước) | Chạm vào hộp thư để ném | 10 hộp thư trong 60 s | Ném trượt không trừ điểm | RUN | XM TT | Vừa | M | 5 | [Paperboy (video game)](https://en.wikipedia.org/wiki/Paperboy_(video_game)) |
| 9 | `egg-catch` | Hứng trứng | Gà trên sào đẻ trứng rơi; hứng bằng giỏ, né phân gà | Kéo giỏ ngang | 20 trứng trong 60 s | Rơi 5 trứng: dừng sớm, giữ số đã hứng | CAT | NB NT | Dễ | S | F | [Nu, Pogodi! (Elektronika)](https://en.wikipedia.org/wiki/Well,_Just_You_Wait!) – [Game & Watch Egg](https://en.wikipedia.org/wiki/List_of_Game_&_Watch_games) |
| 10 | `stack-catch` | Hứng bánh xếp chồng | Hứng bánh rơi lên đĩa; chồng cao lắc theo quán tính | Kéo đĩa ngang | Chồng 12 tầng trong 60 s | Chồng đổ: giữ số tầng cao nhất | CAT | CP NB | Vừa | M | 1 | [CrazyLabs: hyper-casual mechanics](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) (stacking) |
| 11 | `trampoline-rescue` | Bạt nhún cứu hộ | Các bạn nhảy xuống từ tòa nhà; bạt hứng cho nảy sang xe cứu hộ | Kéo tấm bạt ngang | Cứu 15 bạn trong 60 s | Lỡ 3 bạn (rơi xuống đệm hơi): dừng sớm | CAT | TT XM | Vừa | S | 4 | [Game & Watch Fire](https://en.wikipedia.org/wiki/List_of_Game_&_Watch_games) |
| 12 | `dodge-fall` | Né quả rơi | Quả thông/dừa/tuyết rơi, có bóng báo trước chỗ rơi | Kéo bé sang trái/phải | Sống 45 s, nhặt 10 sao | Trúng: choáng 1 s, mất 1/3 tim | DOD | FO DA NU | Dễ | S | 4 | [WarioWare microgames](https://www.mariowiki.com/Microgame) |
| 13 | `road-cross` | Qua đường qua sông | Bước qua làn xe và nhảy lên bè trôi trên sông | Chạm để bước tới, vuốt ngang để bước ngang | Qua 3 lượt trong 90 s | Đụng xe/rơi nước: về lề gần nhất | DOD | LS TT XM | Vừa | M | 5 | [Frogger](https://en.wikipedia.org/wiki/Frogger) – [Crossy Road](https://en.wikipedia.org/wiki/Crossy_Road) |
| 14 | `slingshot-tower` | Ná bắn tháp hộp | Bắn viên đá làm đổ tháp hộp, đồ chơi trên đỉnh rơi xuống | Kéo ngược để căng ná, thả để bắn | Đổ 3 tháp với 6 viên | Hết đá: hiện tháp còn lại, chơi lại | AIM | LD CP | Vừa | L | 1 | [Angry Birds](https://en.wikipedia.org/wiki/Angry_Birds) |
| 15 | `ring-toss-duck` | Ném vòng cổ vịt | Kim lực đung đưa; chọn lực rồi chọn hướng, vòng bay vào cổ vịt | Chạm 2 lần (lực, hướng) | 5 vòng trúng / 10 lượt | Hết lượt | AIM | CP LS | Dễ | S | 1 | [Huggies: trò chơi dân gian](https://www.huggies.com.vn/lam-cha-me/cha-me-va-con-cai/tro-choi-dan-gian) |
| 16 | `water-pistol` | Súng nước hội chợ | Vịt bia chạy ngang nhiều tầng; phun nước cho đổ | Giữ ngón trên màn, tia nước bắn theo ngón (có trễ) | 20 bia trong 60 s | Hết giờ | AIM | CP TT | Dễ | S | 1 | [Clubhouse Games 51](https://en.wikipedia.org/wiki/Clubhouse_Games:_51_Worldwide_Classics) (Shooting Gallery) |
| 17 | `bubble-shooter` | Bắn bóng màu | Bắn bóng lên chùm; 3 bóng cùng màu dính nhau thì nổ | Kéo để ngắm (đường chấm), thả để bắn | Nổ 30 bóng trong 90 s | Chùm chạm vạch dưới: dừng, giữ điểm | AIM | TT DA TV | Vừa | M | 5 | [Puzzle Bobble](https://en.wikipedia.org/wiki/Puzzle_Bobble) |
| 18 | `dart-wobble` | Phi tiêu tay run | Tâm ngắm lắc lư trên bia; ném khi tâm vào giữa | Chạm để ném | 150 điểm với 6 phi tiêu | Hết phi tiêu | AIM | CP LD | Dễ | S | 4 | [Clubhouse Games 51](https://en.wikipedia.org/wiki/Clubhouse_Games:_51_Worldwide_Classics) (Darts) |
| 19 | `candle-cake-spin` | Cắm nến bánh xoay | Bánh sinh nhật xoay; phóng nến cắm vào, không trúng nến cũ | Chạm để phóng nến | Cắm đủ 3 bánh (6–8 nến) trong 60 s | Trúng nến cũ: làm lại bánh đó | AIM | NB CP | Vừa | S | 5 | Knife Hit (Ketchapp, 2017) – [Ketchapp](https://en.wikipedia.org/wiki/Ketchapp) |
| 20 | `fruit-slice` | Chém trái cây | Trái cây tung lên; chém đôi, tránh xương rồng | Vuốt qua quả | 40 quả trong 60 s | Chém xương rồng 3 lần: dừng sớm | AIM | CP DA NT | Dễ | S | 3 | [Fruit Ninja](https://en.wikipedia.org/wiki/Fruit_Ninja) |
| 21 | `package-drop` | Thả quà từ dù | Máy bay bay ngang; thả gói quà rơi cong đáp xuống thuyền/nhà (phải thả trước) | Chạm để thả | 8 gói trúng / 12 | Hết gói | AIM | DA LS NT | Vừa | S | 2 | [WarioWare microgames](https://www.mariowiki.com/Microgame) |
| 22 | `snowball-fight` | Ném tuyết sau ụ | Núp sau ụ tuyết; nhô lên ném bạn nhô ra | Giữ để núp, thả để nhô, chạm bạn để ném | Trúng 10 lần trong 60 s | Bị trúng 5 lần: dừng sớm | AIM | NU SC | Vừa | M | 4 | [Time Crisis](https://en.wikipedia.org/wiki/Time_Crisis) (núp-nhô) |
| 23 | `red-light` | Một hai ba, đứng im! | Đi tới vạch khi bạn quay lưng; đứng im khi bạn quay lại | Giữ để đi, thả để dừng | Tới vạch trong 45 s | Bị thấy đang đi: lùi 3 bước | TIM | SC TV | Dễ | S | 1 | [Red light, green light](https://en.wikipedia.org/wiki/Statues_(game)) |
| 24 | `quick-draw` | Ai nhanh tay hơn | Chờ đèn lồng bật rồi chạm thật nhanh; chạm sớm là phạm | Chạm | Thắng 4/7 hiệp với mèo | Thua hiệp: chơi hiệp tiếp | TIM | LD XM | Dễ | S | 1 | [Kirby's Adventure](https://en.wikipedia.org/wiki/Kirby's_Adventure) (Quick Draw) |
| 25 | `stick-bridge` | Bắc cầu tre | Cây tre dài ra khi giữ; thả để đổ ngang qua khe suối | Giữ rồi thả | Qua 10 khe trong 90 s | Tre ngắn/dài: rơi xuống suối, làm lại khe đó | TIM | LS FO | Vừa | S | 2 | Stick Hero (Ketchapp, 2014) – [Ketchapp](https://en.wikipedia.org/wiki/Ketchapp) |
| 26 | `inflate-balloon` | Thổi bóng bay | Bóng to dần khi giữ; thả đúng vạch cỡ khách đặt, quá thì nổ | Giữ rồi thả | 8 bóng đúng cỡ trong 60 s | Nổ 3 bóng: dừng sớm | TIM | CP TT | Dễ | S | 3 | [WarioWare microgames](https://www.mariowiki.com/Microgame) |
| 27 | `musical-chairs` | Giành ghế | Đi vòng quanh ghế theo nhạc; nhạc dừng thì chiếm ghế trống gần nhất | Chạm ghế | Trụ 5 vòng | Không kịp ghế: xem vòng sau rồi chơi lại | TIM | SC XM | Dễ | S | 2 | [Musical chairs](https://en.wikipedia.org/wiki/Musical_chairs) |
| 28 | `drum-beat` | Gõ trống hội | Nốt chạy tới vạch; gõ mặt trống (đỏ) hay vành (xanh) | Chạm 2 vùng | Đúng 70% nốt | Hết bài | MUS | SC TT | Vừa | M | 2 | [Taiko no Tatsujin](https://en.wikipedia.org/wiki/Taiko_no_Tatsujin) |
| 29 | `piano-tiles` | Phím đàn rơi | 4 cột phím rơi theo bài hát thiếu nhi; chạm phím màu | Chạm | Hết bài, lỡ ≤ 5 phím | Lỡ 6 phím: dừng sớm | MUS | TV TT | Vừa | S | 5 | [Piano Tiles](https://en.wikipedia.org/wiki/Piano_Tiles) |
| 30 | `call-response` | Nhại nhịp vỗ tay | Bạn vỗ một câu 4 phách; bé vỗ lại đúng nhịp | Chạm theo nhịp | Đúng 7/10 câu | Hết câu | MUS | SC XM | Vừa | S | 5 | [Rhythm Heaven](https://en.wikipedia.org/wiki/Rhythm_Heaven) |
| 31 | `lion-dance-arrows` | Múa lân theo trống | Mũi tên trôi lên; vuốt đúng hướng khi tới vạch | Vuốt 4 hướng | Đúng 70% mũi tên | Hết bài | MUS | TT LS | Vừa | M | 1 | [Dance Dance Revolution](https://en.wikipedia.org/wiki/Dance_Dance_Revolution) – [Lion dance](https://en.wikipedia.org/wiki/Lion_dance) |
| 32 | `whack-mole` | Đập chuột chũi | Chuột ló khỏi lỗ; đập chuột, đừng đập thỏ | Chạm | 25 chuột trong 60 s | Đập thỏ: trừ 2 điểm | WHK | NT NB | Dễ | S | 5 | [Whac-A-Mole](https://en.wikipedia.org/wiki/Whac-A-Mole) |
| 33 | `balloon-rule-pop` | Bóng theo lệnh | Bóng nhiều màu bay lên; chỉ nổ màu đang gọi (đổi lệnh mỗi 10 s) | Chạm | 30 bóng đúng trong 60 s | Chạm sai: trừ 1 | WHK | TT CP | Dễ | S | 3 | [ABCya lớp 2](https://www.abcya.com/grades/2) (go/no-go) |
| 34 | `firefly-torch` | Bắt đom đóm đêm | Rừng tối; soi đèn pin, chạm đom đóm trong vùng sáng | Kéo đèn, chạm đom đóm | 15 đom đóm trong 60 s | Hết giờ | WHK | FO LS | Vừa | S | 4 | [WarioWare microgames](https://www.mariowiki.com/Microgame) |
| 35 | `photo-snap` | Chụp ảnh thú | Cảnh trôi ngang; chụp khi thú nằm trong khung và nhìn ra | Chạm để chụp | 6 ảnh đẹp trong 60 s | Hết phim (12 kiểu) | WHK | FO DA NT | Vừa | M | 5 | [Pokémon Snap](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Snap) |
| 36 | `memory-pairs` | Lật hình tìm cặp | 12 thẻ úp; lật 2 thẻ giống nhau thì ăn | Chạm | 6 cặp trong 90 s | Hết giờ | MEM | TV SC NB | Dễ | S | 1 | [Concentration (card game)](https://en.wikipedia.org/wiki/Concentration_(card_game)) – [Clubhouse Games 51](https://en.wikipedia.org/wiki/Clubhouse_Games:_51_Worldwide_Classics) |
| 37 | `simon-says` | Con vật hát theo thứ tự | 4 con vật sáng và kêu theo chuỗi dài dần; bé chạm lặp lại | Chạm | Chuỗi dài 6 | Sai: nghe lại chuỗi (2 lần sai thì dừng) | MEM | NT TT | Vừa | S | 3 | [Simon (game)](https://en.wikipedia.org/wiki/Simon_(game)) |
| 38 | `whats-missing` | Cái gì biến mất? | Nhìn khay 6 đồ trong 5 s; đèn tắt; chọn món đã biến mất | Chạm | 6/8 lượt đúng | Hết lượt | MEM | TV CP NB | Dễ | S | 4 | [Kim's Game](https://en.wikipedia.org/wiki/Kim's_Game) |
| 39 | `shell-game` | Úp cốc tìm bi | Ngọc nằm dưới 1 trong 3 cốc; cốc đảo chỗ; chọn cốc | Chạm | 6/8 lượt đúng | Hết lượt | MEM | CP LD | Dễ | S | 2 | [Shell game](https://en.wikipedia.org/wiki/Shell_game) |
| 40 | `pair-link` | Nối hình giống nhau | Hai hình giống nhau nối được bằng đường ≤ 2 khúc gãy thì biến mất | Chạm hai hình | Dọn 16 cặp trong 90 s | Kẹt: gợi ý sau 10 s | MEM | TV TT | Vừa | M | 3 | [Shisen-Sho](https://en.wikipedia.org/wiki/Shisen-Sho) |
| 41 | `trash-sort` | Phân loại rác | Rác rơi xuống; kéo vào thùng hữu cơ / tái chế / còn lại | Kéo | 20 món đúng trong 60 s | Bỏ sai: trừ 1 | SRT | XM TT DA | Dễ | S | 4 | [PBS KIDS games](https://pbskids.org/games) |
| 42 | `conveyor-sort` | Băng chuyền trái cây | Đồ chạy trên băng chuyền; đưa vào thùng bên trái/phải theo hình trên thùng | Vuốt trái/phải | 30 món đúng trong 60 s | Rơi khỏi băng: không trừ | SRT | CP NT | Vừa | S | 5 | [WarioWare microgames](https://www.mariowiki.com/Microgame) |
| 43 | `ball-sort-tubes` | Xếp bi vào ống | Nhấc bi trên cùng sang ống khác; mỗi ống cuối cùng một màu | Chạm ống nguồn rồi ống đích | Xong 2 bàn (3–4 màu) trong 90 s | Kẹt: nút lùi, gợi ý | SRT | TV LD | Vừa | M | 4 | Ball Sort Puzzle (hyper-casual) – [CrazyLabs: hyper-casual mechanics](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) |
| 44 | `sliding-tiles` | Trượt ghép tranh | Tranh 3×3 xáo; trượt ô cạnh ô trống cho đúng | Chạm ô | 1 tranh trong 90 s | Hết giờ: hiện số ô đúng | PUZ | TV LD | Vừa | S | 3 | [15 puzzle](https://en.wikipedia.org/wiki/15_puzzle) |
| 45 | `jigsaw` | Ghép tranh | Kéo 6–12 mảnh vào khung; mảnh hít khi gần đúng chỗ | Kéo | 1 tranh trong 90 s | Hết giờ | PUZ | TV SC NB | Dễ | S | 2 | [Jigsaw puzzle](https://en.wikipedia.org/wiki/Jigsaw_puzzle) |
| 46 | `tangram` | Ghép hình bảy mảnh | Lấp đầy bóng con vật bằng 7 mảnh | Kéo mảnh, chạm để xoay 45° | 2 hình trong 90 s | Hết giờ: hiện gợi ý 1 mảnh | PUZ | TV SC | Vừa | M | 1 | [Tangram](https://en.wikipedia.org/wiki/Tangram) |
| 47 | `pipe-connect` | Nối ống dẫn nước | Xoay các ô ống để nước từ giếng chảy tới ruộng | Chạm ô để xoay | 2 bàn 5×5 trong 90 s | Hết giờ | PUZ | LS NT | Vừa | M | 2 | [Pipe Mania](https://en.wikipedia.org/wiki/Pipe_Mania) |
| 48 | `crate-push` | Đẩy thùng vào kho | Đẩy thùng vào ô đánh dấu; không kéo được thùng | Vuốt để đi | 2 bàn nhỏ trong 90 s | Kẹt: nút lùi | PUZ | LD NT | Vừa | M | 4 | [Sokoban](https://en.wikipedia.org/wiki/Sokoban) |
| 49 | `match-3` | Đổi chỗ ba quả | Đổi 2 ô kề nhau; 3 quả cùng loại thẳng hàng thì nổ | Vuốt giữa 2 ô | 40 quả nổ trong 60 s | Hết giờ | PUZ | CP TT | Dễ | M | 3 | [Bejeweled](https://en.wikipedia.org/wiki/Bejeweled) |
| 50 | `fruit-merge` | Gộp quả rơi | Thả quả vào hộp; hai quả giống chạm nhau gộp thành quả to hơn | Chạm chỗ để thả | Tạo dưa hấu trong 90 s | Tràn miệng hộp: dừng, giữ điểm | PUZ | CP NB | Vừa | L | 5 | [Suika Game](https://en.wikipedia.org/wiki/Suika_Game) |
| 51 | `flow-connect` | Nối chấm cùng màu | Nối từng cặp chấm cùng màu; đường không cắt nhau, phủ kín lưới | Kéo vẽ đường | 3 bàn 5×5 trong 90 s | Hết giờ | PUZ | SC TV | Vừa | M | 5 | [Flow Free](https://en.wikipedia.org/wiki/Flow_Free) |
| 52 | `lawn-mower` | Cắt cỏ một nét | Lái máy cắt qua mọi ô cỏ, không đi lại ô đã cắt | Kéo hoặc vuốt | 3 bàn trong 90 s | Kẹt: nút làm lại bàn | PUZ | NB NT | Vừa | M | 5 | [one-stroke path puzzle](https://en.wikipedia.org/wiki/Hamiltonian_path) |
| 53 | `block-fit` | Xếp hàng lên xe tải | Đặt khối hình vào lưới thùng xe; đầy một hàng thì hàng đó được chở đi | Kéo khối | 8 hàng trong 90 s | Hết chỗ đặt: dừng, giữ điểm | PUZ | CP TT | Vừa | M | 2 | [Polyomino](https://en.wikipedia.org/wiki/Polyomino) (kiểu Block Blast) |
| 54 | `hanoi-tower` | Chuyển bánh tầng | Chuyển chồng 3 bánh sang đĩa khác; bánh to không đè bánh nhỏ | Chạm cột nguồn rồi cột đích | Xong trong ≤ 10 bước / 90 s | Hết giờ | PUZ | TV LD | Vừa | S | 1 | [Tower of Hanoi](https://en.wikipedia.org/wiki/Tower_of_Hanoi) |
| 55 | `light-mirrors` | Gương dẫn ánh nắng | Xoay gương để tia nắng tới bông hoa | Chạm gương để xoay | 3 bàn trong 90 s | Hết giờ | PUZ | LD DA | Vừa | M | 4 | Laser/mirror puzzles – [CrazyLabs: hyper-casual mechanics](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) |
| 56 | `ice-slide` | Trượt băng mê cung | Vuốt một hướng, bé trượt tới khi đụng vật; tới cửa hang | Vuốt | 3 bàn trong 90 s | Kẹt: nút làm lại | PUZ | NU | Vừa | S | 1 | [Pokémon Gold and Silver](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Gold_and_Silver) (Ice Path) |
| 57 | `co-caro` | Cờ caro bốn ô | Lần lượt đặt quân trên bàn 6×6; 4 quân thẳng hàng là thắng | Chạm ô | Thắng 1 ván với máy dễ | Thua: ván mới, máy dễ hơn | PUZ | SC TT | Vừa | M | 3 | [Gomoku](https://en.wikipedia.org/wiki/Gomoku) – [Clubhouse Games 51](https://en.wikipedia.org/wiki/Clubhouse_Games:_51_Worldwide_Classics) |
| 58 | `maze-trace` | Mê cung về nhà | Đưa bé qua mê cung tới nhà, nhặt sao dọc đường | Kéo | Tới nhà + 3 sao trong 60 s | Hết giờ | MAZ | FO LD TV | Dễ | S | 1 | [Maze (Wikipedia)](https://en.wikipedia.org/wiki/Maze) |
| 59 | `pac-maze` | Ăn hạt né ma | Ăn hết hạt trong mê cung; ma đi chậm | Vuốt đổi hướng | Ăn 60 hạt trong 90 s | Ma chạm: mất 1/3 tim | MAZ | LD TT | Vừa | M | 4 | [Pac-Man](https://en.wikipedia.org/wiki/Pac-Man) |
| 60 | `dig-tunnel` | Đào đất tìm ngọc | Đào đường hầm lấy ngọc; đá phía trên sẽ rơi khi đào phía dưới | Kéo để đào | 10 ngọc trong 90 s | Đá rơi trúng: mất 1/3 tim | MAZ | DA NU | Vừa | M | 5 | [Dig Dug](https://en.wikipedia.org/wiki/Dig_Dug) – [Boulder Dash](https://en.wikipedia.org/wiki/Boulder_Dash) |
| 61 | `star-connect` | Nối chòm sao | Chạm sao theo thứ tự 1→10 để hiện hình con vật | Chạm hoặc kéo nối | 3 hình trong 60 s | Chạm sai: sao rung, không trừ | DRW | TV NU | Dễ | S | 1 | [Connect the dots](https://en.wikipedia.org/wiki/Connect_the_dots) |
| 62 | `path-guide` | Vẽ đường cho vịt con | Vịt con xuất hiện ở mép; vẽ đường dẫn vào chuồng cùng màu, không cho đụng nhau | Kéo vẽ đường | 15 vịt vào chuồng trong 90 s | Hai vịt đụng: cùng ngồi 3 s | DRW | NB LS | Vừa | M | 5 | [Flight Control](https://en.wikipedia.org/wiki/Flight_Control) |
| 63 | `dot-copy` | Vẽ theo mẫu lưới chấm | Nối chấm trên lưới cho giống hình mẫu bên cạnh | Kéo giữa các chấm | 4 hình trong 90 s | Hết giờ | DRW | SC | Dễ | S | 3 | [ABCya lớp 2](https://www.abcya.com/grades/2) |
| 64 | `scratch-reveal` | Cào tuyết đoán hình | Cào lớp tuyết/cát để lộ hình; chọn 1 trong 3 ảnh khi đoán ra | Xoa để cào, chạm để chọn | 6 lượt đúng trong 90 s (cào ít = nhiều sao) | Đoán sai: cào tiếp | DRW | NU DA | Dễ | S | 1 | [Scratchcard](https://en.wikipedia.org/wiki/Scratchcard) |
| 65 | `scissor-trace` | Cắt giấy theo đường | Đưa kéo theo đường chấm để cắt hình | Kéo theo nét | 4 hình ≥ 80% chính xác trong 90 s | Lệch xa: kéo dừng, đặt lại ngón | DRW | SC NB | Vừa | S | 2 | [Cooking Mama](https://en.wikipedia.org/wiki/Cooking_Mama) (cắt theo nét) |
| 66 | `balance-scale` | Cân thăng bằng | Đặt quả nặng nhẹ lên hai đĩa cân cho cân bằng | Kéo | 5 lần cân trong 90 s | Hết giờ | PHY | CP NT | Vừa | S | 4 | [Balance puzzle](https://en.wikipedia.org/wiki/Balance_puzzle) |
| 67 | `pick-sticks` | Rút que | Rút que đang nằm trên cùng (không bị que nào đè) | Chạm que | 15 que trong 60 s | Rút que bị đè: tháp rung, mất 1/3 tim | PHY | XM SC | Dễ | S | 3 | [Mikado (game)](https://en.wikipedia.org/wiki/Mikado_(game)) |
| 68 | `cut-rope` | Cắt dây thả kẹo | Kẹo treo trên dây đung đưa; cắt đúng lúc để rơi vào miệng ếch | Vuốt cắt dây | 3 màn trong 90 s | Kẹo rơi ra ngoài: màn đó bày lại | PHY | FO NB | Vừa | L | 4 | [Cut the Rope](https://en.wikipedia.org/wiki/Cut_the_Rope) |
| 69 | `plinko` | Thả bi qua đinh | Chọn chỗ thả bi; bi nảy qua hàng đinh vào ô điểm | Chạm chỗ thả | 100 điểm với 8 bi | Hết bi | PHY | CP TT | Dễ | M | 1 | [Pachinko](https://en.wikipedia.org/wiki/Pachinko) – [Plinko](https://en.wikipedia.org/wiki/List_of_The_Price_Is_Right_pricing_games) |
| 70 | `water-pour` | Rót trà đúng vạch | Rót trà vào cốc tới vạch; mỗi ấm chảy nhanh chậm khác nhau | Giữ để rót, thả để dừng | 8 cốc đúng trong 60 s | Tràn 3 cốc: dừng sớm | PHY | CP XM NB | Dễ | S | 2 | [WarioWare microgames](https://www.mariowiki.com/Microgame) |
| 71 | `stack-slide` | Xếp tầng trượt | Tầng mới trượt qua lại; thả cho chồng thẳng, phần thừa bị cắt | Chạm để thả | 20 tầng trong 60 s | Trượt ra hoàn toàn: dừng, giữ chiều cao | BLD | TT LD XM | Vừa | S | 3 | Stack (Ketchapp, 2016) – [Ketchapp](https://en.wikipedia.org/wiki/Ketchapp) |
| 72 | `crane-drop` | Cần cẩu xây nhà | Tầng nhà đung đưa trên cần cẩu; thả cho chồng thẳng, lệch thì tháp nghiêng | Chạm để thả | 12 tầng trong 90 s | Rơi 3 tầng: dừng, giữ chiều cao | BLD | TT XM | Vừa | M | 3 | [Tower Bloxx](https://en.wikipedia.org/wiki/Tower_Bloxx) |
| 73 | `blueprint-build` | Xây theo bản vẽ | Đặt khối màu vào lưới cho giống bản vẽ nhỏ bên cạnh | Chạm/kéo khối | 3 công trình trong 90 s | Hết giờ: hiện ô sai | BLD | SC XM TT | Dễ | S | 2 | [Pattern blocks (Wikipedia)](https://en.wikipedia.org/wiki/Pattern_Blocks) |
| 74 | `snowman-roll` | Lăn người tuyết | Lăn quả tuyết to dần; chồng 3 quả lớn-vừa-nhỏ, gắn mũi cà rốt | Kéo để lăn, kéo thả để chồng | 2 người tuyết trong 90 s | Quả quá to/nhỏ: lăn tiếp hoặc bỏ quả | BLD | NU | Dễ | M | 2 | [Katamari Damacy](https://en.wikipedia.org/wiki/Katamari_Damacy) |
| 75 | `kart-race` | Đua xe mini | Xe chạy theo ngón tay trên đường đua; 2 vòng với 3 xe máy | Giữ và kéo | Về top 3 | Về chót: chơi lại, máy chậm hơn | RAC | TT XM | Vừa | M | 1 | [Mario Kart](https://en.wikipedia.org/wiki/Mario_Kart) – [Poki](https://poki.com/) |
| 76 | `slot-cars` | Xe đua đường ray | Xe chạy theo ray; tăng tốc trên đoạn thẳng, nhả trước khúc cua kẻo văng | Giữ để tăng tốc, thả để giảm | 3 vòng trước xe máy | Văng: đặt lại ray sau 1 s | RAC | TT XM | Vừa | S | 5 | [Clubhouse Games 51](https://en.wikipedia.org/wiki/Clubhouse_Games:_51_Worldwide_Classics) – [Slot car](https://en.wikipedia.org/wiki/Slot_car) |
| 77 | `sled-slalom` | Trượt tuyết qua cờ | Xe trượt đổ dốc; lái qua cổng cờ, tránh cây | Kéo ngang | 15 cổng trong 60 s | Đụng cây: dừng 1 s | RAC | NU | Vừa | S | 4 | [SkiFree](https://en.wikipedia.org/wiki/SkiFree) |
| 78 | `traffic-cop` | Điều khiển ngã tư | Xe đến từ 4 hướng; dừng hoặc cho đi để không đụng | Chạm xe | 30 xe qua trong 90 s | Đụng: mất 1/3 tim | RAC | TT XM | Vừa | M | 2 | Traffic Rush (2012) – [CrazyLabs: hyper-casual mechanics](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) |
| 79 | `train-switch` | Bẻ ghi tàu | Tàu màu chạy tới; bẻ ghi để tàu về ga cùng màu | Chạm ghi | 15 tàu đúng trong 90 s | Sai ga: trừ 1 | RAC | TT NU | Vừa | M | 3 | [Railroad switch](https://en.wikipedia.org/wiki/Railroad_switch) (kiểu Train of Thought) |
| 80 | `penalty-kick` | Sút phạt đền | Vuốt từ bóng tới góc khung thành; thủ môn đổ người | Vuốt (vuốt cong = bóng xoáy) | 5 bàn / 8 cú | Hết lượt | SPO | SC TT NB | Dễ | S | F | [Nintendo Switch Sports](https://en.wikipedia.org/wiki/Nintendo_Switch_Sports) (Soccer) |
| 81 | `goalkeeper` | Làm thủ môn | Bạn sút bóng tới; bay người cản | Chạm/vuốt về phía bóng | Cản 6/10 | Hết lượt | SPO | SC TT | Vừa | S | 3 | [Nintendo Switch Sports](https://en.wikipedia.org/wiki/Nintendo_Switch_Sports) (Soccer) |
| 82 | `basketball` | Ném bóng rổ | Ném vào rổ; từ mức 2 rổ trượt qua lại | Vuốt lên | 10 quả trong 60 s | Hết giờ | SPO | SC TT | Dễ | S | 2 | [Nintendo Switch Sports](https://en.wikipedia.org/wiki/Nintendo_Switch_Sports) (Basketball) |
| 83 | `bowling` | Ném bowling | Chọn chỗ đứng rồi ném; ki đổ theo va chạm | Kéo ngang rồi vuốt lên (vuốt cong = xoáy) | 60 điểm / 5 lượt | Hết lượt | SPO | TT XM | Dễ | M | 1 | [Nintendo Switch Sports](https://en.wikipedia.org/wiki/Nintendo_Switch_Sports) (Bowling) |
| 84 | `tennis-rally` | Đánh bóng bàn | Nhân vật tự chạy tới bóng; đánh khi bóng vào vòng | Chạm đúng lúc, vuốt chọn hướng | Thắng 5 điểm trước máy | Thua ván: ván mới, máy chậm hơn | SPO | SC TT | Vừa | M | 3 | [Google Doodle Champion Island](https://en.wikipedia.org/wiki/Doodle_Champion_Island_Games) (Table Tennis) – [Wii Sports Resort](https://en.wikipedia.org/wiki/Wii_Sports_Resort) |
| 85 | `archery-wind` | Bắn cung có gió | Ngắm bia; gió đẩy tên lệch (mũi tên gió hiện rõ) | Kéo dây cung, thả để bắn | 40 điểm / 5 tên | Hết tên | SPO | LD FO | Vừa | S | 1 | [Wii Sports Resort](https://en.wikipedia.org/wiki/Wii_Sports_Resort) (Archery) – [Google Doodle Champion Island](https://en.wikipedia.org/wiki/Doodle_Champion_Island_Games) |
| 86 | `swim-race` | Bơi đua | Quạt tay khi vòng nhịp trùng vòng đích; đều nhịp thì nhanh, chạm loạn thì mệt | Chạm theo nhịp | Về nhất/nhì với 3 bạn | Về chót: chơi lại | SPO | DA LS | Vừa | S | 5 | [Track & Field](https://en.wikipedia.org/wiki/Track_&_Field_(video_game)) (nhịp) |
| 87 | `ski-jump` | Nhảy cầu trượt tuyết | Cúi lấy đà xuống cầu; bật đúng mép; chạm khi tiếp đất | Giữ rồi thả, chạm khi đáp | Bay 60 m (3 lượt) | Bật sớm/muộn: bay gần | SPO | NU | Vừa | S | 4 | [Ski jumping](https://en.wikipedia.org/wiki/Ski_jumping) |
| 88 | `curling` | Bi đá trên băng | Đẩy đá trượt vào tâm; xoa băng phía trước để đá đi xa thêm | Vuốt để đẩy, xoa để chà băng | 6 điểm / 4 viên | Hết viên | SPO | NU | Vừa | M | 1 | [Clubhouse Games 51](https://en.wikipedia.org/wiki/Clubhouse_Games:_51_Worldwide_Classics) (Toy Curling) – [Curling](https://en.wikipedia.org/wiki/Curling) |
| 89 | `rock-climb` | Leo vách đá | Chạm mấu bám xanh trong tầm tay; mấu nứt rơi sau 2 s; tránh đá lăn | Chạm mấu | Lên 30 m trong 60 s | Trượt: tụt 1 mấu | SPO | NU DA | Vừa | M | 2 | [Google Doodle Champion Island](https://en.wikipedia.org/wiki/Doodle_Champion_Island_Games) (Climbing) |
| 90 | `recipe-assembly` | Làm bánh mì theo đơn | Khách giơ ảnh đơn; xếp nguyên liệu đúng thứ tự vào bánh | Kéo nguyên liệu | 8 đơn trong 90 s | Khách chờ lâu bỏ đi: mất 1/5 tim | COK | CP TT | Vừa | M | 3 | [Papa Louie](https://en.wikipedia.org/wiki/Papa_Louie) – [Cooking Mama](https://en.wikipedia.org/wiki/Cooking_Mama) |
| 91 | `banh-xeo-flip` | Đổ bánh xèo | 3–4 chảo; đổ bột, lật khi vàng, lấy ra trước khi cháy | Chạm chảo | 10 bánh ngon trong 90 s | Cháy 3 bánh: dừng sớm | COK | CP NB | Vừa | M | 2 | [Bánh xèo](https://en.wikipedia.org/wiki/B%C3%A1nh_x%C3%A8o) – [Cooking Mama](https://en.wikipedia.org/wiki/Cooking_Mama) |
| 92 | `tea-slide` | Trà đá vỉa hè | Khách tiến dọc 3 bàn dài; đẩy ly trà tới khách, thu ly rỗng | Vuốt trên bàn, chạm ly rỗng | 20 khách trong 90 s | Khách tới cuối bàn 3 lần: dừng sớm | COK | CP XM | Vừa | M | 4 | [Tapper (video game)](https://en.wikipedia.org/wiki/Tapper_(video_game)) |
| 93 | `cotton-candy` | Quấn kẹo bông | Vẽ vòng quanh que để quấn đường; đủ to là xong, quay quá nhanh kẹo rơi | Vẽ vòng tròn | 6 kẹo trong 60 s | Rơi kẹo: làm lại que đó | COK | CP TT | Dễ | S | 5 | [Cotton candy](https://en.wikipedia.org/wiki/Cotton_candy) |
| 94 | `bobber-fishing` | Câu cá phao | Quăng câu; chờ phao chìm hẳn (có rung nhẹ giả) rồi giật | Chạm để quăng, chạm để giật | 8 cá trong 90 s | Giật sớm: cá chạy | FSH | LS NB DA | Dễ | S | 5 | [Clubhouse Games 51](https://en.wikipedia.org/wiki/Clubhouse_Games:_51_Worldwide_Classics) (Fishing) |
| 95 | `reel-tension` | Kéo cá lớn | Giữ vạch xanh bao lấy con cá nhảy lên xuống; đầy thanh thì bắt được | Giữ để nâng vạch, thả để hạ | 4 cá lớn trong 90 s | Thanh cạn: cá thoát | FSH | LS DA NU | Vừa | S | 2 | [Stardew Valley Wiki: Fishing](https://stardewvalleywiki.com/Fishing) |
| 96 | `goldfish-scoop` | Vớt cá vàng | Đưa vợt giấy dưới cá rồi nhấc; để dưới nước lâu giấy rách | Kéo vợt, nhấc bằng thả ngón | 6 cá với 2 vợt | Rách cả 2 vợt | FSH | CP NB | Vừa | S | 3 | [Goldfish scooping](https://en.wikipedia.org/wiki/Goldfish_scooping) |
| 97 | `claw-machine` | Gắp thú | Đưa cần gắp ngang rồi sâu; gắp thú thả vào lỗ | Giữ nút để chạy, thả để dừng | 3 thú / 6 lượt | Hết lượt | FSH | CP TT | Dễ | S | 4 | [Claw machine](https://en.wikipedia.org/wiki/Claw_machine) |
| 98 | `garden-cycle` | Vườn rau của bé | Gieo hạt, tưới khi lá héo, hái khi chín; đuổi chim | Chạm, kéo bình nước, vuốt để hái | 15 rau trong 90 s | Rau héo không chết, chỉ chậm lớn | FRM | NB NT | Vừa | M | 4 | [Harvest Moon (video game)](https://en.wikipedia.org/wiki/Harvest_Moon_(video_game)) – [Toca Boca](https://en.wikipedia.org/wiki/Toca_Boca) |
| 99 | `weed-pull` | Nhổ cỏ dại | Giữ cây cỏ rồi kéo lên; cỏ dai phải lắc qua lại | Giữ và kéo lên | 15 cây trong 60 s | Nhổ nhầm rau: trừ 1 | FRM | NB NT | Dễ | S | 5 | [Super Mario Bros. 2](https://en.wikipedia.org/wiki/Super_Mario_Bros._2) (nhổ củ) |
| 100 | `chicken-feed` | Cho gà ăn đều | Tung thóc; gà to tranh ăn, gà con phải được no | Chạm chỗ để tung | 6 gà no trong 60 s | Hết giờ | FRM | NB NT | Vừa | S | 3 | [WarioWare microgames](https://www.mariowiki.com/Microgame) |
| 101 | `sheepdog-herd` | Lùa vịt về chuồng | Đàn vịt chạy tránh chú chó; dồn chúng vào chuồng | Kéo chú chó | 12 vịt vào chuồng trong 90 s | Hết giờ | FRM | NT LS NB | Vừa | M | 5 | [Flock!](https://en.wikipedia.org/wiki/Flock!) |
| 102 | `milk-cow` | Vắt sữa bò | Vuốt xuống luân phiên hai bên theo nhịp; vuốt quá nhanh bò khó chịu | Vuốt xuống luân phiên | 3 xô trong 60 s | Bò khó chịu: nghỉ 2 s | FRM | NB NT | Dễ | S | 4 | [Harvest Moon (video game)](https://en.wikipedia.org/wiki/Harvest_Moon_(video_game)) |
| 103 | `farmer-defense` | Giữ ruộng lúa | Chim đi theo 3 luống tới bó lúa; đặt bác nông dân chặn đường | Kéo đặt người (tối đa 4), chạm chim | Giữ ≥ 7/10 bó lúa sau 90 s | Mất bó lúa: không thua giữa chừng | FRM | NT LS | Vừa | L | 3 | [Plants vs. Zombies](https://en.wikipedia.org/wiki/Plants_vs._Zombies) |
| 104 | `wipe-clean` | Lau sạch bóng | Lau bát đĩa, kính, tắm cún theo thứ tự xà phòng → nước → khăn | Xoa | 6 đồ sạch ≥ 95% trong 90 s | Hết giờ | CLN | NB XM SC | Dễ | S | 5 | [Toca Boca](https://en.wikipedia.org/wiki/Toca_Boca) – [WarioWare microgames](https://www.mariowiki.com/Microgame) |
| 105 | `leaf-blow` | Thổi lá vào đống | Gió từ quạt đẩy lá theo vùng; dồn lá vào khung | Giữ và kéo quạt | 80% lá vào khung trong 60 s | Hết giờ | CLN | FO XM NB | Vừa | M | 1 | [CrazyLabs: hyper-casual mechanics](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/) |
| 106 | `spot-diff` | Tìm điểm khác nhau | Hai tranh gần giống nhau; chạm 5 chỗ khác | Chạm | 5 chỗ trong 90 s | Chạm sai 5 lần: gợi ý 1 chỗ | SEE | TV FO CP LD | Dễ | S | 2 | [Spot the difference](https://en.wikipedia.org/wiki/Spot_the_difference) |
| 107 | `hidden-objects` | Tìm đồ ẩn | Cảnh đông đồ; tìm 6 món theo khay hình (không chữ) | Chạm | 6 món trong 90 s | Hết giờ: chỉ món còn thiếu | SEE | TV CP LD | Dễ | M | 2 | [Where's Wally?](https://en.wikipedia.org/wiki/Where's_Wally%3F) |
| 108 | `hide-and-seek` | Trốn tìm | Các bạn trốn sau bụi, thùng; thỉnh thoảng ló ra 0,5 s rồi đổi chỗ | Chạm chỗ vừa thấy | 6 bạn trong 60 s | Hết giờ | SEE | FO XM SC | Dễ | S | 3 | [Hide-and-seek](https://en.wikipedia.org/wiki/Hide-and-seek) – [Wiki VN: trò chơi truyền thống](https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_tr%C3%B2_ch%C6%A1i_truy%E1%BB%81n_th%E1%BB%91ng_c%E1%BB%A7a_Vi%E1%BB%87t_Nam) |
| 109 | `treasure-dig` | Đào kho báu nóng lạnh | Đào ô cát; ô đổi màu đỏ (gần) đến xanh (xa) kho báu | Chạm ô | 3 kho báu, mỗi cái ≤ 8 lần đào | Hết lần đào: kho báu lộ ra | SEE | DA | Vừa | S | 1 | [Hot and cold](https://en.wikipedia.org/wiki/Hunt_the_thimble) – [Minesweeper (video game)](https://en.wikipedia.org/wiki/Minesweeper_(video_game)) |
| 110 | `nem-con` | Ném còn | Ném quả còn bay cong qua vòng trên ngọn cột tre | Kéo ngược chọn hướng và lực, thả | 5 lần qua vòng / 10 lượt | Hết lượt | FOL | LS TT CP | Vừa | M | 3 | [Wiki VN: trò chơi truyền thống](https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_tr%C3%B2_ch%C6%A1i_truy%E1%BB%81n_th%E1%BB%91ng_c%E1%BB%A7a_Vi%E1%BB%87t_Nam) – [VinWonders: trò chơi dân gian](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian/) |
| 111 | `o-an-quan` | Ô ăn quan | Chọn ô và chiều rải sỏi; ăn ô sau ô trống (ván rút gọn) | Chạm ô, vuốt chọn chiều | Nhiều quân hơn máy sau 90 s | Thua: ván mới, máy dễ hơn | FOL | LS SC XM | Khó | L | 2 | [Ô ăn quan](https://en.wikipedia.org/wiki/%C3%94_%C4%83n_quan) – [Mancala](https://en.wikipedia.org/wiki/Mancala) |
| 112 | `snake-dragon` | Rồng rắn lên mây | Đầu rồng đón các bạn nối vào đuôi; chạm thân thì ngắn lại | Vuốt đổi hướng | Đoàn dài 15 trong 90 s | Không chết, chỉ ngắn đi | FOL | SC XM | Vừa | S | 1 | [Snake (video game genre)](https://en.wikipedia.org/wiki/Snake_(video_game_genre)) – [Wiki VN: trò chơi truyền thống](https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_tr%C3%B2_ch%C6%A1i_truy%E1%BB%81n_th%E1%BB%91ng_c%E1%BB%A7a_Vi%E1%BB%87t_Nam) |
| 113 | `boat-race` | Đua thuyền | Chạm luân phiên hai mái chèo; đều nhịp thì thuyền đi thẳng và nhanh | Chạm luân phiên trái/phải | Về nhất/nhì với 3 thuyền | Về chót: chơi lại | FOL | LS DA | Dễ | S | 4 | [Dragon boat](https://en.wikipedia.org/wiki/Dragon_boat) – [Wii Sports Resort](https://en.wikipedia.org/wiki/Wii_Sports_Resort) (Canoeing) |
| 114 | `marbles` | Bắn bi | Búng bi cái bắn bi khác ra khỏi vòng | Kéo ngược để búng | Đẩy 5 bi ra / 8 lượt | Hết lượt | FOL | XM SC | Vừa | M | 2 | [Marble (toy)](https://en.wikipedia.org/wiki/Marble_(toy)) – [Wiki VN: trò chơi truyền thống](https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_tr%C3%B2_ch%C6%A1i_truy%E1%BB%81n_th%E1%BB%91ng_c%E1%BB%A7a_Vi%E1%BB%87t_Nam) |
| 115 | `da-cau` | Tâng cầu | Cầu rơi xuống; tâng lên, không cho chạm đất; 30 s sau thêm quả thứ hai | Chạm cầu | 30 lần tâng trong 60 s | Cầu rơi: chuỗi về 0, tổng giữ nguyên | FOL | SC XM TT | Dễ | S | 5 | [Jianzi](https://en.wikipedia.org/wiki/Jianzi) – [Wiki VN: trò chơi truyền thống](https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_tr%C3%B2_ch%C6%A1i_truy%E1%BB%81n_th%E1%BB%91ng_c%E1%BB%A7a_Vi%E1%BB%87t_Nam) |
| 116 | `tug-of-war` | Kéo co | Chạm thật nhanh; chạm đúng nhịp hô "dô ta" được kéo mạnh hơn | Chạm dồn | Thắng 2/3 hiệp | Thua hiệp: hiệp sau | FOL | SC LS TT | Dễ | S | 2 | [Tug of war](https://en.wikipedia.org/wiki/Tug_of_war) – [VinWonders: trò chơi dân gian](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian/) |
| 117 | `jump-rope` | Nhảy dây | Dây quay nhanh dần; nhảy khi dây tới chân | Chạm | 25 lần trong 60 s | Vướng dây: chuỗi về 0 | FOL | SC XM | Dễ | S | 2 | [Skipping rope](https://en.wikipedia.org/wiki/Skipping_rope) – [VinWonders: trò chơi dân gian](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian/) |
| 118 | `dap-nieu` | Đập niêu | Nhìn niêu đung đưa 3 s; màn tối (bịt mắt); đi tới chỗ nhớ và đập | Kéo để đi, chạm để đập | Vỡ 4/6 niêu | Hụt: niêu hiện lại 1 s | FOL | LS TT | Vừa | S | 4 | [Wiki VN: trò chơi truyền thống](https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_tr%C3%B2_ch%C6%A1i_truy%E1%BB%81n_th%E1%BB%91ng_c%E1%BB%A7a_Vi%E1%BB%87t_Nam) – [Huggies: trò chơi dân gian](https://www.huggies.com.vn/lam-cha-me/cha-me-va-con-cai/tro-choi-dan-gian) |
| 119 | `kite-fly` | Thả diều | Theo hướng gió để diều lên cao; thu nhả dây, né cành cây | Kéo trái/phải, giữ để thu dây | Diều cao 100 m trong 60 s | Vướng cành: tụt 20 m | FOL | LS NT NU | Vừa | M | 1 | [Kite](https://en.wikipedia.org/wiki/Kite) – [VinWonders: trò chơi dân gian](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian/) |
| 120 | `cuop-co` | Cướp cờ | Khi số của bé được gọi (hiện hình), chạy ra lấy cờ rồi chạy về, né bạn đội kia | Chạm để chạy ra, kéo để né | Mang 5 cờ về trong 90 s | Bị chạm: cờ về giữa sân | FOL | SC TT | Vừa | M | 2 | [Capture the flag](https://en.wikipedia.org/wiki/Capture_the_flag) – [VinWonders: trò chơi dân gian](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian/) |
| 121 | `chuyen` | Chơi chuyền | Tung quả; khi quả trên không, nhặt que (1, rồi 2, rồi 3) rồi bắt quả | Chạm quả, chạm que | Qua bàn 5 trong 90 s | Rơi quả: làm lại bàn đó | FOL | XM SC | Vừa | S | 5 | [Knucklebones](https://en.wikipedia.org/wiki/Knucklebones) – [Wiki VN: trò chơi truyền thống](https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_tr%C3%B2_ch%C6%A1i_truy%E1%BB%81n_th%E1%BB%91ng_c%E1%BB%A7a_Vi%E1%BB%87t_Nam) |
| 122 | `hopscotch` | Nhảy lò cò | Ném sỏi vào ô (kim lực), rồi nhảy theo thứ tự, bỏ ô có sỏi | Chạm để ném, chạm ô để nhảy | Xong ô 1→8 trong 90 s | Ném trượt/nhảy sai ô: lượt sau | FOL | SC XM | Vừa | S | 3 | [Hopscotch](https://en.wikipedia.org/wiki/Hopscotch) – [Wiki VN: trò chơi truyền thống](https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_tr%C3%B2_ch%C6%A1i_truy%E1%BB%81n_th%E1%BB%91ng_c%E1%BB%A7a_Vi%E1%BB%87t_Nam) |
| 123 | `monkey-bridge` | Đi cầu khỉ | Bé tự bước; người nghiêng dần, giữ thăng bằng để không rơi | Kéo ngược chiều nghiêng | Qua 3 cầu trong 60 s | Rơi xuống suối: lội lên đầu cầu | FOL | LS FO | Vừa | S | 1 | Cầu khỉ miền Tây – [VinWonders: trò chơi dân gian](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian/) |
| 124 | `duck-catch` | Bắt vịt dưới ao | Vịt chạy lẩn trong ao rào; dồn vào góc rồi chộp | Kéo để đi, chạm để chộp | 5 vịt trong 60 s | Hết giờ | FOL | LS NB | Vừa | M | 1 | Bắt vịt hội làng – [Wiki VN: trò chơi truyền thống](https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_tr%C3%B2_ch%C6%A1i_truy%E1%BB%81n_th%E1%BB%91ng_c%E1%BB%A7a_Vi%E1%BB%87t_Nam) |
| 125 | `blind-goat` | Bịt mắt bắt dê | Màn tối; dê kêu bên trái/phải (kèm sóng tròn mờ); đi tới chạm dê | Kéo để đi | 4 dê trong 60 s | Hết giờ | FOL | XM NT SC | Vừa | M | 3 | [Blind man's buff](https://en.wikipedia.org/wiki/Blind_man's_buff) – [VinWonders: trò chơi dân gian](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian/) |
| 126 | `fireworks` | Bắn pháo hoa Tết | Pháo bay lên khi giữ; thả để nổ đúng vòng độ cao mẫu | Giữ rồi thả | 10 pháo đúng trong 60 s | Hết pháo | FES | TT LS | Dễ | S | 2 | [Tết](https://en.wikipedia.org/wiki/T%E1%BA%BFt) |
| 127 | `lantern-parade` | Rước đèn Trung thu | Đi trong đoàn rước; đi quá nhanh nến chao tắt, quá chậm bị tụt lại | Giữ để đi (lực giữ = tốc độ đi), giữ kim trong vùng xanh | Tới đích đèn còn sáng, nhặt 10 bánh | Đèn tắt: thắp lại, chậm 2 s | FES | TT XM LS | Dễ | S | 3 | [Mid-Autumn Festival](https://en.wikipedia.org/wiki/Mid-Autumn_Festival) |
| 128 | `banh-chung-wrap` | Gói bánh chưng | Lót lá, cho gạo-đậu-thịt, gập 4 mép lá đúng thứ tự, buộc lạt chéo | Kéo; vuốt để gập; kẻ 2 nét chéo để buộc | 3 bánh vuông trong 90 s | Gập sai thứ tự: lá bung, gập lại | FES | NB CP | Dễ | M | 4 | [Bánh chưng](https://en.wikipedia.org/wiki/B%C3%A1nh_ch%C6%B0ng) |

**Dự phòng (23 ý tưởng, chưa chia lô)**: `helix-drop` (Helix Jump), `paper-plane` (máy bay giấy), `cloud-blaster` (Space Invaders), `hole-in-wall` (Hole in the Wall), `lights-out` (Lights Out), `rush-hour` (Rush Hour – xe nhìn từ trên khó vẽ bằng emoji), `boat-load` (chất hàng lên thuyền, cần vật lý xoay), `pinball` (pinball), `air-hockey` (khúc côn cầu bàn hơi), `skate-tricks` (trượt ván làm trò), `spinning-top` (đánh quay), `stilts-walk` (đi cà kheo – trùng chạm luân phiên của đua thuyền), `greasy-pole` (leo cột mỡ – trùng chạm dồn của kéo co), `shadow-match` (ghép bóng – hợp tuổi mẫu giáo hơn), `size-order` (xếp nhỏ đến lớn – như trên), `mini-golf` (golf mini – trùng búng của bắn bi), `cat-mouse` (mèo đuổi chuột – trùng rượt đuổi của ăn hạt né ma), `draw-line-physics` (vẽ đường vật lý – khó với 7 tuổi), `foosball` (bi lắc), `color-fill` (tô màu theo mẫu – ít tính game), `parachute-land` (nhảy dù – trùng giữ/thả của ba lô phản lực), `odd-one-out` (tìm con khác), `balloon-guard` (hộ tống bóng bay (Rise Up)). Dùng để thay khi một game trong lô bị người duyệt loại.

## 2. Quy tắc chạm cho bé 7 tuổi

1. **Vùng chạm ít nhất 2 × 2 cm**, gấp 4 lần mức 1 × 1 cm cho người lớn ([NN/g](https://www.nngroup.com/articles/children-ux-physical-development/)). Trên iPad (khoảng 132 pt/inch) thì cỡ đó vào khoảng 100 CSS px, trên điện thoại khoảng 110–120 px. Mức 44 pt của Apple và 48 dp của Android chỉ là mức tối thiểu cho người lớn ([LogRocket tổng hợp](https://blog.logrocket.com/ux-design/all-accessible-touch-target-sizes/)), không đủ cho bé. Giữa các nút để khoảng trống ít nhất 0,5 cm.
2. **Vùng chạm rộng hơn hình, vùng bị trúng hẹp hơn hình**. Ở lần chạm đầu, trẻ trượt mục tiêu 23,1% số lần, người lớn 16,9%. Trẻ còn hay chạm lại vào đúng chỗ của mục tiêu trước (gọi là "holdover"). Mục tiêu bị thụt khỏi mép màn hình làm trẻ trượt gần gấp đôi (30,2% so với 17,8%) ([Anthony và cộng sự, ITS 2012](https://lisa-anthony.com/wp-content/uploads/2012/09/anthony-et-al-tabletop20121.pdf)). Vì vậy:
   - vùng chạm của vật cần chạm hoặc nhặt lấy cỡ 1,5 lần hình;
   - vùng va chạm của nhân vật bé chỉ lấy cỡ 0,7 lần hình;
   - vật nằm sát mép thì kéo vùng chạm ra tận mép màn hình;
   - trong lúc ngón đầu còn giữ, bỏ qua ngón chạm thứ hai.
3. **Mỗi game một cử chỉ chính, nhiều nhất hai**. Chỉ dùng chạm, giữ, kéo, vuốt. Trẻ dưới 9 tuổi làm tốt nhất với vuốt, chạm, kéo; nên tránh các thao tác cần hai tay hoặc phản xạ nhanh, tinh ([NN/g](https://www.nngroup.com/articles/children-ux-physical-development/)). Không dùng chụm ngón, đa chạm, chạm đúp, nghiêng máy. Nếu game có kéo thì nên cho chạm thay được (NN/g khuyên nhận cả hai kiểu).
4. **Không bắt bé phải đọc mới chơi được**. Trước mỗi game, chiếu 3 s một bàn tay minh họa đúng động tác cùng hình mục tiêu (ví dụ 🥚 × 20 ⏱ 60). Lời dặn bằng giọng nói kèm minh họa trên màn hình giúp trẻ chưa đọc thạo hiểu cách chơi ([SRI cho PBS KIDS, 2012](https://www.sri.com/wp-content/uploads/2021/12/gaming_body_feb_13_0.pdf)).
5. **Tha thứ khi bé thao tác hơi lệch**:
   - nhận cú nhảy hoặc chạm sớm, trễ khoảng 80–100 ms. Celeste dùng 5 khung hình "coyote time" và bộ đệm thao tác ([Maddy Thorson](https://maddythorson.medium.com/celeste-forgiveness-31e4a40399f1), [Game Juice](https://www.gamejuice.co.uk/articles/coyote-time-input-buffering));
   - hỗ trợ ngắm (`ring-toss-duck`, `basketball`, `archery-wind`);
   - bớt chướng ngại khi bé gặp khó.

   BBC đưa cả ba điều này, cùng chế độ "một lần chạm, không thua", vào hướng dẫn trò chơi của mình ([AbilityNet về BBC GEL](https://abilitynet.org.uk/news-blogs/updated-bbc-mobile-accessibility-guidelines-promote-more-inclusive-gaming-experience)).
6. **Không để bé thua liên tục**. Nếu bé trượt 1★ hai lần liền thì hạ một bậc khó: tốc độ giảm 15%, thời gian thêm 15 s, mục tiêu giảm 20%. Bé thắng thì trả dần về bậc gốc. Hướng dẫn trợ năng game khuyên cho chỉnh tốc độ và độ khó trên dải rộng, và cho nới hoặc bỏ giới hạn thời gian ([Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/), [Xbox XAG](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines), [IGDA GA-SIG](https://igda-gasig.org/get-involved/sig-initiatives/resources-for-game-developers/sig-guidelines/)). Số sao đã đạt không bao giờ bị trừ.
7. **Một lượt chơi dài 30–90 s**, đếm ngược 3‑2‑1 trước khi bắt đầu. Game tự tạm dừng khi tab bị ẩn. Mỗi game chỉ có một đồng hồ.
8. **Phản hồi ngay và luôn tích cực**. Mỗi lần trúng có âm thanh kèm hạt bay, lỗi chỉ có tiếng nhẹ, không có chữ chê. Trẻ phản ứng tốt với phản hồi tức thì và khen thưởng nhỏ ([SRI cho PBS KIDS](https://www.sri.com/wp-content/uploads/2021/12/gaming_body_feb_13_0.pdf), [NN/g cognition](https://www.nngroup.com/articles/kids-cognition/)).
9. **Nút điều khiển đặt ở nửa dưới màn hình**. Mục tiêu đặt ở nửa trên hoặc giữa, để tay bé không che vật đang rơi tới (suy ra từ quy tắc 2 và 3, chưa có nguồn đo riêng).

## 3. Chia lô và gán map

### Năm lô

Cách chia: xếp 125 game (đã trừ 3 game mẫu) theo cỡ L → M → S, trong mỗi cỡ thì theo họ, rồi chia lần lượt cho 5 lô theo kiểu rắn (1‑2‑3‑4‑5‑5‑4‑3‑2‑1). Nhờ vậy độ phức tạp của các lô bằng nhau, lô nào cũng có nhiều họ và đủ 12 map. Tên trong ô "Game" là `id` ở bảng §1.

| Lô | Số game | S / M / L | Số họ | Map được thêm game | Game |
|---|---|---|---|---|---|
| F (khung) | 3 | 3 / 0 / 0 | 3 | 6/12 | `jump-runner`, `egg-catch`, `penalty-kick` |
| G1 | 25 | 14 / 10 / 1 | 14 | 12/12 | `stack-catch`, `slingshot-tower`, `ring-toss-duck`, `water-pistol`, `red-light`, `quick-draw`, `lion-dance-arrows`, `memory-pairs`, `tangram`, `hanoi-tower`, `ice-slide`, `maze-trace`, `star-connect`, `scratch-reveal`, `plinko`, `kart-race`, `bowling`, `archery-wind`, `curling`, `leaf-blow`, `treasure-dig`, `snake-dragon`, `kite-fly`, `monkey-bridge`, `duck-catch` |
| G2 | 25 | 14 / 10 / 1 | 15 | 12/12 | `package-drop`, `stick-bridge`, `musical-chairs`, `drum-beat`, `shell-game`, `jigsaw`, `pipe-connect`, `block-fit`, `scissor-trace`, `water-pour`, `blueprint-build`, `snowman-roll`, `traffic-cop`, `basketball`, `rock-climb`, `banh-xeo-flip`, `reel-tension`, `spot-diff`, `hidden-objects`, `o-an-quan`, `marbles`, `tug-of-war`, `jump-rope`, `cuop-co`, `fireworks` |
| G3 | 25 | 14 / 10 / 1 | 17 | 12/12 | `wave-surf`, `fruit-slice`, `inflate-balloon`, `balloon-rule-pop`, `simon-says`, `pair-link`, `sliding-tiles`, `match-3`, `co-caro`, `dot-copy`, `pick-sticks`, `stack-slide`, `crane-drop`, `train-switch`, `goalkeeper`, `tennis-rally`, `recipe-assembly`, `goldfish-scoop`, `chicken-feed`, `farmer-defense`, `hide-and-seek`, `nem-con`, `hopscotch`, `blind-goat`, `lantern-parade` |
| G4 | 25 | 14 / 10 / 1 | 17 | 12/12 | `jetpack-hold`, `doodle-climb`, `rope-swing`, `trampoline-rescue`, `dodge-fall`, `dart-wobble`, `snowball-fight`, `firefly-torch`, `whats-missing`, `trash-sort`, `ball-sort-tubes`, `crate-push`, `light-mirrors`, `pac-maze`, `balance-scale`, `cut-rope`, `sled-slalom`, `ski-jump`, `tea-slide`, `claw-machine`, `garden-cycle`, `milk-cow`, `boat-race`, `dap-nieu`, `banh-chung-wrap` |
| G5 | 25 | 14 / 10 / 1 | 16 | 12/12 | `lane-runner`, `flappy-fly`, `paper-route`, `road-cross`, `bubble-shooter`, `candle-cake-spin`, `piano-tiles`, `call-response`, `whack-mole`, `photo-snap`, `conveyor-sort`, `fruit-merge`, `flow-connect`, `lawn-mower`, `dig-tunnel`, `path-guide`, `slot-cars`, `swim-race`, `cotton-candy`, `bobber-fishing`, `weed-pull`, `sheepdog-herd`, `wipe-clean`, `da-cau`, `chuyen` |

**Khung F nên có sẵn** để năm lô không lặp code (DRY):

- vòng đời đếm ngược → chơi → kết quả, cách tính sao, hạ bậc khó (quy tắc 6);
- vẽ sprite từ emoji, hạt Kenney, âm Kenney, tổng hợp tiếng bằng Web Audio;
- va chạm hình tròn/hộp, trọng lực đơn giản, lưới ô, sinh màn theo seed;
- bộ đọc thao tác (chạm, giữ, kéo, vuốt) đã có sẵn các quy tắc tha thứ ở §2;
- API cho bot test thắng/thua.

Nếu chưa có các phần này, năm agent sẽ viết lại cùng một thứ năm lần.

**Vật lý**: có ba cách, xếp theo thứ tự nên chọn.

| Cách | Ưu | Nhược | Rủi ro |
|---|---|---|---|
| 1. Tự viết helper tròn/hộp trong khung F (**đề xuất**) | Đủ cho `fruit-merge`, `plinko`, `marbles`, `bowling`, `cut-rope` (dây verlet); không thêm dependency | `slingshot-tower` phải làm hộp đổ theo kịch bản (không có thân cứng xoay thật) | Thấp |
| 2. [planck.js](https://www.npmjs.com/package/planck) (bản Box2D) | Có thân cứng xoay thật. MIT, bản 1.5.0 ra 04/2026, khoảng 189 nghìn lượt tải/tuần, repo hoạt động 09/2026 | Thêm dependency, phải ghi lên trang review | Thấp–vừa |
| 3. matter-js | Cộng đồng lớn nhất (khoảng 18 nghìn sao, 377 nghìn lượt tải/tuần) | Bản phát hành gần nhất là 0.20.0 từ 06/2024, hơn 2 năm chưa có bản mới | Vừa |

Đi theo cách 1. Chỉ chuyển sang cách 2 khi người duyệt thấy `slingshot-tower` trông giả.

### Gán map (map nào cũng có ít nhất 8 game, thực tế ít nhất 16)

Pha P (đặt NPC) chọn từ cột này. Mỗi game cần có ít nhất một chỗ đặt, và map ghi đầu tiên ở cột Map của §1 là gợi ý chính.

| Mã | Map (id) | Số game | Game hợp bối cảnh |
|---|---|---|---|
| FO | Khu rừng bí mật (`forest`) | 16 | `lane-runner`, `jump-runner`, `flappy-fly`, `doodle-climb`, `rope-swing`, `dodge-fall`, `stick-bridge`, `firefly-torch`, `photo-snap`, `maze-trace`, `cut-rope`, `archery-wind`, `leaf-blow`, `spot-diff`, `hide-and-seek`, `monkey-bridge` |
| SC | Trường học (`truong-hoc`) | 30 | `snowball-fight`, `red-light`, `musical-chairs`, `drum-beat`, `call-response`, `memory-pairs`, `jigsaw`, `tangram`, `flow-connect`, `co-caro`, `dot-copy`, `scissor-trace`, `pick-sticks`, `blueprint-build`, `penalty-kick`, `goalkeeper`, `basketball`, `tennis-rally`, `wipe-clean`, `hide-and-seek`, `o-an-quan`, `snake-dragon`, `marbles`, `da-cau`, `tug-of-war`, `jump-rope`, `cuop-co`, `chuyen`, `hopscotch`, `blind-goat` |
| TT | Trung tâm (`trung-tam`) | 43 | `lane-runner`, `jetpack-hold`, `doodle-climb`, `paper-route`, `trampoline-rescue`, `road-cross`, `water-pistol`, `bubble-shooter`, `inflate-balloon`, `drum-beat`, `piano-tiles`, `lion-dance-arrows`, `balloon-rule-pop`, `simon-says`, `pair-link`, `trash-sort`, `match-3`, `block-fit`, `co-caro`, `pac-maze`, `plinko`, `stack-slide`, `crane-drop`, `blueprint-build`, `kart-race`, `slot-cars`, `traffic-cop`, `train-switch`, `penalty-kick`, `goalkeeper`, `basketball`, `bowling`, `tennis-rally`, `recipe-assembly`, `cotton-candy`, `claw-machine`, `nem-con`, `da-cau`, `tug-of-war`, `dap-nieu`, `cuop-co`, `fireworks`, `lantern-parade` |
| LS | Làng ven sông (`lang-ven-song`) | 25 | `lane-runner`, `wave-surf`, `road-cross`, `ring-toss-duck`, `package-drop`, `stick-bridge`, `lion-dance-arrows`, `firefly-torch`, `pipe-connect`, `path-guide`, `swim-race`, `bobber-fishing`, `reel-tension`, `sheepdog-herd`, `farmer-defense`, `nem-con`, `o-an-quan`, `boat-race`, `tug-of-war`, `dap-nieu`, `kite-fly`, `monkey-bridge`, `duck-catch`, `fireworks`, `lantern-parade` |
| XM | Xóm Mái Ấm (`xom-mai-am`) | 29 | `paper-route`, `trampoline-rescue`, `road-cross`, `quick-draw`, `musical-chairs`, `call-response`, `trash-sort`, `pick-sticks`, `water-pour`, `stack-slide`, `crane-drop`, `blueprint-build`, `kart-race`, `slot-cars`, `traffic-cop`, `bowling`, `tea-slide`, `wipe-clean`, `leaf-blow`, `hide-and-seek`, `o-an-quan`, `snake-dragon`, `marbles`, `da-cau`, `jump-rope`, `chuyen`, `hopscotch`, `blind-goat`, `lantern-parade` |
| CP | Chợ phiên (`cho-phien`) | 28 | `stack-catch`, `slingshot-tower`, `ring-toss-duck`, `water-pistol`, `dart-wobble`, `candle-cake-spin`, `fruit-slice`, `inflate-balloon`, `balloon-rule-pop`, `whats-missing`, `shell-game`, `conveyor-sort`, `match-3`, `fruit-merge`, `block-fit`, `balance-scale`, `plinko`, `water-pour`, `recipe-assembly`, `banh-xeo-flip`, `tea-slide`, `cotton-candy`, `goldfish-scoop`, `claw-machine`, `spot-diff`, `hidden-objects`, `nem-con`, `banh-chung-wrap` |
| NT | Nông trại (`nong-trai`) | 20 | `jump-runner`, `egg-catch`, `fruit-slice`, `package-drop`, `whack-mole`, `photo-snap`, `simon-says`, `conveyor-sort`, `pipe-connect`, `crate-push`, `lawn-mower`, `balance-scale`, `garden-cycle`, `weed-pull`, `chicken-feed`, `sheepdog-herd`, `milk-cow`, `farmer-defense`, `kite-fly`, `blind-goat` |
| TV | Thư viện (`thu-vien`) | 16 | `bubble-shooter`, `red-light`, `piano-tiles`, `memory-pairs`, `whats-missing`, `pair-link`, `ball-sort-tubes`, `sliding-tiles`, `jigsaw`, `tangram`, `flow-connect`, `hanoi-tower`, `maze-trace`, `star-connect`, `spot-diff`, `hidden-objects` |
| LD | Lâu đài (`lau-dai`) | 16 | `flappy-fly`, `slingshot-tower`, `dart-wobble`, `quick-draw`, `shell-game`, `ball-sort-tubes`, `sliding-tiles`, `crate-push`, `hanoi-tower`, `light-mirrors`, `maze-trace`, `pac-maze`, `stack-slide`, `archery-wind`, `spot-diff`, `hidden-objects` |
| NU | Núi tuyết (`nui-tuyet`) | 16 | `jetpack-hold`, `doodle-climb`, `dodge-fall`, `snowball-fight`, `ice-slide`, `dig-tunnel`, `star-connect`, `scratch-reveal`, `snowman-roll`, `sled-slalom`, `train-switch`, `ski-jump`, `curling`, `rock-climb`, `reel-tension`, `kite-fly` |
| DA | Đảo bí ẩn (`dao-bi-an`) | 19 | `jump-runner`, `flappy-fly`, `rope-swing`, `wave-surf`, `dodge-fall`, `bubble-shooter`, `fruit-slice`, `package-drop`, `photo-snap`, `trash-sort`, `light-mirrors`, `dig-tunnel`, `scratch-reveal`, `swim-race`, `rock-climb`, `bobber-fishing`, `reel-tension`, `treasure-dig`, `boat-race` |
| NB | Nhà của bé (`nha-cua-be`) | 26 | `egg-catch`, `stack-catch`, `candle-cake-spin`, `whack-mole`, `memory-pairs`, `whats-missing`, `jigsaw`, `fruit-merge`, `lawn-mower`, `path-guide`, `scissor-trace`, `cut-rope`, `water-pour`, `penalty-kick`, `banh-xeo-flip`, `bobber-fishing`, `goldfish-scoop`, `garden-cycle`, `weed-pull`, `chicken-feed`, `sheepdog-herd`, `milk-cow`, `wipe-clean`, `leaf-blow`, `duck-catch`, `banh-chung-wrap` |

## 4. Hình ảnh và âm thanh

**Không game nào bị loại vì thiếu hình.** Kiểm bằng script: 188 tên emoji trong bảng dưới đều có thư mục 3D trong cây `microsoft/fluentui-emoji@1ffb34c752ec`. Cây này có 1.595 emoji, trong đó 1.285 có ảnh PNG 3D cỡ 256 × 256, giấy phép MIT ([repo](https://github.com/microsoft/fluentui-emoji)).

Các chỗ phải xử lý riêng:

- **Vật không có emoji thì vẽ bằng hình khối**: quả còn, niêu đất, cột tre, cầu khỉ, bàn ô ăn quan, ống nước, que chuyền, kẹo bông (dùng emoji Cloud tô hồng), máy cắt cỏ (dùng emoji Tractor).
- **Đã thay vì thiếu emoji**:
  - rương kho báu → Wrapped gift, Gem stone, Coin;
  - khinh khí cầu → bỏ (Fluent không có Hot air balloon), game `parachute-land` đã chuyển sang dự phòng;
  - xe nhìn từ trên của Rush Hour → chuyển dự phòng;
  - ngã tư của `traffic-cop` vẽ xe bằng hình khối có gắn emoji;
  - con lân dùng Dragon face. Hình này gần lân Việt hơn Lion, nhưng vẫn chưa thật giống, nên người duyệt cần xem.
- **Đồ theo map** (thẻ của `memory-pairs` và `pair-link`, cảnh của `spot-diff` và `hidden-objects`, tranh của `jigsaw` và `sliding-tiles`) lấy từ emoji đã có của map đó, hoặc ảnh cảnh map đã có trong manifest.
- **Tô màu** (bóng bay, bi, chuồng màu) làm bằng tint trên canvas, không cần thêm file.
- **Dung lượng**: còn thiếu 106 emoji, mỗi file trung bình khoảng 30 KB như các PNG đang có trong repo, tức thêm khoảng 3,2 MB, chưa kể emoji theo map. Nên tải ảnh theo từng game khi mở game, không gói vào bundle chính. Thêm emoji phải qua `tools/assets/sources.json` rồi chạy `pnpm assets:manifest`, đúng quy trình asset.
- **Hạt Kenney**: repo mới có 27 trên 80 ảnh của Particle Pack (light, magic, spark, star, twirl). Khói, bụi, nước, lửa phải thêm file từ cùng pack. Pack này dùng CC0 ([Kenney](https://kenney.nl/assets/particle-pack)).
- **Âm thanh**: repo có 101 tiếng giao diện (click, confirmation, error, drop, glass, pluck, tick…), không có nốt nhạc và tiếng con vật. Sáu game sau sẽ tổng hợp tiếng bằng Web Audio (oscillator), không cần asset:
  - `piano-tiles`, `drum-beat`, `call-response`, `lion-dance-arrows`: cao độ và tiếng trống tổng hợp;
  - `simon-says`: 4 cao độ thay cho tiếng 4 con vật;
  - `blind-goat`: tiếng pluck đặt trái/phải bằng `StereoPannerNode`, kèm sóng tròn trên màn hình để bé chơi được cả khi tắt tiếng.

  Nhạc nền dùng pack `komiku-poupi` đã có.

| id | Fluent Emoji (tên thư mục trong `microsoft/fluentui-emoji`, bản 3D) | Vẽ bằng hình khối / hạt Kenney | Đủ hình? |
|---|---|---|---|
| `lane-runner` | Person running, Shopping cart, Wood, Star, Coin | làn đường, bóng đổ | Có |
| `jump-runner` | Person running, Rock, Hole, Red apple, Evergreen tree | mặt đất cuộn, mây | Có |
| `flappy-fly` | Bird, Cloud | cột tre (chữ nhật xanh, khía đốt) | Có |
| `jetpack-hold` | Child, Rocket, Coin, Cloud with lightning | vệt khói (Kenney particle) | Có |
| `doodle-climb` | Frog, Cloud, Leaf fluttering in wind, Star | tấm nhảy | Có |
| `rope-swing` | Monkey, Banana, Palm tree | dây (đường thẳng), điểm móc | Có |
| `wave-surf` | Person surfing, Water wave, Desert island, Sun | đường sóng (bezier) | Có |
| `paper-route` | Bicycle, Newspaper, Closed mailbox with raised flag, House | vỉa hè cuộn | Có |
| `egg-catch` | Chicken, Egg, Basket, Pile of poo | sào ngang | Có |
| `stack-catch` | Pancakes, Shortcake, Soft ice cream, Fork and knife with plate | — | Có |
| `trampoline-rescue` | Firefighter, Fire engine, Child | tấm bạt, tòa nhà | Có |
| `dodge-fall` | Child, Chestnut, Coconut, Snowflake, Star | bóng tròn báo chỗ rơi | Có |
| `road-cross` | Frog, Automobile, Bus, Wood, Turtle | làn đường, dòng sông | Có |
| `slingshot-tower` | Rock, Package, Teddy bear | ná (2 đường + dây), đường ngắm chấm | Có |
| `ring-toss-duck` | Duck, Ring buoy | thanh lực, kim hướng | Có |
| `water-pistol` | Water pistol, Duck, Droplet, Bullseye | tia nước (giọt Kenney) | Có |
| `bubble-shooter` | Bubbles, Star | bóng tròn tô màu | Có |
| `dart-wobble` | Bullseye | tâm ngắm | Có |
| `candle-cake-spin` | Birthday cake, Candle | — | Có |
| `fruit-slice` | Watermelon, Pineapple, Mango, Banana, Coconut, Cactus | vệt chém | Có |
| `package-drop` | Airplane, Parachute, Wrapped gift, Sailboat, House | — | Có |
| `snowball-fight` | Snowman, Snowflake, Child | ụ tuyết, quả tuyết | Có |
| `red-light` | Child, Teddy bear, Chequered flag | vạch đích | Có |
| `quick-draw` | Red paper lantern, Cat, Light bulb | — | Có |
| `stick-bridge` | Child, Water wave | cột đá, cây tre | Có |
| `inflate-balloon` | Balloon, Collision | vạch cỡ | Có |
| `musical-chairs` | Chair, Musical note, Child | — | Có |
| `drum-beat` | Drum, Long drum | nốt tròn, vạch | Có |
| `piano-tiles` | Musical keyboard, Musical note | ô phím | Có |
| `call-response` | Clapping hands, Parrot, Drum | vòng phách | Có |
| `lion-dance-arrows` | Dragon face, Drum, Red paper lantern | mũi tên | Có |
| `whack-mole` | Mouse face, Rabbit face, Hole, Hammer | — | Có |
| `balloon-rule-pop` | Balloon, Collision | tô màu bóng | Có |
| `firefly-torch` | Flashlight, Jar, Evergreen tree | đom đóm = particle light_01, vùng tối | Có |
| `photo-snap` | Camera, Deer, Fox, Owl, Turtle, Crab | khung ngắm | Có |
| `memory-pairs` | (emoji theo map) | mặt thẻ | Có |
| `simon-says` | Cow face, Pig face, Chicken, Duck | 4 ô sáng | Có |
| `whats-missing` | (đồ vật theo map), Basket | khay | Có |
| `shell-game` | Teacup without handle, Gem stone | — | Có |
| `pair-link` | (emoji theo map) | đường nối | Có |
| `trash-sort` | Wastebasket, Banana, Newspaper, Bottle with popping cork, Battery | 3 thùng màu | Có |
| `conveyor-sort` | Basket, Red apple, Carrot, Fish, Tomato | băng chuyền | Có |
| `ball-sort-tubes` | Gem stone | ống, bi tô màu | Có |
| `sliding-tiles` | (emoji ghép tranh) | lưới ô | Có |
| `jigsaw` | (ảnh map có sẵn trong manifest) | mảnh cắt | Có |
| `tangram` | — | 7 mảnh đa giác | Có |
| `pipe-connect` | Droplet, Sheaf of rice, Bucket | ô ống | Có |
| `crate-push` | Package, Child | sàn lưới | Có |
| `match-3` | Cherries, Strawberry, Grapes, Lemon, Peach, Red apple | lưới | Có |
| `fruit-merge` | Cherries, Strawberry, Grapes, Lemon, Peach, Red apple, Pear, Pineapple, Melon, Watermelon | hộp | Có |
| `flow-connect` | — | chấm, đường màu | Có |
| `lawn-mower` | Tractor, Herb | ô cỏ | Có |
| `block-fit` | Delivery truck, Package | khối polyomino | Có |
| `hanoi-tower` | — | 3 cột, 3–4 đĩa màu | Có |
| `light-mirrors` | Sun, Mirror, Sunflower, Gem stone | tia sáng | Có |
| `ice-slide` | Penguin, Ice, Rock, Hut | mặt băng lưới | Có |
| `co-caro` | Cat face, Dog face | bàn lưới | Có |
| `maze-trace` | Child, House, Star | tường mê cung sinh ngẫu nhiên | Có |
| `pac-maze` | Child, Ghost, Star | hạt, tường | Có |
| `dig-tunnel` | Child, Pick, Gem stone, Rock | ô đất | Có |
| `star-connect` | Star, Night with stars | đường nối | Có |
| `path-guide` | Duck, Baby chick | chuồng màu, đường vẽ | Có |
| `dot-copy` | — | lưới chấm kiểu vở ô li | Có |
| `scratch-reveal` | (thú theo map) | lớp phủ | Có |
| `scissor-trace` | Scissors | đường chấm, giấy | Có |
| `balance-scale` | Balance scale, Watermelon, Red apple, Pineapple, Grapes | đĩa cân | Có |
| `pick-sticks` | — | que màu | Có |
| `cut-rope` | Frog, Candy, Star | dây (verlet) | Có |
| `plinko` | Coin, Wrapped gift, Star | đinh, bi, ô | Có |
| `water-pour` | Teapot, Teacup without handle | mực nước, vạch | Có |
| `stack-slide` | Star | khối chữ nhật | Có |
| `crane-drop` | Building construction, House | cần cẩu, tầng | Có |
| `blueprint-build` | Brick, House | lưới ô vuông | Có |
| `snowman-roll` | Snowman, Carrot, Snowflake | quả tuyết (tròn trắng) | Có |
| `kart-race` | Racing car, Automobile, Chequered flag | đường đua | Có |
| `slot-cars` | Racing car, Chequered flag | đường ray | Có |
| `sled-slalom` | Sled, Evergreen tree, Triangular flag | dốc tuyết cuộn | Có |
| `traffic-cop` | Automobile, Bus, Taxi, Police officer | ngã tư nhìn từ trên (xe là hình khối + emoji) | Có |
| `train-switch` | Locomotive, Station | ray, ga màu | Có |
| `penalty-kick` | Soccer ball, Goal net, Gloves, Child | khung thành | Có |
| `goalkeeper` | Soccer ball, Gloves, Goal net | khung thành | Có |
| `basketball` | Basketball | rổ, bảng | Có |
| `bowling` | Bowling | ki, đường lăn | Có |
| `tennis-rally` | Ping pong, Tennis | bàn, lưới | Có |
| `archery-wind` | Bow and arrow, Bullseye, Leaf fluttering in wind | chỉ báo gió | Có |
| `swim-race` | Person swimming, Water wave | vòng nhịp, làn bơi | Có |
| `ski-jump` | Skier, Snow-capped mountain | cầu nhảy | Có |
| `curling` | Curling stone, Broom | vòng tâm | Có |
| `rock-climb` | Person climbing, Rock | mấu bám (tròn màu) | Có |
| `recipe-assembly` | Baguette bread, Cucumber, Hot pepper, Egg, Leafy green, Cut of meat | bóng đơn hàng | Có |
| `banh-xeo-flip` | Cooking, Fork and knife with plate | bánh nửa vầng trăng, thanh chín | Có |
| `tea-slide` | Teacup without handle, Ice, Child | bàn dài | Có |
| `cotton-candy` | Cloud, Lollipop | kẹo (mây tô hồng) | Có |
| `bobber-fishing` | Fishing pole, Fish, Tropical fish, Blowfish | phao, mặt nước | Có |
| `reel-tension` | Fishing pole, Fish, Spiral shell | thanh dọc, vạch | Có |
| `goldfish-scoop` | Tropical fish, Bowl with spoon | vợt tròn, chậu | Có |
| `claw-machine` | Teddy bear, Unicorn, Dog face | cần gắp, tủ kính | Có |
| `garden-cycle` | Seedling, Carrot, Tomato, Ear of corn, Droplet, Bird | luống đất, bình tưới | Có |
| `weed-pull` | Herb, Carrot, Seedling | đất | Có |
| `chicken-feed` | Chicken, Baby chick, Sheaf of rice | thanh no | Có |
| `sheepdog-herd` | Dog, Duck, Water buffalo | chuồng | Có |
| `milk-cow` | Cow, Bucket, Glass of milk | mực sữa | Có |
| `farmer-defense` | Farmer, Bird, Sheaf of rice | luống | Có |
| `wipe-clean` | Sponge, Soap, Dog, Fork and knife with plate, Droplet, Bubbles | lớp bẩn (mặt nạ xoá) | Có |
| `leaf-blow` | Fallen leaf, Maple leaf, Wind face | khung gom | Có |
| `spot-diff` | (cảnh ghép từ emoji theo map) | — | Có |
| `hidden-objects` | (cảnh ghép từ emoji theo map) | khay hình | Có |
| `hide-and-seek` | Child, Herb, Package, Wood | bụi | Có |
| `treasure-dig` | Wrapped gift, Gem stone, Coin, Pirate flag | ô cát, màu nóng lạnh | Có |
| `nem-con` | Ribbon | cột tre, vòng, quả còn (cầu vải + tua) | Có |
| `o-an-quan` | Rock, Gem stone | bàn 10 ô + 2 quan | Có |
| `snake-dragon` | Dragon face, Child | sân | Có |
| `boat-race` | Canoe, Person rowing boat, Water wave | sông cuộn | Có |
| `marbles` | — | bi thủy tinh (tròn bóng), vòng | Có |
| `da-cau` | Badminton, Feather | cầu (đế tròn + lông) | Có |
| `tug-of-war` | Child, Knot | dây thừng, vạch giữa | Có |
| `jump-rope` | Child | dây (đường cong) | Có |
| `dap-nieu` | Wrapped gift, Child | niêu đất (hình vẽ), dây treo | Có |
| `kite-fly` | Kite, Cloud, Leaf fluttering in wind | dây diều | Có |
| `cuop-co` | Triangular flag, Child | sân, vạch | Có |
| `chuyen` | Tangerine | que tre | Có |
| `hopscotch` | Rock, Child | ô lò cò, số 1–8 | Có |
| `monkey-bridge` | Child, Water wave | cầu tre, tay vịn, thanh nghiêng | Có |
| `duck-catch` | Duck, Child, Water wave | ao, rào | Có |
| `blind-goat` | Goat, Child | sóng tròn chỉ hướng, mặt nạ tối | Có |
| `fireworks` | Fireworks, Sparkler, Firecracker | vòng mẫu, đốm nổ (Kenney star/spark) | Có |
| `lantern-parade` | Red paper lantern, Moon cake, Full moon, Star | kim cân, đèn ông sao (hình sao) | Có |
| `banh-chung-wrap` | Leafy green, Cooked rice, Beans, Cut of meat | khuôn vuông, dây lạt | Có |

## Nguồn và độ tin cậy

- **Cao** (tài liệu chính thức, nghiên cứu): [NN/g trẻ em và vận động](https://www.nngroup.com/articles/children-ux-physical-development/), [NN/g touch target](https://www.nngroup.com/articles/touch-target-size/), [Anthony và cộng sự 2012](https://lisa-anthony.com/wp-content/uploads/2012/09/anthony-et-al-tabletop20121.pdf), [SRI/PBS KIDS](https://www.sri.com/wp-content/uploads/2021/12/gaming_body_feb_13_0.pdf), [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/), [Xbox XAG](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines), [Fluent Emoji repo](https://github.com/microsoft/fluentui-emoji), [Kenney Particle Pack](https://kenney.nl/assets/particle-pack), registry npm (planck, matter-js).
- **Trung bình** (nguồn thứ cấp nhưng đối chiếu được): Wikipedia, gồm các trang game cổ điển (cả 103 tiêu đề trong bảng đã kiểm qua Wikipedia API, trang nào cũng tồn tại) và [danh sách trò chơi truyền thống Việt Nam](https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_tr%C3%B2_ch%C6%A1i_truy%E1%BB%81n_th%E1%BB%91ng_c%E1%BB%A7a_Vi%E1%BB%87t_Nam); [Super Mario Wiki – Microgame](https://www.mariowiki.com/Microgame) và [danh sách minigame Mario Party](https://www.mariowiki.com/List_of_Mario_Party_minigames); [AbilityNet về BBC GEL](https://abilitynet.org.uk/news-blogs/updated-bbc-mobile-accessibility-guidelines-promote-more-inclusive-gaming-experience); [Maddy Thorson – Celeste](https://maddythorson.medium.com/celeste-forgiveness-31e4a40399f1).
- **Thấp hơn** (blog, trang thương mại, chỉ lấy làm cảm hứng): [VinWonders](https://vinwonders.com/vi/wonderpedia/news/tro-choi-dan-gian/), [Huggies](https://www.huggies.com.vn/lam-cha-me/cha-me-va-con-cai/tro-choi-dan-gian), [CrazyLabs](https://www.crazylabs.com/blog/guide-for-hyper-casual-game-mechanics/), [ABCya lớp 2](https://www.abcya.com/grades/2), [Poki](https://poki.com/), [Game Juice](https://www.gamejuice.co.uk/articles/coyote-time-input-buffering).

## Giới hạn của research

- Chưa chơi thử từng game và chưa thử với trẻ thật. Mức Khó và mục tiêu 1★ chỉ là ước lượng. Bot test ở các pha G và lượt duyệt của người mới chốt được số.
- Mới kiểm sự tồn tại của các trang Wikipedia. Các URL ngoài Wikipedia (Poki, ABCya, Stardew Wiki) chưa mở từng trang.
- Chỉ lấy cơ chế từ các game thương mại, không dùng tên hay asset của chúng. Tên trong cột "Tên" là tên tiếng Việt đề xuất cho trong game.
- Chưa tính đến rung (iOS Safari không hỗ trợ `navigator.vibrate`), chơi nhiều người cùng lúc, và hiệu năng canvas trên điện thoại yếu.

## Câu hỏi còn mở

1. Có chấp nhận tiếng tổng hợp bằng Web Audio cho 6 game nhạc/âm không, hay thêm một pack âm CC0? Đề xuất dùng Web Audio vì không thêm asset. Câu này gửi Jev.
2. Có thêm planck.js không? Đề xuất là chưa, chỉ thêm khi `slingshot-tower` trông giả.
3. Hình Dragon face có đạt cho con lân không, hay đổi `lion-dance-arrows` sang chủ đề trống hội? Câu này cho người duyệt.
4. Tải 106 emoji mới theo từng game khi mở game, hay gộp thành atlas (liên quan quyết định KTX2 trong `261001-1905-atlas-ktx2-decision`)?

Status: DONE_WITH_CONCERNS
Summary: Đã viết danh mục 128 dạng minigame khác cơ chế, quy tắc chạm cho bé 7 tuổi có nguồn, chia 5 lô × 25 game cân bằng (mỗi lô phủ đủ 12 map, mỗi map có ít nhất 16 game) và bảng hình ảnh đã kiểm từng tên với Fluent Emoji.
Concerns: Kenney Interface Sounds không có nốt nhạc hay tiếng con vật nên 6 game phải tổng hợp tiếng; còn thiếu 106 emoji (khoảng 3,2 MB) phải thêm qua pipeline asset; độ khó và mục tiêu 1★ chưa thử với trẻ thật.
