# Thiết kế mẫu: thế giới và các map chủ điểm

Mock của người sở hữu (01/10/2026, hai ảnh, mỗi map có cận cảnh và toàn cảnh), chuẩn tạo hình khi dựng map trung tâm (Trường học) và các map chủ điểm bằng `tools/world/generate-*-map.ts`. Quyết định dùng mock thế nào: `plans/dattqh/reports/jev-261001-2315-map-mocks.md`. Plan: `plans/dattqh/261001-2106-more-maps-lesson-regroup/`.

Chữ trong ảnh, biển hiệu và đồ vật là gợi ý tạo hình, không phải asset: map chỉ dùng block, pack có license và prop dựng bằng code (xem `.claude/rules/assets-pipeline.md`). Mock Trường học trước đó: [`design-truong-hoc.md`](design-truong-hoc.md).

Ảnh gốc: `designs/the-gioi/mock-a-truong-hoc-va-cac-khu.png` (khung `a-*`), `designs/the-gioi/mock-b-toan-canh-cac-khu.png` (khung `b-*`).

## Cấu trúc theo mock

Hai ảnh toàn cảnh vẽ một vùng 256 × 256: Trường học ở giữa, quanh là Làng, Rừng, Hồ/Sông, Chợ, Nông trại, Núi, Bến tàu. Trong game: map Trường học là map trung tâm dựng như ảnh đó, có cổng sang map riêng 256 × 256 của từng chủ điểm; mỗi map có cổng về trung tâm.

## Thế giới (`designs/the-gioi/`)

| File | Nội dung cần có |
| --- | --- |
| `a-01-toan-canh-khu-vuc-256.png`, `b-01-toan-canh-khu-vuc-256.png` | Toàn cảnh: trường mái đỏ có tháp đồng hồ ở giữa, nhà đa năng mái xanh; đường nhựa có vạch qua đường và đèn; quanh là làng mái nhiều màu, ruộng và nông trại có cối xay gió, chợ, rừng, sông uốn quanh, hồ có cầu gỗ, bến tàu có hải đăng, núi đá có thác ở rìa; cây hoa hồng nhạt xen cây xanh. |
| `a-16-npc-nhan-vat.png` | Dàn người: bạn học, thầy giáo, cô giáo, bác bảo vệ, cô lao công, người bán hàng, nông dân, thủ thư, lính gác, người lớn khác. |
| `a-17-hoat-dong-tuong-tac.png` | Hoạt động: nói chuyện (bong bóng lời), mua hàng ở sạp, trồng cây và tưới nước, nhận nhiệm vụ ở bảng có dấu "!", đọc sách. |
| `b-04-ho-song-toan-canh.png` | Hồ, sông: mặt nước rộng, cầu tàu gỗ, thuyền buồm, nhà ven hồ, hải đăng đỏ trắng. Dùng cho Làng Ven Sông. |
| `b-09-ben-tau-toan-canh.png` | Bến tàu: bãi cát, cầu tàu, thuyền, quán ven bến, hải đăng trên mỏm đá. Dùng cho Làng Ven Sông. |
| `b-10-duong-chinh-toan-canh.png` | Đường chính: đường thẳng có vạch qua đường, đèn đường hai bên, hàng cây, nhà hai bên. Dùng quanh trường ở map trung tâm. |
| `b-12-hoang-hon-toan-canh.png` | Cả vùng lúc hoàng hôn (gợi ý ánh sáng chiều). |

## Từng map

| Map | File | Nội dung cần có |
| --- | --- | --- |
| Trường học (trung tâm) | `designs/truong-hoc/v2-a-02-cong-truong.png` … `v2-a-06-khu-vui-choi.png`, `v2-b-02-toan-canh-phia-truoc.png`, `v2-b-03-goc-nhin-phia-sau.png` | Cổng trụ đá, cánh cổng sắt, xe buýt vàng; sân trường có tượng đài và đài phun nước, ghế đá, bồn hoa; nhà đa năng mái vòm xanh với sân bóng rổ đỏ; vườn khoa học có nhà kính và luống gỗ; khu vui chơi có xích đu, cầu trượt, nhà hoa. |
| Trường học, trong nhà | `designs/truong-hoc/v2-a-11-phong-hoc.png` … `v2-a-15-phong-chuc-nang.png` | Phòng học (bảng xanh, bàn gỗ), phòng thư viện (kệ sách, bàn đọc; dùng cả cho phòng đọc của map Thư viện), hành lang, cầu thang gỗ, phòng chức năng (bảng, giá vẽ, đàn, tranh). |
| Làng Ven Sông | `designs/lang-ven-song/a-07-lang-can-canh.png`, `b-06-lang-toan-canh.png` | Nhà mái ngói đỏ và cam, tường vàng, cửa sổ xanh, hàng rào gỗ, sạp gỗ bán rau hoa, lối lát đá, cây xanh và cây hoa, một tháp nhọn giữa làng; thêm hồ, bến tàu theo khung thế giới. |
| Chợ phiên | `designs/cho-phien/a-08-cho-can-canh.png`, `b-07-cho-toan-canh.png` | Sạp gỗ mái vải sọc đỏ trắng, xanh trắng, vàng; thùng rau quả đầy màu; quảng trường lát gạch; nhà quanh chợ; người mua bán đi lại. |
| Nông trại | `designs/nong-trai/a-09-nong-trai-can-canh.png`, `b-05-nong-trai-toan-canh.png` | Ruộng rau quả chia ô có hàng rào gỗ, cối xay gió gỗ, nhà mái đỏ, chuồng đỏ mái xám, bò sữa, nông dân đội nón, cây hoa hồng nhạt. |
| Khu rừng bí mật | `designs/khu-rung-bi-mat/a-10-rung-can-canh.png`, `b-08-rung-toan-canh.png` | Suối có cầu gỗ, vách đá có thác, cây xanh dày và cây hoa hồng nhạt, lối mòn. |
| Núi tuyết (sau) | `designs/nui-tuyet/b-11-nui-toan-canh.png` | Núi đá nhiều tầng, thác, cầu treo gỗ: phông nền ở rìa map trung tâm. |

Thư viện, Xóm Mái Ấm, Lâu đài chưa có khung riêng: dựng theo phong cách chung ở trên (mái nhiều màu, hoa, hàng rào, đèn), phòng đọc Thư viện theo `v2-a-12-thu-vien-trong-truong.png`.
