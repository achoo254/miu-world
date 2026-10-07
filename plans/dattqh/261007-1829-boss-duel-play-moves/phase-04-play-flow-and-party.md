# Pha 4 — Nối vào luồng chơi và tổ đội

**Tier:** M · **Chặn bởi:** pha 2, pha 3 · **Chặn:** pha 5

## Mục tiêu

Trận boss mở thì game không dừng mà dựng sân đấu; HUD lùi như bảng chăm thú cưng; thẻ chép vở và màn hoàn thành đến sau nhịp trúng/nhịp thua; chơi tổ đội hiển thị lượt và đòn của bạn trên sân đấu.

## File

| File | Việc |
| --- | --- |
| **`apps/web/src/ui/quest/quest-layer.tsx` (dùng chung)** (+ `quest-layer.test.tsx`) | Tính `duelLive` (bước hiện là `boss`, không có thẻ vở, game báo `staged`); `reportCover` (`:90-96`) không tính bước boss là che game khi `duelLive`; prop mới `onDuelChange(open)`; truyền `party` turn xuống `LearningStep` |
| `apps/web/src/ui/quest/use-quest-controller.ts` | Ở đòn thắng (`:216-226`), khi màn đấu ở sân 3D: giữ overlay tới khi màn đấu gọi `finishBoss()` (sau nhịp thua ≤ 2 s hoặc chạm "Tiếp tục"), rồi mới đóng, xóa draft, `autoStep`; dạng thẻ tĩnh giữ hành vi cũ. Lỗi `not-your-turn`/`party-waiting` (`:231-235`) giữ toast như cũ, màn đấu gửi `fizzle` |
| `apps/web/src/ui/play/play-screen.tsx` (+ `play-screen.test.tsx`) | State `duelOpen` từ `onDuelChange`: không vào `covered` (`:393`), vào `hudCovered` (`:395`); `PartyFrame`, `CallBar` ẩn theo `hudCovered` thay vì `covered` khi trận đang mở (voice vẫn chạy) |
| `apps/web/src/ui/challenge/learning-step.tsx` | Nhận `partyTurn` (id người tới lượt, tên) và truyền vào `BossDuel` |
| `apps/web/src/ui/challenge/boss/boss-duel.tsx` | Gửi `duel-open`/`duel-close` theo vòng đời; `locked` các đích khi không tới lượt mình kèm `boss.turnOf`; `bossState.hp` giảm mà không do đòn của mình → `duel-cue ally-hit` |

**Trước khi sửa `quest-layer.tsx`:** `git status`, `git log -3 -- apps/web/src/ui/quest/quest-layer.tsx`, đọc lại cả file; file đang bẩn bởi phiên khác thì nhắn phiên đó để chia lượt.

## Vòng đời trận đấu

1. Bước `boss` mở (tự mở sau hội thoại, hoặc từ draft khi tải lại) → `BossDuel` mount → `duel-open { targetId: step.target, calm }`. Bước boss không có `target` (nếu có) → dạng thẻ tĩnh, không gửi lệnh.
2. Game đáp `staged` → `onDuelChange(true)` → game chạy tiếp, HUD ẩn. Đáp `unavailable` hoặc 1,5 s chưa có trả lời → dạng thẻ tĩnh, `onDuelChange(false)`, `reportCover(true)` → game dừng như hiện nay.
3. Thẻ chép vở hiện (`copy !== null`): màn bước ẩn như cũ (`quest-layer.tsx:161`), game dừng vì thẻ che; **không** gửi `duel-close` (sân đấu giữ nguyên, game chỉ dừng vẽ). Đóng thẻ → màn đấu mount lại, game chạy lại, câu kế tiếp.
4. Đóng trận giữa chừng (✕, Esc): `duel-close`, `onDuelChange(false)`; tiến độ trận giữ ở server như hiện nay.
5. Thắng: nhịp thua của boss (lời thắng trong bong bóng) → `finishBoss()` → overlay đóng → thẻ vở / `CompletionSequence` như hiện nay → `duel-close` khi unmount.
6. Đổi map, rời `/play`: `Game.dispose()` dọn sân đấu; React unmount gửi `duel-close` (game đã mất thì bỏ qua).

## Tổ đội (party quest)

- Mọi người trong đội đều thấy sân đấu trên máy mình, cùng một boss, HP chung từ `bossState`.
- Không tới lượt mình: đích bị khóa, dòng "Lượt của {who}" (tên đã lọc như `party-quest-card.tsx:91`), hỗ trợ vẫn mở được (như `coop.spec.ts:176-179`).
- Đòn của bạn trúng (đẩy `party-quest-progress` làm HP giảm, câu chuyển): `ally-hit` (hạt rơi xuống boss từ phía trên, boss lảo đảo), không hiện thẻ vở của người khác (server chỉ trả `copy` cho người trả lời).
- Thử thách co-op `team-boss` trong `coop-layer.tsx`: **không đổi** (câu hỏi mở 1).

## Test viết trước

- `quest-layer.test.tsx`: giữ "keeps a boss's screen open between blows" (`:247-297`); thêm: khi store báo `staged`, `onOverlayChange` nhận `false` còn `onDuelChange` nhận `true`; khi `unavailable` thì ngược lại; đòn thắng ở sân 3D chỉ đóng màn sau `finishBoss` (fake timers), ở dạng tĩnh đóng ngay như cũ; thẻ vở hiện sau nhịp trúng.
- `play-screen.test.tsx`: `duelOpen` không gọi `game.stop()`, HUD có `covered`.
- `boss-duel.test.tsx` (thêm): `partyTurn` khác mình → mọi đích `disabled` và có "Lượt của"; HP giảm từ props không do mình → gửi `ally-hit`.
- `party-play.test.tsx`: chạy lại không sửa để chắc luồng tổ đội không gãy.

## Kiểm

vitest từng file đã chạm (`quest-layer`, `play-screen`, `party-play`, `learning-step`, `boss-duel`), `pnpm typecheck`, `pnpm lint`, `pnpm --filter @miu/web build`, `pnpm security:dist`.

## Rủi ro và hoàn tác

- Đổi điều kiện `covered` có thể làm màn khác (thẻ vở, offline, skill check) để game chạy: `duelLive` chỉ đúng khi bước hiện là boss **và** không có thẻ nào khác che; test bao các tổ hợp.
- Hoàn tác: revert commit; màn đấu tự về dạng thẻ tĩnh, game dừng như cũ.

## Trạng thái

Đã xong (07/10/2026). Vòng đời sân đấu nằm ở `use-duel-lifecycle.ts` (gọi từ `quest-layer.tsx`), không ở `boss-duel.tsx`, để thẻ chép vở giữa các đòn không đóng sân đấu. HUD giữ mounted và ẩn (`hud-layer`). Sửa thêm: HP trong màn đấu đọc từ tiến độ của quest (cập nhật cả khi bạn tổ đội đánh), câu trả lời gửi lại từ banner mất mạng vẫn hiện thẻ chép vở và đóng trận thắng.
