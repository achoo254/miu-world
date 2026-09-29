---
phase: 1
title: "Asset Intake + License Gate"
status: pending
priority: P1
effort: "M"
dependencies: []
---

# Phase 1: Asset Intake + License Gate

## Overview
Tải có kiểm soát mọi pack nguồn vào repo, sinh manifest + `assets/LICENSES.md`, và một script kiểm tra chặn mọi file thiếu license hoặc license ngoài allowlist. Đây là nền cho mọi phase sau: phase khác chỉ được đọc asset có trong manifest.

## Requirements
- Functional:
  - `tools/assets/sources.json` khai báo từng pack: id, tên, URL tải, phiên bản, license (SPDX: `CC0-1.0`, `MIT`, `OFL-1.1`), sha256 của file tải, danh sách file cần giữ (glob).
  - `pnpm assets:fetch` tải → kiểm sha256 → giải nén vào `assets/vendor/<pack-id>/<version>/`, chỉ giữ file theo glob (GLB, PNG, OGG, WOFF2, License.txt).
  - `pnpm assets:manifest` sinh `assets/manifest.json` (mỗi file: path, pack, license, sourceUrl, sha256, bytes) và `assets/LICENSES.md` (bảng pack + nội dung License.txt gốc).
  - `pnpm assets:check` fail khi: file trong `assets/` không có trong manifest; hash lệch; license ngoài allowlist; file có đuôi thực thi (`.js`, `.exe`, `.bat`, `.sh`, `.html` trong vendor).
- Non-functional: không hotlink khi chạy game; tải lại xác định (cùng hash); asset commit thẳng vào git (không LFS), `assets:check` fail khi `assets/vendor` > 150 MB hoặc 1 file > 20 MB.
<!-- Updated: Validation Session 1 - plain git + size budget thay LFS -->

## Architecture
```
sources.json ──fetch──▶ assets/vendor/<pack>/<ver>/*  ──manifest──▶ assets/manifest.json + LICENSES.md
                                                          └──check──▶ exit 0 | 1 (CI + pre-commit)
```
Pack MVP/POC (allowlist đã chốt):

| id | Nguồn | License | Dùng cho |
| --- | --- | --- | --- |
| kenney-cube-pets@2.0 | kenney.nl | CC0 | Đầu mèo, NPC vẹt, hải ly |
| kenney-blocky-characters@2.0 | kenney.nl | CC0 | Rig + 27 anim |
| kenney-voxel-pack | kenney.nl | CC0 | Texture block |
| kenney-nature-kit, survival-kit, food-kit, castle-kit | kenney.nl | CC0 | Props, cổng |
| kenney-particle-pack, interface-sounds | kenney.nl | CC0 | VFX, âm thanh |
| kaykit-block-bits, kaykit-forest (free tier) | itch.io | CC0 | Props, cây — **sau POC**, chế độ tải tay; POC chỉ dùng Kenney |
| fluent-emoji (subset theo tên) | github microsoft/fluentui-emoji | MIT | Icon |
| baloo-2, nunito | Google Fonts | OFL-1.1 | Font |

## Related Code Files
- Create: `package.json`, `pnpm-workspace.yaml`, `tools/assets/sources.json`, `tools/assets/fetch-assets.ts`, `tools/assets/build-manifest.ts`, `tools/assets/check-assets.ts`, `tools/assets/check-assets.test.ts`, `assets/manifest.json`, `assets/LICENSES.md`, `.github/workflows/assets.yml`

## Implementation Steps
1. Khởi tạo workspace pnpm + TypeScript + Vitest (tối thiểu, không Next.js — đó là task #3 của Master Plan).
2. Viết test cho `check-assets` trước: fixture thiếu manifest, hash lệch, license `CC-BY-4.0`, file `.js` trong vendor, vượt ngân sách dung lượng → đều fail; fixture hợp lệ → pass.
3. Viết `sources.json`; lấy URL từ trang pack (Kenney có link zip trực tiếp). KayKit (itch.io, cần tải tay) để sau POC: hỗ trợ sẵn `"mode": "manual"` (tải vào `assets/_inbox/` rồi kiểm sha256) nhưng không khai báo pack KayKit trong POC.
4. Viết fetch → manifest → check; ghi sha256 đầu tiên vào `sources.json` (trust-on-first-use; bảng hash + license hiện trong gallery duyệt cuối).
5. Fluent Emoji: chỉ lấy danh sách tên cần (leaf, key, gem, star, coin, fire, trophy, gift, mushroom, red apple, map, envelope, heart…) dạng PNG 3D, bỏ emoji dính thương hiệu.
6. CI workflow chạy `pnpm assets:check` + test.

## Success Criteria
- [ ] `pnpm assets:fetch && pnpm assets:check` exit 0 trên máy sạch
- [ ] Test check-assets: 5 case fail + 1 case pass
- [ ] `assets/LICENSES.md` liệt kê đủ pack, license, URL
- [ ] CI đỏ khi thêm file lạ vào `assets/`
- [ ] Danh sách license nằm trong gallery duyệt cuối (dựng ở phase 5, duyệt ở phase 6)

## Risk Assessment
- URL Kenney có hash động trong đường dẫn → đổi khi pack cập nhật. Tín hiệu: fetch 404/hash lệch. Xử lý: cập nhật `sources.json` có duyệt, không tự nâng phiên bản.
- itch.io cần thao tác tay → KayKit để sau POC, chế độ manual + hash.
- Dung lượng repo tăng → chỉ giữ file theo glob; chạm ngân sách 150 MB → chuyển Git LFS (`git lfs migrate`, repo private còn nhỏ).
