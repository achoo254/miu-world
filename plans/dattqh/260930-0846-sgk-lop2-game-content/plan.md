---
title: "Nội dung SGK lớp 2 tập 1 (Toán, Tiếng Việt — Kết nối tri thức) thành kịch bản game"
description: "Đưa 100% nội dung Toán 2 tập 1 (7 chủ đề, 36 bài) và Tiếng Việt 2 tập 1 (4 chủ điểm, 18 tuần, 32 bài + 2 ôn tập) vào quest của Miu World; chạy song song với plan vertical slice trong worktree riêng."
status: in-progress
priority: P1
effort: "XL"
branch: dattqh/feat/sgk-lop2-content
tags: [content, game, backend, frontend]
blockedBy: []
blocks: []
created: 2026-09-30
---

# Nội dung SGK lớp 2 tập 1 thành kịch bản game

## Overview
Người sở hữu giao hai sách giáo khoa bộ Kết nối tri thức với cuộc sống (NXB Giáo dục Việt Nam, 2021), bản scan PDF không có lớp chữ:
- Toán 2 tập 1 (141 trang PDF): 7 chủ đề, 36 bài — số đến 100, tia số, thành phần phép tính, hơn kém, cộng trừ qua 10 trong phạm vi 20, bảng cộng/trừ, bài toán thêm bớt/nhiều hơn ít hơn, ki-lô-gam, lít, cộng trừ có nhớ trong phạm vi 100, điểm/đoạn thẳng/đường thẳng/đường cong/ba điểm thẳng hàng, đường gấp khúc, hình tứ giác, gấp cắt ghép xếp hình, vẽ đoạn thẳng, ngày–giờ, giờ–phút, ngày–tháng, xem đồng hồ và lịch, ôn tập học kì 1.
- Tiếng Việt 2 tập 1 (145 trang PDF): 4 chủ điểm (Em lớn lên từng ngày; Đi học vui sao; Niềm vui tuổi thơ; Mái ấm gia đình), 18 tuần, 32 bài; mỗi bài có Đọc, Viết (chữ hoa, nghe–viết, bảng chữ cái, phân biệt chính tả), Nói và nghe (kể chuyện), Luyện tập (từ ngữ, câu, dấu câu, viết đoạn), Đọc mở rộng; tuần 9 ôn tập giữa kì, tuần 18 ôn tập và đánh giá cuối kì.

Mục tiêu người sở hữu: **mọi mục nội dung trong hai sách có mặt trong kịch bản game** (quest trong game, hoặc phiếu viết ngoài game cho phần Viết). Đo được: `pnpm content:gaps` báo 100% mục kiểm kê được phủ đúng cơ chế, và `content:check` đỏ nếu thiếu (sau khi kích hoạt ở phase 10).

## Quyết định đã chốt

