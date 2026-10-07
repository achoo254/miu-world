---
title: "Màn đấu boss thành trận đấu chơi được"
description: "Đấu boss trong thế giới 3D đang chạy, boss thật đứng trước mặt, mỗi lượt trả lời bằng một động tác chơi đổi liên tục; server vẫn chấm đúng/sai, HP và thưởng."
status: completed
priority: P2
tier: L
branch: main
tags: [web, game, boss, ux]
blockedBy: []
blocks: []
created: 2026-10-07
---

# Màn đấu boss thành trận đấu chơi được

**Trạng thái:** xong phần tự động 07/10/2026, chờ commit và người duyệt (report `plans/dattqh/reports/boss-duel-261007.md`) · **Tier:** L · **Nhánh:** `main` (không tạo nhánh, không worktree) · **Ngày:** 07/10/2026
**Nguồn:** người sở hữu (07/10/2026), kèm ảnh màn "Đấu trí với Voi Gác Sân Trước" trên điện thoại: "màn đấu boss mong muốn là tương tác chơi thay vì giống như làm nhiệm vụ chính", rồi "cứ để Jev chọn hướng rồi làm luôn".

## Kết quả mong muốn

1. Mở một trận boss thì thế giới 3D **vẫn chạy**: bé đứng đối diện model boss thật, camera khung cả hai; câu hỏi là thẻ gọn ở dưới, HUD tạm ẩn.
2. Mỗi lượt bé trả lời bằng một **động tác chơi** thay cho nút "Giải đố": ném bùa vào tấm khiên mang đáp án, chạm quả cầu đáp án bay quanh boss, kéo viên ngọc vào ô đáp án, hoặc chọn đáp án rồi chạm liên tục để nạp chiêu. Động tác đổi giữa các lượt và giữa các boss; không có đồng hồ.
3. Đúng: vật bay trúng boss, chớp sáng, boss lảo đảo, thanh HP tụt kèm số trừ. Sai: vật bật ra vô hại, boss phản đòn vui (bong bóng, lá), bé né, rung nhẹ. Boss có dáng đứng chờ, khiêu khích, thua.
4. Giữ nguyên mọi thứ đang có giá trị: server chấm từng lựa chọn (đúng/sai, HP, thưởng), ba lớp hỗ trợ Hướng dẫn · Gợi ý · Đáp án cho từng câu, thẻ "chép vào vở" sau mỗi câu đúng và cuối trận, lời boss sau mỗi đòn, chơi lại đủ thưởng, tổ đội đánh boss theo lượt.
5. Có bản nhẹ: `prefers-reduced-motion` hoặc `?quality=low` thì không bay camera, không rung, quả cầu đứng yên, ít hạt; khi không dựng được sân đấu 3D thì về thẻ đấu như cũ (game dừng) với cùng động tác chơi ở dạng tĩnh.

## Quyết định (đã chốt, không hỏi lại)

- Jev chọn `hybrid-duel-with-play-moves` (0,85; `live-3d-duel` 0,14; `action-minigame` 0,01; độ tin 0,77, script báo escalate nhưng người sở hữu đã giao Jev chọn nên áp dụng). Input/output: [`jev-261007-1829-boss-direction-input.json`](../reports/jev-261007-1829-boss-direction-input.json), [`jev-261007-1829-boss-direction-output.json`](../reports/jev-261007-1829-boss-direction-output.json).
- Quyết định kỹ thuật của plan (tự quyết theo `docs/code-standards.md` mục Ra quyết định, lý do ở phase file):
  - **Đích trả lời là phần tử DOM** neo theo vị trí màn hình của boss (game ghi vị trí vào phần tử neo mỗi khung, đúng luật `.claude/rules/web-ui.md`), không phải vật 3D: chữ tiếng Việt nét, chạm chính xác, có bàn phím và trình đọc màn hình, không tốn draw call. 3D chỉ lo boss, bé, camera, vật bay và hạt sáng.
  - **Vật bay và chớp sáng dùng lớp hạt có sẵn** (`createEffectLayers`, 2 draw call cho cả map, `apps/web/src/game/interact/effect-particles.ts:293`), không đổi material của boss (model GLB dùng chung material giữa các bản sao, chớp material sẽ chớp mọi con voi trên map).
  - **Không đổi server, schema API, DB, nội dung câu hỏi.** Câu trả lời vẫn gửi `{ turnId, choice }` (`packages/schema/src/game.ts:161`).
  - **Động tác của mỗi lượt là trường nội dung `move`** (Jev chốt ở câu hỏi mở 2, xem Validation Log; thay cho bản nháp "hàm thuần `duelMoveFor`"): sinh một lần bằng `tools/content/duel-moves.ts`, generator trùm canh ghi luôn, `content:check` kiểm.

