# Pha 4 — Lưu trí nhớ vào DB, số liệu học

**Tier:** M · **Chặn bởi:** 3 · **Trạng thái:** XONG, 1 tiêu chí chờ quyết (`2e806513`) · **Theo quyết định:** training = `online_only` (học liên tục, lưu DB, bạn máy mới bắt đầu từ 0)

## Mục tiêu

Trí nhớ (đồ thị, Q, số liệu) của từng bạn máy trên từng map sống qua các lần server khởi động lại. Lưu theo chu kỳ, ghi khi tắt máy, có trần dung lượng, không chứa dữ liệu người chơi.

## Bảng (Drizzle, `apps/server/src/db/schema.ts`, cạnh `botSkills`/`botMemories` `:424-461`)

```ts
botWorldMemories = pgTable('bot_world_memories', {
  botId: text('bot_id').notNull(),            // id hồ sơ bạn máy (botProfileId), không phải bản ở nhà riêng
  mapId: text('map_id').notNull(),
  gridVersion: text('grid_version').notNull(), // `sources` của lưới lúc học
  memory: jsonb('memory').notNull(),           // đồ thị, Q, số liệu, history (memory-codec)
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.botId, t.mapId] }),
           check('bot_world_memories_size', sql`octet_length(${t.memory}::text) <= 65536`)]);
```

Không có khóa ngoại tới bảng người chơi, và không có cột hay trường nào chứa `childId` hoặc mã công khai.

## Migration và backup

1. `pnpm --filter @miu/server db:generate` (`apps/server/package.json:11`) sinh `apps/server/drizzle/0021_<tên>.sql` cùng meta; tên mô tả hành vi, không chứa mã plan (rule của repo). Trước khi sinh: `ls apps/server/drizzle` và `git status apps/server/drizzle`. Phiên khác đã thêm `0021` thì kéo về rồi sinh lại để thành số kế tiếp.
2. Kiểm `pnpm --filter @miu/server db:check`. Migration chỉ có `CREATE TABLE` và `CHECK`.
3. **Backup:** dev không xóa `.data/pglite` (CLAUDE.md). Staging và production: `deploy.sh release` dump DB ra `/var/backups/miu/before-<id>.dump` trước khi restart, rồi migration tự chạy khi server mở Postgres (`docs/deployment-guide.md:106-109`, `:135`). Deploy production phải hỏi người trước mỗi lần. Quay lại: code về release trước (bảng thừa vô hại) hoặc `pg_restore` từ dump theo hướng dẫn rollback.

## Code

- `bot-brain/memory-codec.ts` (+test): `encode(memory) → JSON` gọn: số làm tròn, polyline lưu thành mảng số nguyên chênh lệch, bitset vùng thành base64. Nếu kết quả > 32 KB thì cắt bớt theo luật "hết chỗ" của pha 3 cho tới khi vừa. `decode` kiểm bằng Zod; hỏng thì bỏ trí nhớ, ghi log tên lỗi (không in nội dung), và bạn máy bắt đầu lại.
- `bot-store.ts`: mở rộng interface `BotStore` (`:23-33`) với `worldMemory(botId, mapId)` và `saveWorldMemory(botId, mapId, gridVersion, memory)` (upsert), cài cho cả `dbBotStore` (`:60`) và `memoryBotStore` (`:101`).
- `bot-runner.ts`:
  - Lúc tạo một bạn máy: đọc trí nhớ. `gridVersion` khác `sources` hiện tại thì giữ nơi chốn, Q và số liệu, nhưng bỏ lối và vùng đã đi (học lại đường).
  - Đánh dấu bẩn khi trí nhớ đổi; mỗi bạn máy ghi tối đa một lần mỗi 120 s, lệch pha theo hash id để không dồn vào một lúc. Lỗi ghi thì thử lại lần sau, không làm rơi tick.
  - **Bản ở nhà riêng** (`<bot>@<chủ nhà>`): đọc trí nhớ chung của bạn máy trên `nha-cua-be`. Khi ghi hoặc khi nhà đóng: đọc bản trong DB, hợp nhất (hợp tập nơi; giữ lối có `cost` thấp hơn; Q trung bình có trọng số `visits`; số liệu cộng dồn), rồi ghi.
  - `flush(): Promise<void>` ghi mọi trí nhớ bẩn.
