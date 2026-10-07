# Pha 4: Asset trong gói và tải theo map

**Tier:** L · **Phụ thuộc:** pha 1, 3 · **Trạng thái:** pending

## Bối cảnh

`apps/web/dist` hiện 488 MB, `assets/generated` 382 MB, `assets/packs` 148 MB; 12 map, mỗi map có `regions/r<x>-<z>.bin` + `horizon.bin` + model. Không thể đưa hết vào gói: tải qua mạng di động của Apple giới hạn khoảng 200 MB, Google Play giới hạn gói cơ sở 200 MB. Runtime chỉ tải file có trong manifest, mỗi file có phiên bản (`apps/web/src/asset-versions.ts`, `apps/web/src/game/asset-loader.ts`).

## Việc

1. Đo: script `tools/mobile/asset-budget.ts` tính MB theo nhóm (UI, font, nhạc, nhân vật, mỗi map) từ `assets/manifest.json`; ghi kết quả vào report và trang review.
2. Chia: **trong gói** gồm JS/CSS, font, ảnh UI, nhân vật và trang phục, âm thanh giao diện, và map Nhà của bé (`nha-cua-be`, map nhỏ nhất) để mở app là chơi được ngay. Phần còn lại (11 map, nhạc nền, model riêng map) tải từ `VITE_MIU_SERVER_ORIGIN/game-assets/`. Ngưỡng gói ≤ 150 MB; vượt thì đưa thêm nhóm ra ngoài theo số đo.
3. `asset-loader`: thử bản trong gói trước, không có thì tải từ server; đệm bằng Cache Storage của WebView theo URL có phiên bản, phiên bản đổi thì tải lại, xóa bản cũ khi manifest mới về.
4. Màn tải hiện dung lượng còn phải tải của map khi vào lần đầu (dùng thanh tải theo phần việc sẵn có); mất mạng thì báo rõ và có nút thử lại, không treo.
5. Server: header cache dài hạn cho file có phiên bản dưới `/game-assets/`, CORS cho origin app (pha 1). Không đổi cách deploy asset.
6. Kiểm `pnpm security:dist` trên gói app: không có đáp án quest.

## File

Sửa: `apps/web/src/game/asset-loader.ts`, `apps/web/src/asset-versions.ts`, `apps/web/vite.config.ts` (chọn file vào `dist-native`), màn tải trong `apps/web/src/ui/play/`, cấu hình static của server. Mới: `tools/mobile/asset-budget.ts` (+ test), `apps/web/src/platform/asset-cache.ts` (+ test).

## Kiểm tra

- Test: chọn file vào gói đúng danh sách; cache trả bản đúng phiên bản, đổi phiên bản thì tải lại; lỗi mạng ra trạng thái thử lại.
- Trên Simulator/Emulator: tắt mạng, mở app vào Nhà của bé được; vào Khu rừng thì báo cần mạng; bật mạng, vào lại không tải lại lần hai.
- `pnpm assets:check` xanh (không thêm file ngoài quy trình vào `assets/`).

## Rủi ro, hoàn tác

Cache Storage có thể bị hệ điều hành dọn khi máy đầy: khi đó chỉ tải lại, không mất tiến độ (tiến độ ở server). Hoàn tác: bản native trỏ lại toàn bộ asset về server.
