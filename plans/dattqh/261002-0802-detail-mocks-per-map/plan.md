# Map theo mock chi tiết từng khu

Trạng thái: đang làm · Tier tổng: XL · Nhánh: `main`

Người sở hữu (02/10/2026) gửi chín tấm mock chi tiết; quyết định: `plans/dattqh/reports/jev-261002-0802-detail-mocks.md`. Khung đã cắt ở `designs/<map>/{c,d}-*.png`.

## Kết quả cần đạt

Tám map nhìn gần như mock của chúng: mỗi map một nền riêng (màu cỏ, đá lát, đất), bố cục theo khung toàn cảnh (công trình chính, đồi, vách đá, thác, sông, quảng trường, lối cong, cụm nhà tự nhiên), cận cảnh dày chi tiết như khung cận cảnh, công trình chính đi vào được và bày đồ như khung nội thất, người và vật theo từng khung; đèn sáng ấm lúc chiều tối. Trường học có quảng trường trung tâm theo tấm Trung tâm.

## Ràng buộc

- Giữ vị trí các khu bài học (`ZONES`) và mọi quest vẫn đặt được, test hiện có xanh.
- Chỉ block, pack có license, prop dựng bằng code; không vẽ, không ảnh AI, không gì của Minecraft (`.claude/rules/assets-pipeline.md`).
- Thêm model vào `content/world/models.json`; asset mới qua pipeline rồi `pnpm assets:manifest`.
- Máy dev một worker: không chạy song song nhiều bộ test; ảnh preview (cổng 5199, ghi manifest) chạy lần lượt.
- Hiệu năng: không tăng số region quá ngân sách hiện có; prop vẫn theo ô 64 × 64.

## Không làm

- Map Đảo bí ẩn, Núi tuyết (đưa vào roadmap); chu kỳ ngày đêm; phòng cho mọi khung nội thất.

## Pha

| Pha | Tier | Nội dung | Ai |
| --- | --- | --- | --- |
| 1 | M | Nền theo map: khối cỏ theo map, đá lát, đất cày, đất rừng; zone-map nhận nền của map; vùng ngoài theo nền | chính |
| 2 | M | Bộ dựng chung: nhà chi tiết (mọi map hưởng), cổng vòm có cờ, tháp mái nhọn, cầu đá vòm, vách đá có thác, quảng trường lát, viền lối (đèn, hoa, bụi, rào) | chính |
| 3 | S | Góc chụp theo khung mock: `content/world/mock-views/<map>.json`, preview chụp từng khung, trang review đặt cặp mock/game | chính |
| 4 | L × 8 | Làm lại từng map theo tấm của nó (bố cục, công trình chính, cận cảnh, trong nhà, người và vật) | agent mỗi map, tối đa 3 song song |
| 5 | S | Đèn, lồng đèn, cửa sổ sáng ấm lúc chiều tối | chính |
| 6 | M | Nghiệm thu: ảnh preview từng khung, báo cáo đối chiếu, docs, roadmap, review, đủ gate, commit | chính |

Map ở pha 4 và tấm mock của nó:

| Map | Khung |
| --- | --- |
| Trường học + quảng trường trung tâm | `truong-hoc/c-*`, `trung-tam/d-*` |
| Khu rừng bí mật | `khu-rung-bi-mat/c-10`, `a-10`, `b-08` |
| Làng Ven Sông | `lang-ven-song/d-*` (khung ngoài trời), `c-07`, `c-11`, `c-12` |
| Xóm Mái Ấm | `lang-ven-song/d-03,05,07,13,14` (khung nhà) |
| Chợ phiên | `cho-phien/d-*`, `c-08` |
| Nông trại | `nong-trai/d-*`, `c-09` |
| Thư viện | `thu-vien/d-*`, `truong-hoc/c-16` |
| Lâu đài | `lau-dai/d-*` |

## Nghiệm thu

- Mỗi khung mock có ảnh cùng góc trong game trên trang review; báo cáo đối chiếu ghi từng khung đạt, gần, chưa.
- Nhìn từ trên, tám map khác màu nền rõ.
- Gate: `pnpm assets:check` → `content:check` → `test` → `typecheck` → `lint`, `pnpm --filter @miu/web build`, `pnpm security:dist`, `pnpm --filter @miu/web e2e:ci`.

## Validation log

- 02/10/2026: bảy câu qua Jev (report trên); câu Đảo/Núi tuyết escalate, dùng lựa chọn của Jev.
