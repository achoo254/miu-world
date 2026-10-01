# Thế giới mỗi bài một vẻ: vật thể đúng hình, nhân vật không phân thân

**Trạng thái:** xong · **Tier:** L · **Nhánh:** `main` · Jev chọn (`jev-input.json`, `jev-output.json`, độ tin cậy 1.0)

## Kết quả mong muốn

Bé chơi 70 bài và thấy mỗi vật thể quest là đúng thứ được gọi tên (phong bì là phong bì, vé là vé, thước là thước), vật khác màu thì khác màu; một nhân vật chỉ đứng một chỗ tại một lúc và đi theo câu chuyện tới nơi bước hiện tại cần.

## Hiện trạng đo được (01/10/2026)

- 312 mục tiêu dùng 95 hình; hình "lá thư" phủ 47 mục tiêu (phong bì, vé, máy bay giấy, sách, tờ lịch, quạt nan…), "hộp" 25, "khúc gỗ" 21 (thước, bút chì, kim đồng hồ…), "đá" 20, "biển" 19. "Phong bì đỏ/vàng/xanh" trông y hệt nhau.
- 19 màn quest có cùng một nhân vật đứng hai chỗ cùng lúc (rừng 5, trường 14); bài `toan2-cd2-b10` có ba Hải Ly Cần cùng lúc.

## Quyết định

- **Nhân vật đi theo câu chuyện.** Mục tiêu trong `content/world/targets.json` có thể khai `character: <id>` (cùng một nhân vật gặp ở chỗ riêng của bài). Generator ghi `character` vào entities; runtime chỉ hiện một thành viên mỗi nhóm: đúng mục tiêu bước hiện tại chỉ tới (`set-target-hint`), không thì thành viên vừa được chỉ, không thì bản riêng của bài. Thuần TS trong `packages/voxel`, có test.
- **Vật thể voxel từ Fluent Emoji (MIT, pack đã có).** Tải thêm ảnh emoji cần dùng qua `sources.json`; generator `tools/assets/build-emoji-props.ts` đổi ảnh thành model khối (mỗi điểm ảnh một khối, màu theo đỉnh, xác định), biến thể màu bằng `colorize` (tô lại một màu, giữ sáng tối), khai ở `content/world/emoji-props.json`. Output `assets/generated/props/*.glb`. Look nhận `model` là `generated/props/*.glb`.
- **Gate giữ cho khỏi tái phát** (`content:check`): mỗi màn quest không có hai nhân vật cùng tên khác nhóm; một look phủ tối đa 6 mục tiêu; mục tiêu cùng một quest khác tên thì khác look.
- Không thêm dependency.
- **Sửa thêm (lỗi có từ trước):** loader dùng chung một scene cho mỗi model, nên hai mục tiêu cùng model trong một màn chỉ hiện một (ba bê con chỉ thấy một). Mỗi interactable giờ clone model (`SkeletonUtils.clone`).
- **Prop emoji xoay mặt về camera:** tranh khối dày 2 ô; nhìn chéo thì chỉ thấy cạnh một màu, nên prop luôn quay mặt tranh về camera.

## Việc

1. [x] Nhóm nhân vật: schema `character`, placer ghi vào entities, `castHidden` thuần TS + test, runtime ẩn/hiện theo hint, dữ liệu `character` cho mọi bản trùng.
2. [x] Generator emoji → voxel GLB + biến thể màu, pack mở rộng, manifest.
3. [x] Gán lại look cho 312 mục tiêu theo đúng vật; bê có hình riêng; cánh cửa biết nói.
4. [x] Gate `content:check` mới; sinh lại hai map, ảnh review; gate đủ + build + E2E; deploy staging.

## Nghiệm thu

- [x] `content:check` đỏ nếu một màn có nhân vật trùng tên khác nhóm, hoặc một look phủ quá 6 mục tiêu; hiện xanh.
- [x] Trong game: bài `toan2-cd2-b10` chỉ có một Hải Ly Cần, xuất hiện ở chỗ bước hiện tại chỉ tới (E2E).
- [x] Phong bì/vé/hộp cùng tên khác màu có màu khác nhau; ảnh review mới cho người duyệt.
- [x] Draw call ≤ 150 trong mẫu E2E; gate 5 lệnh + web build + `e2e:ci` trong ngân sách thời gian.

## Kết quả (01/10/2026)

- 312 mục tiêu, 263 look (95 → 263); look phủ nhiều nhất còn 5 vật khác nhau; 133 prop emoji (95 ảnh mới từ Fluent Emoji, MIT, sha256 ghi ở `sources.json`), 5,0 MB trong `assets/generated/props`.
- 12 nhóm nhân vật (18 bản ở chỗ riêng của bài) khai `character`; `content:check` xanh với ba quy tắc mới, test bắt đúng lỗi khi cố tình làm sai.
- Ảnh review: `assets/generated/review/props/` (mục "Vật thể trong bài" trên trang review), chỉ chụp khi `REVIEW_SHOTS=1`.
- Gate: assets:check (1412 file), content:check (128 file), 715/715 test, typecheck 0 lỗi, lint sạch, web build, security:dist; `e2e:ci` 64 passed, 2 skipped (tư liệu review), 223 s / ngân sách 480 s.
