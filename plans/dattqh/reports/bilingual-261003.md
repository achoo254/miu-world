# Song ngữ Việt / Anh (pha S1 + S3) — báo cáo 03/10/2026

Plan: `plans/dattqh/261003-2330-bilingual-npc-stories-bots/plan.md` (S1, S3). Thiết kế: Master Plan §8c. Cách dùng cho người viết mã: `docs/i18n.md`.

## Kết quả

- **Lõi i18n** `apps/web/src/ui/i18n/`: `locales/vi.json` + `locales/en.json` (380 khóa, gồm các bộ câu xoay vòng), `i18n.ts` (thuần TS, dùng được trong game: `t`, `pairOf`, `linesOf`, `writeText`, `onLangModeChange`), `use-t.tsx` (`useT`, `<T k=…/>`, `<Bi vi en/>`). Ba chế độ `vi` / `en` / `both`; thiếu tiếng Anh thì hiện tiếng Việt. Chế độ Tiếng Việt cho ra đúng DOM như trước, nên test cũ giữ nguyên.
- **Cài đặt** "Ngôn ngữ / Language" (Tiếng Việt · English · Song ngữ) và "Tốc độ giọng đọc" (Chậm / Vừa) trong Tạm dừng và Cài đặt ở Trang chủ. Áp ngay, lưu trên máy theo từng hồ sơ bé (`miu.lang.<id hồ sơ>`, kèm `miu.lang` cho máy).
- **Đã chuyển sang `t()`**: HUD (thẻ nhiệm vụ, nút, dòng tự đi, nút Lái xe, Tương tác, Quay lại), Trang chủ, Bản đồ thế giới, khu vực và rương khu vực, ba lô, hồ sơ, Tạm dừng / Cài đặt, mất mạng, màn tải, tạo nhân vật, cửa hàng (cả thông báo lỗi), thời khóa biểu và lịch đồng phục, trang trí nhà, khung minigame (thẻ hướng dẫn, 3-2-1, kết quả, thưởng, đồ hỗ trợ), hội thoại, khung bài học (Kiểm tra, Làm lại, Hướng dẫn / Gợi ý / Đáp án), chép vở, màn thưởng, các câu xoay vòng (NOT_NOW / FOUND / DONE / TRY_AGAIN, câu thắng/thua minigame), toast, lỗi API. Nút Chạy / Nhảy và "Bỏ qua" khi đi xe trong game đổi chữ ngay khi đổi chế độ.
- **Đọc to (S3)**: `dialogue/speech.ts` (`speak(text, lang)`, `speakLines`, `bestVoice`) và `dialogue/listen-button.tsx` "🔊 Nghe / Listen" ở bong bóng hội thoại, đề bài (khung bài học), bài đọc, bài nói. Chọn giọng trên máy tốt nhất (đúng vi-VN / en-US, giọng Premium/Enhanced, giọng mặc định); không dùng giọng gửi chữ lên server (Master Plan §9). Song ngữ đọc tiếng Việt rồi tiếng Anh; chữ SGK đọc tiếng Việt ở mọi chế độ. Tắt âm thanh, đổi màn hình, đổi câu thì ngừng đọc; máy không có giọng thì ẩn nút. Ghi âm giọng bé không đổi (chỉ trong trình duyệt).
- **Kiểm khóa**: `tools/content/check-locales.ts` chạy trong `pnpm content:check` (thiếu dòng Anh, khác tham số `{x}`, thiếu dòng trong bộ câu, khóa chỉ có ở en.json).

## Kiểm tra

| Lệnh | Kết quả |
| --- | --- |
| `pnpm vitest run --no-file-parallelism` 17 thư mục UI + `game-bridge` + `check-locales.test.ts` | 28 file, 196 test pass |
| `apps/web/src/ui/i18n/i18n.test.tsx` (mới) | 14 pass: đủ khóa, fallback, tham số, ba chế độ, lưu theo hồ sơ, storage bị chặn, `<Bi>`, cài đặt ngôn ngữ, tốc độ giọng |
| `tsc` web | 0 lỗi ở file của pha này (lỗi còn lại thuộc 2 minigame mới `block-count`, `kangaroo-hop` của phiên khác, chưa commit) |
| `pnpm lint` | exit 0, 0 cảnh báo |
| `pnpm content:check` / `pnpm assets:check` | OK — 1356 file / OK — 16 pack, 4557 file |
| `pnpm --filter @miu/web build` | OK (cảnh báo chunk size có từ trước) |
| `pnpm security:dist` | OK |
| E2E | không chạy (theo yêu cầu) |

## Ảnh (chế độ Song ngữ, đã xem)

`plans/dattqh/reports/bilingual-261003/`: `settings-both-{ipad,phone}.png`, `hud-both-{ipad,phone}.png`, `dialogue-both-{ipad,phone}.png`, `home-both-{ipad,phone}.png`, `pause-both-ipad.png`, `hud-en-ipad.png`, `hud-vi-ipad.png`.

## Chưa làm / còn lại

- **Lưu chế độ lên server theo hồ sơ**: cần thêm cột cho hồ sơ (migration) và route server, ngoài phạm vi file của pha này; hiện lưu trên máy theo từng hồ sơ.
- **Nội dung (pha S2)**: lời NPC, tên nhiệm vụ / bước, tên khu và môn, tên vật phẩm / thú cưng / loài / trang phục, tên và `howTo` minigame, tên món và mô tả trong cửa hàng, tên kiểu trang trí, nhãn hành động trên đầu nhân vật, lời cư dân trong game (`ambient-lines.ts`). Bài nói: đề và gợi ý là chữ SGK nên Song ngữ chỉ hiện tiếng Việt cho tới khi có bản dịch nội dung.
- **Màn hình phụ huynh**: đăng nhập / đăng ký / PIN / đồng ý / chọn hồ sơ / khu phụ huynh / phiếu viết / chính sách, bàn phím PIN.
- **Game**: bản đồ nhỏ và bảng bản đồ (`game/hud/minimap*.ts`, `map-sheet.ts`) do phiên khác đang sửa.
- **Nhãn đọc màn hình trong cơ chế bài học** (ô sắp xếp, nối điểm, điền chỗ trống, đồng hồ, lịch, hình minh họa): giữ tiếng Việt; lịch và đồng hồ là nội dung Toán của sách.
