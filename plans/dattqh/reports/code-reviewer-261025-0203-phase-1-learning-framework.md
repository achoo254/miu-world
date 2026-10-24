# Review pha 1 — khung Môn → Chủ đề → Mục tiêu, kiểm chống chép SGK

Ngày: 25/10/2026 · Phạm vi: working tree chưa commit (`main`, base `e7948b6f`) · Plan: `plans/dattqh/261025-0029-original-learning-content/`

## Phạm vi

- 83 file sửa (+232/−323) + file mới: `packages/schema/src/learning.ts` (+test), `content.ts`, `curriculum.ts`, `apps/server/src/content/learning-topics.ts`, `content-catalog.ts`, `tools/content/{no-textbook-copy,learning-links,mechanic-rules,curriculum-links,check-content,content-gaps,content-variety}.ts`, `tools/learning/*`, `content/learning/topics/**` (21 chủ đề, 59 mục tiêu), `textbook-fingerprints.bin`, pending/allowed JSON, fixture lớp 3, `.claude/rules/quest-content.md`.
- 70 quest JSON: đã kiểm bằng máy — mỗi file đúng +1 dòng `"topic"`, không dòng nào khác đổi.

## Kiểm đã chạy (bằng chứng)

| Lệnh | Kết quả |
|---|---|
| `pnpm content:check` | `content:check OK — 2171 files` |
| `vitest --maxWorkers=1` no-textbook-copy, learning-links, tools/learning, learning.test, curriculum-links | 5 file, 27 test xanh |
| `vitest --maxWorkers=1` content.test, content-catalog.test, quest-routes.test, content-variety.test | 4 file, 106 test xanh |
| `eslint --max-warnings=0` các file TS đã đổi | 0 lỗi, 0 cảnh báo |
| `pnpm typecheck` | xanh (root + server + web + mobile) |
| Script thử (scratchpad): độ nhạy vân tay, cách lách, dựng lại chữ | xem dưới |

Kết quả thử bằng script trên dữ liệu thật:
- Nếu gỡ liên kết sách, 70/70 quest hiện tại đều bị bắt (36 Toán, 34 Tiếng Việt), nên ngưỡng 2 shingle bắt tốt với nội dung hiện có.
- Bài đọc "Tôi là học sinh lớp 2" (159 từ, 153 shingle trùng) khai `source.kind: "folk"` → **0 dòng bị báo**.
- Cùng bài đó cắt thành 27 lời thoại, mỗi lời 6 từ → **0 dòng bị báo**.
- Thay 1 từ sau mỗi 6 từ → 0 shingle trùng (giới hạn vốn có của shingle 7 từ, chấp nhận được).
- **Dựng lại văn bản từ `.bin`**: lấy 6 từ đầu bài làm mồi, vốn từ 10.836 âm tiết lấy từ quest không phải SGK, thử từng từ thứ 7 → dựng lại đúng 66/66 từ (dừng vì giới hạn vòng lặp, không phải vì thất bại).

## Đánh giá chung

Khung schema gọn, không có import vòng (`learning.ts` → `content.ts`; `curriculum.ts` → cả hai; `content.ts` không import ngược). `objective`/`expression` không lộ ra client: `QuestStepPublic` dùng `z.object` (strip), `QuestView.parse` bỏ khóa lạ, `texts` của QuestView không có `source`. Luật năm mất đúng: `died ≤ year − 51` ⇔ bảo hộ hết 31/12 năm `died + 50` (2026: mất 1975 được, 1976 bị chặn — test khóa). Tuy vậy, cổng chống chép, phần quan trọng nhất về pháp lý của pha này, có lỗ hổng thật, và tệp vân tay đi ngược mục tiêu của plan.

## Critical