| # | Câu hỏi | Chốt | Nguồn |
| --- | --- | --- | --- |
| D1 | Dùng nội dung sách thế nào | Dùng **nguyên văn**. Sản phẩm phi thương mại; kể cả public vẫn dùng — quyết định của người sở hữu, không bàn thêm. Bảo mật, dữ liệu trẻ, bản quyền chưa phải mối quan tâm của plan này. | Người sở hữu 2026-09-30 |
| D2 | Nói và nghe | Thu âm **trên máy**, không gửi server; **bật mặc định**, chỉ quyền micro của trình duyệt chặn; không có/không cho micro thì bước vẫn xong | Người sở hữu + Jev `voice_recording_default` |
| D3 | Viết (chữ hoa, viết ứng dụng, nghe–viết, viết đoạn) | **Phiếu viết ngoài game**, in từ khu phụ huynh | Người sở hữu |
| D4 | Bản đồ | Tiếng Việt ở **Khu rừng bí mật** (mỗi tuần một chương), Toán ở **Trường học** (7 chủ đề = 7 khu, đi lại tự do, không cổng giữa khu) | Người sở hữu + Jev `school_zone_gates` |
| D5 | Cách ly với phiên VS | **Worktree + branch riêng**: `../miu-world-sgk`, branch `dattqh/feat/sgk-lop2-content`; merge vào `main` sau mỗi phase (rebase trước) | Jev `parallel_isolation` |
| D6 | Bài và chương | Một chương **gom nhiều quest**: TV mỗi tuần 2 bài; Toán mỗi chủ đề 4–7 bài; màn khu vực liệt kê chương và mọi quest của chương (D12: không khóa) | Jev `chapter_grouping` |
| D7 | Thay `forest-ch2` | Giữ `forest-ch2` và level curve tới khi **VS phase 10 đã commit**; quest SGK ở trạng thái `draft` tới lúc đó; nối lại trong một commit ở phase 10 | Jev `forest_ch2_timing` |
| D8 | Độ trung thành với sách | Nội dung sách vào game **giống 100%**: câu lệnh, bài đọc, số, lựa chọn, đáp án, dấu câu, xuống dòng — không diễn đạt lại, không đổi số. Quest chỉ được THÊM lời dẫn của nhân vật quanh bài tập. Máy kiểm: bước có `curriculumRef` phải chứa nguyên văn `prompt` của item; `texts` phải trùng nguyên văn `text` của section; đáp án phải trùng đáp án kiểm kê (phase 3, `content:check`). Lý do: chơi game chính là làm bài tập thật của trẻ, lệch chữ thì bé học/đọc ở lớp bị lệch. | Người sở hữu 2026-09-30 |
| D9 | Phong phú, không lặp | Mỗi quest có câu chuyện, bối cảnh, NPC, lời thoại riêng; không copy khung quest rồi đổi chữ. Mọi vòng lặp (thử lại khi sai, khen khi đúng, lời NPC, hoạt cảnh) ra câu mới, không lặp liền. Máy kiểm: (1) mỗi bước học của quest SGK có kho `feedback` ≥ 3 câu đúng + ≥ 3 câu sai, không trùng trong quest; server trả câu xoay vòng theo bộ đếm lượt, không lặp liền; (2) `content:check` lỗi khi một câu lời dẫn/thoại/phản hồi (không phải chữ SGK) xuất hiện ở hai quest, hoặc hai quest SGK có cùng chuỗi cơ chế các bước. Chữ SGK vẫn nguyên văn (D8) — phong phú nằm ở phần bao quanh. Chấp nhận code thêm. | Người sở hữu 2026-09-30 |
| D10 | Nghiệm thu mẫu trước | Trước khi viết hàng loạt quest (phase 4, 5) và map chương (phase 9): làm 3–5 quest mẫu đa dạng (khác tuần/dạng bài) + hoạt cảnh + UI cơ chế, đưa người sở hữu duyệt qua trang nghiệm thu (kịch bản từng bước, chữ SGK đánh dấu, ảnh màn hình từng cơ chế, bản chơi thử). Chỉ mở rộng sau khi duyệt; góp ý áp vào mẫu trước. Kiểm kê SGK không phải chờ. | Người sở hữu 2026-09-30 |
| D12 | Không khóa bài | Quest SGK **không khóa nhau**, bé làm nhảy cóc theo bài cô giao. Quest SGK không `unlock` quest nào, và không quest nào `unlock` quest SGK: mọi bài mở từ đầu. Máy kiểm: schema (`a textbook quest unlocks nothing`) và catalog (`unlocks textbook quest`). Bước pha `unlock` của quest chỉ còn là lời nhử sang bài sau, không mở gì. Thay phần mở khóa tuyến tính ở phase 3, 4, 5, 10. | Người sở hữu 2026-09-30 |
| D13 | Hiện trang SGK | Nơi nào nêu tên quest SGK (danh sách quest của khu vực, "Nhiệm vụ hôm nay", ô "Nhiệm vụ hiện tại") đều hiện **sách, tên bài và trang in**, ví dụ "Tiếng Việt 2, tập một · Bài 1. Tôi là học sinh lớp 2 · Trang 10–12", vì cô giao bài theo số trang hoặc tên bài. Quest SGK khai `lesson` (id bài kiểm kê); server lấy tên bài và trang từ kiểm kê lúc khởi động, đưa vào `QuestView.textbook`. `content:check` lỗi khi bài không có trong kiểm kê hoặc `curriculumRef`/phiếu viết thuộc bài khác. | Người sở hữu 2026-09-30 |
| D11 | Luôn nói đi đâu | Mỗi quest SGK khai `places` (tên nơi của từng target, vùng của từng bước `search`); bước nào đổi nơi thì có dòng `goTo` nêu đúng tên nơi đó, hiện ở ô "Nhiệm vụ hiện tại" khi bé đang đi; `title` vẫn là tiêu đề cảnh. `content:check` lỗi khi thiếu. Mũi tên vàng chỉ target của bước hiện tại. | Người sở hữu 2026-09-30 |

