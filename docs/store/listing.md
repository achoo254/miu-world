# Hồ sơ store của Miu World (App Store, Google Play)

Bản nháp ngày 23/10/2026, dựng từ code và chính sách đang chạy (`content/legal/privacy-vi.json` v5, `apps/server`, `apps/mobile`). Người sở hữu duyệt trước khi nhập vào App Store Connect và Play Console. Ảnh và cách chụp lại: [`README.md`](README.md).

## ⛔ Chặn phát hành (sửa hoặc quyết định trước khi gửi duyệt)

| # | Vấn đề | Bằng chứng | Hệ quả | Đề xuất |
| --- | --- | --- | --- | --- |
| B1 | **Tài khoản người duyệt không vào được Miu.** Tài khoản duyệt của auth-next (ADR 0010) có `email_verified: false` và `amr: ["pwd", "review"]`; Miu từ chối mọi danh tính có email chưa xác minh. | `apps/server/src/auth/idp-account-link.ts:36` (`email-unverified`); `auth-next/docs/decisions/0010-review-only-password-sign-in.md` §4 | Apple 2.1 (phải có tài khoản demo dùng được), Play "App access": bị từ chối ngay. | Miu nhận danh tính có `amr` chứa `review` từ đúng issuer chính, tạo tài khoản mới, không bao giờ liên kết theo email. Thay đổi ở luồng đăng nhập, cần người sở hữu duyệt (`.claude/rules/server-and-child-safety.md`). |
| B2 | **Tài khoản chỉ có một người chơi không tìm được nút Xóa tài khoản hay Đăng xuất trong app.** "Quản lý tài khoản" (`/parent`, nơi có Xóa tài khoản, Đăng xuất) chỉ mở từ màn chọn người chơi `/profiles`; nút "Đổi người chơi" trong Cài đặt chỉ hiện khi có từ 2 người chơi. Tài khoản mới chỉ có một người chơi. | `apps/web/src/ui/system/settings-dialog.tsx:13`; `account/profile-screens.tsx:142`; `account/account-data-panel.tsx` | Apple 5.1.1(v) (xóa tài khoản phải tìm được trong app); Play yêu cầu xóa tài khoản trong app. | Cài đặt luôn có nút "Quản lý tài khoản" tới `/parent` (vẫn qua PIN nếu đã đặt). Thay đổi nhỏ ở UI, chưa làm trong lượt này. |
| B3 | **Google Analytics (GA4) trong một app mà người duyệt sẽ coi là dành cho trẻ.** Máy chủ chuyển sự kiện của app (mở trang, chia sẻ, xong nhiệm vụ…) tới GA4 qua Measurement Protocol, kèm mã ngẫu nhiên của bản cài; không email, mã tài khoản, IP. Nội dung là SGK lớp 2. | `apps/server/src/analytics/ga4-forwarder.ts`; `packages/schema/src/analytics.ts`; mục "Số liệu sử dụng ẩn danh" của chính sách | Apple 5.1.4: app chủ yếu cho trẻ không nên có analytics bên thứ ba (chỉ ngoại lệ hẹp của 1.3). Kids Category thì cấm hẳn. Play Families: phải khai báo, và nhà cung cấp phải chấp nhận dữ liệu từ trẻ. | Khuyến nghị: máy chủ không gửi GA4 cho phiên của app (phiên Bearer), web giữ nguyên. Cần người sở hữu chốt (đổi cách thu dữ liệu; sửa đoạn chính sách nói app cũng gửi). Nếu giữ: ghi trong Review Notes theo ngoại lệ 1.3 và chấp nhận rủi ro bị từ chối. |
| B4 | **Chính sách Families của Play, nếu khai đối tượng gồm trẻ dưới 13 (đề xuất ở dưới).** Có nói chuyện bằng giọng với bạn bè/tổ đội và kết bạn, nhưng: chưa có lời nhắc "an toàn trên mạng" trước khi trẻ trao đổi; người lớn chưa khóa được nói chuyện bằng giọng hay chơi online cho người chơi phụ (người chơi tự bật lại được; online luôn bật). | `content/legal/privacy-vi.json` mục "Khi chơi online"; i18n `voice.*` không có lời nhắc | Play Families "Social features": app xã hội có trẻ trong đối tượng phải có lời nhắc an toàn và cách cho người lớn quản lý tính năng xã hội. | Thêm lời nhắc trước cuộc gọi/tổ đội đầu tiên và công tắc của chủ tài khoản cho từng người chơi phụ. Trái với nguyên tắc "không đặt tính năng sau phụ huynh" (`.claude/rules/product-audience.md`) chỉ khi bắt buộc, nên là quyết định của người sở hữu. |
| B5 | Điều kiện sẵn có của plan (pha 7): kiểm duyệt chạy trên production, pháp lý Việt Nam (game online, Nghị định 13/2023) đã xác nhận hoặc loại Việt Nam khỏi danh sách nước, đo máy thật đạt. | `plans/dattqh/261007-2038-mobile-app-ios-android/phase-07-store-internal-release.md` | Không gửi duyệt công khai trước khi đủ. | Bản thử nội bộ (TestFlight, Play internal) không bị chặn bởi B3–B5; B1 chặn cả TestFlight external review. |

