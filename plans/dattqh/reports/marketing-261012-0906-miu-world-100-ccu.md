# Vì sao Miu World chưa có người chơi, và đường tới 100 CCU

Ngày 12/10/2026. Playbook `product-discovery` (ak-play), chặng bằng chứng và định hướng. Nguồn chi tiết:
[thị trường và đối thủ](researcher-261012-0854-market-competitors.md),
[người chơi và kênh](researcher-261012-0854-audience-channels.md).

## Kết luận

Game không thiếu nội dung: có 12 map, 70 quest bám SGK và bạn máy. Chưa có người chơi vì **cửa vào đang đóng và chưa ai biết tới game**.

Số đo trên production lúc 08:55 ngày 12/10: 2 tài khoản Google, cả hai đều phía chủ, 0 người chơi bên ngoài.

## Nguyên nhân, xếp theo mức chặn

1. **Người lạ không đăng nhập được.** Consent screen Google OAuth còn ở chế độ Testing, nên chỉ test user đã khai báo mới qua được (`docs/deployment-guide.md` §7, việc còn lại số 1). Kể cả có người tìm tới, họ cũng bị chặn ngay ở nút đầu tiên. *Cập nhật 12/10/2026 09:15: người sở hữu đã chuyển sang "In production". Server vẫn dẫn sang Google đúng `redirect_uri` và scope; còn chờ một tài khoản ngoài danh sách test user đăng nhập thử.*
2. **Chưa từng ra mắt.** Chưa có bất kỳ kênh, bài giới thiệu, nhóm cộng đồng hay người giới thiệu nào.
3. **Link không tự giới thiệu được.** `index.html` chỉ có `<title>Miu World</title>`: không có mô tả, không có ảnh xem trước Open Graph, không có favicon. `/robots.txt`, `/sitemap.xml` và `/llms.txt` đều trả về HTML của SPA. Dán link vào Zalo hay Facebook chỉ hiện một dòng chữ trơn. Trong khi đó báo chí liên tục cảnh báo về trang đăng nhập Google giả, nên phụ huynh có lý do để ngại bấm.
4. **Phải đăng nhập trước khi thấy bất cứ gì.** Trang `/` chuyển thẳng sang `/login`: không có trang giới thiệu, không có chơi thử. Ở Việt Nam, Google chỉ cho tự quản lý tài khoản từ 15 tuổi, nên với trẻ lớp 2 người phải bấm đăng nhập luôn là phụ huynh.
5. **Không đo được gì.** Quy tắc không cho dùng analytics bên thứ ba, và cũng chưa có số đếm phía server cho lượt vào trang, đăng ký, người chơi mỗi ngày hay CCU. Mở cửa rồi cũng chưa biết người chơi rơi ở bước nào.
6. **Định vị lệch với nội dung.** Lời giới thiệu là "mọi lứa tuổi, online kiểu Minecraft", nhưng phần học chỉ có lớp 2. Lợi thế thật là **Toán 2 và Tiếng Việt 2 bộ Kết nối tri thức** (`content/curriculum/*/book.json`). Đây là bộ duy nhất cả nước dùng từ năm học 2026–2027, và chưa đối thủ nào gói nó thành thế giới 3D nhiều người chơi, miễn phí, không quảng cáo.
7. **Pháp lý chưa rõ.** Theo tóm tắt của báo, Nghị định 147/2024 xếp game nhiều người tương tác qua máy chủ vào nhóm G1. Nhóm này cần giấy phép, xác thực người chơi bằng số điện thoại, và giới hạn người dưới 18 tuổi 60 phút mỗi game mỗi ngày. Chưa đối chiếu văn bản gốc; người sở hữu cần quyết (xem mục Quyết định).

## 100 CCU nghĩa là bao nhiêu người

CCU lúc cao điểm = số người chơi mỗi ngày (DAU) × số phút chơi rơi vào giờ cao điểm / 60. Các mốc tham khảo cho tỷ lệ DAU/CCU là 6–12 lần, nhưng chưa được kiểm định độc lập.

| | Thấp | Giữa | Cao |
|---|---|---|---|
| Người chơi mỗi ngày | 450 | 800 | 1.500 |
| Người chơi mỗi tháng | 1.800 | 5.300 | 15.000 |
| Tài khoản đã đăng ký | 5.000 | 20.000 | 60.000 |

Quy ra lớp học: khoảng 15–30 lớp 2 dùng thật, mỗi lớp trung bình 31,8 em, chơi dồn vào buổi tối 19h–21h.

**Thời hạn.** Tập 1 khớp với học kỳ I, kéo dài tới giữa tháng 1/2027, nghĩa là còn khoảng 3 tháng khớp đúng bài các em đang học. Cửa sổ tiếp theo là kỳ ôn hè tháng 6–8.

## Phân khúc và định vị (Jev đã chốt)

