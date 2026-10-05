# Môn English: kỹ năng, quest và trò chơi cho lớp 2

**Trạng thái:** đã duyệt (04/10/2026); nguồn đã chốt (người sở hữu, 05/10/2026: Tiếng Anh 2 Global Success), hoãn theo người sở hữu (05/10/2026: làm sau) · **Tier:** XL · **Nhánh:** `main` · **Ngày:** 04/10/2026
**Nguồn:** Master Plan §5 (Subject: Toán, Tiếng Việt, **English**; kỹ năng "English Challenge" ở §6), §8c (song ngữ).

## Kết quả mong muốn

Bé chọn một quest tiếng Anh như chọn quest Toán hay Tiếng Việt: học từ vựng, mẫu câu ngắn, nghe và nói theo, có thưởng và Skill XP riêng; nội dung bám chương trình tiếng Anh lớp 2 và hợp bối cảnh từng map (chợ: đồ ăn, thư viện: đồ dùng học tập, nông trại: con vật…).

## Không làm (ghi rõ)

- Không commit PDF hay ảnh trang sách (PDF ở iCloud, `pnpm private:sync` chép vào `.data/sgk/src/`).
- Không thu giọng của bé lên server (giữ chính sách hiện nay: bản ghi chỉ nằm trong trình duyệt).
- Chữ của sách đưa vào game nguyên văn, như Toán 2 và Tiếng Việt 2: từ vựng, mẫu câu, bài nghe/đọc, câu lệnh; chỉ thêm lời dẫn của nhân vật quanh bài tập.

## Hiện trạng đo được (04/10/2026)

- `content/learning/skills.json`: môn `english` có **1** kỹ năng; không quest nào có môn English trong `content/quests`.
- Đã có sẵn: đọc to vi-VN/en-US bằng Web Speech (S3 của plan song ngữ), cơ chế `speak` trong schema quest, lớp `t()` và `locales/en`.
- Kiểm kê sách và độ phủ (`content/curriculum/`, `pnpm content:gaps`) hiện chỉ có Toán 2 và Tiếng Việt 2.

## Pha

| Pha | Tier | Nội dung | File sở hữu |
| --- | --- | --- | --- |
| 1 | M | Chốt nguồn và kiểm kê: danh sách chủ đề, từ vựng, mẫu câu theo đơn vị bài; ghi vào `content/curriculum/` cùng định dạng kiểm kê hiện có để `content:gaps` đo độ phủ | `content/curriculum/**`, `tools/content/**` |
| 2 | S | Khung kỹ năng English: nghe nhận từ, đọc từ, ghép từ-hình, mẫu câu, nói theo (6–8 kỹ năng, thêm vào `skills.json`, đường cong cấp) | `content/learning/skills.json`, `content/progression/**` |
| 3 | M | Cơ chế dùng lại: `connect` (từ–hình), `fill-blank`, `quiz` có nghe, `speak` (nghe–nhắc lại, tự chấm bằng bé nghe lại, không máy chấm giọng); thêm `listen-pick` (nghe chọn hình) nếu chưa đủ; dùng icon Fluent Emoji làm hình | `packages/schema`, `apps/web/src/ui/challenge/**` |
| 4 | XL | Viết quest: chia các bài theo bối cảnh 12 map (mỗi map ≥ 4 quest), có NPC tiếng Anh riêng (ví dụ cô bán hàng ở chợ nói "How many apples?"), mỗi quest trả lời 7 câu của Master Plan; không lặp câu | `content/quests/**`, `content/world/targets.json`, `looks.json` |
| 5 | M | Minigame tiếng Anh (≥ 12: nối từ, bắt chữ cái rơi, bingo từ, nhớ thẻ) qua khung minigame sẵn có | `apps/web/src/ui/minigame/games/**`, `content/minigames/**` |
| 6 | S | Độ phủ: `content:check` đỏ khi tụt; trang review thêm bảng English; phiếu từ vựng in cho phụ huynh (kiểu phiếu viết) | `tools/content/**`, `apps/web/review.html`, `apps/web/src/ui/parent/worksheets/**` |

## Phụ thuộc và file dùng chung

- Cần S2 của plan song ngữ xong (dịch UI/NPC) để quest English không lẫn dòng Anh dịch với nội dung dạy.
- Dùng cơ chế mới từ `boss-skill-check-new-mechanics` (logic, tìm đồ vật) nếu muốn đa dạng; không bắt buộc.
- Sinh lại map đụng generator: một phiên một lúc.

## Tiêu chí xong

- `pnpm content:gaps` báo 100% mục kiểm kê tiếng Anh được phủ; `content:check` đỏ khi tụt.
- Mỗi map có quest English chơi trọn vòng; thưởng và Skill XP English do server tính.
- Không có câu trùng ≥ 16 ký tự giữa các quest (luật chống lặp hiện hành).
- Giáo viên duyệt mẫu (việc của người) trước khi bật hàng loạt.

## Câu hỏi mở (cần người sở hữu)

1. ~~Nguồn nội dung~~ **Đã chốt lại (người sở hữu, 05/10/2026): sách Tiếng Anh 2 Global Success.** Bản người sở hữu có hiện là bản mẫu 40 trang (`sgk/ta2-global-success-mau.pdf` trong iCloud, kê ở `tools/private/private-files.json`, sha256 kiểm bằng `pnpm private:sync`); kiểm kê và quest làm theo phần có trong bản mẫu, phần còn lại chờ bản đủ. Thay quyết định cũ của Jev (04/10/2026, `reports/jev-261004-1648-open-questions.md`: tự viết theo khung chương trình, không chép chữ). Cân nhắc ban đầu: dùng sách nào? Tùy chọn: (a) bộ SGK tiếng Anh lớp 2 đang dùng ở trường của bé (sát chương trình nhưng có bản quyền, chỉ dùng kiểm kê chủ đề và tự viết lời mới, không chép nguyên văn); (b) tự soạn theo khung chương trình Bộ GD&ĐT, không phụ thuộc sách (an toàn bản quyền, cần giáo viên duyệt). **Đề xuất (b)**, đối chiếu chủ đề với sách (a) để bé học khớp bài ở lớp.
2. ~~Giọng người thật~~ **Đã chốt (Jev 04/10/2026 (`reports/jev-261004-1648-open-questions.md`)): giữ giọng trình duyệt.** Cân nhắc ban đầu: có cần phát âm giọng người thật (thu âm) thay giọng trình duyệt không? Tốn công người và chi phí; đề xuất giữ giọng trình duyệt ở đợt này.
