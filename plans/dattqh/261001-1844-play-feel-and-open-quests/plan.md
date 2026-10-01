# Cảm giác chơi và nhiệm vụ mở trong map

**Trạng thái:** xong (01/10/2026) · **Tier:** M · **Nhánh:** `main` · Góp ý của người sở hữu sau khi xem bé chơi; quyết định mở bởi Jev (`jev-input.json`, `jev-output.json`)

## Kết quả mong muốn

1. Ba lô trong game có nút đóng (✕ ở góc và nút "Đóng"), không chỉ Esc.
2. Camera không còn hay bị quay xuống: kéo chỉ nghiêng trong một khoảng dễ chịu, vuốt ngang không làm nghiêng, đi tiếp thì góc nhìn tự về mặc định.
3. Đi tới gờ cao thì tự lên, không phải nhảy: 1 khối bước lên như cũ, 2 khối tự leo (hop ngắn); 3 khối trở lên vẫn là tường.
4. Đổi nhân vật (cả loài) mà không mất tiến độ, và dễ tìm chỗ đổi.
5. Nhiệm vụ làm lại được, không phải mở khóa trong một map; mọi nhiệm vụ đều nhận được.
6. Đi xuyên qua tán lá.

## Quyết định

| Câu | Chọn | Ghi chú |
| --- | --- | --- |
| Mọi nhiệm vụ nhận được trong một map | Bảng nhiệm vụ trong game (Jev 0.99, `auto`) | Nút "Nhiệm vụ" mở bảng của map ngay trên game; chọn bài nào thì game dựng lại bài đó tại chỗ bé đang đứng. Phương án vẽ mọi nhân vật của mọi bài cùng lúc vượt ngân sách draw call (175/200 vật tương tác của rừng thuộc riêng từng bài). |
| Độ cao tự leo | 2 khối | Nhảy chỉ cao ~1,4 khối nên gờ 2 khối trước đây là tường. Tường trường và bờ đất có nhà dân nâng lên 3 khối để vẫn ngoài tầm. |
| Lá cây | `solid: false` cho 3 loại lá | Người và camera đi xuyên; renderer và generator không đổi. |

## Đã có sẵn (kiểm lại, không phải sửa)

- Tiến độ (XP, xu, đồ, nhiệm vụ, vị trí) gắn với hồ sơ bé, không với nhân vật; `PUT /api/character` chỉ ghi bảng `characters`. Thêm test server chứng minh đổi loài giữ nguyên tiến độ.
- Không bài nào có điều kiện mở (mọi `unlock` rỗng); bài đã xong có "Chơi lại", server trả lại phần thưởng lần đầu, không cộng thêm.

## Nghiệm thu

- [x] `player-controller.test.ts`: bước 1 khối, tự leo 2 khối, 3 khối là tường, cần chỗ trống trên đầu, leo hiện như một cú nhảy ngắn; ra khỏi suối bờ 2 khối không cần nhảy.
- [x] `camera-rig.test.ts`: góc nghiêng trong khoảng, vuốt ngang không nghiêng, tự về mặc định khi đi.
- [x] `generate-school-map.test.ts`: đi được tới mọi khu, lớp tầng 1 và tầng 2; không chỗ nào trên bờ đất ngoài tường đứng được (kiểm ngược: với tường 2 khối thì có 9.580 chỗ).
- [x] `character-routes.test.ts`: đổi mèo sang cáo, `/api/progress` và `/api/quests` giữ nguyên.
- [x] `home.spec.ts`: ba lô đóng bằng ✕ và "Đóng"; bảng nhiệm vụ đánh dấu bài đang chơi, chọn bài khác thì đổi tại chỗ.
- [x] Gate 5 lệnh + web build + `e2e:ci`; commit, push, deploy production (người sở hữu cho phép lần này).

## Kiểm tra cuối (01/10/2026)

- `assets:check` 1730 file, `content:check` 129 file, `pnpm test` 738/738, `typecheck`, `lint` 0 cảnh báo; web build và `security:dist` xanh.
- `e2e:ci` 65 xanh, 2 bỏ qua (quay video, chụp ảnh review), 4,8 phút.
- Staging và production chạy `d82ffbc` (bản `261001-185648-d82ffbc`), database được backup trước khi chuyển; `atlas.json`, map Trường học và `manifest.json` trùng sha256 với local.
- Chưa chụp lại ảnh review của Trường học: tường rào cao thêm 1 khối nên vài cặp ảnh so mock lệch nhẹ.
