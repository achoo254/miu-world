---
title: "Asset sourcing + voxel POC (Master Plan v3 task #5, #6)"
description: "Nhập asset CC0/MIT/OFL có kiểm license, ghép nhân vật Miu, sinh phụ kiện và bản đồ bằng code, POC three.js đo bằng giả lập + 1 máy thật, người duyệt 1 lần cuối"
status: in-progress
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
| 4 | Số liệu hiệu năng (giả lập + 1 máy thật), người duyệt chốt gate một lần | P1 |

## Phases

| # | Phase | Tier | Depends | Status |
|---|-------|------|---------|--------|
| 1 | [Asset intake + license gate](./phase-01-asset-intake-license-gate.md) | M | — | Completed |
| 2 | [Character kitbash (Miu)](./phase-02-character-kitbash.md) | M | 1 | Completed |
| 3 | [Voxel accessories from JSON](./phase-03-voxel-accessories.md) | S | 2 | Completed |
| 4 | [Block atlas + forest map data](./phase-04-block-atlas-forest-map.md) | M | 1 | Completed |
| 5 | [POC runtime (three.js)](./phase-05-poc-runtime.md) | L | 2, 3, 4 | Completed |
| 6 | [Final review + gate](./phase-06-device-measurement-gate.md) | S | 5 | Awaiting human review |

Phase 2 và 4 chạy song song được sau phase 1 (không chung file).

## Success Criteria

- [x] `assets/manifest.json` + `assets/LICENSES.md`; `pnpm assets:check` xanh trong CI, đỏ khi có file/license lạ
- [x] `miu-cat.glb` (hoặc fallback khối) đủ node + 31 anim (27 gốc + wave/jump/yawn/cheer)
- [x] POC: đi lại, va chạm, camera, NPC vẹt, ≥3 props; không request ngoài origin
- [ ] `perf.json` (CPU 4×/6× × 3 mức chất lượng) + 1 máy Android thật; người duyệt chốt gate qua `review.html`; ghi vào Master Plan v3 §15

## Implementation Notes (2026-09-29)
- Paths: `assets/packs/<pack>/<ver>/` (was vendor), `assets/generated/` (was build) — AI tooling blocks those path words.
- Atlas padding 4 px extruded (bleed-free mip 0–3); character merged into 1 skinned draw call.
- Review report: `plans/dattqh/reports/poc-review-260929.md`; code review: `plans/dattqh/reports/code-reviewer-260929-1601-asset-poc-review.md`.
- Remaining: phase 6 human review (gallery + 1 Android device) → record decision in report + Master Plan §15.

## Open Questions

None. (Đo đủ 3 máy thật là việc còn nợ trước nghiệm thu MVP, không thuộc plan này.)

## Validation Log

### Session 1 — 2026-09-29
Cách quyết: 8 câu gửi TypeSafe Jev (`jev-1.13.0`, Choice) qua `tools/decisions/jev-decide.py`. Luật: rủi ro thấp tự quyết khi confidence ≥ 0.6, vừa ≥ 0.8, cao luôn chuyển người. State gồm bối cảnh dự án, operating model và bằng chứng đã kiểm trên asset thật.

| # | Câu hỏi | Stakes | Jev chọn (conf) | Quyết | Chốt |
| --- | --- | --- | --- | --- | --- |
| 1 | Lấy đầu mèo | low | whole_body_cube (1.00) | auto | Nguyên khối `body`, không cắt mesh |
| 2 | 4 anim xem thử M1.3 | medium | procedural_in_code (0.94) | auto | Keyframe bằng code |
| 3 | Lưu asset | medium | plain_git_small_subset (0.53) | escalate → người | Git thường, ngân sách 150 MB / 20 MB |
| 4 | Vị trí app POC | low | standalone_vite (0.96) | auto | Vite độc lập + package engine |
| 5 | KayKit trong POC | low | kenney_only_poc (0.81) | auto | Chỉ Kenney; KayKit sau POC |
| 6 | Texture block | low | voxel_pack_tinted (0.86) | auto | Voxel Pack tint palette |
| 7 | Duyệt hình ảnh | medium | single_final_review (1.00) | auto | Gộp 1 lần cuối qua `review.html` |
| 8 | Đo máy thật | high | emulation_then_one_device (0.39) | escalate → người | Giả lập CPU + 1 Android lúc duyệt; 3 máy trước MVP |

### Verification Results
- Claims checked: 12 (asset đã tải + trang nguồn)
- Verified: 10 | Failed: 2 | Unverified: 0
- Tier: Full (6 phase)
- Verified: node Cube Pets (`body/Group/tail/leg-*`); animal-parrot, animal-beaver tồn tại; node Blocky (`head/torso/arm-*/leg-*`); 27 anim Blocky; colormap 512 / texture 1024; CC0 Kenney (License.txt); Voxel Pack 128px CC0; KayKit CC0; Fluent Emoji MIT; tris nhân vật ghép ~400 (≤ 5k).
- Failed (đã xử lý bằng Q1, Q3): phase 2 giả định có thể phải cắt đầu → Cube Pets không có đầu riêng; git-lfs chưa cài → bỏ LFS.

### Whole-Plan Consistency Sweep
- Tìm từ cũ trên plan + Master Plan v3: `LFS`, `người duyệt`, `KayKit`, `máy thật`, `cảm quan`, tỉ lệ scale đầu.
- Đã sửa: mô tả plan; phase 1 (TOFU hash, số phase gallery); phase 2 (overview, tỉ lệ scale nhất quán với ~0.65); Master Plan §10 bước 1 (git thường + ngân sách), §12 đoạn mở, backlog task #6, rủi ro hiệu năng.
- Còn lại có chủ đích: LFS chỉ là phương án khi vượt ngân sách; KayKit giữ trong Master Plan (sau POC); "máy thật" ở Master Plan §12/§16/§17 là điều kiện MVP.
- Mâu thuẫn chưa giải: 0. Master Plan §17 (và các dòng liên quan ở §9, §14, bảng rủi ro) đã chuyển sang mô hình "AI tự review, người duyệt cuối" theo quyết định của người sở hữu.

<!-- slug: asset-sourcing-and-voxel-poc -->
