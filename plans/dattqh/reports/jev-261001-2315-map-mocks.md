# Jev — mock bản đồ mới (01/10/2026 23:15)

Người sở hữu gửi hai ảnh mock (ChatGPT) cho các map mới, mỗi map có cận cảnh và toàn cảnh, và giao: cắt ghép lưu cho phù hợp, review, đề xuất, để Jev quyết, rồi làm. Ảnh gốc và khung đã cắt: `designs/the-gioi/` (toàn cảnh 256 × 256, bảng NPC, hoạt động, hồ sông, bến tàu, đường chính, hoàng hôn), `designs/lang-ven-song/`, `designs/cho-phien/`, `designs/nong-trai/`, `designs/khu-rung-bi-mat/`, `designs/nui-tuyet/`, `designs/truong-hoc/v2-*`. Mô tả khung: `docs/design-cac-map.md`.

## Rà mock so với plan

- Hai ảnh toàn cảnh vẽ **một vùng 256 × 256 liền nhau**: Trường học ở giữa; quanh là Làng, Rừng, Hồ/Sông, Chợ, Nông trại; thêm Núi (vách đá, thác, cầu gỗ), Bến tàu (hải đăng, cầu tàu, thuyền buồm, bãi cát), đường chính có đèn và vạch qua đường. Plan đang làm 8 map riêng.
- Thư viện trong mock là một phòng trong trường; plan có map Thư viện riêng (7 bài).
- Phong cách: mái nhiều màu (đỏ, xanh, cam), cây hoa hồng nhạt xen kẽ, bồn hoa và hàng rào gỗ khắp nơi, đèn đường, sạp chợ mái sọc, chuồng đỏ và cối xay gió ở nông trại, thác và cầu gỗ trong rừng, tượng đài phun nước ở sân trường.
- Bảng NPC: bạn học, thầy giáo, cô giáo, bác bảo vệ, cô lao công, người bán hàng, nông dân, thủ thư, lính gác, người lớn khác. Hoạt động: nói chuyện, mua hàng, trồng cây/tưới nước, nhận nhiệm vụ ở bảng có dấu "!", đọc sách.

## Câu hỏi và quyết định (jev-1.13.0)

| Câu | Mức | Jev chọn | Độ tin cậy | Xác suất | Quyết |
| --- | --- | --- | --- | --- | --- |
| Cấu trúc thế giới | medium | hub-and-maps | 0,89 | hub 0,93 · riêng 0,06 · một map 0,01 | auto |
| Thư viện ở đâu | low | own-map-styled-room | 0,97 | 0,99 | auto |
| Bến tàu, Núi, Đường chính | low | fold-into-maps | 0,98 | 0,99 | auto |
| Làm lại phong cách | low | yes-all-maps | 0,19 | 0,59 · 0,41 | escalate → dùng lựa chọn của Jev (nếp người sở hữu đã định) |
| Đời sống theo bảng NPC | low | roster-per-map | 0,96 | 0,98 | auto |

Nghĩa của từng lựa chọn:

1. **Hub + map riêng:** map Trường học thành trung tâm, dựng như ảnh toàn cảnh: trường ở giữa, phố có đèn và vạch qua đường, quanh là các khu nhỏ Làng, Chợ, Nông trại, Rừng, Hồ và Bến tàu. Cổng của mỗi khu dẫn vào map đầy đủ 256 × 256 của chủ điểm đó, nơi bé học các bài. Mỗi map có cổng về trung tâm.
2. **Thư viện:** giữ map riêng; phòng đọc dựng như khung `v2-a-12-thu-vien-trong-truong.png`; thêm một phòng thư viện nhỏ trong nhà chính của trường để trang trí.
3. **Gộp vào map có sẵn:** hồ, cầu tàu, thuyền, hải đăng vào Làng Ven Sông; vách đá, thác, cầu gỗ vào Khu rừng; núi làm phông ở rìa map trung tâm (vùng Núi tuyết sau này); đường chính có đèn quanh trường.
4. **Phong cách cho cả 8 map**, ảnh preview đặt cạnh khung mock trên trang review.
5. **Mỗi map một dàn người** lấy từ bảng NPC, hợp nơi (8–12 người, 30–50 con vật); hoạt động trong mock thành việc thường ngày và hoạt cảnh nhóm; dấu "!" trên người hoặc bảng đang có nhiệm vụ.

Ghi lại vào plan `plans/dattqh/261001-2106-more-maps-lesson-regroup/plan.md` (phase 5, 7b, 7c, nghiệm thu).
