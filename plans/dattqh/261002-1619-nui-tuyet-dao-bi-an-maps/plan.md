# Mở map Trung tâm, Núi tuyết và Đảo bí ẩn theo mock chi tiết

Trạng thái: đang làm · Tier tổng: XL · Nhánh: `main` · Ngày: 02/10/2026

Người sở hữu (02/10/2026): "mock design map núi tuyết và đảo bí ẩn tôi đã cung cấp rồi, dựa vào plan liên quan rồi mở thêm 2 map đó nữa đi". Mock: `designs/nui-tuyet/d-01 … d-15`, `designs/dao-bi-an/d-01 … d-14` (cắt từ `mock-d-chi-tiet.png`).

Người sở hữu thêm trong lúc làm (02/10/2026): "Lưu ý làm map trung tâm theo mock nữa. Map trung tâm sẽ hiển thị ở giữa ở màn chọn map. Vì map trung tâm chính là nơi các nhân vật sẽ thấy được nhau online". Mock: `designs/trung-tam/d-01 … d-08`. Việc này thay quyết định cũ "quảng trường trung tâm nằm trong map Trường học" (`jev-261002-0802-detail-mocks.md`): Trung tâm thành map riêng (`trung-tam`), là `HUB_REGION` (mọi map có cổng về đây; Trung tâm có cổng sang cả mười map), đảo Trung tâm ở giữa ảnh chọn map (Home và bản đồ thế giới). Quảng trường cũ trong map Trường học giữ nguyên các cổng của nó, thêm cổng về Trung tâm.

Plan liên quan: `261002-0802-detail-mocks-per-map` (khuôn dựng map theo mock, bản giao việc `phase-04-map-rework-brief.md`), `261002-1139-sgk-lop2-tap2-content` (pha 4 dựng Đảo bí ẩn; bài tập 2 chưa kiểm kê).

## Quyết định (Jev, `plans/dattqh/reports/jev-261002-1619-open-snow-island.md`)

| # | Câu hỏi | Chốt |
| --- | --- | --- |
| F1 | Hai map chưa có bài, mở thế nào | Mở ngay, mỗi map một quest câu chuyện chào mừng (gặp người dẫn đường, đi qua các nơi trong mock, thử thách ôn kỹ năng tập 1, phần thưởng); luồng chơi theo quest giữ nguyên; bài tập 2 vào sau (0,98, auto) |
| F2 | Núi tuyết trong bản đồ bài tập 2 | Plan tập 2 chia lại 71 bài cho 10 map ở pha 2 (0,97, auto) |

Tự quyết (kỹ thuật): atlas khối lên 1024 px vì thêm 6 ô (tuyết, băng, cỏ đảo, dung nham, pha lê) — dưới ngưỡng 2048 px Jev đặt ở plan KTX2; vùng đất ngoài dùng theme có sẵn với nền riêng của map (`soil`), không thêm theme mới.

## Kết quả cần đạt

- Map Trung tâm 800 × 800 theo `designs/trung-tam/`: quảng trường đài phun tượng mèo, dãy cổng sang mười map, cửa hàng, khu giao dịch, bảng nhiệm vụ/sự kiện, chòi chờ tổ đội, cầu và biển chỉ đường, khu sự kiện theo mùa, lâu đài làm phông; rất đông bạn nhỏ như người chơi online.
- Hai map 800 × 800 dựng bằng `zone-map.ts`, nền riêng (tuyết; cỏ nhiệt đới và cát), bố cục và cận cảnh theo từng khung mock, công trình chính đi vào được (nhà nghỉ/cửa hàng/trạm nhiệm vụ; đền thờ/hang/kho báu), đời sống (người và vật), xe/đò/cáp treo nối các khu, cổng về trung tâm.
- `regions.json`: ba vùng `open` có `map`, `music`, `guide`, `backdrop`, `events`; ảnh chọn map có đảo Trung tâm ở giữa.
- Mỗi map một quest câu chuyện chào mừng (chương 1), đủ check nội dung.
- Ảnh đối chiếu từng khung mock trên trang review; ảnh nền vùng; ảnh toàn cảnh Home cập nhật.

