---
paths:
  - "assets/**"
  - "tools/assets/**"
  - "tools/world/**"
  - "content/**"
---

# Asset pipeline

Lý do và quyết định: `docs/system-architecture.md` (mục Asset pipeline), Master Plan v3 §10.

## Thứ tự ưu tiên nguồn asset

1. Dùng lại file đã có trong `assets/manifest.json`.
2. Chỉnh bằng script (ghép mesh, tint theo `content/palette.json`, gộp atlas).
3. Tải pack mới có license trong allowlist.
4. Sinh bằng code từ JSON/seed — chỉ khi không có nguồn phù hợp.

Không tự vẽ, không dùng AI tạo ảnh trả phí, không dùng gì của Minecraft.

## Thêm pack mới

1. Khai báo pack trong `tools/assets/sources.json` (schema ở `tools/assets/asset-lib.ts`). License phải thuộc `licenseAllowlist`; để trống `sha256` cho lần tải đầu (trust-on-first-use), sau đó giữ hash đã ghi.
2. `pnpm assets:fetch` → `pnpm assets:manifest` → `pnpm assets:check`.
3. Chỉ giữ file cần qua `keep` glob; loại file chỉ được thuộc allowlist đuôi trong `asset-lib.ts`.
4. Pack tải tay (itch.io, ví dụ KayKit): `"mode": "manual"`, đặt file vào `assets/_inbox/` (gitignored) rồi kiểm hash.
5. Không tự nâng phiên bản pack khi URL/hash đổi; cập nhật `sources.json` như một thay đổi có duyệt.

## Thêm asset sinh bằng code

- Khai báo generator và `derivedFrom` trong `tools/assets/generated.json`; output vào `assets/generated/<nhóm>/`.
- Generator phải xác định: cùng input → cùng byte output. Kiểm bằng cách chạy lại và so hash.
- Chạy generator xong phải sinh lại manifest (`pnpm assets:manifest`).
- Dữ liệu nội dung (phụ kiện, anim, block, nhân vật, palette) nằm ở `content/*.json`, validate bằng Zod; biến thể mới = đổi dữ liệu, không sửa code.

## Ngân sách

- Tổng `assets/packs/` và giới hạn mỗi file: định nghĩa ở `budget` trong `tools/assets/sources.json`; gate báo đỏ khi vượt. Vượt thì đề xuất chuyển Git LFS — là quyết định cần người chốt, không tự chuyển.
- Mỗi phụ kiện ≤ 1 draw call; nhân vật hiện là 1 skinned mesh — giữ như vậy khi thêm bộ phận.
