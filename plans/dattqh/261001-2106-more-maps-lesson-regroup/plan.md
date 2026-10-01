# Thêm map, chia lại 71 bài SGK cho khỏi dồn vào 2 map

**Trạng thái:** đang làm (phase 1 xong) · **Tier:** XL · **Nhánh:** `main` · Quyết định: người sở hữu (01/10/2026, ba câu ở mục Quyết định)

## Kết quả mong muốn

Bé đang chơi thật. Hiện 71 bài dồn vào 2 map: Khu rừng bí mật 35 bài (toàn Tiếng Việt), Trường học 36 bài (toàn Toán). Sau đợt này:

- **8 map chơi được**, mỗi map 6–12 bài, ghép theo chủ điểm của sách. Map nào hợp cảnh thì có cả Toán lẫn Tiếng Việt.
- Mỗi map có cảnh, NPC dẫn đường, nhạc và vật thể riêng. Câu chuyện của bài kể đúng nơi bé đang đứng (không còn "rìa Khu rừng bí mật" khi bài đã sang Làng).
- **Mọi map mở từ đầu.** Bản đồ ghi mỗi khu học bài nào trong sách, để bé và phụ huynh tìm bài đang học trên lớp.
- Tiến độ của bé đang chơi giữ nguyên: id quest không đổi.
- Thêm map sau này (tập 2, Núi tuyết…) chỉ cần dữ liệu và một file generator nhỏ, không phải sửa các chỗ đang viết cứng 2 map.

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
2. **Bộ khung generator dùng chung (M).** Tách phần chung của hai generator (địa hình nền, đường đi, khu theo chương, gọi `placeQuestTargets`, ghi `chunks.bin` + `entities.json`, điểm xuất phát, test "đứng được, đi tới được") sang `tools/world/map-kit.ts`. Rừng và Trường dùng lại bộ khung; map sinh ra cho nội dung hiện tại phải giống hệt trước khi tách (so sha256), để chắc không lệch. Mỗi map mới là một file nhỏ khai cảnh, khu, công trình.
3. **Bảng phân bài và phân vai (M).** Ghi bảng chia bài ở trên vào `plans/dattqh/260930-0846-sgk-lop2-game-content/story-map.md` (nguồn sự thật cho kịch bản). Mỗi map: một hướng dẫn viên, danh sách nơi chốn (khu) theo chương. Nhân vật quay lại giữa 2 bài phải ở cùng một map; nhân vật nào có 2 bài ở 2 map khác nhau thì giữ ở một bài, bài kia dùng NPC mới. `content:check` thêm luật: một NPC chỉ có mặt ở một map.
4. **Viết lại bài theo nơi mới (XL, chia lô song song theo file).** Với từng bài chuyển map: đổi `region`, `chapter`; viết lại `summary`, `sevenQuestions.where`, lời dẫn `goTo`, hội thoại, `places` và bước `next` (bài tiếp theo trong sách ở map nào thì nói đúng tên map). Giữ nguyên 100% lời SGK, id quest và id các bước. Cố giữ id mục tiêu (`targets.json`) để manh mối bé đã tìm vẫn còn. `content:check` thêm luật: chữ trong bài không nhắc tên một khu vực khác, trừ bước `next` chỉ đúng map của bài kế. Mỗi lô một nhóm map, chỉ sửa file quest của nhóm đó; mục mới trong `targets.json` / `looks.json` / `emoji-props.json` gom và trộn ở phiên điều phối.
5. **Dọn lại Khu rừng và Trường học (M).** Rừng: còn ch1 + 8 bài, sắp lại các khu cho chương 2–9, bỏ chỗ trống của bài đã chuyển. Trường: `ZONES` theo 12 bài mới (lớp học, sân, góc vẽ… cho TV b9–14; khu ôn số cho Toán chủ đề 1). Sinh lại hai map, `pnpm assets:preview school` so với mock `designs/truong-hoc/` (khung trường giữ như mock đã duyệt).
6. **Bốn map mới cảnh thôn quê (L mỗi map).** Làng Ven Sông (nhà, bến sông, cây đa, đường làng), Xóm Mái Ấm (nhà có sân, vườn, bếp, cửa sổ — hợp bài về bà, mẹ, bố), Chợ phiên (sạp hàng, cân, can, giỏ quả — hợp cộng trừ và kg/lít), Nông trại (chuồng, ruộng, đàn vật nuôi, kho thóc — hợp có nhớ khi đếm thu hoạch). Mỗi map: generator dùng `map-kit`, test, mục trong `generated.json`, ảnh preview cho người sở hữu duyệt.
7. **Thư viện và Lâu đài (L mỗi map).** Thư viện: kệ sách, góc đọc, tháp đồng hồ và bảng lịch (Toán ngày giờ). Lâu đài: tường thành, sân hình khối, cầu thang tháp — sân ôn tập cuối kì là "thử thách" như Master Plan §4. Giữ trong ngân sách: ≤ 150 draw call ở mức Cao, kích thước map ≤ 192 × 48 × 192 (map ít bài có thể nhỏ hơn nếu quy tắc rải bước vẫn xanh).
8. **Bản đồ thế giới, Home, màn Khu vực (M).** `generate-world-overview.ts` thêm đảo cho 4 khu mới, đổi Thư viện và Lâu đài thành đảo chơi được; sinh lại ảnh đảo Home (`pnpm assets:home`) và vùng nhấn. Thẻ khu vực hiện khoảng bài trong sách (ví dụ "Tiếng Việt bài 1–8"). Nếu chưa có, thêm lối "Học tiếp" ở Home tới bài chưa xong đầu tiên theo thứ tự sách, qua mọi map.
9. **Kiểm, docs, phát hành (M).** Gate 5 lệnh + web build + `e2e:ci`; sửa E2E đang chỉ theo map cũ (`sgk-content`, `school`, `wayfinding`, `forest-life`, `quest-api.ts`); `pnpm security:dist`. Thêm một mẫu E2E cho mỗi map mới (vào map, gặp hướng dẫn viên, nhận một bài). Docs: Master Plan §4 (bảng khu vực) và §15 #33, §16 tiêu chí 8; `docs/project-roadmap.md`; `CLAUDE.md` (câu "Hai map chơi được…" và lệnh `world:*`); trang review có ảnh 8 map và số liệu hiệu năng. Deploy staging rồi production: **hỏi người trước**; sao lưu database production trước khi deploy dù đợt này không đổi schema.

