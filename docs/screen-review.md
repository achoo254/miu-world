# Xem ảnh màn hình trước deploy

Lỗi người chơi gặp nhiều nhất là lỗi nhìn thấy được: panel thiếu nút đóng, đảo Home bị đẩy xuống, nhãn Tương tác bị thẻ nhiệm vụ đè. E2E kiểm hành vi, không nhìn màn; vì vậy trước mỗi lần deploy (staging và production) các màn chính được chụp ở điện thoại dọc và iPad dọc, và một agent xem từng ảnh theo checklist dưới đây. Cổng deploy (`tools/deploy/release-gate.sh`, xem [`deployment-guide.md`](deployment-guide.md)) chỉ cho chạy khi ảnh mới và đã duyệt, không còn phát hiện mức `block`.

## Chụp

```sh
pnpm --filter @miu/web screens
```

- Chạy trên máy dev, 1 worker, cùng server E2E (PGlite trong RAM, tài khoản giả): kiểm tải máy và cổng 4173/8787/8788 trước. Khoảng 1–2 phút.
- Spec: [`apps/web/e2e/screens.spec.ts`](../apps/web/e2e/screens.spec.ts); project `screens` không chạy trên CI.
- Khổ màn: 360 × 740 và 820 × 1180, `deviceScaleFactor: 1`, có cảm ứng. Mười chín màn mỗi khổ, tên cố định (`01-login` … `19-worksheets`), ghi đè mỗi lần chụp ở `assets/generated/review/screens/<rộng>x<cao>/<tên>.png`.
- Mỗi khổ có `shots.json`: `capturedFrom` (commit lúc chụp), `uncommitted` (file đã track mà đổi chưa commit lúc chụp), `capturedAt`, và cho từng màn `status` (`ok` hay `missing` kèm lý do) cùng dữ kiện DOM đo lúc chụp ([`apps/web/e2e/layout.ts`](../apps/web/e2e/layout.ts)): nút ra ngoài màn (`offScreen`), nút chồng lên nhau (`overlaps`), panel mở không có nút đóng (`missingClose`), chữ bị xén (`clipped`), khóa i18n lọt ra màn (`rawText`), nút nhỏ hơn 44 px (`small`). Dữ kiện là gợi ý, không phải kết luận.
- Spec chạy `pnpm -s assets:manifest` khi xong; ảnh và JSON nằm trong manifest (glob `generated/review/screens/**` trong `tools/assets/generated.json`).

## Xem ảnh

1. Phiên chính chia ảnh cho subagent, mỗi subagent tối đa 12 ảnh, để ảnh không tràn ngữ cảnh. Prompt gồm: đường dẫn các PNG, phần `shots` của các ảnh đó trong `shots.json`, checklist dưới đây, và nếu có thì ảnh lần duyệt trước để so: `git show <capturedFrom cũ>:assets/generated/review/screens/<khổ>/<tên>.png > <scratchpad>/prev-<khổ>-<tên>.png`. Không nói trước ảnh nào có lỗi.
2. Subagent mở từng PNG bằng công cụ Read (model nhìn ảnh trực tiếp), đối chiếu checklist và dữ kiện DOM, so với ảnh lần trước, rồi trả phát hiện đúng định dạng dưới đây kèm `Status`. Không gửi ảnh ra dịch vụ ngoài, không dùng dịch vụ trả phí.
3. Phiên chính gộp phát hiện vào `assets/generated/review/screens/review.json`, chạy `pnpm assets:manifest`. Phát hiện `block` phải sửa trước khi deploy: sửa, chụp lại, ghi commit sửa vào `fixedIn`. Phát hiện `note` hiện trên trang review cho người duyệt.

### Checklist (mỗi mục là câu hỏi có/không cho từng ảnh)

1. Panel, cảnh hay hộp thoại đang mở có nút đóng hoặc quay lại nhìn thấy, không bị che, đủ lớn để chạm (khoảng ≥ 44 px)? Không có → `missing-close`, `block`.
2. Có nút, nhãn Tương tác, thẻ nhiệm vụ, cần điều khiển, menu, thanh máu nào đè lên nhau không? Có → `overlap`, `block` nếu che chữ hay vùng chạm.
3. Có chữ bị cắt (dấu "…" giữa câu, dòng bị xén nửa, chữ tràn khung, thiếu dấu tiếng Việt) không? → `clipped`.
4. Có phần nào ra ngoài màn hay sát mép bị cắt không? → `off-screen`, `block` nếu là nút.
5. So với ảnh lần trước: vùng chính (đảo Home, bản đồ, panel) có bị đẩy, lệch, co lại mà commit không có ý đó không? → `shifted`. Không có ảnh trước thì xét bố cục có cân không (vùng chính bị đẩy hẳn xuống, để trống nửa màn).
6. Màn cần cảnh 3D phía sau có vẽ (không đen trắng, không thiếu đảo)? → `blank-scene`.
7. Có chuỗi khóa hay chữ tiếng Anh lọt vào màn tiếng Việt (ví dụ `common.close`) không? → `raw-text`.
8. Chữ đọc được trên nền (tương phản), bố cục hợp cả bé lẫn người lớn ([`.claude/rules/product-audience.md`](../.claude/rules/product-audience.md))? → `note`.

### `review.json`

```json
{
  "capturedFrom": "<sha của HEAD lúc chụp>",
  "capturedAt": "<ISO, Asia/Saigon>",
  "reviewedAt": "<ISO, Asia/Saigon>",
  "reviewer": "agent:<tên agent>",
  "verdict": "pass",
  "findings": [
    { "shot": "360x740/12-event-panel.png", "kind": "missing-close", "severity": "block", "text": "Panel Olympic không có nút đóng; chỉ thoát được bằng nút Back của máy.", "fixedIn": null }
  ]
}
```

- `kind`: `missing-close | overlap | clipped | off-screen | shifted | blank-scene | raw-text | other`; `severity`: `block | note`.
- `verdict` là `pass` khi không còn phát hiện `block` nào có `fixedIn` rỗng, ngược lại `fail`.
- `capturedFrom` lấy từ `shots.json`; cả hai khổ phải chụp cùng một commit. Nếu `uncommitted` có file ngoài `docs/`, `plans/` (ví dụ code đang sửa dở của phiên khác) thì ảnh không khớp commit: commit hoặc đợi phiên kia commit, rồi chụp lại.

Trang review (`apps/web/review.html`, mục "Màn hình trước deploy") hiện ảnh hai khổ cạnh nhau, phát hiện dưới từng ảnh và đầu mục ghi commit đã chụp, giờ chụp, kết luận.
