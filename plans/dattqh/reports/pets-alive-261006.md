# Thú cưng sống động (06/10/2026)

Plan: `plans/dattqh/261005-2305-pets-alive/plan.md`, cả 6 pha. Người sở hữu góp ý ngày 05/10/2026: "các tính năng, hoạt cảnh, hấp dẫn liên quan thú cưng còn đơn giản không có thu hút". Phần tự động đã xong và đã commit trên `main`. Chưa push, chưa deploy. Trang duyệt: mục **Thú cưng sống động** trong `apps/web/review.html`.

## Đã làm

### Pha 1: bảng chăm sóc theo mock cảnh

- Bảng chăm sóc không còn là hộp trắng. Nó dùng kiểu cảnh của màn nhiệm vụ: biển gỗ ghi "Chăm sóc Bông", hình chính con thú (ảnh `generated/pets/<id>.png`) trong khung gỗ tròn, và bong bóng giấy da có tên, cấp thân thiết, thanh thân thiết, cùng một câu của thú về việc nó đang thấy thế nào. Câu này luôn vui vẻ, lấy xoay vòng bằng `freshPicker` nên không lặp ngay.
- Ba chỉ số nằm trên giấy da. Có bốn tab gỗ: Chăm sóc, Làm trò, Phụ kiện, Đặt tên.
- Năm nút chăm sóc là đá suối có biểu tượng Fluent: Cho ăn, Vuốt ve, Tắm, Ném bóng, Ngủ trưa. Bấm nút nào thì nút đó nảy lên, và hình thú trong khung làm động tác của nút: nhai, lắc lư, rũ nước có bong bóng, nhảy tưng, nghiêng đầu ngủ. Nút trò cũng có động tác riêng: xoay, lộn, nhảy, giơ tay.
- Bảng không dừng game nữa. Khi cảnh chơi, bảng thu lại thành một dòng chú thích ở đáy ("Bông đang tắm…") để thấy cảnh trong thế giới. Cảnh xong thì bảng mở lại kèm điều vừa nhận được: "+10 thân thiết", "Bông lên cấp 2!", "Học được trò mới: Xoay vòng".
- Đặt tên bằng cách chọn trong 40 tên ở `content/names/pet-names.json`. Có nút "Gọi theo loài" để quay về tên loài. Tên hiện trên nút thú cưng ở HUD và trên nhãn của thú trong thế giới.
- Nút thú cưng mới trên HUD nằm cạnh "Bạn bè", có hình và tên thú, bấm là mở bảng. Chạm vào thú trong thế giới cũng mở bảng như trước, và thú lắc mình có tim bay lên.
- Mọi chữ đều song ngữ: thêm 77 khóa vi/en, mỗi pool lời có 3–6 câu. Lời của thú xưng "tớ/cậu", không giọng dỗ trẻ ở menu.

### Pha 2: cảnh chăm sóc trong thế giới và thú phản ứng với bé

Mã ở `apps/web/src/game/pet/`: `pet-life.ts` điều phối, `pet-motion.ts` là các động tác dựng bằng code, `pet-shapes.ts` dựng đồ của cảnh và phụ kiện.