## Hiện trạng đo được (07/10/2026)

- **Nội dung:** 59 bước `boss` với 290 câu: 12 trùm lớn (80 câu), 42 trùm canh khu (180 câu), 5 boss sự kiện Olympic Toán `wonder-olympic-*` (30 câu; nhiều hơn con số 260 trong đề bài vì tính cả sự kiện). Mỗi câu 2 hoặc 3 lựa chọn (19 câu 2 lựa chọn, 271 câu 3 lựa chọn), lựa chọn dài nhất 39 ký tự (trung vị 6), câu hỏi dài nhất 122 ký tự (trung vị 63); không câu nào có `illustration`, không boss nào có `avatar` (đo bằng script đọc `content/quests/*.json`).
- **Model boss:** 58/59 boss là Kenney Cube Pets (`packs/kenney-cube-pets/2.0/animal-*.glb`) với clip `static, idle, walk, run, eat, dance, gesture-positive, gesture-negative`; 1 boss (`trum-ld-hiep-si-da`, Hiệp Sĩ Đá Gác Cầu, `content/world/targets.json:3635`) là `kenney-blocky-characters/2.0/character-d.glb` với `emote-yes, emote-no, die, pick-up, interact-right…`. Boss sự kiện khai model ngay trong `content/events/olympic-math-2026.json` và được gộp vào `entities.interactables` qua `withEventCharacters` (`apps/web/src/game/event/event-layer.ts:21`).
- **Màn hiện tại:** `BossScreen` là `Modal` scene đặt dưới (`apps/web/src/ui/challenge/boss/boss-screen.tsx:73-80`), avatar emoji khi không có `avatar` (`:99-108`), `ChoiceList` 3 nút (`:157-164`), `SupportPanel` theo từng câu (`:169-176`), nút `boss-attack-btn` "Giải đố (-{damage} HP)" (`:178-189`, chuỗi ở `apps/web/src/ui/i18n/locales/vi.json:208`). Nhánh thắng `isDefeated` (`:48`, `:131-148`) gần như không hiện vì overlay đóng ngay ở đòn thắng (`apps/web/src/ui/quest/use-quest-controller.ts:216-226`).
- **Luồng trả lời:** `LearningStep.onAnswer` gửi lên server, phát âm, gọi `onRight(copy)` ngay khi đúng, giữ lời boss và số lần sai theo câu trong draft (`apps/web/src/ui/challenge/learning-step.tsx:78-100`, render boss `:120-124`). `QuestLayer` ẩn màn bước khi thẻ chép vở đang hiện (`apps/web/src/ui/quest/quest-layer.tsx:161-166`) và báo che game qua `reportCover` (`:90-96`).
- **Dừng game:** mọi màn quest bật `questOpen` → `covered` → `game.stop()` (`apps/web/src/ui/play/play-screen.tsx:241-244`, `:393`). Tiền lệ "game vẫn chạy, chỉ HUD lùi": bảng chăm thú cưng (`hudCovered = covered || petCareOpen`, `:395`).
- **Game runtime:** lệnh React → game qua `GameCommand` (`apps/web/src/game-bridge/game-store.ts:109-144`), neo DOM theo khung qua `setPromptAnchor` (`:151`, `:246`) và `screenAnchor` của interactable (`apps/web/src/game/entities/interactables.ts:306-309`). NPC tự quay về phía bé qua `NpcBehavior` (`:252`, `:276-283`), bảng clip `NPC_CLIP_NAMES` chưa có `gesture-negative` (`:63`, `:73-79`). Camera chỉ theo bé (`apps/web/src/game/player/camera-rig.ts:42-109`). Vòng lặp khung có tiền lệ khóa tay điều khiển khi đi xe (`journey.active`, `apps/web/src/game/game.ts:966-969`). Cử chỉ bé dựng bằng code (`apps/web/src/game/interact/player-actions.ts:8-33`). `standBeside` tìm chỗ đứng cạnh một target (`apps/web/src/game/player/stand-beside.ts:21`).
- **Server:** chấm và lời boss ở `apps/server/src/quest/step-record.ts:58-83` (`feedbackLine`), `:188-201` (đòn đã trúng, thắng); hỗ trợ theo câu ở `apps/server/src/quest/quest-routes.ts:231-233`; dòng chép vở `:212`. Tổ đội: `PartyQuestService` (`apps/server/src/coop/party-quest.ts`), lỗi `party-waiting`/`not-your-turn` ở client (`use-quest-controller.ts:231-235`), thẻ "lượt của ai" `apps/web/src/ui/coop/party-quest-card.tsx:68-91`.
- **Thử thách co-op `team-boss`** (3 quest `with-*`: `with-bong-muc-thu-vien`, `with-hiep-si-da-ngu-gat`, `with-rong-giay-le-hoi`) là luồng khác: `CoopService` + bảng co-op trong `apps/web/src/ui/coop/coop-layer.tsx:330-345`, không dùng `BossScreen`.
- **Bản nhẹ có sẵn gì:** chất lượng chỉ chọn qua `?quality=low|mid|high` (`apps/web/src/game/quality.ts:14-24`, không tự đo máy); `prefers-reduced-motion` đọc ở `apps/web/src/ui/rewards/completion-sequence.tsx:71`.
- **Âm thanh:** 6 cue `tap, place, right, wrong, star, complete` (`apps/web/src/ui/sound/sfx.ts:9`).
- **Test đang chạm màn boss:** unit `apps/web/src/ui/challenge/boss/boss-screen.test.tsx` (170 dòng), `learning-step.test.tsx:204-221`, `quest-layer.test.tsx:247-297`; E2E `apps/web/e2e/bosses.spec.ts:94-127` (bấm `choice-*` rồi `boss-attack-btn`), `:132-143` (draw call cạnh trùm canh ở `quality=high`), `apps/web/e2e/coop.spec.ts:155-181` (tổ đội, `boss-battle`, `boss-bar`). Không spec nào khác chạm boss (grep `boss` trong `apps/web/e2e/`).