Chi tiết Jev: `plans/dattqh/reports/jev-260930-sgk-plan-decisions.md`.

## Phases

| # | Phase | Tier | Phụ thuộc | Status |
|---|-------|------|-----------|--------|
| 1 | [Kiểm kê SGK thành dữ liệu](./phase-01-textbook-inventory.md) | L | — | Done (2 sách complete, 1.768 mục; report `reports/sgk-inventory-260930.md`) |
| 2 | [Schema + runtime cho cơ chế mới](./phase-02-quest-schema-new-mechanics.md) | L | — (VS phase 3 đã commit) | Done (trên `main` từ 6db35d6) |
| 3 | [Kỹ năng, quy tắc cơ chế, cổng phủ nội dung](./phase-03-skills-mapping-completeness-gate.md) | M | 1, 2 | Done (2 quest mẫu + công cụ phủ/nguyên văn/không lặp) |
| 4 | [Kịch bản Tiếng Việt — 18 tuần](./phase-04-tieng-viet-quests.md) | XL | 3 | Done (01/10/2026: 34/34 quest, phủ 735/735 mục — 628 trong game, 107 qua phiếu; giọng thoại vui nhộn theo nghiệm thu; đáp án do người viết chọn ở `reports/sgk-tv2-teacher-flags.md`) |
| 5 | [Kịch bản Toán — 7 chủ đề](./phase-05-toan-quests.md) | XL | 3 | Done (01/10/2026: 36/36 quest, phủ 1033/1033 mục — 992 trong game, 41 qua phiếu; đáp án số tính bằng code; `reports/sgk-toan2-teacher-flags.md`) |
| 6 | [Phiếu viết ngoài game](./phase-06-writing-worksheets.md) | M | 1; UI sau VS phase 1 | Done (API + trang Phiếu viết trong khu phụ huynh, in A4; E2E `worksheets` in 2 PDF mẫu) |
| 7 | [Thu âm trên máy](./phase-07-on-device-voice.md) | M | 2; sau VS phase 1, 8 | Done (thu/nghe lại trên máy, CSP `media-src blob:`; E2E `speak`) |
| 8 | [UI cơ chế mới](./phase-08-new-mechanic-ui.md) | L | 2; sau VS phase 8 | Done (màn cơ chế, minh họa, E2E `sgk-mechanics`); chờ nghiệm thu UI |
| 9 | [Bản đồ Trường học + chương rừng 2–19](./phase-09-school-map-forest-chapters.md) | L | 4, 5; sau VS phase 5, 6, 7 | Pending |
| 10 | [Kích hoạt, cổng 100%, trang review](./phase-10-completeness-review-gate.md) | M | 1–9; sau VS phase 10 | Pending |

"VS" = plan `plans/dattqh/260929-2141-vertical-slice-mvp/` chạy ở phiên khác trên `main`.

