# Review nội dung: 22 mạch chuyện nhân vật mới, đợt 2a (19/10/2026)

Phạm vi: các commit `a2d6a3e0`, `13361bf4`, `a31d1baf` gồm 22 mạch, 80 chương `content/quests/yarn-*.json` và phần `arcs` mới trong `content/npcs/*.json`. Đối chiếu với khuôn trong `plans/dattqh/261019-1057-npc-stories-batch-2a/plan.md` và hồ sơ nhân vật.

Cách đọc: đã đọc hết phần tiếng Việt của cả 80 chương (mọi bước, câu hỏi, ba lớp hỗ trợ, phản hồi, thư), vượt mức mẫu được yêu cầu. Tiếng Anh đọc đủ ở 12 chương, mỗi map một chương: `meo-bep-mam-com-4`, `cho-coi-nga-tu-5`, `khi-day-leo-nhac-4`, `ho-coi-giao-huu-1`, `den-sen-ngan-ha-4`, `ong-bay-giai-co-3`, `thu-ngan-tram-chuyen-cuoi-4`, `heo-dan-dong-ca-4`, `koala-nghin-manh-4`, `te-tuong-nghin-van-co-2`, `canh-cut-xoay-ba-vong-4`, `cua-dem-nhip-song-3`. Thêm vào đó là các bài chữ cái, chính tả, ghép câu. Đã tự tính lại mọi phép tính và mọi mê cung. Có đối chiếu cách màn chơi hiển thị bước `logic` trong `apps/web/src/ui/challenge/mechanics/logic-challenge.tsx`. Không chạy lại các gate (`content:check`…) vì đây là review chỉ đọc trên máy dev dùng chung, và report của từng nhóm đã ghi gate xanh.

Ký hiệu: `<mạch>-<số chương>:<id bước>`, bỏ tiền tố `yarn-`.

## Tóm tắt

- Không có đáp án nào sai trong khoảng 75 câu tính, sắp xếp, chọn nhiều và mê cung.
- Có **một lỗi phải sửa**: câu đố chỗ ngồi ở `te-tuong-nghin-van-co-2` không giải được trên màn chơi, vì manh mối nằm trong `elements` mà UI không hiển thị với loại `puzzle`. Bước này còn mâu thuẫn với chính đáp án của câu trước.
- Không có nội dung nguy hiểm hay không hợp với trẻ em.
- Điểm yếu lớn nhất là **lặp**. Cùng một lưới mê cung dùng 5 lần. Cùng một bộ số dùng lại ở nhiều mạch. 75/80 chương mở bằng việc tìm 3 món đồ, 12 chương mở bằng cảnh gió thổi bay đồ. Câu xác nhận nỗi sợ gần như giống hệt nhau giữa các mạch.
- Có vài lỗi liền mạch truyện: bữa trưa "đầu tiên" của Chó xảy ra hai lần, chuyện cười số 99 xuất hiện hai lần, và một số thư mặc định người chơi đã chọn một nhánh nhất định.
- Giọng từng nhân vật bám hồ sơ tốt, phân biệt rõ.

## Phải sửa

### M1. `te-tuong-nghin-van-co-2:ba-ghe-dau-ban`: câu đố không có manh mối trên màn chơi

- Prompt chỉ ghi «Hai dòng mật mã cuối cùng nói về ba ghế đầu bàn. Cách xếp nào đúng với cả hai dòng?». Mọi manh mối ("Ghế 1 kê sát cây nến to", «Gấu Gác Hầm ngồi kề cây nến to», «Hươu Cao không ngồi kề Gấu Gác Hầm») nằm trong `elements`.
- UI chỉ vẽ `elements` khi `logicType === 'pattern'` (`logic-challenge.tsx:34`), mà bước này là `puzzle`. Người chơi thấy 3 cách xếp nhưng không có dữ kiện nào. Muốn giải phải mở Gợi ý hoặc Đáp án.
- Bước này còn mâu thuẫn với bước trước: ở `:giai-the-huou-cao`, Hươu Cao vừa được xếp **ghế số 73** (46 + 27), sang bước này lại ngồi **ghế 3**.
- Cách sửa: chép hai dòng mật mã và vị trí cây nến vào `prompt` (cả `en.prompt`), hoặc đổi sang dạng có hiển thị. Đổi luật mật mã thành "số trên thẻ cho biết dãy bàn", hoặc bỏ số 73, để hai bước không đá nhau.
- Ngoài phạm vi review: lỗi `puzzle` có `elements` cũng gặp ở 9 quest cũ (`vuot-ai-trung-tam`, `wonder-olympic-*` ×3, `yarn-chia-khoa-thu-tram-3`, `yarn-mai-cuon-sach-lac-2`, `yarn-mai-nha-chung-2`, `yarn-meo-ve-buc-tuong-2`, `yarn-trong-hoi-lac-nhip-2`). Nên có thêm một luật trong `content:check` hoặc sửa UI.

