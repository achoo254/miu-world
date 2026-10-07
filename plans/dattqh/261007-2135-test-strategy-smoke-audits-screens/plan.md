---
title: "Đổi chiến lược kiểm thử: smoke chặn deploy, audit mục tiêu quest, ảnh màn hình AI duyệt"
description: "Thu E2E về khoảng 10 luồng chính luôn xanh và chặn deploy, thêm audit Node bắt mục tiêu quest bị chiếm nút Tương tác hay bị ẩn, và chụp các màn chính ở điện thoại dọc và iPad cho AI duyệt trước mỗi lần deploy."
status: completed
priority: P1
tier: L
effort: L
branch: main
tags: [testing, e2e, ci, content, review, deploy]
created: 2026-10-07
---

# Đổi chiến lược kiểm thử: smoke chặn deploy, audit mục tiêu quest, ảnh màn hình AI duyệt

**Trạng thái:** xong (07/10/2026), report `plans/dattqh/reports/test-strategy-261007.md` · **Tier:** L · **Nhánh:** `main` (không tạo nhánh, không worktree) · **Ngày:** 07/10/2026

## Kết quả mong muốn

CI trên `main` xanh lại, và khi nó đỏ thì nghĩa là có lỗi thật. E2E chỉ còn khoảng 10 luồng chính, chạy nhanh, luôn xanh và chặn deploy. Hai loại kiểm mới bắt đúng kiểu lỗi người sở hữu hay gặp khi chơi:

1. Một audit Node chạy trong vài chục giây trên mọi map (kể cả cảnh sự kiện `content/events/**`): với mọi bước quest có mục tiêu, mục tiêu tới được, nút Tương tác ở mọi chỗ đứng trong bán kính của nó hiện đúng mục tiêu đó (không bị vật tương tác khác chiếm), và mục tiêu không bị ẩn hay bị khối che.
2. Trước mỗi lần deploy, các màn chính được chụp ở điện thoại dọc 360 × 740 và iPad dọc 820 × 1180; agent xem từng ảnh bằng thị giác của model theo một checklist, ghi phát hiện, và kết quả hiện trên trang review `apps/web/review.html`. Deploy từ chối chạy khi CI chưa xanh hoặc ảnh chưa được duyệt.

## Quyết định (đã chốt, không hỏi lại)

Người sở hữu (07/10/2026): "tôi thấy toàn tôi vào game chơi rồi thấy bug rồi yêu cầu sửa chứ e2e xong chẳng được cái gì", rồi giao Jev quyết. Jev chọn `smoke-plus-audits-and-screens`, độ tin 1,00, tự quyết (`decision: auto`): [input](../reports/jev-261007-2135-test-strategy-input.json), [output](../reports/jev-261007-2135-test-strategy-output.json).

Quyết định kỹ thuật của plan này (AI tự quyết theo `docs/code-standards.md` mục "Ra quyết định"):

- Audit dùng chính các hàm thuần mà game dùng để chọn nút Tương tác và trạng thái mục tiêu (`pickNearest`, `hintTarget`, `stepForTarget`, `worldState`, `castHidden`, `entitiesForChapter`, `withEventLayers`), không viết lại luật. Nhờ vậy audit đỏ ngay khi luật trong game đổi theo hướng làm hỏng (kiểm bằng thử đột biến: gỡ phần ưu tiên trong `pickNearest` thì audit phải báo ca bảng đề và vòm).
- Bộ smoke giữ trong các file spec có sẵn, không gắn tag: mọi spec còn lại sau khi cắt đều là smoke, nên không có chuyện tag trôi. `perf` và `screens` là project chạy tay, CI không chạy.
- Ảnh màn hình không phải test chặn: chúng là tư liệu cho agent và người duyệt. Phần chặn nằm ở bước deploy (ảnh phải mới và đã duyệt, không còn phát hiện mức `block`).

## Hiện trạng đo được (07/10/2026)

**Số lượng.** 26 file spec trong `apps/web/e2e/`, 114 test theo `playwright test -c playwright.ci.config.ts --list` (kể cả test chỉ chạy với `REVIEW_SHOTS=1`). Nhiều nhất: `play` 22, `maps` 13, `home` 11, `forest-life` 9, `bosses` 9. 14 test gắn `@smoke` (gồm `setup`).

**CI.** 60 lượt CI gần nhất trên `main` đều đỏ; lượt xanh cuối là `36807523435` lúc 02:47 UTC ngày 01/10/2026. Đỏ không chỉ ở E2E: job `check` (bước `pnpm test`) đỏ ở cả 12 lượt gần nhất. Job `integration` và `sast` xanh.