Song song trong plan này: 1 ‖ 2 ngay từ đầu; sau 3: 4 ‖ 5 ‖ 6 (4, 5 chia tiếp theo chủ điểm/chủ đề); 7, 8 khi VS xong phase tương ứng; 9 sau 4, 5 và VS 5–7; 10 sau VS 10.

## Trạng thái `draft` (chống đỏ CI khi nội dung đang viết)
- Quest `tv2-*`/`toan2-*` viết với `status: "draft"`: cùng schema với quest `active`, KHÔNG nạp vào catalog server (không chơi được, không vào `QuestView`, không bị kiểm target trên map), nhưng `content:check` vẫn validate schema, `curriculumRef`, `lesson` (D12: quest SGK không có chuỗi `unlock`).
- Kiểm kê (`content/curriculum/<book>/book.json` có `status: "draft" | "complete"`): kiểm đủ bài/đủ trang chỉ LỖI khi `complete`; `draft` chỉ cảnh báo.
- Phase 10 (sau VS 10): xóa `forest-ch2` (và `unlock` của `forest-ch1` trỏ tới nó), đổi draft → active theo chương khi target đã có trên map; không nối `forest-ch1` với bài SGK nào (D12).

## Sở hữu file

### Trong plan này (chỉ phase ghi tên sửa)

| Phase | File/thư mục sở hữu |
| --- | --- |
| 1 | `content/curriculum/{toan2-t1,tv2-t1}/**`, `packages/schema/src/curriculum.ts` (+ test), `tools/sgk/**`, `tools/content/check-curriculum.ts` (+ test, phần kiểm kê) |
| 2 | `packages/schema/src/content.ts` (CHỈ khối quest step/quest), `packages/schema/src/game.ts` (`StepAnswer`, `QuestView`), `packages/quest/src/{check-answer,quest-progress,quest-catalog}.ts` (+ test), `apps/server/src/content/content-catalog.ts` (bỏ qua draft), `apps/server/test/fixtures/quests/**`, `apps/server/test/quest-solution.ts` |
| 3 | `content/learning/skills.json`, `tools/content/check-curriculum.ts` (phần phủ + quy tắc cơ chế — sau phase 1), `content/quests/{tv2-t01-b01,toan2-cd1-b01}.json` (mẫu, draft), `package.json` (`content:gaps`) |
| 4 | `apps/server/src/quest/tv2-quests.test.ts`, `content/quests/tv2-*.json` (4a `tv2-t0[1-4]*`, 4b `tv2-t0[5-9]*`, 4c `tv2-t1[0-3]*`, 4d `tv2-t1[4-8]*`) |
| 5 | `apps/server/src/quest/toan2-quests.test.ts`, `content/quests/toan2-*.json` (5a chủ đề 1–2, 5b 3–4, 5c 5–6, 5d 7) |
| 6 | `packages/schema/src/worksheet.ts` (+ test), `apps/server/src/worksheet/**`, `apps/web/src/ui/parent/worksheets/**` |
| 7 | `apps/web/src/ui/challenge/speak/**`, `apps/web/e2e/speak.spec.ts`, `apps/web/src/content-security-policy.test.ts` (media-src) |
| 8 | `apps/web/src/ui/challenge/mechanics/**`, `apps/web/src/ui/challenge/illustrations/**`, `apps/web/e2e/sgk-mechanics.spec.ts` |
| 9 | `tools/world/generate-school-map.ts`, `tools/world/chapters/**`, `assets/generated/world/truong-hoc/**` (qua generator + `pnpm assets:manifest`); sau phase 2: `packages/quest/src/quest-catalog.ts` (entity theo region) |
| 10 | `apps/web/e2e/sgk-content.spec.ts`, `content/quests/forest-ch1.json` (bỏ `unlock` tới ch2), `content/quests/forest-ch2.json` (xóa), `plans/dattqh/reports/sgk-*`, docs (xem phase) |

