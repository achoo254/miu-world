# Kênh YouTube và Fanpage Facebook: clip hằng tuần

Mỗi tuần học của học kì I, một clip dọc 20 giây cho một bài Toán 2 và một bài Tiếng Việt 2 được dựng bằng code, đăng lên kênh YouTube (Shorts) và Fanpage "Miu World", dẫn về trang bài ở `https://miu.hoandat.com/bai/<bài>/` kèm UTM để đọc nguồn đến trong GA4. Nguồn quyết định: plan `plans/dattqh/261012-1116-auto-marketing/` (phase 5).

**Trạng thái (24/10/2026):** kênh YouTube Miu World (`@miuworldgame`, `UCWCbLCst7No705XaUcw3acg`) và Fanpage đã có. Sáu clip tuần 6–8 đã lên YouTube, đăng tay qua Studio, ghi trong `content/marketing/posted.json`. Quyền YouTube Data API đã cấp: mục `youtube.googleapis.com` / `miu-world marketing` có trong `access-tokens.json`, cấp bằng `pnpm grant` của gói `shared-next/packages/app-shorts` (OAuth client Desktop của project `miu-world`, xem README của gói đó). Facebook chưa có Page access token. Không có token thì chế độ mặc định (chạy khô) vẫn chạy được hết, trừ bước đăng. Bước đăng chỉ chạy khi có cờ `--publish`.

## Ràng buộc của người sở hữu về Facebook (12/10/2026), mã tự giữ

- Không bao giờ đăng lên trang cá nhân hay bảng tin bạn bè, không dùng token người dùng để đăng, không mời bạn bè thích Fanpage hay vào nhóm, không nhắn tin cho ai, không đăng vào Group (Meta đã gỡ API nhóm từ 2024; tự động hóa bằng trình duyệt với tài khoản cá nhân trái điều khoản).
- `tools/marketing/post-facebook.ts` chỉ gọi `POST /{page-id}/videos` với `page_id` trong `access-tokens.json`. Trước khi đăng nó hỏi token `GET /me?fields=id,category`: dừng nếu token là token người dùng (Facebook trả lỗi hoặc id người, không có category), hoặc `id` khác `page_id`. Không có tham số chọn đích khác, không gửi lời mời, tag hay tin nhắn.
- Người sở hữu chỉ là quản trị ẩn của Fanpage; bài chỉ tới người theo dõi Fanpage. Muốn có nhóm cộng đồng thì tạo nhóm do Fanpage làm chủ và đăng tay.

## Có sẵn trong repo

| Việc | Ở đâu | Lệnh |
| --- | --- | --- |
| Tên, mô tả, từ khóa, link có UTM, gợi ý handle của kênh và Fanpage | `content/marketing/channels.json` | |
| Ảnh bìa kênh YouTube 2560 × 1440 (chữ nằm trong vùng an toàn 1546 × 423 ở giữa) và ảnh bìa Fanpage 1640 × 856 | `assets/generated/channel-kit/` | `pnpm assets:channel-kit` rồi `pnpm assets:manifest` |
| Ảnh đại diện của cả hai | `assets/generated/brand/miu-logo-512.png` (logo của app) | |
| Lịch tuần → bài (học kì I 2026–2027, thứ Hai 07/09/2026 đến 04/01/2027; mỗi tuần một bài mỗi môn, đều là bài có trang bài) | `content/marketing/clip-schedule.json` | `pnpm marketing:schedule` sinh lại từ mục lục sách |
| Dựng clip một bài (tiêu đề, bay camera qua khu vực của quest, thẻ cuối có link, nhạc Komiku CC0 của pack `komiku-poupi`) | `tools/marketing/render-lesson-clip.ts`, ra `.data/marketing/clips/` (không commit) | `pnpm marketing:clip -- <id bài hoặc slug>` |
| Tiêu đề, mô tả, hashtag (xoay vòng mẫu, không lặp mẫu của vài bài gần nhất) | `tools/marketing/captions.ts` | |
| Đăng YouTube, đăng Facebook (chỉ `fetch`, không SDK) | `tools/marketing/post-youtube.ts`, `post-facebook.ts` | |
| Chạy cả tuần, sổ bài đã đăng, báo cáo | `tools/marketing/weekly-clip.ts`, `content/marketing/posted.json`, `plans/dattqh/reports/marketing-weekly-<yymmdd>.md` | `pnpm marketing:weekly` |
| Mẫu timer launchd (chưa cài) | `tools/marketing/weekly-clip.plist.template` | |

Máy dựng clip cần `ffmpeg` (công cụ của máy, không phải dependency: `brew install ffmpeg`) và Chromium của Playwright. Dựng một clip mất khoảng một phút.

## Việc làm một lần (người sở hữu; AI điều khiển Chrome hộ, người bấm đồng ý điều khoản)

### 1. Kênh YouTube