- **Cho ăn:** một bát xanh hiện ra có bật nảy. Thú chạy tới, cúi ăn bằng clip `eat`, vụn vàng nâu bay ra, phần thức ăn trong bát vơi dần. Ăn xong thú nhảy ba cái, tim bay lên, rồi bát thu lại.
- **Vuốt ve:** thú chạy tới trước mặt bé, dụi mình. Bé làm động tác vuốt, tim bay liên tục, cuối cùng thú nhảy vui có lấp lánh.
- **Tắm:** chậu nước hiện ra. Thú nhảy vào, bé làm động tác kỳ cọ, bong bóng nổi lên. Thú nhảy ra, rũ mình làm nước bắn tứ phía, rồi có lấp lánh.
- **Ném bóng:** bé đá quả bóng bay theo đường vòng cung. Thú chồm lên chờ, chạy theo, ngậm bóng mang về, thả xuống rồi nhảy vui có nốt nhạc và sao.
- **Ngủ trưa:** một cái đệm tím được mang ra. Ở nhà, nếu bé đứng cùng tầng và cách ổ dưới 10 khối, thú về ổ của mình. Thú cuộn tròn thở chậm, chữ Z bay lên, rồi thức dậy.
- **Thú tự phản ứng với bé:**
  - Chào bé: khi vào map, khi xuống xe ở bến xa, sau "Quay lại", và khi quay lại game sau một màn mở lâu hơn 20 giây. Thú chạy từ phía sau tới, nhảy, có tim.
  - Ăn mừng: khi xong quest, thú chạy tới trước mặt bé rồi nhảy múa, có sao và tim.
  - Bé ngồi trên ghế thì thú ngồi cạnh. Bé nằm giường thì thú nằm ngủ cạnh.
  - Bé đứng yên 7 giây thì thú chạy vòng bốn điểm quanh bé, nhảy ở mỗi điểm, rồi ngồi nhìn bé 12 giây.
- **Camera:** trong lúc cảnh chơi, camera tự xoay chéo để thấy cả bé và thú. Bé tự kéo camera thì camera không giành lại. Khi chọn chuyển động giảm bớt, camera xoay chậm hơn.
- **Cảnh dừng khi bé đi:** bé bước đi thì cảnh dừng và thú đi theo. Riêng lúc chào, ăn mừng và đánh hơi thì cảnh vẫn tiếp tục.
- **Động tác dựng bằng code:** 14 động tác (ngồi, xoay, nhảy cao, lăn, đập tay, nhảy múa, nhảy vui, chào, lắc mình, rũ nước, đánh hơi, ăn, ngủ, chồm lên), xếp trên clip có sẵn của model. Cube Pets có các clip `idle/walk/run/eat/dance/gesture-positive`.
- **Hạt:** các hạt dùng chung lớp hạt của đồ vật (`objectEffects.spawn`), nên không thêm draw call. Mỗi đồ của cảnh là 1 draw call trong lúc hiện, bát là 2.
- **Giảm chuyển động:** áp dụng cho cả cài đặt máy lẫn công tắc "Chuyển động: Giảm bớt". Cảnh vẫn chơi, nhưng ít hạt, không xoay hay lăn trọn vòng, nhảy thấp. Ở mức Thấp số hạt giảm một nửa.

### Pha 3: cấp, trò, chỉ số theo thời gian (server tính)

- **Bảng `pet_bonds` theo (người chơi, thú):** mỗi thú có tên, chỉ số và XP riêng. Migration là **`0020_pet-bonds`**. Nó cũng thêm cột `characters.pet_gear`.
- **Luật** nằm ở `packages/quest/src/pet-bond.ts`:
  - Chỉ số ghi kèm thời điểm. Khi đọc, mỗi giờ trừ dần (no −3, vui −2, sạch −2) nhưng **không bao giờ dưới 40**, tức là thú không buồn, không ốm, không mất, không bị lấy gì.
  - Mỗi kiểu chăm sóc cộng **10 XP**, nhưng một kiểu chỉ trả một lần trong 30 giây.
  - Đi cùng nhau được 1 XP mỗi 30 giây. Mỗi phút trang chơi báo một lần. Server đếm theo đồng hồ của nó, tối đa 60 giây mỗi lần báo, nên báo dồn cũng không nhanh hơn.
  - Có 10 cấp (0, 40, 100, 180, 280, 400, 550, 720, 900, 1100 XP).
- **6 trò mở theo cấp:** ngồi (cấp 1), xoay (2), nhảy cao (3), lăn tròn (4), đập tay (5), nhảy múa (7). Server từ chối trò chưa mở với `403 trick-locked`, và bảng hiện "Mở ở cấp N".
- **Route** (chỉ tác động lên thú của người chơi đang chọn):
  - `GET/POST /api/character/pet/care`
  - `POST /api/character/pet/walk`
  - `POST /api/character/pet/trick`
  - `PUT /api/character/pet/name`
  - `PUT /api/character/pet/gear`
