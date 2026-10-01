# Bản đồ câu chuyện — 71 quest SGK (D9)

> **01/10/2026 — chia lại 8 map** (plan `plans/dattqh/261001-2106-more-maps-lesson-regroup/`). Mục "Chia lại 8 map" ngay dưới là nguồn sự thật cho map, chương, hướng dẫn viên và nơi của từng bài. Hai bảng cũ ở cuối file ("Khu rừng bí mật", "Trường học") giữ lại cho tính cách và tình huống mở đầu; cột chương và nơi trong đó đã cũ. Nhân vật trong bảng cũ cũng đã đổi nhiều ở đợt "nhân vật mới cho mỗi bài": danh sách đúng là `content/world/targets.json` và các bước của từng quest.

## Chia lại 8 map

Quy tắc:

- Chương trong một map đánh số lại từ 1 theo thứ tự sách: Tiếng Việt mỗi tuần một chương (2 bài), Toán mỗi chủ đề một chương. Khu rừng giữ chương 1 là bài hướng dẫn. Mỗi chương là một khu trên map (generator khai khu, `placeQuestTargets` đặt các nơi của bài trong khu của chương đó).
- Mỗi map một hướng dẫn viên (`guide` trong `content/world/regions.json`), được có mặt ở bao nhiêu bài của map cũng được. Bài nào ở map khác đang dùng Vẹt Xanh làm người dẫn thì đổi sang hướng dẫn viên của map đó.
- Một nhân vật chỉ có mặt ở một map. Nhân vật đang có ở hai map thì giữ ở bài ghi trong bảng "Nhân vật ở nhiều map", bài kia dùng nhân vật mới (tên mới, chưa có ở bài nào; mô hình chọn trong `content/world/looks.json`).
- Lời SGK, id quest, id các bước giữ nguyên. Chỉ viết lại phần kể chuyện: `region`, `chapter`, `summary`, `sevenQuestions.where`, lời dẫn đường, hội thoại, `places`, bước `next` (nói đúng tên map của bài kế tiếp trong sách).

| Map (region) | Hướng dẫn viên | Nhạc (`MUSIC_MOODS`) | Sách (`book`) |
| --- | --- | --- | --- |
| Làng Ven Sông (`lang-ven-song`) | Cún Lúa (`cun-lua`, mới — chú cún vàng của làng, chạy dọc bờ sông) | `forest` | Tiếng Việt 2, tập một: bài 1–8 |
| Khu rừng bí mật (`khu-rung-bi-mat`) | Vẹt Xanh (`vet-xanh`) | `forest` | Tiếng Việt 2, tập một: bài 17–24 |
| Trường học (`truong-hoc`) | Sư Tử Vàng (`su-tu-vang`, hiệu trưởng) | `school` | Toán 2, tập một: bài 1–6 · Tiếng Việt 2, tập một: bài 9–14 |
| Thư viện (`thu-vien`) | Gấu Trúc Tròn (`gau-truc`, thủ thư) | `puzzle` | Tiếng Việt 2, tập một: bài 15–16, ôn giữa học kì · Toán 2, tập một: bài 29–32 |
| Xóm Mái Ấm (`xom-mai-am`) | Bà Gấu Nâu (`ba-gau-nau`, mới — bà của cả xóm) | `home` | Tiếng Việt 2, tập một: bài 25–32 |
| Chợ phiên (`cho-phien`) | Cánh Cụt Pin (`chim-canh-cut-pin`, giữ cân của chợ) | `school` | Toán 2, tập một: bài 7–18 |
| Nông trại (`nong-trai`) | Bò Sữa Mơ (`bo-sua-mo`) | `forest` | Toán 2, tập một: bài 19–24 |
| Lâu đài (`lau-dai`) | Hươu Cao (`huou-cao`, vẽ bản đồ, thích hình khối) | `quest` | Toán 2, tập một: bài 25–28, 33–36 · Tiếng Việt 2, tập một: ôn cuối học kì |