1. Đăng nhập YouTube bằng tài khoản Google của người sở hữu, tạo kênh mới tên **Miu World** (Brand Account, tách khỏi kênh cá nhân nếu có).
2. Handle: thử lần lượt các gợi ý trong `channels.json` (`@MiuWorldGame`, `@MiuWorldVN`, `@miuworld.hoc`); handle là duy nhất toàn cầu nên cái nào bị lấy thì dùng cái kế.
3. Ảnh đại diện: `assets/generated/brand/miu-logo-512.png`. Ảnh bìa: `assets/generated/channel-kit/youtube-banner.png`. Mô tả và các link: lấy từ `youtube.description` và `youtube.links` của `channels.json`. Quốc gia Việt Nam, ngôn ngữ tiếng Việt.
4. Cài đặt đối tượng của kênh: nội dung là clip về bài học lớp 2, nên chọn **dành cho trẻ em** (`madeForKids: true` trong `channels.json`, mã gửi cùng giá trị cho từng video). Đây là câu hỏi pháp lý/sản phẩm: nếu muốn khác thì đổi giá trị đó và cài đặt kênh cho khớp (đã ghi ở report của phase này).

### 2. Fanpage Facebook (không mời bạn bè)

1. Trong tài khoản Facebook cá nhân, tạo **Trang** (Page) mới tên **Miu World**, hạng mục "Trò chơi điện tử" (`facebook.category`). Khi Facebook gợi ý mời bạn bè thích Trang, **bỏ qua**; không dùng "Mời bạn bè".
2. Tên người dùng: thử các gợi ý `usernameSuggestions` (`miuworld.game`, …). Ảnh đại diện `miu-logo-512.png`, ảnh bìa `assets/generated/channel-kit/facebook-cover.png`, giới thiệu ngắn `facebook.shortDescription`, mô tả `facebook.description`, trang web `facebook.website`, nút kêu gọi "Chơi game".
3. Ghi lại **Page id** (chuỗi số, ở "Giới thiệu → Minh bạch của Trang" hoặc trong URL quản trị). Tài khoản cá nhân chỉ giữ vai trò quản trị.

### 3. Google Cloud: OAuth cho YouTube Data API

