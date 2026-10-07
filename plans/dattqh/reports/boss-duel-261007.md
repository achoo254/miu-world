# Report: trận đấu trùm thành trận chơi được (07/10/2026)

Plan: `plans/dattqh/261007-1829-boss-duel-play-moves/` (cả 5 pha, nhánh `main`, chưa commit theo yêu cầu người điều phối).

## Kết quả

Mở một trận trùm khi game sẵn sàng thì thế giới 3D vẫn chạy. Bé đứng cạnh trùm thật, camera khung cả hai phía trên thẻ câu hỏi, HUD và cần điều khiển tạm ẩn. Mỗi câu được trả lời bằng một động tác chơi ghi trong nội dung: ném bùa, chạm cầu, kéo ngọc hoặc nạp chiêu. Không còn nút "Giải đố" và không có đồng hồ. Server vẫn chấm đúng/sai, tính HP và thưởng. Ba lớp hỗ trợ, thẻ chép vở sau mỗi đòn đúng, lời trùm sau mỗi đòn và tổ đội theo lượt vẫn giữ. Khi không dựng được sân đấu, trận hiện thành thẻ trên game dừng như trước, với cùng động tác ở dạng tĩnh. E2E `bosses` 8/8 và `coop` 5/5 pass trên máy dev. Trong trận đấu thật ở Núi tuyết, `__miuStats.duel` là `staged`.

## Theo pha

### Pha 1: hợp đồng cầu nối và trường `move`

Phase file đã được viết lại theo Validation Log: động tác là trường nội dung `move`, không phải hàm `duelMoveFor`.

- `packages/schema/src/content.ts` thêm `DUEL_MOVES`, `DuelMove`, `DUEL_ALL_MOVES_FROM` và `duelMoveIssues`. Hàm này chạy trong phần kiểm bước boss, tức là `content:check`. `move` bắt buộc ở `BossTurnWithSecret` (nội dung). Ở `BossTurn` công khai thì `move` là tùy chọn, để bản web mới vẫn đọc được server cũ trong vài giây lúc deploy; client mặc định là `fling`.
- File mới `tools/content/duel-moves.ts` gồm `duelMovesFor` (băm FNV-1a theo `bossId`, xoay ±1 vòng) và script `pnpm exec tsx tools/content/duel-moves.ts`. Script chèn một dòng `"move"` sau dòng `"skill"` và giữ nguyên bố cục file; chạy lại thì không đổi các lượt đã có `move`.
- `tools/content/build-guardian-quests.ts` ghi luôn `move`. Chạy lại generator cho ra đúng byte 42 file `ward-*` (kiểm bằng `diff -r`).
- Nội dung: 59 file `content/quests/*.json`, 290 lượt có `move`. Không có hai lượt liền nhau trùng động tác. Mỗi động tác là động tác mở trận của ít nhất 10 trùm: charge 12, orbs 15, fling 18, gem 14.
- `apps/web/src/game-bridge/game-store.ts` thêm `duel-open`, `duel-cue` (`aim` cùng `to`, và `hit|miss|win|ally-hit|fizzle`), `duel-close`, sự kiện `duel`, `snapshot.duel` và `setDuelAnchors`/`getDuelAnchors`.
- Fixture thêm `move`: `packages/quest/src/quest-progress.test.ts`, `apps/server/src/coop/party-quest.test.ts`, `tools/content/content-variety.test.ts`, `packages/schema/src/guardian-content.test.ts`.
- Kiểm `content:check` có chặn thật: sửa tạm một lượt cho trùng thì báo `step tran-trum: turn do-choi: the same move (orbs) as turn chu-sau-a before it`, sau đó đã trả file về như cũ.

### Pha 2: sân đấu 3D

