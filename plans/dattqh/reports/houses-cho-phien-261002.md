# Chợ phiên: nhà to, cửa rộng, cảnh vật và mạng đường (02–03/10/2026)

Plan: `plans/dattqh/261002-2216-houses-big-wide-doors/` (pha 2, map `cho-phien`). Luật: `.claude/rules/world-scenery.md`.
Tệp đã sửa: `tools/world/generate-cho-phien-map.ts`, `tools/world/structures/cho-phien-market.ts`; sinh lại `assets/generated/world/cho-phien/**` (`pnpm world:cho-phien`) và 11 khung mock (`PREVIEW_ONLY=mock__`, qua khóa chụp). Không sửa tệp dựng chung, `models.json`, `box-props`, `mock-views`, `targets.json`, `content/quests/**`.

## Số đo

| Kiểm tra | Trước (bản đã commit) | Sau |
| --- | --- | --- |
| `room-audit` | 519 không gian có mái, 2 thiếu: nóc kệ hàng trong nhà lồng 27 × 1 (trèo 3 khối), ruột tháp đồng hồ 5 × 5 (không lối vào). Lúc đo, công cụ chỉ thấy mái cách sàn ≤ 9 khối nên phần lớn lòng nhà không được đo | 343 không gian có mái (công cụ mới thấy mái tới 24 khối), **0 thiếu**; cửa hẹp nhất 18 ô (tính cả hiên), trèo lớn nhất 0, sàn trống thấp nhất 88%, tới được 100% |
| `reach-audit` | mọi mục tới được, chỗ xuất phát trống | **mọi mục tới được; chỗ xuất phát trống** (102 mục) |
| `scenery-audit` | 4 cây trên đường, 15 đồ giữa lối, 8 nơi không cạnh đường, 2 nơi bị cắt khỏi mạng | **0 / 0 / 0 / 0** |
| `tsc --noEmit` | — | 0 lỗi |
| `eslint --max-warnings=0` (2 tệp của map) | — | 0 lỗi, 0 cảnh báo |

Kiểm riêng lối đi trong nhà lồng (sàn 41 × 22 tính cả đồ có va chạm): 77% sàn trống; lối giữa và hai lối bên rộng 7, lối trước, lối ngang, lối sau rộng 3 (biển phấn của sạp chiếm một ô ở đầu lối, còn ≥ 2). Chỉ 4 ô trống lẻ không thuộc ô vuông 2 × 2 trống nào: đều là khe giữa hai món hàng bày trước quầy sạp, nằm sát lối rộng 7, không phải lối đi.

## Từng công trình

| Công trình | Cũ | Mới |
| --- | --- | --- |
| Nhà phố lối cổng chợ (d-09, d-10) | 6 nhà 10–11 × 9, tường 7, cửa 2 | 4 nhà 16 × 12, tường 7, cửa 3 × 3, ngưỡng gỗ ở cửa; mỗi bên 2 nhà, có lối giữa |
| Nhà phố Phố chợ (sang dãy cân đong) | 10–12 × 9 | 13–15 × 11, mặt tiền vẫn cách giữa đường 7 khối; dãy nhà thưa hơn |
| Nhà phố phía bắc | 10–12 × 9 (bên bắc) và × 8 (bên nam) | 13–15 × 11 cả hai bên |
| Mọi nhà phố (chung) | mái hiên sọc nhô ra đường, cửa 2 | cửa 3 × 3 (`doorwaySize`), ngưỡng ván ở lòng cửa ngang sàn, mái hiên treo từ tường, hai hàng ô trước cửa giữ trống (đèn, đồ bày, hàng rào ven đường tránh ra). Không có bậc vì sàn ngang mặt đất. Tổng 93 nhà phố (trước 115: nhà to hơn nên thưa hơn) |
| Nhà lồng chợ | 31 × 16, tường 8, cửa 5 × 3, kệ hai tầng dọc ba tường, hai quầy cân, bao tải; tháp đồng hồ rỗng | 43 × 24, tường 8 (nóc cao 21 khối trên sàn), cửa trước 7 × 4, cửa sau 5 × 4 ra lối xuống kênh. Bên trong là chợ có mái: 8 sạp (mỗi bên lối giữa 2 sạp quay vào lối giữa, dọc mỗi tường hông 2 sạp quay vào trong), người bán và khách đi chợ như sạp ngoài; kệ hàng dọc tường sau chia thành ngăn 5 ô xen bao tải; dây cờ ngang dưới mái, đèn tường. Tháp đồng hồ dời lên giữa nóc, dựng từ mặt mái lên và đặc ruột, đồng hồ hai mặt; chóp vàng ở y = 46 (trần map 48) |
| Lán gỗ bên kênh | 8 × 6, cột cao 3 | 12 × 8, mái ván cao 4, ba mặt mở, vách sau, 5 thùng/thùng gỗ dọc vách |
| Chuồng thỏ, cổng chợ, gầm cầu/cầu tàu | — | giữ nguyên (xem ngoại lệ) |
| Nhà tranh các xóm (`hamlet`, bộ dựng chung đã to ra) | — | bố cục nhường chỗ: hai xóm sau nhà phố phía bắc lùi từ z 300/304 xuống 308; các dải xóm và ruộng chia lại để nhà, hiên và cây sân dừng cách đường dọc ≥ 6 khối (trước đây hai nhà tranh nằm đè lên đường cổng chợ x = 220, rào và cây sân mọc trên đường) |