### Chương và khu của từng map

| Map | Chương | Khu (tên trên map) | Bài |
| --- | --- | --- | --- |
| Làng Ven Sông | 1 | Đầu làng (cổng làng, lớp học nhỏ, ruộng lúa) | `tv2-t01-b01`, `tv2-t01-b02` |
| | 2 | Bãi cỏ ven sông (cầu vồng, cầu tre, vườn hoa tổ ong) | `tv2-t02-b03`, `tv2-t02-b04` |
| | 3 | Bến sông (bến nước soi bóng, lớp học dưới gốc đa) | `tv2-t03-b05`, `tv2-t03-b06` |
| | 4 | Đầm sen và sân bóng làng | `tv2-t04-b07`, `tv2-t04-b08` |
| Khu rừng bí mật | 1 | Góc rừng của Lá thần (bài hướng dẫn, giữ nguyên) | `forest-ch1` |
| | 2 | Đồng cỏ và hồ thư | `tv2-t10-b17`, `tv2-t10-b18` |
| | 3 | Con đường chữ cái và bụi gai | `tv2-t11-b19`, `tv2-t11-b20` |
| | 4 | Đồi gió và xưởng gỗ | `tv2-t12-b21`, `tv2-t12-b22` |
| | 5 | Bãi đất trống bên suối đất sét | `tv2-t13-b23`, `tv2-t13-b24` |
| Trường học | 1 | Sân trường (khung trường giữ như mock đã duyệt) | `toan2-cd1-b01` … `toan2-cd1-b06` |
| | 2 | Lớp học (lớp 2A trong nhà chính, hành lang có thời khoá biểu) | `tv2-t05-b09`, `tv2-t05-b10` |
| | 3 | Chòi trống và phòng đọc của trường | `tv2-t06-b11`, `tv2-t06-b12` |
| | 4 | Sân chơi và góc vẽ | `tv2-t07-b13`, `tv2-t07-b14` |
| Thư viện | 1 | Phòng đọc (kệ sách, góc đọc, tảng đá đọc sách ngoài vườn) | `tv2-t08-b15`, `tv2-t08-b16` |
| | 2 | Sân lễ hội lá vàng | `tv2-t09-on-giua-ki` |
| | 3 | Tháp đồng hồ và phòng lịch | `toan2-cd6-b29` … `toan2-cd6-b32` |
| Xóm Mái Ấm | 1 | Vườn hoa và ngõ nhà Chíp | `tv2-t14-b25`, `tv2-t14-b26` |
| | 2 | Hiên nhà đêm trăng và hang đá nhà sư tử | `tv2-t15-b27`, `tv2-t15-b28` |
| | 3 | Chòi cũ bên bờ và con dốc nhà ông | `tv2-t16-b29`, `tv2-t16-b30` |
| | 4 | Hồ sen và cánh đồng gió | `tv2-t17-b31`, `tv2-t17-b32` |
| Chợ phiên | 1 | Chợ rau hoa (hàng hoa, hàng bầu bí, vườn tre, nhà kính bán cây) | `toan2-cd2-b07` … `toan2-cd2-b14` |
| | 2 | Dãy hàng cân đong (quầy cân, quầy nước, bếp chè, kho hàng) | `toan2-cd3-b15` … `toan2-cd3-b18` |
| Nông trại | 1 | Nông trại (chuồng, ruộng, kho thóc, xưởng nông cụ, ao) | `toan2-cd4-b19` … `toan2-cd4-b24` |
| Lâu đài | 1 | Sân hình khối (phòng vẽ, cửa sổ kính màu, phòng tranh) | `toan2-cd5-b25` … `toan2-cd5-b28` |
| | 2 | Đại sảnh ôn tập (sân khấu, hậu trường, lễ tổng kết) | `toan2-cd7-b33` … `toan2-cd7-b36` |
| | 3 | Cầu treo trước cổng thành (khánh thành cây cầu) | `tv2-t18-on-cuoi-ki` |

