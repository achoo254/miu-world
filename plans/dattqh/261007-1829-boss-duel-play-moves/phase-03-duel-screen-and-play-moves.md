# Pha 3 — Màn đấu mới và bốn động tác chơi

**Tier:** L · **Chặn bởi:** pha 1 · **Chặn:** pha 4 · **Song song với:** pha 2

## Mục tiêu

Thay `BossScreen` bằng `BossDuel`: banner, thanh HP có số trừ bay lên, bong bóng lời boss, chấm tiến độ, thẻ câu hỏi gọn ở dưới, lớp động tác chơi phía trên neo theo boss, thanh hỗ trợ giữ nguyên. Một component chạy hai dạng: **sân 3D** (game báo `staged`, không scrim, game nhìn thấy) và **thẻ tĩnh** (`unavailable`/chưa có game: `Modal` scene như hiện nay, chân dung boss 2D, đích xếp hàng dưới bong bóng). Pha này không nối vào `play-screen`/`quest-layer` (pha 4); chạy được và test được ở dạng thẻ tĩnh trong jsdom.

## File

| File | Việc |
| --- | --- |
| `git mv` `boss-screen.tsx` → `apps/web/src/ui/challenge/boss/boss-duel.tsx` | Component mới (comment đầu file: bám mock M3.10 + NEW SCREEN cho động tác chơi, theo `.claude/rules/web-ui.md`) |
| `git mv` `boss-screen.css` → `boss-duel.css`; `boss-screen.test.tsx` → `boss-duel.test.tsx` | Giữ lịch sử, viết lại theo màn mới |
| mới `apps/web/src/ui/challenge/boss/moves/move-target.tsx` | Một đích đáp án dùng chung: `<button data-id="choice-<id>">`, chữ đáp án (`{name}` đã điền, song ngữ như `ChoiceList`), trạng thái `idle / aimed / bounced / locked`, vùng chạm ≥ 48 × 48 px |
| mới `moves/fling-move.tsx` | Ném bùa: kéo lùi bùa ở tay bé như ná rồi thả, đường ngắm chấm chấm; đích là ba tấm khiên quanh boss. Chạm thẳng một khiên = tự ngắm và ném |
| mới `moves/orbs-move.tsx` | Chạm cầu: các quả cầu đáp án trôi chậm theo vòng elip quanh neo boss (một vòng ≥ 8 s, ngón tay đặt xuống thì cả vòng dừng); chạm cầu để bắn |
| mới `moves/gem-move.tsx` | Kéo ngọc: viên ngọc sức mạnh ở tay bé, kéo thả vào ô đáp án dưới chân boss; chạm ô = ngọc tự bay tới |
| mới `moves/charge-move.tsx` | Nạp chiêu: chạm đáp án để chọn, chạm tiếp vào chính nó (hoặc nút `boss-charge`) 3 lần để vòng sáng đầy rồi tự bắn; không tụt theo thời gian; đổi đáp án thì vòng về 0 |
| mới `moves/use-duel-anchors.ts` | Đăng ký hai phần tử neo với `store.setDuelAnchors` khi `staged`; dạng tĩnh không đăng ký |
| mới `moves/moves.css` | Hình khiên, cầu, ngọc, bùa bằng CSS + token (`docs/design-guidelines.md` dòng 42: khung, nút bằng CSS + token), `touch-action: none`, hiệu ứng tắt dưới `prefers-reduced-motion` |
| mới `apps/web/src/ui/kit/reduced-motion.ts` | Chuyển hàm đọc `prefers-reduced-motion` từ `completion-sequence.tsx:71` ra đây (nay có 2 nơi dùng) |
| `apps/web/src/ui/rewards/completion-sequence.tsx` | Chỉ đổi sang import hàm trên |
| `apps/web/src/ui/kit/modal.tsx` | Thêm prop tùy chọn `scrim?: boolean` (mặc định `true`, hành vi cũ không đổi); `false`: không lớp mờ, không chặn chạm ngoài khung, vẫn giữ focus và Esc |
| `apps/web/src/ui/challenge/learning-step.tsx` (+ test) | Render `BossDuel` thay `BossScreen` (`:32`, `:120-124`); với boss: gửi `duel-cue` kết quả theo response và **hoãn `onRight(copy)` tới khi màn đấu báo xong nhịp trúng** (`onBeatDone`) |
| `apps/web/src/ui/i18n/locales/vi.json`, `en.json` | Khóa mới `boss.move.<move>.<1..3>` (3 câu hướng dẫn mỗi động tác), `boss.turnOf`, `boss.charge`, `boss.damage` ("−{damage}"), nhãn aria đích; bỏ `boss.attack` |

Mỗi file component giữ dưới ~200 dòng; bốn động tác chỉ khác cách đưa bé tới lúc "chọn đáp án X", nên dùng chung `move-target.tsx` và một callback `onPick(choiceId, at)` (đây là bất biến dùng chung thật, không phải trừu tượng phòng xa).

## Hành vi

