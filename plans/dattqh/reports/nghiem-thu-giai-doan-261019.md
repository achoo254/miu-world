# Nghiệm thu giai đoạn 29/09/2026 → 19/10/2026

Giai đoạn này chạy từ ngày đầu dự án tới ngày người sở hữu dừng làm tính năng mới (19/10/2026). Plan: `plans/dattqh/261019-1428-fixes-and-acceptance/plan.md`, pha 6. Đây là bản ghi theo thời điểm: số liệu đúng tại ngày 19/10/2026 và không cập nhật về sau. Trạng thái hiện hành của từng hạng mục nằm ở `docs/project-roadmap.md`.

## Tóm tắt

Miu World đang chạy trên production ở **revision `601d07ea`** (bản "sửa nốt", release 19/10/2026 lúc 17:00, health xanh ở loopback và domain). Game có **12 map** chơi được, mỗi map lõi 800 × 800 khối, quanh lõi là vùng ngoài sinh lúc chơi, rộng tới 5.760 × 5.760. Có **70 bài SGK lớp 2 tập 1** (Toán 2, Tiếng Việt 2, bộ Kết nối tri thức), phủ 100% mục kiểm kê; phần Viết đi qua phiếu in. Thêm **170 chương chuyện của nhân vật** (48 mạch, mỗi map 4 mạch), **308 minigame**, **10 ải trùm lớn và 42 trùm canh khu** đánh bằng động tác chơi, **12 thử thách chơi cùng đội**, 8 việc tốt và sự kiện "Thử thách Olympic Toán". Có **108 bạn máy** tự học đường đi trên 10 map. Phần online gồm thấy nhau, tổ đội, kết bạn, link mời, nói chuyện bằng giọng (tối đa 4 người) và kiểm duyệt (hàng đợi báo cáo, màn `/kiem-duyet`, công tắc khẩn cấp). Phần marketing có 70 trang bài và 2 trang môn cho Google, Google Analytics 4 gửi từ server, sitemap đã nộp Search Console. Đăng nhập Google mở cho mọi người từ 12/10/2026. Trong giai đoạn có 743 commit và 55 plan. Ba ô của tiêu chí nghiệm thu MVP (Master Plan v3 §16) còn chờ người: đo trên iPad, designer duyệt, xác nhận bé chơi trọn một nhiệm vụ.

## Đã giao

Trạng thái: **trên production** nghĩa là code nằm trong revision `601d07ea`. **Xong, chưa release** nghĩa là đã commit trên `main` sau revision đó. **Hoãn** nghĩa là có plan nhưng người sở hữu cho dừng.

### Nền tảng, tài khoản, nhân vật

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| POC voxel, nguồn asset có license, pipeline asset (atlas, manifest, kiểm license) | Trên production | `plans/dattqh/260929-0842-asset-sourcing-and-voxel-poc/`, `plans/dattqh/reports/poc-review-260929.md`, `plans/dattqh/261001-1905-atlas-ktx2-decision/` |
| Monorepo (web, server, packages), CI, database | Trên production | `plans/dattqh/260929-1911-foundation-after-poc-gate/`, `plans/dattqh/reports/foundation-review-260929.md` |
| Vertical slice MVP: 10 phase, từ tạo nhân vật tới Home, Khu rừng và nhận thưởng | Trên production | `plans/dattqh/260929-2141-vertical-slice-mvp/`, `plans/dattqh/reports/mvp-slice-review-260930.md` |
| Đăng nhập Google, một tài khoản một người chơi chính và tối đa 2 người chơi phụ, PIN tùy chọn, lời đồng ý v4 | Trên production; Google OAuth ở "In production" từ 12/10 | `plans/dattqh/261005-0949-single-player-account/`, `plans/dattqh/261012-1116-auto-marketing/` |
| Nhân vật bốn loài, 7 loại phụ kiện (157 món), thư viện bộ phận | Trên production | `plans/dattqh/260930-1457-miu-voxel-chibi/`, `plans/dattqh/260930-1639-character-library-species/` |
| Màn hệ thống: Cài đặt, Hộp thư, Kỹ năng lên cấp, song ngữ Việt và Anh | Trên production | `plans/dattqh/261004-1617-system-screens-v1/`, `plans/dattqh/reports/system-screens-v1-261004.md`, `docs/i18n.md` |

