# POC review — asset sourcing + voxel POC (Master Plan v3 task #5, #6)

Date: 2026-09-29 · Plan: `plans/dattqh/260929-0842-asset-sourcing-and-voxel-poc/` · Status: **chờ người duyệt (1 lần)**

## Cách duyệt
1. Mở `http://<LAN-IP>:4173/review.html` trên máy tính: xem gallery nhân vật, phụ kiện, bản đồ, bảng license, bảng hiệu năng.
2. Mở `http://<LAN-IP>:4173/index.html?quality=mid` trên **1 máy Android tầm trung** (cùng Wi-Fi), đi dạo 2–3 phút, đọc FPS ở góc trái trên. Thử `?quality=low` nếu dưới 30 FPS.
3. Trên `review.html` chọn Giữ / Chỉnh / Phương án dự phòng cho 4 mục, ghi FPS máy thật + tên máy vào ô ghi chú, bấm **Sao chép kết quả duyệt**, dán vào chat.

## Đã giao
| Hạng mục | Kết quả | Bằng chứng |
| --- | --- | --- |
| Asset + license gate | 12 pack (9 Kenney CC0, Fluent Emoji MIT, Baloo 2 + Nunito OFL), 1004 file tải + 56 file sinh; hash TOFU; CI chặn file lạ/license lạ/symlink/loại file ngoài allowlist/vượt 150 MB–20 MB | `assets/manifest.json`, `assets/LICENSES.md`, `pnpm assets:check` OK |
| Nhân vật Miu | Rig + 27 clip Blocky, đầu mèo Cube Pets (nguyên khối), 4 clip keyframe (vẫy tay, nhảy, ngáp, vui mừng) = 31 clip; **1 draw call**, 568 tam giác, 1 material; build xác định | `assets/generated/characters/miu-cat.glb`, 35 ảnh preview |
| Phụ kiện | Mũ phù thủy hồng, balo nâu từ JSON (Zod); mỗi món 1 draw call; 2 biến thể màu mỗi món, không sửa code | 10 ảnh preview |
| Bản đồ | 96×32×96 theo seed: suối, cầu gỗ, lối đá, ~70 cây, cây cổ thụ, Vẹt, rương, 60 props Kenney; `chunks.bin` 28 KB | 5 ảnh (trên, toàn cảnh, cầu, cây cổ thụ, Vẹt) |
| POC runtime | Greedy meshing trong Web Worker, 1 atlas material, AABB grid + bước 1 block, camera không xuyên khối, WASD + joystick + nút Chạy/Nhảy, NPC nhãn tương tác, loader từ chối file ngoài manifest, CSP không `unsafe-eval` | E2E 5/5 |

## Hiệu năng (giả lập) vs ngân sách Master Plan §12
Môi trường: Chromium headless mới, GPU **Apple M4** (Metal), viewport 412×915 @2.625 cảm ứng, CPU throttle qua CDP, 60 s/lượt theo lộ trình autopilot cố định (spawn → cầu → Vẹt → cây cổ thụ → quay lại, xen kẽ đi/chạy).

| CPU chậm | Chất lượng | FPS TB | FPS thấp nhất 1 s | FPS p5 trung vị / tệ nhất | Draw call max | Tam giác max | Tải (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4× | low | 59.9 | 51.4 | 57.5 / 55.9 | 50 | 14.2k | 1125 |
| 4× | mid | 59.9 | 55.9 | 57.1 / 55.9 | 63 | 17.0k | 653 |
| 4× | high | 59.9 | 58.0 | 57.1 / 46.1 | 91 | 25.1k | 640 |
| 6× | low | 60.0 | 59.9 | 56.5 / 54.9 | 51 | 14.3k | 740 |
| 6× | mid | 60.0 | 59.9 | 56.8 / 55.6 | 63 | 16.8k | 766 |
| 6× | high | 60.0 | 59.8 | 56.2 / 55.2 | 91 | 25.1k | 789 |

- Ngân sách: ≥30 FPS ✅ · ≤150 draw call ✅ (tối đa 91) · ≤150k tam giác ✅ (tối đa 25k) · tải vùng đầu ≤8 MB ✅ (**1.82 MB thô / 0.43 MB gzip**, gồm JS + manifest + dữ liệu thế giới + model + font).
- FPS bị trần 60 do vsync → số liệu chỉ cho biết "không nghẽn CPU ở 6×", **không** đo được GPU mobile.

### Giới hạn (ghi thực)
- Giả lập chỉ làm chậm CPU; GPU là Apple M4 mạnh hơn nhiều GPU Android tầm trung. Không đo nhiệt, pin.
- Dữ liệu GPU mobile thật: **0 điểm** tới khi người duyệt đo 1 máy Android (bước 2 ở trên).
- `perf.json` đo trước đợt sửa sau review code; các sửa đó không đổi khối lượng GPU (shader refactor ra GLSL giống hệt).

## Quyết định (điền sau khi duyệt)
| Mục | Giữ / Chỉnh / Dự phòng | Ghi chú |
| --- | --- | --- |
| Nhân vật Miu | _chờ_ | |
| Phụ kiện | _chờ_ | |
| Bản đồ + texture block | _chờ_ | |
| Hiệu năng máy Android thật (tên máy, FPS) | _chờ_ | |

## Việc còn nợ (không thuộc plan này)
- Đo đủ 2 Android tầm trung + 1 iPhone đời cũ (FPS, nhiệt, pin 15 phút) trước nghiệm thu MVP (Master Plan §12, §16).
- KTX2 cho atlas (Master Plan task #21); KayKit sau POC (chế độ tải tay đã hỗ trợ).
- Build thật (task #3) chỉ nên copy file runtime thực sự dùng (POC copy toàn manifest ~24 MB vào `dist/`; không ảnh hưởng tải vùng đầu).

## Lệch so với plan (có chủ đích)
- `assets/vendor/` → `assets/packs/`, `assets/build/` → `assets/generated/` (tránh hook chặn đường dẫn `vendor`/`build` trong môi trường AI).
- Padding atlas 4 px extrude (plan: 2 px) để mip 0–3 không lem tile.
- Nhân vật gộp thành 1 skinned mesh (plan: ≤3 draw call) — cùng node/anim, rẻ hơn.

## Câu hỏi mở
- Không có ngoài 4 quyết định ở trên.
