# Trùm trên bản đồ và trùm canh khu — report 06/10/2026

Plan: `plans/dattqh/261005-2315-zone-guardians/plan.md` (4 pha, phương án B của người sở hữu), cộng một việc nhỏ cho thú cưng. Tier L. Trạng thái: xong phần tự động, chờ người duyệt và deploy. Không có migration database, không thêm dependency.

## Đã làm

- **Mọi trùm trên bản đồ (pha 1).** Bản đồ nhỏ và bản đồ lớn luôn đánh dấu trùm lớn của map và mọi trùm canh khu bằng huy hiệu vương miện (trùm lớn to hơn), nhóm "Trùm" trong chú giải và danh sách (thẻ ghi "Trùm lớn" hay "Trùm canh khu" kèm tên nhiệm vụ). "Đi tới đây" ở trùm canh khu: bé tự đi tới và chào trùm, trận đấu mở ngay. Ở trùm lớn: nếu đang chơi nhiệm vụ của trùm thì bé tự đi tới chặng kế; nếu không, nhiệm vụ ấy được chọn (map dựng lại cho nhiệm vụ đó) rồi bé tự đi khi map mới sẵn sàng, như chạm thẻ nhiệm vụ.
- **42 trùm canh khu (pha 2).** 3–4 trùm mỗi map (Khu rừng, Làng Ven Sông, Trường học, Trung tâm, Xóm Mái Ấm, Núi tuyết mỗi map 4; Thư viện, Lâu đài, Chợ phiên, Nông trại, Đảo bí ẩn, Nhà của bé mỗi map 3), mỗi khu chính một nhân vật riêng (model sẵn có trong pack, mỗi trùm một màu riêng, cao hơn dân làng), đứng cạnh đường của khu. Trận ngắn: 30 trùm 4 câu, 12 trùm 5 câu (180 câu), câu hỏi viết mới theo kỹ năng các bài của khu (chính tả, từ ngữ, câu, bảng chữ cái, đọc hiểu; số đến 100, cộng trừ qua 10 và có nhớ, hình phẳng, kg, lít, giờ, lịch; từ tiếng Anh ở Trung tâm và Núi tuyết), không trích nguyên văn SGK nên không cần đối chiếu sách. Mỗi trùm có lời chào, lời mở trận, lời thắng, 3 câu sau đòn trúng, 3 câu sau lần trượt, quà và lời chia tay, đủ tiếng Việt và tiếng Anh, không câu nào lặp với trùm khác hay quest khác (content:check). Server trả câu mới sau mỗi đòn và mỗi lần trượt (không lặp liền), đòn cuối nói lời thắng. Thắng: server trả 10 XP mỗi câu, 12 Xu và điểm kỹ năng của các câu; chơi lại trả lại, mỗi lượt một lần. Mỗi đòn trúng có thẻ chép vào vở (câu và lựa chọn đúng), cuối trận có trang chép mọi câu; việc này áp cho cả trùm lớn. Id `ward-…` xếp sau mọi bài học (luật thứ tự của `yarn-`/`with-` mở rộng); trùm canh không bao giờ là "nhiệm vụ tiếp theo", không tính vào bài học, rương khu vực hay tiến bộ học; bảng nhiệm vụ có nhóm "Trùm canh khu". Nội dung là bản nháp AI, `teacher-pending`.
- **Cả đội đánh trùm (pha 3).** Trùm canh chạy trên bộ máy nhiệm vụ của tổ đội sẵn có: trưởng đội bấm "Cả đội cùng chơi bài này", hội thoại làm chung, trùm là trùm đội (HP chung, đòn theo lượt, `not-your-turn` khi không phải lượt mình), mỗi người được trả một lượt. Trùm lớn vốn đã chơi được như vậy.
- **Không khóa gì (pha 4).** Trùm canh không chặn bài học hay trùm lớn; đánh lúc nào cũng được, từ bản đồ, từ bảng nhiệm vụ hay khi gặp trên đường.
- **Thú cưng ăn món đã nấu.** Nút "Cho ăn" hỏi "Cho {thú} ăn gì nhỉ?" khi bé có món đã nấu: thức ăn của thú hoặc từng món (tên song ngữ, còn mấy phần); không có món nào thì cho ăn ngay như trước. Server kiểm sở hữu và trừ một phần (có sẵn). Công thức nấu có thêm tên tiếng Anh.

## Cách làm, quyết định nhỏ