**Thời gian từng shard E2E** (ngân sách 480 s, `apps/web/playwright.ci.config.ts:8`):

| Lượt | Shard 1 | Shard 2 | Shard 3 | Shard 4 |
| --- | --- | --- | --- | --- |
| `37628698618` | 483 s, 29 test, 4 hỏng | 553 s, 29 test, 5 hỏng | 701 s, 27 test, 7 hỏng | 868 s, 19 test, 10 hỏng, 8 không chạy |
| `37627177732` | 462 s, 28 test, 4 hỏng | 480 s, 28 test, 5 hỏng | 497 s, 26 test, 3 hỏng | 824 s, 18 test, 10 hỏng, 8 không chạy |

Shard 4 luôn dừng ở `maxFailures: 10` (`apps/web/playwright.ci.config.ts:18`), nên 8 test (phần còn lại của `bosses`, `speak`, `voice`) không chạy. Thời gian job (từ lúc bắt đầu tới lúc xong) lượt `37628698618`: e2e 9 phút 24 giây, 10 phút 46 giây, 12 phút 52 giây, 15 phút 47 giây; `check` 11 phút 13 giây.

**E2E hỏng ở cả hai lượt** (`gh run view 37628698618 --log-failed`, `gh run view 37627177732 --log-failed`, dòng `✘`; số dòng theo file đã commit ở `5e543f4f`):

| Test | Lỗi trong log |
| --- | --- |
| `play.spec.ts:96` mép thế giới | vị trí -1,74, cần < -3 |
| `play.spec.ts:219` camera không chui vào khối | `mouse.move` quá 45 s |
| `creator.spec.ts:28` tạo nhân vật, động tác | nhận `gesture-positive`, cần `/walk\|run/` |
| `home.spec.ts:10` Home → chương 1 → HUD | không thấy `hud-tracker-textbook` |
| `mvp-loop.spec.ts:76` cả vòng MVP bằng chạm | không thấy `hud-tracker-count` |
| `sgk-mechanics.spec.ts:129` × 2 bài đọc dài cuộn bằng vuốt | cuộn được 0 px |
| `hud-layout.spec.ts:90`, `:107` iPad ngang, iPad dọc "fits" | chồng lấn HUD |
| `forest-life.spec.ts:37` các khu rừng sống động | `page.evaluate` quá 60 s |
| `sgk-content.spec.ts:67` chương đầu, cuối mỗi vùng | `waitForFunction` quá 45 s |
| `maps.spec.ts:147` chuyến xa nhất: `khu-rung-bi-mat`, `trung-tam`, `truong-hoc`, `nui-tuyet` | còn cách điểm đến 53–735 khối, cần < 8 |
| `maps.spec.ts:176` giảm chuyển động | còn cách 301 khối |
| `online.spec.ts:73` hai người chơi, tổ đội, kết bạn, chặn | không thấy `online-party-fold` |
| `interactions.spec.ts:88`, `:174` mọi tư thế; đồ bật còn bật | quá 150 s; 154 draw call, cần ≤ 150 |
| `pets.spec.ts:56`, `:83`, `:94` chăm thú cưng | không thấy `pet-trick-sit`, `play-pet-care` |

Chỉ hỏng ở lượt `37628698618` (lượt kia chưa chạy tới hoặc qua): `maps.spec.ts:147` `lang-ven-song`, `coop.spec.ts:160`, `pets.spec.ts:128`, `bosses.spec.ts:88`.

**Unit test hỏng thường trực ở job `check`** (cùng hai lượt, thêm lượt `37630093033`):

| Test | Lỗi |
| --- | --- |
| `packages/voxel/src/outland-plan.test.ts:49` "in budget" | 217–242 ms, ngân sách 200 ms (đo lần gọi đầu, JIT còn nguội) |
| `tools/world/generate-forest-map.test.ts:12` `beforeAll` | quá 120 s (cả file 210–215 s trên CI) |
| `tools/world/zone-maps.test.ts:46` `beforeAll` của `cho-phien` | quá 120 s (cả file 363–373 s) |
| `apps/web/src/ui/minigame/testing/describe-minigame.ts:58` "draws every state of a round" (`unblock-ferry`, `paper-io`, `helix-drop`) | quá 5 s mặc định của project `web` |