## Không làm

- Không đổi server, route, schema API, DB, cách tính HP/thưởng/sao; không thêm luật chống gian lận (người sở hữu chấp nhận gian lận, server vẫn tính thưởng).
- Không viết lại, không thêm câu hỏi, không đổi lời boss; động tác mỗi lượt là trường nội dung `move` (Jev chốt, câu hỏi mở 2).
- Không đổi thử thách co-op `team-boss` trong `coop-layer.tsx` ở đợt này (luồng và giao diện riêng, game dừng như cũ); xem câu hỏi mở 1.
- Không thêm đồng hồ, không mất lượt, không loại bớt đáp án sai đã thử (giữ cách học hiện tại); xem câu hỏi mở 3.
- Không thêm asset mới (model, âm thanh, ảnh): khiên, cầu, ngọc, bùa vẽ bằng CSS và token, vật bay là hạt trong atlas vẽ bằng code. Nếu sau này cần ảnh thì đi qua `tools/assets/sources.json` + `pnpm assets:manifest`.
- Không cho người chơi khác trên map thấy trận đấu (giao thức multiplayer giữ `PLAYER_ACTIONS` cũ ở `packages/schema/src/multiplayer.ts:34`).
- Không thêm công tắc cài đặt mới cho bản nhẹ (dùng `prefers-reduced-motion` và `?quality=low` có sẵn).

