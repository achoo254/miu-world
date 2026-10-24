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
- Quest học khai `topic` (chủ đề trong `content/learning/topics/<môn>/`), mỗi bước học khai `objective`; đáp án số khai `expression` để máy tính lại. Nội dung học viết bằng lời của mình, không chép sách giáo khoa: `pnpm content:check` chặn chữ trùng vân tay SGK (`tools/content/no-textbook-copy.ts`); bài đọc khai `source` (`folk`, `public-domain` kèm năm mất, `original`). Chỉ quest trong `tools/content/textbook-copy-pending.json` (đang chờ viết lại, danh sách chỉ được co lại) còn giữ `lesson`, `curriculumRef`, `author`, `section` của sách. Plan: `plans/dattqh/261025-0029-original-learning-content/`.
- Id nội dung dạng kebab-case, không đổi sau khi đã có tiến độ người chơi tham chiếu.
- `pnpm content:check` validate mọi file trong `content/` (CI chạy sau `assets:check`); file JSON mới phải có validator (catalog server hoặc tool asset).
- `content/quests/*.json` chứa đáp án: chỉ server đọc. Web và `packages/quest` không import (ESLint chặn); client nhận `QuestView` (bỏ `answer`, `support`).
- Nội dung học là bản nháp của AI; giáo viên duyệt trước khi tới trẻ.