**Lỗi người sở hữu tìm thấy mà E2E không bắt được:** bảng đề `ev-olympic-bang` (`[221.5, 13, 331.5]`, bán kính 2,5) đứng cách vòm `ev-olympic-vom` (`[221.5, 13, 329.5]`, bán kính 3) đúng 2 khối nên nút hiện "Xem vòm" (`content/events/olympic-math-2026.json`; đã vá bằng phần ưu tiên ở `apps/web/src/game/entities/interactables.ts:127-147`, commit `471ac689`); bản đồ Home bị đẩy xuống; panel Olympic thiếu nút đóng; nhãn tương tác bị thẻ nhiệm vụ đè.

## Không làm

- Không thêm dịch vụ trả phí hay dịch vụ ngoài để so ảnh hoặc xem ảnh; không tải ảnh lên đâu cả.
- Không viết lại luật chọn nút Tương tác hay trạng thái quest trong audit; audit gọi hàm của game.
- Không biến ảnh màn hình thành test so pixel (dễ chập chờn với cảnh 3D).
- Không nâng ngân sách thời gian để test qua (`docs/code-standards.md:22`), không bật `retries`.
- Không xóa test nào trước pha 1 (phân loại) và trước khi agent đang sửa `bosses`, `coop`, `pets` commit xong.
- Không chạy E2E đầy đủ hay project `perf` trên máy dev; trên máy dev chỉ chạy đúng project đang sửa, 1 worker.
- Không sửa các lỗi sản phẩm mà phân loại tìm ra trong test bị bỏ, trừ khi lỗi nằm trên một luồng smoke; các lỗi đó vào backlog và trang review.

## Pha

| Pha | Tier | Nội dung | Phụ thuộc | File sở hữu chính |
| --- | --- | --- | --- | --- |
| [1](phase-01-triage-red-tests.md) | S | Phân loại mọi test đỏ thường trực: lỗi thật, test cũ hay chập chờn, kèm hướng xử lý | — | report mới trong `plans/dattqh/reports/` |
| [2](phase-02-green-check-job.md) | M | Job `check` xanh: đo ngân sách đúng cách, timeout có lý do, test sinh map chạy ở job `maps` riêng | — | `packages/voxel/src/outland-plan.test.ts`, `apps/web/src/ui/minigame/testing/describe-minigame.ts`, `vitest.config.ts`, `.github/workflows/ci.yml` |
| [3](phase-03-quest-target-audit.md) | M | Audit Node mục tiêu quest: tới được, không bị chiếm nút Tương tác, không bị ẩn hay che; chạy trong gate | — | `tools/world/quest-target-audit.ts` (+ test), `tools/world/reach-audit.ts`, `tools/content/check-content.ts`, `package.json` |
| [4](phase-04-smoke-suite.md) | L | Cắt E2E về khoảng 10 luồng, thêm luồng mua đồ, chuyển phần kiểm sang Node, CI chạy smoke | 1, 2; agent `bosses`/`coop`/`pets` commit xong | `apps/web/e2e/**`, `apps/web/playwright*.config.ts`, `apps/web/package.json`, `.github/workflows/ci.yml`, `docs/code-standards.md`, `CLAUDE.md` |
| [5](phase-05-screens-ai-review.md) | M | Chụp màn chính ở 360 × 740 và 820 × 1180, dữ kiện DOM, checklist cho agent xem ảnh, mục trên trang review | 4 | `apps/web/e2e/screens.spec.ts`, `apps/web/src/review/**`, `apps/web/review.html`, `tools/assets/generated.json`, `docs/screen-review.md` |
| [6](phase-06-deploy-gate.md) | S | `deploy.sh release` (production, staging) từ chối khi CI chưa xanh hoặc ảnh chưa duyệt | 4, 5; phiên `miu-world-03` deploy xong | `tools/deploy/release-gate.sh`, `tools/deploy/{production,staging}/deploy.sh`, `docs/deployment-guide.md` |
| [7](phase-07-verify-and-docs.md) | S | CI xanh 3 lượt liền, thử đột biến, hiệu chỉnh việc AI xem ảnh, cập nhật roadmap và trang review | 3, 4, 5, 6 | `docs/project-roadmap.md`, `apps/web/review.html` (mục kiểm thử) |