### C1. `textbook-fingerprints.bin` cho phép dựng lại nguyên văn SGK
Plan T3 và code ghi "không đọc ngược ra chữ được". Sai: shingle 7 từ chồng nhau (6 từ chung), băm 40 bit, 26.620 mục → tỉ lệ trùng ngẫu nhiên khoảng 2,4·10⁻⁸ trên mỗi lần thử. Có 6 từ mồi (câu mở đầu thường tìm được trên mạng, hoặc để mô hình ngôn ngữ đoán) thì thử khoảng 10⁴ âm tiết là ra từ tiếp theo, rồi cứ thế ra cả bài. Đã chạy thử: dựng lại đúng 66 từ của bài Văn Giá. Repo công khai, nên tệp này **vẫn phát hành văn bản SGK dưới dạng dựng lại được**, trái với lý do cốt lõi của plan.
Cách sửa (chọn 1):
- A. Băm có khóa (HMAC-SHA256, khóa để trong CI secret và env iCloud). Không có khóa thì không dựng lại được. Nhược điểm: fork/PR ngoài không chạy được kiểm (bỏ qua có cảnh báo khi thiếu khóa).
- B. Winnowing/lấy mẫu: chỉ giữ shingle có `hash mod k == 0` (k = 4–8), làm đứt chuỗi dựng lại. Nhược điểm: dòng ngắn 8–10 từ dễ lọt hơn, cần chỉnh lại ngưỡng theo số shingle mẫu.
- C. Kết hợp A + B. **Khuyến nghị A** (giữ độ nhạy hiện tại, xóa được lỗ hổng); nếu không muốn có secret thì dùng B.
Lưu ý: tệp hiện tại chưa commit, nên sửa bây giờ chưa có gì phải gỡ khỏi lịch sử git.

## High

### H1. Miễn quét bài đọc `folk` / `public-domain` mà không cần chứng cứ → nhãn là lách được
`isExempt` bỏ hẳn `body` khỏi kiểm. Chỉ cần đổi `source` của bài SGK (kể cả bài của tác giả còn bảo hộ) sang `{ "kind": "folk" }` là qua cổng (đã thử). `folk` không bắt buộc `title`/`note`, nên điều "phải khai đủ nguồn" ở việc 6 không được máy kiểm. Bảng rủi ro của plan viết "vân tay vẫn quét, trùng thì phải giải thích trong `source`", nhưng code không làm vậy. Truyện cổ tích **luôn kể lại bằng lời mình** (doc comment của `TextSource`), nên không có lý do miễn cho truyện.
Cách sửa: vẫn quét bài folk/PD; khi trùng thì bắt buộc có mục duyệt riêng (ví dụ `allowed-folk-passages.json` theo `questId/textId`, kèm `reason` và tên bản truyền thống), và folk bắt buộc `title`. Ca dao/đồng dao đúng bản truyền thống vẫn qua được, nhưng mỗi ngoại lệ phải có người duyệt nhìn thấy.

### H2. Luật "danh sách chờ chỉ được co lại" chưa được máy kiểm
`checkTextbookCopy` chỉ bắt id không tồn tại và quest phải rời danh sách. **Thêm** id mới vào `textbook-copy-pending.json` (một quest mới chép SGK, hoặc đưa lại quest đã viết lại) thì cổng không báo gì, và quest đó được miễn toàn bộ luật. Plan, rule `.claude/rules/quest-content.md` và header file đều tuyên bố "chỉ co lại".
Cách sửa: mỗi id trong danh sách phải thỏa `isTextbookQuest(id)` **và** thuộc một baseline cố định (hằng số 70 id trong code, hoặc test khóa sha256 của danh sách ban đầu và kiểm `pending ⊆ baseline`). Thêm test cho trường hợp danh sách bị nới thêm.

### H3. Quest đã rời danh sách vẫn có thể phát phiếu viết in nguyên văn SGK
`textbookLinks` không xem `worksheet.lessonId`. Phiếu được dựng từ kiểm kê (`worksheet-builder.ts`: `item.prompt`, bài nghe–viết `section.text.body`). Nếu quest viết lại xong ở pha 4/5 còn giữ bước `worksheet` trỏ bài sách (40 quest có bước này), nó sẽ qua cổng nhưng vẫn in chữ SGK. Cách sửa: tính `worksheet.lessonId` là liên kết sách cho tới khi pha 6 đổi nguồn phiếu.

