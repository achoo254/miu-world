# Pha 2 — Sân đấu 3D trong game

**Tier:** M · **Chặn bởi:** pha 1 · **Chặn:** pha 4 · **Song song với:** pha 3

## Mục tiêu

Khi nhận `duel-open`, game giữ chạy, đặt bé đối diện boss, camera khung cả hai ở nửa trên màn hình, boss diễn dáng chờ/khiêu khích/trúng/thua, vật bay và chớp sáng bằng lớp hạt có sẵn, bé ném và né; khóa tay điều khiển; ghi vị trí màn hình của boss và tay bé vào neo DOM mỗi khung. Không dựng được thì báo `unavailable`.

## File

| File | Việc |
| --- | --- |
| mới `apps/web/src/game/duel/duel-camera.ts` (+ `.test.ts`) | Hàm thuần: từ vị trí bé, boss, tỉ lệ màn hình, phần màn bị thẻ che (dọc ~45%, ngang ~35%) → yaw, pitch, khoảng cách, điểm nhìn để cả hai nằm trong phần trên |
| mới `apps/web/src/game/duel/duel-stage.ts` (+ `.test.ts` cho máy trạng thái) | Máy trạng thái trận: `idle → staging → ready → (aim → hit/miss/fizzle) → ready … → won → closing`; tìm boss, chỗ đứng, cue, hạt, tia kiểm che |
| mới `apps/web/src/game/duel/duel-poses.ts` | Bảng dáng boss theo bộ clip (Cube Pets / blocky character) và dáng dựng bằng code khi thiếu clip |
| `apps/web/src/game/entities/interactables.ts` (+ test) | Thêm `duelPose(pose \| null)` vào `InteractableObject`: khi khác `null` thì bỏ qua `NpcBehavior`, quay mặt về bé, phát clip theo bảng; thêm `gesture-negative`, `run` vào bộ clip NPC (`:63`, `:73-79`) |
| `apps/web/src/game/interact/player-actions.ts` (+ test) | Thêm cử chỉ `throw` (vung tay phải) và `dodge` (nhún nghiêng sang bên) vào `PLAYER_ACTIONS` (`:8-33`); test chung sẵn có tự kiểm biên độ |
| `apps/web/src/game/player/camera-rig.ts` (+ test) | `setOverride(view \| null)`: khi có thì `update` ease về view trận đấu (vẫn giữ tránh tường `raycastGrid`); bản nhẹ thì nhảy thẳng |
| `apps/web/src/game/debug/stats-overlay.ts` | Thêm `duel: 'staged' \| 'unavailable' \| null` vào `window.__miuStats` cho E2E |
| **`apps/web/src/game/game.ts` (dùng chung)** | Chỉ nối: tạo `DuelStage` sau khi có `byId`, `controller`, `rig`, `objectEffects`, `character`; xử lý 3 lệnh trong `store.onCommand` (`:878`); trong vòng khung thêm nhánh `duel.active` cạnh `journey.active` (`:966-969`): đọc và bỏ input, intent rỗng, không hiện nhãn tương tác; gọi `duel.update(dt)` và ghi neo; dispose trong `cleanups` |

**Trước khi sửa `game.ts`:** `git status -- apps/web/src/game/game.ts`, `git log -3 -- apps/web/src/game/game.ts`, đọc lại cả file (agent sự kiện đang sửa). Phần sửa giữ dưới ~40 dòng, mọi logic nằm trong `game/duel/**`.

## Chi tiết

