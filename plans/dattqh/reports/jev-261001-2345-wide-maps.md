# Jev — map rộng gấp 10 (01/10/2026 23:45)

Người sở hữu (23:28, 23:3x): "mỗi map phải rộng gấp 10 lần so với bây giờ, mục tiêu sau này game có thể online nhiều người chơi với nhau… cần không gian thật đủ rộng để các em khám phá. Đồng thời cũng có nhiều cái thiết kế giống đời sống thật hơn" và "việc mở rộng map gấp 10 thì phải tối ưu render, lazy load cảnh ở xa để tối ưu phần cứng thiết bị".

## Hiện trạng đo được

- Map 256 × 48 × 256 (3,1 triệu block, 3 MB bộ nhớ, chunks.bin ~130 KB). Game tải cả file, meshing mọi chunk lúc vào map (worker), rồi ẩn chunk ngoài tầm nhìn (40/64/110 block theo chất lượng). Prop gộp một lô mỗi vật liệu cho cả map. Dân làng, thú vật luôn cập nhật.
- Gấp 10 diện tích ≈ 810 × 810 (31 MB, ~1,3 MB tải, 7.800 chunk, đi bộ ngang ~3 phút). Gấp 10 cạnh = 2560 × 2560 (315 MB — không giữ được trên điện thoại, phải stream từ server; đi ngang ~9–10 phút).

## Quyết định (jev-1.13.0)

| Câu | Mức | Jev chọn | Độ tin cậy | Xác suất | Quyết |
| --- | --- | --- | --- | --- | --- |
| Kích thước map | medium | area-x10 (~800 × 800) | 0,75 | 0,84 · staged 0,10 · side-x10 0,06 | escalate → dùng lựa chọn của Jev |
| Tải và vẽ | low | region-files-and-lod | 1,0 | 1,0 | auto |
| Đi lại | low | local-lessons-and-rides | 1,0 | 1,0 | auto |

1. **Mỗi map ~800 × 800 block** (giữ cao 48). Toàn bộ block giữ trong bộ nhớ (~31 MB) nhưng tải và meshing dần theo vùng quanh bé.
2. **Vùng 128 × 128** là file tĩnh trong manifest; tải vùng gần trước, phần còn lại khi cần. Worker meshing và giải phóng chunk theo khoảng cách, có ngân sách mỗi khung. Prop gộp theo ô 64 × 64, hiện theo khoảng cách. Dân làng, thú vật, mục tiêu ở xa thì ngủ. Chân trời là một lưới địa hình thô để thế giới vẫn trông rộng. Giữ ba mức chất lượng.
3. **Bài học vẫn là quãng đi ngắn** trong khu của chương; các khu nằm ở các quận khác nhau của map. Đi giữa quận bằng xe đời thường (trạm xe buýt, đò, xe bò, xe đạp) hoặc chạm biển chỉ đường của nơi đã đến; mũi tên nhiệm vụ dẫn đường.

Ghi vào plan `plans/dattqh/261001-2106-more-maps-lesson-regroup/plan.md` (phase 7d, 7e).
