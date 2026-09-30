# Hướng dẫn đọc SGK thành kiểm kê (phase 1)

Dùng chung cho mọi gói đọc (lượt 1 và lượt 2). Schema: `packages/schema/src/curriculum.ts`. Mục lục đã chốt: `content/curriculum/{toan2-t1,tv2-t1}/book.json` (id bài, tên bài, trang bắt đầu, tuần — phải khớp đúng từng ký tự).

## Nguyên tắc số 1: giống sách 100%
Kiểm kê là nguồn duy nhất để đưa bài vào game, và game chính là bài tập thật của trẻ. Chép **đúng từng chữ, dấu thanh, dấu câu, số, xuống dòng** như in. Không sửa lỗi, không rút gọn, không diễn đạt lại, không chuẩn hoá cách viết (giữ "khoá" nếu sách in "khoá"). Chỉ phần bạn *mô tả* (`media`) là lời của bạn. Không chắc một chữ → `readConfidence: "low"`, không đoán.

## Nguồn trang
- `.data/sgk/pages/toan-NNN.pdf`, `.data/sgk/pages/tv-NNN.pdf` (NNN = số trang PDF, 3 chữ số). **Trang in = trang PDF − 1.** Mọi `page` trong JSON là trang in.
- Đọc từng trang bằng công cụ Read (một file một lần). Không OCR, không đoán: chữ nào không chắc thì `readConfidence: "low"`.

## File ra (mỗi chủ đề/chủ điểm một file)
`content/curriculum/<book>/chu-de-N.json` (Toán) hoặc `chu-diem-N.json` (TV):
```json
{ "book": "toan2-t1", "id": "toan2-t1-chu-de-1", "number": 1, "title": "<đúng như book.json>",
  "lessons": [ ... ], "pageItems": [] }
```
Lượt 1 để `pageItems: []`; lượt 2 điền.

## Lesson
`{ "id": "toan2-t1-b01", "number": 1, "title": "<đúng book.json>", "pages": [6, 9], "sections": [...] }` — TV thêm `"week"`. Bài ôn tập TV không có `number`. `pages[1]` = trang trước bài kế tiếp (hoặc trang cuối có nội dung của bài).

## Section
- `id` = `<lesson id>-<kind>`; kind lặp lại trong bài thì thêm `-2`, `-3` theo thứ tự in (vd `toan2-t1-b01-luyen-tap`, `toan2-t1-b01-luyen-tap-2`).
- `kind` Toán: `kham-pha` | `hoat-dong` | `luyen-tap` | `tro-choi` | `van-dung` (theo nhãn in trên trang: Khám phá, Hoạt động, Luyện tập, Trò chơi, Vận dụng).
- `kind` TV: `doc` (Đọc: khởi động + bài đọc + câu hỏi + luyện tập theo văn bản) | `viet-chu-hoa` | `viet-ung-dung` (câu ứng dụng dưới chữ hoa) | `nghe-viet` | `bang-chu-cai` | `chinh-ta` (phân biệt c/k, ch/tr…) | `tu-ngu-cau` (từ ngữ, câu, dấu câu) | `viet-doan` | `noi-nghe` (Nói và nghe không phải kể chuyện) | `ke-chuyen` | `doc-mo-rong` | `van-dung` | `danh-gia` (ôn tập/đánh giá).
- `pages: [from, to]` (trang in), `title` nếu section có đầu đề riêng (vd tên truyện kể).
- `text` bắt buộc với `doc`: `{ "title", "author"?, "body", "glossary"? }` — `body` là **nguyên văn** bài đọc/bài thơ/câu chuyện, giữ xuống dòng (đoạn văn cách bằng `\n\n`, dòng thơ bằng `\n`); `author` như in trong ngoặc cuối bài (vd `"Văn Giá"`, `"Theo Nguyễn Văn A"`); `glossary` là ô "Từ ngữ": `[{ "term": "Loáng (một cái)", "meaning": "rất nhanh." }]`.
- `nghe-viet`: nếu đoạn nghe–viết in trong sách thì ghi vào `text`; nếu chỉ trỏ tới bài đọc thì để nguyên câu lệnh trong item.
- Section có thể không có item (Khám phá chỉ là tranh + phép tính mẫu): `items: []` nhưng vẫn phải có để trang được tính là đã đọc.

