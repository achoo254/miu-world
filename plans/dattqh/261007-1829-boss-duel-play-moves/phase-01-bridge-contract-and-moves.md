# Pha 1 — Hợp đồng cầu nối và chọn động tác

**Tier:** S · **Chặn bởi:** — · **Chặn:** pha 2, pha 3

## Mục tiêu

Chốt trước hai thứ mà pha 2 (game) và pha 3 (React) cùng dựa vào, để hai pha chạy song song không đụng file của nhau: các lệnh/sự kiện trận đấu trong `game-store.ts`, và hàm thuần chọn động tác của mỗi lượt.

## File

| File | Việc |
| --- | --- |
| `apps/web/src/game-bridge/game-store.ts` | Thêm lệnh, sự kiện, trường snapshot, neo DOM của trận đấu |
| `apps/web/src/game-bridge/game-store.test.tsx` | Test reducer cho sự kiện `duel`, reset khi `loading` |
| mới `packages/quest/src/duel-moves.ts` | Danh sách động tác và hàm chọn |
| mới `packages/quest/src/duel-moves.test.ts` | Test rotation, phân bố |

## Hợp đồng cầu nối (thêm vào union có sẵn, không đổi phần cũ)

- `GameCommand`:
  - `{ type: 'duel-open'; targetId: string; calm: boolean }`: dựng sân đấu với boss là target `targetId` của map; `calm` là bản nhẹ.
  - `{ type: 'duel-cue'; cue: 'aim'; to: { x: number; y: number } }`: bé vừa phóng/chạm đích; vật bay rời tay bé hướng tới điểm màn hình `to` (tâm đích DOM) rồi chờ ở gần boss tới khi có cue kết quả.
  - `{ type: 'duel-cue'; cue: 'hit' | 'miss' | 'win' | 'ally-hit' | 'fizzle' }`: kết quả từ server (`ally-hit`: đòn của bạn trong tổ đội; `fizzle`: lỗi mạng/409, vật bay tan, không ai phản ứng).
  - `{ type: 'duel-close' }`.
- `GameEvent`: `{ type: 'duel'; state: 'staged' | 'unavailable' | null }`.
- `GameSnapshot.duel: 'staged' | 'unavailable' | null` (mặc định `null`; `loading` đặt lại `null`).
- `GameStore.setDuelAnchors(anchors: { boss: HTMLElement | null; player: HTMLElement | null } | null)` và `getDuelAnchors()`: theo đúng mẫu `setPromptAnchor` (`game-store.ts:151`, `:246`), game ghi `transform` mỗi khung, React không re-render theo khung.

Lý do chọn: lệnh rời rạc, không dữ liệu theo khung đi qua store (luật `.claude/rules/web-ui.md`); `aim` tách khỏi kết quả để vật bay đi ngay khi bé thả tay, kết quả tới sau theo server.

## Hàm chọn động tác

- `export const DUEL_MOVES = ['fling', 'orbs', 'gem', 'charge'] as const` (ném bùa, chạm cầu, kéo ngọc, nạp chiêu).
- `export function duelMoveFor(bossId: string, run: number, turnIndex: number): DuelMove`: băm `bossId` (FNV-1a hoặc hàm băm sẵn có trong repo nếu có, grep `hash` trong `packages/quest/src` trước khi viết mới) ra điểm bắt đầu và chiều xoay; lượt `i` lấy `DUEL_MOVES[(start + run - 1 + i) mod 4]` theo chiều xoay. Kết quả: hai lượt liền nhau luôn khác, trận 4–5 câu có đủ 4 động tác, chơi lại lượt sau bắt đầu ở động tác khác.
- Thuần TS, không import `three`/DOM; dùng được cho mobile app sau này.

## Test viết trước

- `duel-moves.test.ts`: với 59 id boss thật (đọc tên file `content/quests/*.json` có bước `boss` trong test Node, không đọc đáp án) × `run` 1–3: hai lượt liền nhau khác nhau; trận ≥ 4 câu chứa đủ 4 động tác; mỗi động tác là động tác đầu của ≥ 10 boss ở `run` 1; cùng input cùng output.
- `game-store.test.tsx`: `duel` đổi trạng thái đúng, cùng giá trị không phát listener, `loading` đặt về `null`; `setDuelAnchors`/`getDuelAnchors` trả đúng phần tử.

## Kiểm

`pnpm vitest run packages/quest/src/duel-moves.test.ts apps/web/src/game-bridge/game-store.test.tsx`, `pnpm typecheck`, `pnpm lint`.

## Rủi ro và hoàn tác

Thấp: chỉ thêm vào union (game cũ bỏ qua lệnh lạ, `game-store.ts` ghi rõ "The game ignores commands it does not handle yet"). Hoàn tác: revert commit.
