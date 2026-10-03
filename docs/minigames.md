# Minigame: thêm một trò chơi

Minigame là nhiệm vụ phụ cho vui (người sở hữu, 03/10/2026): bé nói chuyện với một nhân vật trên map, chơi một trò 30–90 giây, thắng thì nhận XP và xu. **Mỗi lần thắng đều được thưởng, chơi lại vẫn được thưởng, không giới hạn** (người sở hữu, 03/10/2026; áp cho cả nhiệm vụ bài học). Server chấm `score >= goal` và tính thưởng; client chỉ gửi điểm.

Thêm một trò = **một thư mục + một file JSON**. Không sửa file dùng chung nào (registry tự tìm bằng `import.meta.glob`).

## Các file

| File | Nội dung |
| --- | --- |
| `content/minigames/<id>.json` | Tên, cách chơi, họ cơ chế, cử chỉ, thời gian, mục tiêu chuẩn, tham số. Schema: `MinigameSpec` trong `packages/schema/src/minigame.ts`. |
| `apps/web/src/ui/minigame/games/<id>/logic.ts` | Logic thuần: không DOM, không canvas, không `Math.random` (dùng `rng`). |
| `apps/web/src/ui/minigame/games/<id>/draw.ts` | Vẽ một khung hình từ `state`. |
| `apps/web/src/ui/minigame/games/<id>/index.ts` | `export default defineMinigame({ sprites, createGame, draw, bot })`. |
| `apps/web/src/ui/minigame/games/<id>/<id>.test.ts` | `describeMinigame('<id>')` cộng test luật riêng nếu cần. |

`<id>` kebab-case, trùng tên file JSON và tên thư mục. Ba trò mẫu: `runner`, `egg-catch`, `penalty-kick`. Đọc một trong số đó trước khi viết.

```json
{
  "id": "egg-catch",
  "name": "Hứng trứng",
  "family": "catch",
  "howTo": ["Kéo giỏ sang trái, sang phải để hứng trứng rơi.", "Trứng vàng được ba điểm. Né đá nhé!"],
  "controls": ["drag"],
  "duration": 40,
  "goal": 25,
  "params": { "speed": 1 }
}
```

- `howTo`: 1–3 dòng ngắn, gọi bé là `{name}` (không bao giờ "Miu").
- `controls`: `tap`, `drag`, `swipe`, `hold`.
- `goal`: mục tiêu chuẩn mà bot test chứng minh đạt được. Quest đặt `goal` nhỏ hơn hoặc bằng số này.
- `params`: giá trị mặc định; quest được ghi đè cùng kiểu (`content:check` báo khóa lạ hoặc sai kiểu). Logic phải tự kẹp giá trị vào khoảng an toàn.

## API (`apps/web/src/ui/minigame/types.ts`)

```ts
createGame(setup: GameSetup): MinigameLogic<S>
// setup: { arena: {width, height}, goal, duration, params, rng }
// trả về: { state, step(dt, input), score, done, lives?, drainEvents() }
draw(ctx, state, view: DrawView): void   // view: { arena, time, sprites, theme, player, reducedMotion }
bot(state, { arena, time, goal }): BotMove // { touch?, tap?, swipe?: { from, dx, dy } }
```

- **Arena**: cạnh ngắn của màn hình luôn là 600 đơn vị, cạnh dài co giãn (iPad ngang 863 × 600, iPad dọc 600 × 863, điện thoại 600 × 1298). Bố cục theo `arena`, đừng cố định kích thước. Giữ thứ quan trọng dưới `HUD_SAFE_TOP` (110). Vật bé chạm có bán kính ≥ `TOUCH_RADIUS` (40, tức ≥ 48 px trên điện thoại).
- **step** chạy cố định 60 Hz (`dt` = 1/60). Host dừng lượt khi hết `duration` hoặc khi `done`. `won` không do game quyết: host và server cùng tính `score >= goal`.
- **input** (`GameInput`): `pointer` (ngón đang chạm, hoặc null), `pressed`, `released`, `holdTime`, `taps[]`, `swipes[]` (hướng, `from`, `dx`, `dy`, `speed`). Một ngón, ngưỡng tính theo pixel CSS nên vuốt trên điện thoại và iPad như nhau.
- **lives**: có thì HUD hiện số tim; không có thì bỏ trống.
- **Sự kiện** (`drainEvents`, dùng `eventQueue()`): `score` (lấp lánh, "+n", tiếng sao; có `points`), `hit` (rung màn hình, tiếng nhẹ), `miss` (bụi nhỏ, không tiếng), `action` (bụi, tiếng click). Game chỉ phát sự kiện; host làm hiệu ứng và âm thanh (`effects.ts`, âm thanh Kenney qua `sound/sfx.ts`), nên 100 trò có cùng cảm giác. Giảm chuyển động (`reducedMotion`): không rung, ít hạt; game tự bỏ nảy mạnh.
- **Bot**: chơi tốt, ra quyết định 10 lần mỗi giây như một bé nhanh tay. Bot đọc thẳng `state`.

## Hình ảnh

Chỉ dùng Fluent Emoji 3D đã có trong `assets/manifest.json`, qua `apps/web/src/ui/minigame/sprites.ts`: `view.sprites.draw(ctx, 'egg', x, y, size, { rotate, alpha, flipX, squash })`, hoặc viết bằng emoji: `emoji('🥚')` (kiểu chỉ nhận emoji có file). Liệt kê mọi hình trong `sprites` của `defineMinigame`; host tải trước khi đếm ngược. `view.player` là nhân vật của bé (mèo, thỏ, cáo, gấu).