### File dùng chung với VS (quy tắc thứ tự)

| File | VS phase dùng | Quy tắc |
| --- | --- | --- |
| `packages/schema/src/content.ts` | VS 5 (RegionCatalog), VS 9 (ItemCatalog) | Phase 2 chỉ sửa khối quest; VS thêm catalog ở cuối file. |
| `packages/schema/src/content.test.ts` | VS (thông điệp luật cơ chế, phiên bản đồng ý) | Phase 2 sửa có chủ đích thông điệp luật cơ chế; không đụng test đồng ý. |
| `tools/content/check-content.ts` | VS 1 (icon), VS 6 (entity), VS 9 (item) | Plan này chỉ thêm lời gọi `check-curriculum.ts` và đăng ký đúng thư mục lồng (`curriculum/toan2-t1/`, `curriculum/tv2-t1/`) — hàm `inFolder` chỉ khớp file nằm trực tiếp trong thư mục. |
| `apps/server/src/quest/quest-routes.test.ts` | VS 3 (đã commit), VS 9 | Phase 2 chuyển `solution()` ra `apps/server/test/quest-solution.ts`, đổi import; phase 10 cập nhật đoạn chơi ch1 thật (`unlocked: ['forest-ch2']`). |
| `apps/server/src/content/content-catalog.test.ts`, `packages/schema/src/game.test.ts` | VS | Chỉ phase 10 sửa (bỏ `forest-ch2`), sau VS 10. |
| `apps/web/src/ui/quest/quest-controller.ts`, `apps/web/src/ui/challenge/read-step.tsx` | VS 7 tạo controller, VS 8 thêm handler và `read-step` | Phase 7, 8 chỉ đăng ký handler mới và thêm `textRef`/nút nghe vào `read-step` sau VS 8. |
| `apps/web/playwright.config.ts`, `apps/web/package.json` (`e2e:ci`), `.github/workflows/ci.yml` | VS 1 | Sau VS 1: phase 7 thêm project `speak` (launchOptions micro giả), phase 8 `sgk-mechanics`, phase 10 `sgk-content`; `e2e:ci` của VS 1 chạy mọi project trừ `perf` nên CI tự nhận. |
| `apps/web/vite.config.ts` (CSP) | VS 1, VS 10 | Phase 7 thêm `media-src 'self' blob:` (phát lại bản ghi), kèm test CSP. |
| `content/world/regions.json`, `apps/web/src/game/game.ts`, `packages/voxel/src/world-entities.ts`, `apps/web/src/game/entities/**`, `apps/web/src/game-bridge/game-store.ts` | VS 5, 6, 7 | Phase 9 chạy sau VS 7: thêm region `truong-hoc`, nạp map theo region, trường `chapter` cho interactable và chỉ cho tương tác entity của chương đang chơi. |
| Màn chọn khu vực/chương (`apps/web/src/ui/region/**`) | VS 5 | VS 5 dựng theo hợp đồng D6: chương gom nhiều quest (đã ghi vào VS phase 5). |

## Kiến trúc chính
```
iCloud PDF ─ copy + sha256 ─▶ .data/sgk/src/*.pdf ─ tools/sgk/split-pages.py ─▶ .data/sgk/pages/*.pdf (gitignored)
        │ đọc từng trang: lượt 1 (ghi) + lượt 2 độc lập (đối chiếu, itemCount mỗi trang)
        ▼
content/curriculum/{toan2-t1,tv2-t1}/*.json   ── CurriculumBook (Zod): item có id ổn định, trang, nguyên văn, đáp án có kiểu
        │ curriculumRef (chỉ trên bước tương tác đúng cơ chế cho loại bài)
        ▼
content/quests/{tv2-*,toan2-*}.json            ── QuestDefinition (draft → active) + bước mới (classify, fill-blank, multi-select, clock, calendar, connect, speak, worksheet, read có audio)
apps/server/src/worksheet                      ── phiếu dựng từ kiểm kê lúc gọi (không bản sao thứ hai)
        │
pnpm content:gaps ── phủ theo sách/chủ đề/bài (trong game và qua phiếu tách riêng); content:check lỗi khi < 100% (phase 10)
```