## Pha

Đồ thị phụ thuộc: **1 → (2 ∥ 3) → 4 → 5**. Pha 2 và 3 chạy song song được vì file tách hẳn và cùng dựa vào hợp đồng cầu nối chốt ở pha 1.

| Pha | Tier | Nội dung | File sở hữu (chỉ pha này sửa) | Chặn bởi |
| --- | --- | --- | --- | --- |
| [1](phase-01-bridge-contract-and-moves.md) | S | Hợp đồng cầu nối React ↔ game cho trận đấu; hàm chọn động tác thuần TS | `apps/web/src/game-bridge/game-store.ts`, `game-store.test.tsx`; mới `packages/quest/src/duel-moves.ts`, `duel-moves.test.ts` | — |
| [2](phase-02-duel-stage-3d.md) | M | Sân đấu 3D: chỗ đứng, camera khung hai nhân vật, dáng boss, vật bay, chớp, né, thua; bản nhẹ; báo `unavailable` khi không dựng được | mới `apps/web/src/game/duel/**`; `apps/web/src/game/entities/interactables.ts` (+test), `apps/web/src/game/interact/player-actions.ts` (+test), `apps/web/src/game/player/camera-rig.ts` (+test), `apps/web/src/game/debug/stats-overlay.ts`, **`apps/web/src/game/game.ts` (dùng chung)** | 1 |
| [3](phase-03-duel-screen-and-play-moves.md) | L | Màn đấu mới và bốn động tác chơi, thẻ câu hỏi gọn, hỗ trợ, bản tĩnh; thay `BossScreen` | mới `apps/web/src/ui/challenge/boss/boss-duel.tsx`, `boss-duel.css`, `boss-duel.test.tsx`, `apps/web/src/ui/challenge/boss/moves/**`, `apps/web/src/ui/kit/reduced-motion.ts`; xóa `boss-screen.tsx/.css/.test.tsx`; sửa `apps/web/src/ui/challenge/learning-step.tsx` (+test), `apps/web/src/ui/kit/modal.tsx`, `apps/web/src/ui/rewards/completion-sequence.tsx` (một dòng import), `apps/web/src/ui/i18n/locales/{vi,en}.json` | 1 |
| [4](phase-04-play-flow-and-party.md) | M | Nối vào luồng chơi: trận đấu không dừng game, HUD lùi, nhịp thắng trước thẻ vở, tổ đội (lượt người khác, đòn của bạn) | **`apps/web/src/ui/quest/quest-layer.tsx` (dùng chung)** (+test), `apps/web/src/ui/quest/use-quest-controller.ts`, `apps/web/src/ui/play/play-screen.tsx` (+test), `apps/web/src/ui/challenge/learning-step.tsx`, `apps/web/src/ui/challenge/boss/boss-duel.tsx` (cả hai sau pha 3, nối tiếp nên không đụng nhau) | 2, 3 |
| [5](phase-05-e2e-docs-review.md) | M | E2E bosses/coop, ngân sách draw call trong trận, ảnh review điện thoại dọc và iPad, tài liệu, trang review, report | `apps/web/e2e/bosses.spec.ts`, `coop.spec.ts`, `quest-api.ts` (helper), `apps/web/review.html`, `docs/system-architecture.md`, `docs/project-roadmap.md`, `docs/design-guidelines.md`, report trong `plans/dattqh/reports/` | 4 |