Pha 1, 2, 3 chạy song song được (file không trùng). Pha 2 và pha 4 cùng sửa `.github/workflows/ci.yml` nên pha 4 bắt đầu sau khi pha 2 đã commit. Pha 4 và pha 5 cùng sửa `apps/web/playwright.config.ts`, `apps/web/playwright.ci.config.ts`, `apps/web/package.json` nên chạy nối tiếp. Pha 4 và pha 6 cùng sửa `CLAUDE.md` (hai đoạn khác nhau), nối tiếp.

## Dòng dữ liệu

- **Audit (pha 3):** `assets/generated/world/<map>/{entities.json,regions/*.bin}` + `content/events/*.json` (mọi sự kiện coi như đang mở) + `content/quests/*.json` (trừ `stub`) → lưới đi được từ chỗ xuất hiện (như `tools/world/reach-audit.ts:19-55`) → với từng quest, từng bước, từng trạng thái tìm đồ: tập mục tiêu đang có mặt và tập ô đứng trong bán kính từng mục tiêu → `pickNearest` của game → danh sách phát hiện (in ra, `content:check` đỏ nếu khác rỗng).
- **Smoke (pha 4):** build web + server PGlite trong RAM (`apps/web/playwright.config.ts:32-74`) → 11 test trên 2 shard CI → reporter thời gian → job `e2e` xanh hoặc đỏ.
- **Ảnh (pha 5):** cùng server E2E trên máy dev → `screens.spec.ts` chụp PNG + ghi dữ kiện DOM vào `assets/generated/review/screens/` → `pnpm assets:manifest` → agent đọc PNG (Read, thị giác của model) theo `docs/screen-review.md` → ghi phát hiện vào `assets/generated/review/screens/review.json` → trang review đọc qua manifest.
- **Deploy (pha 6):** `deploy.sh release` → `release-gate.sh` đọc trạng thái CI của commit đã chụp (`gh`) + `review.json` + `git diff` từ commit đã chụp tới `HEAD` → cho chạy hoặc dừng.

## Tiêu chí xong (đo được)

1. Ba lượt CI liền nhau trên `main` xanh mọi job (`check`, `maps`, `integration`, `e2e`, `sast`), không có `retries`.
2. Bộ smoke có 9 luồng, 11 test (không tính `setup`), danh sách ở pha 4; tổng thời gian test do reporter in ≤ 360 s; mỗi shard ≤ 240 s; job `e2e` trên CI ≤ 10 phút; không còn test "did not run" (`maxFailures` bỏ).
3. Job `check` ≤ 12 phút và job `maps` ≤ 10 phút trên CI.
4. `pnpm content:check` (đã có audit) xanh trên `main`; audit toàn bộ 12 map chạy ≤ 60 s trên máy dev, một map ≤ 6 s (`pnpm world:quest-targets <map>`).
5. Thử đột biến nằm lại trong bộ test: test Node của audit chạy audit với một bộ chọn không có phần ưu tiên và phải nhận được phát hiện "`ev-olympic-bang` bị `ev-olympic-vom` chiếm" ở bước bảng đề của cả năm quest `wonder-olympic-*`. Thêm: gỡ thật phần ưu tiên ở `interactables.ts:139` trên máy (không commit) thì `pnpm content:check` đỏ đúng ca đó.
6. Trang review có mục "Màn hình trước deploy" với ≥ 18 màn × 2 khổ, mỗi ảnh kèm phát hiện của lần duyệt và ngày giờ, commit đã chụp.
7. Lần hiệu chỉnh (pha 7): với ba lỗi cài sẵn bằng CSS chèn lúc chụp (ẩn nút đóng panel sự kiện, đẩy đảo Home xuống, đặt nhãn Tương tác dưới thẻ nhiệm vụ), agent xem ảnh báo ít nhất hai trong ba ở mức `block`.
8. `tools/deploy/production/deploy.sh gate` in "chặn" khi CI của commit chưa xanh hoặc `review.json` cũ hay còn phát hiện `block`, và in "được" khi đủ điều kiện (thử cả hai trường hợp, chép kết quả vào report).
9. Mỗi test bị xóa có một dòng trong bảng phân loại (pha 1, pha 4): lý do và test Node thay thế (đường dẫn), hoặc ghi "không thay: cảm giác chơi, người sở hữu kiểm khi chơi".

## Rủi ro