## Success Criteria
- [ ] Kiểm kê đủ 100% trang nội dung hai sách (trừ bìa, lời nói đầu, mục lục, trang bản quyền, thuật ngữ): hai lượt đọc độc lập khớp số item từng trang; số bài khớp mục lục (Toán 36; TV 32 + 2 ôn tập)
- [ ] `pnpm content:gaps` = 100%: mọi item được ≥ 1 bước đúng cơ chế cho loại bài (hoặc phiếu cho phần Viết); `content:check` đỏ nếu thiếu
- [ ] 36 quest Toán (`truong-hoc`), 34 quest Tiếng Việt (`khu-rung-bi-mat`, ch2–19), mỗi quest đủ 8 pha, 7 câu, ≥ 2 cơ chế tương tác khác nhau (không tính `search`/`riddle`/`quiz`/`read`), `review: "teacher-pending"`
- [ ] Đáp án số (tính, đồng hồ, lịch) được tính lại bằng code từ biểu thức kiểm kê và khớp quest
- [ ] Cơ chế mới chơi được trên web (chuột, cảm ứng, bàn phím), có 3 lớp hỗ trợ, server chấm
- [ ] Thu âm trên máy: ghi, nghe lại được trong bản build (CSP cho phép `blob:`), âm thanh không gửi đi
- [ ] Phiếu viết in được cho mọi bài có phần Viết/Vận dụng
- [ ] Sau VS 10: `forest-ch2` bỏ, mọi quest SGK `active` và mở từ đầu, không bài nào khóa bài nào (D12)
- [x] Danh sách quest, "Nhiệm vụ hôm nay" và ô "Nhiệm vụ hiện tại" hiện sách, tên bài và trang in của quest SGK (D13)
- [ ] Gate (`assets:check`, `content:check`, `test`, `typecheck`, `lint`, web build, E2E `e2e:ci`) xanh trên branch và sau merge

## Rủi ro chính
| Rủi ro | Giảm thiểu |
| --- | --- |
| Đọc sai/sót từ ảnh scan (không OCR) | Hai lượt đọc độc lập mỗi trang, `itemCount` từng trang, lệch → ghi `readConfidence: low` và đọc lần ba; đáp án số tính bằng code; giáo viên duyệt theo số trang |
| iCloud đẩy PDF lên mây (file rỗng cục bộ) | Phase 1 copy PDF về `.data/sgk/src/` kèm sha256 trước khi tách |
| Xung đột với phiên VS | Worktree riêng (D5), bảng file dùng chung + thứ tự, rebase trước merge |
| CI đỏ khi nội dung đang viết | Trạng thái `draft` cho quest và kiểm kê |
| Hình minh họa sách | Vẽ lúc chạy (SVG đồng hồ, tia số, hình phẳng, cân, ca lít) + icon Fluent Emoji; mô tả hình ghi trong kiểm kê |
| ~70 quest khối lượng lớn | Chia gói song song theo chủ điểm/chủ đề; cổng phủ đo tiến độ |

## Dependencies
- VS phase 2, 3 đã commit (quest schema v2, API gameplay).
- VS phase 1 (UI kit, `e2e:ci`), 5 (regions, màn chương theo D6), 6 (entities v2), 7 (quest controller), 8 (khung thử thách), 10 (kết thúc MVP) trước các phase tương ứng ở bảng Phases.

## Red Team Review