### H4. Bỏ hẳn kiểm đáp án cho 70 quest đang chạy production
`curriculum-links.ts` xóa `answerIssues` (riddle/quiz/multi-select/fill-blank/clock/calendar so với đáp án sách, tính lại từ `expression` của kiểm kê) cùng với kiểm nguyên văn D8. Kiểm nguyên văn mâu thuẫn với luật mới thì đúng là phải bỏ. Còn kiểm **đáp án đúng** thì không mâu thuẫn, và 70 quest này vẫn `active` qua nhiều pha (pha 4/5 còn sửa từng phần). Giờ gõ nhầm đáp án trong một quest đang chờ viết lại sẽ qua cổng mà không bị báo. Cách sửa: giữ `answerIssues` cho quest còn `curriculumRef` (xóa ở pha 7 cùng kiểm kê).

## Medium

### M1. Cổng không quét chữ ghép từ nhiều chuỗi ngắn
Mỗi chuỗi được đếm riêng; dòng ≤ 7 từ không bao giờ đạt 2 shingle. Cắt một câu SGK thành ô `sort`/`classify`, lựa chọn, hoặc nhiều lời thoại ngắn là lọt (đã thử với lời thoại 6 từ). Dạng "xếp từ thành câu" (`xep-tu`, `dat-cau`) chính là trường hợp này: đáp án là câu SGK chia thành ô. Cách sửa: quét thêm chuỗi ghép theo bước, gồm lời thoại nối tiếp, ô `sort` theo `answer.order`, `template` có ô trống đã điền đáp án.

### M2. Chữ trong `content/learning/topics/**` không qua cổng chống chép, và đang trùng tên bài SGK
Quét thử: `cong-tru-co-nho.json` có 2 mục tiêu trùng 6 shingle ("Cộng/Trừ có nhớ số có hai chữ số với số có một hoặc hai chữ số"), `bai-toan-co-loi-van.json` 3–5 shingle ("Giải bài toán về thêm, bớt / nhiều hơn, ít hơn một số đơn vị"), `tu-ngu-tinh-cam.json` 2. Theo plan, `title`, `summary` và `objectives[].text` là chữ người chơi thấy (trang chủ đề ở pha 2), mà N1 bỏ "tên bài". Cách sửa: thêm topic vào `checkRepoTextbookCopy` (bỏ qua `gdpt.requirements` vì đó là văn bản pháp luật) và viết lại các câu trên.

### M3. Cụm chữ được phép (allowed phrases) đang dùng để hợp thức hóa chữ trùng thay vì viết lại
Mục `"người viết ra cuốn sách được gọi là tác giả, tên của"` bị cắt giữa câu đúng chỗ đủ để che các shingle trùng của `ward-thu-vien-phong-doc.json`. Đây là câu định nghĩa lấy từ bài đọc SGK, không phải "cách nói chung". Danh sách được phép còn có tác dụng toàn cục (cho phép cụm đó ở mọi quest, kể cả bài đọc). Nên viết lại dòng của quest ward rồi bỏ mục này. Cũng nên giới hạn cụm được phép ≤ 1 câu và cấm dùng cho `texts.*.body`.

### M4. Test chống lộ `objective|expression` là test hình thức
Fixture `apps/server/test/fixtures/quests/quest-sgk.json` không có `objective`, `expression`, thậm chí không có `curriculumRef`. Regex `not.toMatch` vì vậy không chứng minh được gì. Hiện tại chúng không lộ vì `QuestStepPublic` dùng `z.object` (strip), nhưng không test nào giữ được điều đó nếu sau này ai đổi sang `passthrough`/`looseObject`. Cách sửa: thêm `objective` + `expression` vào một bước của fixture.

