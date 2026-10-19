# Sửa theo review nội dung đợt 2a (19/10/2026)

Nguồn: `plans/dattqh/reports/review-npc-stories-batch2a-261019.md`. Quyết định (Jev): sửa UI cho bước `logic` hiện `elements` ở mọi loại, thêm luật `content:check`; thư viết trung tính, không đổi server.

Commit (chưa push): `d44d8bd6 fix(web): puzzle steps show their clues in every kind`, `18136d0d fix(content): story chapters with their own mazes, neutral letters and fixed continuity`. Không đổi vật, mục tiêu hay nơi trên map, nên không sinh lại map nào.

## UI và luật kiểm tra

- `packages/schema/src/content.ts`: bảng `LOGIC_SHOWS` (loại bước nào hiện `elements`, `grid`) và `isUnknownElement` (phần tử có «?» là ô cần tìm). Màn chơi và `content:check` cùng đọc bảng này.
- `apps/web/src/ui/challenge/mechanics/logic-challenge.tsx`: `pattern` hiện hàng phần tử, phần tử có «?» vẽ thành ô cần tìm, chỉ thêm ô «?» cuối khi không phần tử nào là ô cần tìm; `puzzle`, `maze` hiện `elements` thành danh sách manh mối (kiểu thẻ như hàng quy luật, CSS token).
- `tools/content/logic-steps.ts` (gắn vào `check-content.ts`): đỏ khi bước mang `elements`/`grid` mà loại đó không hiện, mê cung thiếu lưới hoặc có ô lạ, không đúng một S một G, hàng lệch độ dài, dãy quy luật có hơn một ô «?», hai quest dùng cùng một lưới mê cung.
- 10 bước `puzzle` có manh mối (9 quest cũ trong review cộng `te-tuong-nghin-van-co-2`) giờ hiện manh mối; luật mới xanh trên toàn bộ nội dung. Các dãy cũ đã có phần tử «?» (`wonder-olympic-logic`, `yarn-do-ba-con-do-may-4`, `yarn-hoa-mi-bai-ca-2`, `yarn-ho-bang-biet-hat-3`, `yarn-lua-hieu-mui-da-3`, `yarn-phu-dieu-thieu-manh-1`, `yarn-bac-thang-mot-tram-1`) trước đây hiện hai dấu hỏi, nay chỉ một.

## Từng mục

