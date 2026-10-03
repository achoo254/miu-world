# Pha F: khung minigame, 3 game mẫu, nhiệm vụ phụ, thưởng mỗi lượt chơi

Ngày 03/10/2026 · Plan `plans/dattqh/261003-1549-minigames-home-polish/` · Tier L

## Kết quả

- Cơ chế quest `minigame`: bước `{ kind: "challenge", mechanic: "minigame", game, goal, params, prompt }`. Client gửi `{ answer: { score } }`; server chấm `score >= goal` (`checkMinigameScore` trong `packages/quest`). Không có đáp án hay lớp hỗ trợ, nên `security:dist` không đổi.
- Mô tả game: một file mỗi game `content/minigames/<id>.json` (`MinigameSpec`, `packages/schema/src/minigame.ts`). Catalogue server và `content:check` kiểm id game, mục tiêu (không vượt mục tiêu chuẩn đã được bot chứng minh) và params (khóa đã khai, đúng kiểu).
- Nhiệm vụ phụ: trường `category: "main" | "side"` (mặc định `main`), id `side-*`, hình dạng cố định (dialogue tại người giao, một minigame, reward, next). Luật bài học (2 cơ chế, wayfinding, ≥ 4 nơi, ≤ 2 nhiệm vụ mỗi nhân vật) không áp; luật "một nhân vật một map" vẫn áp.
- Khung web `apps/web/src/ui/minigame/`: màn phủ (cách chơi → 3-2-1 → chơi → kết quả), canvas theo devicePixelRatio (tối đa 2), vòng lặp bước cố định 60 Hz, một ngón (chạm, kéo, vuốt, giữ, ngưỡng tính theo px CSS), hiệu ứng chung (hạt, "+n", rung, âm Kenney qua `playCue`), giảm chuyển động, tự dừng khi ẩn tab hoặc mất focus, Esc để dừng. HUD (điểm/mục tiêu, đồng hồ, tim, nút dừng 56 px) do vòng lặp ghi thẳng vào DOM, React chỉ đổi màn.
- API game nhỏ: `defineMinigame({ sprites, createGame, draw, bot })`; registry tự tìm bằng `import.meta.glob`, mỗi game tải thành chunk riêng khi chơi. Thêm game = một thư mục và một JSON, không sửa file dùng chung.
- Bot test: `describeMinigame('<id>')`. Bot phải thắng và idle phải thua trên 3 màn hình (iPad ngang, iPad dọc, điện thoại) × 5 seed; cùng seed cho cùng kết quả; lượt dừng đúng giờ; `draw` chạy được mọi trạng thái.
- Ba game mẫu, có bot test và test luật riêng:

  | Game | Điểm bot (8 seed) | Idle | Mục tiêu chuẩn / quest |
  | --- | --- | --- | --- |
  | `runner` | 158–174 | 6–11 (chết sau 4–6 giây) | 30 / 25 |
  | `egg-catch` | 50–60 | 2–16 | 25 / 20 |
  | `penalty-kick` | 34–35 | 0 | 10 / 8 |

  `penalty-kick` có thêm một test: người chỉ sút thẳng vào giữa luôn thua, nên phải ngắm.
- Hình: 62 Fluent Emoji 3D mới (MIT) trong `assets/packs/fluent-emoji/<v>/minigame/`, khoảng 2,1 MB, tải bằng `assets:fetch` + `assets:manifest`. Có tái dùng 54 file icon/prop sẵn có. `sprites.ts` cho phép gọi theo tên hoặc emoji (`emoji('🥚')`, type chỉ nhận emoji có file); build chỉ copy đúng các file này.
- Trang dev `apps/web/minigame.html`: chỉ có trong bản review, không có trong `--mode release`. Tham số `?game=`, `&bot=1`, `&seed=`, `&at=` (dừng hình), `&species=`, `&region=`, `&goal=`.
- Ba nhiệm vụ phụ ở Khu rừng bí mật: `side-runner` và `side-penalty-kick` do Vẹt (`parrot-guide`) giao, `side-egg-catch` do Hải ly (`animal-beaver`) giao. Đây là hai NPC duy nhất trên các map không gắn chương hay quest nên luôn có mặt. Vẹt có hai trò nên bé được chọn trò trước.
- Tài liệu cho các agent làm lô game: `docs/minigames.md`.

## Quyết định: nhiệm vụ phụ không chiếm bài học