| Rủi ro | Khả năng × Tác động | Giảm thiểu |
| --- | --- | --- |
| Xóa test đỏ làm mất dấu một lỗi thật (ví dụ chuyến xe không tới nơi, HUD iPad chồng lấn) | Cao × Cao | Pha 1 đọc trace từng test trước khi xóa; lỗi thật trên luồng smoke thì sửa ở pha 4, lỗi thật ngoài smoke vào `docs/project-roadmap.md` và trang review. |
| Audit lệch với game (viết lại luật) | Trung bình × Cao | Gọi đúng hàm thuần của game; thử đột biến nằm trong test. |
| Audit báo nhiều phát hiện trên nội dung có sẵn, chặn gate lâu | Trung bình × Trung bình | Sửa nội dung trong pha 3; ngoại lệ chỉ qua một bảng có lý do từng dòng (giống `NOT_INTERACTIVE` ở `tools/world/interaction-coverage.ts:27`). |
| Audit chậm làm `content:check` từ 2 s thành vài chục giây | Trung bình × Trung bình | Đo ở pha 3; quá 30 s thì tách thành bước `pnpm world:quest-targets` riêng ở CI và trong gate (câu hỏi mở 1). |
| Agent xem ảnh bỏ sót hoặc báo nhầm | Trung bình × Trung bình | Dữ kiện DOM đi kèm từng ảnh; so với ảnh lần duyệt trước; hiệu chỉnh với lỗi cài sẵn; người sở hữu vẫn chơi. |
| Hai phiên cùng sửa một file (`bosses`, `coop`, `pets`, `quest-api.ts`, `play.spec.ts`, UI Home và sự kiện, `deploy.sh`) | Cao × Trung bình | Bảng phối hợp dưới đây; `git status` + `git log -3 -- <file>` + đọc lại cả file ngay trước khi sửa; file đang bẩn của phiên khác thì nhắn phiên đó (SendMessage), không sửa đè. |
| Cổng deploy chặn bản vá gấp khi CI hỏng vì lý do ngoài code | Thấp × Cao | `MIU_RELEASE_FORCE="<lý do>"` cho qua và in lý do; production vẫn phải hỏi người trước mỗi lần. |
| Repo công khai phình vì PNG commit mỗi lần deploy | Trung bình × Thấp | Chụp `deviceScaleFactor: 1`, ghi đè cùng tên; câu hỏi mở 2. |
| Chạy chụp ảnh làm máy dev nặng | Trung bình × Trung bình | 1 worker; trước khi chạy kiểm `memory_pressure` và tiến trình nặng khác (`~/.claude/rules/process-management.md`); cổng cố định 4173/8787, bận thì tắt server cũ của chính mình. |

**Tương thích ngược:** lượt hằng đêm vẫn đặt `E2E_ALL_MAPS=1` để test mở map của bộ smoke mở mọi map (câu hỏi mở 7). Giữ tên lệnh `e2e`, `e2e:smoke`, `e2e:ci`; gate 5 lệnh trong `CLAUDE.md` giữ nguyên nếu audit nằm trong `content:check`. Luật "chỉ chạy E2E khi được yêu cầu" giữ nguyên: lượt chụp ảnh chạy như một bước của deploy, mà deploy production đã phải hỏi người.

**Hoàn tác:** mỗi pha là một hoặc vài commit riêng, `git revert` được độc lập. Test bị xóa lấy lại bằng `git show <commit>^:apps/web/e2e/<file>`; bảng phân loại ghi commit xóa. Cổng deploy tắt bằng `MIU_RELEASE_FORCE` hoặc revert pha 6.

## Phối hợp với phiên khác

| File | Ai đang sửa (07/10/2026 21:35) | Pha chạm | Cách làm |
| --- | --- | --- | --- |
| `apps/web/e2e/{bosses,coop,pets}.spec.ts`, `apps/web/e2e/quest-api.ts` | agent debug màn boss (thay đổi chưa commit) | 4 (cắt, chọn test giữ), 5 (đọc `quest-api.ts`) | Chờ agent đó commit; đọc lại file; chọn test boss giữ lại từ bản đã sửa. |
| `apps/web/e2e/play.spec.ts` | đang có thay đổi chưa commit (10 dòng) | 4 | Như trên. |
| `apps/web/src/ui/home/**`, `apps/web/src/ui/event/**`, `content/events/**` | phiên `miu-world-03` (UI Home, sự kiện) | 3 (sửa vị trí trong `content/events/*.json` nếu audit báo), 5 (chỉ đọc) | Nhắn `miu-world-03` trước khi sửa `content/events/*.json`. |
| `tools/deploy/production/deploy.sh` | phiên `miu-world-03` đang deploy | 6 | Chỉ sửa sau khi phiên đó deploy xong. |
| `docs/project-roadmap.md` | đang có thay đổi chưa commit | 7 | Đọc lại, thêm dòng, không đè. |
| `apps/web/playwright.slow.config.ts` | file chưa track của phiên khác (trỏ vào scratchpad) | không chạm | Không sửa, không xóa. |