### Thế giới

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| 12 map dựng theo mock (Trung tâm có cổng sang mười map và Nhà của bé) | Trên production | `plans/dattqh/261001-2106-more-maps-lesson-regroup/`, `plans/dattqh/261002-1619-nui-tuyet-dao-bi-an-maps/`, `docs/design-cac-map.md` |
| Vùng ngoài sinh lúc chơi, gấp 50 diện tích lõi | Trên production | `plans/dattqh/261002-0606-maps-x50-outland/` |
| Nhà to, cửa rộng, mạng đường liền, cảnh vật đặt như ngoài đời | Trên production | `plans/dattqh/261002-2216-houses-big-wide-doors/`, `.claude/rules/world-scenery.md` |
| Nhà của bé: thời khóa biểu, lịch đồng phục, xe cỡ thật, phòng truyền thống, "Bài hôm nay" rủ bé sang map khác | Trên production | `plans/dattqh/261003-1320-home-timetable-vehicles/`, `plans/dattqh/261008-2129-trophy-room/`, `plans/dattqh/261009-2155-home-pulls-to-maps/` |
| Cuộc sống trên map: dân làng, vật nuôi, xe, chim, tương tác | Trên production | `plans/dattqh/260930-2115-forest-ambient-life/`, `plans/dattqh/261004-1035-life-expansion/`, `plans/dattqh/261005-1715-interactions-alive/` |

### Nội dung học và cách chơi

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| 70 bài SGK lớp 2 tập 1, phủ 100% (Toán 1033/1033 mục, Tiếng Việt 735/735 mục), phiếu viết vở ô li | Trên production; chờ giáo viên duyệt | `plans/dattqh/260930-0846-sgk-lop2-game-content/`, `pnpm content:gaps`, `plans/dattqh/reports/sgk-toan2-teacher-flags.md`, `plans/dattqh/reports/sgk-tv2-teacher-flags.md` |
| 308 minigame, mỗi trò có nhân vật mời chơi; chơi lại vẫn nhận đủ thưởng | Trên production | `content/quests/side-*.json`, `docs/minigames.md`, `plans/dattqh/261003-1549-minigames-home-polish/` |
| Trùm lớn, trùm canh khu, trận đấu bằng động tác chơi | Trên production | `plans/dattqh/261005-2315-zone-guardians/`, `plans/dattqh/261007-1829-boss-duel-play-moves/`, `plans/dattqh/reports/boss-duel-261007.md` |
| Xu, cửa hàng, cây kỹ năng, Cổng tri thức, Hành trình và 63 thành tích | Trên production | `plans/dattqh/261003-1602-coins-items-skills-uses/`, `plans/dattqh/reports/skills-journey-achievements-261005.md` |
| Thú cưng sống động: cảnh chăm sóc, cấp thân thiết, phụ kiện thú | Trên production | `plans/dattqh/261005-2305-pets-alive/`, `plans/dattqh/reports/pets-alive-261006.md` |
| Chuyện của nhân vật: đợt 1 (24 mạch), hai chuyện rủ bé sang map khác, đợt 2a (22 mạch, 80 chương); tổng 48 mạch, 170 chương | Trên production | `plans/dattqh/261003-2330-bilingual-npc-stories-bots/`, `plans/dattqh/261009-2155-home-pulls-to-maps/`, `plans/dattqh/261019-1057-npc-stories-batch-2a/`, `plans/dattqh/reports/npc-stories-batch2a-261019.md` |
| Sự kiện có thời hạn "Thử thách Olympic Toán" (06/10–31/10/2026), màn luyện đề chấm ở server | Trên production | `plans/dattqh/261004-1617-live-world-events/`, `plans/dattqh/reports/live-world-events-261007.md` |