- **Tìm boss:** `byId.get(targetId)`; boss sự kiện đã nằm trong `entities.interactables` qua `withEventCharacters` nên không cần chạm `game/event/**`. Không có, `available === false`, hay game chưa `ready` → phát `duel: 'unavailable'`.
- **Chỗ đứng:** bé đã ở trong bán kính boss (thường vậy, vì bước boss tự mở sau hội thoại tại boss) thì giữ chỗ, chỉ quay mặt; xa hơn bán kính thì `standBeside` (`player/stand-beside.ts:21`) + `controller.teleport` sau chớp mờ ngắn (câu hỏi mở 5). Không có chỗ → `unavailable`.
- **Kiểm che:** sau khi đặt camera, `raycastGrid` từ camera tới đầu boss và đầu bé; bị khối đặc che (sau khi camera đã tiến lại trước tường) → `unavailable`.
- **Dáng boss** (`duel-poses.ts`), Cube Pets / blocky: chờ `idle`; khiêu khích `gesture-negative` / `emote-no` (mỗi 4–7 s khi chờ, ngẫu nhiên theo seed của boss); trúng: lảo đảo bằng code (nghiêng lùi 0,25 rad + nảy 0,15 khối trong 0,4 s) rồi `gesture-negative`; phản đòn vô hại `gesture-positive` / `emote-yes` kèm 6–10 hạt `bubble`/`puff` bay về phía bé; thua: `static`/`die` không dùng, thay bằng nghiêng chào (gập 0,5 rad, hạ 0,2 khối) rồi `dance` vui vẻ ở lời thắng (không bạo lực, đúng tinh thần `boss-screen.tsx:1-2`).
- **Vật bay:** một hạt `star` lớn (size ~0,5) phóng từ tay bé theo quỹ đạo cầu vồng tính vận tốc + `gravity` để tới gần điểm 3D ứng với đích (chiếu ngược `to` lên mặt phẳng trước mặt boss), kèm vệt `sparkle` 2–3 hạt mỗi khung; chờ kết quả thì lơ lửng xoay quanh điểm đó. `hit`: lao vào ngực boss, 16–24 hạt `star`/`sparkle` + `halo` 0,3 s; `miss`: bật ngược lên rồi rơi, bé `dodge`, camera rung 0,15 s biên độ nhỏ; `fizzle`: tan thành `puff`. Bản nhẹ: không bay vòng (hạt hiện thẳng tại boss), ≤ 8 hạt, không rung camera.
- **Tầm nhìn:** `duel-camera.ts` đặt camera chéo sau vai bé (yaw lệch ~25° khỏi trục bé → boss), pitch 0,25–0,4, khoảng cách đủ chứa cả hai theo `fov` và tỉ lệ màn hình, điểm nhìn hạ xuống để hai nhân vật nằm trong 55% trên (màn dọc) hoặc 65% trên (màn ngang). Bản đầy đủ ease 0,6 s; bản nhẹ nhảy thẳng.
- **Neo:** mỗi khung `boss.screenAnchor(camera, viewport)` → neo `boss`; đầu/tay bé chiếu tương tự → neo `player`; chỉ ghi khi đổi > 0,5 px.
- **Đóng:** `duel-close` hoặc rời map/`dispose`: bỏ override camera (ease về sau lưng bé), `duelPose(null)`, mở input, `duel: null`.
- **Draw call:** không tạo mesh mới; hạt đi qua `objectEffects.spawn` như `pet-life.ts:39` (2 draw call chung của map).

## Test viết trước

- `duel-camera.test.ts`: dọc 9:19.5 và iPad 3:4 / 4:3, bé và boss cách 2–4 khối: cả hai điểm chiếu nằm trong phần trên không bị thẻ che, cách mép ≥ 5%.
- `duel-stage.test.ts` (không WebGL, giả `byId`, `solid`, `spawn`): target thiếu → `unavailable`; bé xa → gọi teleport tới chỗ của `standBeside`; `aim` rồi `hit` gọi `duelPose('hit')` và sinh hạt; bản nhẹ ≤ 8 hạt; `duel-close` trả mọi thứ về.
- `interactables.test.ts`: `duelPose` ghi đè hành vi và trả lại khi `null`; boss quay mặt về bé.
- `camera-rig.test.ts`: có override thì camera hội tụ về view trận đấu, bỏ override thì về theo bé.

## Kiểm

vitest từng file trên, `pnpm typecheck`, `pnpm lint`, `pnpm --filter @miu/web build`. Thử tay bằng `?spawnAt=<boss>&stats=1` và gửi lệnh từ console là đủ ở pha này; E2E ở pha 5.

## Rủi ro và hoàn tác

- Tia kiểm che quá chặt làm nhiều boss rơi về thẻ tĩnh: ghi số boss `unavailable` khi chạy ảnh review lấy mẫu; nới bằng cách cho camera đổi bên trái/phải trước khi chịu thua.
- Hoàn tác: revert commit; không có pha 3–4 thì không ai gửi `duel-open`.