## Item (đơn vị đo phủ)
- Mỗi bài tập / câu hỏi / yêu cầu in trong sách là một item. Bài có ý a, b, c → mỗi ý một item. Bài có nhiều phép tính/ô trống trả lời riêng (không có chữ a, b) → mỗi phép tính/ô một item, gắn hậu tố `-a`, `-b`… theo thứ tự đọc (trái→phải, trên→dưới). **Bỏ dòng mẫu** (dòng "theo mẫu" đã có sẵn đáp án) nhưng ghi mẫu vào `prompt` của item đầu tiên.
- `id` = `<section id>-<số bài>[-<ý>]`. Trong `doc` TV: câu khởi động `-kd` (nhiều câu thì `-kd1`, `-kd2`), câu hỏi đọc hiểu `-1`, `-2`… (khung dấu ?), luyện tập theo văn bản (khung kính lúp) `-lt1`, `-lt2`…; ý a/b thì thêm `-a`, `-b` (vd `tv2-t1-b01-doc-lt2-a`).
- `page`: trang in có item đó.
- `prompt`: **nguyên văn** câu lệnh; nếu là ý con thì ghép câu lệnh chung + ý (vd `"Thực hiện các yêu cầu sau: a. Nói lời chào tạm biệt mẹ trước khi đến trường."`). Lựa chọn trắc nghiệm ghi vào prompt đúng như in (`"… a. vùng dậy; b. muốn đến sớm nhất lớp; c. chuẩn bị rất nhanh; d. thấy mình lớn bổng lên"`).
- `exerciseType` (một trong): Toán `tinh`, `dien-so`, `so-sanh`, `dem`, `bai-toan-loi-van`, `do-luong-thuc-hanh`, `ve-hinh`, `nhan-dien-hinh`, `xem-dong-ho`, `xem-lich`; TV `khoi-dong`, `doc-thanh-tieng`, `doc-hieu`, `tim-tu`, `dien-chu`, `xep-tu`, `dat-cau`, `dau-cau`, `ke-chuyen-tranh`, `noi-ve-ban-than`, `viet-chu`, `nghe-viet`, `viet-doan`; chung `chon-dap-an`, `noi`, `sap-xep`, `tro-choi`. Không vừa loại nào → chọn loại gần nhất và ghi rõ trong báo cáo cuối.
- `media`: mô tả hình cần cho bài, theo thứ tự đọc, mỗi hình một chuỗi ngắn, cụ thể về số lượng/giá trị (vd `"3 bó que tính chục và 4 que rời"`, `"đồng hồ kim chỉ 3 giờ"`, `"tranh 1: bạn nhỏ chào mẹ ở cổng trường"`). Tranh kể chuyện: mỗi tranh một chuỗi, đúng thứ tự số tranh.
- `expression` (chỉ khi có phép tính rõ ràng, số nguyên, chỉ `+` `-`):
  - tính: `"62 - 6"`, `"8 + 5 - 3"`;
  - so sánh: `"47 ? 38 + 5"` → đáp án `{ "text": ">" }` (dùng `<`, `>`, `=`);
  - tìm số trong phép tính: `"? + 5 = 12"` → `{ "number": 7 }`.
  Không ghi đơn vị (kg, l, cm) trong `expression`. Checker tự tính lại và báo lệch.
- `answer` (khi sách xác định được một đáp án): `{ "number": 56 }` | `{ "text": ">" }` | `{ "values": [5, 1, 51, "Năm mươi mốt"] }` (nhiều ô cùng một dòng/ý, theo thứ tự đọc) | `{ "time": { "hour": 15, "minute": 30 } }` (24 giờ khi sách nói chiều/tối) | `{ "date": { "day": 20, "month": 11 } }` | `{ "choice": "b. muốn đến sớm nhất lớp" }` (nhãn nguyên văn) | `{ "choices": ["a. …", "c. …"] }` (chọn nhiều) | `{ "open": true }` (trả lời tự do: kể, nói, viết). Tự giải bài toán để điền đáp án; câu đọc hiểu có đáp án rõ trong bài thì ghi `choice`/`text`.
- `readConfidence`: `"high"`, hoặc `"low"` khi không chắc chữ/số đọc được.