### Online

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Thấy nhau, diện mạo do server cấp, tổ đội 2–4 người, câu nói có sẵn | Trên production | `plans/dattqh/261004-1540-online-appearance-interact-party/`, `plans/dattqh/reports/online-appearance-party-261005.md` |
| 12 thử thách chơi cùng đội; mọi bài học và chương chuyện chơi được theo đội | Trên production | `plans/dattqh/261004-1617-coop-quests/`, `plans/dattqh/reports/coop-quests-261005.md` |
| Kết bạn, chặn, báo cáo, nhà riêng của từng người chơi, tiến bộ học | Trên production | `plans/dattqh/261004-1617-parent-area-friends/`, `plans/dattqh/reports/friends-online-progress-261005.md` |
| Nói chuyện bằng giọng; từ 19/10 chỉ bạn bè nối thẳng, người khác đi qua relay | Trên production | `plans/dattqh/261005-2335-voice-chat/`, `plans/dattqh/reports/voice-chat-261006.md`, commit `9eacc3b3` |
| Bạn máy tự học bản đồ, gặp người chơi thì chat, kết bạn, cùng làm nhiệm vụ | Trên production | `plans/dattqh/261007-2122-bots-play-like-players/`, `pnpm bots:learning` |
| Kiểm duyệt: vé WebSocket một lần, hàng đợi báo cáo, màn `/kiem-duyet`, công tắc khẩn cấp | Trên production từ `8ee8c73c` | `plans/dattqh/261004-1617-moderation-safety/`, `plans/dattqh/reports/moderation-safety-261019.md` |
| Đo tải hub online | Xong (đo trên máy dev) | `plans/dattqh/reports/loadtest-multiplayer-261019.md`, `pnpm loadtest` |

### Marketing

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Trang giới thiệu, 70 trang bài và 2 trang môn dưới `/bai/`, ảnh xem trước, `robots.txt`, `sitemap.xml` | Trên production từ `459596aa` | `plans/dattqh/261012-1116-auto-marketing/phase-02-seo-surfaces.md`, commit `75774f8f` |
| Google Analytics 4 phía server (không script Google trong trình duyệt), privacy và đồng ý v4 | Trên production | `plans/dattqh/261012-1116-auto-marketing/phase-01-privacy-and-server-analytics.md`, commit `f6967bdd` |
| Link mời bạn một lần, nút khoe kết quả, ảnh tổng kết tuần | Trên production | `plans/dattqh/261012-1116-auto-marketing/phase-03-share-loops.md` |
| Đăng clip theo lịch lên YouTube và Fanpage | Code xong, chạy khô; chờ người tạo kênh | `plans/dattqh/261012-1116-auto-marketing/phase-05-scheduled-clip-posting.md`, `docs/marketing-channels.md` |

### Chất lượng và vận hành

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Bộ smoke E2E chặn deploy, audit mục tiêu quest, chụp và duyệt ảnh màn hình trước release | Trên production | `plans/dattqh/261007-2135-test-strategy-smoke-audits-screens/`, `plans/dattqh/reports/test-strategy-261007.md`, `docs/screen-review.md` |
| Cổng release (CI xanh và ảnh đã duyệt mới deploy được) | Đang dùng | `tools/deploy/release-gate.sh`, `docs/deployment-guide.md` §5 |
| Nghiệm thu MVP: đo ngân sách 12 map, gói đo iPad, đồng bộ tài liệu, quét bảo mật, checklist §16 | Xong phần tự động | `plans/dattqh/261004-1617-mvp-gate-launch-readiness/plan.md`, `plans/dattqh/reports/docs-sync-261019.md` |
| `deploy.sh setup` giữ các dòng env do người tự đặt | Trên production | commit `4bdcc756` |
| Sửa nốt giao diện, ghi chú nhỏ, thêm màn vào bộ chụp ảnh | Trên production | `plans/dattqh/261019-1428-fixes-and-acceptance/plan.md` |

## Chất lượng và bằng chứng