- `GET /quests` vẫn chỉ trả bài học, giữ nguyên hợp đồng cũ. `GET /quests?category=side&region=` trả nhiệm vụ phụ. Vì vậy Home, bảng nhiệm vụ, HUD tracker, `currentQuest`/`questForRegion` và mũi tên không bao giờ thấy nhiệm vụ phụ, và không phải sửa file nào ngoài phạm vi.
- Khi bé chạm một nhân vật: nếu bước hiện tại của bài học cần nhân vật đó thì bài học được ưu tiên; nếu không, nhân vật mời chơi (`useSideQuests`, cài qua `onSideTarget` của controller). Nhiệm vụ phụ không gọi `set-target-hint` hay `set-world-state`.
- Chỉ gửi lên server khi bé thắng một lượt: các bước của lượt được gửi theo thứ tự (lời mời, điểm, reward, next), và thẻ kết quả hiện XP, xu và lên cấp lấy từ response.
- Bước minigame trong bài học chính cũng chạy được (`learning-step.tsx`): điểm gửi khi bé bấm "Xong" sau lượt thắng.

## Quyết định: mỗi lượt chơi đều được thưởng (người sở hữu, 03/10/2026)

- Không có migration. Số lượt tính từ sổ thưởng: lượt 1 vẫn ghi nguồn `quest:<id>` như cũ, lượt n ghi `quest:<id>#<n>`; khóa unique (child, source) giữ mỗi lượt chỉ trả một lần, kể cả khi gọi đồng thời.
- `QuestProgressDto.run` cho biết lượt của các bước đã ghi. Khi mọi bước đã xong, chỉ request ghi `run: run + 1` mới bắt đầu lượt mới: hàng tiến độ được đặt lại từ bước đầu, `completedAt` giữ ngày xong lần đầu, quest vẫn ở trạng thái "đã xong". Gửi lại bước cuối, gửi lượt cũ, hay không ghi lượt đều trả `repeated` và không thưởng thêm.
- Sao giữ mức cao nhất qua các lượt; `xpAwarded` lấy theo lượt mới nhất. Vật phẩm cộng dồn theo luật kho đồ sẵn có. Xem đáp án trong lượt chơi lại vẫn tính vào lượt đó.
- Client: controller gửi `run` trong mọi bước (`runFor`). Bài đã xong thì chạm nhân vật của bước đầu là bắt đầu lượt mới; chuỗi màn thưởng hiện lại mỗi lượt. Thẻ kết quả minigame hiện phần thưởng mỗi lần thắng. Trước đây không có dòng chữ nào nói "chơi lại không được thưởng", nên không có chữ cũ phải sửa.

## Ảnh

Thư mục `plans/dattqh/reports/minigame-framework-261003/`, chụp từ trang dev ở cổng 5199 (chạy qua lock, server đã tắt sau khi chụp):

- `list.png`: danh sách game.
- `<game>-intro-landscape.png`: thẻ cách chơi (cả 3 game).
- `<game>-play-{landscape,portrait,phone}.png`: đang chơi, bot cầm, dừng ở giây thứ 7, nhân vật cáo.
- `egg-catch-result-portrait.png`: thẻ thắng với 3 sao, +15 XP, +5 xu (phần thưởng mẫu của trang dev).
- `penalty-kick-play-snow.png`: màu theo map Núi tuyết.

Đã xem lại ảnh và sửa hai chỗ: trên điện thoại dọc, runner được đẩy lên gần giữa màn hình; vạch sân đổi sang xanh trên nền tuyết.

## Kiểm tra (chạy riêng từng phần, không chạy E2E hay full `pnpm test`, theo yêu cầu)

- Vitest trên các vùng đã sửa (`packages/schema`, `packages/quest`, `apps/server/src/quest`, `apps/server/src/content`, `account-routes`, `tools/content`, `apps/web/src/ui/{minigame,quest,challenge,play}`): 39/41 file xanh. Hai file đỏ, `tools/content/check-content.test.ts` (8 test) và `check-curriculum.test.ts` (1 test), đều chỉ vì một lỗi: "content/home/decor.json has no validator", file mới của agent H đang làm dở. Trước khi file đó xuất hiện, `content:check` đã xanh với nội dung của tôi.
- `quest-routes.test.ts`: 51/51, gồm 9 test mới: chơi lại trả thưởng, gửi trùng và gửi đồng thời trả một lần, lượt cũ không trả, sao cao nhất, xem đáp án trong lượt chơi lại, danh sách theo category, chấm điểm minigame.
- `pnpm lint`: exit 0. Typecheck web và server sạch. Root `tsc` chỉ báo lỗi trong `tools/world/_dump*-tmp.ts` (file tạm của agent khác).
- `pnpm --filter @miu/web build` thành công (copy 3280 runtime asset), `pnpm security:dist` OK.
- `pnpm assets:check`: phần của tôi khớp (sprite có trong manifest và được ship). Gate đang đỏ vì hash `generated/world/*` và manifest lệch với cây file trong lúc agent H sinh lại map. Phiên chính cần chạy lại `pnpm assets:manifest` sau khi H xong.