### Nhân vật ở nhiều map

Lấy từ dữ liệu ngày 01/10/2026 (mọi NPC mà các bước của quest nhắc tới, gộp theo `character`). Cột "Giữ ở" là bài nhân vật ở lại; các bài ở cột "Đổi" dùng nhân vật mới.

| Nhân vật | Giữ ở | Đổi |
| --- | --- | --- |
| Vẹt Xanh `vet-xanh` | Khu rừng (`tv2-t10-b17`, `tv2-t11-b19`), hướng dẫn viên | đổi sang hướng dẫn viên của map: `toan2-cd1-b03`, `tv2-t05-b09`, `tv2-t06-b12`, `tv2-t07-b14` (Trường học); `toan2-cd2-b14` (Chợ); `tv2-t01-b01`, `tv2-t02-b03`, `tv2-t02-b04`, `tv2-t03-b06` (Làng); `tv2-t08-b15`, `tv2-t08-b16`, `tv2-t09-on-giua-ki` (Thư viện); `tv2-t18-on-cuoi-ki` (Lâu đài) |
| Sư Tử Vàng `su-tu-vang` | Trường học `toan2-cd1-b01`, hướng dẫn viên | `tv2-t15-b28` (bố sư tử con: nhân vật mới) |
| Gấu Trúc Tròn `gau-truc` | Thư viện, hướng dẫn viên | `tv2-t06-b12`, `toan2-cd2-b12` |
| Bò Sữa Mơ `bo-sua-mo` | Nông trại, hướng dẫn viên | `toan2-cd2-b09`, `tv2-t10-b17` |
| Cánh Cụt Pin `chim-canh-cut-pin` | Chợ `toan2-cd3-b15`, hướng dẫn viên | `toan2-cd7-b35` |
| Gà Con Chíp `ga-con-chip` | Trường học `toan2-cd1-b02` | `toan2-cd5-b27` |
| Mèo Mun `meo-mun` | Trường học `toan2-cd1-b03` | `toan2-cd4-b24` |
| Chó Mực `cho-muc` | Trường học `toan2-cd1-b05` | `toan2-cd6-b31` |
| Cáo Lém `cao-lem` | Trường học `toan2-cd1-b06` | `toan2-cd4-b21` |
| Ong Vàng `ong-vang` | Chợ `toan2-cd2-b07` | `toan2-cd5-b26` |
| Sâu Xanh `sau-xanh` | Thư viện `toan2-cd6-b32` (đếm ngày hoá bướm) | `toan2-cd2-b08` |
| Hải Ly Cần `hai-ly-can` | Khu rừng `tv2-t13-b24` | `toan2-cd2-b10` |
| Hổ Vằn `ho-van` | Chợ `toan2-cd2-b13` | `toan2-cd4-b23` |
| Cá Bống `ca-bong` | Xóm `tv2-t17-b31` (cùng mẹ Bống) | `toan2-cd3-b16` |
| Gấu Tuyết Bông `gau-tuyet-bong` | Khu rừng `tv2-t10-b18` | `toan2-cd3-b18` |
| Lợn Rừng Đốm `lon-rung-dom` | Khu rừng `tv2-t12-b22` | `toan2-cd4-b19` |
| Khỉ Lanh `khi-lanh` | Khu rừng `tv2-t12-b21` | `toan2-cd4-b20` |
| Koala Na `koala-na` | Xóm `tv2-t15-b27` | `toan2-cd4-b22` |
| Cua Kềnh `cua-kenh` | Xóm `tv2-t16-b29` | `toan2-cd5-b28` |
| Voi Bảo `voi-bao` | Thư viện `toan2-cd6-b30` (phòng lịch) | `tv2-t01-b02` |
| Nai Mơ `nai-mo` | Thư viện `tv2-t08-b16` | `tv2-t05-b09` |
| Thỏ Tí `tho-ti` | Xóm `tv2-t17-b32` (cùng em Bé Tẹo) | `tv2-t05-b10` |
| Cô Gấu Mật `tv2-t01-b01-co-gau-mat` | Trường học `tv2-t05-b09` (cô giáo lớp em) | `tv2-t01-b01` |
| Hải Ly Mộc, Cá Chép Hồng (`tv2-t06-b11-*`) | Trường học `tv2-t06-b11` | `tv2-t09-on-giua-ki` |
| Gấu Trắng Ú, Ông Lộc, Chị Thảo (`toan2-cd6-b31/b32-*`) | Thư viện `toan2-cd6-b31`, `toan2-cd6-b32` | `toan2-cd7-b36` |

