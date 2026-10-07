# Pha 5: Ảnh các màn chính ở điện thoại dọc và iPad, agent xem ảnh

**Tier:** M · **Phụ thuộc:** pha 4 (cùng sửa `apps/web/playwright.config.ts`, `apps/web/playwright.ci.config.ts`, `apps/web/package.json`) · **Trạng thái:** pending

## Bối cảnh

Ba lỗi người sở hữu gặp hôm nay là lỗi nhìn thấy được: bản đồ Home bị đẩy xuống, panel Olympic thiếu nút đóng, nhãn tương tác bị thẻ nhiệm vụ đè. E2E kiểm hành vi, không nhìn màn. Repo đã có cách sinh ảnh review: spec ghi PNG vào `assets/generated/review/<mục>/` khi đặt `REVIEW_SHOTS=1`, rồi `pnpm assets:manifest` (`apps/web/e2e/account-flow.spec.ts:12-32`); glob khai ở `tools/assets/generated.json:96-108`; trang review đọc danh sách ảnh qua manifest (`apps/web/src/review/review-main.ts:200`). Bản production không mang ảnh review (`apps/web/vite.config.ts:74-79`, kiểm ở `tools/deploy/production/deploy.sh:124-129`).

## Thiết kế

**Lệnh.** `pnpm --filter @miu/web screens` = `playwright test --project setup --project screens` (1 worker, cùng server E2E: PGlite trong RAM, tài khoản giả, không dữ liệu thật). Project `screens` khai trong `apps/web/playwright.config.ts`, bị loại khỏi `playwright.ci.config.ts` và khỏi `e2e:smoke` như `perf`. Chạy trên máy dev trước mỗi lần deploy (pha 6 bắt buộc), sau khi kiểm tải máy và cổng.

**Khổ màn.** Điện thoại dọc 360 × 740 và iPad dọc 820 × 1180, `deviceScaleFactor: 1`, `hasTouch: true` (cùng hai khổ `bosses.spec.ts:292` đang dùng). Plan mobile (`261007-2038-mobile-app-ios-android` pha 5) thêm khổ của nó vào cùng spec này.

**Các màn (19 màn × 2 khổ = 38 ảnh).** Mỗi màn một tên cố định, ghi đè mỗi lần chụp:

| Tên | Màn | Cách tới (gợi ý) |
| --- | --- | --- |
| `01-login` | Đăng nhập | `/login` khi chưa đăng nhập |
| `02-players` | Chọn người chơi | `/profiles` |
| `03-creator` | Tạo nhân vật | `/create` |
| `04-home` | Home (đảo, nút, mọi ghim vùng không bị che; thay `home.spec.ts:69` ở khổ điện thoại) | `/home` |
| `05-world-map` | Bản đồ thế giới | `/map` |
| `06-region` | Chi tiết vùng | `/region/khu-rung-bi-mat` |
| `07-play-hud` | `/play` ở chỗ xuất hiện: thẻ nhiệm vụ, cần điều khiển, menu, bản đồ nhỏ | `/play?spawnAt=spawn` |
| `08-play-prompt` | Đứng cạnh mục tiêu: nhãn Tương tác cùng thẻ nhiệm vụ | như `play.spec.ts:206` |
| `09-dialogue` | Lời thoại NPC | chạm mục tiêu đầu của quest chương 1 |
| `10-question` | Câu hỏi có Hướng dẫn, Gợi ý, Đáp án | qua `apps/web/e2e/quest-api.ts` tới bước câu hỏi |
| `11-reward` | Màn thưởng, lên cấp | sau bước thưởng |
| `12-event-panel` | Panel sự kiện Olympic | mở từ banner sự kiện |
| `13-olympiad-practice` | Màn luyện tập Olympic | `event-practice` |
| `14-boss` | Trận boss trong thế giới (câu hỏi dài, như `bosses.spec.ts:292`) | theo test boss giữ ở pha 4 |
| `15-shop` | Cửa hàng: danh sách và chi tiết | Home → cửa hàng |
| `16-backpack` | Ba lô | `/backpack` |
| `17-pet-care` | Chăm thú cưng | nút thú cưng trên HUD |
| `18-party` | Tổ đội và bạn bè (online) | panel online trên `/play` |
| `19-worksheets` | Khu phụ huynh, phiếu viết | `/parent/worksheets` qua cổng phụ huynh |

Màn nào không tới được trong một lần chạy thì ghi `missing` cùng lý do vào dữ kiện, không làm hỏng cả lượt chụp.

