# Pha 6: Cổng deploy: CI xanh và ảnh đã duyệt

**Tier:** S · **Phụ thuộc:** pha 4 (job `e2e` là bộ smoke), pha 5 (`review.json`); phiên `miu-world-03` đã deploy xong · **Trạng thái:** pending

## Bối cảnh

`release()` của production (`tools/deploy/production/deploy.sh:113-165`) chỉ đòi working tree sạch (`:117-119`), build, `security:dist` rồi deploy; không hỏi CI. Staging tương tự (`tools/deploy/staging/deploy.sh:82`). `docs/deployment-guide.md` §5 chỉ ghi "chạy đủ gate trong `CLAUDE.md`" trước `release`. Vì thế "smoke chặn deploy" và "ảnh trước mỗi lần deploy" chưa có chỗ bắt buộc.

## Thiết kế

Áp cả staging lẫn production (Validation Log câu 3). `tools/deploy/release-gate.sh` (mới, được hai `deploy.sh` `source`), một hàm `release_gate` chạy trước bước build:

1. Đọc `assets/generated/review/screens/review.json` bằng `node -e` (không phụ thuộc `jq`): lấy `capturedFrom`, `verdict`.
2. `verdict` phải là `pass`.
3. Từ `capturedFrom` tới `HEAD` chỉ được đổi ảnh màn hình, manifest, plan và docs: `git diff --quiet <capturedFrom> HEAD -- . ':(exclude)assets/generated/review/screens' ':(exclude)assets/manifest.json' ':(exclude)assets/LICENSES.md' ':(exclude)plans' ':(exclude)docs'`. Đổi gì khác thì ảnh đã cũ.
4. CI của `capturedFrom` phải xanh toàn bộ: `gh run list --workflow ci --commit <capturedFrom> --json conclusion,status --limit 1` cho `status == completed` và `conclusion == success`. Hỏi CI của commit đã chụp (không phải `HEAD`) để commit chỉ chứa ảnh khỏi phải chờ thêm một lượt CI.
5. Không đạt thì in lý do cụ thể ("CI của <sha> đang chạy/đỏ: <link>", "ảnh chụp ở <sha>, sau đó đã đổi <n> file ngoài ảnh", "còn <n> phát hiện block") và thoát 1.
6. `MIU_RELEASE_FORCE="<lý do>"` cho qua, in lý do ra màn hình và ghi vào tệp `RELEASE_FORCED` cạnh `REVISION` trong bản release (không đổi nội dung `REVISION`) để còn dấu vết trên máy chủ. Dùng cho bản vá gấp khi CI hỏng vì nguyên nhân ngoài code; production vẫn phải hỏi người trước mỗi lần (`CLAUDE.md`, `docs/deployment-guide.md` §1).
7. Lệnh con `deploy.sh gate` (cả hai script) chỉ chạy `release_gate` rồi in "được" hoặc lý do chặn, để agent kiểm trước khi xin phép deploy.

Thứ tự một lần deploy (ghi vào `docs/deployment-guide.md` §5 và §7, và một dòng trong `CLAUDE.md` mục Quy trình):

1. Gate 5 lệnh, build web; commit code; push; CI của commit đó xanh.
2. `pnpm --filter @miu/web screens` trên máy dev, rồi duyệt ảnh theo `docs/screen-review.md`; phát hiện `block` thì sửa và quay lại bước 1.
3. Commit ảnh, `review.json`, manifest (`chore(review): screens before release`), push.
4. `tools/deploy/<production|staging>/deploy.sh gate`, rồi (production: hỏi người trước) `deploy.sh release`.

## Việc

1. Viết `tools/deploy/release-gate.sh`.
2. Hai `deploy.sh`: `source` file trên, gọi `release_gate` đầu `release()` (sau kiểm working tree sạch), thêm lệnh con `gate`. Đọc lại cả file và `git log -3 -- tools/deploy/production/deploy.sh` ngay trước khi sửa; chỉ sửa sau khi phiên `miu-world-03` báo đã deploy xong.
3. `docs/deployment-guide.md` §5, §7: thứ tự deploy mới, `gate`, `MIU_RELEASE_FORCE`. `CLAUDE.md` mục Quy trình: một dòng trỏ tới thứ tự này và `docs/screen-review.md`.

## File

Mới: `tools/deploy/release-gate.sh`. Sửa: `tools/deploy/production/deploy.sh`, `tools/deploy/staging/deploy.sh`, `docs/deployment-guide.md`, `CLAUDE.md`.

## Kiểm tra

Không deploy thật trong pha này. Chạy `deploy.sh gate` (không chạm máy chủ) ở bốn trường hợp và chép kết quả vào report của pha 7:

1. `review.json` hợp lệ, CI của `capturedFrom` xanh, sau đó chỉ commit ảnh: in "được".
2. Thêm một commit đổi code sau lúc chụp (trên máy, không push; xong thì `git reset --soft HEAD~1` và bỏ thay đổi): in "ảnh đã cũ".
3. `verdict: fail` (sửa tạm tệp, không commit): in "còn phát hiện block".
4. `capturedFrom` là một commit có CI đỏ (ví dụ `5e543f4f`): in "CI đỏ" kèm link.

`bash -n` cho ba file shell; `shellcheck` nếu máy có.

## Rủi ro, hoàn tác

- `gh` chưa đăng nhập hay mất mạng: cổng chặn và in cách khắc phục (`gh auth status`); không tự cho qua.
- Hoàn tác: revert; hoặc dùng `MIU_RELEASE_FORCE` cho một lần.

## Todo

- [ ] `tools/deploy/release-gate.sh`
- [ ] Hai `deploy.sh` gọi cổng và có lệnh `gate`
- [ ] `docs/deployment-guide.md`, `CLAUDE.md`
- [ ] Thử bốn trường hợp của `deploy.sh gate`