Nền vẽ bằng code theo màu của map (`view.theme`, mọi màu là token trong `tokens.css`) với `draw-kit.ts`: `paintSky`, `paintHills`, `paintGround`, `paintShadow`, `paintLabel`, `roundRect`, `bob`. Không hardcode màu, không vẽ tay ảnh, không tải từ host khác.

Thiếu hình: thêm file Fluent Emoji vào gói `fluent-emoji` trong `tools/assets/sources.json` (`"to": "minigame/<tên>.png"`, `sha256` để trống), chạy `pnpm assets:fetch` rồi `pnpm assets:manifest` (qua lock của phiên), rồi thêm một dòng vào `FETCHED` trong `sprites.ts`. `sources.json` và `sprites.ts` là file dùng chung: các agent chạy song song gom yêu cầu hình về phiên chính. Kho đã có sẵn khoảng 120 hình (thú, quả, bóng, xe, thời tiết, đồ chơi), xem `sprites.ts` trước.

## Kiểm thử

```ts
// games/<id>/<id>.test.ts
import { describeMinigame } from '../../testing/describe-minigame';
describeMinigame('<id>');
```

Test này chạy trên ba màn hình mẫu và 5 seed: bot **phải thắng**, không chạm gì **phải thua** (trò mà đứng yên cũng thắng thì truyền `{ loser }` là một người chơi kém), cùng seed cho cùng kết quả, lượt kết thúc đúng giờ, `draw` chạy được trên mọi trạng thái. Thêm test luật riêng (va chạm, tính điểm) khi cần. Chạy: `pnpm vitest run apps/web/src/ui/minigame/games/<id>`.

Cân mục tiêu: idle phải thua rõ, bot thắng dư. Trẻ 7–8 tuổi nên thắng sau 1–3 lần chơi. Sao trên thẻ kết quả: 1 sao ở `goal`, 2 sao ở 1,4×, 3 sao ở 1,8×.

## Trang dev

`/minigame.html` (chỉ có trong bản review, không có trong bản release): danh sách mọi trò; `?game=<id>` chơi thử không cần đăng nhập; `&bot=1` cho bot chơi; `&seed=`, `&at=<giây>` (dừng hình để chụp), `&species=`, `&region=`, `&goal=`. Thắng thì hiện phần thưởng mẫu, không gọi server.

## Nhiệm vụ phụ

`content/quests/side-<…>.json`, `"category": "side"`, id bắt đầu `side-`. Hình dạng cố định (schema kiểm): bước 1 là `dialogue` tại nhân vật giao (`target`, trigger `interact`), rồi đúng một bước `{ "kind": "challenge", "mechanic": "minigame", "trigger": "auto", "prompt": "…", "game": "<id>", "goal": N, "params": {…} }`, rồi `reward` và `next` (trigger `auto`). Vẫn đủ 8 pha và 7 câu hỏi; không có `lesson`. Mẫu: `side-runner.json`, `side-egg-catch.json`, `side-penalty-kick.json`.

- Nhân vật giao phải luôn có mặt trên map trong chương của quest (không gắn `quest` của bài khác). Một nhân vật giao được nhiều trò: bé chọn trò trong danh sách.
- Nhiệm vụ phụ không khóa và không bị khóa bởi bài học. `GET /quests` chỉ trả bài học; `GET /quests?category=side&region=<id>` trả nhiệm vụ phụ. Thanh nhiệm vụ trên HUD và mũi tên luôn theo bài học. Chạm nhân vật: bước hiện tại của bài học được ưu tiên, nếu bài học không cần nhân vật đó thì nhân vật mời chơi.
- Luật "đi qua ≥ 4 nơi" và giới hạn 2 nhiệm vụ mỗi nhân vật không áp cho nhiệm vụ phụ; luật "một nhân vật sống trên một map" vẫn áp.

## Lượt chơi và phần thưởng (server)

Mỗi lần chơi hết một nhiệm vụ là một **lượt** (`run`). `QuestProgressDto.run` là lượt của các bước đã ghi. Khi mọi bước đã xong, yêu cầu tiếp theo phải ghi `run: run + 1`: server bắt đầu lượt mới từ bước đầu và trả thưởng lại ở bước cuối (sổ thưởng ghi `quest:<id>` cho lượt 1, `quest:<id>#<n>` cho lượt n). Gửi lại bước cuối của một lượt đã trả, gửi lượt cũ, hay không ghi lượt: không trả thêm (`repeated: true`). Sao giữ mức cao nhất qua các lượt. Không cần migration.

## Danh sách kiểm cho agent làm lô game

1. `content/minigames/<id>.json` hợp lệ, `howTo` dùng `{name}`, `family` khác với các trò đã có cùng cách chơi.
2. Thư mục `games/<id>/` có `logic.ts`, `draw.ts`, `index.ts`, `<id>.test.ts`; logic không import DOM, canvas, React.
3. Chơi được bằng một ngón trên iPad ngang, dọc và điện thoại; vật chạm ≥ `TOUCH_RADIUS`; không có gì quan trọng dưới HUD.
4. Hình chỉ từ `sprites.ts`, màu chỉ từ `view.theme`; có hiệu ứng qua sự kiện; tôn trọng `reducedMotion`.
5. `pnpm vitest run apps/web/src/ui/minigame` xanh (bot thắng, idle thua, registry khớp JSON ↔ thư mục ↔ test).
6. Mở `/minigame.html?game=<id>` chơi thử bằng tay và xem `&bot=1`.
7. `pnpm content:check`, `pnpm typecheck`, eslint các file đã sửa sạch.
