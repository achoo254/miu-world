# Hoạt cảnh đi phương tiện trên map (03/10/2026)

Yêu cầu của người sở hữu: "kiểm tra và thêm hoạt cảnh bé di chuyển thật khi di chuyển bằng phương tiện trong game như khinh khí cầu, nhà ga, xe buýt, tàu hỏa, v.v."

Trước đây, chạm "Lên xe / Lên thuyền / Lên khinh khí cầu…" sẽ chờ tải vùng ở đầu kia rồi đặt bé sang đó luôn, không có chuyến đi nào hiện ra. Giờ bé lên phương tiện ngay tại điểm dừng, phương tiện chở bé tới điểm dừng bên kia trong vài giây, camera đi theo bên cạnh, tới nơi bé nhảy xuống và phương tiện đi tiếp.

## 1. Khảo sát: mọi tuyến trên 12 map

Lấy từ `assets/generated/world/<map>/entities.json` (mục `interactables` có trường `ride`). Hai map `nha-cua-be` và `the-gioi` không có tuyến nào. Tổng cộng có 112 điểm dừng.

| Map (vùng) | Điểm dừng | Tên tuyến | Model ở điểm dừng | Loại | Phương tiện chở bé | Quãng đường (khối) |
|---|---|---|---|---|---|---|
| trung-tam | 12 | Khinh khí cầu tới… / về quảng trường | `box-props/tt-balloon-rainbow.glb` (cao 6,65) | khinh khí cầu | chính khinh khí cầu ở điểm dừng, phồng to ×1,6 khi bé lên | 140–302 |
| truong-hoc | 16 | Xe buýt tới… / về trường | `props/automobile.glb` (ô tô nhỏ, cao 1,6) | xe buýt | xe buýt vàng cỡ thật (`vehicle-bus-yellow`) | 125–454 |
| cho-phien | 4 | Xe buýt | `props/automobile.glb` | xe buýt | như trên | 171–428 |
| xom-mai-am | 8 | Xe buýt | `props/automobile.glb` | xe buýt | như trên | 121–722 |
| thu-vien | 6 | Xe buýt | `props/automobile.glb` | xe buýt | như trên | 153–479 |
| lau-dai | 6 | Xe buýt | `props/automobile.glb` | xe buýt | như trên | 108–409 |
| nong-trai | 2 | Xe buýt | `props/automobile.glb` | xe buýt | như trên | 179–185 |
| khu-rung-bi-mat (forest-ch1) | 8 | Tàu rừng (nhà ga `ben-tau-rung-*`) | `props/railway-red.glb` (toa nhỏ, cao 1,2) | tàu hỏa | đầu máy hơi nước cỡ thật (`vehicle-train-red`) | 324–777 |
| lang-ven-song | 8 | Đò | `kenney-nature-kit/canoe.glb` | thuyền | chính chiếc đò ở điểm dừng | 207–740 |
| dao-bi-an | 22 | Thuyền | `box-props/dba-rowboat.glb` | thuyền | chính chiếc thuyền ở điểm dừng | 164–498 |
| nui-tuyet | 20 | Cáp treo | `box-props/ntu-cable-cabin.glb` | cáp treo | chính cabin ở điểm dừng (×1,4, kính nhìn xuyên được) | 190–592 |

Mọi điểm dừng đều đã có model, nên không cần thêm model mới vào map. Riêng ô tô của trạm xe buýt và toa tàu rừng đều nhỏ hơn bé (bé cao khoảng 1,75–2 khối), không chở bé được. Vì vậy hai loại này dùng xe buýt và đầu máy cỡ thật có sẵn trong danh mục phương tiện. Hai model này được dựng bằng code lúc chạy (như xe riêng của bé), không cần asset mới, không đụng manifest. Xe buýt hay tàu chạy vào bến, và model nhỏ ở điểm dừng được ẩn đi khi xe đã đỗ che lên nó.

## 2. Hoạt cảnh

Mã nằm trong thư mục `apps/web/src/game/ride/`:

- `ride-kind.ts`: nhận ra loại phương tiện từ model, nếu không được thì từ tên tuyến. Mỗi loại có một hồ sơ: đi trên không, trên đất hay trên nước, và tốc độ tối đa (40–55 khối/giây).
- `ride-route.ts`: tìm đường cho xe và thuyền bằng A* trên lưới horizon (đỉnh khối của mỗi ô 4×4, có sẵn cho cả map ngay từ lúc tải). Xe buýt và tàu ưu tiên đường đi, lối mòn, cầu, và vòng qua mái nhà, ngọn cây. Thuyền ưu tiên sông và biển, chỉ băng qua đất khi bắt buộc. Đường tìm được làm mượt bằng Chaikin. Khinh khí cầu và cáp treo bay thẳng ở độ cao vượt vật cao nhất dưới tuyến.
- `ride-path.ts`: lấy mẫu theo quãng đường, tính độ cao khi bay (lên, giữ độ cao, xuống) và nhịp thời gian:
  - Lên xe: 0,9–1,4 giây.
  - Chạy: 3,5–5,5 giây tùy quãng đường (tăng tốc 0,8 giây ở đầu, giảm tốc 0,8 giây ở cuối).
  - Xuống xe: 0,75 giây.
  - Tổng không quá 8 giây.
  - Nếu quãng đường dài hơn mức tốc độ tối đa cho phép, chỉ hai đoạn đầu và cuối được chiếu, nối bằng một lần tối màn ngắn (0,3 giây tối dần, 0,3 giây sáng lại).
