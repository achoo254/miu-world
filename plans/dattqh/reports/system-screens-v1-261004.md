# Báo cáo hoàn thành: Màn hình hệ thống V1 (Hộp thư, Skill Up, Cài đặt gom)

**Mã kế hoạch:** `261004-1617-system-screens-v1`  
**Ngày hoàn thành:** 04/10/2026  
**Nhánh:** `main`  
**Người thực hiện:** Antigravity  

---

## 1. Mục tiêu và phạm vi

Kế hoạch hoàn thiện các màn hình hệ thống cốt lõi theo Master Plan §6:
1. **Cài đặt gom (Full Grouped Settings)**: Gom toàn bộ tùy chọn hệ thống (Âm thanh & nhạc nền, Giọng đọc mẫu giáo/tiểu học, Ngôn ngữ, Bạn máy đồng hành, Hiển thị & khả năng tiếp cận) vào một giao diện trực quan, đồng bộ với Pause Screen và Home Screen.
2. **Hộp thư trong game (In-game Mailbox)**: Hệ thống nhận thư từ NPC, quà tặng hệ thống với cơ chế nhận thưởng một lần (idempotent), kiểm tra quyền sở hữu IDOR, hiển thị huy hiệu chưa đọc trên Home Screen.
3. **Màn hình thăng cấp kỹ năng (Skill Up)**: Tích hợp màn hình mừng công thăng cấp kỹ năng chuyên biệt nối tiếp Level Up trong luồng hoàn thành nhiệm vụ (`CompletionSequence`).
4. **Chuỗi ngày (Streak)**: Bỏ qua theo quyết định của TypeSafe Jev (`reports/jev-261004-1648-open-questions.md`).

---

## 2. Chi tiết thực hiện từng pha

### Pha 1: Cài đặt gom (Full Grouped Settings)
- **Tùy chọn hiển thị**: Thêm `reduceMotion` (tắt/bật) và `fontSize` (`normal` / `large`) trong `apps/web/src/ui/system/display-setting.ts` và bộ điều khiển `display-controls.tsx`.
- **Nhạc nền**: Bổ sung `readMusicOn()` và `writeMusicOn()` trong `sound-setting.ts`, cập nhật `music-player.ts` để kiểm soát độc lập giữa hiệu ứng âm thanh và nhạc nền.
- **Component gom**: Xây dựng `FullSettingsGroups` và `SettingsDialog` trong `apps/web/src/ui/system/full-settings.tsx` & `settings-dialog.tsx`.
- **Tích hợp**: Cập nhật `pause-screen.tsx` và `home-screen.tsx` sử dụng giao diện cài đặt gom mới.
- **Đa ngôn ngữ & CSS**: Bổ sung đầy đủ nhãn tiếng Việt và tiếng Anh, selector CSS cho chế độ giảm chuyển động và cỡ chữ lớn.
- **Unit test**: Bổ sung 9 bài kiểm thử trong `apps/web/src/ui/system/system-screens.test.tsx` (PASS).

### Pha 2: Hộp thư trong game (Mailbox System)
- **Schema & Dữ liệu**:
  - `packages/schema/src/mail.ts`: Zod schema định nghĩa cấu trúc thư, danh sách thư và phản hồi nhận thưởng.
  - `content/mail/templates.json`: 5 mẫu thư khởi đầu từ NPC và hệ thống (chào mừng, quà táo từ vườn Thỏ, lời chúc Mèo Cam, quà thám hiểm, tri thức Cú Thông Thái).
  - Cập nhật `tools/content/check-content.ts` xác thực nội dung thư (1828 files OK).
- **Cơ sở dữ liệu & Migration**:
  - `apps/server/src/db/schema.ts`: Thêm bảng `mail` với khóa ngoại cascade `child_id`, unique index `(child_id, template_id)`, cờ `read` và `claimed`.
  - Migration `0009_mail.sql` tạo bảng `mail`.
- **Backend API**:
  - `mail-catalog.ts`: Đọc và nội suy tên nhân vật `{name}` trong thư.
  - `mail-routes.ts`:
    - `GET /api/mail`: Tự động khởi tạo thư cho hồ sơ mới, trả danh sách thư và số lượng thư chưa đọc.
    - `POST /api/mail/:id/read`: Đánh dấu đã đọc.
    - `POST /api/mail/:id/claim`: Nhận thưởng đính kèm ghi vào sổ thưởng `reward_ledger` một lần duy nhất (idempotent, an toàn khi gọi lặp lại hoặc đồng thời).
- **Frontend UI**:
  - `MailPanel` (`apps/web/src/ui/mail/mail-panel.tsx`, `mail.css`): Giao diện cuộn thư phong cách giấy da, lọc theo thẻ (Tất cả / Chưa đọc), chi tiết thư và nút nhận thưởng đính kèm.
  - Nút Hộp thư trên thanh điều hướng bên cạnh nút Cài đặt và Ba lô trên `HomeScreen`, hiển thị huy hiệu số thư chưa đọc màu đỏ nổi bật.
- **Unit & Integration tests**:
  - `packages/schema/src/mail.test.ts` (PASS 2/2).
  - `apps/server/src/mail/mail-routes.test.ts` (PASS 5/5: seed, mark read, idempotent claim, 404, IDOR protection).
  - `apps/web/src/ui/mail/mail-panel.test.tsx` (PASS 2/2).

### Pha 3: Thăng cấp kỹ năng (Skill Up Screen)
- **Chuỗi hoàn thành**: Cập nhật `completionScreens` trong `apps/web/src/ui/rewards/completion-sequence.tsx` để kích hoạt màn hình `'skill'` khi `completion.skillLevels` có kỹ năng tăng cấp (`levelAfter > levelBefore`).
- **Giao diện Skill Up**:
  - Hiển thị nhân vật cổ vũ `MiuPortrait`.
  - Hiển thị từng kỹ năng được lên cấp kèm biểu tượng sách, tên kỹ năng bản địa hóa, và chuyển đổi cấp `Lv.{before} → Lv.{after}`.
  - Lời chúc mừng thân thiện, không dùng các thuật ngữ gây áp lực.
- **Styling & i18n**: Bổ sung `reward-skill-up-item`, `reward-skill-name` trong `rewards.css` và khóa dịch `completion.skillTitle`, `completion.skillBody`.
- **Unit tests**: `apps/web/src/ui/rewards/rewards.test.tsx` (PASS 12/12).

---

## 3. Kết quả các cổng kiểm định (Quality Gates)

| Lệnh kiểm tra | Kết quả | Ghi chú |
| --- | --- | --- |
| `pnpm assets:check` | PASS | Tất cả asset đạt chuẩn |
| `pnpm content:check` | PASS | 1828 file nội dung hợp lệ |
| `pnpm test` (targeted) | PASS | Toàn bộ test liên quan đến cài đặt, thư, quest và skill up đều pass |
| `pnpm typecheck` | PASS | TypeScript không lỗi ở cả `apps/server`, `apps/web`, `packages/schema` |
| `pnpm lint` | PASS | 0 warning, 0 error |
| `pnpm --filter @miu/web build` | PASS | Bundle web hoàn tất không lỗi |
| `pnpm security:dist` | PASS | Quét bảo mật bundle web sạch, không lộ đáp án |

---

## 4. Danh sách commit

1. `564731bc`: `feat(ui): add comprehensive grouped settings for audio, voice, language, bots, and display`
2. `6f2c3d58`: `feat(mail): add in-game mailbox with seeded letters and idempotent claim`
3. `78093e08`: `feat(rewards): add skill up screen in quest completion sequence`
