# Miu World

Thư mục repo: `miu-world-next` (tên hiển thị sản phẩm vẫn là “Miu World”).

Game phiêu lưu 3D voxel online trên web cho mọi lứa tuổi, nơi kiến thức là công cụ để tiến lên. Vertical slice MVP đã xong và game đang chạy production: mười hai map chơi được với nội dung SGK lớp 2 tập 1, chơi online cùng bạn bè, tổ đội và bạn máy; đang chờ người duyệt nghiệm thu MVP ([Master Plan v3](<Miu World — Master Development Plan v3 (3D theo mockup + Multiplayer).md>) §16). Repo gồm pipeline asset có kiểm license, thư viện voxel, app web (Vite + React, runtime three.js) và server (Express + Drizzle) là nguồn sự thật cho tiến độ và thưởng (Master Plan §7).

- Kế hoạch tổng: [Master Plan v3](<Miu World — Master Development Plan v3 (3D theo mockup + Multiplayer).md>)
- Tài liệu: [`docs/`](docs/README.md)
- Quy tắc cho AI agent: [`CLAUDE.md`](CLAUDE.md)

## Bắt đầu

Cần Node ≥ 22 và pnpm (phiên bản khóa trong `package.json`).

```sh
pnpm install
pnpm assets:check                                  # license + integrity gate
pnpm content:check                                 # schema + tham chiếu chéo của content/
pnpm test && pnpm typecheck && pnpm lint
pnpm dev                                           # API 127.0.0.1:8787 (PGlite trong .data/) + web http://localhost:5173 (proxy /api)
```

`pnpm dev` lấy client dev `miu-web-dev` của dịch vụ đăng nhập auth-next (entry `auth.hoandat.com` / `miu-world dev`) từ `access-tokens.json` trong iCloud Drive của người phụ trách (đặt `MIU_TOKEN_FILE` hoặc `MIU_ICLOUD_DIR` nếu nằm chỗ khác). Không có file đó thì game vẫn mở nhưng không đăng nhập được. Chạy riêng từng phần: `pnpm --filter @miu/server dev` và `pnpm --filter @miu/web dev`.

Trang duyệt cuối: chạy server, rồi `pnpm --filter @miu/web build` và `pnpm --filter @miu/web preview`, mở `/review.html` ở cổng 4173. E2E (bộ smoke chặn deploy, danh sách luồng ở [`docs/code-standards.md`](docs/code-standards.md)): `pnpm --filter @miu/web e2e:smoke`, hoặc một luồng: `pnpm --filter @miu/web e2e --project setup --project <tên>`.

## License asset

Chỉ nhận CC0, MIT, OFL. Nguồn, phiên bản và hash từng file: [`assets/LICENSES.md`](assets/LICENSES.md) và `assets/manifest.json` (sinh tự động, không sửa tay).

## Giấy phép

Mã nguồn theo giấy phép MIT ([`LICENSE`](LICENSE)). Không thuộc phạm vi MIT:

- Asset trong `assets/`: giữ giấy phép gốc của từng pack (CC0, MIT, OFL), xem [`assets/LICENSES.md`](assets/LICENSES.md).
- Văn bản sách giáo khoa trích nguyên văn trong `content/curriculum/` và các quest SGK: bản quyền thuộc tác giả và nhà xuất bản của sách; repo chỉ dùng cho mục đích học tập, phi thương mại.

Quyền riêng tư của người chơi: trang `/privacy` (nội dung ở [`content/legal/privacy-vi.json`](content/legal/privacy-vi.json)). Báo lỗi bảo mật hoặc yêu cầu về dữ liệu: quocdat254@gmail.com.