- `ride-vehicle.ts`: dựng phương tiện và chỗ bé ngồi hoặc đứng:
  - Khinh khí cầu: đứng trong giỏ, giỏ che chân.
  - Cáp treo: đứng trong cabin, mặt kính vẽ trong suốt 35% để thấy bé.
  - Thuyền và đò: ngồi (tư thế `sit`).
  - Xe buýt và tàu: ngồi lái (tư thế `drive`).
  - Chuyển động riêng: thuyền nhấp nhô và lắc nhẹ, khinh khí cầu đung đưa, cabin đu đưa, xe rung theo động cơ. Không model nào có bánh xe tách rời nên bánh không quay.
  - Xe dốc mũi theo độ dốc đường.
- `ride-journey.ts`: điều phối toàn bộ chuyến đi:
  - Xe buýt hoặc tàu chạy vào bến; bé nhảy lên; khinh khí cầu phồng lên.
  - Camera xoay quanh bé để vào góc đi theo, không lướt xuyên qua xe. Ở khinh khí cầu, camera đứng yên nhìn bé bay lên khỏi hàng khinh khí cầu rồi mới bay theo.
  - Khi đi, camera ở phía sau lệch sang bên. Nếu bên đó bị tường hoặc tán cây chắn, camera tự chọn bên kia, ngay phía sau, hoặc góc thấp. Gần mặt đất, khinh khí cầu và cáp treo kéo camera lại gần hơn.
  - Tới nơi, bé nhảy xuống cạnh phương tiện. Camera chuyển mượt về camera đi bộ thường, đứng ở phía bé, xa phương tiện. Phương tiện đi tiếp: xe chạy thẳng, khinh khí cầu bay lên, rồi mờ dần trong 0,8 giây.
- `ride-overlay.ts` và `ride.css`: lớp tối màn và nút "Bỏ qua" (đã nối vào i18n: `game.skipRide`). Trong lúc đi, cần điều khiển và nút Chạy/Nhảy được ẩn.

Tích hợp vào `game.ts` (các sửa nhỏ, đúng chỗ):

- Khi đang đi: không nhận cần điều khiển (vẫn đọc để không dồn lại), không chạy controller, không kích hoạt nút cứu, không hiện lời mời tương tác, thú cưng ẩn rồi đuổi kịp bé ở bến bên kia.
- Lúc tới nơi gọi `controller.teleport` tới chỗ đứng được (`nearestUsableSpot`), và `rig.yaw` nối tiếp góc camera.
- Nếu bé đang tự đi tới nhiệm vụ (autowalk), việc đó dừng lại. Nếu bé đang đi xe riêng, bé xuống xe (`RideControl.dismount()` mới).
- Chỗ lưu vị trí: trong lúc đi giữ chỗ đứng cuối cùng, tức là bến đi. Server không cần sửa.
- `?autopilot` không đổi gì vì autopilot không chạm vào điểm dừng.

Tải vùng an toàn (`world-renderer.ts` thêm `hold(x, z)` và `drawnAt(x, z)`):

- Ngay khi chạm, bến đích được tải, dựng mesh và giữ lại cho tới hết chuyến (trước đây `settle` thả ra ngay khi xong). Chuyến dài còn tải trước điểm bắt đầu đoạn cuối. Trong lúc có `hold`, các vùng phía sau không bị bỏ.
- Dọc đường, đất tự tải quanh camera. Nếu ô đất dưới phương tiện chưa được vẽ, màn tối dần và thời gian chuyến đi dừng chờ. Chờ quá 3 giây thì nhảy tới bến đích (đã tải sẵn). Không bao giờ để lộ khoảng trống.
- "Bỏ qua": tối màn, đợi bến đích sẵn sàng, đặt phương tiện ở đầu kia, bé nhảy xuống.
- Khi bật giảm chuyển động (prefers-reduced-motion): chỉ tối màn 0,35 giây, đặt bé sang bến đích, rồi sáng lại.

## 3. Kiểm thử

