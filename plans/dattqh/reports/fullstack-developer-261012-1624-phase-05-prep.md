# Phase 5: chuẩn bị đăng clip hằng tuần (chưa có tài khoản)

Kết quả: mọi thứ để bật đăng clip lên YouTube và Fanpage đã có trong repo; khi người sở hữu tạo tài khoản và thêm hai entry vào `access-tokens.json` thì chỉ còn chạy lệnh. Không có gì đăng lên đâu, không file credential thật nào được mở (mọi test dùng token giả trong thư mục tạm). Không tạo branch, không commit, không push. Hướng dẫn cho người sở hữu: `docs/marketing-channels.md`.

## Đã làm

1. **Bộ kênh.** `content/marketing/channels.json` (tên "Miu World", gợi ý handle, mô tả ngắn và dài, link tới `https://miu.hoandat.com` kèm UTM, hạng mục), schema và hàm `utmUrl` ở `tools/marketing/channels.ts`. Ảnh sinh bằng `tools/assets/render-channel-kit.ts` (`pnpm assets:channel-kit`, Playwright như thẻ chia sẻ, không dependency mới): banner YouTube 2560 × 1440 (chữ nằm trong vùng an toàn 1546 × 423) và ảnh bìa Fanpage 1640 × 856 trong `assets/generated/channel-kit/`. Ảnh đại diện dùng lại `miu-logo-512.png`. Đã khai ở `tools/assets/generated.json`. Chạy hai lần so sha256: giống hệt (`facebook-cover.png` c7657b9d…e51e, `youtube-banner.png` 801ef220…de66b). Đã xem ảnh: chữ không bị cắt, trong vùng an toàn.
2. **Lịch tuần.** `content/marketing/clip-schedule.json`: 18 tuần, thứ Hai 07/09/2026 đến 04/01/2027 (tuần cuối hết Chủ nhật 10/01/2027), mỗi tuần một bài Toán 2 và một bài Tiếng Việt 2, đều là bài có trang bài. Tiếng Việt giữ đúng tuần sách ghi; Toán chia đều theo thứ tự `book.json`; mỗi tuần lấy bài đầu không phải bài "Luyện tập chung"/"Ôn tập". Sinh bằng `pnpm marketing:schedule` (`tools/marketing/clip-schedule.ts`: schema, kiểm tra, `weekOf`, ngày theo giờ Asia/Saigon).
3. **Dựng clip.** `tools/marketing/render-lesson-clip.ts` (`pnpm marketing:clip -- <id bài hoặc slug>`): thẻ tiêu đề, bay camera 13 s trên khu vực của quest (game thật, có nhân vật của quest), thẻ cuối có địa chỉ trang bài, nhạc Komiku CC0 chọn cố định theo bài, ghép bằng `ffmpeg` của máy (báo lỗi rõ nếu thiếu). Ra `.data/marketing/clips/` (đã nằm trong `.gitignore`). Không người chơi, không tên thật.
4. **Lời đăng.** `tools/marketing/captions.ts`: 7 mẫu tiêu đề/mở đầu, tiêu đề ≤ 100 ký tự, link trang bài với `utm_source=youtube|facebook&utm_medium=social&utm_campaign=weekly-clip`, hashtag (`#Shorts` chỉ ở YouTube). Mẫu của 3 bài gần nhất trên cùng kênh bị loại; test chạy hết 70 bài, không lặp mẫu liên tiếp.
5. **Đăng bài.** `post-youtube.ts` (refresh token đổi access token, tải lên resumable, `privacyStatus` cấu hình được, mặc định `private`) và `post-facebook.ts` (`POST /{page-id}/videos` bằng Page token; trước đó `GET /me?fields=id,category`, từ chối khi lỗi/không có category (token người dùng) hoặc id khác `page_id`). Chỉ `fetch`. Token đọc lúc chạy từ entry `youtube.googleapis.com` / `graph.facebook.com`, `used_by` `miu-world marketing`, đường dẫn ở `MIU_MARKETING_TOKEN_FILE` (`marketing-credentials.ts`); lỗi chỉ nêu entry và tên trường, mọi trích dẫn từ dịch vụ được lọc bỏ giá trị bí mật. Mặc định chạy khô; cần `--publish`. Chạy khô không mở file token và không gọi mạng.
6. **Điều phối.** `tools/marketing/weekly-clip.ts` (`pnpm marketing:weekly`; cờ `--publish`, `--privacy`, `--channel`, `--date`, `--no-render`): chọn bài của tuần, bỏ qua bài có trong `content/marketing/posted.json`, dựng, viết lời, đăng hoặc chạy khô, chỉ ghi sổ sau khi đăng thành công từng kênh, ghi báo cáo tiếng Việt `plans/dattqh/reports/marketing-weekly-<yymmdd>.md` (không bí mật). Một kênh lỗi thì kênh kia vẫn đăng, lần sau thử lại đúng phần thiếu. Mẫu launchd `tools/marketing/weekly-clip.plist.template` (thứ Hai 9 giờ, chưa cài; `plutil -lint` OK).
7. **Tài liệu.** `docs/marketing-channels.md`; liên kết từ `docs/README.md`; hai hàng entry mới và một câu trỏ tới ở `docs/deployment-guide.md` (§2.2 và mục GA4).
8. `content:check` nay kiểm `content/marketing/` (`tools/marketing/check-marketing-content.ts`): kênh hợp lệ, lịch chỉ gọi bài có trang bài đúng môn, sổ chỉ chứa bài trong lịch.