Việc của người sở hữu, không chặn kỹ thuật nhưng cần trước khi gửi: URL hỗ trợ riêng (xem mục URL); ảnh nổi bật Play 1024 × 500 (chưa có; các ảnh `assets/generated/channel-kit/` là cỡ YouTube/Facebook); trả lời "Export compliance" (chỉ dùng HTTPS chuẩn: exempt, có thể thêm `ITSAppUsesNonExemptEncryption = NO` vào `Info.plist` để khỏi hỏi mỗi bản); kiểm "Privacy Report" của bản archive (app không có `PrivacyInfo.xcprivacy` riêng; các gói Capacitor tự mang manifest của chúng); điền mật khẩu người duyệt từ tệp credential (mục `apple-app-review-demo`), không ghi vào repo.

## Định vị và danh mục

- Đối tượng (người sở hữu, 05/10/2026): mọi lứa tuổi, vừa chơi vừa học; trẻ chơi bằng người chơi phụ trong tài khoản người lớn.
- **Apple: không chọn Kids Category** (quyết định trong plan: game cho mọi lứa tuổi, có tương tác với người chơi khác). Hệ quả theo Guideline 1.3: metadata của app ngoài Kids Category **không được dùng "For Kids", "For Children"** ("cho bé", "dành cho trẻ em"); bản mô tả dưới đây đã tránh.
- Apple: Primary category **Games**, subcategories **Educational**, **Adventure**; Secondary category **Education**.
- Google Play: Ứng dụng → **Trò chơi**, thể loại **Giáo dục** (Educational); thẻ: Phiêu lưu, Giáo dục, Đố vui.
- Giá: miễn phí, không mua trong app, không quảng cáo.
- Thiết bị: iPhone và iPad (`TARGETED_DEVICE_FAMILY = "1,2"`), Android điện thoại và máy tính bảng.

## Nội dung trang store

### Tiếng Việt (vi)

- **Tên** (≤ 30): `Miu World`
- **Phụ đề Apple** (≤ 30): `Phiêu lưu 3D, ôn bài lớp 2`
- **Mô tả ngắn Play** (≤ 80): `Phiêu lưu 3D, ôn bài Toán và Tiếng Việt lớp 2 cùng bạn bè.`
- **Promotional text Apple** (≤ 170): `Mười hai vùng đất khối để khám phá, mỗi nhiệm vụ ôn một bài trong sách Toán 2 và Tiếng Việt 2. Chơi một mình hoặc cùng bạn bè.`
- **Từ khóa Apple** (≤ 100, phân tách bằng dấu phẩy, không lặp tên app): `toán lớp 2,tiếng việt lớp 2,ôn tập,phiêu lưu,thế giới khối,voxel,giáo dục,đố vui` (80 ký tự; nếu App Store Connect báo quá dài vì đếm byte, dùng bản không dấu `toan lop 2,tieng viet lop 2,on tap,hoc toan,phieu luu,voxel,giao duc,do vui,sgk`). Không dùng tên game khác (Minecraft) hay tên nhà xuất bản.
- **Mô tả** (Apple và Play):

