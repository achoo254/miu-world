# Review code — đợt "next batch" (7b402b8..HEAD)

Ngày: 2026-10-01 (Asia/Saigon). Người review: code-reviewer. Chế độ: chỉ đọc (không sửa file, không chạy build/E2E/dev server).

## Phạm vi

- Commit: `5cc9973` (E2E forest-life), `0250e17` (màn thưởng hiện lần lượt), `71a30d6` (build release), `b94daeb` (docs).
- File code đã review:
  - `apps/web/src/ui/rewards/completion-sequence.tsx`, `rewards.css`, `rewards.test.tsx`
  - `apps/web/src/ui/dialogue/npc-portrait.tsx`
  - `apps/web/vite.config.ts`, `apps/web/vite-repo-assets.ts`, `apps/web/vite-repo-assets.test.ts`, `apps/web/package.json`
  - `tools/deploy/production/deploy.sh`
  - `apps/web/e2e/forest-life.spec.ts`, `apps/web/e2e/mvp-loop.spec.ts`
- Đọc thêm để đối chiếu: `quest-layer.tsx`, `use-quest-controller.ts`, `sound/sfx.ts`, `kit/ui-art.ts`, `game/asset-loader.ts`, `game/ambient/ambient-life.ts`, `ambient-actor.ts`, `game.ts`, `tools/security/scan-dist.ts`, `e2e/challenges.spec.ts`, `e2e/quest-flow.spec.ts`, `assets/generated/world/forest-ch1/entities.json`, ảnh `assets/generated/review/mvp/10-reward.png`.
- Theo chỉ đạo của chủ dự án: không nêu vấn đề bảo mật / dữ liệu trẻ em / bản quyền.

## Kiểm chứng đã chạy

| Lệnh | Kết quả |
|---|---|
| `pnpm vitest run apps/web/vite-repo-assets.test.ts apps/web/src/ui/rewards/rewards.test.tsx` (từ gốc repo) | 2 file, 16 test pass. Có 5 dòng stderr `Not implemented: HTMLMediaElement's play() method` (jsdom), giờ xuất hiện vì màn thưởng gọi `playCue`. |
| `pnpm exec eslint <các file đã đổi> --max-warnings=0` | exit 0, 0 lỗi, 0 cảnh báo. |
| Build, E2E | Không chạy (cổng đang bận theo yêu cầu). |

Lưu ý: chạy `pnpm vitest run vite-repo-assets.test.ts` từ `apps/web` thì file này không được chọn (chỉ 1 file chạy); phải chạy từ gốc repo.

## Đánh giá chung

Không có lỗi chặn. Phần đếm số và âm thanh dọn dẹp đúng: rAF bị hủy khi unmount, timer của tiếng sao bị clear, dep `[stars]` và `[target, delayMs]` là số nên re-render (ví dụ `data` làm mới sau khi server trả) không phát lại âm thanh hay đếm lại từ đầu. Guard trong `deploy.sh` đúng logic dưới `set -e`. Bộ asset của bản release không thiếu file runtime nào trong hiện trạng. Phát hiện chính: `vite.config.ts` bị thụt lề hỏng, bản release chưa từng được build/chạy thử trước lúc deploy production, và sao chưa đạt cũng "nảy" như sao đạt.

---

## Critical

Không có.

## High

Không có.

## Medium

### M1. `vite.config.ts` bị thụt lề hỏng — đọc như thể code module nằm trong hàm

- Vị trí: `apps/web/vite.config.ts:23-71`.
- Bằng chứng: object trả về của `contentSecurityPolicy()` thụt 6 dấu cách, `}` đóng hàm thụt 2 (dòng 30-31); `apiProxy`, `publicHosts`, JSDoc và cả `export default defineConfig(...)` ở cấp module nhưng thụt 2 dấu cách (dòng 33-48); thân `return {` lại không thụt so với `return` (dòng 50-70). Diff hiển thị cả khối CSP và proxy như "đã sửa" dù logic không đổi, làm nhiễu `git blame`. Repo không có Prettier, ESLint không kiểm thụt lề nên gate không bắt được.
- Tác động: người đọc tiếp theo dễ hiểu sai phạm vi (ví dụ tưởng `apiProxy` nằm trong `contentSecurityPolicy`). Vi phạm nguyên tắc "readability > brevity" của repo.
- Sửa: đưa `contentSecurityPolicy`, `apiProxy`, `publicHosts`, `export default` về cột 0 như bản `7b402b8`; chỉ thụt thân callback `({ mode }) => { ... }` thêm một cấp:

```ts
export default defineConfig(({ mode }) => {
  const review = mode !== 'release';
  return {
    plugins: [react(), contentSecurityPolicy(), repoAssets(ASSETS_DIR, APP_DIR, UI_ART_PATHS, { review })],
    // ...
  };
});
```

### M2. Bản `--mode release` chưa từng được build hay chạy thử trước khi lên production

- Vị trí: `apps/web/package.json:9` (`build:release`), `tools/deploy/production/deploy.sh:82-83`; CI và E2E dùng `pnpm --filter @miu/web build` (mặc định, có trang review).
- Bằng chứng: chỉ đường production dùng `build:release`. CI (`.github/workflows/ci.yml`) build bản thường; `e2e:ci` preview bản thường. Unit test `vite-repo-assets.test.ts:54-62` chỉ kiểm danh sách asset, không kiểm đầu vào rollup (`vite.config.ts:58-61`) hay việc game chạy được khi thiếu `generated/review/**`. Preview server phục vụ đúng `dist/` (`vite-repo-assets.ts:139-163`), nên E2E sẽ bắt được asset thiếu, nhưng E2E không bao giờ chạy trên bản release.
- Đã kiểm tay hiện trạng: mọi đường dẫn `generated/review/` mà runtime dùng đều đến từ `artFor()` trong `ui-art.ts:55-56` và nằm trong `UI_ART_PATHS`; game 3D chỉ đọc `generated/atlas|world|characters|sounds` và icon `UI_ICONS`. Nên hôm nay không thiếu file. Rủi ro là lần sau: một ảnh mới trong `generated/review/` được UI dùng mà không qua `UI_ART_PATHS` sẽ chỉ hỏng trên production (404 im lặng, `<img>` vỡ).
- Sửa (chọn một, đề xuất cái đầu):
  1. Thêm vào CI một bước `pnpm --filter @miu/web exec vite build --mode release` + `pnpm security:dist`, rồi chạy một project E2E nhỏ (ví dụ `mvp-loop`) trên `dist` đó; hoặc
  2. Tối thiểu: CI build release và assert `dist/review.html`, `dist/preview.html` không tồn tại và `dist/index.html` tồn tại.

### M3. Sao chưa đạt cũng "nảy" và lóe sáng hết cỡ như sao đạt

- Vị trí: `apps/web/src/ui/rewards/rewards.css:4,10,13`; `completion-sequence.tsx:106`.
- Bằng chứng: lớp `reward-star` gắn cho cả 3 sao (sao chưa đạt là `reward-star reward-star--off`), nên rule ở dòng 10 cho sao xám cũng chạy `reward-star-pop` với delay `n * 400ms`. Keyframe dòng 13 đặt `opacity: 1` ở mốc 70% và không đặt opacity ở `to`, nên sao xám đi 0 → 1 → 0.35 (giá trị nền của `.reward-star--off`): nó lóe sáng đầy đủ rồi mờ đi. Không có tiếng `star` cho sao này (`useRewardSounds` chỉ hẹn `stars` lần). Trẻ đạt 2 sao thấy cả 3 sao lần lượt bật lên kiểu ăn mừng; lời chú thích ở dòng 8 ("stars light one by one ... matching the star sound") không còn đúng. Ảnh review `10-reward.png` là 3 sao nên không lộ lỗi; `challenges.spec.ts:89` (2 sao) không chụp ảnh.
- Sửa: chỉ cho sao đạt chạy pop; sao chưa đạt hiện nhẹ sau sao cuối, giữ opacity nền:

```css
@media (prefers-reduced-motion: no-preference) {
  .reward-star:not(.reward-star--off) { animation: reward-star-pop 480ms cubic-bezier(0.3, 1.6, 0.5, 1) backwards; animation-delay: calc(var(--star, 1) * 400ms); }
  .reward-star--off { animation: reward-dim-in 360ms ease-out backwards; animation-delay: calc(var(--star, 1) * 400ms); }
}
@keyframes reward-dim-in { from { opacity: 0; } }
```

  Thêm một unit/E2E kiểm `data-stars="2"` mà sao thứ 3 không có animation pop (hoặc chụp ảnh review cho trường hợp 2 sao).