- File mới `apps/web/src/game/duel/duel-stage.ts` là máy trạng thái của trận. Khi mở trận, nó tìm trùm; bé ở xa thì `standBeside`, kiểm `usableSpot` rồi `teleport`. Nó thử khung camera ở hai bên và bắn tia từ camera tới đầu bé và ngực trùm; bị che thì trả `unavailable`. Phần còn lại: dáng trùm, vật bay, chớp sáng, bong bóng phản đòn, bé ném và né, rung camera, ghi `--duel-x`/`--duel-y` vào neo (chỉ ghi khi lệch quá 0,5 px), và `reframe` khi đổi cỡ màn hình.
- File mới `duel-camera.ts`: camera lệch 40°, lùi tối thiểu 5,5 khối, khung chừa 1/8 phía trên cho thanh tên và phần dưới cho thẻ (45% màn dọc, 35% màn ngang).
- File mới `duel-poses.ts`: các dáng chờ, khiêu khích, trúng (lảo đảo dựng bằng code), phản đòn, và thua (cúi chào rồi `dance`).
- `entities/interactables.ts` thêm `duelPose()` và `height`, cùng clip `gesture-negative`/`emote-no` và `emote-yes`.
- `player/camera-rig.ts` thêm `setOverride` (ease 0,6 s, hoặc nhảy thẳng ở bản nhẹ) và `shake`.
- `interact/player-actions.ts` thêm `throw` và `dodge`.
- `debug/stats-overlay.ts` thêm `duel` và `duelView`.
- `game.ts` (file dùng chung, sạch lúc sửa): khoảng 55 dòng nối. Gồm dependency của `DuelStage`, ba lệnh, nhánh `duel.active` trong vòng khung (đọc và bỏ input, `interact = false`), `duel.update` sau `rig.update`, cleanup, `resize`. Cần điều khiển, nút chạy và bản đồ nhỏ được ẩn rồi trả lại đúng trạng thái cũ.
- Không tạo mesh mới. Hạt đi qua `objectEffects.spawn`; bản nhẹ dùng tối đa 8 hạt mỗi đòn (có test).

### Pha 3: màn đấu và bốn động tác

- `boss-screen.*` được đổi tên bằng `git mv` thành `boss-duel.tsx`, `.css`, `.test.tsx`. Người điều phối đã bỏ khỏi index, nên `git status` hiện file cũ là deleted và file mới là untracked.
- File mới:
  - `boss-hud.tsx`: tên, thanh HP, số trừ bay lên, chấm tiến độ.
  - `duel-calm.ts`.
  - `use-duel-lifecycle.ts`.
  - `moves/`: `move-target.tsx`, `move-field.tsx`, `fling-move.tsx`, `orbs-move.tsx`, `gem-move.tsx`, `charge-move.tsx`, `use-drag.ts`, `use-duel-anchors.ts`, `moves.css`.
  - `apps/web/src/ui/kit/reduced-motion.ts`; `completion-sequence.tsx` chỉ đổi sang import hàm này.
- `kit/modal.tsx` và `modal.css` thêm prop `scrim` (mặc định `true`).
- Locales thêm `boss.move.{fling,orbs,gem,charge}` (pool 3 câu, có `{name}`, chọn bằng `freshPicker` cấp module), `boss.turnOf`, `boss.charge`, `boss.charged`, `boss.damage`, `boss.charm`, `boss.gem`, `boss.answers`, `boss.skip`. Khóa `boss.attack` đã bỏ.
- Mọi đích là `<button>`, dùng được bằng chạm, chuột và Tab/Enter, kích thước ≥ 48 × 56 px. Thêm nút ✕ `boss-close`.

### Pha 4: luồng chơi và tổ đội

- `quest-layer.tsx` (file dùng chung, sạch lúc sửa) dùng `useDuelLifecycle`. Khi trận ở trạng thái `staged` và thẻ vở không mở, bước boss không tính là che game và báo `onDuelChange(true)`. Component bọc `GameStoreContext.Provider` và nhận `onRetriedRight`.
- `use-quest-controller.ts`:
  - `overlayLive`: thẻ vở, retry, skill check và màn thưởng vẫn che game.
  - Đòn thắng khi `staged` giữ màn (`bowing`) tới khi `finishBoss`. Nút ✕ hoặc Esc lúc trùm đang cúi chào cũng chạy `finishBoss`. Đẩy tiến độ tổ đội thì xóa `bowing`.
  - Gửi lại từ banner mất mạng: vẫn hiện thẻ vở và đóng trận thắng.
  - Người điều phối đã commit riêng 3 hunk toast của agent debug trong file này (f6a266ca).
- `play-screen.tsx`: `duelOpen` không vào `covered`. HUD được giữ mounted nhưng ẩn (`hud-layer`). `partyPlay.turn` lấy từ `partyQuest.turn` và chỉ áp dụng cho đúng quest của đội.
- `learning-step.tsx`: HP của trùm đọc từ tiến độ của quest (`data.quests[].progress.bossState`). Đây là lỗi có từ trước mà E2E `coop` mới bắt được: lượt đẩy tổ đội không làm HP trên máy bạn tụt.

### Pha 5: E2E, ảnh, tài liệu