Khỉ Lanh hiện cũng đứng sẵn ở sân bóng Trường học (đặt tay trong generator, chương 1): bỏ khỏi Trường học khi dọn map ở phase 5, vì không còn bài Toán chủ đề 1 nào dùng (kiểm lại bằng dữ liệu trước khi bỏ).


Mỗi quest một nhân vật chính, một nơi, một tình huống mở đầu riêng; không quest nào mượn khung của quest khác. Phase 4, 5 viết lời thoại, `feedback`, chuỗi cơ chế theo bảng này (thứ tự cơ chế do bài tập quyết, `content:check` chặn trùng). Chữ SGK vẫn nguyên văn (D8) — câu chuyện chỉ bao quanh bài tập. Người chơi luôn là `{name}`.

Dàn nhân vật dùng mô hình Cube Pets có sẵn (`assets/packs/kenney-cube-pets/2.0`): mỗi nhân vật có tên và tính cách riêng, xuất hiện lại thì câu chuyện của họ đi tiếp (không lặp cảnh cũ).

| Nhân vật | Con vật | Tính cách | Tuyến truyện |
| --- | --- | --- | --- |
| Vẹt Xanh | parrot | lắm lời, hay đố | dẫn đường Khu rừng, sưu tầm từ ngữ lạ |
| Hải Ly Cần | beaver | chăm chỉ, cẩn thận | xây dần cây cầu gỗ qua suối (mỗi chương thêm một nhịp) |
| Nai Mơ | deer | mơ mộng, thích thơ | chép thơ vào cuốn sổ lá |
| Thỏ Tí | bunny | nhanh nhảu, hay quên | làm rơi đồ khắp rừng |
| Gấu Trúc Tròn | panda | chậm mà chắc | thủ thư gốc cây rỗng |
| Cáo Lém | fox | tinh nghịch, hay bày trò | tổ chức trò chơi cuối tuần |
| Voi Bảo | elephant | hiền, nhớ giỏi | giữ lịch và đồng hồ của trường |
| Khỉ Lanh | monkey | lanh lợi | giáo viên thể dục, đo đếm |
| Hổ Vằn | tiger | ra vẻ dữ, thật ra nhút nhát | học cách kết bạn |
| Sư Tử Vàng | lion | hiệu trưởng Trường học | mở từng khu trường |
| Chim Cánh Cụt Pin | penguin | kĩ tính | quản lí căng tin (cân, đong) |
| Gà Con Chíp | chick | tò mò | học sinh mới của trường |
| Heo Ủn | pig | ham ăn, vui tính | bếp trưởng |
| Bò Sữa Mơ | cow | hiền hậu | trang trại cạnh trường |
| Hươu Cao | giraffe | cao, nhìn xa | vẽ bản đồ, thích hình khối |
| Gấu Koala Na | koala | buồn ngủ | hay ngủ quên giờ |
| Cua Kềnh | crab | đi ngang, hay nói ngược | câu đố so sánh |
| Ong Vàng | bee | siêng năng | đếm hoa, xếp tổ hình lục giác |
| Chó Mực | dog | trung thành | canh cổng trường, đưa thư |
| Mèo Mun | cat | điềm tĩnh | bạn cùng lớp của `{name}` |
| Cá Bống | fish | ở hồ nước | đố dung tích |
| Sâu Xanh | caterpillar | kiên nhẫn | lớn lên thành bướm qua các tuần (Tiếng Việt chủ điểm 1) |
| Gấu Tuyết Bông | polar | từ phương xa tới | gửi thư, kể chuyện nơi khác |
| Lợn Rừng Đốm | hog | vụng về | làm đồ chơi |