**Dữ kiện DOM đi kèm từng ảnh** (đo bằng `page.evaluate` ngay lúc chụp, ghi vào `assets/generated/review/screens/shots.json`): phần tử tương tác nhìn thấy mà khung vượt ra ngoài màn; cặp phần tử tương tác nhìn thấy chồng lên nhau (hàm `overlap` gom vào `apps/web/e2e/layout.ts`; ba bản giống hệt ở `home.spec.ts:8`, `online.spec.ts:14`, `hud-layout.spec.ts:13` đều bị pha 4 xóa); panel hay cảnh đang mở (`[role="dialog"]`, `.scene`, `.parchment`) không có nút đóng hay quay lại nhìn thấy (`[data-id$="-close"]`, `.scene-close`, `[data-id$="-back"]`); phần tử chữ bị xén (`scrollWidth > clientWidth` hoặc `scrollHeight > clientHeight` khi `overflow` không phải `visible`/`auto`/`scroll`); khóa i18n thô lọt ra màn (chuỗi dạng `abc.def`). Dữ kiện là gợi ý cho người xem ảnh, không phải assertion.

Ảnh commit vào repo, ghi đè cùng tên mỗi lần chụp, tỉ lệ 1, có trong manifest (Validation Log câu 2).

**Phát hiện của lần duyệt** ghi vào `assets/generated/review/screens/review.json`:

```json
{
  "capturedFrom": "<sha của HEAD lúc chụp>",
  "capturedAt": "<ISO, Asia/Saigon>",
  "reviewedAt": "<ISO>",
  "reviewer": "agent:<tên agent>",
  "verdict": "pass | fail",
  "findings": [
    { "shot": "360x740/12-event-panel.png", "kind": "missing-close | overlap | clipped | off-screen | shifted | blank-scene | raw-text | other", "severity": "block | note", "text": "Panel Olympic không có nút đóng; chỉ thoát được bằng nút Back của máy.", "fixedIn": null }
  ]
}
```

`verdict` là `pass` khi không còn phát hiện `block` nào có `fixedIn` rỗng.

## Cách agent xem ảnh

Thủ tục viết vào `docs/screen-review.md` (mới) để mọi phiên dùng chung:

1. Sau `pnpm --filter @miu/web screens`, phiên chính giao việc xem ảnh cho subagent, mỗi subagent tối đa 12 ảnh (để ảnh không tràn ngữ cảnh). Prompt gồm: danh sách đường dẫn PNG, phần dữ kiện của các ảnh đó trong `shots.json`, checklist dưới đây, đường dẫn ảnh lần duyệt trước để so (`git show <capturedFrom cũ>:assets/generated/review/screens/<khổ>/<tên>.png > <scratchpad>/prev-<tên>.png`).
2. Subagent mở từng PNG bằng công cụ Read (model nhìn ảnh trực tiếp), đối chiếu checklist và dữ kiện DOM, so với ảnh lần trước, rồi trả phát hiện đúng định dạng trên kèm `Status`. Không gửi ảnh ra dịch vụ ngoài, không dùng dịch vụ trả phí.
3. Phiên chính gộp phát hiện vào `review.json`. Phát hiện `block` phải sửa trước khi deploy (sửa xong chụp lại đúng màn đó và ghi `fixedIn`); `note` hiện trên trang review cho người duyệt.

**Checklist** (mỗi mục là một câu hỏi có/không cho từng ảnh):

1. Panel, cảnh hay hộp thoại đang mở có nút đóng hoặc quay lại nhìn thấy, không bị che, đủ lớn để chạm (khoảng ≥ 44 px)? Không có → `missing-close`, `block`.
2. Có nút, nhãn Tương tác, thẻ nhiệm vụ, cần điều khiển, menu, thanh máu nào đè lên nhau không? Có → `overlap`, `block` nếu che chữ hay vùng chạm.
3. Có chữ bị cắt (dấu "…" giữa câu, dòng bị xén nửa, chữ tràn khung, thiếu dấu tiếng Việt) không? → `clipped`.
4. Có phần nào ra ngoài màn hay sát mép bị cắt không? → `off-screen`, `block` nếu là nút.
5. So với ảnh lần trước: vùng chính (đảo Home, bản đồ, panel) có bị đẩy, lệch, co lại mà commit không có ý đó không? → `shifted`.
6. Màn cần cảnh 3D phía sau có vẽ (không đen trắng, không thiếu đảo)? → `blank-scene`.
7. Có chuỗi khóa hay chữ tiếng Anh lọt vào màn tiếng Việt (ví dụ `common.close`) không? → `raw-text`.
8. Chữ đọc được trên nền (tương phản), bố cục hợp cả bé lẫn người lớn (`.claude/rules/product-audience.md`)? → `note`.