## Nên sửa

### S1. Một lưới mê cung dùng cho 5 chương, cùng một đường đúng

Lưới `[["S",".","#",".","."],["#",".","#",".","#"],[".",".",".",".","#"],["#","#","#",".","G"]]` với đáp án «→ ↓ ↓ → → ↓ →» xuất hiện ở:
`cao-mui-ten-mang-thu-3:loi-ra-buc-ban`, `cao-tuyet-tuong-bay-mau-3:dan-loi-cho-khach`, `khi-mua-dua-lon-2:cay-do-chan-loi`, `koala-nghin-manh-2:lach-qua-cac-ke`, `te-tuong-nghin-van-co-4:duoi-meo-muop`.

Người chơi đi qua nhiều map sẽ nhận ra ngay, trái với luật "không lặp" và đích "không chán". `content:check` không bắt được vì chỉ so câu chữ. Nên vẽ lưới riêng cho từng chương và thêm kiểm tra trùng `grid`.

### S2. Lời dẫn mê cung nói tới biểu tượng không có trên màn

UI luôn vẽ `S` = 🐱, `G` = ⭐, `#` = 🧱 (`logic-challenge.tsx:63`).
- `cao-mui-ten-mang-thu-3:loi-ra-buc-ban` ghi «Ô chú cáo», `khi-mua-dua-lon-2:cay-do-chan-loi` ghi «Ô chú khỉ». Trên màn không có cáo hay khỉ.
- `cao-tuyet-tuong-bay-mau-3:dan-loi-cho-khach` ghi «Ô chữ S… ô chữ G… ô dấu #». Trên màn không có chữ S, G hay dấu #.
- `te-tuong-nghin-van-co-4:duoi-meo-muop` ghi «Ô chữ S là chỗ {name} đứng, ô chữ G là chú mèo». Màn chơi lại vẽ con mèo 🐱 ở chỗ người chơi đứng còn ngôi sao ở chỗ con mèo, đúng ngược ý câu. Trẻ lớp 2 dễ rối nhất ở đây.

Nên viết theo đúng hình ("ô có chú mèo", "ô ngôi sao", "ô gạch") như `koala-nghin-manh-2` và `meo-hop-nhac-tang-ban-3` đang làm.

### S3. Dấu «?» cuối dãy hình làm câu hỏi quy luật thành hai nghĩa

UI luôn thêm một ô «?» sau dãy `elements` (`logic-challenge.tsx:45-47`).
- `meo-hop-nhac-tang-ban-1:day-so-chot-nhac`: màn hiện «5, 10, 15, 20, ?, 30, ?». Đáp án là 25, nhưng ô «?» cuối gợi tới 35, mà 35 lại là phương án nhiễu.
- `khi-day-leo-nhac-3:quy-luat-lo`: màn hiện «1 lỗ, 2 lỗ, 3 lỗ, nhóm bị rách, 5 lỗ, ?». Ô «?» cuối gợi tới 6, cũng là phương án nhiễu.
- `cho-coi-nga-tu-2:vach-qua-duong` (hỏi vạch thứ 9) và `tho-doi-nghi-thuc-1:buoc-di-deu` (hỏi bước thứ 10): ô «?» lại nằm ở vị trí 7 hoặc 6, và đáp án ở vị trí đó đều có trong danh sách chọn.
- `te-tuong-nghin-van-co-5:danh-so-trang-moi`: màn hiện hai dấu hỏi.

