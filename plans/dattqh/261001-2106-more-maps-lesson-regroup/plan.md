# Thêm map, chia lại 71 bài SGK cho khỏi dồn vào 2 map

**Trạng thái:** xong phần tự động (02/10/2026): 9 phase và 7b–7e; gate 5 lệnh, web build, `e2e:ci` xanh; đã lên production (05/10/2026, bản `6b0bde86`); duyệt ảnh của người sở hữu chưa ghi nhận · **Tier:** XL · **Nhánh:** `main` · Quyết định: người sở hữu (01/10/2026, ba câu ở mục Quyết định)

## Kết quả mong muốn

Bé đang chơi thật. Hiện 71 bài dồn vào 2 map: Khu rừng bí mật 35 bài (toàn Tiếng Việt), Trường học 36 bài (toàn Toán). Sau đợt này:

- **8 map chơi được**, mỗi map 6–12 bài, ghép theo chủ điểm của sách. Map nào hợp cảnh thì có cả Toán lẫn Tiếng Việt.
- Mỗi map có cảnh, NPC dẫn đường, nhạc và vật thể riêng. Câu chuyện của bài kể đúng nơi bé đang đứng (không còn "rìa Khu rừng bí mật" khi bài đã sang Làng).
- **Mọi map mở từ đầu.** Bản đồ ghi mỗi khu học bài nào trong sách, để bé và phụ huynh tìm bài đang học trên lớp.
- Tiến độ của bé đang chơi giữ nguyên: id quest không đổi.
- Thêm map sau này (tập 2, Núi tuyết…) chỉ cần dữ liệu và một file generator nhỏ, không phải sửa các chỗ đang viết cứng 2 map.

- **Map rộng và sống như đời thật** (người sở hữu, 01/10/2026 22:55: "phải thật sinh động, có nhiều hoạt cảnh và có trải nghiệm thực tế như đời sống… làm rộng hơn nữa để các npc có những không gian đủ rộng để sinh hoạt và di chuyển"): map mới 256 × 48 × 256; Khu rừng và Trường học nới ra 256 × 256 ở phase 5. Mỗi map có đời sống riêng: ≥ 8–12 người sinh hoạt theo việc thật của nơi đó và 30–50 con vật, cộng hoạt cảnh theo nhóm (phase 7b). Lúc ghi (01/10): Khu rừng có 5 người và 56 con vật đi lại, Trường học chưa có ai.

- **Theo mock mới** (01/10/2026 23:15, ảnh ở `designs/the-gioi/` và `designs/<map>/`, quyết định Jev: `plans/dattqh/reports/jev-261001-2315-map-mocks.md`): Trường học là **map trung tâm** dựng như ảnh toàn cảnh (trường ở giữa, phố có đèn, quanh là các khu nhỏ Làng, Chợ, Nông trại, Rừng, Hồ, Bến tàu; núi ở rìa), cổng mỗi khu dẫn vào map riêng của chủ điểm; mỗi map có cổng về trung tâm. Cả 8 map làm theo phong cách mock. Bến tàu và hồ vào Làng Ven Sông, thác và cầu gỗ vào Khu rừng. Dàn người mỗi map lấy từ bảng NPC của mock, có dấu "!" ở nơi nhận nhiệm vụ.