- **CI** (`.github/workflows/ci.yml`; lấy bằng `gh run list` ngày 19/10/2026). Commit đang chạy trên production `601d07ea` có CI xanh (run `39222062506`); bản trước đó `462d9f01` (run `39210418203`). Mọi lần push sau đó cũng xanh. Ngày 19/10 có hai lần đỏ, đều đã sửa: test bạn máy gặp người chơi đỏ trên Postgres (sửa ở `f95e9ea2`); một race trong nhiệm vụ đội (xem mục Sự cố). Lượt chạy hằng đêm 18/10 đỏ vì test đo tốc độ tra cứu chân trời vượt ngưỡng 1.500 ms (đo được 1.642 ms trên máy CI). Đã đổi sang so với một tải mẫu chạy cùng lượt (`e0e9ecf2`). Lượt chạy đêm 19/10 sẽ xác nhận cách sửa này.
- **Bộ smoke E2E**: mười luồng chính trên 2 máy CI, không retry, mỗi máy tối đa 240 s. Danh sách luồng: `apps/web/playwright.ci.config.ts` (mọi project trừ `perf`, `budget`, `screens`). Lượt hằng đêm mở cả mười hai map.
- **Audit nội dung**: `pnpm content:check` (chạy trong CI) gồm độ phủ SGK, chữ quest dùng `{name}` và audit mục tiêu quest `pnpm world:quest-targets` ở từng bước của mọi quest trên 12 map. Audit cảnh vật chạy sau mỗi lần sinh lại map: `tools/world/scenery-audit.ts`, `tools/world/room-audit.ts`, `tools/world/reach-audit.ts` (luật ở `.claude/rules/world-scenery.md`).
- **Duyệt ảnh trước release**: `assets/generated/review/screens/review.json` chụp từ `601d07ea`: 27 màn, hai khung 360 × 740 và 820 × 1180. Kết luận `pass`, 0 lỗi chặn. Các ghi chú đã chọn sửa ở lần duyệt `462d9f01` đều đã sửa; còn lại vài ghi chú nhỏ đã chấp nhận (bảng tổ đội che khoảng 10 px bong bóng thoại trên iPad, nút "Quay lại game" chạm góc bảng bạn bè, Vẹt khuất khung ở ảnh 08).
- **Bảo mật** (`plans/dattqh/reports/security-sweep-261019.md`): không thấy IDOR; thưởng, XP, xu đều do server tính; `pnpm audit --prod` không có lỗ hổng. Phát hiện nghiêm trọng duy nhất là thời khóa biểu mặc định bị lộ, đã xử lý. Còn mở ở mức thấp: một trần chung cho bộ nhớ lượt luyện Olympic, nhiều endpoint ghi chưa có rate limit, và xem đáp án Olympic không bị trừ gì (người sở hữu chấp nhận gian lận). Nấu ăn vẫn miễn phí theo hành vi cũ nhưng đã an toàn khi gọi đồng thời. `pnpm security:dist` kiểm không có đáp án quest trong bundle. Kiểm duyệt: `plans/dattqh/reports/moderation-safety-261019.md`.
- **Hiệu năng vẽ** (`plans/dattqh/reports/map-budget-261019.md`, đo giả lập khung iPad): ở mức Vừa, draw call trong ngân sách ở cả 12 map; tam giác vượt khoảng 2% ở một điểm (chỗ xuất hiện Làng ven sông). Ở mức Cao có 13 điểm vượt. Có cắt cảnh vật hay không thì chờ số đo trên iPad thật (DEVICE-01).
- **Tải online** (`plans/dattqh/reports/loadtest-multiplayer-261019.md`, đo trên máy dev, không đo production): một phòng chịu tốt 100 người cùng 24 bạn máy; toàn server chịu 300 người rải trên 10 map. Ngưỡng chọn làm chuẩn (Jev): 60 người mỗi phòng, 150 người tổng. Chưa cài giới hạn vào code.

## Sự cố đã xảy ra và đã xử lý