Câu chữ của prompt đúng, nhưng hình nói khác. Nên bỏ phần tử giữa dãy và hỏi số tiếp theo, hoặc dừng `elements` ngay trước vị trí được hỏi, hoặc cho UI biết khi nào không thêm «?».

### S4. Phản hồi sai giải thích sai lỗi tính

`thu-ngan-tram-chuyen-cuoi-4:ket-thieu-bao-nhieu`, phản hồi sai thứ ba: «Ba mươi ba là quên trả số nhớ rồi». Với 85 − 58, quên trả số nhớ sẽ ra **37**. Ra **33** là do lấy 8 − 5 ở hàng đơn vị, tức trừ ngược. Bản tiếng Anh cũng sai y như vậy. Nên sửa thành "Ba mươi ba là lấy 8 trừ 5 ở hàng đơn vị rồi; 5 không trừ được 8, phải mượn một chục."

### S5. Lỗi liền mạch truyện

- **Bữa trưa trọn vẹn đầu tiên xảy ra hai lần.** `cho-coi-nga-tu-3:bua-trua-tron-ven` viết «Lần đầu tiên sau mười hai năm, hộp cơm của Chó sạch trơn». Nhưng `cho-coi-nga-tu-5:bua-trua-cuoi` lại viết «Bữa trưa đầu tiên trọn vẹn», thư chương 5 cũng viết «Hôm nay Chó ăn trọn bữa trưa». Thêm nữa, ch3 hứa "một giờ" ăn trưa mà người thay ca chỉ trực từ 11:30 đến 12:00. Gợi ý: ch3 chỉ ăn được nửa bữa, giữ ước mơ trọn vẹn cho ch5.
- **Chuyện cười số 99 có hai chuyện.** `thu-ngan-tram-chuyen-cuoi-3:chuyen-cuoi-so-chin` là «Chuyện cười số chín mươi chín (bản nháp)», rồi `-4:tien-khoc-vi-hanh` lại «nghĩ ngay chuyện thứ chín mươi chín». Từ mốc 96 ở ch1 không đủ số cho bốn chương trước chuyện thứ 100. Nên đổi mốc đầu thành 95 hoặc bỏ chữ "chín mươi chín" ở ch3.
- **Thư mặc định người chơi đã chọn một nhánh**, trong khi nhánh khác vẫn chọn được:
  - `cho-coi-nga-tu-3`: Bác Hải viết «trưa nay bác đứng ngã tư thay Chó», ứng với nhánh `bac-hai-truc` của `:ai-truc`.
  - `cun-dom-ro-bot-3`: Thỏ thấy rô bốt «đeo nơ ra cổng phơi nắng», ứng với nhánh `phoi-nang`.
  - `khi-mua-dua-lon-3`: thư Cua «Khỉ gửi lời mời ra tận bãi», ứng với nhánh `go-cung-nhau`.
  - `thu-ngan-tram-chuyen-cuoi-1`: «bác đọc chuyện số 0 với số 8», ứng với nhánh `so-khong`.
  - `koala-nghin-manh-1`: «vẫn nằm yên dưới bốn viên sỏi», ứng với nhánh `da-chan-goc`.

  Nên viết thư trung tính (đợt 1 viết theo kiểu này), hoặc mỗi nhánh một câu.
- `nai-nghin-dom-dom-3:dom-dom-khong-ve`: «trảng cỏ tối om» rồi ngay sau là «thắp đèn sáng như ban ngày». Ý là không có đom đóm, nhưng câu đọc như tự mâu thuẫn.
- Thư `tho-doi-nghi-thuc-2` (Khỉ Hái Dừa) có tựa «Thư kèm hoa ép» nhưng thân thư không nhắc gì tới hoa ép.

### S6. Lộ nỗi sợ trước 3 trái tim

`nai-nghin-dom-dom-3` (2 trái tim) dựng nguyên tình huống trong hồ sơ: "sợ… đom đóm không về nữa, vì rừng bị thắp đèn sáng trưng". Cảnh này có «Nai lo lắm» và «chỉ mong đêm nay chúng về». Mạch này chỉ có 3 chương nên không có chương nào ở 3 trái tim. Nên đổi nguyên nhân (ví dụ trời mưa, sương) hoặc bớt màu "sợ".

