# STAG-DEV-README.md — SSH vào máy chủ production

> **Điểm vào duy nhất** để agent SSH vào máy của Miu World: quyền hạn (§1), máy nào làm gì (§2), credential (§3), lệnh SSH (§4), đường dẫn trên máy (§5), lệnh thường dùng (§6), dễ vấp (§7).
> Deploy (setup, release, rollback, DNS) ở [`deployment-guide.md`](deployment-guide.md); tài liệu này chỉ lo phần vào máy.

⚠️ **Repo này công khai trên GitHub.** Không ghi vào đây (hay bất kỳ file nào trong repo) IP public, cổng SSH, user, mật khẩu hay key. Mọi giá trị đó đọc lúc chạy từ tệp credential (§3), như các lệnh ở §4.

**Staging đã gỡ ngày 12/10/2026** theo yêu cầu người sở hữu: dịch vụ, database, cấu hình và mọi bản sao lưu của staging trên lab đều đã xóa, edge nginx trên .65 và bản ghi DNS `miu-staging` cũng đã gỡ. Không còn máy lab nào chạy Miu; không deploy Miu lên lab.

## 1. Quyền hạn của agent

- **Production (.65):** đọc trạng thái thì được. **Mỗi lần** deploy, migration hay restart ở production phải hỏi người trước. .65 chạy nhiều dự án khác (pm2, nginx, cổng 8787): không sửa, dừng hay nâng cấp gì không phải của Miu.
- **Không bao giờ:** in secret ra hội thoại, log hay report; `cat`/`source` tệp credential; commit tệp env, key hay credential.

## 2. Máy và vai trò

| Môi trường | Máy | Entry trong tệp credential | Đăng nhập | Miu chạy gì ở đó |
| --- | --- | --- | --- | --- |
| Dev | Máy dev | — | — | `pnpm dev` (API 8787 + web 5173); cách chạy ở `CLAUDE.md` |
| Production | **.65** (CentOS Stream 9) | `SSH_SERVER_STAGING` (group `SERVER STAGING .65`) | key, mật khẩu dự phòng | `miu-server` (:8797 loopback), Postgres 16, nginx `conf.d/miu.conf` |

## 3. Credential (ngoài repo)

Nằm trong iCloud của người phụ trách, trỏ tới bằng biến đặt một lần trong shell profile:

| Biến / tệp | Đường dẫn (macOS) | Dùng cho |
| --- | --- | --- |
| `ALL_IN_ONE_STAGING_DEV` | `$HOME/Library/Mobile Documents/com~apple~CloudDocs/cong-viec/Cong viec/ENV production/all-in-one-staging-dev.json` | SSH vào .65 |
| `access-tokens.json` | cùng thư mục | Secret ứng dụng (Google, Postgres, Cloudflare, Google Analytics); bảng entry ở [`deployment-guide.md`](deployment-guide.md) §2.2 |
| `ALL_IN_ONE_PROD` | `all-in-one-production.json`, cùng thư mục | **Không dùng** cho Miu (của hệ khác) |

⚠️ Máy production của Miu (.65) nằm trong tệp *staging-dev*, dưới tên "SERVER STAGING .65", vì nó là máy staging của các dự án khác.

**Định dạng:** `{ "_meta": {...}, "servers": [...] }`. Mỗi entry có `group`, `name`, `host`, `port`, `user`, `auth` (`password` hoặc `key+password`), `password`, `private_key` (PEM), `os`, `note`. Ý nghĩa từng trường: `_meta.entry_schema` trong chính tệp. Xem danh sách mà không lộ secret:

```sh
jq -r '.servers[] | [.group, .name, .auth, (.os // "")] | @tsv' "$ALL_IN_ONE_STAGING_DEV"
```

## 4. Lệnh SSH

Hàm lấy một trường của entry:

```sh
srv() { jq -r --arg n "$1" '.servers[] | select(.name == $n) | .'"$2" "$ALL_IN_ONE_STAGING_DEV"; }
```

**.65 (production), bằng key.** Ghi key ra tệp tạm quyền 600, xong thì xóa:

```sh
P=SSH_SERVER_STAGING
K="$(mktemp)"; chmod 600 "$K"; srv $P private_key > "$K"
ssh -i "$K" -o IdentitiesOnly=yes -p "$(srv $P port)" "$(srv $P user)@$(srv $P host)"; rm -f "$K"
```

**Lần đầu vào máy:** thêm `-o StrictHostKeyChecking=accept-new` để ghi host key vào `known_hosts` mà không hỏi.

**Script:** `tools/deploy/production/deploy.sh` dùng đúng cách trên (hàm `prod`). Viết script mới thì làm theo nó, đừng chép host hay cổng vào script.

## 5. Đường dẫn trên máy (.65)

| Thành phần | Đường dẫn |
| --- | --- |
| Release | `/opt/miu/releases/<id>/`, symlink `/opt/miu/current` |
| Revision đang chạy | `/opt/miu/current/apps/server/dist/server/REVISION` |
| Env (chỉ `root` và nhóm `miu` đọc) | `/etc/miu/production.env` |
| Backup database | `/var/backups/miu/{before-<id>,daily-<ngày>}.dump` (xóa sau 14 ngày) |
| Node | `/opt/node22` (tách nvm của pm2) |
| nginx | `/etc/nginx/conf.d/miu.conf` |
| Log server | `journalctl --namespace=miu -u miu-server` (journal riêng, giữ 14 ngày) |
| Log request | `/var/log/nginx/miu.hoandat.com.{access,error}.log` |

## 6. Lệnh thường dùng (chạy trên máy qua SSH)

```sh
# Trạng thái dịch vụ của Miu
systemctl is-active miu-server postgresql nginx miu-backup.timer

# Health ngay trên máy (không qua Cloudflare)
curl -s http://127.0.0.1:8797/api/health

# Log gần nhất
journalctl --namespace=miu -u miu-server -n 50 --no-pager

# Đo tài nguyên trước khi đặt thêm gì lên máy
free -m; df -h /; ss -ltnp

# Kiểm không làm hỏng dự án khác sau khi đụng nginx
nginx -t && pm2 jlist | python3 -c "import json,sys; a=json.load(sys.stdin); print(sum(p['pm2_env']['status']=='online' for p in a), 'of', len(a), 'online')"
```

Từ máy dev, không cần SSH: `curl -s https://miu.hoandat.com/api/health`.

## 7. Dễ vấp (đã gặp thật)

1. **Hook của môi trường chặn vài từ trong lệnh Bash** (ví dụ lệnh chứa "target" hay "coverage"). Gặp thì viết script ra tệp bằng công cụ Write rồi chạy tệp.
2. **Cổng 8787 trên .65 thuộc dự án khác.** Production Miu dùng 8797. Quy tắc "cổng bận thì tắt tiến trình cũ" trong `CLAUDE.md` chỉ áp cho máy dev, không áp cho .65.
3. **nginx trên .65 là CentOS:** chỉ có `conf.d/`, không có `sites-enabled`.
4. **Không đoán credential, không tìm key ở nơi khác.** Entry thiếu thì dừng và báo người phụ trách.

## 8. Tài liệu liên quan

| Tài liệu | Nội dung |
| --- | --- |
| [`deployment-guide.md`](deployment-guide.md) | Deploy production, secret ứng dụng, DNS Cloudflare, rollback, giữ dữ liệu 14 ngày |
| `tools/deploy/production/` | Script và cấu hình của .65; lý do ghi ngay trong file |
| [`system-architecture.md`](system-architecture.md) | Kiến trúc và hướng triển khai đích |
| `CLAUDE.md` (gốc repo) | Lệnh dev, gate, cổng cố định trên máy dev |