- **Khóa hàng:** mọi thay đổi khóa hàng `pet_bonds` trong transaction, nên gọi đồng thời chỉ trả một lần.
- **Cho ăn món đã nấu:** server hỗ trợ `itemId` để cho ăn món bé đã nấu, có kiểm sở hữu và trừ một món. Việc này cũng sửa lỗi cũ: trước đây cho ăn ghi đè số lượng mọi món trong `shop_inventory` của bé. Bảng chăm sóc chưa có nút chọn món.

### Pha 4: phụ kiện và ổ thú

- **9 phụ kiện** ở `content/pet-gear.json`, tất cả dựng bằng code (khối, nón, cầu ghép thành một mesh, 1 draw call mỗi món), không thêm tệp asset nào:
  - Trên đầu: mũ sinh nhật, mũ rộng vành, vương miện, nơ hồng, nơ xanh, hoa cài.
  - Ở cổ: vòng cổ chuông, vòng cổ huy chương, khăn quàng.
- **Vị trí gắn:** đỉnh đầu tìm bằng tia chiếu thẳng xuống giữa đỉnh (đậu giữa hai tai, không trên tai). Vòng cổ ôm đáy khối thân, kích thước đo bằng tia từ bốn phía. Ảnh kiểm tra 8 thú khác hình dáng nằm ở `assets/generated/review/pets/`.
- **Cửa hàng:** có tab mới **Thú cưng** (`content/shop/thu-cung.json`, giá 50–200 Xu, ba món cần cấp 3/5/8). Kiểu hàng mới `pet-gear` mua một lần là có mãi. `content:check` báo lỗi nếu một phụ kiện không được bán hoặc hình không có.
- **Đeo phụ kiện:** đeo ở cửa hàng ("Cho thú cưng đeo") hoặc ở tab Phụ kiện của bảng. Mỗi chỗ chỉ một món, và chỉ món đã mua (`403 gear-not-owned`). Đổi thú thì phụ kiện vẫn ở lại.
- **Người chơi khác thấy:** presence online có thêm `petGear`, và server lấy giá trị này từ nhân vật đã lưu. Đổi phụ kiện thì người khác thấy ngay.
- **Ổ thú:** có ô trang trí mới "Ổ thú cưng" với 6 kiểu dựng bằng khối: giỏ mây (miễn phí), hồng trái tim, xanh ngôi sao, bạc hà xương, vàng dấu chân, tím đám mây. Năm kiểu sau bán trong mục Nhà cửa, giá 60–120.
  - Ổ đặt trên tầng 2, sát tường cạnh chân giường của bé, và đi xuyên được.
  - Map `nha-cua-be` đã sinh lại. Kiểm tra cảnh vật, phòng và đường tới đều đạt.
  - Chạm vào ổ ("Cho thú cưng ngủ") thì thú tới ngủ ở đó.

### Pha 5: đánh hơi giúp tìm đồ

- Ở bước tìm đồ (`search`, `find-object`) HUD hiện nút **Đánh hơi**, khi còn món chưa tìm và món đó đang có trên map.
- Thú đánh hơi tại chỗ rồi đi chậm về phía món gần nhất, có vết chân trên đất. Nó chỉ đi tối đa 5 khối, không quá 60% quãng đường, và dừng trước món: với món còn xa, nó dừng cách món ít nhất 2 khối. Tới nơi, nó chồm lên nhìn về hướng món đó.
- Sau mỗi lần đánh hơi phải chờ 20 giây; trong lúc chờ nút hiện "Chờ N giây".
- Thú không bao giờ chỉ đáp án câu hỏi: danh sách món do `sniffTargets` trong `quest-flow.ts` lấy, và chỉ trả về chỗ của món ở hai loại bước tìm đồ.