## Sửa ngoài `tools/marketing/` (cần biết khi duyệt)

- `apps/web/src/game/debug/review-shots.ts`: thêm loại shot `drive:` (khởi đầu như `view:`, sau đó theo `window.__miuShotCamera` từng khung) để bay camera mà không cần tải lại trang cho mỗi khung; cộng test. Không có thì không bay camera được bằng pipeline hiện có.
- `apps/web/src/preview/preview-main.ts`: nhận `chapter` và `quest` trên URL để preview hiện đúng nhân vật của quest (không có thì NPC của quest bị ẩn). Chỉ tác dụng khi có hai tham số, cách dùng cũ không đổi.
- `tools/assets/render-preview.ts`: xuất `startPreviewServer`, `PREVIEW_ORIGIN`, `mapBlocks`, `blockIds` (và `solidBlocks` giữ nguyên hành vi); `renderShots` dùng lại hàm khởi động server.
- `tools/assets/render-share-cards.ts`: xuất `loadLook`, `shoot`, `photograph`, `token`, `escapeHtml` để dùng chung. Đã chạy lại `pnpm assets:cards`: 71 ảnh, không file nào đổi byte.
- `tools/content/check-content.ts`: nhận thư mục `marketing/` và gọi kiểm tra ở mục 8. `package.json`: bốn script `marketing:schedule`, `marketing:clip`, `marketing:weekly`, `assets:channel-kit`.

## Lệnh đã chạy

| Lệnh | Kết quả |
| --- | --- |
| `pnpm vitest run <từng file>` cho 13 file test marketing + `review-shots.test.ts` + `tools/content/check-content.test.ts` | tất cả xanh (captions 9, channels 7, check-marketing 3, clip-encode 7, clip-scene 5, clip-schedule 10, flight-path 8, credentials 7, post-facebook 8, post-youtube 10, ledger 6, weekly 15, review-shots 5, check-content 22) |
| `pnpm typecheck` | sạch (root, `apps/server`, `apps/web`) |
| `pnpm exec eslint --max-warnings=0 tools/marketing tools/assets/render-channel-kit.ts tools/assets/render-share-cards.ts tools/assets/render-preview.ts tools/content/check-content.ts apps/web/src/game/debug apps/web/src/preview` | 0 lỗi, 0 cảnh báo |
| `pnpm assets:manifest` rồi `pnpm assets:check` | `assets:check OK — 16 packs, 4788 files` |
| `pnpm content:check` | `content:check OK — 2071 files` |
| `pnpm --filter @miu/web build` | xanh; chỉ có cảnh báo chunk > 500 kB đã có từ trước |
| `pnpm marketing:weekly -- --no-render` | in 4 dòng chạy khô cho tuần 6 (12/10/2026), không gọi mạng; đã xóa báo cáo sinh ra để khỏi lẫn vào commit |

Test đăng bài dùng fetch giả, phủ: chạy khô không gọi mạng và không mở token; sai Page id bị từ chối và không đăng; token người dùng bị từ chối (cả khi Facebook trả lỗi, cả khi trả id người); luồng refresh token; lỗi khi lấy token, khi bắt đầu tải lên, khi tải byte, thiếu Location hoặc id; thông báo lỗi không chứa token.

## Clip chạy thử (không tải lên đâu)

`pnpm marketing:clip -- toan2-t1-b07` (Toán 2 Bài 7, khu chợ Phiên): `/Users/hoandat/inet-gitlab/miu-world/.data/marketing/clips/toan-2-bai-7-phep-cong-qua-10-trong-pham-vi-20.mp4`, tổng thời gian chạy khoảng 49 s.