Ngoài phạm vi: nội dung tập 2; Nhà của bé (trang trí) vẫn "Sắp có"; nhạc mới. Không có khóa map hay khóa bài (Master Plan §15 #33, đã làm trước đợt này).

## Quyết định

| Câu | Chọn | Nguồn |
| --- | --- | --- |
| Số map và cách chia | 8 map theo chủ điểm (bảng dưới) | Người sở hữu |
| Mở map | Mở hết từ đầu, bản đồ gợi ý thứ tự theo sách; bỏ hẳn khái niệm mở khóa | Người sở hữu |
| Hình dạng map mới | AI dựng từ asset trong manifest, người sở hữu duyệt ảnh `pnpm assets:preview` | Người sở hữu |

Khái niệm mở khóa đã bỏ hẳn trước đợt này (Master Plan §15 #33, §16 tiêu chí 8 đã đổi): map mới chỉ cần `status: "open"` là bé vào được.

## Chia bài

Chương trong một map được đánh số lại 1..n theo thứ tự của sách (riêng Khu rừng giữ ch1 là bài hướng dẫn).

| Map (region id) | Bài (file trong `content/quests/`) | Số bài | Hiện ở |
| --- | --- | --- | --- |
| Làng Ven Sông (`lang-ven-song`, mới) | TV chủ điểm 1 "Em lớn lên từng ngày": `tv2-t01-b01` … `tv2-t04-b08` | 8 | Rừng |
| Khu rừng bí mật (`khu-rung-bi-mat`) | `forest-ch1` + TV chủ điểm 3 "Niềm vui tuổi thơ": `tv2-t10-b17` … `tv2-t13-b24` | 9 | Rừng |
| Trường học (`truong-hoc`) | TV `tv2-t05-b09` … `tv2-t07-b14` + Toán chủ đề 1: `toan2-cd1-b01` … `b06` | 12 | Rừng + Trường |
| Thư viện (`thu-vien`, đang "v1") | TV `tv2-t08-b15`, `tv2-t08-b16`, `tv2-t09-on-giua-ki` + Toán chủ đề 6 (ngày giờ, lịch): `toan2-cd6-b29` … `b32` | 7 | Rừng + Trường |
| Xóm Mái Ấm (`xom-mai-am`, mới) | TV chủ điểm 4 "Mái ấm gia đình": `tv2-t14-b25` … `tv2-t17-b32` | 8 | Rừng |
| Chợ phiên (`cho-phien`, mới) | Toán chủ đề 2 (cộng trừ qua 10): `toan2-cd2-b07` … `b14` + chủ đề 3 (kg, lít): `toan2-cd3-b15` … `b18` | 12 | Trường |
| Nông trại (`nong-trai`, mới) | Toán chủ đề 4 (cộng trừ có nhớ): `toan2-cd4-b19` … `b24` | 6 | Trường |
| Lâu đài (`lau-dai`, đang "v1") | Toán chủ đề 5 (hình phẳng): `toan2-cd5-b25` … `b28` + chủ đề 7 (ôn HK1): `toan2-cd7-b33` … `b36` + `tv2-t18-on-cuoi-ki` | 9 | Trường + Rừng |
| | **Tổng** | **71** | |

## Hiện trạng (01/10/2026)

- Đặt mục tiêu lên map đã chạy bằng dữ liệu (`tools/world/chapters/place-quest-targets.ts`, `targets.json`, `looks.json`). Quy tắc rải bước (≥ 4 chỗ, ≤ 2 bước liền, NPC ≤ 2 bài, một hướng dẫn viên mỗi map) nằm trong `content:check`.
- Còn viết cứng 2 map ở: `packages/voxel/src/world-entities.ts` (`MAP_BY_REGION`), `apps/web/src/ui/sound/music.ts` (`REGION_MUSIC`), `tools/content/quest-spread.ts` (`MAP_GUIDES`), `tools/sgk/acceptance-page.ts` (chữ "Trường học/Khu rừng"), `apps/web/src/ui/play/play-screen.tsx` (mặc định rừng), `tools/world/generate-world-overview.ts` (đảo từng khu), `tools/assets/generated.json` (mỗi map một mục).
- Hai generator riêng: `generate-forest-map.ts` (493 dòng), `generate-school-map.ts` (382 dòng, mỗi chủ đề Toán một khu `ZONES`). Map 192 × 48 × 192, mỗi map khoảng 300 KB.
- Chữ trong bài nhắc nơi chốn: "rừng" 185 lần trong 29 bài TV, "trường" 127 lần trong bài Toán.
- Pack có sẵn đủ cho map mới: `kenney-castle-kit` (Lâu đài), `kenney-food-kit` (Chợ), `kenney-furniture-kit` (Thư viện, Xóm), `kenney-city-kit-suburban` (Làng, Xóm), `kenney-nature-kit` + `kenney-cube-pets` (Nông trại). Không cần pack mới.

## Phase

1. [x] **Khu vực bằng dữ liệu (M).** `content/world/regions.json` thêm cho mỗi khu: `map` (id map), `music` (mood có sẵn trong `MUSIC_MOODS`), `guide` (NPC dẫn đường), `book` (khoảng bài trong sách để hiện trên bản đồ); schema Zod trong `packages/schema`. Thay `MAP_BY_REGION`, `REGION_MUSIC`, `MAP_GUIDES`, chữ cứng trong `acceptance-page.ts` và mặc định ở `play-screen.tsx` bằng đọc từ catalog. `content:check` kiểm: mỗi region `open` có map đã sinh, guide có trong `targets.json`, mood tồn tại. Test cho từng chỗ thay.
2. [x] **Bộ khung generator dùng chung (M).** Tách phần chung của hai generator (địa hình nền, đường đi, khu theo chương, gọi `placeQuestTargets`, ghi `chunks.bin` + `entities.json`, điểm xuất phát, test "đứng được, đi tới được") sang `tools/world/map-kit.ts`. Rừng và Trường dùng lại bộ khung; map sinh ra cho nội dung hiện tại phải giống hệt trước khi tách (so sha256), để chắc không lệch. Mỗi map mới là một file nhỏ khai cảnh, khu, công trình. Kết quả: `tools/world/map-kit.ts` (block, địa hình nền `rollingHeight`/`heightField`/`fillColumn`, `scatterTrees`, `standHeight`, `mapModels` cho prop và scale, `placeRegionTargets`, `writeMap`/`runIfMain`) và `tools/world/map-checks.ts` (khớp bản commit, đứng trên mặt đất, mọi mục tiêu đi tới được từ điểm xuất phát — Khu rừng giờ cũng kiểm điều này); sha256 của `chunks.bin` và `entities.json` hai map giống hệt trước khi tách.
3. [x] **Bảng phân bài và phân vai (M).** Ghi bảng chia bài ở trên vào `plans/dattqh/260930-0846-sgk-lop2-game-content/story-map.md` (nguồn sự thật cho kịch bản). Mỗi map: một hướng dẫn viên, danh sách nơi chốn (khu) theo chương. Nhân vật quay lại giữa 2 bài phải ở cùng một map; nhân vật nào có 2 bài ở 2 map khác nhau thì giữ ở một bài, bài kia dùng NPC mới. `content:check` thêm luật: một NPC chỉ có mặt ở một map. Kết quả: mục "Chia lại 8 map" trong `story-map.md` (hướng dẫn viên, nhạc, chương/khu, 29 nhân vật đang ở nhiều map và bài nào giữ). Luật "một NPC một map" bật cùng lô cuối của phase 4 (bật sớm thì đỏ vì nội dung chưa chuyển); luật "không nhắc khu khác" của phase 4 đã bật (`checkRegionMentions`).
4. [x] **Viết lại bài theo nơi mới (XL, chia lô song song theo file).** Với từng bài chuyển map: đổi `region`, `chapter`; viết lại `summary`, `sevenQuestions.where`, lời dẫn `goTo`, hội thoại, `places` và bước `next` (bài tiếp theo trong sách ở map nào thì nói đúng tên map). Giữ nguyên 100% lời SGK, id quest và id các bước. Cố giữ id mục tiêu (`targets.json`) để manh mối bé đã tìm vẫn còn. `content:check` thêm luật: chữ trong bài không nhắc tên một khu vực khác, trừ bước `next` chỉ đúng map của bài kế. Mỗi lô một nhóm map, chỉ sửa file quest của nhóm đó; mục mới trong `targets.json` / `looks.json` / `emoji-props.json` gom và trộn ở phiên điều phối.
5. [x] **Dọn lại Khu rừng và Trường học (L).** Trường học thành map trung tâm 256 × 256 theo `designs/the-gioi/*-toan-canh-khu-vuc-256.png` và `designs/truong-hoc/v2-*` (trường ở giữa, giữ khung trường đã duyệt; phố, đèn, vạch qua đường; các khu nhỏ có cổng sang map của chủ điểm; tượng đài phun nước ở sân; phòng thư viện nhỏ trong nhà chính). Khu rừng nới 256 × 256, thêm vách đá có thác và cầu gỗ theo `designs/khu-rung-bi-mat/`. Rừng: còn ch1 + 8 bài, sắp lại các khu cho chương 2–9, bỏ chỗ trống của bài đã chuyển. Trường: `ZONES` theo 12 bài mới (lớp học, sân, góc vẽ… cho TV b9–14; khu ôn số cho Toán chủ đề 1). Sinh lại hai map, `pnpm assets:preview school` so với mock `designs/truong-hoc/` (khung trường giữ như mock đã duyệt).
6. [x] **Bốn map mới cảnh thôn quê (L mỗi map).** Bản đầu xong (01/10): `tools/world/zone-map.ts` + `generate-{lang-ven-song,xom-mai-am,cho-phien,nong-trai}-map.ts`, 256 × 256, test `zone-maps.test.ts` (khớp bản commit, đứng được, mọi mục tiêu đi tới được). Còn: làm lại phong cách theo mock, đời sống (7b), cổng (7c), mở rộng ×10 (7d). Làng Ven Sông (nhà, bến sông, cây đa, đường làng), Xóm Mái Ấm (nhà có sân, vườn, bếp, cửa sổ — hợp bài về bà, mẹ, bố), Chợ phiên (sạp hàng, cân, can, giỏ quả — hợp cộng trừ và kg/lít), Nông trại (chuồng, ruộng, đàn vật nuôi, kho thóc — hợp có nhớ khi đếm thu hoạch). Mỗi map: generator dùng `map-kit`, test, mục trong `generated.json`, ảnh preview cho người sở hữu duyệt.
7. [x] **Thư viện và Lâu đài (L mỗi map).** Bản đầu xong (01/10): `generate-thu-vien-map.ts`, `generate-lau-dai-map.ts`; còn phong cách theo mock. Thư viện: kệ sách, góc đọc, tháp đồng hồ và bảng lịch (Toán ngày giờ). Lâu đài: tường thành, sân hình khối, cầu thang tháp — sân ôn tập cuối kì là "thử thách" như Master Plan §4. Giữ trong ngân sách: ≤ 150 draw call ở mức Cao, kích thước map 256 × 48 × 256.
7b. [x] **Đời sống của mỗi map (L).** Kiểu sinh hoạt mới trong `apps/web/src/game/ambient/ambient-routines.ts` (+ `AmbientRoutine` trong `packages/voxel`, lời thoại trong kho câu nói) theo đúng nghề và việc của từng nơi: chèo đò, cấy lúa, thả diều, bán nước chè (Làng); rao hàng, mặc cả, gánh hàng (Chợ); vắt sữa, cho gà ăn, cày ruộng (Nông trại); nhảy dây, bảo vệ, lao công (Trường); nấu cơm, phơi đồ, tưới cây (Xóm); đọc sách, xếp sách (Thư viện); lính gác, thổi kèn (Lâu đài). Hoạt cảnh nhóm: hai, ba người cùng làm một việc, nói qua lại. Generator đặt chỗ làm việc của họ (tách phần chung của `forest-life.ts`), giữ khoảng cách với mục tiêu quest như ở rừng. Test: mỗi map ≥ 8 người, ≥ 30 con vật, mọi chỗ làm việc đứng được và đi tới được; đo draw call ở E2E mẫu.
7c. [x] **Cổng giữa các map (M).** Bước tới cổng của một khu ở map trung tâm thì vào map của khu đó (cùng luồng như chọn khu ở màn Khu vực, tiến độ theo server như cũ); mỗi map có cổng về trung tâm ở gần điểm xuất phát. Cổng hiện tên map và các bài trong sách. E2E: đi từ trung tâm sang một map và về.
7d. [x] **Map rộng gấp 10, tải lười (XL).** Người sở hữu 01/10 23:28 + Jev (`plans/dattqh/reports/jev-261001-2345-wide-maps.md`): mỗi map ~800 × 48 × 800. Dữ liệu map chia vùng 128 × 128 (file tĩnh trong manifest) + một lưới chân trời thô; game tải vùng gần trước, meshing/giải phóng chunk theo khoảng cách trong worker với ngân sách mỗi khung, chưa có vùng thì bé không rơi; prop gộp theo ô 64 × 64 hiện theo khoảng cách; dân làng, thú vật, mục tiêu ở xa thì ngủ. Đo: thời gian vào map, khung hình, bộ nhớ ở mẫu E2E mỗi map (mức Thấp/Vừa/Cao).
7e. [x] **Đi lại trong map rộng (M).** Bài học vẫn là quãng đi ngắn trong khu của chương; các khu ở các quận khác nhau. Xe đời thường giữa các quận (trạm xe buýt, bến đò, xe bò, xe đạp) và biển chỉ đường chạm để tới nơi đã đến; mũi tên nhiệm vụ chỉ đường tới bến/xe gần nhất khi đích ở quận khác.
8. [x] **Bản đồ thế giới, Home, màn Khu vực (M).** `generate-world-overview.ts` thêm đảo cho 4 khu mới, đổi Thư viện và Lâu đài thành đảo chơi được; sinh lại ảnh đảo Home (`pnpm assets:home`) và vùng nhấn. Thẻ khu vực hiện khoảng bài trong sách (ví dụ "Tiếng Việt bài 1–8"). Nếu chưa có, thêm lối "Học tiếp" ở Home tới bài chưa xong đầu tiên theo thứ tự sách, qua mọi map.
9. [x] **Kiểm, docs, phát hành (M).** Gate 5 lệnh + web build + `e2e:ci`; sửa E2E đang chỉ theo map cũ (`sgk-content`, `school`, `wayfinding`, `forest-life`, `quest-api.ts`); `pnpm security:dist`. Thêm một mẫu E2E cho mỗi map mới (vào map, gặp hướng dẫn viên, nhận một bài). Docs: Master Plan §4 (bảng khu vực) và §15 #33, §16 tiêu chí 8; `docs/project-roadmap.md`; `CLAUDE.md` (câu "Hai map chơi được…" và lệnh `world:*`); trang review có ảnh 8 map và số liệu hiệu năng. Deploy staging rồi production: **hỏi người trước**; sao lưu database production trước khi deploy dù đợt này không đổi schema.

Kết quả (02/10/2026):

- 5: Trường học 800 × 800 là map trung tâm, khung trường đã duyệt đặt ở giữa, 4 khu theo chương, 7 cổng sang 7 map, xe buýt giữa các quận. Khu rừng 800 × 800: góc chương 1 giữ nguyên, 4 bãi rừng cho chương 2–5, vách đá có thác, cổng về trường, tàu rừng tới từng bãi.
- 6, 7: sáu map chủ điểm dựng bằng `tools/world/zone-map.ts` (khu theo chương, đường có cầu ván qua nước, cổng, bến xe, `life`), mỗi map 800 × 800, test `zone-maps.test.ts`.
- 7b: 20 nghề và 4 vật nuôi (`everyday-routines.ts`), đặt bằng `tools/world/village-life.ts`. Số đếm: Trường học 68 người, 35 con vật; Khu rừng 33 người, 140 con vật; Làng 45/51; Xóm 39/35; Chợ 58/34; Nông trại 28/43; Thư viện 33/36; Lâu đài 43/32. Test `expectLively` (≥ 8 người, ≥ 30 con vật mỗi map). Hoạt cảnh nhóm là các nhóm cùng nghề đứng quanh một nơi (`crowd`); chưa có lời nói qua lại giữa hai người.
- 7c: cổng (`travel`) ở trung tâm và ở mỗi map; E2E `maps` đi trung tâm → Chợ phiên → về.
- 7d: vùng 128 × 128 + `horizon.bin`, worker meshing theo mảnh 32 × 32 gần trước, prop theo ô 128, vùng chưa tải là tường; chân trời tắt ở mức Thấp. Draw call ≤ 150 ở mẫu E2E mỗi map. Chưa đo thời gian vào map và bộ nhớ trên iPad (DEVICE-01; project `perf` không chạy khi chưa được yêu cầu).
- 7e: bài bắt đầu ở mép khu của chương (`chapterSpawns`), nên đích luôn gần; bến xe/đò/tàu (`ride`) nối điểm xuất phát với từng quận và về. Biển chỉ đường chạm để tới nơi đã đến chưa làm.
- 8: 11 đảo trên ảnh toàn cảnh, trường ở giữa có cầu sang các đảo; nhãn theo lưới 3 cột để không thẻ nào che thẻ khác trên điện thoại và iPad; thẻ khu vực ghi bài trong sách; ảnh nền màn Khu vực cho cả 8 map.
- 9: `e2e:ci` 72 đạt, 2 bỏ qua (quay video, ảnh review), 279 s.

Phụ thuộc: 1 → 2 → (3 → 4) song song được với (5, 6, 7) sau khi bảng phân bài của 3 xong; 7d (tải lười) trước khi phóng map lên 800; phong cách theo mock, 7b, 7c, 7e làm trên map 800; 8 sau 6, 7; 9 cuối.

## Rủi ro

| Rủi ro | Giảm thiểu |
| --- | --- |
| Bé đang dở một bài bị chuyển map | Id quest và id bước giữ nguyên; tiến độ ở server không đổi. Vào lại bài thì bé xuất hiện ở điểm xuất phát của map mới. Nếu id mục tiêu buộc phải đổi, manh mối đã tìm của bài đó mất (bé tìm lại); ghi vào ghi chú phát hành |
| Viết lại 60 bài làm lệch lời SGK | Kiểm kê SGK trong `content:check` vẫn chạy; lô viết chỉ được sửa phần kể chuyện |
| Hai generator đổi kết quả khi tách bộ khung | So sha256 map trước và sau phase 2 |
| Hiệu năng và dung lượng tăng theo số map | Mỗi lần chỉ tải một map; đo draw call trong E2E mẫu từng map; manifest thêm khoảng 6 × 300 KB |
| Map dựng không đẹp (không có mock) | Ảnh preview từng map trên trang review để người sở hữu duyệt trước khi deploy; sửa theo góp ý |

## Nghiệm thu

- [ ] Mỗi map ~800 × 800 (gấp 10 diện tích), tải lười theo vùng, chân trời thô; vào map và khung hình trong ngân sách ở mức Thấp; ≥ 8 người và ≥ 30 con vật sinh hoạt mỗi quận. — Đã có: 800 × 800, tải lười, chân trời, draw call trong ngân sách ở E2E; số người và vật đếm theo map (mục 7b), chưa đủ mỗi quận; khung hình trên iPad chờ DEVICE-01.
- [x] 8 map chơi được, mỗi map đúng các bài ở bảng chia; `content:check` xanh với các luật mới (map tồn tại, NPC một map, không nhắc khu khác).
- [x] `pnpm content:spread` = 0 vi phạm trên cả 8 map.
- [x] Không câu SGK nào đổi; id 71 quest giữ nguyên.
- [x] Không còn chỗ viết cứng id khu vực trong code (grep `khu-rung-bi-mat` / `truong-hoc` chỉ còn trong dữ liệu, test và generator của chính map đó).
- [x] Gate 5 lệnh + web build + `e2e:ci` xanh trong 480 s; draw call ≤ 150 ở mẫu E2E của mỗi map.
- [ ] Ảnh preview từng map đặt cạnh khung mock tương ứng trên trang review; người sở hữu duyệt.
- [x] Map trung tâm có cổng sang 7 map kia, mỗi map có cổng về.

## Câu hỏi còn mở

- Bé đang chơi thật đã hoàn thành trọn một bài chưa? Nếu rồi thì đánh dấu tiêu chí §16 "một bé chơi thử hoàn thành một quest" (cùng phase 9).