- `server.ts`: bắt `SIGTERM`/`SIGINT`, gọi `botRunner.stop()` rồi `flush()` với trần 3 s, sau đó thoát (systemd gửi `SIGTERM` khi restart).

## Các bước

1. Bảng và migration; test PGlite chạy migration (như các test DB hiện có).
2. Codec + test: mã hóa rồi giải mã ra đúng như cũ; trần 32 KB; dữ liệu hỏng thì về trí nhớ trống.
3. Store + test: upsert, đọc lại, ràng buộc `CHECK` từ chối bản > 64 KB.
4. Runner: test với `memoryBotStore` và fake timer.
   - Học 30 phút mô phỏng, `flush`, tạo runner mới: số nơi và Q y như trước; chuyến đầu sau khi mở lại không chậm hơn chuyến cuối trước khi tắt quá 10%.
   - Đổi `gridVersion` thì lối bị bỏ, nơi còn.
   - Hai bản ở nhà riêng hợp nhất đúng.
5. Test xác nhận trí nhớ không chứa id người chơi: grep JSON đã mã hóa không có mẫu `p-` hay uuid.

## Rủi ro

- **Đua ghi giữa các bản ở nhà riêng:** hợp nhất khi đọc rồi ghi; mất một ít học cũng chấp nhận được.
- **Dung lượng DB:** 112 bạn máy × ≤ 2 map × ≤ 64 KB, khoảng 14 MB tối đa.

## Kiểm tra

Các test trên; `pnpm --filter @miu/server db:check`; `pnpm typecheck`; `pnpm lint`.

## Rollback

Revert code; bảng ở lại vô hại. Muốn bỏ hẳn thì thêm migration `DROP TABLE` mới (không sửa migration đã chạy).

## Trạng thái (08/10/2026)