Không bỏ nhà nào ngoài số nhà phố tự giảm vì to ra; `ZONES`, tên mọi địa danh và mục quest giữ nguyên.

## Cảnh vật và mạng đường

- Cây trên mặt lát: cây góc quảng trường (248, 393) và cây vườn (300, 314) nay mọc trong bồn đất 3 × 3 có viền đá xám (tự làm khi gốc cây rơi trên đá lát).
- Đồ giữa lối: mái hiên nhà phố treo từ tường; sân trước nhà lồng nới rộng nối liền quảng trường (chậu hoa, dây cờ không còn ở lối hẹp); lối lát quanh nhà lồng và lối nối sang dãy sạp hoa giữ trống; góc giao nhau của đường ngoài chợ giữ trống để hàng rào ven đường không chắn ngang đường kia.
- Đường mới (thêm vào `ROUTES`, đường lát 3 khối, bám địa hình): lối từ cửa sau nhà lồng xuống đường bờ kênh (điểm đầu chương 1 và bến xe về cổng nằm trên lối này); cầu ván qua kênh ở x = 480 từ đường bờ kênh tới đường phía nam (mốc "Con kênh" nằm trên cầu, thuyền tránh chỗ cầu); lối từ đường bờ kênh qua dãy sạp cá ra cầu ván tới đảo hải đăng.
- Sân lát bến xe quanh chỗ xuất hiện (cổng về Trung tâm, hai bến xe trên sân); lối lát nối lối cổng chợ với dãy sạp hoa.
- Mốc "Ruộng rau ngoại ô" dời từ (300, 220) (giữa đồng, không đường) tới cạnh đường cổng chợ giữa các ruộng (232, 220); tên giữ nguyên, không quest nào neo vào mốc này.

## Ngoại lệ (không gian có mái không phải nhà, đều không thiếu chuẩn)

- Gầm cầu rồng, cầu ván qua kênh, cầu tàu, cầu ván ra hải đăng (các ô y = 9 dưới mặt ván): gầm cầu trên nước.
- Gầm xà cổng chợ (220, 306): cổng, rộng cả hai đầu.
- Mặt mái nhà lồng quanh chân tháp, dưới gờ đá của tháp (216–224, 412–420, y = 31): mặt mái, bé không lên tới.
- Mái chuồng thỏ trong khu thú nuôi (249–254, 394–398): chuồng vật nuôi, cao 2 khối.

## Khung mock

Chụp lại cả 11 khung, không cần chỉnh góc: d-01 thấy nhà lồng to với tháp đồng hồ sau quảng trường; d-09, d-10 thấy tháp đồng hồ cuối lối cổng chợ giữa hai dãy nhà phố mới; d-02 thấy hai nhà phố lớn hai bên sau cổng. Mock không có khung nội thất nhà lồng.

## Đề xuất cho tệp chung

- `hamlet` (scenery.ts) chỉ kiểm đường ở một điểm giữa nhà, nên nhà tranh to có thể đè lên đường dọc; nên kiểm cả bề ngang nhà, hiên và cây sân (chỗ này map đã tránh bằng cách chia dải).
- `laneVerge` đặt hàng rào 3 đoạn chỉ kiểm ô đầu, đoạn sau có thể chắn ngang đường cắt qua; nên kiểm từng đoạn.

## Còn mở

Không có.

Status: DONE
Summary: Nhà phố 13–16 × 11–12 cửa 3 × 3, nhà lồng 43 × 24 thành chợ có mái với lối đi ≥ 3 (7 ở lối chính), lán gỗ 12 × 8, tháp đặc; room-audit 0 thiếu, reach-audit đủ, scenery-audit 0/0/0/0, tsc và eslint sạch.
Concerns: Không chạy `pnpm test`/E2E theo yêu cầu.