**File dùng chung với agent đang sửa cảnh sự kiện Khu rừng** (`apps/web/src/game/event/**`, `packages/voxel/src/event-layer.ts`, có thể `apps/web/src/ui/quest/quest-layer.tsx`, `apps/web/src/game/game.ts`): pha 2 chạm `game.ts`, pha 4 chạm `quest-layer.tsx`. Ngay trước khi sửa: `git status` + `git log -3 -- <file>` + đọc lại cả file; nếu file đang có thay đổi chưa commit của phiên khác thì nhắn phiên đó (SendMessage) để chia lượt, không sửa đè. Giữ phần sửa thành vài khối nhỏ, tách logic sang file mới. Plan này không chạm `apps/web/src/game/event/**`, `packages/voxel/**`, `content/events/**`.

## Luồng dữ liệu

1. Server → web: `QuestSummary` (bước `boss` công khai, không đáp án) và `progress.bossState[step] = { hp, answered }`; khi chơi tổ đội thêm lượt (`party.run.turn`) qua đẩy `party-quest-progress`.
2. Web đọc động tác lượt này từ `move` của câu trong `QuestView` (không bí mật).
3. React → game: `duel-open { targetId, calm }`; game đáp `duel { state: 'staged' | 'unavailable' }`, mỗi khung ghi vị trí màn hình của boss và tay bé vào hai phần tử neo React đăng ký.
4. Bé làm động tác → React gửi `duel-cue { cue: 'aim', from, to }` (vật bay đi) và gửi `POST …/steps/:step` với `{ turnId, choice }`.
5. Server trả `correct`, `feedback`, `copy`, `quest.bossState` mới. React gửi `duel-cue 'hit' | 'miss' | 'win'`; HP và lời boss hiện theo response. Đòn đúng: sau nhịp trúng (≤ 1,2 s, chạm để bỏ qua; ngay lập tức ở bản tĩnh) thẻ chép vở hiện; đòn thắng: nhịp thua của boss rồi thẻ vở và màn hoàn thành.
6. Đóng trận (thắng, Esc, nút đóng, đổi map) → `duel-close`: camera về sau lưng bé, boss trả về `NpcBehavior`, tay điều khiển mở lại.

## Tiêu chí xong (đo được)

- Mở bất kỳ trận boss nào khi game sẵn sàng: `window.__miuStats.duel === 'staged'`, số khung (`frames`) tăng trong khi trận mở, HUD và joystick ẩn, phím di chuyển không làm bé đi (E2E `bosses`).
- Mỗi lượt trả lời được bằng động tác chơi; không lượt nào có nút "Giải đố". Test thuần: với cả 59 `bossId` và `run` 1–3, hai lượt liền nhau không trùng động tác; mỗi động tác là động tác đầu của ≥ 10 boss; trận 4–5 câu có đủ 4 động tác.
- Không đồng hồ: test component tiến giả lập 10 phút không gửi gì, không đổi trạng thái.
- Đúng/sai, HP, lời boss chỉ đổi theo response server (test component: response sai không trừ HP; response lỗi mạng làm vật bay tắt, HP giữ nguyên).
- Ba lớp hỗ trợ giữ nguyên hành vi: Hướng dẫn luôn có, Gợi ý sau 1 lần sai câu đó, Đáp án sau 2 lần (E2E `bosses` như hiện nay).
- Thẻ chép vở hiện sau **mỗi** đòn đúng và cuối trận chép đủ mọi câu (E2E đếm bằng số câu).
- Draw call trong trận ở `quality=high` ≤ 150 trên CI (E2E mới cạnh trùm canh, đo khi `duel === 'staged'`).
- `prefers-reduced-motion: reduce` (Playwright `emulateMedia`) và `?quality=low`: không bay camera, không rung, cầu đứng yên; trận vẫn chơi hết được.
- Không dựng được sân đấu (boss không có trên cảnh, bị che, game chưa sẵn sàng): thẻ đấu dạng tĩnh, game dừng, chơi hết được (test component + test game-store).
- Tổ đội: màn người không tới lượt có đích bị khóa kèm "Lượt của …", đòn của bạn làm HP tụt có hiệu ứng; `coop.spec` xanh.
- Chữ trong game dùng `{name}`, không "Miu" cứng; câu hướng dẫn động tác lấy từ pool bằng `freshPicker`, không lặp liền.
- Ảnh review ở 360 × 740 dọc và iPad 820 × 1180 với câu dài nhất (122 ký tự) và lựa chọn dài nhất (39 ký tự): không tràn, đích chạm ≥ 48 × 48 px.
- Gate nhanh xanh: `pnpm assets:check`, `pnpm content:check`, `pnpm typecheck`, `pnpm lint`, vitest từng file đã chạm, `pnpm --filter @miu/web build`, `pnpm security:dist`. E2E giới hạn `--project setup --project bosses` rồi `--project setup --project coop`, 1 worker, chạy lần lượt; full `pnpm test` và `e2e:ci` để CI (theo quy định máy dev của người sở hữu).

