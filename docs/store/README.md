# Hồ sơ App Store và Google Play

Hồ sơ store của app iPhone/iPad và Android (`apps/mobile`): nội dung trang store, câu trả lời quyền riêng tư và xếp hạng tuổi, ghi chú cho người duyệt ở [`listing.md`](listing.md); ảnh chụp ở `screenshots/`. Nút quyết định và các việc còn chặn phát hành nằm ở đầu `listing.md`.

## Ảnh chụp

Sáu màn chơi thật, giao diện tiếng Việt, người chơi giả "Mochi" trong database PGlite trong RAM (không dữ liệu thật), cảnh 3D vẽ ở chất lượng `high`:

| Thư mục | Ô trên store | Cỡ ảnh (px) | Viewport CSS × scale |
| --- | --- | --- | --- |
| `screenshots/ios-iphone-6.9/` | App Store iPhone 6.9" (bắt buộc) | 1320 × 2868 | 440 × 956 × 3 |
| `screenshots/ios-iphone-6.5/` | App Store iPhone 6.5" | 1284 × 2778 | 428 × 926 × 3 |
| `screenshots/ios-ipad-13/` | App Store iPad 13" (bắt buộc vì app chạy trên iPad) | 2064 × 2752 | 1032 × 1376 × 2 |
| `screenshots/play-phone/` | Google Play điện thoại, 9:16 | 1080 × 1920 | 360 × 640 × 3 |

Mỗi thư mục: `01-home` (đảo nhà), `02-world-map` (bản đồ thế giới), `03-play` (chơi trong thế giới 3D, HUD), `04-question` (câu đố Toán trong nhiệm vụ), `05-reward` (hoàn thành nhiệm vụ), `06-pet-care` (chăm thú cưng). Thứ tự tải lên store: đúng thứ tự tên file.

Chụp lại (sau khi giao diện đổi), chạy tay trên máy dev, một worker, không chạy trên CI:

```sh
pnpm --filter @miu/web store:screens
```

Lệnh tự build web, chạy server với PGlite trong RAM (8787), IdP giả (8788) và preview (4173), rồi ghi đè `docs/store/screenshots/`. Spec: [`apps/web/e2e/store-screens.spec.ts`](../../apps/web/e2e/store-screens.spec.ts); một màn không lên thì cả lượt đỏ (bộ ảnh store phải đủ). Máy dev dùng chung: kiểm không có test, build nặng nào khác đang chạy trước khi bấm.

## Icon và màn khởi động

Logo render một lần ở 1024 px (`pnpm assets:logo`, [`tools/assets/render-brand-logo.ts`](../../tools/assets/render-brand-logo.ts)): icon App Store 1024 × 1024 không có kênh alpha; Android có icon thích ứng (lớp trước là Miu trong vòng tròn an toàn 66 dp, lớp nền màu `colors.background` của `brand.config.json`), lớp monochrome cho icon theo chủ đề của Android 13, và icon tròn cũ cắt tròn. Đổi logo thì chạy `pnpm assets:logo` rồi `pnpm --filter @miu/mobile icons` ([`apps/mobile/scripts/native-icons.ts`](../../apps/mobile/scripts/native-icons.ts)), commit các PNG. Ảnh icon cho trang Play (512 × 512): `assets/generated/brand/miu-logo-512.png`.