- [x] Bảng `bot_world_memories` (`apps/server/src/db/schema.ts`), migration `0021_bot-world-memories.sql` sinh bằng `drizzle-kit generate`: chỉ `CREATE TABLE` với khóa chính `(bot_id, map_id)` và `CHECK octet_length(memory::text) <= 65536`; `drizzle-kit check` sạch. Không khóa ngoại, không cột nào về người chơi.
- [x] `bot-brain/memory-codec.ts` (+test): cột theo cột, số làm tròn, thời gian là giây sau một mốc, polyline là điểm đầu rồi các bước chênh lệch (zigzag varint, base64), bitset vùng base64; JSON đó nén deflate rồi lưu `{ v: 1, z: <base64> }`. Lệch so với lời plan: thêm bước nén vì JSON cột đầy đủ đã ~34 KB (trên trần 32 KB), nén còn ~16 KB. Quá 32 KB thì cắt như "hết chỗ" của pha 3 (gộp polyline dài nhất trước, rồi bỏ lối ít đi, rồi nơi ít thăm). `decode` kiểm bằng Zod và các số phải khớp; hỏng thì bạn máy bắt đầu lại, log chỉ tên lỗi.
- [x] Đo trên 6 trí nhớ của mô phỏng 2 giờ `truong-hoc` (200 nơi, 330–600 lối, 1.038–1.751 điểm): mã hóa 10,2–15,8 KB, trung vị 15,4 KB (JSON thô ~135 KB); trí nhớ tổng hợp đầy trần (200 nơi, 600 lối × 10 điểm, 72 mốc giờ, 50 chuyến) vượt 32 KB và được cắt cho vừa. Chi phí ghi: chụp 0,17 ms + mã hóa 0,9 ms (tối đa 2 ms) + upsert PGlite 0,5 ms; đọc + giải mã 0,9 ms.
- [x] `bot-store.ts` (+test PGlite): `worldMemory`, `saveWorldMemory` (upsert) cho `dbBotStore` và `memoryBotStore`; `CHECK` từ chối bản 70 KB.
- [x] `bot-brain/memory-keeper.ts` (+test): đọc trước khi bạn máy đi (đứng yên tới khi đọc xong), ghi tối đa mỗi 120 s lệch pha theo hash, chỉ khi có học; lỗi ghi thì thử lại lượt sau; `gridVersion` (`sources` của lưới, thêm vào `WalkMap`) khác thì giữ nơi, Q, số liệu, bỏ lối và vùng; `flush()`. `Brain` có `snapshot()`, `restore()`, `revision`; `HourMark` thêm `at`; mốc giờ được lưu và đánh số tiếp sau khi mở lại.
- [x] Bản ở nhà riêng: lưu dưới id gốc của bạn máy trên `nha-cua-be`, khi ghi và khi nhà đóng thì đọc bản DB rồi hợp nhất (`bot-brain/memory-merge.ts`: hợp tập nơi, giữ lối `cost` thấp hơn, Q trung bình theo `visits`, số đếm cộng phần học thêm kể từ lần ghi trước nên không đếm hai lần, trần như pha 3). Bạn máy không đọc được trí nhớ (DB lỗi lúc mở) cũng ghi theo cách hợp nhất, không đè bản chưa đọc.
- [x] `server.ts`: `SIGTERM`/`SIGINT` → `botRunner.stop()`, `flush()`, đóng DB, trần 3 s, rồi thoát. Chạy thử với PGlite tạm (cổng 8797): sau 25 s, `SIGTERM` ghi 108/112 bạn máy (4 bạn máy chỉ ở nhà riêng) trong 76–78 ms, thoát mã 0; mở lại cùng DB 25 s rồi tắt: nơi đã biết tổng 1.645 → 2.008, lối 329 → 668.
- [x] Test: codec (đọc lại như cũ, mã hóa lại y hệt, nạp vào bạn máy mới cùng nơi/Q/đường rẻ nhất; không có id người chơi hay uuid; trần 32 KB; 12 dạng hỏng), merge, keeper, DB, runner (lâu đài: tắt rồi mở lại, trí nhớ giữ và tăng), nhà riêng (một dòng mỗi bạn máy, khóa theo id gốc), `memory-restart.test.ts` trên PGlite (6 bạn máy học 65 phút, tắt, mở lại: nơi, Q, lối, đường rẻ nhất, mốc giờ y như trước; học tiếp 65 phút: không quên nơi, mốc giờ thành [1, 2], làm thêm nhiệm vụ).
- [ ] **Chờ quyết:** tiêu chí "lần đi đầu sau khi mở lại không chậm hơn lần cuối trước khi tắt quá 10%" không đo được bằng một chuyến (mỗi chuyến tới nơi khác của nhiệm vụ khác: seed của test 0,918 trước, 0,326 sau). Theo giờ: giờ sau khi mở lại so với cùng bạn máy chạy tiếp không tắt là 0,69–1,57 lần qua 7 cặp seed (trung bình 1,16; seed của test 0,80), nên không assert. Test assert phần tất định (kiến thức y hệt, đường rẻ nhất tới mọi nơi không đắt hơn) và giờ sau khi mở lại thẳng hơn bạn máy bắt đầu từ 0 ≥ 1,1 lần (7 cặp seed 1,11–2,10; seed của test 1,26). Đề xuất thay tiêu chí bằng hai điều này, như Jev đợt 3 đã làm với tiêu chí của pha 3.
- Kiểm tra: `pnpm vitest run apps/server/src/multiplayer apps/server/src/friend apps/server/src/coop apps/server/src/db apps/server/test` 36 file / 232 test xanh (13,3 s); `pnpm --filter @miu/server typecheck` sạch; eslint `--max-warnings=0` 23 file đã sửa sạch; `drizzle-kit check` sạch. Không chạy E2E, `assets:check`, `content:check` (không đụng `assets/`, `content/`).

