# Nén texture KTX2: hoãn

**Trạng thái:** xong (01/10/2026) · **Tier:** S · **Nhánh:** `main` · Quyết định bởi Jev (`jev-input.json`, `jev-output.json`)

## Bối cảnh

Trong backlog P0, việc AI tự làm được chỉ còn dòng "nén texture (KTX2)" của task #21. Các việc còn lại cần người: đo iPad (DEVICE-01), giáo viên, designer, chơi thử với trẻ, xác minh Google, pháp chế.

## Số đo

- Atlas block: một PNG 512 × 512, 53 KB, khoảng 1,3 MB bộ nhớ GPU kể cả mipmap. KTX2 còn khoảng 0,3 MB.
- Ngân sách vùng đầu ≤ 8 MB nén; lần đo gần nhất (30/09, map nhỏ hơn): 0,9 MB gzip, 60 FPS, tối đa 108 draw call.
- KTX2 cần transcoder Basis Universal (WebAssembly, dependency mới) và `wasm-unsafe-eval` trong CSP.

## Quyết định

Jev chọn `defer_with_evidence` (0,98, `auto`): chưa làm KTX2, ghi số đo vào roadmap, xem lại khi atlas vượt 2048 px hoặc lần đo iPad cho thấy bộ nhớ texture là vấn đề. CSP giữ nguyên, không thêm dependency.

## Việc mở

- Map đã to gấp 4 từ hôm nay; số đo hiệu năng (`perf`) chưa chạy lại. Lượt `perf` mất khoảng 30 phút và chỉ chạy khi người sở hữu yêu cầu.