### Session — 2026-09-30
**Findings:** 38 thô từ 4 reviewer (Security Adversary, Failure Mode Analyst, Assumption Destroyer, Scope & Complexity Critic), gộp còn 17: 11 Accept, 6 Reject (bỏ theo chỉ thị người sở hữu "bảo mật, dữ liệu trẻ, bản quyền chưa cần quan tâm", hoặc thiếu căn cứ). Áp dụng theo Jev `apply_red_team` = apply_all (0.87/0.79, auto).
**Severity breakdown (sau gộp):** 5 Critical, 8 High, 4 Medium

| # | Phát hiện | Mức | Quyết | Áp vào |
| --- | --- | --- | --- | --- |
| 1 | Hai phiên + nhiều agent chung một working tree, không cách ly, `git add -A`/stash quét nhầm file | Critical | Accept | D5 worktree; plan.md bảng dùng chung |
| 2 | Stub production giữ `unlock` trái `StubQuest.unlock.max(0)` (`content.ts:176-177`); đường production không gate nào chạy | Critical | Accept (bỏ hẳn cơ chế) | D1: bỏ `license`/lọc production |
| 3 | Độ phủ 100% đo sổ sách: sót item không vào mẫu số, bước `dialogue` cũng "phủ", phiếu tự phủ, đáp án tự so với mình | Critical | Accept | Phase 1 (lượt 2, itemCount), 3 (quy tắc cơ chế, phiếu tách riêng, biểu thức tính bằng code) |
| 4 | Lộ nguyên văn qua tunnel mở cho mọi tài khoản Google; `NODE_ENV` mặc định `development` | Critical | Reject | Chỉ thị người sở hữu: bảo mật/bản quyền không phải mối quan tâm |
| 5 | Ảnh chụp/PDF/nhãn map dẫn xuất từ sách vào `assets/` gắn CC0 và ship public | Critical | Reject | Như #4 |
| 6 | CI đỏ ngay khi file SGK đầu tiên vào (`check-content.test.ts:17-18`, `content-catalog.test.ts:22`) | High | Accept | Trạng thái `draft` (plan.md), phase 1–5 |
| 7 | Xóa `forest-ch2`/đổi level curve làm vỡ test và E2E của VS (`quest-routes.test.ts:415-428`, `game.test.ts:30`) | High | Accept | D7; phase 10; phase 3 bỏ chỉnh curve |
| 8 | Khóa Trường học chỉ ở client; `toan2-cd1-b01` mở từ đầu ở server (`quest-access.ts:31-34`) | High | Accept | Phase 3 quy ước mở khóa, phase 10 nối `forest-ch1` |
| 9 | Phase 2 bỏ sót consumer: `read.text` của ch1, `texts` không vào `QuestView`, thông điệp luật bị test ghim, answer dạng record không giới hạn | High | Accept | Phase 2 |
| 10 | Đăng ký `curriculum/`, `worksheets/` không khớp thư mục lồng (`check-content.ts:37`) | High | Accept | Phase 1, bảng dùng chung |
| 11 | CSP không có `media-src` → không phát lại được bản ghi (`vite.config.ts:16`) | High | Accept | Phase 7 |
| 12 | Deadlock target: phase 4/5 cần target mà phase 9 mới tạo; entity chương khác vẫn tương tác được | High | Accept | Draft không bị kiểm target; phase 9 trường `chapter` + chỉ tương tác chương đang chơi |
| 13 | Công tắc micro/cổng pháp chế chỉ trên giấy; Permissions-Policy đặt nhầm chỗ | High | Reject | Jev D2 bật mặc định; không còn cổng pháp chế; header bỏ |
| 14 | Project Playwright mới không được khai báo/không chạy trong CI; `e2e:ci` chưa có | Medium | Accept | Phase 7, 8, 10 + bảng dùng chung (sau VS 1) |
| 15 | Phiếu sinh ra thành bản sao thứ hai + generator; `mechanics-map.json` không có consumer lúc chạy | Medium | Accept | Phase 6 dựng từ kiểm kê lúc gọi; phase 3 quy tắc là hằng trong checker |
| 16 | Luật "≥ 2 cơ chế khác trắc nghiệm" để lọt quest đọc–trả lời (`content.ts:126-132`) | Medium | Accept | Phase 2, 3: luật chặt hơn cho quest SGK |
| 17 | Chương gom nhiều quest trái giả định màn chương VS 5 | Medium | Accept | D6; ghi hợp đồng vào VS phase 5 |

