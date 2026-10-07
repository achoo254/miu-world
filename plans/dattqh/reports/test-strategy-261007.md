# Đổi chiến lược kiểm thử: smoke chặn deploy, audit mục tiêu quest, ảnh màn hình AI duyệt (07/10/2026)

Plan: `plans/dattqh/261007-2135-test-strategy-smoke-audits-screens/`. Cả 7 pha xong trên `main`, không tạo nhánh hay worktree, không deploy.

## Kết quả chính

- CI trên `main` xanh trở lại sau 6 ngày đỏ liên tục: ba lượt liền xanh mọi job, không bật `retries`.
- E2E nay là bộ smoke gồm 9 luồng, 11 test, chạy trên 2 máy. Mỗi máy mất khoảng 2–3 phút; trước đây là 4 máy, 483–868 s mỗi máy, và 22–26 test đỏ mỗi lượt.
- `content:check` có thêm audit mục tiêu quest. Audit đi qua 12 map trong khoảng 25 s và tìm ra 14 lỗi thật, đã sửa hết. Thử đột biến bắt đúng ca bảng đề bị vòm chiếm nút.
- Trước mỗi lần deploy, 19 màn được chụp ở 2 khổ (38 ảnh) và agent xem từng ảnh. Lần đầu tìm ra 8 phát hiện mức chặn từ 5 nguyên nhân; tất cả đã sửa. Lần hiệu chỉnh với 3 lỗi cài sẵn: agent bắt đủ 3/3 ở mức chặn.
- `deploy.sh release` của staging và production nay đi qua cổng release. Đã thử 7 trường hợp; trường hợp hợp lệ cho kết quả "được".

## Pha 1: phân loại test đỏ

Bảng đầy đủ nằm ở `plans/dattqh/reports/test-triage-261007-2221.md`. Bảng lấy dữ liệu từ log của 4 lượt CI và trace của lượt `37630093033`. Có 2 test được chạy lại trên máy dev: `sgk-mechanics:129` và `home:112`, cả hai qua trên máy dev.

- **Test cũ:** thẻ nhiệm vụ tự gập sau 12 s, nên `home:10`, `mvp-loop`, `hud-layout` ×2 không còn thấy phần tử của thẻ. Nhân vật làm động tác vui khi đổi đồ, nên `creator:28` thấy động tác khác cái test chờ.
- **Môi trường CI:** GL phần mềm chạy khoảng 6–10 khung/giây, và game kẹp bước thời gian ở 0,1 s mỗi khung. Vì vậy chuyến xe trong `maps:147` và `:176`, và lượt đi bộ trong `play:96`, chậm gần gấp đôi so với đồng hồ thật. Có thêm vài lần trình duyệt treo (`play:219`, `forest-life`, `sgk-content:67`, `interactions:88`, `online`, `coop:160`) và lỗi cuộn bằng thao tác vuốt giả của CDP (`sgk-mechanics:129`).
- **Chập chờn:** `pets`, vì nút chăm sóc chỉ hiện khi thú chạy tới kịp.
- **Lỗi thật ngoài smoke:** nhà của bé có đèn và TV bật vẽ 154–155 draw call, vượt ngân sách 150. Lỗi này đã ghi vào roadmap.
- **Unit test của job `check`:** cả 4 test đỏ vì thời gian. Hướng xử lý ở pha 2.

## Pha 2: job `check` xanh

- `outland-plan.test.ts` nay lấy lần nhanh nhất trong 5 lần đo; ngân sách giữ nguyên 200 ms. Test vẽ mọi trạng thái của minigame khai timeout 20 s, có ghi lý do.
- Ba test sinh lại cả map được tách thành project vitest `maps`, chạy ở job CI `maps` riêng, từng file một. `pnpm test` trên máy dev vẫn chạy cả ba project. Job `maps` chạy cục bộ: 4 file, 63 test, 101 s.
- **Lệch plan:** sinh rừng mất 54 s trên máy dev khi chạy một mình, và 89–146 s trên máy CI (lượt `37644473207` đỏ vì vượt 120 s). Chia job không giúp được, vì file này vốn đã chạy một mình. Tôi nâng giới hạn `beforeAll` của riêng test rừng lên 240 s, có comment ghi số đo (7220a27d). Giới hạn này chỉ để chặn test treo, không phải ngân sách hiệu năng.

## Pha 3: audit mục tiêu quest