## Ví dụ (trang in 6, Toán Bài 1)
```json
{ "id": "toan2-t1-b01-luyen-tap", "kind": "luyen-tap", "pages": [6, 7], "items": [
  { "id": "toan2-t1-b01-luyen-tap-1-a", "page": 6, "prompt": "Hoàn thành bảng sau (theo mẫu). Mẫu: 3 chục, 4 đơn vị, viết số 34, đọc số Ba mươi tư. Dòng: ? chục, ? đơn vị, viết số ?, đọc số Năm mươi mốt.",
    "exerciseType": "dien-so", "media": ["5 bó que tính chục và 1 que rời"], "answer": { "values": [5, 1, 51] }, "readConfidence": "high" },
  { "id": "toan2-t1-b01-luyen-tap-2-a", "page": 6, "prompt": "Tìm cà rốt cho thỏ. (Mẫu: 5 chục và 4 đơn vị nối với 54.) 7 chục và 0 đơn vị", "exerciseType": "noi",
    "media": ["thỏ mang bảng 7 chục và 0 đơn vị", "cà rốt 54, 48, 66, 70"], "answer": { "number": 70 }, "readConfidence": "high" }
]}
```
(Chỉ minh hoạ định dạng, chưa đủ item của trang.)

## Quy ước bổ sung (chốt sau lượt 1)
- Id trùng giữa item và section (bài 2 của `…-luyen-tap` trùng section `…-luyen-tap-2`): thêm `-a` vào item (`…-luyen-tap-2-a`), kể cả khi bài chỉ có một ý.
- Dòng nguồn "(Theo …)" của truyện kể theo tranh (không in thân truyện): ghi vào `source` của section, nguyên văn.
- "Học thuộc lòng …" (dòng có dấu sao, không số): item `-doc-htl`, `exerciseType: "doc-thanh-tieng"`.
- Ô trống trong câu lệnh: chép dấu sách in (`?`, `…`, `◻`, `■`); checker coi mọi dấu này là ô trống khi so chữ.
- Bảng: mỗi hàng cách nhau `|`; ghép cột A–B: dòng `A: …; …` và `B: …; …`, hàng đang hỏi đặt cuối.
- Sách in có vẻ sai (chữ trong câu lệnh khác bài đọc, số tranh lệch): GIỮ nguyên như in, ghi vào nhật ký lượt 2.
- Đáp án do người đọc tự giải (gọi tên đồ vật trong tranh, đoán chữ…): khi có nhiều cách nói đúng thì dùng `{ "open": true }`.

## Lượt 2 (đối chiếu độc lập)
1. **Trước khi mở file lượt 1**, đọc lại từng trang của gói, ghi ra `.data/sgk/pass2/<gói>.json`: với mỗi trang `{ page, itemCount, items: [{ id?, prompt ngắn, expression?, answer? }] }` theo đúng quy tắc tách item ở trên.
2. Sau đó mở file lượt 1 và so từng trang: số item, `prompt`, `text`, `expression`, `answer`, số trang.
3. Chỗ lệch: đọc lại trang lần ba để chốt; sửa file lượt 1 theo kết quả chốt. Không chốt được → để `readConfidence: "low"`.
4. Điền `pageItems` cho **mọi trang in** của gói (kể cả trang 0 item, trừ trang mở đầu chủ điểm chỉ có tranh): `{ "page": N, "itemCount": <số lượt 2 đếm, sau khi chốt> }`.
5. Ghi nhật ký lệch vào `.data/sgk/pass2/<gói>.log.md` (trang, lượt 1 nói gì, lượt 2 nói gì, chốt gì).

## Kiểm
`pnpm tsx tools/content/check-curriculum.ts` (in cảnh báo thiếu và lỗi) — file của gói phải không còn lỗi; cảnh báo thiếu bài/trang của gói khác là bình thường.