| Ngày | Sự cố | Xử lý | Bằng chứng |
|---|---|---|---|
| 01/10 | Hồ sơ của bé như bị "xóa" sau khi khởi động lại | Không phải lỗi lưu: database dev đã bị xóa, hoặc đang mở database của worktree khác. Server nay in dòng `database: …` lúc khởi động; mỗi map lưu chỗ bé đứng lần trước | `plans/dattqh/journals/2026-10-01-profile-reset-and-resume-where-you-left-off.md` |
| 07/10 | E2E đỏ 22–26 test mỗi lượt, mỗi lượt chạy 483–868 s | Thay bằng bộ smoke chặn deploy, chuyển phần kiểm theo nội dung sang Node | `plans/dattqh/reports/test-triage-261007-2221.md`, `plans/dattqh/reports/test-strategy-261007.md` |
| 12/10–19/10 | Thời khóa biểu mặc định của một lớp có thật (tên trường, tên và số điện thoại cô giáo) hiện cho mọi tài khoản sau khi mở đăng nhập | 19/10 gỡ cấu hình ở production. Code mới chỉ trả bản mặc định cho email trong `TIMETABLE_DEFAULT_ACCOUNTS` (commit `0fcc5987`, đã có trong `462d9f01`) | `plans/dattqh/journals/2026-10-19-default-timetable-leaked-to-public.md` |
| 19/10 | Nhiệm vụ đội đôi khi báo "chờ đội" (409) vì bước kế tiếp đọc trạng thái bạn máy trước khi bạn máy theo kịp | Bước đội chờ hàng đợi theo kịp của bạn máy xong rồi mới kiểm (commit `e8e7a8da`) | `plans/dattqh/reports/debug-bot-flow-261019.md` |
| 19/10 | Cùng gốc "mở cho người lạ": voice trong đội lộ IP cho người lạ; font viết tay HP001 (không có license mở) được phục vụ cho mọi tài khoản; nấu ăn gọi đồng thời mất cập nhật | Người lạ chỉ nối qua relay (`9eacc3b3`); ngừng phục vụ font (`04607c4a`); nấu ăn trong transaction có khóa (`4e933508`). Cả ba đã có trong `462d9f01` | `plans/dattqh/reports/followups-voice-font-cooking-261019.md` |
| 19/10 | Bản sửa hàng tiêu đề màn luyện Olympic trên điện thoại bị rút lại trước release (commit không ghi lý do) | Revert (`8ee8c73c`), làm lại ở pha 2 của plan sửa nốt | `plans/dattqh/261019-1428-fixes-and-acceptance/plan.md` |

## Đã hoãn theo quyết định của người sở hữu

| Hạng mục | Lý do | Plan |
|---|---|---|
| Nội dung SGK lớp 2 tập 2 | Người sở hữu (05/10/2026): làm sau. Sách đã có trong iCloud; Núi tuyết và Đảo bí ẩn hiện chỉ có quest chào mừng | `plans/dattqh/261002-1139-sgk-lop2-tap2-content/` |
| Môn English | Người sở hữu (05/10/2026): làm sau; nguồn đã chốt là Tiếng Anh 2 Global Success | `plans/dattqh/261004-1617-english-subject-content/` |
| Mobile app iPhone và Android | Plan đã duyệt hướng nhưng chưa bắt đầu; bước phát hành công khai chờ xác nhận pháp lý. Từ 19/10, dừng tính năng mới | `plans/dattqh/261007-2038-mobile-app-ios-android/` |
| Chuyện của nhân vật, đợt 2b (ít nhất 6 mạch mỗi map) | 19/10/2026: dừng tính năng mới vì người chơi còn ít, ưu tiên marketing | `plans/dattqh/261019-1057-npc-stories-batch-2a/plan.md` |
| Giới hạn người chơi mỗi phòng và toàn server | Số người chơi còn xa ngưỡng; chỉ cài khi người chơi cùng lúc tiến gần 60 mỗi phòng hoặc 150 tổng (Jev 0,91) | `plans/dattqh/reports/loadtest-multiplayer-261019.md` |
| Đăng clip lên YouTube và Fanpage | Code đã sẵn, đang chạy khô; chờ người sở hữu tạo kênh và cấp quyền một lần | `plans/dattqh/261012-1116-auto-marketing/phase-05-scheduled-clip-posting.md` |

## Việc chỉ người làm được

Gửi kết quả cho phiên AI (dán vào chat) là đủ: AI ghi vào plan, roadmap và checklist §16. Bảng gốc kèm nút sao chép số đo nằm ở mục "Việc cần người" của trang `apps/web/review.html`.

