# Pha 5 — E2E, ảnh review, tài liệu

**Tier:** M · **Chặn bởi:** pha 4

## Mục tiêu

Cập nhật hai spec E2E đang chạm màn boss cho cách trả lời mới, thêm đo draw call trong trận và bản giảm chuyển động, chụp ảnh điện thoại dọc và iPad cho trang review, cập nhật tài liệu, viết report.

## File

| File | Việc |
| --- | --- |
| `apps/web/e2e/quest-api.ts` | Helper `answerBoss(page, choiceId)`: đọc `[data-id="boss-move"]` `data-move`; `fling`/`orbs`/`gem` thì `tap` (`apps/web/e2e/touch.ts`) đích `choice-<id>`; `charge` thì chạm đích tới khi lớp động tác đổi lượt hoặc bật lại (tối đa 3 lần + kiểm `data-charge`) |
| `apps/web/e2e/bosses.spec.ts` | Thay hai chỗ `choice-*` + `boss-attack-btn` (`:109-110`, `:121-122`) bằng `answerBoss`; giữ mọi kiểm HP, lời boss, hỗ trợ, thẻ vở, `notebookPage`, `completed`; thêm kiểm `__miuStats.duel === 'staged'` và số khung tăng trong trận; ghi lại thứ tự `data-move` của 5 câu và kiểm đủ 4 động tác; thêm một lượt kéo thật (`fling` hoặc `gem`, theo động tác của câu đầu) bằng drag CDP của `touch.ts` |
| `apps/web/e2e/bosses.spec.ts` (test mới) | "trận đấu cạnh trùm canh giữ ngân sách draw call ở `quality=high`": như test `:132-143` nhưng mở trận rồi đo khi `duel === 'staged'`, lúc vật bay đang lơ lửng |
| `apps/web/e2e/bosses.spec.ts` (test mới) | `page.emulateMedia({ reducedMotion: 'reduce' })`: lớp động tác `data-calm="1"`, camera không bay (vị trí camera trong `__miuStats` ổn định sau 1 khung), chơi được câu đầu |
| `apps/web/e2e/coop.spec.ts` | `:155-181`: thêm kiểm người không tới lượt thấy đích `disabled` và "Lượt của …"; người tới lượt đánh một đòn bằng `answerBoss`, màn người kia thấy HP giảm |
| `apps/web/review.html` | Mục `review-bosses` (`:56-60`): đoạn mô tả trận đấu mới, ảnh 4 động tác, ảnh trúng/trượt, ảnh dọc 360 × 740 và iPad 820 × 1180 với câu dài nhất, số draw call trong trận |
| `docs/system-architecture.md` | Dòng "Trùm trên bản đồ, trùm canh khu" (dòng 29): thay `boss-screen.tsx` bằng `boss-duel.tsx`, thêm `game/duel/**`, lệnh `duel-*`, `duelMoveFor`; ghi vào sổ quyết định: đích trả lời là DOM neo theo boss, vật bay là hạt dùng chung |
| `docs/project-roadmap.md` | Ghi việc xong |
| `docs/design-guidelines.md` | Một mục ngắn: động tác chơi trong trận đấu, đích chạm ≥ 48 px, bản nhẹ |
| mới `plans/dattqh/reports/boss-duel-play-moves-2610xx.md` | Report: số đo, gate, ảnh, phát hiện review, việc người còn làm |

Thời gian test: `bosses` test chính hiện chơi 5 câu; nhịp trúng thêm ≤ 1,2 s mỗi câu và có thể chạm bỏ qua (helper chạm bỏ qua để giữ ngân sách). Test nào vượt 30 s phải có `test.setTimeout` kèm lý do (`docs/code-standards.md` mục Kiểm thử).

## Ảnh review (chỉ khi `REVIEW_SHOTS=1`)

Khu `nui-tuyet` như hiện nay, cộng mẫu: trùm lâu đài `trum-ld-hiep-si-da` (model `character-d`, trong khung đá), một trùm trong nhà/thư viện (kiểm camera bị che → thẻ tĩnh hay sân 3D), một boss sự kiện Olympic khi sự kiện mở. Ghi số boss rơi về `unavailable` trong report.

## Gate (máy dev, chạy lần lượt, không song song)

1. `pnpm assets:check` → `pnpm content:check` → `pnpm typecheck` → `pnpm lint`.
2. vitest từng file đã chạm ở pha 1–4 (một lệnh `pnpm vitest run <các file>`).
3. `pnpm --filter @miu/web build` → `pnpm security:dist`.
4. E2E, 1 worker, lần lượt, chỉ khi người điều phối/người sở hữu cho chạy (quy định máy dev: không E2E, không full suite nếu không được yêu cầu): `pnpm --filter @miu/web e2e --project setup --project bosses`, rồi `pnpm --filter @miu/web e2e --project setup --project coop`. Trước khi chạy: `memory_pressure | tail -1`, `pgrep -fl 'jest|vitest|playwright|vite build'`, kiểm cổng 8787/4173 trống; không chạy `perf`.
5. Full `pnpm test`, `e2e:ci`, Semgrep, `pnpm audit` để CI.

Ghi số liệu cụ thể trong report (số test, số lỗi/cảnh báo, draw call đo được, cảnh báo build như chunk size), không chỉ "xanh".

## Review và hoàn tất

- Agent `code-reviewer` đọc toàn bộ thay đổi (pha 1–5), đặc biệt: `game.ts`, `quest-layer.tsx`, điều kiện `covered`, hoãn thẻ vở, không có logic đúng/sai ở client.
- Không dependency mới (nếu phát sinh thì ghi vào trang review).
- Commit theo pha, conventional commits tiếng Anh, không nhắc AI, không mã plan/phase (ví dụ `feat(web): boss fights play out in the live world with varied play moves`).
- Không deploy trong plan này; deploy production phải hỏi người trước mỗi lần.

## Rủi ro và hoàn tác

- Draw call CI vượt do GPU giả lập khác máy dev: dev chỉ ghi chú (`expectDrawCalls`), CI đỏ thì xem lại số hạt, không nâng ngân sách.
- Hoàn tác: revert commit pha 5 không đổi hành vi người chơi; spec cũ sẽ gãy nếu chỉ revert pha 5 mà giữ pha 3–4, nên revert theo thứ tự ngược.
