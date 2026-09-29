# Miu World

Game phiêu lưu 3D voxel trên web cho trẻ em, nơi kiến thức là công cụ để tiến lên. Repo đang ở giai đoạn POC: pipeline asset có kiểm license và một runtime three.js thử nghiệm.

- Kế hoạch tổng: [Master Plan v3](<Miu World — Master Development Plan v3 (3D theo mockup + Multiplayer).md>)
- Tài liệu: [`docs/`](docs/README.md)
- Quy tắc cho AI agent: [`CLAUDE.md`](CLAUDE.md)

## Bắt đầu

Cần Node ≥ 22 và pnpm (phiên bản khóa trong `package.json`).

```sh
pnpm install
pnpm assets:check                                  # license + integrity gate
pnpm test && pnpm typecheck && pnpm lint
pnpm --filter @miu/poc-voxel dev                   # POC tại http://localhost:5173
```

Trang duyệt cuối của POC: chạy `pnpm --filter @miu/poc-voxel build` rồi `pnpm --filter @miu/poc-voxel preview`, mở `/review.html` ở cổng 4173.

## License asset

Chỉ nhận CC0, MIT, OFL. Nguồn, phiên bản và hash từng file: [`assets/LICENSES.md`](assets/LICENSES.md) và `assets/manifest.json` (sinh tự động, không sửa tay).