- **Phân khúc đầu tiên:** gia đình có con lớp 2, tiếp cận qua giáo viên chủ nhiệm (gửi link vào nhóm Zalo lớp) và nhóm phụ huynh. Jev chọn với xác suất 1.0, so với 0 cho người chơi Minecraft/Roblox 8–14 tuổi và 0 cho "mọi lứa tuổi".
- **Thông điệp:** "Ôn Toán và Tiếng Việt lớp 2 (Kết nối tri thức) trong một thế giới 3D, chơi cùng bạn, miễn phí, không quảng cáo." "Mọi lứa tuổi" vẫn là định hướng sản phẩm, nhưng không dùng làm lời mời đầu tiên.
- **Bước đầu tiên:** làm trang dễ chia sẻ và đo được trước, rồi mới gieo kênh. Jev chọn với xác suất 1.0, so với 0 cho "gieo kênh ngay" và 0 cho "làm thêm nội dung trước".

## Lộ trình theo mốc

### Mốc 0 — Mở cửa (điều kiện cho mọi thứ sau)

| Việc | Ai làm |
|---|---|
| Google Cloud Console: điền homepage và privacy URL, xác minh `hoandat.com` trong Search Console, chuyển Publishing status sang "In production" | Người sở hữu |
| Thêm meta description, ảnh xem trước Open Graph và Zalo, `robots.txt`, `sitemap.xml` thật (favicon và icon PWA đã xong 12/10, logo Google đã xác minh) | AI |
| Trang giới thiệu ở `/` cho người chưa đăng nhập: ảnh game, lợi ích cho phụ huynh, nút "Chơi ngay" | AI |
| Số đếm phía server (không dùng script bên thứ ba): lượt vào trang, đăng ký, đồng ý chính sách, vào map đầu, quest đầu xong, DAU, CCU cao điểm mỗi ngày | AI |
| Kiểm tải cho 100 người chơi thật cùng lúc kèm bạn máy (test tải hiện có đo 500 bạn máy với 4 người chơi, chưa đo 100 người thật) | AI |

### Mốc 1 — 10 CCU (khoảng 80 người chơi mỗi ngày, 3–5 lớp)

- Giờ chơi chung cố định mỗi tối (ví dụ 19h30), có bạn máy và sự kiện trong game, để người chơi chắc chắn gặp nhau.
- Mỗi bài SGK một trang có link sâu, khớp với cách giáo viên tìm "trò chơi khởi động Tiếng Việt 2 bài …".
- 3–5 giáo viên lớp 2 dùng thử: chiếu lên màn hình làm phần khởi động rồi gửi link cho phụ huynh. Bộ GD&ĐT cấm giao bài tập về nhà cho tiểu học học 2 buổi mỗi ngày, nên không định vị Miu là bài tập về nhà.
- Clip ngắn 15–30 giây cảnh chơi cho nhóm phụ huynh và TikTok.

### Mốc 2 — 100 CCU (15–30 lớp, trước giữa tháng 1/2027)

- Mở rộng giáo viên giới thiệu theo trường và theo quận.
- Thêm link mời bạn: bé mời bạn cùng lớp vào cùng party.
- Gửi phụ huynh bản tổng kết tuần lấy từ phiếu chép vở có sẵn.
- Không làm cổng game web (Poki, CrazyGames) hay quảng cáo trả tiền: sai đối tượng và tốn tiền.

## Việc của người và việc của AI

- **Chỉ người làm được:** chuyển OAuth sang production; quyết chuyện pháp lý; liên hệ giáo viên và đăng vào nhóm phụ huynh (nhóm kín, cần tài khoản thật).
- **AI làm được khi người sở hữu đồng ý:** các việc AI ở Mốc 0, trang theo bài, giờ chơi chung, link mời bạn, kiểm tải, soạn sẵn nội dung cho clip và bài đăng.

## Quyết định cần người sở hữu (kèm tư vấn của Jev)

| Câu hỏi | Phương án | Jev |
|---|---|---|
| Có thêm chơi thử không cần đăng nhập không? Chỉ quest một người và bạn máy; tiến độ giữ lại nếu sau đó đăng nhập | Thêm chơi thử | 0,50 |
| | Giữ bắt buộc đăng nhập Google | 0,50 (Jev không nghiêng, `escalate`) |
| Xử lý Nghị định 147/2024 trước khi mời người ngoài thế nào? | Xin ý kiến pháp lý trước khi có bất kỳ người chơi ngoài nào | **0,88** |
| | Mở beta nhỏ vài lớp, song song xin ý kiến pháp lý | 0,12 |
| | Coi như chưa áp dụng, mở rộng tự do | 0,00 |

Jev tự quyết trong lượt này:
- Skill: `ak-play`. Jev được 0,46, gần sát `ak-launch-strategy` 0,45 và báo `escalate`; vẫn dùng lựa chọn của Jev theo cách làm đã thống nhất.
- Phân khúc: gia đình lớp 2 (1,0).
- Bước đầu tiên: trang dễ chia sẻ và đo được (1,0).

## Câu hỏi còn mở

- Pháp lý theo Nghị định 147/2024: hai báo cáo nghiên cứu mới dựa trên tóm tắt của báo và trang luật, chưa đối chiếu văn bản gốc, và không phải tư vấn pháp lý.
- Chưa có số liệu 2024–2026 về thiết bị trẻ 6–10 tuổi ở Việt Nam dùng nhiều nhất. Nếu phần lớn là điện thoại Android tầm thấp chứ không phải iPad, mức chất lượng `low` sẽ quyết định trải nghiệm đầu tiên.
- Không đếm được thành viên các nhóm Facebook và Zalo của phụ huynh, giáo viên (nhóm kín).
