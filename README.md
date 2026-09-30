# Miu World

Game phiêu lưu 3D voxel trên web cho trẻ em, nơi kiến thức là công cụ để tiến lên. Repo đang ở giai đoạn Foundation (sau gate POC): có pipeline asset có kiểm license, thư viện voxel, app web (Vite + React, runtime three.js), server (Express + Drizzle) với tài khoản phụ huynh, hồ sơ trẻ và API nhân vật/tiến độ/thưởng theo [Master Plan v3](<Miu World — Master Development Plan v3 (3D theo mockup + Multiplayer).md>) §7.

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
pnpm --filter @miu/server dev                      # API tại 127.0.0.1:8787 (PGlite trong .data/)
pnpm --filter @miu/web dev                         # web tại http://localhost:5173 (proxy /api)
```

Trang duyệt cuối: chạy server, rồi `pnpm --filter @miu/web build` và `pnpm --filter @miu/web preview`, mở `/review.html` ở cổng 4173. E2E: `pnpm --filter @miu/web e2e --project setup --project account --project play`.

## License asset

Chỉ nhận CC0, MIT, OFL. Nguồn, phiên bản và hash từng file: [`assets/LICENSES.md`](assets/LICENSES.md) và `assets/manifest.json` (sinh tự động, không sửa tay).

## Giấy phép

Mã nguồn theo giấy phép MIT ([`LICENSE`](LICENSE)). Không thuộc phạm vi MIT:

- Asset trong `assets/`: giữ giấy phép gốc của từng pack (CC0, MIT, OFL), xem [`assets/LICENSES.md`](assets/LICENSES.md).
- Văn bản sách giáo khoa trích nguyên văn trong `content/curriculum/` và các quest SGK: bản quyền thuộc tác giả và nhà xuất bản của sách; repo chỉ dùng cho mục đích học tập, phi thương mại.

Quyền riêng tư của người chơi: trang `/privacy` (nội dung ở [`content/legal/privacy-vi.json`](content/legal/privacy-vi.json)). Báo lỗi bảo mật hoặc yêu cầu về dữ liệu: quocdat254@gmail.com.
