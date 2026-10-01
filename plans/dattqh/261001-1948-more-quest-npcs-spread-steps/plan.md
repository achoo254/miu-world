# Nhiều NPC nhiệm vụ hơn, mỗi NPC tối đa 2 nhiệm vụ, bé đi lại thay vì đứng một chỗ

**Trạng thái:** đang làm · **Tier:** XL · **Nhánh:** `main` · Quyết định: Jev (`jev-input.json`, `jev-output.json`) và người sở hữu (giới hạn mọi vai)

## Kết quả mong muốn

Bé than phiền phải đứng một chỗ làm nhiệm vụ quá lâu. Sau đợt này:

- Mỗi nhân vật (NPC) có mặt trong **tối đa 2 nhiệm vụ**, ở **mọi vai** (giao nhiệm vụ hay ra thử thách giữa chừng). Ngoại lệ: một hướng dẫn viên mỗi map (Vẹt Xanh ở Khu rừng). Đồ vật (bảng, hộp, cây…) không phải NPC, không bị giới hạn.
- Trong một nhiệm vụ: **tối đa 2 bước liền** ở cùng một chỗ, và mỗi nhiệm vụ đi qua **ít nhất 4 chỗ** khác nhau. Các chỗ của một nhiệm vụ đặt cách nhau đủ xa để bé thật sự phải đi.
- Nhiều NPC và kịch bản mới: NPC mới có tên, ngoại hình, lời dẫn riêng; mọi câu mới đều không lặp. Lời SGK giữ nguyên 100%.
- `content:check` đỏ nếu vi phạm, để không tái diễn.

## Quyết định

| Câu | Chọn | Nguồn |
| --- | --- | --- |
| "Giữ tối đa 2 nhiệm vụ" giới hạn gì | Mọi vai | Người sở hữu (Jev 50/50) |
| Mức rải bước | ≤ 2 bước liền một chỗ, ≥ 4 chỗ mỗi nhiệm vụ | Jev 0,77 |
| Ngoại hình NPC mới | 45 kiểu có sẵn + nhân vật chibi ghép từ thư viện (loài, trang phục, màu) | Jev 1,0 |
| Hướng dẫn viên | Miễn một hướng dẫn viên mỗi map | Jev 0,72 |
| Mở rộng map | Giữ 192 × 192, nới khoảng cách giữa các chỗ của một bài (thử 14, 10, 7 khối); chỉ mở rộng map nào chật tới mức không giữ được 10 khối, rồi đo lại hiệu năng (người sở hữu cho phép mở rộng, để Jev quyết) | Jev 0,99 (`jev-input-map-size.json`) |

## Hiện trạng (đo 01/10/2026)

- 71 nhiệm vụ (35 rừng, 36 trường), 17–19 bước mỗi bài, 614 bước thử thách.
- Trường học: trung bình 9/17 bước ở chỗ người giao; chuỗi liền một chỗ dài nhất trung bình 7,3 (có bài 17/17). Rừng: chuỗi trung bình 5,3, dài nhất 11.
- 16 nhân vật giao 3–4 nhiệm vụ; 23 nhân vật có mặt trong hơn 2 nhiệm vụ (Vẹt Xanh 11).
- Các chỗ của một nhiệm vụ hiện chỉ cách nhau 2–6 khối (`place-quest-targets.ts`).
- `pnpm content:spread` (bản đầu): 71/71 bài vi phạm, 22 nhân vật có mặt trong hơn 2 bài.

## Phase

1. [x] Quy tắc và số đo: `tools/content/quest-spread.ts` (giới hạn NPC, chuỗi liền, số chỗ), `pnpm content:spread` báo từng bài; test. (S)
2. [x] NPC chibi (24 nhân vật: 4 loài × trang phục × màu lông, mỗi nhân vật 1 draw call, ~180 KB; NPC chibi chào bằng `wave`, nhảy múa bằng `cheer`): thêm nhân vật chibi (4 loài × trang phục × màu) làm ngoại hình NPC mới (`content/characters.json`, `pnpm assets:character`, `looks.json`). (M)
3. [ ] Phân vai: bảng gán NPC cho từng bài thỏa giới hạn; thêm NPC mới vào `targets.json`; viết lại bài (chia bước cho NPC/vật khác, lời dẫn `goTo`, hội thoại, `places`), giữ lời SGK. Chia lô cho subagent theo file. (XL)
4. [ ] Đặt chỗ: các chỗ của một bài cách xa hơn (thử rộng trước), sinh lại hai map, bật quy tắc trong `content:check`. (M)
5. [ ] Test, E2E, gate, journal; deploy staging (production hỏi người). (M)

## Nghiệm thu

- [ ] `content:check` xanh với quy tắc mới; `pnpm content:spread` = 0 vi phạm.
- [ ] Không câu SGK nào đổi (kiểm bằng kiểm kê `content:check` hiện có).
- [ ] Gate 5 lệnh + web build + `e2e:ci` xanh; draw call ≤ 150 ở các mẫu E2E.