- Code nằm ở `tools/world/quest-target-audit.ts` và file test cùng tên. Lệnh là `pnpm world:quest-targets [<map>…]`, và `content:check` gọi audit này ở cuối `main()`.
- Audit gọi đúng các hàm của game: `pickNearest`, `hintTarget`, `sniffTargets`, `stepForTarget`, `worldState`, `castHidden`, `entitiesForChapter`. Lưới đi được lấy từ `loadMapGrid` sẵn có.
- **Thời gian:** cả 12 map mất 25 s, một map 2,7 s (`forest-ch1`), và toàn bộ `content:check` mất 26–29 s.
- **Tăng tốc:** trong `loadMapGrid`, ô của prop nay tra bằng chỉ số số thay vì chuỗi. Bước này tiết kiệm khoảng 1 s mỗi map, và các export giữ nguyên.
- **Bằng chứng bắt ca bảng đề và vòm:** test `quest-target-audit.test.ts` chạy audit trên `forest-ch1` với một bộ chọn không ưu tiên gì. Bộ chọn đó cho ra phát hiện "`ev-olympic-bang` bị `ev-olympic-vom` chiếm" ở bước bảng đề của cả 5 quest: `gom-hat`, `lon-hon-40`, `xep-hop`, `chan-le`, `noi-diem`. Với `pickNearest` thật thì không còn phát hiện nào.
- **Thử đột biến trên máy (không commit):** tôi gỡ cả hai phần ưu tiên trong `pickNearest`. `pnpm content:check` đỏ với 196 phát hiện, trong đó có dòng `map forest-ch1: quest wonder-olympic-arithmetic step gom-hat: stolen: the Interact prompt shows ev-olympic-vom (Vòm Cổng Olympic Toán) instead of ev-olympic-bang (Bảng đề của cổng) at 3 of 21 spots within its radius`. File được trả nguyên, `git diff --quiet` sạch.
- **Lỗi thật audit tìm ra, đã sửa:**
  1. 12 chỗ trên 5 map: đồ thứ hai hoặc thứ ba của một bước tìm bị nhân vật đứng cạnh chiếm nút Tương tác. Ví dụ "Phong bì xanh" bị Chó Mực chiếm ở 3/13 chỗ đứng. Nguyên nhân là phần ưu tiên chỉ che chở cho mục tiêu mà mũi tên chỉ. Cách sửa: `pickNearest` ưu tiên mọi đồ mà bước còn chờ, và `game.ts` truyền danh sách đó (cũng là danh sách thú cưng đánh hơi).
  2. Hai món của bài `tv2-t08-b16` ở Thư viện nằm trong ô của tảng `rock_largeA`: Nhánh cỏ dại ở 190,13,559 và Cánh buồm lớn ở 178,12,562. Đây là lỗi "chìm nửa trong khối". Cách sửa: thêm `keepOut` quanh 3 tảng đá trong `generate-thu-vien-map.ts`, rồi sinh lại map Thư viện. Khối không đổi; nhiều mục tiêu dời chỗ vì bộ đặt chỗ có seed. Sau khi sinh lại, ba audit cảnh vật và audit mục tiêu đều sạch. Route bot của map được sinh lại; phiên `miu-world-03` đồng ý.

## Pha 4: bộ smoke

Đây là 9 luồng, 11 test (chưa tính `setup`):

| Luồng | Test |
| --- | --- |
| Đăng nhập tới chơi | `account-flow` |
| Mở map, qua cổng | `maps` (Trung tâm; lượt hằng đêm mở mọi map) |
| Đi qua cổng | `maps` (cổng Trung tâm ↔ đảo) |
| Tương tác | `play` (vẹt) |
| Xong quest, nhận thưởng | `quest-flow` ×2 (thêm ngân sách draw-call ở chỗ xuất hiện trong rừng) |
| Dạng bài SGK bằng chạm | `sgk-mechanics` |
| Đánh trùm tới thưởng | `bosses` |
| Mua đồ, mặc | `shop` (mới) |
| In phiếu | `worksheets` |
| Chơi cùng đội | `coop` |

- Trên máy dev, `e2e:smoke` chạy 11 test + `setup`, xanh hết, mất 82 s.
- Mỗi spec bị xóa đều có test Node thay thế hoặc lý do, ghi ở bảng của `phase-04-smoke-suite.md` và trong triage. Các test thay thế đã kiểm là có thật:
  - `content-security-policy.test.ts`
  - `vite-repo-assets.test.ts`
  - `quest-routes.test.ts:281`, `:345`, `:643`
  - `home-screens.test.tsx:184`, `:220`
  - `pick-fresh.test.ts`
  - `npc-routes.test.ts`
  - `tv2-quests.test.ts:29`, `toan2-quests.test.ts:21`
