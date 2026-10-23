# Pha 6: Lệnh dựng và CI

**Tier:** M · **Phụ thuộc:** pha 3 · **Trạng thái:** pending

## Việc

1. Lệnh ở `package.json` gốc: `mobile:build` (build web `--mode native` + `cap sync`), `mobile:ios` (mở/chạy Simulator), `mobile:android` (Emulator), `mobile:release:ios` (archive có ký, chạy trên máy dev), `mobile:release:android` (AAB có ký).
2. CI (`.github/workflows/ci.yml`): job `mobile-android` trên Ubuntu dựng APK debug; job `mobile-ios` trên macOS dựng không ký (`CODE_SIGNING_ALLOWED=NO`). Chỉ chạy khi `apps/web/**`, `apps/mobile/**`, `packages/**` đổi. Không chạy song song với bước nặng khác trong cùng máy.
3. Ký phát hành: keystore Android và chứng chỉ/profile iOS nằm ngoài repo (iCloud của người phụ trách, khai trong `tools/private/private-files.json` như các file riêng khác); script đọc đường dẫn từ env, không in giá trị. Chưa đưa ký lên CI ở đợt này.
4. Số phiên bản: `versionName`/`CFBundleShortVersionString` lấy từ `apps/mobile/package.json`, `versionCode`/build number tăng theo mỗi lần phát hành.
5. Gate repo: thêm `mobile:build` vào danh sách lệnh trước khi báo xong khi sửa `apps/mobile/**`.

## File

Sửa: `package.json`, `.github/workflows/ci.yml`, `tools/private/private-files.json`, `CLAUDE.md` (mục Lệnh). Mới: `apps/mobile/scripts/*.ts` nếu cần.

## Kiểm tra

CI xanh cả hai job trên một nhánh thử; `pnpm mobile:build` chạy trên máy dev; quét `git log -p origin/main..HEAD` không có khóa ký hay secret trước khi push.

## Tiến độ (23/10/2026)

- [x] Lệnh ở `package.json` gốc: `mobile:build` (`vite build --mode native` → `security:dist --native` → `cap sync`), `mobile:ios` / `mobile:android` (`cap run`), `mobile:release:ios` / `mobile:release:android` (`apps/mobile/scripts/release.ts`).
- [x] CI: workflow riêng `.github/workflows/mobile.yml` (không gộp vào `ci.yml`, để chỉ chạy khi `apps/web/**`, `apps/mobile/**`, `packages/**`, `assets/manifest.json`, `brand.config.json`, lockfile, `tools/security/**` đổi): job `android` (Ubuntu, Temurin 21, `assembleDebug`, artifact `miu-world-debug-apk` giữ 14 ngày) và job `ios` (macOS, Simulator, `CODE_SIGNING_ALLOWED=NO`). `actions/setup-java` khóa theo commit; các action khác theo tag như `ci.yml`.
- [x] Ký phát hành ngoài repo: Android đọc keystore và mật khẩu từ env `MIU_ANDROID_*` trong `build.gradle` (không qua dòng lệnh, `*.jks`/`*.keystore` bị bỏ qua trong git); iOS ký tự động theo `MIU_APPLE_TEAM_ID`. Script không in giá trị. Chưa đưa ký lên CI.
- [x] Phiên bản: `version` của `apps/mobile/package.json` (1.0.0) là `versionName` / `MARKETING_VERSION`; số build từ `MIU_BUILD_NUMBER` cho mỗi lần phát hành (test `apps/mobile/mobile-project.test.ts`).
- [ ] `tools/private/private-files.json`: thêm keystore Android và chứng chỉ iOS khi người sở hữu tạo chúng (cần file thật để ghi sha256).
- [ ] `CLAUDE.md` mục Lệnh: thêm `pnpm mobile:build` vào gate khi sửa `apps/mobile/**` (người hoặc phiên chính sửa; tác tử này không sửa tệp hướng dẫn của repo).
- [ ] CI xanh cả hai job sau khi push.

## Rủi ro, hoàn tác

Job macOS trên GitHub tốn phút CI hơn Linux (repo công khai được miễn phí phút runner tiêu chuẩn). Hoàn tác: xóa hai job.