```text
Miu World là trò chơi phiêu lưu trong thế giới khối 3D, nơi kiến thức là chìa khóa mở đường. Mỗi nhiệm vụ ôn đúng một bài trong sách Toán 2 và Tiếng Việt 2: giải câu đố của cây cổ thụ, đếm táo cho bạn Hải ly, đọc thư tìm manh mối, vượt suối bằng những phép tính.

KHÁM PHÁ
• Mười hai vùng đất: Khu rừng bí mật, Trường học, Làng ven sông, Chợ phiên, Lâu đài, Núi tuyết, Đảo bí ẩn… nối với nhau qua Trung tâm.
• Ngôi nhà riêng để trang trí, thú cưng để chăm sóc, đồ vật và trang phục để sưu tầm.

HỌC MÀ NHƯ CHƠI
• Câu hỏi bám chương trình lớp 2, có Hướng dẫn, Gợi ý và Đáp án kèm giải thích; xem đáp án không bị khóa tiến trình.
• Câu đọc to, luyện nói, thử thách cùng trùm khu vực, sự kiện Olympic Toán.
• Phần thưởng do máy chủ tính: điểm kinh nghiệm, Xu, kỹ năng, sổ sưu tập.

CHƠI CÙNG BẠN BÈ
• Gặp các bạn ở Trung tâm, kết bạn, lập tổ đội và chơi nhiệm vụ co-op.
• Không có ô chat tự gõ: chỉ câu có sẵn và vẫy tay. Nói chuyện bằng giọng chỉ với bạn bè và tổ đội, không ghi âm, không lưu.
• Chặn và báo cáo người chơi ngay trong game; có người kiểm duyệt xem xét.

AN TÂM CHO GIA ĐÌNH
• Miễn phí, không quảng cáo, không mua trong app.
• Không thu tên thật, tuổi hay ảnh; tên người chơi chọn từ danh sách.
• Một tài khoản có tối đa ba người chơi cho máy dùng chung; mã PIN tùy chọn bảo vệ mục Quản lý tài khoản.
• Tải về hoặc xóa toàn bộ dữ liệu bất cứ lúc nào trong mục Quản lý tài khoản.

Cần kết nối mạng để chơi và lưu tiến độ. Đăng nhập bằng tài khoản Google, GitHub hoặc Apple qua auth.hoandat.com.
Quyền riêng tư: https://miu.hoandat.com/privacy
```

### English (en)

- **Name**: `Miu World`
- **Apple subtitle** (≤ 30): `3D adventure, Grade 2 lessons`
- **Play short description** (≤ 80): `A 3D block-world adventure where every quest reviews a Grade 2 lesson.`
- **Promotional text**: `Twelve block worlds to explore, and every quest reviews a lesson from the Vietnamese Grade 2 Math and Vietnamese-language textbooks. Play solo or with friends.`
- **Apple keywords**: `grade 2 math,vietnamese,learning game,adventure,voxel,block world,quiz,education,lessons,review` (95)
- **Description**:

```text
Miu World is an adventure in a 3D block world where knowledge opens the way. Every quest reviews one lesson from the Vietnamese Grade 2 Math and Vietnamese-language textbooks: solve the old tree's riddle, count apples for the beaver, read letters for clues, cross the stream with sums.

EXPLORE
• Twelve lands — the Secret Forest, the School, the Riverside Village, the Market, the Castle, the Snowy Mountain, the Mystery Island and more — linked through the Centre.
• Your own house to decorate, a pet to look after, items and outfits to collect.

LEARN BY PLAYING
• Questions follow the Grade 2 curriculum, with Guide, Hint and Answer-with-explanation; seeing the answer never blocks progress.
• Read-aloud questions, speaking practice, zone guardian duels and a Math Olympiad event.
• Rewards are worked out by the server: XP, coins, skills and a collection book.

PLAY WITH FRIENDS
• Meet others in the Centre, add friends, form a party and play co-op quests.
• No free-text chat: only ready-made phrases and waves. Voice chat only with friends and party members, never recorded or stored.
• Block and report players in the game; moderators review reports.

PEACE OF MIND
• Free, no ads, no in-app purchases.
• No real names, ages or photos; player names are picked from a list.
• Up to three players per account for shared devices; an optional PIN protects account management.
• Download or delete all your data at any time from account management.

An internet connection is needed to play and save progress. Sign in with Google, GitHub or Apple through auth.hoandat.com. The game's text is in Vietnamese.
Privacy: https://miu.hoandat.com/privacy
```

