# Bản đồ codebase

Chỉ để định hướng: bắt đầu đọc từ đâu, ai làm chủ việc gì. Danh sách file đầy đủ: `git ls-files`.

| Vùng | Bắt đầu đọc | Làm chủ |
| --- | --- | --- |
| Nhập asset | `tools/assets/sources.json`, `tools/assets/asset-lib.ts` | Khai báo pack, allowlist license, ngân sách, allowlist loại file, schema manifest |
| License gate | `tools/assets/check-assets.ts` (+ `.test.ts`) | Luật chặn file lạ/hash lệch/license lạ/vượt ngân sách |
| Manifest | `tools/assets/build-manifest.ts`, `tools/assets/generated.json` | Sinh `assets/manifest.json` và `assets/LICENSES.md`; khai báo asset sinh bằng code |
| Nhân vật Miu | `tools/assets/kitbash-character.ts`, `tools/assets/validate-character.ts` | Ghép rig Blocky + đầu Cube Pets, thêm clip keyframe; kiểm node/anim/tam giác |
| Atlas block | `tools/assets/build-atlas.ts`, `content/blocks.json` | Chọn tile, tint theo palette, padding chống lem |
| Bản đồ | `tools/world/generate-forest-map.ts`, `tools/world/structures/` | Sinh Khu rừng chương 1 theo seed |
| Ảnh duyệt | `tools/assets/render-preview.ts` | Ảnh nhân vật, phụ kiện, bản đồ cho trang review |
| Dữ liệu nội dung | `content/` | Palette, block, nhân vật, phụ kiện, anim keyframe |
| Thư viện voxel | `packages/voxel/src/` | Định dạng chunk RLE, greedy mesher, va chạm lưới, phụ kiện voxel, entity bản đồ |
| Runtime POC | `apps/poc-voxel/src/main.ts`, `apps/poc-voxel/vite.config.ts` | Vòng lặp cảnh; phục vụ và đóng gói chỉ file trong manifest |
| Tải asset runtime | `apps/poc-voxel/src/asset-loader.ts` | Chặn URL ngoài manifest |
| Trang review | `apps/poc-voxel/review.html`, `apps/poc-voxel/src/review/` | Gallery duyệt cuối, bảng license, bảng hiệu năng |
| E2E, đo hiệu năng | `apps/poc-voxel/e2e/` | Hành vi (`poc.spec.ts`), ma trận CPU × chất lượng (`perf.spec.ts`) |
| Hỗ trợ quyết định | `tools/decisions/jev-decide.py` | Gọi TypeSafe Jev, áp ngưỡng tự quyết/chuyển người |
| CI | `.github/workflows/assets.yml` | Bốn gate trên push `main` và PR |
| Asset đã commit | `assets/packs/`, `assets/generated/` | Dữ liệu; chỉ thay qua script ở trên |
| Mock thiết kế | `designs/` | Ảnh mock M1–M3 và yêu cầu UI |
| Plan, report | `plans/dattqh/` | Hồ sơ theo thời điểm, không phải nguồn chuẩn lâu dài |