## Low

### L1. Mốc thời gian nhân đôi giữa TS và CSS, mốc hiện vật phẩm cố định 2000ms

- Vị trí: `completion-sequence.tsx:20-21,91`; `rewards.css:10-11`.
- Bằng chứng: `STAR_GAP_MS = 400` trong TS và `400ms` viết cứng trong CSS; bộ đếm bắt đầu ở `(stars + 1) * 400` và kết thúc ở `+900` (3 sao: 1600 → 2500ms), còn hàng vật phẩm/kỹ năng bắt đầu cố định ở `2000ms` bất kể số sao. Kết quả: vật phẩm trượt vào khi XP còn đang đếm (2000–2500ms), trái với chú thích "then the other rewards slide in"; với 0–1 sao thì bộ đếm xong rất sớm mà vật phẩm vẫn chờ đến 2s. Đổi một hằng số ở TS thì CSS lệch âm thầm.
- Sửa: truyền từ TS qua biến CSS trên `.reward-body`, ví dụ `style={{ '--star-gap': `${STAR_GAP_MS}ms`, '--reveal-from': `${countFrom + COUNT_MS}ms` }}`, và CSS dùng `calc(var(--star) * var(--star-gap))`, `calc(var(--reveal-from) + var(--reveal) * 200ms)`.

### L2. Âm thanh bỏ qua reduced motion

- Vị trí: `completion-sequence.tsx:62-68`.
- Bằng chứng: dưới `prefers-reduced-motion: reduce` sao và số hiện ngay (`useCountUp` dòng 45-50, CSS chỉ chạy trong `no-preference`) nhưng tiếng `star` vẫn kêu lần lượt ở 400/800/1200ms — không khớp hình. Không sai chức năng.
- Sửa: dưới reduced motion chỉ phát `complete` (hoặc phát một tiếng `star` kèm ngay), không hẹn giờ.

### L3. StrictMode (dev) phát hai tiếng `complete` chồng nhau

- Vị trí: `completion-sequence.tsx:64`; `main.tsx:14` bật `StrictMode`.
- Bằng chứng: React dev chạy effect → cleanup → effect; cleanup chỉ clear timer sao, còn `playCue('complete')` đã phát. `nextVariant` (`sfx.ts:14-21`) cố ý chọn biến thể khác lần trước, nên dev nghe hai chime khác nhau gần như cùng lúc. Production không bị.
- Sửa (tùy chọn): hẹn `complete` bằng `setTimeout(..., 0)` cùng mảng `timers` để cleanup hủy được lần chạy thử của StrictMode.

### L4. Test chưa chứng minh hành vi mới quan trọng

- Vị trí: `apps/web/src/ui/rewards/rewards.test.tsx:76-105`.
- Bằng chứng:
  - Không test âm thanh: `complete` một lần, đúng `stars` lần `star`, và không còn tiếng nào sau khi unmount (bấm "Tiếp" sớm). Hiện `playCue` chạy thật trong jsdom và sinh 5 dòng stderr `Not implemented: HTMLMediaElement's play()`.
  - Vòng rAF của `useCountUp` không được test (chỉ hàm thuần `countUpValue`); không có test số tiến tới giá trị cuối sau delay.
  - `lastSpeakerOf` (`npc-portrait.tsx:51-53`) và chân dung NPC cổ vũ không được kiểm; test "cheer" chỉ kiểm `.miu-portrait`.
- Sửa: `vi.mock('../sound/sfx', () => ({ playCue: vi.fn() }))` + `vi.useFakeTimers()`; assert `playCue` gọi `['complete', 'star', 'star']` với `stars: 2`, rồi `unmount()` trước 800ms và assert chỉ còn 2 lần gọi. Thêm test `lastSpeakerOf` trả người nói cuối và `null` khi quest không có dialogue; kiểm `[data-id="reward-cheer"] [data-id="npc-portrait"]` khi QUEST có dialogue.

### L5. Test E2E "stays quiet" không có đối chứng dương