## Tiếng Việt — Khu rừng bí mật (chương 2–19, mỗi tuần một chương, 2 quest/chương)

| Quest | Bài | Chương | Nhân vật chính | Nơi | Tình huống mở đầu |
| --- | --- | --- | --- | --- | --- |
| tv2-t01-b01 | Tôi là học sinh lớp 2 | 2 | Sâu Xanh | cổng rừng lúc bình minh | Sâu Xanh háo hức ngày đầu vào "lớp Hai của rừng", sợ đến muộn |
| tv2-t01-b02 | Ngày hôm qua đâu rồi? | 2 | Voi Bảo | gốc cây treo tờ lịch lá | tờ lịch lá bị gió thổi bay, Voi Bảo hỏi ngày hôm qua đi đâu |
| tv2-t02-b03 | Niềm vui của Bi và Bống | 3 | Thỏ Tí | bãi cỏ sau mưa có cầu vồng | Thỏ Tí thấy cầu vồng, muốn ước nhiều thứ cùng lúc |
| tv2-t02-b04 | Làm việc thật là vui | 3 | Ong Vàng | vườn hoa tổ ong | cả tổ bận rộn, Ong Vàng cần người phụ một việc nhỏ |
| tv2-t03-b05 | Em có xinh không? | 4 | Voi Bảo (em voi nhỏ) | suối soi bóng | em voi nhỏ bắt chước các bạn để "xinh hơn" |
| tv2-t03-b06 | Một giờ học | 4 | Mèo Mun | lớp học dưới tán cây | Mèo Mun ngại nói trước lớp |
| tv2-t04-b07 | Cây xấu hổ | 5 | Nai Mơ | bụi cỏ xấu hổ ven đầm | lá cây cụp lại khi có tiếng động lạ |
| tv2-t04-b08 | Cầu thủ dự bị | 5 | Hổ Vằn | sân bóng giữa rừng | Hổ Vằn chưa được vào đội, buồn bã tập một mình |
| tv2-t05-b09 | Cô giáo lớp em | 6 | Nai Mơ | lớp học có cửa sổ lá | Nai Mơ muốn viết bài thơ tặng cô giáo |
| tv2-t05-b10 | Thời khoá biểu | 6 | Thỏ Tí | tấm bảng gỗ ở gốc sồi | Thỏ Tí mang nhầm sách vì không xem thời khoá biểu |
| tv2-t06-b11 | Cái trống trường em | 7 | Chó Mực | chòi trống bên suối | trống trường im tiếng cả hè, cần ai đánh thức |
| tv2-t06-b12 | Danh sách học sinh | 7 | Gấu Trúc Tròn | gốc cây thư viện | danh sách lớp bị ướt mưa, nhoè tên |
| tv2-t07-b13 | Yêu lắm trường ơi! | 8 | Gà Con Chíp | sân trường rừng giờ ra chơi | Chíp nhớ nhà, chưa thấy yêu trường |
| tv2-t07-b14 | Em học vẽ | 8 | Hươu Cao | đồi cỏ nhìn ra biển | Hươu Cao vẽ tranh nhưng thiếu màu |
| tv2-t08-b15 | Cuốn sách của em | 9 | Gấu Trúc Tròn | kệ sách trong hốc cây | sách bị xếp lộn xộn, không tìm được mục lục |
| tv2-t08-b16 | Khi trang sách mở ra | 9 | Nai Mơ | tảng đá phẳng đọc sách | trang sách "mở ra" thành cảnh thật quanh {name} |
| tv2-t09-on-giua-ki | Ôn tập giữa học kì 1 | 10 | Vẹt Xanh + cả lớp | lễ hội lá vàng | hội thi giữa kì của rừng, mỗi trạm một thử thách |
| tv2-t10-b17 | Gọi bạn | 11 | Bò Sữa Mơ | đồng cỏ khô hạn | bạn của Bò lạc giữa đồng khô, phải gọi tìm |
| tv2-t10-b18 | Tớ nhớ cậu | 11 | Gấu Tuyết Bông | bến thư bên hồ | Bông nhận thư của bạn phương xa, muốn viết trả lời |
| tv2-t11-b19 | Chữ A và những người bạn | 12 | Vẹt Xanh | con đường chữ cái | các chữ cái cãi nhau ai quan trọng nhất |
| tv2-t11-b20 | Nhím nâu kết bạn | 12 | Hổ Vằn | bụi gai cuối rừng | Hổ Vằn muốn làm quen nhưng các bạn sợ |
| tv2-t12-b21 | Thả diều | 13 | Khỉ Lanh | đỉnh đồi lộng gió | diều của Khỉ vướng cành cây cao |
| tv2-t12-b22 | Tớ là lê-gô | 13 | Lợn Rừng Đốm | xưởng đồ chơi gỗ | Đốm xếp khối mãi không thành hình |
| tv2-t13-b23 | Rồng rắn lên mây | 14 | Cáo Lém | bãi đất trống giữa rừng | Cáo bày trò chơi dân gian nhưng quên luật |
| tv2-t13-b24 | Nặn đồ chơi | 14 | Hải Ly Cần | bờ suối đất sét | Hải Ly nặn quà tặng nhưng đất sét khô cứng |
| tv2-t14-b25 | Sự tích hoa tỉ muội | 15 | Ong Vàng | bụi hoa tỉ muội | hai chị em ong giận nhau vì một bông hoa |
| tv2-t14-b26 | Em mang về yêu thương | 15 | Gà Con Chíp | tổ rơm của nhà Chíp | nhà Chíp sắp đón em bé, Chíp lo bị bỏ quên |
| tv2-t15-b27 | Mẹ | 16 | Koala Na | võng lá dưới trăng | đêm nóng, Na không ngủ được, nhớ mẹ quạt |
| tv2-t15-b28 | Trò chơi của bố | 16 | Sư Tử Vàng (bố sư tử con) | hang đá ấm | sư tử con giận vì bố bận, bố nghĩ ra trò chơi mới |
| tv2-t16-b29 | Cánh cửa nhớ bà | 17 | Cua Kềnh | căn chòi cũ bên bờ | Cua tìm lại vết khắc chiều cao bà đánh dấu |
| tv2-t16-b30 | Thương ông | 17 | Chó Mực | con dốc gập ghềnh | ông Chó già đau chân, cần dắt qua dốc |
| tv2-t17-b31 | Ánh sáng của yêu thương | 18 | Cá Bống | hồ nước lúc hoàng hôn | mẹ cá bị ốm, đàn đom đóm soi đường tìm thuốc |
| tv2-t17-b32 | Chơi chong chóng | 18 | Thỏ Tí | cánh đồng gió | Thỏ Tí và em tranh nhau một chiếc chong chóng |
| tv2-t18-on-cuoi-ki | Ôn tập và đánh giá cuối học kì 1 | 19 | Vẹt Xanh + Hải Ly Cần | cây cầu gỗ hoàn thành | khánh thành cây cầu cả học kì cùng xây, mỗi nhịp một câu hỏi ôn |