- Đã xóa 17 spec cùng `fake-voice.ts`. Ảnh review do các spec đã xóa sinh ra vẫn giữ; trường `generator` ghi spec đã gỡ.

**Bảng giữ, chuyển, xóa:**

| Spec (số test) | Quyết định |
| --- | --- |
| account-flow (1) | giữ |
| maps (13) | giữ 2 |
| play (22) | giữ 1 |
| quest-flow (3) | giữ 2 |
| sgk-mechanics (3) | giữ 1 |
| bosses (9) | giữ 1 |
| coop (4) | giữ 1 |
| worksheets (1) | giữ |
| shop | mới |
| autowalk, challenges, creator, forest-life, home, hud-layout, interactions, mvp-loop, npc-stories, online, pets, rescue, school, sgk-content, speak, voice, wayfinding | xóa; thay thế ở bảng pha 4 và triage |
| perf | giữ, chạy tay |
| screens | mới, chạy tay |

## Pha 5: ảnh màn hình và agent xem ảnh

- **Lệnh:** `pnpm --filter @miu/web screens` chụp 19 màn × 2 khổ, mất khoảng 1,1–1,2 phút trên máy dev.
- **Dữ kiện DOM:** do `apps/web/e2e/layout.ts` thu lúc chụp.
- **Thủ tục:** viết ở `docs/screen-review.md`; mục "Màn hình trước deploy" đã có trên trang review.
- **Chụp từ cây export:** ảnh chuẩn chụp từ cây export sạch (`git archive`, `MIU_SCREENS_COMMIT`). Lý do: thư mục làm việc có code server dở của phiên khác.
- **Dung lượng:** ảnh commit ghi đè cùng tên, khoảng 9,3 MB cho 38 ảnh, nhiều hơn mức "vài MB" mà plan ước.

**Lần duyệt 1** (ảnh ở dc806b4f, 4 subagent): 8 phát hiện `block` từ 5 nguyên nhân, cộng các `note`.
1. Bước chọn loài khi đổi nhân vật không có đường về (`03-creator`, cả hai khổ). Đã sửa (817af222): thêm "Về trang chủ" khi người chơi đã có nhân vật; có test.
2. Lời kể "Cổng đá… mở ra" đè lên nút "Tiếp" và các thẻ của màn thưởng (`11-reward`, cả hai khổ). Đã sửa (817af222): khi đang mở modal, toast hiện ở đầu màn.
3. Trên điện thoại, nút nổi "Quay lại game" đè lên panel sự kiện, nút Kiểm tra của màn luyện tập Olympic, và thẻ hàng trong cửa hàng (`12`, `13`, `15` khổ 360). Đã sửa (817af222): nút này ẩn khi đang mở modal.
4. Khung tổ đội che nhãn "Bông · Tương tác" (`18-party` khổ 360). Tôi hạ xuống `note`: nhãn gắn theo vị trí trong thế giới 3D, trôi theo camera và đi qua dưới HUD; nút Tương tác vẫn hiện và chạm được.
5. Ảnh `17-pet-care` chụp lúc bảng còn "Đang gọi thú cưng…", và màn thưởng chụp lúc số XP chưa đếm xong. Cả hai là lỗi của lúc chụp, không phải lỗi game; đã sửa spec để chờ trạng thái (f7a88d13).

**Lần duyệt 2** (ảnh ở 2db95483): các `block` cũ đã hết. Có thêm một `block` mới ở `17-pet-care` khổ 360: nút ✕ che chữ cuối của tiêu đề "Chăm sóc Mèo xám". Đã sửa (377bf69a): tiêu đề của mọi scene có nút ✕ ở góc chừa chỗ cho nút. Lần duyệt 3 (ảnh ở 4198f339) xác nhận lỗi đã hết. Còn một `note`: hàng nút cuối lòi quá mép dưới 4 px, bảng vẫn cuộn được.

**Ảnh chuẩn cuối:** chụp ở e13d7281, 38/38 màn, không có file chưa commit. So từng điểm ảnh với lần đã duyệt: 37 ảnh khác dưới 2,1 % (cảnh 3D, lời thoại xoay vòng). Riêng `360x740/16-backpack` khác 16 %; tôi tự xem lại, bố cục và nội dung giống lần đã duyệt.

**`review.json`:** `verdict: pass`, 32 phát hiện. Trong đó có 8 `block`, cả 8 đã có `fixedIn`; còn lại là 24 `note` hiện trên trang review. Commit 66401bc5.

