# Bản đồ toàn màn hình (mở từ minimap) — 03/10/2026

Yêu cầu của người sở hữu: "màn hình nhiệm vụ khó nhìn, ko thao tác di chuyển xem tự do bản đồ được. không hiển thị nhiệm vụ phụ và muốn click trên bản đồ sẽ di chuyển đến địa điểm theo những cái đã ghi."

## Kết quả

- Bản đồ phủ kín màn hình (phần tử riêng trong `body`, `z-index: var(--z-overlay)`), nên HUD và nút "Lái xe" nằm dưới, không chồng lên. Phía trên là thanh tên map và nút ✕. Phía dưới là "Về chỗ bạn", hai nút − +, thẻ địa điểm, danh sách và một hàng chip chú giải. Nút "Danh sách" luôn nằm đầu hàng; các chip sau nó cuộn ngang. Chạm một chip thì ẩn hoặc hiện nhóm đó.
- Xem tự do: kéo một ngón để di chuyển; zoom bằng hai ngón, con lăn, chạm đúp hoặc − +. View không thu nhỏ quá cả map và không kéo ra khỏi map. Chuyển cảnh mượt 260 ms (đặt `prefers-reduced-motion` thì nhảy ngay). Canvas 2D chỉ vẽ lại khi có thay đổi. Khi bản đồ đang mở, game không render cảnh 3D.
- Marker: bé (mũi tên), nơi làm nhiệm vụ (sao vàng), nhà của bé (hình nhà; ở map khác là cổng dẫn về nhà), cổng (vòng màu portal), bến xe/thuyền/khinh khí cầu/cáp treo/tàu (các điểm dừng gần nhau gộp thành một "Bến …" / "Ga …", thẻ ghi các nơi xe đi tới), địa điểm có tên (landmarks), và nhân vật có trò chơi phụ (huy hiệu hồng hình tay cầm, thẻ ghi tên các trò). Tên hiện khi zoom đủ gần và không đè lên nhau. Marker của làng ở vùng ngoài xa không hiện, vì ảnh map không có vùng đó; các bến xe ra vùng ngoài ngay mép lõi vẫn hiện.
- Chạm marker hoặc một dòng trong danh sách thì hiện thẻ có tên và nút "Đi tới đây". Bấm nút thì bản đồ đóng và bé tự đi tới bằng route finder. Lệnh bridge mới là `autowalk-to` (`{ targetId }` hoặc `{ position }`), xử lý trong `game.ts` cạnh `autowalk-start`. Dòng "Đang đi tới · chạm để dừng" trên thẻ nhiệm vụ và cách dừng bằng cần điều khiển vẫn như cũ. Tới nhân vật hoặc đồ vật thì bé tự tương tác (giống thẻ nhiệm vụ). Tới cổng hoặc bến xe thì bé chỉ dừng bên cạnh, không tự qua cổng hay lên xe.
- Nhân vật có trò chơi phụ cũng hiện trên đĩa minimap.

## File

- Mới: `apps/web/src/game/hud/map-sheet.ts` (+ `.css`), `map-view.ts` (+ test), `map-draw.ts`, `side-givers.ts` (+ test), `apps/web/src/game/nav/walk-goal.ts` (+ test).
- Sửa: `apps/web/src/game/hud/minimap.ts`, `minimap-model.ts` (+ test), `apps/web/src/game-bridge/game-store.ts` (lệnh `autowalk-to`, kiểu `WalkGoal`), `apps/web/src/game/game.ts` (chỉ sửa đúng các chỗ cần: import, tham số minimap, đọc side quest, `walkTo`/`planWalk`, bỏ render khi bản đồ phủ), `apps/web/e2e/hud-layout.spec.ts`.

## Kiểm tra

- Unit: `pnpm vitest run apps/web/src/game/hud apps/web/src/game/nav/walk-goal.test.ts apps/web/src/game/nav/route-walker.test.ts apps/web/src/game-bridge/game-store.test.tsx apps/web/src/ui/hud` cho 7 file / 45 test pass; thêm `side-givers.test.ts` 2/2 pass.
- `pnpm typecheck` pass (server, web). `eslint --max-warnings=0` trên các file đã sửa: 0 lỗi, 0 cảnh báo.
- E2E (1 worker, trong khóa dùng chung): `setup + hud-layout + play` 27/27 pass (77 s). Sau khi sửa bộ lọc vùng ngoài, chạy lại `setup + hud-layout` 5/5 pass. `pnpm build` chạy trong webServer của E2E và thành công. Bước kiểm bản đồ trong `hud-layout`: bản đồ phủ đúng kích thước màn hình; ✕, Về chỗ bạn, − + và chú giải đều nằm trong màn hình, không chồng nhau, cạnh ≥ 44 px; tại tâm của menu, thẻ nhiệm vụ và huy hiệu người chơi, điểm trên cùng là bản đồ. Sau đó chọn một bến trong danh sách, thẻ hiện, bấm "Đi tới đây" thì bản đồ đóng và `autowalk` chuyển sang `walking`.
- Ảnh đã xem: `.data/sgk/review-shots/map-{phone,ipad-portrait,ipad-landscape}.png` và `map-card-*.png`.

## Việc còn lại

- `apps/web/src/game/game.css` (không thuộc phần file của đợt này) còn các luật cũ không dùng nữa: `.minimap-sheet`, `.minimap-legend*`, `.minimap-close`, bản `.minimap-sheet-canvas` cũ (đã bị `map-sheet.css` ghi đè) và comment "opens the whole map … in the middle". Nên xóa trong một lần sửa `game.css`.
- Danh sách trò chơi phụ được đọc một lần khi map lên, không đợi tới lúc mở bản đồ, vì đĩa minimap cũng cần hiện các nhân vật đó. Mỗi lần vào map có thêm một `GET /api/quests?category=side&region=` song song với lần đọc của màn chơi. Lỗi (offline, chưa đăng nhập) thì không hiện marker trò chơi phụ.
- Cách xác định "người mời" (bước đầu tiên của quest) và tên trò (tiêu đề bước minigame) đang viết lại trong `side-givers.ts`, vì không được import `ui/quest/side-quests.tsx` (file React) vào runtime.
