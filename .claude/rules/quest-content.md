---
paths:
  - "content/**"
  - "packages/quest/**"
---

# Quest và nội dung

Lý do: Master Plan v3 §3, §5, §11.

- Quest, kỹ năng, phần thưởng mô tả bằng JSON trong `content/`, validate bằng schema Zod ở `packages/schema`; thêm quest không sửa code.
- Mỗi quest đi đủ 8 pha (Hook, Explore, Learn, Challenge, Decision, Finale, Reward, Unlock) và trả lời được 7 câu (đóng vai ai, ở đâu, mục tiêu, chơi gì, kiến thức nào, nhận gì, mở khóa gì). Không chỉ "đọc, trả lời, đúng sai, tiếp tục".
- Mọi thử thách dùng chung ba lớp hỗ trợ: Hướng dẫn, Gợi ý, Đáp án kèm giải thích; xem đáp án không khóa tiến trình.
- Subject (môn) và Skill (kỹ năng) tách hai tầng; Skill XP ghi theo skill id trong `content/learning/skills.json`.
- `packages/quest` là TypeScript thuần: không import `three`, React hay DOM; dùng chung web và server.
- Mở khóa: quest mở khi BẤT KỲ quest nào liệt kê nó trong `unlock` đã xong; quest không ai liệt kê thì mở từ đầu. Catalog từ chối quest chỉ tới được qua vòng `unlock` (server không khởi động).
- Id nội dung dạng kebab-case, không đổi sau khi đã có tiến độ người chơi tham chiếu.
- Nội dung học là bản nháp của AI; giáo viên duyệt trước khi tới trẻ.