**Hiệu chỉnh** (cây export có 3 lỗi cài bằng CSS, không commit; agent không được báo trước):
- Kết quả: agent báo đủ 3/3 lỗi ở mức `block`, gồm 8 phát hiện trên 6 ảnh: đảo Home tụt xuống đè thẻ sự kiện, nút Tương tác đè thẻ nhiệm vụ, panel Olympic mất nút đóng.
- Lần đầu chụp hiệu chỉnh thiếu ảnh panel sự kiện, vì đảo bị đẩy xuống che banner. Tôi đổi sang chỉ cài lỗi ở màn Home rồi chụp lại.
- Lỗ hổng tìm được: `missingClose` của dữ kiện DOM không bắt nút đóng bị ẩn, vì vẫn đếm nút còn trong DOM. Đã sửa (4198f339), và chạy lại hiệu chỉnh thì dữ kiện báo `[data-id="event-panel"]` ở cả hai khổ.

## Pha 6: cổng deploy

- **Thành phần:** `tools/deploy/release-gate.sh`, được hai `deploy.sh` source. Có lệnh mới `deploy.sh gate`, không cần credential và không chạm máy chủ. `release` gọi cổng trước khi build.
- **Ép cổng:** `MIU_RELEASE_FORCE="<lý do>"` cho qua, in lý do và ghi `RELEASE_FORCED` cạnh `REVISION` trong bản release.
- **Kiểm tĩnh:** `bash -n` sạch. `shellcheck -x` sạch cho phần mới; các cảnh báo cũ của `deploy.sh` không đổi.
- Đã báo phiên `miu-world-03` bằng SendMessage.

Kết quả thử:

| Trường hợp | Lệnh | Kết quả |
| --- | --- | --- |
| Ảnh đã duyệt, CI của e13d7281 xanh (lượt `37649413000`), sau đó chỉ commit ảnh (66401bc5) | `production/deploy.sh gate` và `staging/deploy.sh gate` | `được: ảnh chụp ở e13d7281 đã duyệt (không còn block), code không đổi từ đó, CI xanh: …/runs/37649413000`, exit 0 |
| CI của commit đã chụp đang chạy | `production/deploy.sh gate` | `chặn: CI của e13d7281 đang chạy (in_progress): …/runs/37649413000`, exit 1 |
| `verdict: fail` (sửa tạm, đã trả) | `staging/deploy.sh gate` | `chặn: lần duyệt ảnh ở e13d7281 kết luận 'fail', còn 1 phát hiện block chưa sửa`, exit 1 |
| Ảnh chụp ở 377bf69a, sau đó code đổi (sửa tạm, đã trả) | `production/deploy.sh gate` | `chặn: ảnh đã cũ: chụp ở 377bf69a, sau đó đã đổi 2 file ngoài ảnh, manifest, plans, docs; chụp và duyệt lại`, exit 1 |
| Commit có CI đỏ (471ac689), cây export | `MIU_RELEASE_REV=471ac689 production/deploy.sh gate` | `chặn: CI đỏ ở 471ac689 (failure): …/runs/37630093033`, exit 1 |
| Cây export khác commit đã chụp | `MIU_RELEASE_REV=e13d7281 staging/deploy.sh gate` | `chặn: ảnh chụp ở 5e543f4f, cây export là 'e13d7281'; chụp từ chính commit đó`, exit 1 |
| Ép | `MIU_RELEASE_FORCE=… staging/deploy.sh gate` | `được (ép): bỏ qua cổng release vì: …`, exit 0 |

Ghi chú: 5e543f4f (commit plan gợi ý cho trường hợp CI đỏ) không có lượt CI riêng, vì được push cùng commit sau. Cổng báo đúng "CI chưa chạy cho 5e543f4f", nên tôi dùng 471ac689.

## Pha 7: số liệu CI

| Lượt | Commit | check | maps | integration | e2e 1/2 (reporter) | e2e 2/2 (reporter) | sast |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `37646660192` | dc806b4f | 10 phút 53 giây | 7 phút 35 giây | 1 phút 50 giây | 3 phút 50 giây (154 s, 7 test) | 3 phút 05 giây (110 s, 6 test) | 1 phút 15 giây |
| `37647650517` | 2db95483 | 10 phút 55 giây | 7 phút 47 giây | 1 phút 48 giây | 3 phút 28 giây (147 s) | 3 phút 48 giây (164 s) | 1 phút 06 giây |
| `37648484294` | 377bf69a | 8 phút 48 giây | 7 phút 50 giây | 1 phút 47 giây | 3 phút 29 giây (147 s) | 3 phút 45 giây (157 s) | 1 phút 09 giây |