1. Trong Google Cloud Console, dùng project của Miu World (hoặc tạo project riêng cho clip), bật **YouTube Data API v3**.
2. Màn hình đồng ý OAuth: thêm scope `https://www.googleapis.com/auth/youtube.upload`. Đặt trạng thái **In production** (ở "Testing", refresh token hết hạn sau 7 ngày). Scope này là nhạy cảm nên Google hiện cảnh báo "chưa xác minh" khi người sở hữu tự cấp quyền cho chính mình; bấm tiếp tục.
3. Tạo OAuth client loại **Desktop app**, ghi `client_id` và `client_secret`.
4. Cấp quyền một lần bằng tài khoản đang quản lý kênh, **chọn đúng kênh Miu World** ở bước chọn kênh, để lấy `refresh_token` (ví dụ OAuth 2.0 Playground với "Use your own OAuth credentials", scope trên, `access_type=offline`, rồi "Exchange authorization code for tokens").
5. **Giới hạn của Google cần biết trước:** video tải lên qua API từ project chưa qua kiểm tra tuân thủ (API Compliance Audit) bị khóa ở chế độ riêng tư dù mã gửi `public` ([tài liệu `videos.insert`](https://developers.google.com/youtube/v3/docs/videos/insert)). Hai cách: nộp mẫu kiểm tra trong Cloud Console (mất thời gian chờ), hoặc chấp nhận mỗi tuần vào YouTube Studio đổi video thành công khai bằng tay. Mã không né được giới hạn này.

### 4. Meta: Page access token

1. developers.facebook.com: tạo ứng dụng (loại Business), để **Development mode**. Người sở hữu là quản trị viên của ứng dụng nên dùng được quyền `pages_show_list`, `pages_manage_posts`, `pages_read_engagement` trên chính Fanpage của mình mà không cần App Review.
2. Trong Graph API Explorer chọn ứng dụng, xin token người dùng với ba quyền trên, đổi sang token người dùng dài hạn (`GET /oauth/access_token?grant_type=fb_exchange_token&client_id=…&client_secret=…&fb_exchange_token=…`).
3. `GET /me/accounts` bằng token đó: mục của Fanpage Miu World có `id` (Page id) và `access_token` (token **của Trang**, không hết hạn khi sinh từ token người dùng dài hạn). Chỉ giữ hai giá trị này. **Token người dùng chỉ dùng lúc này rồi bỏ**, không lưu ở đâu cả.
4. Phiên bản Graph API đặt ở `GRAPH_VERSION` trong `post-facebook.ts`; Meta giữ mỗi bản khoảng hai năm, nên đổi khi lỗi đăng báo phiên bản hết hạn.

### 5. Hai entry trong `access-tokens.json`

Sao lưu tệp thành `access-tokens.backup-<yyyymmdd>.json` cùng thư mục trước khi sửa (`docs/deployment-guide.md` §2.2), rồi thêm hai entry theo `_meta.entry_schema`. Giá trị bên dưới là chỗ trống, không phải giá trị thật; tệp này ở ngoài repo và không bao giờ commit.

| Entry (chọn bằng) | Dùng cho | Trường trong `token` |
| --- | --- | --- |
| `service == "youtube.googleapis.com"`, `used_by == "miu-world marketing"` | Đăng clip lên kênh YouTube Miu World: đổi refresh token lấy access token rồi tải lên bằng YouTube Data API v3 | `client_id`, `client_secret`, `refresh_token` |
| `service == "graph.facebook.com"`, `used_by == "miu-world marketing"` | Đăng clip lên Fanpage Miu World bằng Graph API: chỉ Page id này, chỉ token của Trang | `page_id` (chuỗi số), `page_access_token` |

```json
{ "service": "youtube.googleapis.com", "used_by": "miu-world marketing",
  "token": { "client_id": "…", "client_secret": "…", "refresh_token": "…" } }
{ "service": "graph.facebook.com", "used_by": "miu-world marketing",
  "token": { "page_id": "<số>", "page_access_token": "…" } }
```

Hai entry này **không** lên máy chủ production: chỉ máy của người sở hữu đọc, lúc chạy, qua biến môi trường `MIU_MARKETING_TOKEN_FILE` (đường dẫn tới `access-tokens.json`). Mã không in giá trị; lỗi chỉ nêu entry và tên trường. Thiếu entry hay thiếu trường thì dừng, không đoán.

### 6. Chạy khô, đăng thử riêng tư, bật timer

1. **Chạy khô** (mặc định, không đọc token, không gọi mạng): `pnpm marketing:clip -- toan2-t1-b11` dựng một clip vào `.data/marketing/clips/` (xem bằng QuickTime), rồi `pnpm marketing:weekly` dựng clip của tuần này, viết tiêu đề và mô tả, ghi báo cáo `plans/dattqh/reports/marketing-weekly-<yymmdd>.md`. `--no-render` bỏ qua bước dựng nếu chỉ muốn xem lựa chọn và lời; `--channel youtube` hoặc `--channel facebook` chỉ chạy một kênh; `--date yyyy-mm-dd` chạy cho một ngày khác.
2. **Đăng thử thật, riêng tư:** `MIU_MARKETING_TOKEN_FILE=<đường dẫn> pnpm marketing:weekly -- --publish`. Quyền xem mặc định `private`: YouTube để riêng tư, Facebook để video **chưa xuất bản** (chỉ quản trị Trang thấy, trong Công cụ đăng bài → Video). Người sở hữu xem clip, tiêu đề, link UTM; hài lòng thì đổi sang công khai bằng tay trong YouTube Studio và xuất bản bản nháp trên Facebook. Bài đã đăng được ghi vào `content/marketing/posted.json` (kể cả khi đăng riêng tư) nên lần chạy sau không đăng lại.
3. **Bật timer:** sao `tools/marketing/weekly-clip.plist.template` thành `~/Library/LaunchAgents/com.miu-world.weekly-clip.plist`, thay ba chỗ `__REPO_DIR__`, `__TOKEN_FILE__`, `__LOG_DIR__`, rồi `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.miu-world.weekly-clip.plist`. Mỗi thứ Hai 9 giờ nó chạy `pnpm marketing:weekly -- --publish --privacy public`. Gỡ: `launchctl bootout gui/$(id -u)/com.miu-world.weekly-clip`. Máy ngủ thì chạy bù khi thức; máy phải có `pnpm`, `node` và `ffmpeg` trong PATH của `zsh -lc` (sửa `PATH` trong plist nếu node cài qua fnm).

## Vận hành

- Mỗi lần chạy ghi báo cáo ngắn (bài, kênh, kết quả, link, lỗi) vào `plans/dattqh/reports/`; báo cáo không chứa token. Một kênh lỗi thì kênh kia vẫn đăng, sổ chỉ ghi phần thành công, lần chạy sau thử lại đúng phần còn thiếu. Lệnh thoát với mã 1 khi có lỗi.
- Đọc hiệu quả trong GA4 theo nguồn `youtube` / `facebook`, chiến dịch `weekly-clip` (`utm_medium=social`).
- Ngoài học kì I (trước 07/09/2026, sau 10/01/2027) lần chạy không có bài nào; học kì II cần mở rộng `clip-schedule.json` (sửa `FIRST_MONDAY` và `SEMESTER_WEEKS` rồi `pnpm marketing:schedule`, hoặc sửa tay).
- Nhạc: các bài trong pack Komiku "Poupi's Incredible Adventures" (CC0), chọn cố định theo bài. Ảnh bìa dựng từ asset CC0 của game.
- TikTok chưa làm (cần TikTok duyệt ứng dụng).
- Lùi: gỡ timer, xóa hai entry, thu hồi quyền ở https://myaccount.google.com/permissions và ở Cài đặt Doanh nghiệp của Meta. Mã không còn đăng được.