- **Động tác:** `turn.move` của câu hiện tại (trường nội dung, pha 1); `data-move` trên lớp động tác cho test. Câu hướng dẫn của động tác lấy bằng `freshPicker` từ 3 biến thể, không lặp liền.
- **Chọn = gửi:** `onPick` → `store.send({ type: 'duel-cue', cue: 'aim', to })` (chỉ ở dạng sân 3D) → `onAnswer({ turnId, choice })`. Khóa mọi đích khi `context.busy`. Không có nút "Giải đố"; không có đồng hồ nào gửi hay đổi trạng thái.
- **Kết quả theo server** (LearningStep đã có response): đúng → `duel-cue hit` (hoặc `win` khi `bossState` báo hết HP / đủ câu), số "−{damage}" bay lên từ thanh HP, HP lấy từ `bossState` mới; sai → `miss`, đích bật lại (lắc nhẹ, không đổi màu đỏ gắt), lời boss từ `feedback`; response `null` → `fizzle`.
- **Nhịp trúng:** 1,0–1,2 s ở sân 3D (chạm bất kỳ để bỏ qua), 0 s ở thẻ tĩnh và bản nhẹ; xong thì `onBeatDone` → LearningStep gọi `onRight(copy)` (thẻ chép vở như hiện nay).
- **Hỗ trợ:** `SupportPanel` giữ nguyên props và `data-id="boss-bar"`, `key={currentTurn.id}` (`boss-screen.tsx:168-176`).
- **Giữ data-id cho test:** `boss-screen`, `boss-battle`, `boss-name`, `boss-hp`, `boss-dialogue`, `boss-bar`, `boss-victory`, `boss-finish-btn`, `turn-<id>`, `choice-<id>`; thêm `boss-move` (lớp động tác, `data-move`, `data-mode="stage|card"`), `boss-charge`.
- **Bản nhẹ** (`calm`: `prefersReducedMotion()` hoặc `readQuality(location.search).level === 'low'`): cầu đứng yên trên vòng, không vệt ngắm động, số trừ hiện không bay; vẫn đủ 4 động tác.
- **Bố cục:** màn dọc: lớp động tác 55% trên, thẻ câu hỏi + thanh hỗ trợ 45% dưới, chữ câu hỏi co theo `clamp`; iPad ngang: thẻ ≤ 35% chiều cao. Đích chạm ≥ 48 px, cách nhau ≥ 8 px. Ở sân 3D, vị trí đích tính từ neo boss (CSS biến từ `transform` của neo), kẹp trong vùng an toàn để không tràn mép hay rơi xuống thẻ.
- **Giọng chữ:** trung tính cho mọi lứa tuổi (ví dụ "Kéo bùa rồi thả vào tấm khiên có đáp án đúng"), không "bé ơi" ở chữ chung; nội dung boss vẫn dùng `{name}`.

## Test viết trước (`boss-duel.test.tsx`, `learning-step.test.tsx`)

- Dạng thẻ tĩnh (không có store `staged`): render tên, HP, lời mở, câu 1; `data-move` đúng `turn.move`.
- Mỗi động tác: đường chạm/click và bàn phím (Tab tới đích, Enter) gửi đúng `{ turnId, choice }` một lần; `charge` cần đủ 3 lần chạm mới gửi; kéo (pointer events giả) với `fling` và `gem` gửi đúng đích thả.
- `busy` khóa mọi đích; tiến giả lập 10 phút không gửi gì.
- Response sai: không đổi HP, đích bật lại, Gợi ý mở sau 1 lần sai câu đó, Đáp án sau 2 (giữ test cũ `boss-screen.test.tsx:127`).
- Response đúng ở dạng sân 3D giả (store báo `staged`): `onRight` chỉ được gọi sau `onBeatDone`; chạm bỏ qua gọi ngay; dạng tĩnh gọi ngay.
- Song ngữ như test cũ `:109`; lời server sau đòn như `:101`.
- `prefersReducedMotion` giả `true`: lớp động tác có `data-calm="1"`, cầu không có animation.

## Kiểm

`pnpm vitest run apps/web/src/ui/challenge/boss/boss-duel.test.tsx apps/web/src/ui/challenge/learning-step.test.tsx apps/web/src/ui/rewards/completion-sequence.test.tsx` (file test nào có thật), `pnpm typecheck`, `pnpm lint`, `pnpm --filter @miu/web build`, `pnpm security:dist` (đáp án không vào bundle: màn mới chỉ đọc bước công khai).

## Rủi ro và hoàn tác

- Kéo thả trên iOS: dùng Pointer Events + `setPointerCapture`, `touch-action: none` trên lớp động tác; thử E2E kéo thật ở pha 5.
- Chữ dài trên cầu/khiên: cho xuống 2–3 dòng, cỡ chữ tối thiểu theo token; ảnh review ở pha 5 với câu và lựa chọn dài nhất.
- Hoàn tác: revert commit (kèm pha 4 nếu đã có).

## Trạng thái

Đã xong (07/10/2026). Động tác đọc từ `turn.move`. Nút ✕ `boss-close` thêm vào màn đấu (trước đây chỉ Esc). Thẻ ở sân 3D tắt hiệu ứng trượt vào (transform làm phần tử fixed bị giữ trong thẻ). Kéo bùa/ngọc ghi style thẳng vào phần tử, không render React theo từng lần di ngón tay.