Lượt thứ tư `37649413000` (e13d7281, commit đã chụp) cũng xanh mọi job; lượt của 4198f339 và 66401bc5 còn chạy lúc viết report.

Số test của reporter tính cả `setup` ở mỗi shard: 11 test smoke cộng 2 lần `setup`, không có test "did not run". Tổng thời gian test mỗi lượt là 264 s, 311 s và 304 s, đều dưới ngân sách 360 s. Mỗi shard dưới 240 s. Mỗi job `e2e` dưới 4 phút, `check` dưới 11 phút, `maps` dưới 8 phút.

Các lượt đỏ trên đường tới đó, và đã xử lý thế nào:

| Lượt | Lỗi | Xử lý |
| --- | --- | --- |
| `37642185213` | `maps`: rừng chạy song song quá 120 s | chạy từng file một |
| `37642929567` | `integration`: `apps/server/src/coop/party-quest.test.ts` chập chờn trên Postgres | đã báo `miu-world-03`; phiên đó sửa ở df9b35a2 |
| `37644473207` | `maps`: rừng quá 120 s trên máy CI chậm | giới hạn 240 s |
| `37646333006` | `check`: lint `no-control-regex` trong `screens.spec.ts` | đã sửa |

## Lỗi thật tìm thấy

1. **Đã sửa:** đồ của bước tìm bị nhân vật chiếm nút Tương tác, 12 chỗ trên 5 map. Tìm ra bằng audit.
2. **Đã sửa:** hai món bài Thư viện nằm trong tảng đá. Tìm ra bằng audit.
3. **Đã sửa:** màn đổi nhân vật không có đường về Home. Tìm ra bằng ảnh.
4. **Đã sửa:** lời kể đè nút Tiếp ở màn thưởng. Tìm ra bằng ảnh.
5. **Đã sửa:** nút "Quay lại game" đè nội dung panel trên điện thoại. Tìm ra bằng ảnh.
6. **Đã sửa:** nút ✕ che tiêu đề bảng chăm thú trên điện thoại. Tìm ra bằng ảnh.
7. **Chưa sửa, đã ghi roadmap:** nhà của bé có đèn và TV bật vượt ngân sách draw-call (154–155 / 150). Tìm ra bằng triage.
8. **Chưa sửa, đã ghi roadmap:** bàn phím số của câu đố trên điện thoại xén mất hàng có số 0. Tìm ra bằng ảnh.
9. **Ghi chú trên trang review, để người duyệt xem:**
   - Tên chương bị cắt "…" trên khổ 360.
   - Màn khu vực và Home trên điện thoại đẩy nút chính xuống dưới khung đầu.
   - Nhãn khu trên đảo chen nhau ở khổ 360.
   - Hộp thoại NPC không có nút bỏ qua.
   - Tiêu đề màn tạo nhân vật gọi người chơi là "bé".

## Chưa làm, hay cần người xem

- **Cảnh báo cổng khi deploy:** thư mục làm việc vẫn có code dở của phiên khác (`apps/server/src/multiplayer/**`, `server.ts`). `release` trên cây làm việc tự chặn vì cây không sạch, như trước. Deploy từ cây export thì đặt `MIU_RELEASE_REV` là sha của commit đã chụp.
- **Lượt hằng đêm** (`E2E_ALL_MAPS`) chưa chạy kể từ khi đổi bộ smoke. Lượt đó mở cả 10 map ở test mở map, và có thể đỏ vì ngân sách draw-call ở map nặng. Lượt này không chặn deploy, vì cổng chỉ hỏi CI của commit đã chụp.
- **Nút "Về trang chủ" ở màn đổi nhân vật** là liên kết dạng nút ghost nhỏ. Subagent ghi `note` rằng khó nhận ra là nút; tôi chưa đổi kiểu.
- **Dung lượng ảnh:** 9,3 MB mỗi lần chụp, ghi đè cùng tên. Lịch sử git vẫn tăng thêm chừng đó mỗi lần deploy.
- **Cổng E2E:** có ba lượt chụp (lượt chụp ở 4198f339, lượt chụp cuối ở e13d7281, và một lượt hiệu chỉnh) tôi chạy mà quên nhắn `miu-world-03` "giữ cổng". Các lượt đó ngắn, và tôi đã kiểm cổng trống trước khi chạy.