Reject thêm: tách nguyên văn sang repo riêng/submodule để xóa khỏi lịch sử git (trái D1); cổng giữa các khu Trường học (ngoài yêu cầu; Jev chọn không cổng).

### Whole-Plan Consistency Sweep
- Files reread: plan.md, phase-01 … phase-10
- Decision deltas checked: 9 (bỏ `license`/lọc production/allowlist/ESLint cấm curriculum; bỏ đồng ý draft-4, Permissions-Policy, công tắc micro; thêm `draft`; worktree; chương gom quest; phiếu từ kiểm kê; quy tắc cơ chế là hằng; `forest-ch2` sau VS 10; không cổng khu)
- Reconciled stale references: toàn bộ file viết lại theo quyết định mới
- Unresolved contradictions: 0

## Validation Log

### Session 1 — 2026-09-30
Người sở hữu giao TypeSafe Jev quyết (`jev-1.13.0`, Choice, `tools/decisions/jev-decide.py`, `TYPESAFE_TOKEN_FILE`), dùng lựa chọn Jev kể cả khi script `escalate`; chỉ thị: bảo mật, dữ liệu trẻ, bản quyền chưa cần quan tâm, không bàn lại việc dùng nội dung SGK.

| # | Câu hỏi | Stakes | Jev chọn | Xác suất / conf | Script | Áp vào |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `apply_red_team` | low | apply_all | 0.87 / 0.79 | auto | Red Team Review |
| 2 | `parallel_isolation` | medium | worktree_branch | 0.93 / 0.90 | auto | D5 |
| 3 | `vs_phase3_step_counters` | low | minimal | 0.62 / 0.43 | escalate | VS phase 3 (đã làm trước khi commit) |
| 4 | `voice_recording_default` | low | on_by_default | 0.97 / 0.96 | auto | D2, phase 7 |
| 5 | `chapter_grouping` | medium | group_per_chapter | 0.98 / 0.95 | auto | D6, VS phase 5 |
| 6 | `forest_ch2_timing` | low | after_vertical_slice | 1.00 / 1.00 | auto | D7, phase 10 |
| 7 | `school_zone_gates` | low | unlock_chain_only | 0.82 / 0.63 | auto | D4, phase 9 |

### Câu hỏi mở
Không còn câu chặn.

### Session 2 — 2026-10-01 (nghiệm thu mẫu D10)
Người sở hữu giao các mục cần quyết trên trang review cho Jev, tiêu chí duy nhất: game sinh động, trẻ không chán. Report: `plans/dattqh/reports/jev-261001-0941-review-decisions.md`.

| Câu | Jev chọn | Áp vào |
| --- | --- | --- |
| Nghiệm thu 6 mẫu | accept_with_changes (0.56) | D10 qua; phase 4, 5 viết tiếp |
| Giọng thoại | more_playful (0.51) | Lời dẫn của NPC vui nhộn, hài hước hơn ở mẫu và quest mới (chữ SGK giữ nguyên) |
| Độ dài | keep_one_quest (0.93) | Một quest mỗi bài |
| Phương án sai do AI đặt | keep (0.74) | Giữ |
| Đáp án AI tự chọn | keep_and_flag (0.52) | Giữ, đánh dấu cho giáo viên |
| Bước ôn thêm | keep (0.83) | Giữ |
| Điều chỉnh trình bày | keep (0.99) | Giữ |
| Dẫn đường | clear (0.71) | Giữ |
| Phiếu viết | keep (0.93) | Giữ |