## File

Mới:
- `apps/web/src/ui/minigame/**`: types, rng, input, round, define-minigame, registry, sprites, sprite-sheet, theme, draw-kit, effects, bot-driver, minigame-stage, minigame-overlay, minigame.css, framework.test, `testing/{play-round,describe-minigame}.ts`, `dev/`, `games/{runner,egg-catch,penalty-kick}/`.
- `apps/web/minigame.html`.
- `apps/web/src/ui/quest/side-quests.{tsx,css,test.tsx}`.
- `content/minigames/*.json` (3 file).
- `content/quests/side-{runner,egg-catch,penalty-kick}.json`.
- `packages/schema/src/minigame{,.test}.ts`.
- `apps/server/test/fixtures/quests/side-egg.json`.
- `docs/minigames.md`.

Sửa:
- `packages/schema/src/{content,game}.ts`.
- `packages/quest/src/{check-answer,quest-progress,quest-catalog}.ts` cùng test.
- `apps/server/src/{content/content-catalog,quest/quest-routes,quest/quest-access,quest/quest-completion,reward/reward-ledger}.ts`, `quest-routes.test.ts`, `apps/server/test/quest-solution.ts`.
- `apps/web/src/ui/quest/{quest-flow,use-quest-controller,quest-layer}.ts(x)` cùng test, `apps/web/src/ui/challenge/learning-step.tsx`.
- `tools/content/{check-content,quest-spread,content-variety}.ts`, `quest-spread.test.ts`.
- `tools/assets/sources.json`, `assets/manifest.json` (sinh lại, không sửa tay).
- `apps/web/vite.config.ts`.

Không có dependency mới.

## Lệch so với phạm vi giao

- `apps/web/vite.config.ts`: ngoài việc thêm trang dev vào bản review, file này còn phải đưa `MINIGAME_SPRITE_PATHS` vào danh sách file UI được copy và đánh version. Nếu không, bản build không có hình game. Thay đổi là một dòng import và một hằng số.
- `apps/server/test/` (fixture `side-egg.json` và case `minigame` trong `quest-solution.ts`): cần cho test route và cho typecheck.

Status: DONE_WITH_CONCERNS
Summary: Khung minigame, 3 game mẫu có bot test thắng/thua, cơ chế quest `minigame` do server chấm và trả thưởng, 3 nhiệm vụ phụ ở Khu rừng không chiếm bài học, mỗi lượt chơi lại đều được thưởng mà không cần migration, cùng tài liệu `docs/minigames.md` cho các agent làm lô game.
Concerns:
- `assets:check` và `content:check` (cùng 9 test content) đang đỏ do việc dở của agent H (`content/home/decor.json`, map đang sinh lại). Cần chạy lại `pnpm assets:manifest` và cả gate sau khi H xong.
- Chưa chạy E2E (theo yêu cầu). Luồng NPC → minigame trên `/play` mới được kiểm bằng test jsdom và ảnh từ trang dev. Spec E2E cũ có kiểm body của request step có thể cần thêm `run`.
- Điểm do thiết bị gửi lên. Server chỉ giới hạn trong 0–9999 và ≥ goal, nên một client sửa đổi có thể gửi điểm thắng. Thưởng nhỏ (15 XP, 5 xu) và đã có giới hạn tốc độ 30 lần/phút mỗi bước. Có thể thêm trần lượt/giờ nếu người sở hữu muốn.
- Trong lúc chơi lại một bài đã xong, HUD tracker (`player-data.nextStep`, ngoài phạm vi của tôi) vẫn có thể hiện "đã xong" vì trạng thái quest giữ `completed`. Mũi tên vẫn chỉ đúng.
- `docs/README.md` chưa có link tới `docs/minigames.md`. Plan cũng chưa được đánh dấu pha F xong. Việc này để phiên chính làm.
- Agent làm lô game cần hình mới thì phải sửa `tools/assets/sources.json` và `sprites.ts` (file dùng chung). Kho sẵn khoảng 120 hình nên ít khi cần; nên gom yêu cầu hình về phiên chính.
