# Pha 1 — Hợp đồng cầu nối và chọn động tác

**Tier:** S · **Chặn bởi:** — · **Chặn:** pha 2, pha 3

## Mục tiêu

Chốt trước hai thứ mà pha 2 (game) và pha 3 (React) cùng dựa vào, để hai pha chạy song song không đụng file của nhau: các lệnh/sự kiện trận đấu trong `game-store.ts`, và động tác của mỗi lượt boss. Theo Validation Log (câu hỏi mở 2, Jev chốt): động tác là **trường nội dung `move`** của mỗi lượt boss, không phải hàm `duelMoveFor`.

## File

| File | Việc |
| --- | --- |
| `apps/web/src/game-bridge/game-store.ts` | Thêm lệnh, sự kiện, trường snapshot, neo DOM của trận đấu |
| `apps/web/src/game-bridge/game-store.test.tsx` | Test reducer cho sự kiện `duel`, reset khi `loading`, neo |
| `packages/schema/src/content.ts` | `DUEL_MOVES`, `DuelMove`, trường `move` bắt buộc ở `BossTurn` và `BossTurnWithSecret`; `duelMoveIssues` chạy trong kiểm bước boss (`content:check`) |
| `packages/schema/src/guardian-content.test.ts` | Test thiếu `move`, trùng liền nhau, trận ≥ 4 lượt thiếu động tác; `move` có trong bước công khai |
| mới `tools/content/duel-moves.ts` (+ `.test.ts`) | Luật xoay vòng `duelMovesFor(bossId, count)` và script ghi `move` một lần vào mọi lượt boss chưa có (chèn một dòng sau dòng `skill`, giữ bố cục file); test phân bố trên nội dung thật |
| `tools/content/build-guardian-quests.ts` | Generator trùm canh ghi luôn `move` theo cùng luật (chạy lại ra đúng byte các file `ward-*`) |
| `content/quests/*.json` (59 file có bước boss) | Thêm `move` cho 290 lượt (sinh bằng script, không viết tay) |
| Fixture test có lượt boss | `packages/quest/src/quest-progress.test.ts`, `apps/server/src/coop/party-quest.test.ts`, `tools/content/content-variety.test.ts` thêm `move` |

## Hợp đồng cầu nối (thêm vào union có sẵn, không đổi phần cũ)

- `GameCommand`:
  - `{ type: 'duel-open'; targetId: string; calm: boolean }`: dựng sân đấu với boss là target `targetId` của map; `calm` là bản nhẹ.
  - `{ type: 'duel-cue'; cue: 'aim'; to: { x: number; y: number } }`: bé vừa phóng/chạm đích; vật bay rời tay bé hướng tới điểm màn hình `to` (tâm đích DOM) rồi chờ ở gần boss tới khi có cue kết quả.
  - `{ type: 'duel-cue'; cue: 'hit' | 'miss' | 'win' | 'ally-hit' | 'fizzle' }`: kết quả từ server (`ally-hit`: đòn của bạn trong tổ đội; `fizzle`: lỗi mạng/409, vật bay tan, không ai phản ứng).
  - `{ type: 'duel-close' }`.
- `GameEvent`: `{ type: 'duel'; state: 'staged' | 'unavailable' | null }`.
- `GameSnapshot.duel: 'staged' | 'unavailable' | null` (mặc định `null`; `loading` đặt lại `null`).
- `GameStore.setDuelAnchors(anchors: { boss: HTMLElement | null; player: HTMLElement | null } | null)` và `getDuelAnchors()`: theo đúng mẫu `setPromptAnchor`, game ghi `transform` mỗi khung, React không re-render theo khung.

Lý do chọn: lệnh rời rạc, không dữ liệu theo khung đi qua store (luật `.claude/rules/web-ui.md`); `aim` tách khỏi kết quả để vật bay đi ngay khi bé thả tay, kết quả tới sau theo server.

## Động tác của mỗi lượt (trường nội dung `move`)

- `DUEL_MOVES = ['fling', 'orbs', 'gem', 'charge']` (ném bùa, chạm cầu, kéo ngọc, nạp chiêu) và `DuelMove` ở `packages/schema/src/content.ts`; `move` bắt buộc ở mỗi lượt boss, không bí mật (client đọc từ `QuestView`).
- Luật xoay vòng (`tools/content/duel-moves.ts`, `duelMovesFor`): băm FNV-1a `bossId` ra điểm bắt đầu và chiều xoay; lượt `i` lấy `DUEL_MOVES[(start ± i) mod 4]`. Kết quả: hai lượt liền nhau luôn khác, bốn lượt liền nhau đủ bốn động tác, các boss mở bằng động tác khác nhau. Script chạy một lần (`pnpm exec tsx tools/content/duel-moves.ts`), chạy lại không đổi lượt đã có `move` (chỉnh tay giữ nguyên).
- `content:check` (qua `duelMoveIssues` trong kiểm bước boss): chặn lượt thiếu `move` (schema), hai lượt liền nhau trùng, trận ≥ 4 lượt thiếu động tác.
- Chơi lại cùng boss có cùng thứ tự động tác (nội dung cố định); đổi giữa các boss nhờ điểm bắt đầu khác.

## Test viết trước

- `tools/content/duel-moves.test.ts`: luật xoay vòng (liền nhau khác, 4 liền nhau đủ 4, cùng input cùng output); mọi bước boss của nội dung qua `duelMoveIssues`; mỗi động tác là động tác đầu của ≥ 10 boss; script chỉ chèn dòng `move`, giữ phần còn lại, chạy lại không đổi.
- `guardian-content.test.ts`: lượt thiếu `move` bị schema chặn; trùng liền nhau và thiếu động tác bị báo; bước công khai giữ `move`.
- `game-store.test.tsx`: `duel` đổi trạng thái đúng, cùng giá trị không phát listener, `loading` đặt về `null`; `setDuelAnchors`/`getDuelAnchors` trả đúng phần tử.

## Kiểm

`pnpm vitest run tools/content/duel-moves.test.ts packages/schema/src/guardian-content.test.ts tools/content/build-guardian-quests.test.ts apps/web/src/game-bridge/game-store.test.tsx`, `pnpm content:check`, `pnpm typecheck`, `pnpm lint`.

## Rủi ro và hoàn tác

Thấp: lệnh mới chỉ thêm vào union (game cũ bỏ qua lệnh lạ); trường `move` thêm vào nội dung không đổi đáp án hay thưởng. Hoàn tác: revert commit (nội dung và schema đi cùng một commit để `content:check` luôn xanh).

## Trạng thái

Đã xong (07/10/2026).