## URL

| Ô | URL | Ghi chú |
| --- | --- | --- |
| Privacy Policy (Apple, Play) | `https://miu.hoandat.com/privacy` | Trang công khai, không cần đăng nhập (route `/privacy`, `apps/web/src/ui/legal/privacy-screen.tsx`); trả 200 ngày 23/10/2026. |
| Support URL (Apple, bắt buộc) | `https://miu.hoandat.com/privacy` tạm thời | Trang có mục "Liên hệ" với email hỗ trợ. Việc của người sở hữu: một trang hỗ trợ riêng hoặc GitHub Issues của repo công khai. |
| Marketing URL (tùy chọn) | `https://miu.hoandat.com/` | Trang giới thiệu cho người chưa đăng nhập. |
| Điều khoản sử dụng | Chưa có | `docs/terms-of-use.md` còn là bản nháp chưa phát hành, không có route web (mọi đường dẫn lạ trả trang SPA 200, không phải điều khoản). Apple dùng EULA chuẩn khi để trống; không nhập URL điều khoản cho tới khi phát hành. |
| Xóa tài khoản (Play Data safety, bắt buộc) | `https://miu.hoandat.com/privacy` (mục "Quyền của bạn") | Trang nói cách xóa; nút xóa nằm ở `https://miu.hoandat.com/parent` sau khi đăng nhập. Google muốn trang nêu nổi bật cách xóa: nên thêm neo hoặc trang riêng. |

## Câu trả lời xếp hạng tuổi

### Apple (bảng hỏi 2025: 4+, 9+, 13+, 16+, 18+)

| Mục | Trả lời | Căn cứ |
| --- | --- | --- |
| Parental Controls | Có | PIN tài khoản tùy chọn bảo vệ "Quản lý tài khoản": người chơi phụ, bạn máy, bạn bè, chặn, xóa dữ liệu. |
| Age Assurance | Không | Lời đồng ý v3 trở đi không hỏi tuổi (người sở hữu chốt). |
| Unrestricted Web Access | Không | Không có trình duyệt trong app; chỉ mở trang đăng nhập auth.hoandat.com trong trình duyệt hệ thống. |
| User-Generated Content | Có | Giọng nói giữa bạn bè/tổ đội; tên nhân vật và câu nói chọn từ danh sách; thời khóa biểu tự gõ chỉ chính người chơi xem. |
| Messaging and Chat | Có | Câu có sẵn với người cùng phòng; nói chuyện bằng giọng chỉ với bạn bè và tổ đội. |
| Social Media | Không | Không có bảng tin hay hồ sơ công khai. |
| Advertising | Không | |
| Cartoon or Fantasy Violence | Infrequent | Đấu với trùm khu vực bằng câu trả lời (khiên, quả cầu, trùm loạng choạng); không máu, không vũ khí thật. Người sở hữu có thể chọn None nếu coi đó không phải bạo lực (khi đó 4+). |
| Realistic Violence, Guns, Horror, Profanity, Mature, Sexual, Alcohol/Drugs, Medical | None | |
| Contests | Infrequent | Sự kiện Olympic Toán có huy chương. |
| Gambling, Simulated Gambling, Loot Boxes | None | Phần thưởng cố định, máy chủ tính theo nhiệm vụ; không mua, không quay ngẫu nhiên. |

Dự kiến: **9+** (4+ nếu bạo lực hoạt hình chọn None). Kids Category: **không**.

### Google Play (IARC)