### M5. Độ phủ theo mục tiêu đếm cả quest `draft`
`checkLearningLinks` nhận mọi quest không phải `stub`. Bước của quest nháp (chưa chạy trên production) vẫn được tính là đã phủ mục tiêu ở cổng cứng. Nếu ý định là "người chơi luyện được", chỉ nên đếm quest `active`. Nếu cố ý (giống `curriculum-links` cũ, cũng đếm draft) thì nên ghi rõ trong comment.

### M6. Tiêu chí 3 (thêm lớp khác không sửa code) mới đạt một phần
Fixture "lớp 3" dùng `phep-cong` và phép cộng lặp. Nội dung lớp 3 thật (nhân/chia) cần skill mới, mở rộng `evaluateExpression` và sửa `CALCULATED_SKILLS` (hằng số trong code). Ngoài ra, `nhan-voi-2` (bảng nhân 2) là yêu cầu cần đạt **lớp 2** của GDPT 2018 (Toán 2 tập hai), nên fixture gắn `grade: 3` sai về sư phạm. Nên đổi fixture sang một chủ đề lớp 3 thật hơn (ví dụ "bảng nhân 6") và ghi rõ giới hạn của `expression`. Test cũng chỉ gọi `loadLearningTopics`, không đi qua `loadContentCatalog` như phần "Kết quả" đã ghi.

## Low

- L1. `learningQuestIssues` chỉ kiểm mục tiêu cùng môn, không kiểm cùng chủ đề. Điều này hợp lý (chủ đề không có quest riêng như `chinh-ta`, `viet`, `noi-va-nghe` cần bước của quest khác), nhưng nên ghi rõ trong comment là cố ý.
- L2. `readTopicFiles`: JSON hỏng thì `JSON.parse` ném lỗi, không được gom vào `issues` như comment hứa.
- L3. `checkRepoTextbookCopy` luôn đọc vân tay và danh sách chờ của repo, bỏ qua tham số `dir` của `checkContent(dir)`. Hiện chưa gây lỗi, nhưng không nhất quán.
- L4. `CALCULATED_SKILLS` chỉ bắt buộc `expression` cho `riddle`. Quiz/fill-blank tính toán của quest đã viết lại có thể bỏ `expression`, và đáp án lại thành "gõ tay". `expression` cũng không bị đối chiếu với số trong câu hỏi (có thể ghi `3 + 4` cho câu "5 + 2"; ít rủi ro).
- L5. Chuẩn hóa không đồng nhất kiểu bỏ dấu cũ/mới (`hoà`/`hòa`, `thuỷ`/`thủy`); thay kiểu bỏ dấu là thoát vân tay. Nên chuẩn hóa cả hai kiểu trước khi băm (phải sinh lại `.bin`; làm cùng lúc với C1).
- L6. `TextSource.public-domain` chỉ có một `author`. Tác phẩm đồng tác giả tính bảo hộ theo người mất sau cùng, và tác phẩm khuyết danh là 75 năm từ lần công bố đầu (Điều 27). Hiện chưa có trường hợp nào; chỉ ghi lại.

## Sư phạm (GDPT 2018, lớp 2)