| Việc | Ai | Làm gì, ở đâu | Gửi kết quả |
|---|---|---|---|
| Đo trên iPad Gen 10 (DEVICE-01) | Người sở hữu | Mở trang review trên iPad, làm theo mục DEVICE-01: mỗi mức Thấp, Cao 2 phút; mức Vừa 15 phút; ghi FPS thấp nhất, draw call cao nhất, pin, độ nóng của máy | Bấm **Sao chép kết quả đo**, dán vào chat |
| Xác nhận bé chơi trọn một nhiệm vụ | Người sở hữu, cùng bé | Để bé tự làm một nhiệm vụ từ đầu tới lúc nhận thưởng, ghi chỗ bé phải hỏi người lớn | Một câu: tên nhiệm vụ, chỗ bé vấp |
| Giáo viên duyệt nội dung SGK | Giáo viên lớp 2 | Đọc các câu đã đánh dấu trong `plans/dattqh/reports/sgk-toan2-teacher-flags.md` và `plans/dattqh/reports/sgk-tv2-teacher-flags.md` | Ghi chú theo mã quest |
| Designer duyệt giao diện so với mock | Designer | Xem mục "Màn hình trước deploy" và ảnh đối chiếu mock từng map trên trang review | Tên màn và chỗ lệch |
| Pháp chế duyệt lời đồng ý v4 và trang quyền riêng tư; game có thuộc diện G1 theo Nghị định 147/2024 không | Luật sư | `content/legal/consent-vi.json`, `content/legal/privacy-vi.json`, trang `/privacy` | Văn bản sửa hoặc ý kiến |
| Đánh giá sự cố thời khóa biểu (có báo cho cô giáo hay không) | Người sở hữu | Đọc `plans/dattqh/journals/2026-10-19-default-timetable-leaked-to-public.md` | Quyết định trong chat |
| Tạo kênh YouTube và Fanpage "Miu World", cấp quyền đăng một lần | Người sở hữu | Theo `docs/marketing-channels.md` (tên, mô tả, ảnh bìa đã sẵn). Fanpage tách khỏi trang cá nhân, không mời bạn bè | Báo đã tạo; AI tắt chế độ chạy khô |
| (Tùy chọn) Cho gia đình thấy lại thời khóa biểu mặc định | Người sở hữu | Đặt `TIMETABLE_DEFAULT_ACCOUNTS` (email của gia đình) cùng tệp thời khóa biểu trong env production, theo `docs/deployment-guide.md` §7. Không in, không commit email | Báo đã đặt; restart production phải hỏi người trước |

## Hướng tiếp theo: marketing

Nguồn: `plans/dattqh/reports/marketing-261012-0906-miu-world-100-ccu.md` (đích 100 CCU, phân khúc đầu là gia đình có con lớp 2, đi qua giáo viên chủ nhiệm) và `plans/dattqh/261012-1116-auto-marketing/plan.md`. Không việc nào dưới đây là tính năng game mới.

1. **Mở kênh clip.** Người sở hữu tạo kênh YouTube và Fanpage. AI đăng thử một clip để người sở hữu xem, rồi bật lịch hằng tuần (`pnpm marketing:weekly`; lịch 18 tuần học kỳ I ở `content/marketing/clip-schedule.json`). Mỗi clip dẫn về đúng trang bài của tuần.
2. **Gieo qua giáo viên (Mốc 1 của report).** 3–5 giáo viên lớp 2 dùng game làm phần khởi động trên lớp, rồi gửi link trang bài vào nhóm Zalo phụ huynh. Không gọi Miu là "bài tập về nhà". Việc liên hệ là của người (nhóm kín); AI soạn sẵn tin nhắn, tờ giới thiệu và link theo bài.
3. **Đo phễu hằng tuần trên GA4.** Theo dõi các bước: vào trang bài → đăng ký → xong quest đầu → xong quest, kèm nguồn đến. Mỗi tuần một report ngắn trong `plans/dattqh/reports/`; chỉ sửa chữ, trang giới thiệu hay trang bài ở bước rơi nhiều nhất.
4. **Theo dõi Search Console.** Xem bài nào đã có lượt hiển thị và nhấp; chỉnh tiêu đề, mô tả của trang `/bai/` theo đúng cách giáo viên và phụ huynh tìm ("trò chơi khởi động Tiếng Việt 2 bài …").
5. **Chốt pháp lý trước khi đẩy mạnh.** Report marketing ghi Jev 0,88 cho phương án "xin ý kiến pháp lý theo Nghị định 147/2024 trước khi mời người ngoài". Ý kiến của luật sư (mục Việc chỉ người làm được) nên có trước khi gieo rộng ra nhiều lớp.

## Ký nghiệm thu

Người sở hữu duyệt: ☐ Đạt ☐ Cần sửa — ghi chú:
