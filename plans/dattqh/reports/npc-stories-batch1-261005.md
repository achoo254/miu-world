# Nhân vật có chuyện riêng, đợt 1 (05/10/2026)

Plan: `plans/dattqh/261003-2330-bilingual-npc-stories-bots/plan.md` (quyết định Jev 05/10/2026: đợt 1 = N1 + N3 mọi map, 2 mạch mỗi map kèm độ thân thiết; lối vào bằng nói chuyện và danh sách quest; trái tim hiện rõ; dịch tiếng Anh cùng đợt). Tier: XL.

## Kết quả

| Hạng mục | Số lượng |
| --- | --- |
| Hồ sơ nhân vật (N1) | 60 (5 mỗi map × 12 map): vai, tính cách, giọng, nỗi sợ, ước mơ, bí mật, thói quen, món thích |
| Lời thường ngày (N3) | 917, mỗi nhân vật 14–17 (sàn 12): đủ 4 buổi, ≥ 2 theo thời tiết (mưa/nắng; tuyết trên Núi tuyết), ≥ 3 dành cho bạn thân (trái tim), ≥ 1 nhắc nhân vật khác (thường ở map khác); không câu nào lặp (content:check) |
| Quan hệ | 84 (mỗi map 5 trong map + 2 sang map khác) |
| Mạch chuyện (N2) | 24 (2 mỗi map: một mạch 4 chương, một mạch 3 chương) |
| Chương | 84 quest `category: "story"`, id `yarn-*`, mỗi chương ≥ 4 nơi, ≥ 2 cơ chế ngoài trắc nghiệm, đủ 8 pha, 7 câu hỏi, có thư sau chương (mỗi mạch ít nhất một thư từ nhân vật map khác) |
| Target mới trên map | 380 (1.227 tổng), mỗi cái một look riêng chép từ model có sẵn, không thêm art |
| Rương cổng | `ruong-go-bi-mat` ở chương 2 chuyện Dơi Đêm Tai To (Khu rừng), `ruong-do-choi-nha-be` ở chương 2 chuyện Ông Cụ Trông Vườn (Nhà của bé) |

### Tiếng Anh (S2)

| Nội dung | Có tiếng Anh |
| --- | --- |
| Chương chuyện | 84/84 quest, 660/660 bước (kèm lớp hỗ trợ và phản hồi) |
| Quest phụ | 308/308 quest, 1.232/1.232 bước (sinh từ bảng `tools/content/side-quests/*.json`) |
| Lời NPC trong bài học (hội thoại, lựa chọn, thưởng, tiếp nối) | 415/415 bước của 93 quest; chữ SGK giữ nguyên tiếng Việt |
| Minigame (tên + cách chơi) | 308/308 |
| Cửa hàng | 276/276 món |
| Vật phẩm | 121/121 |
| Lời dân làng trên bong bóng | 430 dòng, 141 nhóm |
| Giao diện mới | 42 khóa locale vi/en |

## Cách chạy

- Server: bảng `npc_friendships` (migration `0017_npc-friendships`); `GET /api/npcs[?region=]`, `POST /api/npcs/:npcId/talk` (lần đầu mỗi ngày giờ Việt Nam +1, cập nhật có điều kiện nên gọi lặp hay đồng thời chỉ tính một), `POST /api/npcs/:npcId/gift` (món nhân vật thích, mỗi ngày một món, dòng ledger `npc-gift:<npc>:<ngày>` −1 món, vật sưu tầm phải còn một trong bộ sưu tập), mỗi chương xong +5 (đọc từ `quest_progress`). Trái tim = số ngưỡng 2/6/12/20/30 đạt được. Nỗi sợ hiện ở 3 trái tim, bí mật ở 4; lời dành cho bạn thân chỉ gửi khi đủ trái tim.
- Xong chương lần đầu: thư `letter-<quest>` vào hộp thư (một lần), màn thưởng hiện trái tim và "Có thư mới".
- Web: thẻ nhân vật khi nói chuyện (lời theo buổi, mưa trong game, trái tim; nút nghe chương kế, chơi trò chơi, tặng quà, tạm biệt); bảng quest nhóm "Chuyện của <tên>"; nhãn tim trên bản đồ nhỏ và bản đồ lớn; trang `/village` "Bạn bè trong làng" (từ Trang chủ).
- Chương chuyện xếp sau mọi bài học: id `yarn-` và content:check kiểm thứ tự; "Nhiệm vụ hôm nay", cổng, "Khám phá ngay" chỉ chọn chương chuyện khi không còn bài học.

## Kiểm tra

- `pnpm assets:check` OK (4.597 file) → `pnpm content:check` OK (1.964 file) → `pnpm test` 510 file, 6.324 test pass, 1 skip (symlink Windows) → `pnpm typecheck` OK → `pnpm lint` 0 cảnh báo.
- `pnpm --filter @miu/web build` OK (cảnh báo chunk > 500 kB có từ trước); `pnpm security:dist` OK.
- E2E (1 worker): `--project setup --project npc-stories` 2/2; `--project setup --project quest-flow --project maps` 17/17; `e2e:smoke` 12/12 (thêm spec mới gắn `@smoke`); `--project setup --project home` 12/12 (Trang chủ có thêm mục).
- Mỗi map sinh lại một lần một map, sau đó `scenery-audit`, `room-audit`, `reach-audit` sạch (0 cây trên đường, 0 nhà thiếu chuẩn, mọi target tới được) và `pnpm assets:manifest`. Cảnh báo "chỉ cách 7 khối" của `tv2-t14-b25` (Xóm Mái Ấm), `tv2-t05-b09` (Trường học), `toan2-cd6-b30` (Thư viện) là của bài học có sẵn: chương chuyện đặt sau bài học nên không đổi chỗ bài học.
- Test mới: route nhân vật (lượt nói chuyện mỗi ngày, đồng thời, quà, quà đồng thời, IDOR giữa hai tài khoản, thư một lần, phản hồi tiếng Anh, lời bạn thân), catalog nhân vật, schema chương chuyện và `en`, luật thân thiết, thẻ nhân vật (web), nhóm chuyện trên bảng quest, nhãn bản đồ, lời dân làng hai thứ tiếng.

## Review

`code-reviewer` trên phần code: không có lỗi nghiêm trọng hay cao. Đã sửa: lời bạn thân lộ bí mật trước khi đủ trái tim (M1); chương chuyện chen trước bài học ở Trang chủ/cổng/"Khám phá ngay" (M2); nút chương trên thẻ không làm gì khi đang chơi chính chương đó (M3); bài đọc ở chế độ English; số món dư trên thẻ; gộp trái tim vào bản mới nhất; nhân vật có hồ sơ không bao giờ là vật cần tìm (content:check); tách phép tính thân thiết khỏi route; bỏ ép kiểu; khóa rate limit theo id hợp lệ; test quà khi chưa có món dư rồi tặng lại. Không sửa, có lý do: nhãn "Chuyện"/"Trò chơi" trên bản đồ chỉ tiếng Việt (theo cách các nhãn bản đồ hiện có), danh sách nhân vật đọc hai lần mỗi map (bản đồ và thẻ; nhỏ).

## Lưu ý cho người duyệt

- Không khóa chương: luật người sở hữu 01/10/2026 ("không quest nào chờ quest khác") đứng trên quyết định Jev; trái tim quyết định nhân vật có mời chương kế khi nói chuyện hay chưa, danh sách quest luôn mở mọi chương.
- Nội dung học trong chương là bản nháp AI (`review: teacher-pending`).
- Không thêm dependency mới.
- Một nhánh chọn ở chương 3 chuyện Nghệ Nhân Múa Rối nhắc con rối "Tễu Méo", vốn là bí mật 4 trái tim trong hồ sơ.
- Vài nơi trong chương dùng tên ngắn thay cho tên mốc đầy đủ (vì tên dài đã có trong bài học, luật không lặp câu), nên vật ở đó đứng trong vùng chương chứ không sát mốc.

## Câu hỏi còn mở

- Có muốn trái tim khóa hẳn chương ở server (ngoại lệ của luật không khóa) không? Hiện chỉ quyết định lời mời.