- Vị trí: `apps/web/e2e/forest-life.spec.ts:84-95`.
- Bằng chứng: `stats.lastLine` không bao giờ bị xóa (`ambient-life.ts:210`), nên assert `ambientLine === null` sau 8s đúng là kiểm cả phiên — tốt. Nhưng test không chứng minh có ai *sẽ* nói nếu không có luật im lặng: `say()` bỏ qua mọi lời ngoài `HEAR_RADIUS = 16` (`ambient-life.ts:30,206`). Khoảng cách ngang từ `parrot-guide` (30.5, 13, 32.5) tới các nhân vật (tính từ `entities.json`): người gần nhất `bac-tieu-phu` 16.0, `chu-cau-ca` 17.1, `co-lam-vuon` 18.7; chỉ `vet-trai` (13.0, bay quanh mốc `sky` cao 23) có thể trong tầm nghe. Nếu luật "quest thắng" (`game.ts:409-411`) hỏng, test có thể vẫn xanh vì không ai trong tầm nghe chào.
- Sửa: thêm một số đếm vào stats (ví dụ `ambientHushed` tăng khi `say()` bị chặn vì `quiet`) và assert `> 0`; hoặc đặt `spawnAt` ở điểm vừa trong `noticeRadius` của một dân làng vừa trong tầm prompt của một target quest.

### L6. Guard release trong `deploy.sh` chỉ kiểm một phần

- Vị trí: `tools/deploy/production/deploy.sh:83`.
- Bằng chứng: logic `[ ! -e A ] && [ ! -e B ] || { ...; exit 1; }` đúng dưới `set -euo pipefail` (lệnh trong danh sách `&&`/`||` không kích hoạt errexit trừ lệnh cuối; có A hoặc B thì nhánh `||` chạy `exit 1`). Nhưng chỉ kiểm `review.html` và `generated/review/mvp`; không kiểm `preview.html`, `generated/review/ui`, `generated/review/perf.json` — đúng những thứ commit hứa bỏ ra.
- Sửa: kiểm theo vòng lặp:

```bash
for p in review.html preview.html game-assets/generated/review/mvp game-assets/generated/review/ui game-assets/generated/review/perf.json; do
  [ ! -e "apps/web/dist/$p" ] || { echo "release build still carries $p" >&2; exit 1; }
done
```

### L7. Assert E2E cũ trên `reward-xp` giờ khớp chuỗi ghép

- Vị trí: `e2e/challenges.spec.ts:88`, `e2e/quest-flow.spec.ts:93`, `e2e/mvp-loop.spec.ts:183`.
- Bằng chứng: textContent của `li[data-id="reward-xp"]` giờ là `+0 XP+100 XP` (span hiển thị + span `.visually-hidden`). Regex `/\+100 XP/` vẫn khớp nhờ span ẩn nên vẫn kiểm đúng số của server, nhưng ý nghĩa đã đổi so với trước và dễ gây hiểu nhầm khi sửa sau này.
- Sửa: nhắm thẳng `[data-id="reward-xp"] .visually-hidden` với `toHaveText('+90 XP')` / `'+100 XP'` (hoặc dùng `data-value` đã có ở `completion-sequence.tsx:74`).

## Đã kiểm, không phải lỗi

- rAF cleanup (`completion-sequence.tsx:52-56`): `frame` được gán lại trong `tick`, cleanup hủy id mới nhất; không rò sau unmount.
- `target` đổi giữa chừng: effect chạy lại, đếm lại từ 0 sau delay đầy đủ. Server không đổi số sau khi hoàn thành nên chấp nhận được.
- Re-render khi `data` làm mới: `RewardScreen` không remount (`quest-layer.tsx:61-69`, không có `key` đổi), dep là số nên không phát lại âm thanh.
- Bấm "Tiếp" trước khi hết hiệu ứng: `RewardScreen` unmount, timer và rAF bị hủy.
- Accessibility bộ đếm: số đang chạy `aria-hidden`, số cuối trong `.visually-hidden` (`styles.css:24`); icon là `<img alt="">`. Chân dung NPC `aria-hidden`.
- `presenterOf` sau refactor: `findIndex` trả -1 vẫn cho `null` như trước.
- `lastSpeakerOf`: mọi `speaker` trong `content/quests/*.json` là nhân vật NPC (không có `{name}` của người chơi), nên không có trường hợp chân dung chữ cái của chính bé đứng cạnh `MiuPortrait`.
- Bản release: `vite build` mặc định `emptyOutDir`, nên `review.html` cũ không sót lại; `--mode release` vẫn để `NODE_ENV=production`; không có `.env.*` hay code đọc `import.meta.env.MODE`; `scan-dist.ts` không phụ thuộc trang review; server/nginx không tham chiếu `review.html`/`preview.html`.
- Bộ đếm và ảnh review: `mvp-loop.spec.ts:185` chờ span hiển thị đạt `+100 XP` trước khi chụp `10-reward` — đúng, vì `animations: 'disabled'` không dừng được rAF. Ảnh hiện tại cho thấy Cây cổ thụ cổ vũ cạnh nhân vật, 3 sao, đủ hàng thưởng.