ffprobe: video h264, 1080 × 1920, yuv420p, 24 fps; âm thanh aac; thời lượng 19,5 s; 10,9 MB. Nhạc `chillin-poupi`. Đã xem các khung chính (thẻ tiêu đề, bay qua phố làng, thẻ cuối có địa chỉ): hình đúng, tầm nhìn không bị cây che ở đoạn cuối.

## Cần người sở hữu biết, hoặc chưa kiểm chứng

- **YouTube khóa video riêng tư với project API chưa qua kiểm tra tuân thủ**, kể cả khi gửi `public` ([tài liệu `videos.insert`](https://developers.google.com/youtube/v3/docs/videos/insert)). Muốn đăng công khai tự động phải nộp mẫu kiểm tra trong Cloud Console (mất thời gian chờ), nếu không thì mỗi tuần đổi video sang công khai bằng tay. Đã ghi ở bước 3 mục 5 của hướng dẫn.
- **`madeForKids`:** tôi đặt `true` (clip về bài lớp 2) trong `channels.json`, mã gửi giá trị đó cho từng video. Đây là câu hỏi pháp lý/sản phẩm cần người chốt (đối tượng của game là mọi lứa tuổi); nếu đổi, sửa `channels.json` và cài đặt kênh cho khớp.
- Chưa chạy với dịch vụ thật: OAuth Google, Graph API, định dạng đúng của `access-tokens.json` (tôi suy ra `tokens[].service/used_by/token` từ `deployment-guide.md` §2.2, không mở tệp thật; nếu `_meta.entry_schema` khác thì chỉnh `marketing-credentials.ts`). Phiên bản Graph (`v23.0`) và việc `/me?fields=id,category` trả lỗi cho token người dùng dựa trên hiểu biết về API, chưa thử thật. Facebook đăng bằng `/{page-id}/videos` như yêu cầu, không phải API Reels; video dọc có thể hiện như video thường.
- Facebook: hạng mục `private`/`unlisted` được hiểu là video chưa xuất bản (bản nháp cho quản trị); chỉ `public` mới xuất bản.
- Clip là cảnh thế giới đóng băng với camera bay (đúng cách các ảnh duyệt vẫn chụp); NPC không cử động trong clip. Chưa dựng thử bài ở các map khác (chỉ kiểm mọi bài trong lịch đều tìm được cảnh qua test, và dựng thật một bài ở chợ Phiên); khu trong nhà như trường học có thể bị mái che nhiều hơn, bộ chọn hướng bay chỉ giảm chứ không loại bỏ.
- Chưa chạy E2E hay bộ test đầy đủ (theo yêu cầu máy dùng chung). Có sửa `apps/web` nên theo `CLAUDE.md` cần `e2e:smoke` trước khi release; thay đổi chỉ thêm đường mới (`drive:`, `chapter`/`quest` trên preview), không đụng luồng chơi. Không đo lại GA4 hay Search Console.
- `.claude/skills/` và các tệp agent-memory trong git status có sẵn từ trước, không phải của việc này.

## Tệp

Tạo: `content/marketing/{channels,clip-schedule,posted}.json`; `assets/generated/channel-kit/{youtube-banner,facebook-cover}.png`; `tools/assets/render-channel-kit.ts`; `tools/marketing/{captions,channels,check-marketing-content,clip-encode,clip-scene,clip-schedule,flight-path,marketing-credentials,post-common,post-facebook,post-youtube,posted-ledger,render-lesson-clip,weekly-clip}.ts`, các `*.test.ts` tương ứng (trừ `post-common`, `render-lesson-clip`), `tools/marketing/weekly-clip.plist.template`; `docs/marketing-channels.md`; báo cáo này.
Sửa: `apps/web/src/game/debug/review-shots.ts` và `.test.ts`, `apps/web/src/preview/preview-main.ts`, `tools/assets/{render-preview,render-share-cards,generated}.ts|json`, `tools/content/check-content.ts`, `assets/manifest.json` (sinh lại), `package.json`, `docs/README.md`, `docs/deployment-guide.md`.

Status: DONE_WITH_CONCERNS
Summary: Bộ kênh, lịch tuần, dựng clip, lời đăng, hai module đăng (chạy khô mặc định), điều phối, mẫu launchd và hướng dẫn đã xong; mọi gate yêu cầu xanh, đã dựng một clip thật 1080 × 1920, 19,5 s và không đăng gì. Lo ngại: giới hạn "video riêng tư" của YouTube với project chưa kiểm tra, quyết định `madeForKids`, và vài giả định về API/định dạng token chưa thử với dịch vụ thật.
