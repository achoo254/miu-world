# Bộ chụp ảnh trước release: thêm ba màn (19/10/2026)

Plan: `plans/dattqh/261019-1428-fixes-and-acceptance/plan.md`, pha 4. Nhánh `main`, commit local, chưa push.

## Đã làm

| Màn | Cách đi tới |
| --- | --- |
| `25-online-off` | Tài khoản kiểm duyệt giả gọi `PUT /api/moderation/online-mode` `off` (đúng công tắc của màn `/kiem-duyet`), bé mở `/play` ở chỗ xuất hiện của Khu rừng, chờ thẻ `online-pause` ("Chơi online đang tạm nghỉ…"). Bật lại `on` trong `finally`, nên màn sau và khổ sau không bị ảnh hưởng (ảnh 26 cho thấy "Online bình thường"). |
| `26-moderation` | Sau màn tổ đội, người chơi thứ hai (Bông) báo cáo bé qua nút Tương tác → Báo cáo → "Lý do khác" (dữ liệu bịa, PGlite trong RAM). Tài khoản kiểm duyệt mở `/kiem-duyet`, chờ thẻ báo cáo trong "Đang chờ". Không gửi được báo cáo thì màn ghi `missing` kèm lý do, ảnh màn của Bông lưu vào thư mục output của Playwright. |
| `27-puzzle-clues` | Quest `vuot-ai-trung-tam` (mọi quest đều mở): ba bước đầu hoàn thành qua API, rồi `/play` ở `trung-tam` cạnh `trum-tt-koala`, bấm Tương tác; chờ `logic-challenge-clues` (bước `coc-giau-bi`, loại `puzzle`, ba manh mối). |

- Tài khoản kiểm duyệt: `moderator-e2e@example.vn`, đăng ký và đồng ý chính sách ở khổ đầu, đăng nhập lại ở khổ sau. `MODERATOR_ACCOUNTS` đặt trong `webServer` env của `apps/web/playwright.config.ts`. Lý do không ảnh hưởng project khác: không spec nào khác đăng ký email đó, nên với mọi tài khoản khác các route `/api/moderation/*` vẫn trả 404 như trước; job thư tóm tắt chỉ gửi cho người kiểm duyệt có trong database (chỉ có trong lần chạy `screens`). `playwright.ci.config.ts` kế thừa cùng env, cũng không đổi hành vi.
- `screens.spec.ts`: tách `newScreen` (context theo khổ, timeout giới hạn) dùng chung cho màn chưa đăng nhập, người chơi và người kiểm duyệt; `firstLine` dùng chung cho lý do `missing`. Giữ nguyên `capture`, `shots.json`, dữ kiện DOM.
- `apps/web/src/review/review-main.ts`: thêm ba tên vào `SCREEN_NAMES`. `docs/screen-review.md`: hai mươi bảy màn (`01-login` … `27-puzzle-clues`), mô tả ba màn mới và tài khoản kiểm duyệt giả.

## Kiểm tra

| Lệnh | Kết quả |
| --- | --- |
| `pnpm typecheck` | Xanh (gốc, server, web; `e2e/**` nằm trong tsconfig web) |
| `pnpm lint` | 0 lỗi, 0 cảnh báo |
| `pnpm --filter @miu/web screens` (lần cuối, đủ hai khổ) | 3 passed (1,8 phút); `360x740` 27/27 `ok`, `820x1180` 27/27 `ok` |

Dữ kiện DOM của ba màn mới (gợi ý, không phải kết luận): `25-online-off` điện thoại `clipped` 6 (chữ HUD nằm dưới thẻ), `27-puzzle-clues` cả hai khổ `clipped` 1; còn lại 0. Lần duyệt ảnh trước release xem các mục này.

Lần chạy đầu, màn 26 ở điện thoại `missing`: chạm vào nhãn tên bé (chạy theo từng khung hình dưới thanh tổ đội) hết giờ. Đổi sang nút Tương tác khi lời nhắc đang là của bé; chạy lại xanh.

Ảnh và `assets/manifest.json` đã trả về như commit (`git checkout`, xóa PNG mới chưa track); quy trình release chụp lại từ cây sạch.

## Còn mở

- Không có. Lần chụp trước release kế tiếp sẽ có 27 màn mỗi khổ; `review.json` hiện tại vẫn của bộ 24 màn.
