---
paths:
  - "apps/web/src/game/**"
  - "apps/web/vite.config.ts"
  - "apps/web/index.html"
  - "packages/voxel/**"
---

# Runtime voxel (three.js)

Lý do và ngân sách: `docs/system-architecture.md`, Master Plan v3 §7, §12. Runtime nằm ở `apps/web/src/game/`; lớp `Game` (`game.ts`) có `start`/`stop`/`dispose`.

- Ngân sách mỗi cảnh (mục tiêu khởi điểm, chốt chính thức sau gate POC): ≥ 30 FPS trên máy chuẩn iPad Gen 10 (máy yếu hơn dùng mức `low`), ≤ ~150 draw call, ≤ ~150k tam giác, tải vùng đầu ≤ ~8 MB đã nén. Thay đổi làm tăng draw call/tam giác thì ghi số đo vào trang review.
- Dựng mesh chunk trong Web Worker; không dựng lại mesh trong vòng lặp khung hình. Toàn bộ block dùng một atlas và một material.
- Mọi tải asset đi qua loader kiểm manifest (`apps/web/src/game/asset-loader.ts`); không `fetch`/`GLTFLoader` thẳng tới URL tự ghép.
- Giữ CSP (`CONTENT_SECURITY_POLICY` trong `apps/web/vite.config.ts`, chèn vào mọi trang khi build) chặt: không thêm `unsafe-eval`, không thêm host ngoài, không script hay analytics bên thứ ba. Thêm Rapier (WASM) cần `wasm-unsafe-eval` — là quyết định cần hỏi.
- Va chạm theo lưới block (AABB tự viết trong `packages/voxel`); không thêm engine vật lý khi chưa có vật thể động.
- `packages/voxel` là TypeScript thuần, test được ngoài trình duyệt: không import `three` hay DOM.
- Chất lượng chọn qua `?quality=low|mid|high` (`apps/web/src/game/quality.ts`); tính năng tốn GPU mới phải tắt được ở mức `low`.
- Giải phóng geometry/texture/material khi rời khu vực; `Game.dispose()` giải phóng toàn bộ (kể cả WebGL context, listener window) — E2E kiểm rời `/play` không còn canvas.
- Build chỉ copy file runtime dùng (`apps/web/vite-repo-assets.ts`: generated groups, font, model mà bản đồ đặt và texture chúng tham chiếu); thêm loại asset runtime mới thì cập nhật hàm đó.
- Quest và nội dung không được phụ thuộc trực tiếp cảnh Three.js.
- Runtime không import React; giao tiếp với UI chỉ qua event rời rạc của `game-bridge`. Dữ liệu theo khung hình (vị trí nhãn, camera) game tự ghi vào DOM qua ref.
