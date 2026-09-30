# Miu voxel chibi theo mock `designs/character.png`

**Trạng thái:** xong, đã commit · **Tier:** L · **Nhánh:** `main`

## Kết quả mong muốn

Miu trong game và trên giao diện có tạo hình giống mock voxel `designs/character.png` (màn "Tạo nhân vật của bé"): mèo trắng chibi đầu to, tai hồng, mắt to có đốm sáng, miệng cười, ria, má hồng, váy hồng nơ trắng khóa vàng, đuôi trắng; đội mũ phù thủy hồng và đeo balo nâu có sẵn.

## Quyết định (người dùng chốt 30/09/2026)

- Cách B: thân dựng hoàn toàn bằng khối từ JSON (`content/bodies/*.json`), mỗi phần gắn vào một xương của rig Kenney Blocky Characters. Giữ 27 hoạt ảnh + 4 hoạt ảnh tự viết, 1 draw call.
- Chỉ Mèo. Định dạng body là dữ liệu thuần, loài khác (Thỏ, Cáo, Gấu) sau này chỉ thêm file.
- Làm nhân vật trước; màn chọn loài theo mock làm sau khi duyệt tạo hình.
- Mock voxel này là chuẩn tạo hình cho nhân vật (ghi đè ghi chú "hình dạng trong mock không phải chuẩn" cho nhân vật) — ghi vào docs.

## Vòng chỉnh theo Jev (30/09/2026)

Người sở hữu giao Jev quyết định các điểm chỉnh so với mock (`jev-input.json`, `jev-output.json`). Jev chọn chỉnh cả 6 điểm, đã áp dụng:

| Điểm | Quyết định | Độ tin cậy |
| --- | --- | --- |
| Mũ phù thủy (chung 3 biến thể) | Ngắn đi khoảng 1/4, chóp cong sang một bên | 0.98 |
| Đầu | 26 × 22 khối (khoảng 1.6 lần bề ngang thân) | 0.79 |
| Mắt | 5 × 7 khối, đốm sáng ở góc trên phía ngoài | 0.79 |
| Miệng | Rộng 6 khối, lưỡi ở giữa | 0.86 |
| Tô bóng lông | Tông sẫm nhẹ dưới cằm và ở chân tai phía trong | 0.48 (escalate, vẫn áp dụng theo ủy quyền) |
| Váy | Dài thêm 2 khối, vẫn thấy bàn chân | 0.97 |

## Ràng buộc

- Không tự vẽ ảnh, không AI tạo ảnh trả phí: khối sinh bằng code từ JSON như phụ kiện và mặt đã làm.
- Ngân sách: ≤ 5000 tris, 1 material, 1 draw call (`validate-character.ts`).
- Giữ đường build POC byte-for-byte khi không dùng `body` (test hash hiện có).
- Không đổi tên node rig: runtime gắn phụ kiện theo `head`/`torso`.

## Việc

1. Generator: thêm trường `body` vào spec; chế độ body bỏ mesh rig và đầu Cube Pets, sinh khối cho `head`, `torso`, tay, chân, `tail` (có đối xứng và gương trái/phải).
2. Dữ liệu `content/bodies/miu-cat-body.json` + chỉnh `content/characters.json` (tỷ lệ khớp, `accessoryScale`).
3. Test generator theo tỷ lệ chibi mới.
4. Sinh lại GLB, ảnh review (`render-preview`), manifest.
5. Gate đủ + E2E; cập nhật docs (quyết định tạo hình, kiến trúc nhân vật) và roadmap nếu đổi trạng thái task.

## Nghiệm thu

- Ảnh render Miu đặt cạnh mock: cùng tỷ lệ đầu/thân, cùng bảng màu, đủ các chi tiết mặt và trang phục ở trên.
- `validate-character` không lỗi; test generator và gate pass; hoạt ảnh vẫn chạy (ảnh từng clip).
- Mũ và balo ngồi đúng chỗ trên đầu/lưng mới.