## Hành động đề xuất (theo thứ tự)

1. Sửa thụt lề `vite.config.ts` (M1).
2. Thêm bước CI build `--mode release` + kiểm dist (M2); mở rộng guard `deploy.sh` (L6).
3. Chỉ cho sao đạt chạy pop (M3).
4. Bổ sung test âm thanh, rAF và `lastSpeakerOf`; mock `playCue` để bỏ nhiễu stderr (L4).
5. Đồng bộ mốc thời gian TS/CSS (L1); tắt tiếng sao hẹn giờ dưới reduced motion (L2).
6. Thêm đối chứng cho test "stays quiet" (L5); siết selector `reward-xp` (L7).

## Số liệu

- Type coverage: không có `any`, không có `!` trong phần code mới; `as CSSProperties` dùng cho biến CSS tùy biến (cách thông dụng).
- Test: 16/16 pass trên 2 file liên quan; chưa có số coverage.
- Lint: 0 lỗi, 0 cảnh báo trên các file đã đổi.

## Câu hỏi còn mở

- iPad Safari: tiếng `star` phát từ `setTimeout` sau phản hồi server (ngoài cử chỉ người dùng). `sfx.ts` nuốt lỗi nên không hỏng, nhưng có thể im lặng trên thiết bị — cùng kiểu với `right`/`wrong` đã có. Cần xác nhận trong DEVICE-01.
- Có muốn bản staging cũng chạy bản release (không trang review) để đường production được thử trước, hay staging vẫn là nơi người duyệt xem review page? Liên quan M2.

## Xử lý (01/10/2026)

| Mục | Xử lý |
|---|---|
| M1 | Sửa: `vite.config.ts` dựng lại từ bản gốc, chỉ khối `defineConfig` đổi (thụt lề sai do script khớp nhầm `return {` của plugin CSP). |
| M2 | Sửa một phần: test `vite-repo-assets.test.ts` chặn mọi tham chiếu `generated/review/` trong mã game ngoài `ui-art.ts` (danh sách bản release giữ lại). Bản release đã chạy E2E `play`, `quest-flow`, `creator`, `home` (31/31). Chưa thêm bước CI build release. |
| M3 | Sửa: chỉ sao đạt mới nảy (`.reward-star:not(.reward-star--off)`). |
| L1 | Sửa: nhịp sao và mốc hiện vật phẩm truyền từ TS sang CSS (`--star-gap`, `--reveal-from` = lúc bộ đếm dừng). |
| L2 | Sửa: giảm chuyển động thì chỉ có tiếng chuông, không có tiếng sao. |
| L3 | Không sửa: chỉ ở dev (StrictMode). |
| L4 | Sửa một phần: test `lastSpeakerOf` và `presenterOf`; chưa test thứ tự âm thanh. |
| L5 | Sửa: test "im lặng" đứng cạnh Cây nấm đỏ, người câu cá trong tầm nghe (test tự kiểm khoảng cách < 16). |
| L6 | Sửa: guard kiểm cả `preview.html` và mọi thứ dưới `generated/review` trừ `character`. |
| L7 | Sửa: ba spec đọc số cuối ở `.visually-hidden`. |

Kiểm lại: gate 5 lệnh (75 file / 550 test), E2E `forest-life` + `quest-flow` + `challenges` + `mvp-loop` 13/13, build release 152 asset 6,17 MB không có trang review.