### Pha 6: kiểm thử, tài liệu, trang duyệt

- **Unit test mới:**
  - `pet-bond.test.ts`: 10 test.
  - `pet-care-routes.test.ts` (11 test), gồm:
    - IDOR: người chơi khác trong cùng tài khoản và gia đình khác.
    - Chống gian lận: gửi kèm số bị 400; gọi lặp và gọi đồng thời 5 lần chỉ trả 10 XP; đi bộ báo dồn không cộng thêm.
    - Trò chưa mở, tên ngoài danh sách, phụ kiện chưa mua, hai món một chỗ, món nấu.
  - Test UI: `pet-life.test.ts` (16, gồm mỗi nút một cảnh, cả 6 trò, nhặt bóng, ngủ ở ổ, đánh hơi, phản ứng), `pet-care-panel.test.tsx` (9), `pet-hud.test.tsx` (4).
  - Test thêm vào các file có sẵn: shop schema và route, export tài khoản, cascade xóa, presence online, `quest-flow`, giữ phím trong hộp thoại.
- **E2E mới:** project `pets` (`apps/web/e2e/pets.spec.ts`, 6 test). Có một vòng chăm sóc đủ (`@smoke`), bốn cảnh còn lại, ngủ ở ổ, đánh hơi trong rừng, và draw call ở mức Cao.
- **Tài liệu:**
  - `docs/system-architecture.md`: thêm dòng "Thú cưng sống động".
  - `docs/codebase-summary.md`: thêm dòng Thú cưng.
  - `docs/project-roadmap.md`: thêm mục mới.
  - Trang duyệt: 7 ảnh cảnh, 8 ảnh phụ kiện.

## Số liệu kiểm tra (máy dev, 06/10/2026)

| Lệnh | Kết quả |
| --- | --- |
| `pnpm assets:check` | OK, 16 pack, 4619 file |
| `pnpm content:check` | OK, 1980 file |
| `pnpm test --maxWorkers=2` | 525 file đạt, 1 bỏ qua; 6445 test đạt, 1 bỏ qua (test symlink có điều kiện, như trước) |
| `pnpm typecheck` | sạch (root, server, web) |
| `pnpm lint` | exit 0, 0 cảnh báo |
| `pnpm --filter @miu/web build` | exit 0. Hai cảnh báo có từ trước: chunk > 500 kB, Vite `configLoader: 'native'` |
| `pnpm security:dist` | OK, bundle không chứa đáp án quest |
| `pnpm --filter @miu/web e2e:smoke` | 13/13 đạt (51 s) |
| E2E `setup` + `creator` + `interactions` + `online` + `pets` | 12 đạt, 1 bỏ qua (ảnh duyệt của interactions chỉ chạy khi `REVIEW_SHOTS=1`); tổng 105 s, test chậm nhất 26 s |
| Draw call mức Cao, Nhà của bé (GPU Mac) | 101 lúc không có cảnh, 108 trong cảnh tắm; nhà bật đèn 145 (ngân sách 150, CI đo bằng GPU giả lập ít hơn) |

Không chạy project `perf` và lượt `e2e:ci` đầy đủ. Lượt đầy đủ để CI chạy.

## Khác với plan hoặc với đề bài

- Plan ghi "cửa hàng đã bán thức ăn và đồ chơi thú cưng", nhưng thực ra cửa hàng chưa có món nào cho thú. Thức ăn trong cảnh cho ăn là thức ăn của thú, không tốn gì. Món nấu ở bếp cho ăn được qua API nhưng bảng chưa có nút chọn món. Nếu cần sẽ làm ở đợt sau.
- Nút Ngủ trưa là nút thứ năm, vì đề bài liệt kê cảnh ngủ trưa có Zzz. Ngủ trưa cộng vui vẻ, không có chỉ số "năng lượng" riêng.
- Cảnh chăm sóc chơi ngay khi bé bấm, song song với lời gọi server. Nếu server từ chối, cảnh vẫn chơi nhưng không con số nào đổi, và bảng báo lỗi.
- Đánh hơi là nút bé tự bấm, không tự chạy, để bé chủ động và không lộ hết.
- Phụ kiện trên thú của người chơi khác vẫn hiện ở mức Thấp, mỗi món thêm 1–2 draw call (một cho bóng đổ).
- Chưa có ảnh trong game của thú đang đeo phụ kiện. E2E không có Xu để mua, nên ảnh phụ kiện được render bằng trang render (`pnpm assets:preview pets`).