Các trường hợp ranh giới, chưa tới mức vi phạm: `khi-day-leo-nhac-1` và `-2` (tiếng «rắc», chuồn chuồn bay qua mũi khiến Khỉ giật mình, Khỉ chối không sợ đúng hồ sơ), `ho-coi-giao-huu-2` (còi tắt tiếng, chỉ ra «gừ gừ»). Bí mật đều đúng luật 4 trái tim (`cho-coi-nga-tu-5`, `te-tuong-nghin-van-co-5`, `thu-ngan-tram-chuyen-cuoi-5`).

### S7. Xưng hô của Hổ Còi Vàng lệch hồ sơ và tự lệch

Trong cả mạch, Hổ xưng «anh» (`ho-coi-giao-huu-1..3`, thư ch1). Hồ sơ `content/npcs/truong-hoc.json` thì cho Hổ xưng «tớ» với người chơi. Trong khi đó lựa chọn của người chơi lại gọi «Cháu»: «Cháu chạy đi dán ngay!» (ch1), «Cháu đi tìm ngay!» (ch2), «Cháu cắm cờ ngay!» (ch3), đi cùng «anh». "Cháu" đi với "anh" là sai tiếng Việt. Nên chọn một: giữ "tớ/cậu" như hồ sơ, hoặc dùng "anh/em".

### S8. Lặp ý, lặp khuôn giữa các mạch (`content:check` không bắt được)

- **Bộ số trùng hệt**: 52 − 27 = 25 ở `heo-dan-dong-ca-2` và `meo-hop-nhac-tang-ban-1`. 8 + 7 = 15 ở `cua-dem-nhip-song-1` và `meo-bep-mam-com-1`. 26 + 18 = 44 ở `meo-hop-nhac-tang-ban-3` và `te-tuong-nghin-van-co-4`. "4 chục và 7 đơn vị = 47" ở `meo-sen-dem-vit-1` và `nai-nghin-dom-dom-1`. Kết quả 47 còn gặp lại ở `te-tuong-nghin-van-co-5` (28 + 19). Ba tổng gần nhau 83, 83, 84 ở `cao-mui-ten-1`, `den-sen-4`, `cao-tuyet-1`.
- **Đổi dm ra cm**: 4 bài trong 3 mạch của nhóm C (`canh-cut-3`, `cao-mui-ten-1`, `cao-mui-ten-2`, `cao-tuyet-1`). Phản hồi đúng gần như một khuôn: «{name} đổi đề-xi-mét ra xăng-ti-mét nhanh như…».
- **Khuôn chương giống nhau**: 75/80 chương có bước tìm 3 món (`find-object`/`search`). 65 chương làm bước này ngay sau lời mở. 80/80 bước `decision` đúng 3 phương án.
- **Cách mở chuyện**: 12 chương mở bằng gió thổi bay hoặc đổ đồ (`cao-mui-ten-1`, `den-sen-1`, `den-sen-4`, `heo-1`, `koala-1`, `meo-hop-1`, `meo-hop-2`, `meo-sen-2`, `ong-bay-2`, `te-tuong-1`, `thu-ngan-1`, `thu-ngan-3`). Lời nhắc sắp xếp «bị gió thổi lộn xộn» còn lặp ở `banh-mi-1`, `den-sen-2`, `meo-bep-1`, `koala-1`, `tho-doi-3`. Có 14 chương mở bằng việc để quên hoặc đánh rơi đồ.
- **Quyết định đặt tên**: xe (`banh-mi-3`), tượng (`cao-tuyet-3`), đèn (`den-sen-1`), dàn hát (`heo-1`), đội bóng (`ho-coi-1`), đom đóm (`nai-2`), vị trà (`meo-tra-3`), cộng thêm phương án đặt tên vịt ở `meo-sen-1`.
- **Cảnh kể nỗi sợ dùng chung câu**: «chưa kể với ai» hoặc «chưa từng cho ai xem» (`den-sen-4`, `meo-bep-4`, `koala-4`, `cho-coi-5`, `thu-ngan-5`). Câu đáp «Ai cũng có điều mình sợ…» hoặc «Ai cũng sợ một thứ gì đó» (`canh-cut-4`, `cho-coi-4`, `khi-mua-4`, `meo-bep-4`, gần giống ở `heo-4`, `thu-ngan-4`). Câu đáp «Có bạn bên cạnh… bớt run» (`den-sen-4`, `khi-day-4`, `thu-ngan-4`, `heo-4`).
- **Quà trùng**: Thỏ Ngắm Sao gửi bản đồ sao ở hai mạch (`den-sen-4`, `meo-hop-nhac-tang-ban-3`). "Đồng xu cổ quý nhất" vừa là bí mật của Bác Thu Ngân (`thu-ngan-5`), vừa là quà Chó gửi ở `cho-coi-nga-tu-5`, cùng món `dong-tien-co`. Chuyện này làm nhạt bí mật của Bác Thu Ngân.
- **Nét tính cách bị lẫn**: ở `khi-day-leo-nhac-2:ao-chuon-chuon-dlg`, Khỉ Chuyền Cành nói «Tớ đọc chữ chậm lắm». Đó lại là bí mật của Khỉ Hái Dừa (Đảo bí ẩn). Hai chú khỉ vốn đã dễ nhầm.

