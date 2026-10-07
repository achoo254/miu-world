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

## Rủi ro, hoàn tác

Job macOS trên GitHub tốn phút CI hơn Linux (repo công khai được miễn phí phút runner tiêu chuẩn). Hoàn tác: xóa hai job.