- Loại: Game. Bạo lực: bạo lực hoạt hình/kỳ ảo nhẹ với nhân vật không thực (đấu trùm bằng câu trả lời). Sợ hãi, ngôn ngữ, tình dục, ma túy, cờ bạc: không.
- Người dùng tương tác với nhau: **Có** (câu có sẵn, nói chuyện bằng giọng với bạn bè/tổ đội, kết bạn). Chia sẻ vị trí thật: Không. Mua hàng số: Không. Truy cập internet không giới hạn: Không.
- Dự kiến: PEGI 7 / ESRB Everyone 10+ hoặc Everyone (IARC tự tính; ghi lại kết quả thật sau khi nộp).

### Google Play: Đối tượng mục tiêu

Khuyến nghị khai **trung thực**: nhóm 6–8, 9–12 và 13 trở lên (đối tượng hỗn hợp). Nội dung SGK lớp 2 và hình ảnh khiến Google xếp app vào nhóm thu hút trẻ dù khai gì; khai chỉ 13+ dễ bị coi là khai sai. Khai có trẻ thì áp chính sách Families: xem B3, B4. Không đăng ký "Teacher Approved" lúc này.

## Apple App Privacy (nhãn quyền riêng tư)

Tracking: **Không** (không IDFA, không quảng cáo, không chia sẻ cho data broker; GA4 tắt Google Signals và chia sẻ quảng cáo).

| Loại dữ liệu | Mục đích | Liên kết với danh tính | Ghi chú |
| --- | --- | --- | --- |
| Contact Info → Email Address | App Functionality | Có | Email đã xác minh từ auth.hoandat.com (với Apple "Ẩn email" là địa chỉ chuyển tiếp). |
| Identifiers → User ID | App Functionality | Có | Mã tài khoản ở auth.hoandat.com (`parent_idp_links`), mã Google cũ của tài khoản trước 23/10/2026. |
| Identifiers → Device ID | Analytics | Không | Mã ngẫu nhiên của bản cài, gửi kèm sự kiện GA4; không gắn tài khoản (bỏ nếu B3 chọn tắt GA4 cho app). |
| Usage Data → Product Interaction | Analytics (không liên kết); App Functionality (liên kết) | Analytics: Không; tiến độ: Có | Sự kiện GA4 ẩn danh; thời gian chơi theo tuần, thư đã đọc, cài đặt. |
| User Content → Gameplay Content | App Functionality | Có | Nhiệm vụ, sao, XP, đồ vật, nhân vật, trang trí nhà, chỗ đứng cuối trên map, bạn bè, chặn, báo cáo (lý do chọn sẵn). |
| User Content → Other User Content | App Functionality | Có | Thời khóa biểu, lịch đồng phục tự gõ (tùy chọn, chỉ chính người chơi xem). |

Không thu: tên thật, tuổi, ảnh, vị trí, danh bạ, dữ liệu sức khỏe, tài chính, lịch sử duyệt web, dữ liệu chẩn đoán từ app. **Audio Data: không thu**: bản "Ghi âm giọng con" ở bài luyện nói chỉ nằm trên máy và xóa khi đóng bài; nói chuyện bằng giọng đi thẳng giữa các máy, đã mã hóa (qua TURN của Cloudflare khi cần, Cloudflare không nghe được), máy chủ Miu không nhận giọng nói. Nhật ký máy chủ (IP, trang mở, lỗi; xóa sau 14 ngày) là vận hành dịch vụ, không phải dữ liệu app thu cho mục đích khác.

## Google Play Data safety

- Thu thập: **Có**. Chia sẻ với bên thứ ba: **Không** (Google Analytics, Cloudflare là nhà cung cấp dịch vụ xử lý thay Miu, theo định nghĩa của Play không tính là chia sẻ). Mã hóa khi truyền: **Có** (HTTPS, WSS). Người dùng yêu cầu xóa được: **Có** (trong app: Quản lý tài khoản → Xóa tài khoản; trên web: URL ở mục URL).