Phụ thuộc: 1 → 2 → (3 → 4) song song được với (5, 6, 7) sau khi bảng phân bài của 3 xong; 8 sau 6, 7; 9 cuối.

## Rủi ro

| Rủi ro | Giảm thiểu |
| --- | --- |
| Bé đang dở một bài bị chuyển map | Id quest và id bước giữ nguyên; tiến độ ở server không đổi. Vào lại bài thì bé xuất hiện ở điểm xuất phát của map mới. Nếu id mục tiêu buộc phải đổi, manh mối đã tìm của bài đó mất (bé tìm lại); ghi vào ghi chú phát hành |
| Viết lại 60 bài làm lệch lời SGK | Kiểm kê SGK trong `content:check` vẫn chạy; lô viết chỉ được sửa phần kể chuyện |
| Hai generator đổi kết quả khi tách bộ khung | So sha256 map trước và sau phase 2 |
| Hiệu năng và dung lượng tăng theo số map | Mỗi lần chỉ tải một map; đo draw call trong E2E mẫu từng map; manifest thêm khoảng 6 × 300 KB |
| Map dựng không đẹp (không có mock) | Ảnh preview từng map trên trang review để người sở hữu duyệt trước khi deploy; sửa theo góp ý |

## Nghiệm thu

- [ ] 8 map chơi được, mỗi map đúng các bài ở bảng chia; `content:check` xanh với các luật mới (map tồn tại, NPC một map, không nhắc khu khác).
- [ ] `pnpm content:spread` = 0 vi phạm trên cả 8 map.
- [ ] Không câu SGK nào đổi; id 71 quest giữ nguyên.
- [ ] Không còn chỗ viết cứng id khu vực trong code (grep `khu-rung-bi-mat` / `truong-hoc` chỉ còn trong dữ liệu, test và generator của chính map đó).
- [ ] Gate 5 lệnh + web build + `e2e:ci` xanh trong 480 s; draw call ≤ 150 ở mẫu E2E của mỗi map.
- [ ] Người sở hữu duyệt ảnh 8 map trên trang review.

## Câu hỏi còn mở

- Bé đang chơi thật đã hoàn thành trọn một bài chưa? Nếu rồi thì đánh dấu tiêu chí §16 "một bé chơi thử hoàn thành một quest" (cùng phase 9).