## Pha

| Pha | Tier | Nội dung | Ai |
| --- | --- | --- | --- |
| 1 | M | Nền chung: khối mới + palette + atlas, đăng ký vùng, lệnh `world:*`, cổng + biển tên ở quảng trường, preview/review, test danh sách map | chính |
| 2 | L × 3 | Dựng từng map theo mock (generator, cấu trúc riêng, prop hộp, góc chụp, đời sống, báo cáo) — bản giao việc [`phase-02-map-brief.md`](phase-02-map-brief.md) | agent mỗi map, song song |
| 3 | M | Ba quest chào mừng + mục quest, người dẫn đường; ảnh chọn map có Trung tâm ở giữa | chính |
| 4 | M | Nghiệm thu: sinh lại map, ảnh, docs, roadmap, trang review, plan tập 2, đủ gate, commit | chính |

## Không làm

- Bài SGK tập 2 (plan `261002-1139`); chu kỳ ngày đêm; theme vùng ngoài mới; đo `perf`.

## Nghiệm thu

- `tools/world/zone-maps.test.ts` có ba map mới (khớp output, quest đứng trên đất, sinh động, đi tới mọi mục quest).
- Mỗi khung mock có ảnh cùng góc trong game; báo cáo map ghi đạt/gần/chưa.
- Gate: `pnpm assets:check` → `content:check` → `test` → `typecheck` → `lint`, `pnpm --filter @miu/web build`, `pnpm security:dist`, `pnpm --filter @miu/web e2e:ci`.

## Tiến độ (02/10/2026 ~17:40, phiên dừng vì hết quota)

| Pha | Trạng thái |
| --- | --- |
| 1 Nền chung | Xong: khối mới, atlas 1024, ba vùng `open`, `HUB_REGION = trung-tam`, cổng về Trung tâm trên 8 map cũ (đã sinh lại cả 8, kể cả Lâu đài), `generated.json`, preview/review, ảnh chọn map (Trung tâm ở giữa; E2E `home` 12/12), bỏ góc `trung-tam/d-*` cũ khỏi map Trường học, dời 3 cư dân đón khách khỏi chỗ xuất hiện trong rừng |
| 2 Dựng map | Trung tâm xong (báo cáo `reports/map-trung-tam-261002-new-map.md`), Núi tuyết xong (`reports/map-nui-tuyet-261002-new-map.md`, tiền tố prop `ntu-` vì `nt-` là Nông trại — giữ), Đảo bí ẩn xong (`reports/map-dao-bi-an-261002-new-map.md`; test map 4/4, 31 interactable) |
| 3 Quest chào mừng | Xong: `trung-tam-ch1`, `nui-tuyet-ch1`, `kho-bau-dao-ch1` (đổi tên để `forest-ch1` vẫn là quest đầu của bé mới) |
| 4 Nghiệm thu | Còn: `pnpm assets:regions` (thêm `backdrop` cho 3 vùng mới trong `regions.json`), đủ gate (`assets:check` → `content:check` → `test` → `typecheck` → `lint`, build web, `security:dist`, `e2e:ci` — hẹn cổng với phiên khác), báo cáo nghiệm thu, commit (chỉ `git add` tệp của plan này), rồi **deploy production** (người sở hữu đã cho phép lần này: "làm xong hết thì deploy lên prod nhé") theo `docs/deployment-guide.md` §7 — cây làm việc có thay đổi của phiên khác nên deploy từ bản export commit (`git archive`, `MIU_RELEASE_REV`) |

Hạn chế ghi nhận: ảnh d-03/d-08 Trung tâm thiếu người (runtime chưa dựng nhân vật xa lúc chụp); lâu đài Trung tâm thấp hơn mock (trần 48 khối); chim cánh cụt/gấu trắng Núi tuyết mượn routine `chick`/`fox` (lời thoại chưa đúng loài, cần routine riêng ở web); khỉ trên Đảo là prop tĩnh (chưa có routine khỉ); khung tối d-08, d-09, d-13 của Đảo sáng hơn mock (chưa có chế độ đêm).
