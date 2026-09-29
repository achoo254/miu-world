---
title: "Asset sourcing + voxel POC (Master Plan v3 task #5, #6)"
description: "Nhập asset CC0/MIT/OFL có kiểm license, ghép nhân vật Miu, sinh phụ kiện và bản đồ bằng code, POC three.js đo trên máy thật"
status: pending
priority: P1
effort: "L"
tags: [assets, license, voxel, poc, threejs]
created: 2026-09-29
---

# Asset sourcing + voxel POC

## Overview
Hiện thực task #5 (tìm nguồn asset + license gate) và #6 (POC voxel) của Master Plan v3. Nguyên tắc: không tự vẽ, không AI trả phí — asset lấy từ pack CC0 (Kenney, KayKit), MIT (Fluent Emoji), OFL (font), hoặc sinh bằng code từ JSON/seed.

Nguồn quyết định: `plans/dattqh/reports/brainstorm-260929-1533-free-asset-sourcing.md`; Master Plan v3 §10, §12, §14.

Repo greenfield: phase 1 dựng workspace pnpm tối thiểu; Next.js/Express monorepo đầy đủ vẫn là task #3, không thuộc plan này.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Mọi asset có nguồn, license, hash; CI chặn license ngoài allowlist | P1 |
| 2 | Nhân vật Miu ghép từ 2 pack CC0 chạy đủ anim | P1 |
| 3 | POC render Khu rừng + Miu + NPC chỉ bằng asset trong manifest | P1 |
| 4 | Số liệu hiệu năng thật trên 3 máy, chốt gate | P1 |

## Phases

| # | Phase | Tier | Depends | Status |
|---|-------|------|---------|--------|
| 1 | [Asset intake + license gate](./phase-01-asset-intake-license-gate.md) | M | — | Pending |
| 2 | [Character kitbash (Miu)](./phase-02-character-kitbash.md) | M | 1 | Pending |
| 3 | [Voxel accessories from JSON](./phase-03-voxel-accessories.md) | S | 2 | Pending |
| 4 | [Block atlas + forest map data](./phase-04-block-atlas-forest-map.md) | M | 1 | Pending |
| 5 | [POC runtime (three.js)](./phase-05-poc-runtime.md) | L | 2, 3, 4 | Pending |
| 6 | [Device measurement + gate](./phase-06-device-measurement-gate.md) | S | 5 | Pending |

Phase 2 và 4 chạy song song được sau phase 1 (không chung file).

## Success Criteria

- [ ] `assets/manifest.json` + `assets/LICENSES.md`; `pnpm assets:check` xanh trong CI, đỏ khi có file/license lạ
- [ ] `miu-cat.glb` (hoặc fallback khối) đủ node + anim, người duyệt chấp nhận
- [ ] POC: đi lại, va chạm, camera, NPC vẹt, ≥3 props; không request ngoài origin
- [ ] Đo thật 3 máy × 3 mức chất lượng; quyết định gate ghi vào Master Plan v3 §15

## Open Questions

- Git LFS: repo GitHub cần bật LFS (quota free 1 GB lưu trữ/băng thông) — đủ cho POC, xem lại khi asset tăng.
- Nhãn anim thay "ngáp/nhảy" cho M1.3 có chấp nhận không — chốt sau preview phase 2.

<!-- slug: asset-sourcing-and-voxel-poc -->
