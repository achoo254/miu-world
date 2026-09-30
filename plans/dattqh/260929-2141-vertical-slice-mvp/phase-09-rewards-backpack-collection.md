---
phase: 9
title: "Hoàn thành, Level Up, mở khóa; Ba lô + Bộ sưu tập"
status: completed
priority: P1
effort: "M"
dependencies: [3, 8]
---

# Phase 9: Hoàn thành, Level Up, mở khóa; Ba lô + Bộ sưu tập (SLICE-10, 11; task #19, #20)

## Goal
Khoảnh khắc thưởng (M2.9/M3.11), Level Up và Mở khóa (NEW SCREEN MVP), Ba lô (M3.5), Hồ sơ + Kỹ năng + Bộ sưu tập (M1.7 một phần) — mọi số liệu từ server.

## Requirements
<!-- Updated: Validation - Jev stars_rule=three_stars_minus_support_and_mistakes (0.94/0.89) và support_answer_penalty=xp_minus_10_percent (0.72/0.58): sao và XP thực nhận lấy từ response (`stars`, `xpAwarded`), server đã lưu; UI không tự tính -->
- Hoàn thành nhiệm vụ: sao (1–3, từ `stars` của response), +XP thực nhận (`xpAwarded`; nếu đã xem đáp án là 90 thay vì 100, nói lời khích lệ, không hiện chữ "phạt"), +Xu, vật phẩm, Skill XP (icon Fluent Emoji); nút "Về bản đồ" / "Tiếp tục khám phá"; rương trên map mở (set-world-state).
<!-- Updated: Red Team - đường cong level: ngưỡng Lv.2 là 100 XP (content/progression/level-curve.json), quest thưởng 100 XP; nếu có xem đáp án thì 90 XP và KHÔNG lên Level -->
- Level Up của ch1 là xác định: không xem đáp án → 100 XP → Lv.1→2; đã xem đáp án → 90 XP → không Level Up (ghi rõ trong test); màn Level Up chỉ dựa `levelAfter > levelBefore`.
- Level Up (khi `levelAfter > levelBefore`), Skill Up (khi skill level tăng), Mở khóa (khi `unlocked` có chapter/region): màn chúc mừng lần lượt, dữ liệu từ response bước cuối; không tự tính.
- Ba lô (M3.5): tab Tất cả/Vật phẩm/Nhiệm vụ; ô vật phẩm + số lượng từ `GET /api/inventory`; chi tiết vật phẩm (tên, mô tả, dùng ở đâu) từ `content/items/*.json` (schema + content:check).
- Hồ sơ (M1.7): Kỹ năng (Subject → Skill level từ `/api/progress`), Bộ sưu tập (vật phẩm/huy hiệu đã có, ô khóa cho chưa có), Túi đồ; Hành trình/Thành tích để trống "Sắp có" (V1).
- Game `stop()` khi mở Ba lô/Hồ sơ.

## Files
- Create: `apps/web/src/ui/rewards/*.tsx`, `apps/web/src/ui/backpack/*.tsx`, `apps/web/src/ui/profile/*.tsx` (+ test), `content/items/*.json`
- Modify: `packages/schema/src/content.ts` (ItemCatalog), `tools/content/check-content.ts`, `apps/server/src/quest/quest-routes.ts` (nếu cần chi tiết item trong DTO)

## Steps
1. Test trước: màn thưởng hiển thị đúng số từ response (stub), không hiện khi `repeated`; Level Up chỉ khi tăng; sao và XP thực nhận khớp response (cả trường hợp 90 XP); Ba lô khớp inventory; Kim cương và chuỗi ngày không xuất hiện.
2. Item catalog + UI.
3. E2E nối tiếp quest-flow: hoàn thành ch1 không xem đáp án → màn thưởng 100 XP → Level Up Lv.1→2 → Mở khóa ch2 → Ba lô có Lá thần.

## Verification
- `pnpm vitest run`; E2E `quest-flow` trọn vòng xanh

## Kết quả (2026-09-30)
- `ui/rewards/completion-sequence.tsx`: tối đa 3 màn (Thưởng → Lên cấp nếu `levelAfter > levelBefore` → Mở khóa nếu `unlocked` có), một chạm/Esc để qua; sao, `xpAwarded`, Xu, vật phẩm, Skill XP (kèm "Kỹ năng lên cấp" khi `skillLevels` tăng) đều từ response; 90 XP có lời khích lệ, không chữ "phạt"; chỉ hiện với call trả `completion` (không khi `repeated`).
- Catalog vật phẩm `content/items/*.json` + `packages/schema/src/item.ts` (không chung `content.ts` với plan SGK); `content:check` kiểm schema, tên file = id, icon có trong UI, mọi item quest thưởng đều có mô tả (bỏ ghi chú "chưa kiểm item").
- Ba lô: `/backpack` (từ Home) và hộp thoại trên `/play` (HUD, game dừng render); tab Tất cả/Vật phẩm/Nhiệm vụ từ `GET /api/inventory`. Hồ sơ `/profile` (bấm badge ở Home): kỹ năng theo môn, bộ sưu tập (ô khóa cho món chưa có), Hành trình/Thành tích "Sắp có".
- E2E `quest-flow`: hoàn thành ch1 không xem đáp án → 3 sao, +100 XP, Lá thần → Lv.1→2 → mở ch2 (sắp có) → Về bản đồ (ch1 xong, Lv.2) → Ba lô và Bộ sưu tập có Lá thần. `challenges`: có xem đáp án → 90 XP.

## Risk
- Chuỗi màn chúc mừng dài làm trẻ sốt ruột: cho bỏ qua bằng một chạm, tổng ≤ 3 màn.
