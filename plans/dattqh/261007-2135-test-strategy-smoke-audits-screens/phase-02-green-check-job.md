# Pha 2: Job `check` xanh

**Tier:** M · **Phụ thuộc:** — (chạy song song pha 1, 3) · **Trạng thái:** pending

## Bối cảnh

Job `check` (`.github/workflows/ci.yml:17-42`) đỏ ở cả 12 lượt gần nhất, chỉ ở bước `pnpm test`. Bốn nguyên nhân, đều do thời gian trên máy CI chạy nhiều file vitest cùng lúc:

- `packages/voxel/src/outland-plan.test.ts:49-52` đo lần gọi `plan()` đầu tiên (JIT còn nguội) và đòi < 200 ms; CI đo 217–242 ms.
- `tools/world/generate-forest-map.test.ts:12-14` và `tools/world/zone-maps.test.ts:46-48` sinh map 800 × 800 trong `beforeAll` với giới hạn 120 s; trên CI, giữa lúc các file khác chiếm CPU, `beforeAll` vượt 120 s (cả file `zone-maps` mất 363–373 s, comment ở `zone-maps.test.ts:43` ước 15 s mỗi map).
- `apps/web/src/ui/minigame/testing/describe-minigame.ts:58` ("draws every state of a round", dùng chung cho mọi minigame) giữ timeout mặc định 5 s của project `web`; `unblock-ferry`, `paper-io`, `helix-drop` vượt.

`docs/code-standards.md:26` cấm làm yếu test và yêu cầu CI vẫn chạy mọi test; nên không skip trên CI, không nới ngân sách 200 ms.

## Việc

1. `outland-plan.test.ts`: đo `plan()` 5 lần, lấy lần nhanh nhất so với 200 ms (ngân sách giữ nguyên; lần nhanh nhất loại nhiễu của máy bận và JIT nguội). Comment một dòng nói vì sao lấy lần nhanh nhất. Kiểm tính xác định giữ nguyên.
2. `describe-minigame.ts:58`: khai timeout riêng cho test vẽ mọi trạng thái (ví dụ 20 s, bằng `testTimeout` của project `node` ở `vitest.config.ts:16`) kèm comment lý do (vẽ mọi màn tham chiếu của một vòng chơi). Một chỗ sửa áp cho mọi minigame.
3. Tách test sinh map thành project vitest riêng `maps` trong `vitest.config.ts`: gồm `tools/world/generate-*-map.test.ts`, `tools/world/zone-maps.test.ts`, `tools/world/generate-world-overview.test.ts` (đọc file trước khi gộp; chỉ gộp file sinh lại cả map). Project `node` loại các file đó. `pnpm test` (`vitest run`) vẫn chạy cả ba project nên gate trên máy dev không đổi.
4. CI: bước `Unit tests` của job `check` chạy `pnpm vitest run --project node --project web`; thêm job `maps` song song (cùng các bước cài như job `integration`, `.github/workflows/ci.yml:64-71`) chạy `pnpm vitest run --project maps`. Job `maps` một mình một máy nên `beforeAll` không còn tranh CPU với hàng trăm file khác; giữ giới hạn 120 s.
5. Đọc lại danh sách lỗi của 12 lượt gần nhất (đã thấy thêm `account-flow.test.tsx`, `home-screens.test.tsx`, `region-rewards.test.tsx` đỏ ở lượt `37396484759` ngày 06/10); nếu còn đỏ ở `main` hiện tại thì sửa trong pha này, nếu đã hết thì ghi "đã tự hết" vào report pha 1.

## File

Sửa: `packages/voxel/src/outland-plan.test.ts`, `apps/web/src/ui/minigame/testing/describe-minigame.ts`, `vitest.config.ts`, `.github/workflows/ci.yml` (job `check`, job mới `maps`). Không chạm job `e2e` (pha 4).

## Kiểm tra

- Trên máy dev, lần lượt (không song song): `pnpm vitest run packages/voxel/src/outland-plan.test.ts`, `pnpm vitest run apps/web/src/ui/minigame`, `pnpm vitest run --project maps` (kiểm tải máy trước; file map nặng), rồi `pnpm typecheck`, `pnpm lint`.
- Push, rồi trên CI: job `check` xanh, bước `Unit tests` có `0 failed`; job `maps` xanh, ≤ 10 phút; `check` ≤ 12 phút. Chép số file, số test, thời gian vào report của pha 7.

## Rủi ro, hoàn tác

Job `maps` thêm một máy CI mỗi lần push (repo công khai, phút runner chuẩn miễn phí). Nếu job `maps` vẫn vượt 120 s ở `beforeAll`, chia nó thành hai job theo nhóm map thay vì nâng giới hạn. Hoàn tác: revert commit; `pnpm test` trên máy dev không đổi hành vi nên không ảnh hưởng phiên khác.
