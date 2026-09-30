---
title: Màn chơi phù hợp và phong phú hơn
status: in-progress
created: 2026-09-30
---

# Màn chơi phù hợp và phong phú hơn

Quyết định: Jev, `../reports/jev-260930-1645-scene-ui-richness.md`. Áp cho mọi màn cơ chế (không đổi chữ SGK).

| # | Việc | Tier | File chính | Trạng thái |
|---|---|---|---|---|
| 1 | Âm thanh phản hồi (Kenney Interface Sounds đổi sang AAC vì Safari iPad không phát Ogg; theo công tắc âm thanh, nhiều biến thể) | S | mới `apps/web/src/ui/sound/**`, `tools/assets/build-sounds.ts` (`pnpm assets:sounds`), `assets/generated/sounds/` | Done |
| 2 | Khi đúng: sao lấp lánh + NPC nhún + tiếng; khi sai: lắc nhẹ + tiếng êm + NPC động viên | M | `ui/challenge/**`, `ui/dialogue/npc-portrait.tsx`, `ui/quest/quest-layer.tsx` | Done |
| 3 | NPC phản ứng (nhún khi nói, nghiêng khi nghĩ) | S | `ui/dialogue/**`, `ui/kit/scene.css` | Done |
| 4 | Chữ to hơn (bài ~22 px, đề ~20 px, nhãn ≥ 20 px), bảng vừa nội dung, khối mềm dày, ô ≥ 64 px | M | `ui/kit/scene.css`, `ui/challenge/**/*.css` | Done |
| 5 | Hàng tiến độ trên băng rôn | S | `ui/challenge/challenge-frame.tsx` | Done |
| 6 | Nút hỗ trợ theo lượt sai (Gợi ý sau lần sai đầu, Đáp án sau 2 lần sai; ẩn ở giao diện, server giữ nguyên cách tính sao) | S | `ui/challenge/support-panel.tsx` | Done |
| 7 | Màn hoàn thành theo trình tự (sau khi phiên kia xong file này) | S | `ui/rewards/**` | Pending |

Kiểm: test đơn vị từng phần, E2E `sgk-mechanics` (ảnh mới), `hud-layout`, full gate + e2e:ci. Tôn trọng `prefers-reduced-motion`.