## Rủi ro

| Rủi ro | Khả năng × Ảnh hưởng | Giảm thiểu |
| --- | --- | --- |
| Va chạm với agent đang sửa `game.ts`, `quest-layer.tsx` | Cao × Cao | Logic ở file mới (`game/duel/**`, component mới); chỉ vài khối nối; đọc lại file và `git status` ngay trước khi sửa; nhắn phiên kia khi file đang bẩn. |
| Camera bị tường, mái che boss (trùm trong lâu đài, thư viện) hoặc không có chỗ đứng | Trung bình × Cao | Pha 2 bắn tia từ camera tới đầu boss và đầu bé; bị che hay `standBeside` không ra chỗ thì báo `unavailable` → thẻ đấu tĩnh. Ảnh review lấy mẫu trùm lâu đài và một trùm trong nhà. |
| Đổi thứ tự thẻ vở làm hỏng "chép vào vở sau mỗi câu đúng" | Trung bình × Cao | Chỉ hoãn thẻ vở tối đa nhịp trúng (≤ 1,2 s, chạm bỏ qua); test component và E2E đếm thẻ vở bằng số câu. |
| Vượt ngân sách draw call | Thấp × Cao | Không thêm mesh: vật bay và chớp là hạt của lớp có sẵn; đích trả lời là DOM. E2E đo trong trận ở `quality=high`. |
| Cử chỉ kéo/ném xung đột cuộn trang, pinch trên iOS Safari | Trung bình × Trung bình | `touch-action: none` trên lớp động tác, pointer capture; mọi động tác có đường chạm/bàn phím thay thế (chạm khiên là tự ném). E2E kéo thật bằng `apps/web/e2e/touch.ts`. |
| Đòn của bạn trong tổ đội tới khi vật bay của mình đang bay, hoặc `not-your-turn` | Trung bình × Trung bình | Vật bay chờ response; lỗi 409 thì vật bay tắt, toast như hiện nay; HP luôn lấy từ `bossState` mới nhất. |
| Hiệp Sĩ Đá (`character-d`) khác bộ clip | Thấp × Thấp | Bảng clip trận đấu có tên thay thế (`emote-no`, `emote-yes`, `die` thay cho clip Cube Pets); thiếu clip thì dùng dáng dựng bằng code. |
| Game chạy trong trận làm nóng máy yếu | Thấp × Trung bình | Trước đây game dừng khi mở boss; nay chạy tiếp ở cùng cảnh đang chơi, không thêm vật; `quality=low` vào bản nhẹ, ít hạt. |
| Boss sự kiện bị ẩn khi sự kiện đóng | Thấp × Thấp | Không thấy boss trên cảnh → `unavailable` → thẻ đấu tĩnh. |

## Hoàn tác

