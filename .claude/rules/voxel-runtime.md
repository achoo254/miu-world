---
paths:
  - "apps/**"
  - "packages/voxel/**"
---

# Runtime voxel (three.js)

Lý do và ngân sách: `docs/system-architecture.md`, Master Plan v3 §7, §12.

- Ngân sách mỗi cảnh (mục tiêu khởi điểm, chốt chính thức sau gate POC): ≥ 30 FPS trên Android tầm trung, ≤ ~150 draw call, ≤ ~150k tam giác, tải vùng đầu ≤ ~8 MB đã nén. Thay đổi làm tăng draw call/tam giác thì ghi số đo vào trang review.
- Dựng mesh chunk trong Web Worker; không dựng lại mesh trong vòng lặp khung hình. Toàn bộ block dùng một atlas và một material.
- Mọi tải asset đi qua loader kiểm manifest (`apps/poc-voxel/src/asset-loader.ts`); không `fetch`/`GLTFLoader` thẳng tới URL tự ghép.
- Giữ CSP trong `apps/poc-voxel/index.html` chặt: không thêm `unsafe-eval`, không thêm host ngoài, không script hay analytics bên thứ ba. Thêm Rapier (WASM) cần `wasm-unsafe-eval` — là quyết định cần hỏi.
- Va chạm theo lưới block (AABB tự viết trong `packages/voxel`); không thêm engine vật lý khi chưa có vật thể động.
- `packages/voxel` là TypeScript thuần, test được ngoài trình duyệt: không import `three` hay DOM.
- Chất lượng chọn qua `?quality=low|mid|high` (`apps/poc-voxel/src/quality.ts`); tính năng tốn GPU mới phải tắt được ở mức `low`.
- Giải phóng geometry/texture/material khi rời khu vực.
- Quest và nội dung không được phụ thuộc trực tiếp cảnh Three.js.
