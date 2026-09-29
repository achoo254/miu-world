# Brainstorm — Nguồn asset miễn phí cho Miu World v3 (không tự vẽ, không AI trả phí)

Date: 2026-09-29 · Input: Master Plan v3 + 7 ảnh mock trong `designs/` + `designs/mock-requirement-ui.md`

## 1. Contract

- **Outcome:** Mọi asset render (world, nhân vật, NPC, props, icon, UI, font, âm thanh, VFX) lấy từ nguồn free có license rõ ràng, hoặc sinh bằng code (tham số hóa, không "vẽ tay"). Claude Code tự tải, kiểm license, chuyển đổi, đưa vào pipeline — không cần voxel artist/designer vẽ.
- **Constraints:** License cho phép thương mại (ưu tiên CC0, MIT/OFL cho icon/font); không asset Minecraft; không AI trả phí; một phong cách thống nhất (blocky/voxel); ngân sách mobile của plan §12 (≤150 draw call, ≤150k tris, ≤8 MB vùng đầu); asset ngoài phải qua kiểm license + quét file (plan §9).
- **Non-goals:** Khớp pixel mock (mock là art AI mượt, plan đã chốt chỉ bám luồng); asset cho Thỏ/Cáo/Gấu đầy đủ trang phục (V1); asset multiplayer riêng.
- **Acceptance:** (1) `assets/LICENSES.md` + manifest ghi nguồn/URL/license/hash từng file; (2) POC render Khu rừng + Miu + 1 NPC chỉ bằng asset trong manifest; (3) CI chặn file thiếu license hoặc license ngoài allowlist; (4) màn Credits liệt kê tác giả (tự nguyện với CC0, bắt buộc với CC-BY nếu dùng).

## 2. Bằng chứng đã kiểm (tải thật, đọc GLB)

| Pack | License | Kiểm được |
| --- | --- | --- |
| Kenney **Cube Pets 2.0** | CC0 (License.txt) | 24 thú, có `animal-cat`, `bunny`, `fox`, `polar`/`panda`/`koala`; node rời `body/tail/leg-*`; anim: idle, walk, run, eat, dance, gesture-positive/negative; 1 colormap 512px. **Thú 4 chân** — không có tay để vẫy. **Không có cú, sóc.** |
| Kenney **Blocky Characters 2.0** | CC0 | 18 nhân vật người kiểu khối; node `head/torso/arm-*/leg-*`; 27 anim (idle, walk, sprint, pick-up, emote-yes/no, interact, sit…); texture 1024px/nhân vật. |
| KayKit **Block Bits** | CC0 | 32+ model khối, 1 gradient atlas 1024 (hạ được 128), GLTF. |
| KayKit **Forest Nature Pack** (free tier) | CC0 | 100+ cây, đá, bụi, cỏ; low-poly (không voxel thuần). |
| Kenney **Voxel Pack** | CC0 | 190 tile 128px (block texture + item) — hợp chunk meshing + atlas. |
| Microsoft **Fluent Emoji 3D** | MIT | PNG/SVG kiểu 3D bóng — gần đúng style icon trong mock (lá, chìa khóa, pha lê, sao, xu, kim cương, lửa, cúp, quà, nấm, táo, bản đồ, thư). Loại trừ vài emoji dính thương hiệu. |

Chưa tải để kiểm (dựa trên trang nguồn): Quaternius packs (CC0), Kenney Castle/Fantasy Town/Nature/Survival/Food Kit, Particle Pack, UI Pack, audio packs (CC0), Google Fonts Baloo 2/Nunito (OFL, có tiếng Việt).

## 3. Map nhu cầu mock → nguồn

| Nhu cầu (mock) | Nguồn đề xuất | Độ khớp | Ghi chú |
| --- | --- | --- | --- |
| Block địa hình: cỏ, đất, đá, gỗ, lá, cát, nước | Kenney Voxel Pack → atlas | Tốt | Nước/thác: shader (code) |
| Cây, bụi, hoa voxel | Dựng bằng block trong map data (code) + KayKit Block Bits | Tốt | Forest Nature low-poly chỉ dùng nếu POC thấy hợp |
| Nhà, trường, lâu đài, thư viện | Dựng block (map data) + Kenney Castle/Fantasy Town Kit | Trung bình | Kit Kenney low-poly; POC chọn |
| Props: rương, đèn lồng, hàng rào, cầu, thùng, nấm, táo | Kenney Survival/Nature/Food Kit, KayKit Resource Bits | Tốt | |
| **Nhân vật Miu (đứng 2 chân, vẫy tay, đội mũ)** | Xem quyết định Q1 | **Rủi ro chính** | Không pack CC0 nào có đúng mèo chibi đứng 2 chân |
| NPC Cú mèo, Sóc | Cube Pets không có → xem Q2 | Thiếu | |
| Trang phục: mũ phù thủy, balo, cánh, kính, khăn | Sinh bằng code: phụ kiện voxel từ JSON (khối + màu), gắn vào node `head/torso` | Trung bình | Không có pack CC0 phụ kiện cho thú khối; biến thể = đổi màu |
| Boss Quái vật rừng | Quaternius Cute Animated Monsters (CC0) hoặc ghép block + mắt | Yếu | V1, chọn sau |
| Cổng Tri Thức | Kenney Castle Kit gate + shader portal | Tốt | |
| Viên đá số, thẻ chữ (27, 15, "Chim"…) | Block + chữ vẽ runtime bằng canvas texture | Tốt | Code thuần |
| Icon vật phẩm, tiền tệ, HUD | Fluent Emoji 3D | Rất tốt | |
| Ảnh đại diện, thumbnail shop/khu vực | Render offscreen từ model 3D bằng script build | Tốt | Không cần vẽ |
| Khung UI, nút, banner gỗ | CSS + design tokens (gradient, border, shadow) | Tốt | Kenney UI Pack làm dự phòng |
| Font | Baloo 2 (tiêu đề) + Nunito (nội dung), self-host | Tốt | Subset tiếng Việt |
| Bầu trời, mây, nước | three.js Sky/Water (MIT) + shader | Tốt | |
| VFX: lấp lánh, confetti, level up | Kenney Particle Pack + particle code | Tốt | |
| Âm thanh, nhạc | Kenney audio (CC0); "Nghe lại" English dùng Web Speech API | Tốt | TTS trình duyệt, chất lượng tùy máy |

