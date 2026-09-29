# Review Master Plan: phase 6 (Visual chibi + palette)

Ngày: 2026-09-29. Người review: master-plan-reviewer.

## Verdict: PASS (kèm 3 ghi chú nhỏ)

## Lệnh đã chạy
- `pnpm assets:check` OK (12 packs, 1096 files); `pnpm test` 22 file, 158 pass, 1 skip; `pnpm typecheck`, `pnpm lint` xanh.
- Tính xác định: băm sha256 3 file `miu-cat-chibi-*.glb` và `atlas.png`, chạy lại `pnpm assets:character` + `pnpm assets:atlas`, băm lại: giống hệt. `pnpm assets:check` vẫn OK sau đó.
- Validator từng biến thể: mỗi biến thể 652 tam giác (ngân sách ≤ 5k), 1 draw call, 31 clip.
- E2E POC (`pnpm --filter @miu/poc-voxel e2e --project poc`): 5/5 pass, chạy vì có sửa hai file runtime POC.
- Xem ảnh `miu-cat-chibi-b-turn-0.png` (mặt có mắt, ánh sáng mắt, má, mũi, đúng khối voxel, mũ/balo chưa đội ở ảnh này) và `miu-cat-chibi-b-gameplay-camera.png`.

## Đối chiếu yêu cầu
Đạt:
- Spec Zod mở rộng `torsoScale`, `limbScale`, `headOffset`, `face`, `accessoryScale`; `miu-cat` giữ mặc định nên glb cũ byte-giống (test so hash với file đã commit).
- 3 biến thể `miu-cat-chibi-a|b|c`: headScale 0.8 / 0.92 / 1.04, thân và chân ngắn dần (torso 0.85/0.78/0.70, limb 0.8/0.7/0.6).
- Mặt bằng khối voxel trong `content/faces/miu-cat-face.json` (tách khỏi `content/accessories/`, chỉ còn `backpack-brown`, `hat-witch-pink` ở đó), gộp vào mesh nên vẫn 1 draw call.
- Phụ kiện co theo biến thể bằng `accessoryScale` theo nhân vật, không nhân bản file phụ kiện.
- Palette pastel ấm và tint mạnh hơn (`content/palette.json`, `content/blocks.json`); atlas, map, ảnh preview, manifest sinh lại bằng generator.
- Trang review: mục "Chọn biến thể Miu" (4 góc, ảnh góc camera gameplay, 4 anim xem thử, phụ kiện co theo biến thể), bảng palette trước/sau, form chọn biến thể có lựa chọn "Chỉnh thêm (ghi rõ ở ghi chú)" (`review-main.ts:222-235`).

## Ghi chú
1. [THẤP, đã công khai] Sửa 2 file ngoài danh sách "Chỉ chạm": `apps/poc-voxel/src/character/character-accessories.ts` (tham số `scale` mặc định 1) và `apps/poc-voxel/src/preview/preview-main.ts` (query `accScale`). Chấp nhận: cần để phụ kiện co theo biến thể, mặc định 1 nên `player-character.ts` không đổi hành vi, E2E xanh. Nên ghi việc này vào trang review phase 8 và cập nhật câu "Chỉ chạm" trong phase file cho khớp.
2. [THẤP] Đầu của biến thể B/C che khoảng nửa thân ở góc camera gameplay (đúng rủi ro phase nêu; ảnh xác nhận đầu B phủ gần hết thân khi nhìn từ sau). Không phải lỗi; để người duyệt cân nhắc ở phase 8 (biến thể A giữ đầu nhỏ nhất). Nếu người duyệt chọn "Chỉnh thêm" thì lặp tối đa một vòng như phase ghi.
3. [THẤP] Bảng palette "trước" là swatch lấy từ palette POC ở git HEAD, không có ảnh map cũ (ảnh review chỉ sinh bằng generator). Chấp nhận vì tiêu chí chỉ đòi bảng palette trước/sau; ghi rõ điều này trên trang.
4. Chưa xác minh trang `review.html` render đúng trong trình duyệt (chỉ đọc code và xem ảnh sinh ra). Chụp màn hình mục "Chọn biến thể" khi làm phase 8.
5. Sau khi người duyệt chọn (phase 8): biến thể chọn thành `miu-cat`, xóa 2 biến thể còn lại khỏi `content/` và manifest, rồi chạy lại `pnpm assets:manifest`.

Câu hỏi chưa giải quyết: không có. Không gọi Jev (không có quyết định mới cần người).
