# Kiến trúc hệ thống

Kiến trúc đích: Master Plan v3 §7 (ứng dụng), §8 (multiplayer), §9 (an toàn), §10 (asset), §11 (data model). File này ghi ranh giới **hiện có** trong repo và sổ quyết định kỹ thuật đã chốt.

## Ranh giới hiện tại

Repo đang ở giai đoạn POC: có pipeline asset và runtime voxel; chưa có app Next.js, backend, cơ sở dữ liệu (đó là Master Plan task #3 trở đi).

```
tools/assets/sources.json ─fetch─▶ assets/packs/<pack>/<ver>/ ─┐
content/*.json + seed ─generators─▶ assets/generated/ ─────────┼─manifest─▶ assets/manifest.json + LICENSES.md
                                                               │                 │
                                            pnpm assets:check ◀┘                 ▼
                                            (CI chặn)             apps/poc-voxel (chỉ tải file có trong manifest)
                                                                        ▲
                                              packages/voxel (TS thuần: chunk, mesher, va chạm, phụ kiện)
```

| Ranh giới | Chủ sở hữu | Bất biến |
| --- | --- | --- |
| Nhập asset + license gate | `tools/assets/` | Mọi file dưới `assets/` có trong manifest, hash khớp, license trong allowlist, loại file trong allowlist, không symlink, trong ngân sách |
| Dữ liệu nội dung | `content/` | JSON validate bằng Zod; đổi dữ liệu để tạo biến thể, không sửa code |
| Sinh thế giới | `tools/world/` | Xác định theo seed; output chunk RLE + `entities.json` |
| Thư viện voxel | `packages/voxel/` | Không phụ thuộc `three` hay DOM; test được bằng Vitest thuần |
| Runtime POC | `apps/poc-voxel/` | Loader và server dev/preview từ chối file ngoài manifest; build chỉ copy file trong manifest; CSP không `unsafe-eval` |

## Kiến trúc đích (ý định, chưa hiện thực)

- Client: Next.js (App Router) + React cho giao diện, Three.js (WebGL2 chính, WebGPU tùy chọn) cho cảnh. Cách nối React–Three.js (R3F hay bridge tự viết) chưa chốt.
- Server: Node.js + Express + TypeScript, API theo miền; là nguồn sự thật cho tiến độ, thưởng, mở khóa. Cơ sở dữ liệu quan hệ (đề xuất PostgreSQL), Redis, object storage.
- Realtime (chỉ giai đoạn MP): Colyseus hoặc `ws`, WebSocket qua server, mỗi khu vực một room; tách khỏi API nghiệp vụ.
- Triển khai: client qua static hosting + CDN; server tự host gần người dùng Việt Nam. Asset qua CDN với signed URL, CSP chặt, SRI.
- Quest/nội dung mô tả bằng dữ liệu có schema, không phụ thuộc cảnh Three.js.

## Sổ quyết định

| Quyết định | Lý do | Phương án bị loại |
| --- | --- | --- |
| Voxel 3D, bản đồ thiết kế sẵn | Asset dễ tạo bằng code/pack CC0; dễ gắn quest | Thế giới sinh ngẫu nhiên (khó gắn quest, khó kiểm soát nội dung) |
| Server-authoritative từ MVP | Chống gian lận; thêm multiplayer chỉ là thêm lớp realtime | Tính thưởng ở client |
| Asset lưu bằng git thường, có ngân sách dung lượng | Repo private còn nhỏ; git-lfs chưa cài | Git LFS ngay từ đầu (giữ làm phương án khi vượt ngân sách) |
| Hash pack theo trust-on-first-use | Pack không công bố hash; hash + license hiện trên trang review để người duyệt | Tin URL tải (hash động, đổi khi pack cập nhật) |
| Thư mục `assets/packs/`, `assets/generated/` | Hook của môi trường AI chặn đường dẫn chứa `vendor`/`build` | `assets/vendor/`, `assets/build/` |
| Allowlist loại file dưới `assets/` | Chặn mọi nội dung chủ động mà không phải liệt kê từng đuôi | Blocklist đuôi thực thi |
| Nhân vật ghép: rig + 27 anim Blocky Characters, đầu mèo nguyên khối Cube Pets, 4 anim xem thử keyframe bằng code | Không pack CC0 nào có mèo đứng 2 chân; Cube Pets không có mesh đầu riêng | Cube Pets nguyên bản (thú 4 chân, không vẫy tay được); nhân vật khối bằng code (giữ làm fallback) |
| Nhân vật gộp 1 skinned mesh | Cùng node/anim, rẻ hơn ngân sách ≤ 3 draw call | Tách nhiều mesh |
| Phụ kiện là lưới khối từ JSON, 1 draw call mỗi món | Đổi trang phục không cần artist; biến thể = đổi palette | Pack phụ kiện (không có cho thú khối) |
| Texture block: Kenney Voxel Pack tint theo palette, 1 atlas, padding 4 px extrude | Một material; không lem tile tới mip 3 | Texture sinh bằng noise (giữ làm fallback); padding 2 px |
| POC là app Vite độc lập + package `@miu/voxel` | Không chờ monorepo Next.js (task #3) | Dựng POC trong app thật |
| POC chỉ dùng pack Kenney; KayKit sau POC | KayKit cần tải tay từ itch.io | Đưa KayKit vào POC |
| Va chạm AABB theo lưới tự viết | Không cần WASM, CSP không phải mở `wasm-unsafe-eval` | Rapier (chỉ khi có vật thể động) |
| Greedy meshing trong Web Worker, fallback main thread lúc tải | Voxel sinh nhiều bề mặt — rủi ro hiệu năng số một | Mesh trên main thread trong vòng lặp |
| Đo hiệu năng POC: giả lập CPU 4×/6× + 1 máy Android lúc duyệt; đủ 2 Android + 1 iPhone trước nghiệm thu MVP | Người sở hữu chốt; giả lập không đo GPU mobile, nhiệt, pin | Đo đủ 3 máy ngay ở POC |

Bằng chứng và số đo: `plans/dattqh/reports/poc-review-260929.md`, `plans/dattqh/reports/code-reviewer-260929-1601-asset-poc-review.md`.

## Bảo mật và an toàn trẻ em

Bảng rủi ro và yêu cầu theo giai đoạn: Master Plan v3 §9. Những gì đã áp dụng trong repo: license gate trong CI, runtime chỉ tải file có trong manifest, không request ngoài origin (kiểm bằng E2E), CSP không `unsafe-eval`, `X-Content-Type-Options: nosniff` khi phục vụ asset.