- `e2e/quest-api.ts` thêm `answerBoss` (chạm trên màn cảm ứng, chuột thì bấm đúng tọa độ) và `skipBossBeat`.
- `bosses.spec.ts`:
  - Trận chính kiểm `duel === 'staged'`, số khung hình tăng, HUD và joystick ẩn, giữ W mà bé không đi. Ghi `data-move` từng câu và kiểm đủ 4 động tác, không trùng liền. Có một lượt kéo thật bằng CDP touch.
  - Test mới về draw call trong trận và test mới về giảm chuyển động.
  - Hai test ảnh ở 360 × 740 và 820 × 1180 (chỉ chạy khi `REVIEW_SHOTS=1`).
- `coop.spec.ts`: người không tới lượt thấy đích bị khóa và dòng "Lượt của…"; người tới lượt đánh một đòn thì HP trên máy kia tụt.
- Tài liệu: `docs/system-architecture.md` (hàng trùm và sổ quyết định), `docs/design-guidelines.md` (mục động tác chơi), `docs/project-roadmap.md`, `docs/codebase-summary.md`.
- Trang review: thêm đoạn trận đấu vào `apps/web/review.html` và chú thích ảnh vào `apps/web/src/review/review-main.ts`. Ảnh nằm trong `assets/generated/review/bosses/`: sửa 6 ảnh, thêm 4 ảnh `6-cau-dai-*`. Đã chạy `pnpm assets:manifest`.

## Bằng chứng kiểm tra (máy dev, lần chạy cuối)

| Gate | Kết quả |
| --- | --- |
| `pnpm assets:check` | OK, 16 pack, 4632 file (sau `assets:manifest`) |
| `pnpm content:check` | OK, 2038 file |
| `pnpm typecheck` | 0 lỗi (root, `apps/server`, `apps/web`); `apps/web` chạy lại sau commit f6a266ca, vẫn 0 lỗi |
| `pnpm lint` | 0 lỗi, 0 warning |
| vitest, các file đã chạm | 39 file, 318 test pass (content, schema, quest, server party, web bridge/game/duel/ui) |
| `pnpm --filter @miu/web build` | Build xong. Có 2 cảnh báo đã có từ trước: chunk > 500 kB (`accessories` 1,25 MB) và cảnh báo `configLoader: 'native'` của Vite |
| `pnpm security:dist` | OK, không có đáp án quest trong `dist` |
| E2E `--project setup --project bosses` | 8/8 pass (38,9 s, có `REVIEW_SHOTS=1`) |
| E2E `--project setup --project coop` | 5/5 pass (53,9 s) |

Draw call ở `quality=high`, đo trên GPU máy dev (CI đo lại bằng GPU giả lập, ngân sách 150):

| Chỗ đo | Draw call |
| --- | --- |
| Núi tuyết, đứng cạnh trùm canh khu trước trận | 114 |
| Cùng chỗ, trong trận (sau một đòn trượt, camera đã tới khung đấu) | 108 |
| Ảnh review, Lâu đài, 360 × 740 | 125 |
| Ảnh review, Lâu đài, 820 × 1180 | 131 |
| Ảnh review, Đảo bí ẩn, 360 × 740 | 90 |
| Ảnh review, Đảo bí ẩn, 820 × 1180 | 102 |

Trận đấu không thêm mesh; chênh lệch giữa các con số là do góc camera khác nhau. Cả 4 trận lấy mẫu (Núi tuyết, Lâu đài cầu treo, Đảo rừng nhiệt đới, cộng trận chính) đều `staged`, không trận nào rơi về `unavailable`.

## Review độc lập (agent `code-reviewer`)

Không có lỗi critical. Đã sửa các mục sau:

- **Gửi lại từ banner mất mạng:** mất thẻ vở, bắn nhầm `ally-hit`, trận thắng không tự đi tiếp. Đã sửa bằng `onRetriedRight`; `finishBoss` chạy sau lần gửi lại; câu bị `fizzle` vẫn tính là của bé. Có test mới.
- **Câu kế tiếp hiện ra trước thẻ vở trong nhịp trúng:** giờ màn giữ câu vừa đánh, đáp án được tô sáng tới hết nhịp. Có test mới.
- **HUD mount lại sau mỗi thẻ vở:** giờ HUD giữ mounted và chỉ ẩn.
- **Câu hướng dẫn có thể lặp:** picker chuyển lên cấp module.
- **Đổi cỡ màn hình:** thêm `reframe`.
- **Cấp phát `Vector3` mỗi khung:** dùng vector tạm.
- **Kéo thả re-render theo pointermove:** giờ ghi style thẳng vào phần tử.
- **`controls(true)` bỏ ẩn mọi thứ:** giờ trả lại đúng trạng thái trước.
- **`skipBossBeat` không bấm thật:** giờ chờ nút xuất hiện khi sân 3D đang chạy và không ở bản nhẹ.
- **Bước thưởng sau khi trùm cúi chào:** có test chạy đúng một lần.
- **`move` bắt buộc ở bản công khai:** đổi thành tùy chọn.
- **`codebase-summary.md` trỏ file cũ:** đã sửa.

