---
phase: 3
title: "Lan truyền trong game: link mời bạn, thẻ khoe kết quả, tổng kết tuần"
status: pending
tier: L
dependsOn: [1, 2]
---

# Phase 3 — Lan truyền trong game

## Mục tiêu

Người chơi tự kéo bạn vào: mời bằng một link, khoe kết quả bằng một thẻ có ảnh, phụ huynh chuyển tiếp tổng kết tuần. Không lộ danh tính ai.

## Quyết định (Jev, 12/10/2026)

Link mời dùng một lần, thu hồi được, có hạn, cùng chặn và báo cáo đã có; việc kiểm duyệt (xem báo cáo, giới hạn chat/giọng nói) vẫn tạm dừng và sẽ mở lại thành plan riêng. Jev 0,56 (làm kiểm duyệt trước 0,43; `escalate`, áp dụng theo lệ). Thẻ tuần dùng dữ liệu có sẵn (Jev 0,99).

## Yêu cầu

1. **Link mời bạn**:
   - Bảng mới `player_invites` (`id`, `code_hash` sha256 duy nhất, `child_id` → `child_profiles` cascade, `created_at`, `expires_at` 7 ngày, `accepted_at`, `accepted_by` → `child_profiles` set null, `revoked_at`); migration qua `drizzle-kit generate`. Mã là 128 bit ngẫu nhiên (base64url), chỉ lưu hash; link `/moi/<mã>` không chứa id.
   - `POST /api/invites` (người chơi đang chọn) tạo mã, tối đa 5 mã còn hiệu lực mỗi người chơi; `DELETE /api/invites/:id` thu hồi; `GET /api/invites` liệt kê mã của chính mình (không trả mã gốc sau lúc tạo).
   - `POST /api/invites/:code/accept`: kiểm mã, hạn, chưa dùng, chưa thu hồi, không tự mời, không chặn nhau, `FRIENDS_MAX` cả hai phía; tạo bạn bè bằng hàm mới `befriendByInvite(tx, a, b)` trong `friend-store.ts` (dùng `lockPlayers`, `blockedEitherWay`, xóa lời mời đang chờ giữa hai người, idempotent), đánh dấu mã đã dùng; phát `PlayerEvent` để người mời nhận `friend-news` qua hub; phát `invite_accepted`. Mã sai, hết hạn, đã dùng đều trả 404.
   - Web: nút "Mời bạn" trong màn Bạn bè (tạo, sao chép/Web Share, danh sách mã còn hiệu lực, nút thu hồi); trang SPA `/moi/:code` giới thiệu ngắn, nút "Chơi cùng bạn" lưu `inviteCode` theo cơ chế giữ đích của phase 2 rồi sang đăng nhập; sau `RequireActivePlayer` gọi accept và báo kết quả.
   - Test: IDOR (mã/thu hồi của người khác → 404), mã giả, hết hạn, đã dùng, đã chặn, vượt giới hạn, gọi accept đồng thời hai lần chỉ một lần thành công.
2. **Thẻ khoe kết quả**: màn hoàn thành quest có nút phụ "Khoe kết quả" (phần chép vào vở vẫn là chính). Web Share API trên điện thoại, sao chép link trên máy tính. Link là trang bài (phase 2) kèm `utm_source=share&utm_medium=share&utm_campaign=result`; tùy chọn "kèm lời mời" tạo một mã mời mới và thêm `moi=<mã>` (trang bài chuyển mã vào cơ chế giữ đích). Thẻ xem trước là ảnh theo bài, không tên, không số liệu riêng. Phát `share` (`method`, `content_type: result`).
3. **Tổng kết tuần cho phụ huynh**: trong khu phụ huynh, nút "Chia sẻ tuần này" tạo ảnh bằng canvas (font từ origin) gồm phút chơi tuần này và tổng số bài/quest đã xong (`ProgressWeek.minutes`, `counts` có sẵn), không tên bé, chia sẻ bằng Web Share (`files`) hoặc tải ảnh; kèm link trang chủ với `utm_campaign=weekly`. Không tạo trang công khai chứa dữ liệu người chơi.
4. Chữ mới vào `vi.json`/`en.json`; giọng hợp cả bé lẫn người lớn.

## Tệp

- Tạo: `apps/server/src/invite/{invite-store,invite-routes}.ts` cùng test; migration trong `apps/server/drizzle/`; component trong `apps/web/src/ui/{friends,quest,parent}/`; route `/moi/:code`.
- Sửa: `apps/server/src/db/schema.ts`, `apps/server/src/friend/friend-store.ts`, `apps/server/src/player/` (player events), `apps/server/src/app.ts`, `packages/schema/src/` (DTO lời mời), `apps/web/src/ui/app-shell.tsx`, i18n, `apps/web/e2e/screens.spec.ts`, một E2E mới trong bộ smoke: link mời → đăng nhập (mật khẩu E2E) → đồng ý → tạo nhân vật → hai người là bạn.

## Kiểm

- Unit server và web như trên; E2E luồng mời; ảnh màn hình màn Bạn bè có nút mời, màn `/moi/:code`, màn hoàn thành quest có nút khoe, thẻ chia sẻ tuần (hai khổ).
- Gate + build web + E2E smoke.

## Rủi ro

- Kiểm duyệt đang tạm dừng trong khi người lạ có thể vào chơi (đăng nhập Google đã mở): mã một lần và thu hồi giảm rủi ro link lộ; mở lại kiểm duyệt là plan riêng nên làm sớm.