Gợi ý cho đợt 2b: thêm kiểm tra trùng `grid` và trùng cặp (số liệu, đáp án) vào `content:check`. Bỏ quy ước "mở chương bằng tìm 3 món". Cho một số quyết định 2 hoặc 4 phương án.

### S9. Độ khó so với lớp 2

- **Quá dễ (phạm vi 10, lớp 1)**, lại rơi vào chương cuối hoặc chương 2 trái tim:
  - `ho-coi-giao-huu-3:doc-ti-so` (3 + 2, 4 + 2; 7Q còn ghi rõ "phạm vi 10").
  - `cua-dem-nhip-song-3:can-goi-qua` (2 + 3 + 4 kg; một vỏ ốc nặng 2 kg là phi thực tế).
  - `khi-day-leo-nhac-3:quy-luat-lo` (dãy 1, 2, 3, 4, 5).
  - `meo-tra-da-quan-moi-mien-1:con-thieu-may-lit` (10 − 7).
  - `thu-ngan-tram-chuyen-cuoi-1:thoi-tien-ca-kho`, `-2:bao-gao-nang-bao-nhieu` (7 + 2, 10 − 9, 5 + 2).
  - `heo-dan-dong-ca-4:gio-tap` (7 giờ lùi 1 giờ).
- **Nội dung của tập 2** (chỉ báo để biết; plan ghi "bám SGK lớp 2" chứ không giới hạn ở tập 1): số 1000 ở `nai-nghin-dom-dom-3` (skill vẫn gắn `so-den-100`), tiền Việt Nam ở `thu-ngan-1`, đơn vị mét ở `khi-day-leo-nhac-2`.

## Có thì tốt

- **An toàn, chỉ là mẹo đời thường, không phải nội dung nguy hiểm**:
  - `meo-bep-mam-com-4:cach-thai-hanh` có phương án «Mài dao thật sắc, thái thật nhanh gần quạt». Với người chơi nhỏ nên đổi thành mẹo không khuyến khích thái nhanh.
  - `cua-dem-nhip-song-1` tính đường bơi ra phao ngoài khơi và chọn ván lướt mà không nhắc áo phao. Nên thêm một câu của Cua kiểu "mặc áo phao đã bồ".
  - `den-sen-ngan-ha-2/3` cho người chơi cầm diêm, thắp nến. Có người lớn ngồi cạnh nên chấp nhận được.
- **Tiếng Anh** (12 chương đọc đủ) sát nghĩa, tự nhiên, giữ được giọng nhân vật ("buddy", "ho ho", "Tock"). Vài điểm nhỏ:
  - `koala-nghin-manh-1:cau-viet-tren-nap`: xếp các mảnh tiếng Anh theo đáp án sẽ ra «Koala always puts together the edges first.», còn lời đáp lại ghi «…puts the edges together first.».
  - `cua-dem-nhip-song-3:xep-tui-thu`: lời đáp tiếng Anh gọi «Dolphin, frog, Uncle Bear, hermit crab», trong khi thẻ vẫn ghi tên tiếng Việt. Ở chế độ English trông như không theo ABC.