Ảnh review còn cho thấy thêm hai lỗi, đã sửa:

- Camera quá gần, lưng bé che trùm. Đã đổi sang lệch 40° và lùi tối thiểu 5,5 khối.
- Hiệu ứng trượt vào (`transform`) của thẻ làm thanh tên và các đích bị kẹt trong thẻ ngay sau khi thẻ vở đóng. Đã tắt hiệu ứng ở sân 3D.

## Cái không chạy hoặc chưa làm, và lý do

- Không chạy full `pnpm test`, `e2e:ci`, `perf` (quy định máy dev). Semgrep và `pnpm audit` để CI chạy.
- Chưa chụp ảnh trận có câu dài nhất toàn bộ (122 ký tự, trùm sự kiện Olympic, cần sự kiện đang mở) và đáp án dài nhất (39 ký tự, Hiệp Sĩ Đá ở bài vượt ải Lâu đài, cần chơi hết các bước trước bằng API). Đã chụp câu 105 ký tự và đáp án 32 ký tự của trùm canh khu; cả hai không tràn và đích đều ≥ 48 px. E2E có kiểm kích thước và vị trí từng đích.
- Thử thách co-op `team-boss` giữ nguyên (câu hỏi mở 1).
- Không thêm clip `run` (không dáng nào dùng). Khi đưa bé tới cạnh trùm thì rắc hạt lấp lánh thay cho chớp mờ màn hình.
- CLI `ak plan update` / `ak plan phase close` báo `plan not found` (đã thử `ak plan reindex`), nên đã sửa `status: completed` trong `plan.md` và mục "Trạng thái" của từng phase bằng tay.
- Không thêm dependency, không thêm asset ngoài ảnh review.

## Đề xuất chia commit

Commit bằng tiếng Anh. Không dùng `git add -A`: `.claude/skills/`, `.claude/agent-memory/` không thuộc đợt này.

1. `feat(content): boss questions name the play move they are answered with`
   - `packages/schema/src/content.ts`, `packages/schema/src/guardian-content.test.ts`
   - `tools/content/duel-moves.ts`, `duel-moves.test.ts`, `build-guardian-quests.ts`
   - 59 file `content/quests/*.json`
   - `packages/quest/src/quest-progress.test.ts`, `apps/server/src/coop/party-quest.test.ts`, `tools/content/content-variety.test.ts`

   Commit này tự build được vì `move` công khai là tùy chọn.
2. `feat(web): game bridge commands for a boss fight staged in the world`
   - `apps/web/src/game-bridge/game-store.ts` và test
3. `feat(game): boss fights staged in the running world with poses, flights and a framing camera`
   - `apps/web/src/game/duel/**`
   - `game.ts`, `entities/interactables.ts` và test, `player/camera-rig.ts` và test, `interact/player-actions.ts`, `debug/stats-overlay.ts`
4. `feat(web): boss fights play out in the live world with varied play moves`
   - `apps/web/src/ui/challenge/boss/**` (xóa `boss-screen.*`)
   - `learning-step.tsx` và test
   - `ui/quest/quest-layer.tsx` và test, `use-quest-controller.ts` (phần còn lại sau f6a266ca)
   - `ui/play/play-screen.tsx` và test
   - `ui/kit/modal.*`, `ui/kit/reduced-motion.ts`, `ui/rewards/completion-sequence.tsx`
   - `ui/i18n/locales/*.json`

   Pha 3 và pha 4 gộp một commit vì `learning-step.tsx` và `boss-duel.tsx` mang thay đổi của cả hai pha.
5. `test(web): boss fight E2E with play moves, draw calls and less motion; review pictures`
   - `apps/web/e2e/{bosses.spec,coop.spec,quest-api}.ts`
   - `apps/web/review.html`, `apps/web/src/review/review-main.ts`
   - `assets/generated/review/bosses/*`, `assets/manifest.json`
6. `docs: boss duel in the architecture map, design guide and roadmap`
   - `docs/*`
   - `plans/dattqh/261007-1829-boss-duel-play-moves/*`, report này

## Câu hỏi còn mở

- Có cần chụp ảnh cho đáp án 39 ký tự (Hiệp Sĩ Đá) và câu 122 ký tự (trùm sự kiện Olympic) trước khi duyệt không? Đề xuất: để người duyệt xem trên máy thật, vì cùng bố cục với ảnh 105 và 32 ký tự đã kiểm.