## Toán — Trường học (7 khu = 7 chủ đề, đi lại tự do)

| Khu | Chủ đề | Người giữ khu |
| --- | --- | --- |
| Sân trường | 1 Ôn tập và bổ sung | Sư Tử Vàng |
| Vườn trường | 2 Cộng, trừ trong phạm vi 20 | Ong Vàng, Bò Sữa Mơ |
| Căng tin | 3 Khối lượng, dung tích | Chim Cánh Cụt Pin, Heo Ủn |
| Xưởng đồ chơi | 4 Cộng, trừ có nhớ trong phạm vi 100 | Lợn Rừng Đốm |
| Phòng mĩ thuật | 5 Hình phẳng | Hươu Cao |
| Tháp đồng hồ | 6 Ngày – giờ, giờ – phút, ngày – tháng | Voi Bảo, Koala Na |
| Hội trường | 7 Ôn tập học kì 1 | Sư Tử Vàng + cả trường |

| Quest | Bài | Nhân vật chính | Nơi trong khu | Tình huống mở đầu |
| --- | --- | --- | --- | --- |
| toan2-cd1-b01 | Ôn tập các số đến 100 | Sư Tử Vàng | cột cờ | bảng số lớp học rơi mất các con số, cần xếp lại |
| toan2-cd1-b02 | Tia số. Số liền trước, số liền sau | Gà Con Chíp | vạch kẻ sân nhảy lò cò | Chíp nhảy lò cò trên tia số nhưng hay nhảy nhầm ô |
| toan2-cd1-b03 | Các thành phần của phép cộng, phép trừ | Mèo Mun | bảng tin sân trường | tấm biển tên "số hạng, tổng" bị gió thổi lẫn lộn |
| toan2-cd1-b04 | Hơn, kém nhau bao nhiêu | Khỉ Lanh | đường chạy | hai đội thi nhặt bóng, cần biết đội nào hơn bao nhiêu quả |
| toan2-cd1-b05 | Ôn tập phép cộng, phép trừ (không nhớ) trong phạm vi 100 | Chó Mực | cổng trường | túi thư đưa nhầm lớp, số trên phong bì là phép tính |
| toan2-cd1-b06 | Luyện tập chung | Cáo Lém | góc trò chơi dân gian | Cáo mở "hội chợ số" có năm gian đố |
| toan2-cd2-b07 | Phép cộng (qua 10) trong phạm vi 20 | Ong Vàng | luống hoa hướng dương | đếm hoa đủ chục để làm tổ mới |
| toan2-cd2-b08 | Bảng cộng (qua 10) | Sâu Xanh | giàn bầu | bảng cộng khắc trên quả bầu bị rụng |
| toan2-cd2-b09 | Bài toán về thêm, bớt một số đơn vị | Bò Sữa Mơ | chuồng rơm | đàn bê con chạy ra vào, đếm thêm bớt |
| toan2-cd2-b10 | Luyện tập chung | Hải Ly Cần | ao cá vườn trường | Hải Ly làm đập nhỏ, mỗi viên đá là một phép tính |
| toan2-cd2-b11 | Phép trừ (qua 10) trong phạm vi 20 | Heo Ủn | cây táo | táo rụng dần, Heo đếm còn lại bao nhiêu |
| toan2-cd2-b12 | Bảng trừ (qua 10) | Gấu Trúc Tròn | vườn tre | lóng tre khắc bảng trừ bị xếp sai thứ tự |
| toan2-cd2-b13 | Bài toán về nhiều hơn, ít hơn một số đơn vị | Hổ Vằn | luống cà rốt | Hổ và Thỏ so ai trồng được nhiều cà rốt hơn |
| toan2-cd2-b14 | Luyện tập chung | Vẹt Xanh | nhà kính | Vẹt đố cả vườn trước khi mở cửa nhà kính |
| toan2-cd3-b15 | Ki-lô-gam | Chim Cánh Cụt Pin | quầy cân hàng | chiếc cân đĩa lệch, Pin nhờ cân lại từng túi |
| toan2-cd3-b16 | Lít | Cá Bống | bể nước căng tin | bể cá cần đổ đủ lít nước |
| toan2-cd3-b17 | Thực hành và trải nghiệm với các đơn vị ki-lô-gam, lít | Heo Ủn | bếp lớn | nấu nồi chè cho cả trường theo công thức kg, lít |
| toan2-cd3-b18 | Luyện tập chung | Gấu Tuyết Bông | kho lạnh | Bông gửi hàng về phương xa, cần ghi đúng cân nặng |
| toan2-cd4-b19 | Phép cộng (có nhớ) số có hai chữ số với số có một chữ số | Lợn Rừng Đốm | bàn lắp ráp | Đốm đếm linh kiện theo chục và rời |
| toan2-cd4-b20 | Phép cộng (có nhớ) số có hai chữ số với số có hai chữ số | Khỉ Lanh | đường ray tàu đồ chơi | ghép toa tàu, mỗi toa chở một số hàng |
| toan2-cd4-b21 | Luyện tập chung | Cáo Lém | quầy trao giải | Cáo làm hộp quà bí mật, mở bằng phép tính |
| toan2-cd4-b22 | Phép trừ (có nhớ) số có hai chữ số cho số có một chữ số | Koala Na | kệ gấu bông | Na tặng bớt gấu bông cho em nhỏ |
| toan2-cd4-b23 | Phép trừ (có nhớ) số có hai chữ số cho số có hai chữ số | Hổ Vằn | sân thử máy bay giấy | máy bay bay xa bao nhiêu, về gần bao nhiêu |
| toan2-cd4-b24 | Luyện tập chung | Mèo Mun | tủ kính trưng bày | xếp đồ chơi hoàn thành vào tủ theo số thứ tự |
| toan2-cd5-b25 | Điểm, đoạn thẳng, đường thẳng, đường cong, ba điểm thẳng hàng | Hươu Cao | giá vẽ lớn | nối các chấm sao thành chòm sao |
| toan2-cd5-b26 | Đường gấp khúc. Hình tứ giác | Ong Vàng | cửa sổ ghép kính | đi đường gấp khúc qua các ô kính màu |
| toan2-cd5-b27 | Thực hành gấp, cắt, ghép, xếp hình. Vẽ đoạn thẳng | Gà Con Chíp | bàn thủ công | Chíp gấp thiệp chúc mừng cho cô giáo |
| toan2-cd5-b28 | Luyện tập chung | Cua Kềnh | phòng trưng bày tranh | Cua treo ngược các bức tranh hình khối |
| toan2-cd6-b29 | Ngày – giờ, giờ – phút | Koala Na | chân tháp đồng hồ | Na ngủ quên, đồng hồ tháp chạy sai giờ |
| toan2-cd6-b30 | Ngày – tháng | Voi Bảo | phòng lịch trên tháp | tờ lịch tháng bị xé mất vài ngày |
| toan2-cd6-b31 | Thực hành và trải nghiệm xem đồng hồ, xem lịch | Chó Mực | đỉnh tháp có chuông | lên lịch trực đánh chuông cho cả tuần |
| toan2-cd6-b32 | Luyện tập chung | Sâu Xanh | ban công ngắm trời | Sâu Xanh đếm ngày chờ thành bướm |
| toan2-cd7-b33 | Ôn tập phép cộng, phép trừ trong phạm vi 20, 100 | Sư Tử Vàng | sân khấu hội trường | tổng duyệt văn nghệ cuối kì, vé ghế là phép tính |
| toan2-cd7-b34 | Ôn tập hình phẳng | Hươu Cao | phông nền sân khấu | dựng phông bằng các hình phẳng |
| toan2-cd7-b35 | Ôn tập đo lường | Chim Cánh Cụt Pin | hậu trường | chuẩn bị nước và bánh cho buổi diễn |
| toan2-cd7-b36 | Ôn tập chung | cả trường | lễ tổng kết | trao huy hiệu học kì, mỗi khu gửi một câu đố cuối |