- Trùm canh là loại quest mới `guardian`: hội thoại ở chính trùm, một bước `boss` (4–5 câu, câu nào cũng cần để thắng), thưởng và lời chia tay tự chạy. Bước `boss` có thêm `en` và `feedback` (chỉ ở server, client không thấy). Luật schema và content:check kiểm: tiền tố, 4–5 câu, HP vừa đủ, có lời sau mỗi đòn, đủ tiếng Anh, mỗi map ≥ 1 trùm lớn và ≥ 3 trùm canh, mỗi trùm canh một nhân vật.
- Nội dung viết trong bảng theo map `tools/content/guardians/<khu>.json`, builder `tools/content/build-guardian-quests.ts` sinh quest, mục `targets.json`, `looks.json`; chỗ đứng ở `guardians` của bảng quest phụ (map đặt như người giao trò chơi, cạnh đường). Builder kiểm bài nguồn thuộc đúng map, kỹ năng có thật, tên không trùng.
- Trùm lớn không có lời riêng giờ chỉ nói lời thắng ở đòn cuối (trước đây nói lời thắng sau mỗi đòn trúng, nghe như đã thua giữa trận). Màn trùm (lớn và canh) giữ mở giữa các đòn: sau thẻ chép vở là đòn kế, không phải chạm trùm lại; lời của trùm nằm trong bong bóng của nó, không bật thêm thông báo che câu hỏi.
- Một trùm đặt tên "Bồ Câu Đưa Tin" trùng nhân vật sẵn có của Trung tâm, đổi thành "Sẻ Nâu Đưa Thư".
- Trang review không nhúng bảng trùm (có đáp án) vào bundle: bảng trùm theo map là HTML tĩnh sinh từ bảng nội dung lúc làm.

## Map sinh lại và audit

Từng map một: `forest-ch1`, `lang-ven-song`, `truong-hoc`, `trung-tam`, `thu-vien`, `lau-dai`, `xom-mai-am`, `cho-phien`, `nong-trai`, `nui-tuyet`, `dao-bi-an`, `nha-cua-be`. Mỗi lần: `scenery-audit` 0 cây trên đường, 0 vật chắn lối hẹp, 0 nơi xa đường, 0 nơi đứt mạng; `room-audit` 0 nhà thiếu chuẩn; `reach-audit` mọi mục tiêu tới được, chỗ xuất hiện trống. Sau đó `pnpm assets:manifest`. Chỉ `entities.json` đổi: thêm trùm canh; không mục tiêu nào dời chỗ; vài dân làng xê dịch tránh chỗ trùm đứng; vài model dùng chung đổi tỉ lệ ở chữ số thứ tư (0,7025 → 0,7026) do có thêm look cao khác trên cùng model. Ba ghi chú "chỉ cách 7 khối" ở Trường học, Thư viện, Xóm Mái Ấm là của bài học có từ trước, không phải lỗi.

## Kiểm tra

Sau commit sửa theo review (`e70aa9d8`), chạy lần lượt trên máy dev (một job nặng một lúc, bộ nhớ trống 61–64%):

- `pnpm assets:check` OK (16 pack, 4625 file); `pnpm content:check` OK (2022 file), ghi chú "12 big bosses and 42 zone guardians on 12 maps".
- `pnpm test`: 529 file qua, 1 bỏ qua (symlink trên Windows, có từ trước); 6482 test qua, 1 bỏ qua, 0 hỏng.
- `pnpm typecheck` 0 lỗi; `pnpm lint` 0 cảnh báo.
- `pnpm --filter @miu/web build` OK (chỉ cảnh báo chunk > 500 kB có từ trước); `pnpm security:dist` OK (không đáp án trong bundle).
- E2E (1 worker): `e2e:smoke` 14/14 qua (52 s); `--project setup bosses coop pets quest-flow maps autowalk hud-layout npc-stories` 35/35 qua (3,8 phút).
- E2E mới `bosses.spec.ts` (project `bosses`, thêm vào danh sách project): bản đồ lớn có nhóm "Trùm 5" ở Núi tuyết, đủ trùm lớn và bốn trùm canh trong danh sách; "Đi tới đây" ở trùm lớn chọn nhiệm vụ của trùm và bé tự đi (@smoke); nói chuyện với trùm canh giữa bài học thì trận mở, đánh đủ 4 đòn (mỗi đòn một thẻ chép vở, HP giảm, trùm nói câu mới), trang chép 4 câu rồi phần thưởng, server ghi hoàn thành; draw call cạnh trùm canh ở chất lượng cao trong ngân sách 150 (máy dev không ghi chú vượt; CI kiểm lại). Ảnh cho trang review chụp bằng `REVIEW_SHOTS=1`.
- Test đơn vị mới: `packages/schema/src/guardian-content.test.ts` (luật trùm canh), `tools/content/build-guardian-quests.test.ts` (file quest khớp bảng, 3–4 trùm mỗi map, 36–48 tổng, 4–5 câu, đáp án trải đều vị trí, không lời nào lặp, bài nguồn đúng map, độ phủ trùm mỗi map), `apps/server/src/coop/guardian-fight.test.ts` (PGlite + API: danh sách không lộ đáp án và lời, lời mới sau mỗi đòn và lần trượt kể cả khi trượt xen giữa, lời thắng ở đòn cuối, bỏ qua thưởng client gửi, trả mỗi lượt một lần và chơi lại trả lại, tổ đội đánh theo lượt với `not-your-turn`, mỗi người một lượt thưởng), `apps/server/src/progression/player-facts.test.ts`, thêm ca ở `minimap-model.test.ts`, `walk-goal.test.ts`, `game-store.test.tsx`, `boss-screen.test.tsx`, `quest-layer.test.tsx`, `region-board.test.ts`, `play-screen.test.tsx`, `rewards.test.tsx`, `notebook.test.ts`, `quest-progress.test.ts`, `pet-care-panel.test.tsx` (chọn món, không có món thì cho ăn ngay, hết món thì danh sách giảm, tên tiếng Anh).

