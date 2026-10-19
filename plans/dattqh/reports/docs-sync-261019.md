# Đồng bộ tài liệu với game đang chạy (19/10/2026)

Pha 3 của plan `plans/dattqh/261004-1617-mvp-gate-launch-readiness/`, gộp cả pha 6 của `261004-1617-boss-skill-check-new-mechanics` (tài liệu cơ chế mới) và phần `docs/` còn thiếu của `261004-1617-system-screens-v1`. Đối chiếu với `main` ở `84e84519`. Không sửa code, `content/`, `assets/`, `apps/web/review.html`.

## Thay đổi và bằng chứng

### Master Plan v3

| Chỗ sửa | Câu cũ | Bằng chứng |
| --- | --- | --- |
| §1 bảng, danh sách "Đã chốt" | "MVP chỉ làm Mèo", tiền tệ có chuỗi ngày, multiplayer chỉ là "giai đoạn sau MVP"; thêm mục 10 (mọi lứa tuổi), 11 (không mở khóa) | `docs/project-roadmap.md` task #10 (bốn loài 30/09); `plans/dattqh/reports/jev-261004-1648-open-questions.md` (bỏ chuỗi ngày); `.claude/rules/product-audience.md` |
| §2, §14 task 11 | Home "một cảnh voxel/đảo nổi" | `apps/web/src/ui/home/home-screen.tsx` dùng `WorldStage` (ảnh render sẵn); quyết định 21 |
| §3 nguyên tắc | "Level và skill mở khu vực" | Quyết định 33; `content/world/regions.json` mọi khu `open` |
| §4 đoạn đầu và bảng | 11 khu, 8 chơi được, Trường học là trung tâm cổng sang 7 map, Núi tuyết/Đảo bí ẩn "Chưa dựng", "Nhà của Miu khi dựng xong" | `content/world/regions.json` (12 khu `open`), `tools/world/generate-*-map.ts` (12 generator), `assets/generated/world/trung-tam/entities.json` (11 cổng: mười map + Nhà của bé), `assets/generated/world/nha-cua-be/entities.json` (lõi 160 × 160), quest `kho-bau-dao-ch1`, `vuot-ai-nui-tuyet`, `vuot-ai-trung-tam` có bước `boss` |
| §5 | Vòng lặp "mở khu vực mới", "MVP chỉ làm Mèo", Skill Check "dẫn đến khu luyện tập", thiếu Tìm đồ vật, Logic, Minigame; Xu "chưa có cửa hàng" | `packages/schema/src/content.ts` (`decision`, `find-object`, `logic`, `boss`), `apps/server/src/quest/knowledge-gate.ts` (thiếu cấp thì bước vẫn đi tiếp), `apps/web/src/ui/shop/`, `docs/minigames.md` |
| §6 | Số màn đếm tay (24 và 26), màn NEW chưa có trạng thái, "phê duyệt bạn của phụ huynh" | Thêm cột Trạng thái; mỗi dòng đối chiếu thư mục `apps/web/src/ui/{journey,shop,mail,system,rewards,event,account,friends,coop}` và `apps/web/src/ui/challenge/mechanics/logic-challenge.tsx`; English hoãn theo `plans/dattqh/261004-1617-english-subject-content/plan.md` |
| §7 Realtime | "Colyseus hoặc `ws`" | `apps/server/src/multiplayer/` dùng `ws` ở `/api/ws` |
| §8 | Không có hiện trạng; "không P2P/WebRTC"; trạng thái chia sẻ thiếu thú cưng, tư thế | Bản production `459596aa` chứa các commit thêm `friend-store.ts`, `event-catalog.ts`, `ice-servers.ts`, `bot-brain/brain.ts`, `mail-routes.ts`, `trophy-room-routes.ts` (`git merge-base --is-ancestor`); `docs/system-architecture.md` dòng Chơi online, Nói chuyện bằng giọng |
| §8b | "phụ huynh bật hoặc tắt", đi theo đường có sẵn, tự training từ dữ liệu người chơi | `docs/system-architecture.md` dòng "Bạn máy tự đi, tự học"; `child_profiles.bots_enabled` |
| §8c | "Lưu theo hồ sơ bé" | `apps/web/src/ui/i18n/i18n.ts` (`PATCH /api/players/:id/language`) |
| §9 | Phụ huynh là chủ tài khoản, kết bạn bằng mã, phụ huynh tắt multiplayer, chống hack ở server | Plan `261005-0949-single-player-account`, `261004-1617-parent-area-friends`, `261004-1617-moderation-safety` (không chống cheat) |
| §10, §11 | Mèo cho MVP; "Phụ huynh → Hồ sơ trẻ" | Sổ quyết định trong `docs/system-architecture.md` (nhân vật ghép, mô hình player) |
| §15 | Ghi chú thay thế ở dòng 7, 8, 19, 25, 26, 34; thêm quyết định 36–53; sửa dòng rủi ro an toàn trẻ em | Mỗi dòng mới dẫn plan, report hoặc rule nguồn (bảng dưới) |