## Review độc lập

Agent `code-reviewer` đã review 4 commit đầu. Không có lỗi nghiêm trọng (Critical). Server được đánh giá chắc chắn: phân quyền theo người chơi đang chọn, khóa hàng, trừ món nấu, migration, export và xóa. Các phát hiện đã sửa ở commit `b7ac72dd`:

- **High:** vòng chạy quanh bé đứng ở điểm đầu vì `goTo` gọi lại mỗi khung hình. Đã sửa, và đã thêm test cho cả vòng (nhảy ở mỗi điểm rồi ngồi).
- **Medium:**
  - Phím WASD hay Space bấm khi bảng đang mở lọt vào game. Giờ phím bấm trong hộp thoại thuộc về hộp thoại; nút HUD vẫn nhận phím như cũ. Có test.
  - Phụ kiện đổi ở bảng bị mất khi sang map khác. Bảng giờ báo lại cho màn chơi.
  - Thú của người chơi khác đổi phụ kiện đúng lúc model đang tải. Giờ nó đeo phụ kiện mới nhất, và bản tải thừa được giải phóng.
- **Low đã sửa:**
  - Bớt cấp phát mỗi khung hình (đánh hơi chỉ kiểm 4 lần/giây).
  - Bảng chỉ thu lại với đúng cảnh của nó (không thu khi đang chào bé).
  - Đánh hơi không bị hủy khi bé đi theo.
  - Export có đủ `carePaidAt`, `walkedAt`.
  - Nút HUD không gọi API mỗi lần đóng màn.
  - Sửa chú thích schema.
- **Low không sửa:**
  - Mỗi món dùng material riêng: số draw call vẫn vậy, và giải phóng đơn giản hơn.
  - Phụ kiện thú người khác ở mức Thấp: như mục trên.
  - Tab trình duyệt cũ sau khi deploy không nhận được `petGear`, nên người chơi khác biến mất cho tới khi tải lại trang. Đây là mẫu đã có ở các đợt online trước; khi deploy cần nhắc tải lại tab đang mở.

## Dependency, dữ liệu trẻ

- **Không thêm dependency.**
- **Dữ liệu mới ở server:** chỉ số thú, XP, tên chọn trong danh sách, thời điểm chăm sóc và đi bộ. Đây là dữ liệu chơi, không phải dữ liệu cá nhân, nên không đổi lời đồng ý. Dữ liệu mới có trong file tải dữ liệu tài khoản và bị xóa theo người chơi (đã có test).

## Việc của người

- Duyệt trên trang review và chơi thử: mở bảng từ nút thú cưng ở HUD, bấm cả năm nút, gọi trò, đặt tên.
- Deploy production khi người sở hữu cho phép. Lần deploy này có migration `0020_pet-bonds`.

Status: DONE_WITH_CONCERNS
Summary: Đã làm đủ 6 pha: bảng chăm sóc theo mock cảnh, năm cảnh chăm sóc trong thế giới, thú phản ứng ở 4 tình huống trở lên, 6 trò mở theo cấp do server tính, chỉ số giảm chậm có sàn vui vẻ, 9 phụ kiện và 6 kiểu ổ thú, nút đánh hơi. Mọi gate, build, `security:dist`, smoke và các project E2E liên quan đều đạt.
Concerns: Cho ăn món nấu mới có ở API, chưa có nút. Tab trình duyệt cũ cần tải lại sau khi deploy. Chưa push, chưa deploy.