## Review độc lập

Agent `code-reviewer` trên dải `c252915f..ce096f70` (HEAD có thêm commit trong lúc review): không có Critical; xác nhận đáp án và lời của trùm không ra client, thưởng do server tính, mỗi lượt trả một lần, đường tổ đội có test. Đã sửa (commit `e70aa9d8`, có test):

- High: server tính trùm canh là bài học trong chỉ số tiến bộ và thành tích (`regionQuests`), nên "hoàn thành khu" không bao giờ đạt → chỉ quest `main` là bài học; số trận trùm thắng chỉ tính trùm lớn (thành tích "Hiệp sĩ dũng cảm" 12 trận vẫn nghĩa là trùm lớn của các map; content:check đếm như vậy).
- High: 160/180 câu có đáp án ở lựa chọn đầu → builder xáo thứ tự lựa chọn cố định theo câu (đáp án nay 62/56/62 theo vị trí), test chặn một vị trí quá nửa.
- Medium: câu sau đòn trúng có thể lặp khi trượt hai lần xen giữa → xoay theo số đòn đã trúng. Sau trận trùm canh hiện tiến độ rương khu → bỏ. Đường đi chờ sau khi chọn trùm lớn có thể bất ngờ chạy về sau → hết hạn sau 4 giây, mọi lần đổi nhiệm vụ khác hay qua cổng đều hủy.
- Low: gửi lại một đòn đã trúng (mất mạng thử lại) nay là lặp lại, không hiện thẻ chép vở hai lần; trùm giữ lời cuối giữa các đòn mà không phải xóa nháp; nhãn đọc màn hình tên trùm theo ngôn ngữ; dời hàm kiểm ra sau phần import; bảng chăm thú không đặt lại danh sách món sau khi đã đóng.
- Không sửa (ghi lại): câu hỏi của trùm (lớn và canh) không có ba lớp hỗ trợ Hướng dẫn/Gợi ý/Đáp án như luật nội dung ghi, giống trùm lớn có từ trước (xem mục còn mở); chữ "Trùm lớn", "Trùm canh khu", "Trùm" trên bản đồ là tiếng Việt như các nhãn bản đồ có sẵn; builder không tự xóa mục `targets.json`/`looks.json` của trùm đã bỏ khỏi bảng (looks viết tay, xóa bằng tay); "Đi tới đây" ở trùm lớn đi tới chặng kế của nhiệm vụ (như chạm thẻ nhiệm vụ), không thẳng tới chỗ trùm.

## Việc của người / còn mở

- Duyệt trang review (mục "Trùm trên bản đồ và trùm canh khu"), chơi thử; giáo viên duyệt 180 câu của trùm canh (nội dung AI, `teacher-pending`).
- Lớp hỗ trợ cho câu hỏi của trùm: luật nội dung muốn mọi thử thách có Hướng dẫn, Gợi ý, Đáp án kèm giải thích; trùm lớn từ trước và 42 trùm canh chưa có. Hai hướng: thêm gợi ý và giải thích cho từng câu (khoảng 260 câu, song ngữ) hoặc ghi rõ trận trùm là ngoại lệ (câu ôn ngắn, sai không mất gì). Đề xuất: thêm gợi ý ngắn ở một đợt nội dung sau, cần người sở hữu hoặc Jev chốt.
- Deploy production: không có migration; người sở hữu đã cho phép deploy plan này (05/10/2026) nhưng theo luật vẫn hỏi lại trước lần deploy.