Không có migration, không đổi server hay nội dung, nên mỗi pha là một commit riêng và `git revert` được độc lập theo thứ tự ngược (5 → 4 → 3 → 2 → 1). Revert pha 4 thì trận đấu mở như thẻ tĩnh và game dừng như cũ (pha 3 tự về bản tĩnh khi game không báo `staged`). Revert pha 3 thì phải revert cùng pha 4. Pha 1 và 2 không đổi hành vi người chơi thấy khi chưa có pha 3.

## Câu hỏi mở (quyết định kỹ thuật, có đề xuất mặc định để người điều phối gửi Jev)

1. **Thử thách co-op `team-boss` (3 quest `with-*`)** có đổi sang động tác chơi không? Đề xuất mặc định: **giữ nguyên ở đợt này** (bảng co-op có ghế, lượt, giữ chặt riêng; đổi là mở rộng phạm vi); làm đợt sau bằng chính component động tác ở dạng tĩnh nếu người sở hữu muốn.
2. **Động tác theo boss khai trong nội dung hay tính bằng hàm?** Đã chốt (Jev): **khai trong nội dung**, xem Validation Log. Đề xuất ban đầu: tính bằng hàm thuần `duelMoveFor(bossId, run, turnIndex)`; không thêm trường nội dung, không sửa 59 file quest và generator trùm canh. Khi cần chỉnh tay cho một boss thì mới thêm trường tùy chọn và luật `content:check`.
3. **Đáp án sai đã thử có mờ đi không?** Đề xuất mặc định: **không**, giữ cả ba đích như hiện nay (mờ đi biến câu 3 lựa chọn thành đoán 50/50 sau một lần sai, đổi cách học).
4. **Âm thanh mới (vút, trúng)?** Đề xuất mặc định: **dùng lại 6 cue có sẵn** (`place` khi ném, `right` khi trúng, `wrong` khi bật ra, `complete` khi thắng); âm mới đợt sau qua pipeline asset.
5. **Mở lại trận khi bé đứng xa boss (tải lại trang giữa trận)?** Đề xuất mặc định: **đưa bé tới chỗ đứng cạnh boss** bằng `standBeside` + `teleport` (như `spawnAt`), có chớp chuyển cảnh; không có chỗ đứng thì thẻ đấu tĩnh.
6. **`BossScreen` cũ:** đề xuất mặc định **thay hẳn** (đổi tên bằng `git mv` sang `boss-duel.*`, bản tĩnh nằm trong component mới), không giữ hai màn song song.

## Validation Log

- 07/10/2026: hướng `hybrid-duel-with-play-moves` do Jev chọn, người sở hữu giao Jev chọn và làm luôn.
- 07/10/2026: sáu câu hỏi mở gửi Jev (`reports/jev-261007-1829-boss-open-questions-{input,output}.json`), áp dụng cả lựa chọn có cờ escalate theo lệ của dự án:
  1. Co-op `team-boss`: **giữ nguyên** ở đợt này (1,00; auto).
  2. Động tác theo lượt: **khai trong nội dung** (0,55 so với hàm 0,45; độ tin 0,10; escalate, vẫn áp dụng). Cách làm: mỗi lượt boss có trường `move` (một trong bốn động tác) trong schema; giá trị đầu sinh một lần bằng script theo luật xoay vòng (hai lượt liền nhau khác nhau, trận 4–5 lượt đủ bốn động tác), generator trùm canh ghi luôn trường này; `content:check` chặn lượt thiếu `move`, hai lượt liền nhau trùng, trận ≥ 4 lượt thiếu động tác. Hàm `duelMoveFor` không cần nữa; client đọc `move` từ dữ liệu lượt (trường không bí mật).
  3. Đáp án sai đã thử: **không làm mờ** (0,84; auto).
  4. Âm thanh: **dùng lại 6 cue có sẵn** (0,95; auto).
  5. Tải lại giữa trận: **đưa bé tới cạnh boss** bằng `standBeside` + `teleport`, không có chỗ thì thẻ tĩnh (1,00; auto).
  6. `BossScreen` cũ: **thay hẳn** (1,00; auto).
