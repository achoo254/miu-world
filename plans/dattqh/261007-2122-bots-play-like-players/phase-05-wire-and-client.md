# Pha 5 — Giao thức và client: câu của bạn máy, dấu đang làm nhiệm vụ

**Trạng thái: XONG** ở commit `20c787ef`, trước khi đổi hướng; vẫn dùng nguyên. Commit sửa 16 file: các file liệt kê dưới đây, cộng `apps/web/src/game-bridge/social-store.ts`, `apps/web/src/ui/online/social-layer.tsx`, `online.test.tsx`, `remote-player-manager.test.ts`, `canned-lines.test.ts`, `packages/schema/src/bot-lines.test.ts`. Hướng tự học không đổi gì ở pha này: `bot-doing` vẫn nghĩa là "đang làm một nhiệm vụ", `bot-say` vẫn là danh sách đóng.
**Tier:** M · **Chặn bởi:** — · **Theo quyết định:** D3 (a), D4 (a)

**Trạng thái:** xong 07/10/2026, commit `20c787ef`. Ngoài danh sách file: thêm loại toast `bot-said` (`apps/web/src/game-bridge/social-store.ts`, `apps/web/src/ui/online/social-layer.tsx` + `online.test.tsx`) vì toast "said" chỉ nhận câu có sẵn; test kho câu đặt ở `apps/web/src/game/multiplayer/canned-lines.test.ts`.

## Mục tiêu

Hai loại tin server → client mới, chỉ thêm, không đổi tin cũ:

- `bot-say { id, key, variant, to? }`: bong bóng trên đầu bạn máy, chữ lấy từ locale `online.botLines.<key>[variant]` theo ngôn ngữ của người chơi. Có `to` là cô bé thì thêm toast "said" như câu có sẵn.
- `bot-doing { id, quest: ContentId | null }`: bạn máy đang làm một nhiệm vụ hay không. Client thêm hoặc bỏ dấu 📜 trên bảng tên của nó.

## Thiết kế

- `packages/schema/src/bot-lines.ts`: `BOT_LINES = ['hello', 'again', 'doing', 'found', 'done', 'invite', 'yay', 'later', 'bye', 'friend'] as const`, `BOT_LINE_VARIANTS = 12`, `BotLine = z.strictObject({ key, variant })`. Biến thể `i` thuộc giọng `i % VOICES` (3 giọng × 4), cùng quy ước với `COOP_BOT_LINE_VARIANTS` (`packages/schema/src/coop.ts:56-62`).
- `packages/schema/src/multiplayer.ts`: thêm hai tin vào `ServerWsMessage` (`:176-207`). `PlayerPresence` giữ nguyên (tab cũ bỏ qua tin lạ, `multiplayer-client.ts:89-91`).
- Locale `vi.json` và `en.json`: khối `online.botLines.<key>`, mỗi key 12 dòng `{vi, en}` như `coop.botLines` (cách đọc ở `apps/web/src/ui/coop/coop-layer.tsx:383`). Giọng hợp cả trẻ em và người lớn (`.claude/rules/product-audience.md`): thân thiện, không dỗ dành, không chứa đáp án, không nhắc "phụ huynh". Không câu nào có chỗ điền tên người chơi, tên NPC hay tên nhiệm vụ (tin không mang tên); mỗi câu tự đủ nghĩa.
- `canned-lines.ts`: thêm `botLinePair(key, variant)` (`linesOf('online.botLines.' + key)[variant]`) cạnh `cannedPair`.
- `multiplayer-session.ts` (nhánh `chat` ở `:186-191` là mẫu): xử lý `bot-say` bằng `remote.sayLine(id, pair)` và `bot-doing` bằng `remote.setBusy(id, quest !== null)`.
- `remote-player-manager.ts`: `sayLine` dùng lại bong bóng (`sayChat` `:327`); `setBusy` lưu cờ trên entity và vẽ lại bảng tên (như đổi `partyMate` ở `:146`). Cờ đến trước khi entity load xong thì giữ trong `latest` và áp khi spawn.
- `multiplayer-nametag.ts:11`: `createNametag(name, isBot, partyMate, busy = false)` vẽ thêm 📜 trước tên khi `busy`.

## Các bước

- [x] 1. Schema cùng test (`packages/schema/src/bot-lines.test.ts`): parse hai tin, từ chối `variant` ngoài khoảng và `key` lạ.
- [x] 2. Viết 120 câu vi + 120 câu en. Test (đặt cạnh test locale đang có, hoặc trong `tools/content/check-locales.ts` nếu đó là nơi kiểm cấu trúc locale): mỗi key đủ 12, không hai câu trùng trong một key, vi và en cùng số lượng.
- [x] 3. Client: các file ở trên, kèm test vitest. `multiplayer-session.test.ts`: `bot-say` gọi `sayLine` với đúng cặp chữ, `bot-doing` gọi `setBusy`. `remote.test` hoặc test nametag: có 📜 khi `busy`.
- [x] 4. `pnpm --filter @miu/web build`.

## File dùng chung

`vi.json`/`en.json`: phiên làm màn boss có thể đang thêm chuỗi. Thêm một khối liền nhau sau `online.cannedChats`; trước khi sửa thì `git status`, `git diff` file đó; đang dirty thì nhắn phiên kia.

## Rủi ro

- **Câu lặp ý dù khác chữ:** viết theo tình huống, mỗi giọng có một cá tính (giọng 0 sôi nổi, 1 điềm tĩnh, 2 tò mò), duyệt lại cả kho trước khi commit.
- **Bản dịch en sai sắc thái:** en là bản dịch tự nhiên, không dịch từng chữ.

## Kiểm tra

Các file vitest của pha, `pnpm typecheck`, `pnpm lint`, `pnpm --filter @miu/web build`.

## Rollback

Revert: hai loại tin không còn ai gửi (pha 4 chưa vào) hoặc client cũ bỏ qua.