| Mục | Sửa |
|---|---|
| M1 `te-tuong-2` | Manh mối hiện qua UI; prompt gọn lại (không lặp manh mối). `giai-the-huou-cao`: 46 + 27 = 73 là số khóa mở cuộn sơ đồ, không còn là số ghế, nên hết mâu thuẫn 73/3. Lời mở bỏ "gió đưa thẻ". |
| M1 phần quest cũ | UI sửa chung, luật `content:check` chặn tái phát (xem trên). |
| S1 mê cung trùng | Lưới mới riêng cho `cao-mui-ten-3`, `cao-tuyet-3`, `khi-mua-2`, `te-tuong-4`; `koala-2` giữ lưới cũ. `den-sen-3` (trùng `viec-tot-khu-rung`) và `meo-sen-3` (trùng `lua-thom-mat-cuoi-3`) có lưới mới. Script BFS: đáp án tới ngôi sao, phương án nhiễu đụng gạch, ở cả 7 mê cung. Luật trùng lưới đã thêm. |
| S2 lời dẫn mê cung | Viết theo hình: "ô có chú mèo", "ô ngôi sao", "ô gạch". `te-tuong-4` đổi truyện cho khớp hình: mèo mướp ở ô 🐱, {name} dẫn mèo về bàn cờ ở ô ⭐. |
| S3 dấu «?» | `meo-hop-1`, `te-tuong-5`: đúng nhờ UI mới. `cho-coi-2` (vạch 9) và `tho-doi-1` (bước 10): thêm phần tử tới vị trí được hỏi, ô «?» nằm đúng chỗ. `khi-day-3`: dãy mới 12, 22, 32, «? lỗ», 52. Mọi dãy quy luật trong game giờ có đúng một ô «?». |
| S4 `thu-ngan-4` | Phản hồi 33: lấy 8 − 5 ở hàng đơn vị, phải mượn một chục (vi, en). |
| S5 bữa trưa của Chó | Ch3 xin nửa giờ (khớp 11:30–12:00), ăn gần hết rồi dừng khi chuông 12 giờ, bữa trọn vẹn đầu tiên giữ cho ch5. |
| S5 chuyện cười 99 | Mốc đầu 95; ch1 96, ch2 97, ch3 98 (bản nháp), ch4 99, ch5 100. Hai nhánh chỉnh để nhánh nào cũng thêm đúng một chuyện. |
| S5 thư theo nhánh | Năm thư (`cho-coi-3`, `cun-dom-3`, `khi-mua-3`, `thu-ngan-1`, `koala-1`) viết trung tính, vi và en. |
| S5 `nai-3` tối om / sáng | Viết lại cảnh, hết tự mâu thuẫn. |
| S5 thư hoa ép | Thân thư `tho-doi-2` nhắc bông dừa ép làm kẹp sách. |
| S6 nỗi sợ của Nai | Ch3 bỏ màu sợ: khách muốn ngắm đom đóm gần, đèn lều sáng nên đom đóm múa ở mép rừng; không "lo", không "chỉ mong chúng về". Giữ đèn làm nguyên nhân vì vật trên map là chụp đèn (đổi sẽ phải sinh lại map). |
| S7 Hổ Còi Vàng | Xưng «tớ» như hồ sơ, người chơi đáp «Tớ…/Cậu…», không còn «Cháu»; cả hai thư của Hổ. |
| S8 bộ số trùng | 8 + 7 → 9 + 5 (`meo-bep-1`); 47 → 58 (`nai-1`); 52 − 27 → 61 − 34 (`meo-hop-1`); 26 + 18 → 34 + 17 (`te-tuong-4`); 28 + 19 → 36 + 17 (`te-tuong-5`); 46 + 38 = 84 → 27 + 35 (`cao-tuyet-1`); 36 + 47 = 83 → 29 + 37 (`cao-mui-ten-1`). |
| S8 dm ra cm | `cao-mui-ten-1`, `cao-tuyet-1` đổi sang cộng và so sánh cm; phản hồi khuôn ở `canh-cut-3` viết lại. |
| S8 mở bằng gió | Đổi 9/12: `cao-mui-ten-1`, `meo-hop-1`, `meo-hop-2`, `te-tuong-1`, `thu-ngan-1`, `thu-ngan-3`, `heo-1`, `meo-sen-2`, `ong-bay-2`. Giữ `den-sen-1`, `den-sen-4` (gió là nỗi sợ trong hồ sơ Cô Đèn Lồng Sen) và `koala-1` (quyết định và minigame `leaf-blow` dựng trên gió). Lời nhắc sắp xếp "gió thổi lộn xộn" đổi ở cả 5 chương. |
| S8 đặt tên | Đổi 5/8: `ho-coi-1` (cách khởi động), `heo-1` (ai hát câu mở), `den-sen-1` (treo đèn ở đâu), `cao-tuyet-3` (cách ra mắt tượng), `meo-sen-1` (bỏ phương án đặt tên vịt). Giữ `banh-mi-3`, `meo-tra-3` (vật trên map mang tên "Chiếc xe chưa có tên", "Ống tre đựng thẻ đặt tên") và `nai-2` (đặt tên đom đóm là ước mơ trong hồ sơ). |
| S8 câu kể nỗi sợ | Viết mới, theo giọng từng nhân vật, ở `meo-bep-4`, `cho-coi-4`, `cho-coi-5`, `khi-day-4`, `den-sen-4`, `heo-4`, `thu-ngan-4`, `thu-ngan-5`, `koala-4`, `canh-cut-4`, `khi-mua-4`. |
| S8 quà trùng | Thư Thỏ Ngắm Sao ở `den-sen-4` gửi `den-dau-co`; `meo-hop-3` gửi `kep-sach-ruy-bang`; Chó ở `cho-coi-5` gửi `chiec-coi-dat` thay `dong-tien-co`. |
| S8 Khỉ Chuyền Cành | Bỏ "Tớ đọc chữ chậm lắm", thay bằng nét của chính hồ sơ (không ngồi yên quá ba chữ). |
| S8 khuôn chương (tìm 3 món, 3 phương án) | Chưa đổi: review ghi là gợi ý cho đợt 2b. |
| S9 quá dễ | `ho-coi-3` 38 + 27 = 65, hơn kém 7; `cua-3` 28 + 15 = 43 kg (bao dừa, hộp cá khô); `khi-day-3` dãy +10; `meo-tra-1` 15 + 8, 30 − 23; `thu-ngan-1` 35 + 8, 50 − 43; `thu-ngan-2` 20 + 10 + 5, 35 − 2; `heo-4` 19 giờ lùi 30 phút rồi 2 giờ. |
| S9 tập 2 | Chỉ báo để biết (theo review), không đổi. |
| Có thì tốt | Không làm trong lượt này (ngoài phạm vi "Phải sửa", "Nên sửa"): mẹo mài dao `meo-bep-4`, áo phao `cua-1`, câu tiếng Anh `koala-1`, tên thẻ tiếng Anh `cua-3`. |

## Kiểm tra

- `pnpm assets:check`: OK, 16 pack, 4789 file.
- `pnpm content:check`: OK, 2151 file, 0 lỗi (gồm audit mục tiêu quest mọi map và luật bước logic mới).
- Test (1 worker): `tools/content/check-content.test.ts`, `logic-steps.test.ts` (mới, 7 test), `content-variety.test.ts`, `apps/web/src/ui/challenge/mechanics/mechanics.test.tsx` (thêm 2 test), `apps/server/src/content/content-catalog.test.ts`, `apps/server/src/npc/npc-catalog.test.ts`, `packages/schema/src/npc.test.ts`, `packages/schema/src/content.test.ts`: 8 file, 104 test xanh.
- `pnpm typecheck`: xanh. `pnpm lint` (`--max-warnings=0`): 0 lỗi, 0 cảnh báo.
- Chưa chạy local: bộ test đầy đủ, build web, E2E (theo `CLAUDE.md`, chạy trên CI khi push). Sửa `apps/web` nên build web cần CI xanh.

## Còn mở

- `nai-3` vẫn dùng đèn sáng làm nguyên nhân (đã bỏ màu sợ). Muốn đổi hẳn sang mưa/sương thì phải đổi vật trên map và sinh lại `forest-ch1`.
- `heo-2:ai-ngoi-dau` và `meo-tra-2:ai-toi-truoc` cùng dạng câu đố thứ tự; để đợt 2b xử lý cùng việc bỏ khuôn "tìm 3 món".
