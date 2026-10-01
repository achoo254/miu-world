---
paths:
  - "content/**"
  - "packages/quest/**"
---

# Quest và nội dung

Lý do: Master Plan v3 §3, §5, §11.

- Quest, kỹ năng, phần thưởng mô tả bằng JSON trong `content/`, validate bằng schema Zod ở `packages/schema`; thêm quest không sửa code.
- Mỗi quest đi đủ 8 pha (Hook, Explore, Learn, Challenge, Decision, Finale, Reward, Next) và trả lời được 7 câu (đóng vai ai, ở đâu, mục tiêu, chơi gì, kiến thức nào, nhận gì, tiếp theo đi đâu). Không chỉ "đọc, trả lời, đúng sai, tiếp tục".
- Mọi thử thách dùng chung ba lớp hỗ trợ: Hướng dẫn, Gợi ý, Đáp án kèm giải thích; xem đáp án không khóa tiến trình.
- Subject (môn) và Skill (kỹ năng) tách hai tầng; Skill XP ghi theo skill id trong `content/learning/skills.json`.
- `packages/quest` là TypeScript thuần: không import `three`, React hay DOM; dùng chung web và server.
- Không có mở khóa (người sở hữu, 01/10/2026): mọi map đã dựng và mọi quest mở từ đầu, không quest nào chờ quest khác xong. Schema không có trường `unlock`; bước/pha cuối `next` chỉ kể chuyện tiếp theo đi đâu, không mở gì. Map chưa dựng hiện "Sắp có", không khóa theo level. (Trang phục mở theo level/quest là phần thưởng, không thuộc luật này.)
- Quest SGK (`tv2-*`, `toan2-*`) bắt buộc có `lesson` (id bài trong `content/curriculum`); danh sách quest và HUD hiện sách, tên bài, trang in của bài đó. Mọi `curriculumRef`, phiếu viết và bài đọc (`texts[].section`) của quest phải thuộc đúng bài ấy.
- Id nội dung dạng kebab-case, không đổi sau khi đã có tiến độ người chơi tham chiếu.
- `pnpm content:check` validate mọi file trong `content/` (CI chạy sau `assets:check`); file JSON mới phải có validator (catalog server hoặc tool asset).
- `content/quests/*.json` chứa đáp án: chỉ server đọc. Web và `packages/quest` không import (ESLint chặn); client nhận `QuestView` (bỏ `answer`, `support`).
- Nội dung học là bản nháp của AI; giáo viên duyệt trước khi tới trẻ.