## Trang review

Mục mới "Màn hình trước deploy" trong `apps/web/review.html` (một `<section data-id="review-screens">`) do `apps/web/src/review/review-main.ts` điền: lưới ảnh theo màn, hai khổ cạnh nhau, dưới mỗi ảnh là phát hiện (`block` đỏ, `note` vàng, đã sửa thì ghi commit), đầu mục ghi `capturedFrom`, `capturedAt`, `verdict`. Dữ liệu đọc từ `review.json`, `shots.json` qua manifest như các mục khác.

## Việc

1. `apps/web/e2e/layout.ts`: `overlap`, thu dữ kiện DOM.
2. `apps/web/e2e/screens.spec.ts`: hai khổ, 19 màn, ghi PNG vào `assets/generated/review/screens/<rộng>x<cao>/<tên>.png` và `shots.json`; cuối lượt chạy `pnpm -s assets:manifest` như `account-flow.spec.ts:32`. Dùng lại helper có sẵn (`quest-api.ts`, `touch.ts`, `stats.ts`) mà không sửa chúng; chờ tín hiệu sẵn sàng của game (`window.__miuStats.ready`, như `apps/web/e2e/stats.ts:5`) thay vì chờ cố định.
3. `apps/web/playwright.config.ts`: project `screens` (phụ thuộc `setup`, `storageState` phụ huynh); `apps/web/playwright.ci.config.ts`: loại `screens` cùng `perf`; `apps/web/package.json`: script `screens`, và `e2e:smoke` loại `screens`.
4. `tools/assets/generated.json`: glob `generated/review/screens/**` (`generator`: `apps/web/e2e/screens.spec.ts`, license và `derivedFrom` như glob `generated/review/ui` ở `:96-108`).
5. `apps/web/review.html`, `apps/web/src/review/review-main.ts`: mục "Màn hình trước deploy".
6. `docs/screen-review.md`: lệnh, thủ tục, checklist, định dạng `review.json`, cách so ảnh lần trước. Thêm liên kết từ `docs/README.md` (bản đồ docs) và một dòng trong `docs/deployment-guide.md` (pha 6 làm).
7. Chạy lần đầu, duyệt theo thủ tục, sửa phát hiện `block` nếu có (lỗi UI thuộc phiên `miu-world-03` thì nhắn phiên đó), commit ảnh, JSON, manifest.

## File

Mới: `apps/web/e2e/screens.spec.ts`, `apps/web/e2e/layout.ts`, `docs/screen-review.md`, `assets/generated/review/screens/**`. Sửa: `apps/web/playwright.config.ts`, `apps/web/playwright.ci.config.ts`, `apps/web/package.json`, `tools/assets/generated.json`, `assets/manifest.json` và `assets/LICENSES.md` (chỉ qua `pnpm assets:manifest`), `apps/web/review.html`, `apps/web/src/review/review-main.ts`, `docs/README.md`. Chỉ đọc: `apps/web/e2e/quest-api.ts`, `apps/web/src/ui/**`.

## Kiểm tra

- `pnpm --filter @miu/web screens` xong một lượt, 38 ảnh hoặc ảnh thiếu có lý do trong `shots.json`; ghi thời gian chạy.
- `pnpm assets:check` xanh (mọi ảnh có trong manifest, license đúng allowlist).
- `pnpm --filter @miu/web build`; mở `/review.html` qua `pnpm --filter @miu/web preview` thấy mục mới với ảnh và phát hiện.
- Gate 5 lệnh.

## Rủi ro, hoàn tác

- Cảnh 3D chưa vẽ xong lúc chụp: chờ `window.__miuStats.ready` (`apps/web/src/game/debug/stats-overlay.ts:115`); chụp lại riêng màn đó nếu dữ kiện cho thấy cảnh trống.
- Ảnh lộ dữ liệu: chỉ tài khoản giả trong PGlite RAM, tên nhân vật giả; không dùng `.data/pglite` thật.
- Hoàn tác: revert; xóa thư mục `assets/generated/review/screens/` rồi `pnpm assets:manifest`.