Liên quan plan `261007-2038-mobile-app-ios-android` pha 5: định tạo `apps/web/e2e/mobile-layout.spec.ts` chụp các màn ở 390 × 844 và 360 × 800. Khi pha đó bắt đầu, nên mở rộng `screens.spec.ts` của plan này (thêm khổ màn) thay vì tạo spec chụp thứ hai.

## Câu hỏi mở (gửi Jev, kèm đề xuất mặc định)

1. **Chỗ chạy audit.** Mặc định: gọi trong `pnpm content:check` nếu toàn bộ ≤ 30 s trên máy dev, để gate 5 lệnh giữ nguyên; nếu lâu hơn, tách thành `pnpm world:quest-targets` và thêm vào gate trong `CLAUDE.md` cùng một bước CI riêng.
2. **Ảnh màn hình có commit không.** Mặc định: có, mỗi lần deploy ghi đè cùng tên ở `assets/generated/review/screens/` (khoảng 38 PNG ở tỉ lệ 1, vài MB), theo cách trang review đang làm với `generated/review/ui`. Phương án khác: giữ ảnh ngoài git, trang review chỉ hiện trên máy chụp.
3. **Cổng deploy cho staging.** Mặc định: chặn cả staging lẫn production, vì người sở hữu duyệt trên staging.
4. **Số luồng smoke.** Mặc định: 11 luồng, 13 test: bảy luồng đã nêu (đăng nhập, mở map, tương tác, xong quest, đánh boss, mua đồ, in phiếu) cộng bốn luồng (an toàn bản build vì repo công khai, dạng bài SGK bằng chạm vì phần học là lõi, chơi online cùng đội vì người sở hữu và bé chơi cùng nhau, Home trên điện thoại vì đúng kiểu lỗi đã gặp). Phương án gọn hơn: bỏ Home điện thoại và dạng bài SGK, còn 9 luồng, 11 test.
5. **Thú cưng, chat thoại, ghi âm.** Mặc định: bỏ khỏi bộ chặn deploy; phần server đã có test Node (`apps/server/src/multiplayer/voice-service.test.ts`, `apps/server/src/pet-care/pet-care-routes.test.ts`), phần cảm giác do người sở hữu kiểm khi chơi.
6. **Lỗi thật tìm thấy trong test bị bỏ.** Mặc định: ghi vào `docs/project-roadmap.md` và mục kiểm thử của trang review; chỉ sửa trong plan này khi lỗi nằm trên luồng smoke.
7. **Lượt E2E hằng đêm mở mọi map (`E2E_ALL_MAPS`).** Mặc định: bỏ, vì audit Node đã kiểm mọi map, mọi mục tiêu, mọi bến xe mỗi lần push.

## Validation Log

- 07/10/2026: hướng `smoke-plus-audits-and-screens` do Jev chọn (1,00), người sở hữu giao Jev quyết (`reports/jev-261007-2135-test-strategy-{input,output}.json`).
- 07/10/2026: bảy câu hỏi mở gửi Jev (`reports/jev-261007-2205-test-strategy-open-questions-{input,output}.json`); áp dụng cả lựa chọn có cờ escalate theo lệ của dự án:
  1. Audit mục tiêu quest: **trong `content:check`** khi cả audit ≤ 30 s (0,94; auto).
  2. Ảnh màn hình: **commit, ghi đè cùng tên**, tỉ lệ 1, có trong manifest (0,74; escalate).
  3. Cổng deploy: **áp cả staging lẫn production**, một `release-gate.sh`, có biến ép cho bản vá gấp (0,78; escalate).
  4. Bộ smoke: **9 luồng, 11 test** (bỏ E2E an toàn bản build vì `security:dist` đã kiểm, bỏ Home trên điện thoại vì phần chụp màn hình đã phủ) (0,82; auto).
  5. Thú cưng, chat thoại, ghi âm: **bỏ khỏi bộ chặn deploy** (0,86; auto).
  6. Lỗi thật trong test bị bỏ: **ghi vào roadmap và trang review, chỉ sửa trong plan này khi nằm trên luồng smoke** (0,60; escalate).
  7. E2E hằng đêm mở mọi map: **giữ** như lưới thêm (0,69; escalate).