Quyết định mới ở §15 và nguồn:

| # | Nội dung | Nguồn |
| --- | --- | --- |
| 36 | Bốn loài từ MVP | `docs/project-roadmap.md` task #10, plan `260930-1639-character-library-species` |
| 37 | Mười hai map, Trung tâm là map trung tâm | Plan `261002-1619-nui-tuyet-dao-bi-an-maps`, `reports/jev-261002-1619-open-snow-island.md` |
| 38 | Nhà của bé | Plan `261003-1320-home-timetable-vehicles`, `261009-2155-home-pulls-to-maps`, `reports/jev-261003-1340-timetable-consent.md` |
| 39 | Minigame, thưởng mỗi lần chơi lại | `docs/minigames.md`, plan `261003-1549-minigames-home-polish` |
| 40 | Song ngữ | Master Plan §8c, `docs/i18n.md`, plan `261003-2330-bilingual-npc-stories-bots` |
| 41 | Bạn máy | Plan `261007-2122-bots-play-like-players`, `docs/system-architecture.md` |
| 42 | Trùm, Skill Check, `decision`, `find-object`, `logic` | Plan `261004-1617-boss-skill-check-new-mechanics`, `261005-2315-zone-guardians`, `261007-1829-boss-duel-play-moves`; schema ở `packages/schema/src/content.ts`, `world-target.ts` |
| 43 | Màn hệ thống V1, không có chuỗi ngày | Plan `261004-1617-system-screens-v1`, `reports/jev-261004-1648-open-questions.md` |
| 44 | Đối tượng mọi lứa tuổi | `.claude/rules/product-audience.md` |
| 45 | Một người chơi mỗi tài khoản | Plan `261005-0949-single-player-account` |
| 46 | Bạn bè không mã, luôn online | Plan `261004-1617-parent-area-friends`, `reports/jev-261005-1330-friends-rescope-output.json` |
| 47 | Co-op cho mọi tổ đội | Plan `261004-1617-coop-quests` (production `48f86ff9`), `reports/jev-261005-2200-coop-output.json` |
| 48 | Nói chuyện bằng giọng | Plan `261005-2335-voice-chat`, `reports/jev-261005-2335-voice-output.json` |
| 49 | Sự kiện có thời hạn | Plan `261004-1617-live-world-events`, `content/events/olympic-math-2026.json` |
| 50 | Phòng truyền thống | Plan `261008-2129-trophy-room` |
| 51 | Marketing tự chạy, GA4 phía server | Plan `261012-1116-auto-marketing`, `docs/marketing-channels.md` |
| 52 | Mở cho người ngoài từ 12/10/2026 | `docs/project-roadmap.md` (gate Marketing tự chạy: OAuth "In production") |
| 53 | Kiểm duyệt hoãn, không chống cheat | Plan `261004-1617-moderation-safety`; dòng Jev "Kiểm duyệt so với link mời" trong plan `261012-1116-auto-marketing`; lời người sở hữu 12/10/2026 "plan kiểm duyệt để làm sau" (xem mục Chưa kiểm được) |

Quyết định "không mở khóa" đã có sẵn ở §15 #33, không thêm dòng trùng; các dòng mới dẫn về #33.

### `docs/` và README