## 4. Phương án cho nhân vật người chơi (Q1)

| | A. Ghép (kitbash) — **khuyến nghị** | B. Cube Pets nguyên bản | C. Nhân vật khối sinh bằng code |
| --- | --- | --- | --- |
| Cách làm | Rig + 27 anim của Blocky Characters; thay mesh `head` bằng đầu mèo tách từ Cube Pets; thân tô màu bằng code | Dùng thẳng `animal-cat` 4 chân | Claude dựng hộp đầu/thân/tay/chân/tai/đuôi từ JSON, anim bằng xoay khối |
| Giả định chính | Đầu Cube Pets tách được khỏi `body` và khớp tỉ lệ thân người | Chấp nhận nhân vật 4 chân | Code-art trông đủ dễ thương |
| Hỏng đầu tiên khi | Đầu dính liền thân trong 1 mesh → phải cắt mesh bằng script | M1.3 cần vẫy tay/đội mũ → mất 2/4 anim xem thử | Mặt mèo (mắt, mũi) cần pixel-art → gần "tự vẽ" |
| Trường hợp xấu | Rơi về C cho phần đầu | Đổi spec M1.3 | Nhìn như programmer art |
| Chi phí bỏ | Thấp (POC 1 task) | Thấp | Trung bình |

Khuyến nghị A, kiểm chứng ngay ở POC (task #5); fallback C cho phần hỏng.

## 5. Tác động lên Master Plan v3 (cần sửa)

- §2, §10, rủi ro §15: bỏ "vẽ asset riêng", "Voxel artist" → "asset CC0 + sinh bằng code, Claude Code tích hợp".
- §10 quy trình: nguồn = pack CC0 tải về (GLB/PNG), không cần MagicaVoxel/Blockbench; thêm bước kiểm license + hash vào manifest.
- §14 backlog: task #8, #11, #22 đổi chủ thể "Voxel artist/Designer" → "CC"; thêm task "Asset sourcing + LICENSES.md + CI license gate".
- §17: cột "Con người" cho nhân vật/môi trường → chỉ duyệt cảm quan.
- NPC: đổi loài nếu chọn Q2 phương án thay thế.

## 6. Rủi ro còn lại

- Lệch phong cách giữa Kenney/KayKit/Fluent (3D icon bóng vs model phẳng) — giảm bằng 1 bảng màu chung, flat shading, viền UI thống nhất.
- Kết quả cuối sẽ **kém** độ bóng/chi tiết của mock (mock là render AI) — cần stakeholder chấp nhận.
- Pack CC0 có thể đổi phiên bản/URL → lưu bản đã tải trong repo asset (LFS) + hash, không hotlink.

## 7. Quyết định đã chốt (2026-09-29)

| # | Câu hỏi | Chốt |
| --- | --- | --- |
| Q1 | Nhân vật người chơi | Ghép: rig + anim Blocky Characters, đầu mèo Cube Pets; kiểm chứng ở POC, fallback dựng khối bằng code |
| Q2 | NPC | Cú mèo → Vẹt (`animal-parrot`), Sóc → Hải ly (`animal-beaver`); sửa lời thoại/câu chuyện |
| Q3 | License allowlist | CC0 (model, texture, audio) + MIT (Fluent Emoji) + OFL (font); không CC-BY/SA/NC |
| Q4 | Plan | Sửa Master Plan v3 (§1, 2, 4, 9, 10, 11, 14, 15, 17) rồi lập plan triển khai asset POC |

## Câu hỏi mở

- Boss Quái vật rừng (V1): Quaternius Cute Monsters hay ghép block — chốt khi tới V1.
- Nhà/lâu đài: dựng block hay kit Kenney low-poly — chốt ở POC theo cảm quan.