| Nhóm Play | Loại | Bắt buộc/tùy chọn | Mục đích |
| --- | --- | --- | --- |
| Personal info | Email address | Bắt buộc | Account management, App functionality |
| Personal info | User IDs | Bắt buộc | Account management |
| App activity | App interactions | Bắt buộc | App functionality, Analytics |
| App activity | Other user-generated content | Tùy chọn | App functionality (thời khóa biểu tự gõ) |
| App activity | Other actions | Bắt buộc | App functionality (bạn bè, chặn, báo cáo) |
| Device or other IDs | Device or other IDs | Bắt buộc | Analytics (mã ngẫu nhiên của bản cài; bỏ nếu B3 tắt GA4 cho app) |

Không thu: vị trí, ảnh/video, âm thanh (lý do như phần Apple: ghi âm chỉ trên máy, giọng nói mã hóa đầu-cuối giữa người chơi), danh bạ, tài chính, sức khỏe, tin nhắn, file, lịch, thông tin web. Quyền Android: `INTERNET`, `RECORD_AUDIO` (luyện nói, nói chuyện bằng giọng, chỉ khi người chơi bấm), `MODIFY_AUDIO_SETTINGS`.

### Play Families: câu trả lời và khoảng trống

- Quảng cáo, SDK quảng cáo: không. SDK bên thứ ba trong app: chỉ Capacitor và plugin đăng nhập/lưu trữ bảo mật; không SDK analytics (GA4 gửi từ máy chủ). AAID: không dùng. Quyền vị trí: không.
- Đăng nhập: người lớn đăng nhập (Google, GitHub, Apple qua auth.hoandat.com); trẻ chơi bằng người chơi phụ trong tài khoản đó, không tự đăng nhập. Ghi rõ trong ô giải thích.
- Tính năng xã hội: có (bạn bè, tổ đội, giọng nói). Thiếu lời nhắc an toàn và công tắc cho người lớn: **B4**.
- Dữ liệu từ trẻ khai đầy đủ ở Data safety; GA4: **B3**.

## Ghi chú cho người duyệt (App Review Notes, tiếng Anh)

```text
Miu World is a free 3D learning adventure (Vietnamese Grade 2 Math and Vietnamese-language lessons). No ads, no in-app purchases.

SIGN-IN
• Tap "Đăng nhập" (Sign in). The app opens our own account service, auth.hoandat.com, in the system browser (ASWebAuthenticationSession on iOS, Auth Tab or Custom Tabs on Android). It offers Sign in with Apple, Google and GitHub.
• Demo account for review: on the auth.hoandat.com sign-in page, tap the small link "Tài khoản dành cho người duyệt ứng dụng" (Account for app reviewers) below the provider buttons, then enter the email and password given in the Sign-In Information fields of this submission. This reviewer-only password sign-in is switched on for the review period only.
• On first sign-in, accept the privacy notice ("Tôi đồng ý") and pick a character; the game starts on the home island.

ACCOUNT PIN (PARENT GATE)
• No PIN is set on a new account, so account management opens directly. A 4-digit PIN can be set in account management ("Quản lý tài khoản"); once set, it is asked before account management, player management and account deletion.

ACCOUNT DELETION
• In the app: Settings (gear) → "Quản lý tài khoản" (Account) → "Xóa tài khoản" (Delete account) → confirm. Deletion is immediate and removes every player, all progress and every session; backups expire within 14 days.
• On the web: https://miu.hoandat.com/parent after signing in. The shared sign-in account at auth.hoandat.com is deleted separately at https://auth.hoandat.com/account.

ONLINE FEATURES
• Players in the same area see each other. There is no free-text chat: only ready-made phrases and waves.
• Voice chat (microphone button) works only with friends or party members; nothing is recorded or stored. The microphone permission is also used for the optional speaking practice, whose recording never leaves the device.
• Report or block: tap another player (or the Interact button) → "Báo cáo" (Report) or "Chặn" (Block). Reports go to a moderation queue reviewed by our moderators.

Contact: the support email on https://miu.hoandat.com/privacy
```

Trước khi gửi: B1 phải xong (nếu không, mục "Demo account" sai); B2 phải xong (nếu không, đường "Settings → Quản lý tài khoản" ở trên không tồn tại với tài khoản một người chơi). Sau khi được duyệt, tắt đăng nhập người duyệt ở auth-next theo `auth-next/docs/deployment-guide.md`.