| File | Thay đổi | Bằng chứng |
| --- | --- | --- |
| `docs/system-architecture.md` | Thêm dòng "Cơ chế quest: lựa chọn hành động, tìm đồ vật, logic, trùm, Cổng tri thức" và dòng "Màn hệ thống: Cài đặt, Hộp thư, Kỹ năng lên cấp"; câu mở đầu nói mười hai map; bỏ chữ "Repo private" | `packages/quest/src/quest-progress.ts` (chấm `decision`, `find-object`, `boss`), `quest-routes.ts` (`GET /api/skill-check/:targetId`), `tools/content/check-content.ts` (kiểm `skillCheck`), `apps/server/src/mail/mail-routes.ts`, `apps/web/src/ui/system/full-settings.tsx`, `completion-sequence.tsx`; repo công khai theo `CLAUDE.md` |
| `docs/codebase-summary.md` | Bản đồ: mười hai generator trên `zone-map.ts`; bỏ `MAP_BY_REGION` (không còn) thay bằng `mapForRegion`; danh sách E2E cũ (`creator`, `home`, `challenges`, `mvp-loop` không còn) thay bằng trỏ về bộ smoke mười luồng; CI đủ năm gate cộng các job; màn hệ thống, chuỗi màn hoàn thành (không còn màn Mở khóa); UI tài khoản theo mô hình người chơi | `git ls-files apps/web/e2e` (10 spec smoke cộng `perf`, `screens`), `.github/workflows/ci.yml`, `packages/schema/src/region.ts` |
| `docs/project-overview-pdr.md` | Bỏ "MVP chỉ có Mèo", "không WebRTC", "Miu là Mèo"; thêm dòng kiểm duyệt hoãn; phiên bản đồng ý trỏ về `content/legal/consent-vi.json` (nay v4) | `content/legal/consent-vi.json`, quyết định 36, 48, 53 |
| `docs/i18n.md` | Ngôn ngữ nay lưu cả trên server | `apps/web/src/ui/i18n/i18n.ts` (`syncLanguageToServer`, `bindLangProfile`), `apps/server/src/player/player-routes.test.ts` |
| `docs/project-roadmap.md` | Thêm dòng plan nghiệm thu MVP; sửa dòng giai đoạn MVP, MP và dòng "Hoàn thiện Master Plan v3" (kiểm duyệt hoãn cả sau 12/10) | Như trên |
| `README.md` | Bỏ "giai đoạn Foundation", "cho trẻ em", lệnh E2E có project `account` không tồn tại; dùng `e2e:smoke` | `apps/web/package.json` (`e2e:smoke`), `CLAUDE.md` |

## Kiểm tra

- Liên kết: script quét mọi liên kết Markdown tương đối và mọi đường dẫn repo trong dấu backtick ở `README.md`, Master Plan và `docs/*.md`: 43 liên kết, 623 đường dẫn. Không liên kết nào gãy. Bốn đường dẫn không tồn tại đều có chủ ý: `assets/vendor/`, `assets/build/`, `content/world/bot-routes/` là phương án bị loại hoặc đã gỡ, `content/outfit-rules.json` là hướng dẫn tạo file khi cần.
- Số dòng: mọi file `docs/*.md` dưới 800 dòng (`wc -l`).
- Không chạy E2E, test, `content:check` (đúng phạm vi giao; chỉ sửa tài liệu).

## Chưa kiểm được hoặc cần người

- **Kiểm duyệt hoãn sau 12/10/2026:** câu "plan kiểm duyệt để làm sau" của người sở hữu chỉ có trong ghi nhớ của agent, chưa có trong repo; repo chỉ có plan `moderation-safety` (hoãn 04/10) và dòng Jev 0,56 trong plan marketing. Nếu người sở hữu muốn khác thì sửa §15 #53.
- **IP trong kênh voice của tổ đội:** plan voice ghi "khi có người ngoài chơi thì buộc đi qua TURN với thành viên không phải bạn bè, làm cùng đợt kiểm duyệt". Từ 12/10/2026 đã có người ngoài nhưng code vẫn chỉ đi TURN khi bật `?voiceRelay`. Đã ghi vào §15 #48; đây là việc của plan kiểm duyệt, cần người sở hữu biết.
- **§16 của Master Plan** còn dẫn E2E đã gỡ (`creator`, `mvp-loop`, `hud-layout`, `challenges`) và "vào 7 map chủ điểm". Để lại cho pha 7 (chốt gate) vì pha đó làm chủ checklist §16.
- Chỉ tiêu "bạn máy giống 90% người thật" (§8b) không tìm thấy số đo trong repo; đã ghi là chưa đo.
- `docs/project-roadmap.md` dòng "Chiến lược kiểm thử" vẫn nói "bộ smoke 9 luồng": đó là hồ sơ của plan khác ở thời điểm 07/10, không sửa; số hiện hành (mười luồng) ở `docs/code-standards.md`.
- Trạng thái các pha 1, 2, 4–7 của plan nghiệm thu không được xác minh trong phiên này (có phiên khác đang sửa `apps/web/review.html` và thêm `apps/web/e2e/map-budget.spec.ts`); dòng roadmap chỉ ghi pha 3 xong.