Nhìn chung bám mạch nội dung: Toán có "Số và phép tính", "Hình học và đo lường"; Tiếng Việt có "Đọc", "Viết", "Nói và nghe", "Kiến thức tiếng Việt". Yêu cầu Toán trích đúng ("không nhớ, có nhớ không quá một lượt… phạm vi 1000", "kim phút chỉ số 3, số 6"). Điểm cần xem:
- **Không mục tiêu nào luyện `doc-thanh-tieng`.** Yêu cầu "Đọc đúng, rõ ràng…; biết ngắt hơi/ngắt nhịp" nằm trong `doc-truyen`, `doc-tho`, nhưng mục tiêu chỉ có đọc hiểu. Khi viết lại, cổng phủ sẽ không đòi bước đọc thành tiếng (thu âm D2). Nên thêm mục tiêu `doc-truyen-doc-to` / `doc-tho-doc-to` (practice `doc-thanh-tieng`).
- `cong-tru-co-nho-hai-dau`: văn bản là "tính hai dấu và so sánh", nhưng `practice` chỉ có `so-sanh`, không đòi `tinh`.
- `khoi-luong-dung-tich` có tiêu đề "Nặng, nhẹ: ki-lô-gam và lít" (lít không thuộc "nặng nhẹ"). Nên đổi thành "Ki-lô-gam và lít".
- Cấu trúc chủ đề Toán gần như trùng 1:1 với 7 chủ đề của sách (khác plan "không theo chủ đề sách"). Không phải rủi ro bản quyền (vì GDPT quy định nội dung), nhưng mục tiêu nên viết bằng lời mình (xem M2).
- Phần Tiếng Việt `gdpt.requirements` được mô tả là "trích yêu cầu cần đạt", nhưng nhiều câu có vẻ là diễn đạt lại (ví dụ GDPT ghi "Bảng chữ cái tiếng Việt, sự khác nhau giữa tên chữ cái và âm" là nội dung, không phải câu yêu cầu). Nên đối chiếu nguyên văn Thông tư 32, hoặc sửa doc comment thành "tóm tắt".

## Edge case từ scout

- Import vòng: không có (đã kiểm đồ thị import của `packages/schema/src`).
- Server boot: thiếu thư mục topics thì mọi quest có `topic` làm boot lỗi ("unknown topic"). `content/` được deploy nguyên khối nên không sao, nhưng cần nhớ khi đổi quy tắc bundle.
- Năm hiện tại lấy theo giờ máy (`new Date().getFullYear()`): CI chạy UTC, lệch 7 giờ quanh Giao thừa. Không đáng kể.
- Hàm băm 40 bit / 26.620 mục: báo nhầm ngẫu nhiên không đáng kể. Vân tay có cả id kiểm kê (`toan2-t1-b01-luyen-tap-…`) vì `strings()` lấy mọi chuỗi; vô hại vì id nằm trong `NOT_TEXT`.

## Việc nên làm (theo thứ tự ưu tiên)

1. C1: đổi vân tay sang HMAC có khóa (hoặc winnowing), sinh lại `.bin` **trước khi commit** và trước khi xóa `content/curriculum`; sửa câu "không đọc ngược được" trong plan và code.
2. H2: khóa danh sách chờ theo baseline 70 id.
3. H1: quét cả bài folk/PD; trùng thì cần mục duyệt có lý do; folk bắt buộc `title`.
4. H3: tính `worksheet.lessonId` là liên kết sách.
5. H4: giữ kiểm đáp án theo kiểm kê cho quest đang chờ.
6. M1–M3: quét chuỗi ghép theo bước; quét chữ của topic; viết lại dòng ward thay vì thêm cụm được phép.
7. M4–M6 và phần sư phạm (mục tiêu đọc thành tiếng).

## Theo dõi plan

Việc 1–8 của pha 1 đã có code và test. Tuy vậy, việc 5 (tệp "không đọc ngược được") và việc 6 ("chỉ được co lại", "folk/PD phải khai đủ nguồn") **chưa đạt đúng như đã ghi**. Đề nghị lead đổi trạng thái pha 1 từ `done` thành `in-progress` cho tới khi xử lý xong C1, H1–H4. Pha 3 (quest mẫu) nên chờ H1 và M1, vì người viết sẽ dựa vào cổng này.

## Số liệu

- Typecheck: sạch. Lint (file đã đổi): 0. Test đã chạy: 9 file, 133 test xanh.
- Độ phủ test: chưa đo (không chạy coverage trên máy dùng chung).

## Câu hỏi chưa giải quyết

1. C1: chọn HMAC có khóa trong CI secret (fork/PR ngoài không chạy được kiểm) hay winnowing không khóa (kém nhạy hơn với dòng ngắn)? Khuyến nghị: HMAC.
2. Độ phủ mục tiêu có nên đếm quest `draft` không (M5)?
3. Câu `gdpt.requirements` Tiếng Việt có phải trích nguyên văn Thông tư 32 không, hay chấp nhận tóm tắt?