- Unit (Vitest), 16 test mới trong `ride-path.test.ts` và `ride-route.test.ts`: nhận loại; lấy mẫu đường; độ cao khi bay; nhịp thời gian (luôn ≤ 8 giây, đi tới không lùi, cắt đoạn giữa không vượt tốc độ tối đa, tối màn đúng lúc nhảy); A* (xe đi qua ngõ giữa hai dãy nhà, không qua mái; thuyền đi trên nước; điểm đầu và cuối đúng; ô dưới mái lấy độ cao mặt đất); làm mượt. `pnpm vitest run apps/web/src/game/ride apps/web/src/game/player`: 9 file, 85 test đều đạt.
- E2E project `maps` (`apps/web/e2e/maps.spec.ts`):
  - Test "longest ride" của từng map kiểm thêm: đúng loại phương tiện (`journey.kind`); 1 giây sau khi chạm bé đang trên đường, chưa tới đích (cách hơn 8 khối) và đất vẫn được vẽ; tới đích trong vòng 10 giây kể từ lúc chạm (8 giây cộng phần chừa cho máy chậm); hết hoạt cảnh thì nút "Bỏ qua" ẩn; bé đứng trên mặt đất.
  - Map đầu tiên của mỗi loại đi trọn chuyến; các map còn lại bấm "Bỏ qua" sau giây đầu (vừa kiểm nút, vừa tiết kiệm khoảng 30 giây cho ngân sách 480 giây của `e2e:ci`).
  - Thêm test giảm chuyển động: `journey.phase === 'fade'`, tới đích trong vòng 5 giây.
- Probe tạm (đã xóa khỏi spec): chụp chuỗi 24 khung hình mỗi 0,25 giây cho 6 tuyến (khinh khí cầu ở trung-tam, xe buýt ở truong-hoc, tàu rừng, thuyền ở dao-bi-an, đò ở lang-ven-song, cáp treo ở nui-tuyet) ở chất lượng mid. Tôi đã xem từng chuỗi và sửa những gì thấy qua ba lượt:
  - Đò của Kenney gồm nhiều phần, được gộp thành skinned mesh. Bản sao vẫn bám xương của model gốc nên đò đứng lại ở bến. Đã sửa bằng `SkeletonUtils.clone`.
  - Camera lướt xuyên qua xe lúc lên. Đã sửa bằng xoay quanh bé.
  - Camera chui vào khinh khí cầu bên cạnh và vào tán cây. Đã sửa bằng cảnh cất cánh với camera đứng yên, camera dừng trước mọi khối kể cả lá, và kéo lại gần khi bay thấp.
  - Camera sát đầu bé ở bến có tán cây phía trên. Đã sửa bằng chọn bên thoáng hoặc góc thấp, và cho tia camera bỏ qua các khối sát quanh đầu bé (tán lá ngay trên bến).
- Lần chạy cuối của toàn bộ project `maps` (`--project setup --project maps --workers=1`): 33/33 test đạt, 178 giây.
- Bản sửa cuối cùng (tia camera bỏ qua khối quanh đầu bé) ra đời sau lần chạy đó. Bản sửa đã qua eslint, typecheck các file `game/` và unit test, nhưng chưa được chụp lại hình và chưa chạy lại E2E. Lý do: lúc này `pnpm build` của web hỏng vì lỗi typecheck trong `apps/web/src/ui/minigame/**` của agent khác. Cần chạy lại project `maps` khi build sạch.

## 4. Hiệu năng

Phương tiện chở bé tốn 1 draw call (cáp treo 2). Số draw call cao nhất đo trong probe ở chất lượng mid là 164, khi xe buýt chạy qua khu phố trường học (đứng ở bến là 54). Con số cao vì camera đi theo cao hơn và xa hơn camera đi bộ nên thấy nhiều nhà và đồ vật hơn; ở trung-tam, rừng và đảo, số draw call khi đi là 30–120. Mức này vượt ngân sách khoảng 150 trong vài giây đi qua phố. FPS đo trong probe là 56–60. Cần ghi số này lên trang review của đợt.

## 5. Còn lại và đề xuất

- Ở trạm xe buýt và nhà ga tàu rừng vẫn là model nhỏ (ô tô 1,6 khối, toa 1,2 khối, đang xoay và nhấp nhô như vật nhiệm vụ). Xe chở bé là xe cỡ thật chạy vào bến. Nếu muốn điểm dừng hiện luôn xe cỡ thật thì phải đổi `RIDE_MODEL` trong `tools/world/zone-map.ts` và model trạm tàu của Khu rừng, sinh lại 7 map và chạy lại 3 bài audit. Việc này nằm ngoài phạm vi lần này.
- Bến đò ở Làng ven sông nằm trong đất, xa sông, nên đò trượt trên cỏ phần lớn chặng. Đảo bí ẩn thì đi được trên biển. Muốn đò đi trên sông thì phải dời bến ra mép sông bằng generator.
- Camera của chuyến đi coi lá cây là vật cản để không chui vào tán cây. Luật này chỉ áp cho camera chuyến đi; camera đi bộ vẫn giữ luật cũ (cây không đẩy camera).
- Không cập nhật `docs/project-roadmap.md` và `apps/web/review.html` vì không thuộc danh sách file được phép sửa.