- **Lựa chọn của người chơi viết ở ngôi thứ ba** («Mời {name} ăn cùng…» ở `cho-coi-5`, «{name} đứng bục chỉ huy…» ở `cho-coi-3`). Đợt 1 cũng viết vậy nên chấp nhận được.
- `canh-cut-xoay-ba-vong-2:lo-duy-nhat` ghi «Ô chú mèo là chỗ đàn con đứng». Lời đúng với hình, nhưng mèo đứng cho cánh cụt thì hơi lạ. Nếu UI cho đổi biểu tượng thì sẽ hay hơn.

## Đúng khuôn (đếm bằng script trên 80 chương)

| Tiêu chí | Kết quả |
|---|---|
| ≥ 4 nơi mỗi chương | 80/80 (ít nhất 4: `cun-dom-1`, `khi-day-2`, `khi-day-4`, `meo-bep-2`, `meo-bep-3`, `meo-sen-1`, `nai-3`) |
| ≥ 2 cơ chế ngoài trắc nghiệm | 80/80 (mỗi chương có `decision` cộng ít nhất một `sort`/`logic`/`find-object`/`multi-select`/minigame) |
| `sevenQuestions` đủ 7 | 80/80 |
| Thư sau chương | 80/80; mạch nào cũng có ít nhất một thư từ nhân vật map khác (22/22) |
| `review: teacher-pending` | 80/80 |
| Có `{name}` | 80/80 (7–27 lần mỗi chương) |
| Nỗi sợ chỉ từ 3 trái tim | Vi phạm 1 (`nai-nghin-dom-dom-3`, xem S6) |
| Bí mật chỉ ở 4 trái tim | Đúng (3 mạch 5 chương) |
| Đáp án, khóa sắp xếp, mê cung | Đúng hết; lỗi nằm ở cách trình bày (M1, S2, S3) và một phản hồi (S4) |

## Điểm làm tốt (để biết mức rủi ro)

- Giọng nhân vật bám hồ sơ và khác nhau rõ: Cáo «Vút! trúng phóc», Koala nói ngắt «…», Ông Bảy «Cộc», Heo «Mục số…», Mèo Trà Đá «quý khách», Nai «ừm…», Cua «bồ, ầu ơ, êm ru», Tể Tướng xưng «ta/ngươi», Bác Thu Ngân «hô hô, tính tiền nàooo».
- Có nhiều câu hỏi gắn khéo với truyện, ví dụ đếm bộ bài 16 cặp tìm mảnh lạc ở `koala-4`, đọc chỗ «để trống» trong sổ ở `te-tuong-5`, số 9 soi bóng thành số 6 ở `thu-ngan-3`.
- Thông điệp an toàn và tử tế chuẩn: qua đường ở `cho-coi-1`, băng mỏng và rào lỗ băng ở `canh-cut-3/4`, không hại tổ ong ở `khi-mua-4`, không nhốt đom đóm vào lọ ở `nai-1`, giữ đúng thứ tự lễ khai giảng ở `tho-doi-3`.

## Việc nên làm, theo thứ tự

1. M1: sửa `te-tuong-nghin-van-co-2` (đưa manh mối vào prompt, gỡ mâu thuẫn ghế 73 với ghế 3).
2. S2, S3: sửa lời dẫn 4 mê cung và 5 bài quy luật cho khớp với hình trên màn.
3. S4: sửa phản hồi «33» ở `thu-ngan-4` (cả bản tiếng Anh).
4. S5, S6, S7: sửa chuyện bữa trưa của Chó, chuyện cười số 99, 5 thư phụ thuộc nhánh, nỗi sợ của Nai, xưng hô của Hổ.
5. S1, S8: vẽ lại 4 trong 5 mê cung trùng, đổi bộ số trùng, đổi bớt cảnh mở bằng gió và cảnh đặt tên. Thêm kiểm tra trùng `grid` và trùng số liệu vào `content:check` trước đợt 2b.
6. S9: nâng độ khó vài câu phạm vi 10 ở chương cuối.

## Câu hỏi còn mở

- Có muốn `content:check` chặn bước `logic` loại `puzzle` hoặc `maze` có `elements` (lỗi này có cả ở 9 quest cũ), hay sửa UI cho hiển thị `elements` ở mọi loại?
- Thư theo nhánh: giữ một thư trung tính cho mỗi chương, hay cho phép thư theo phương án đã chọn (cần server biết nhánh)?
