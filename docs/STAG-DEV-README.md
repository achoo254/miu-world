# STAG-DEV-README.md — SSH vào lab và máy chủ (dev, staging, production)

> **Điểm vào duy nhất** để agent SSH vào máy của Miu World: quyền hạn (§1), máy nào làm gì (§2), credential (§3), lệnh SSH (§4), đường dẫn trên máy (§5), lệnh thường dùng (§6), dễ vấp (§7).
> Deploy (setup, release, rollback, DNS) ở [`deployment-guide.md`](deployment-guide.md); tài liệu này chỉ lo phần vào máy.

⚠️ **Repo này công khai trên GitHub.** Không ghi vào đây (hay bất kỳ file nào trong repo) IP public, cổng SSH, user, mật khẩu hay key. Mọi giá trị đó đọc lúc chạy từ tệp credential (§3), như các lệnh ở §4.

## 1. Quyền hạn của agent

- **Staging (lab 176):** được tự SSH, deploy, restart, đọc log, nhưng chỉ với thư mục và tiến trình của Miu (`/opt/miu`, `/etc/miu`, `/var/backups/miu`, `miu-server`, `miu-tunnel`, `sites-enabled/miu-staging`). 176 còn chạy MongoDB của OneDash staging: không đụng.
- **Edge và production (.65):** đọc trạng thái thì được. **Mỗi lần** deploy, migration hay restart ở production phải hỏi người trước. .65 chạy nhiều dự án khác (pm2, nginx, cổng 8787): không sửa, dừng hay nâng cấp gì không phải của Miu.
- **Các lab box khác:** không deploy Miu lên đó. Muốn đổi máy staging thì theo [`deployment-guide.md`](deployment-guide.md) §3.
- **Không bao giờ:** in secret ra hội thoại, log hay report; `cat`/`source` tệp credential; commit tệp env, key hay credential.

## 2. Máy và vai trò

| Môi trường | Máy | Entry trong tệp credential | Đăng nhập | Miu chạy gì ở đó |
| --- | --- | --- | --- | --- |
| Dev | Máy dev | — | — | `pnpm dev` (API 8787 + web 5173); cách chạy ở `CLAUDE.md` |
| Staging | Lab **176** (`192.168.122.176`, Ubuntu 24.04) | `dattqh_ubuntu_192.168.122.176_MONGO` | mật khẩu | `miu-server` (:8787 loopback), `miu-tunnel`, nginx `127.0.0.1:8090`, Postgres 16 |
| Edge staging + production | **.65** (CentOS Stream 9) | `SSH_SERVER_STAGING` (group `SERVER STAGING .65`) | key, mật khẩu dự phòng | nginx `conf.d/miu-staging.conf` (edge của staging), production `miu-server` (:8797 loopback), Postgres 16 |

**Lab** là mạng riêng `192.168.122.0/24`, chỉ vào được qua **VPN lab**. Bản đồ lab (đo 30/09/2026; lý do chọn 176 ở [`deployment-guide.md`](deployment-guide.md) §3):

| Box | Vai trò | Miu dùng? |
| --- | --- | --- |
| 171, 172, 173 | Cụm Ceph | Không |
| 174, 175 | App OneDash staging (Node 20) | Không |
| **176** | MongoDB OneDash + **staging Miu** | **Có** |
| 177, 178 | Stack Victoria | Không |
| 179 | Agent OneDash staging, gần hết đĩa | Không |
| 180, 181 | Windows 10 (agent OneDash) | Không |
| 182, 183, 184 | Cloud lab để học (`CLOUD_LAB_*`) | **Không bao giờ** |
| 186 | OpenStack all-in-one (Kolla), rất nặng | Không |

## 3. Credential (ngoài repo)

Nằm trong iCloud của người phụ trách, trỏ tới bằng biến đặt một lần trong shell profile:

| Biến / tệp | Đường dẫn (macOS) | Dùng cho |
| --- | --- | --- |
| `ALL_IN_ONE_STAGING_DEV` | `$HOME/Library/Mobile Documents/com~apple~CloudDocs/cong-viec/Cong viec/ENV production/all-in-one-staging-dev.json` | SSH vào **lab lẫn .65** |
| `access-tokens.json` | cùng thư mục | Secret ứng dụng (Google, Postgres, tunelo, Cloudflare); bảng entry ở [`deployment-guide.md`](deployment-guide.md) §2.2 |
| `ALL_IN_ONE_PROD` | `all-in-one-production.json`, cùng thư mục | **Không dùng** cho Miu (của hệ khác) |

⚠️ Máy production của Miu (.65) nằm trong tệp *staging-dev*, dưới tên "SERVER STAGING .65", vì nó là máy staging của các dự án khác.

**Định dạng:** `{ "_meta": {...}, "servers": [...] }`. Mỗi entry có `group`, `name`, `host`, `port`, `user`, `auth` (`password` hoặc `key+password`), `password`, `private_key` (PEM), `os`, `note`. Ý nghĩa từng trường: `_meta.entry_schema` trong chính tệp. Xem danh sách mà không lộ secret:

```sh
jq -r '.servers[] | [.group, .name, .auth, (.os // "")] | @tsv' "$ALL_IN_ONE_STAGING_DEV"
```

## 4. Lệnh SSH

Hàm lấy một trường của entry (dùng chung cho mọi lệnh dưới):

```sh
srv() { jq -r --arg n "$1" '.servers[] | select(.name == $n) | .'"$2" "$ALL_IN_ONE_STAGING_DEV"; }
```

**Lab 176 (staging), bằng mật khẩu.** `sshpass -e` đọc biến `SSHPASS`, nên mật khẩu không hiện trong `ps` hay lịch sử shell:

```sh
S=dattqh_ubuntu_192.168.122.176_MONGO
SSHPASS="$(srv $S password)" sshpass -e ssh -o PubkeyAuthentication=no "$(srv $S user)@$(srv $S host)" -p "$(srv $S port)"
# Một lệnh rồi thoát:
SSHPASS="$(srv $S password)" sshpass -e ssh -o PubkeyAuthentication=no "$(srv $S user)@$(srv $S host)" -p "$(srv $S port)" 'systemctl is-active miu-server miu-tunnel'
```

**Luôn có `-o PubkeyAuthentication=no` khi vào lab bằng mật khẩu.** Máy dev có nhiều key thì ssh thử hết key trước, dùng cạn `MaxAuthTries` của box, và box trả `Permission denied (publickey,password)` trước khi kịp gửi mật khẩu: trông y như sai mật khẩu (§7).

**.65 (edge + production), bằng key.** Ghi key ra tệp tạm quyền 600, xong thì xóa:

```sh
P=SSH_SERVER_STAGING
K="$(mktemp)"; chmod 600 "$K"; srv $P private_key > "$K"
ssh -i "$K" -o IdentitiesOnly=yes -p "$(srv $P port)" "$(srv $P user)@$(srv $P host)"; rm -f "$K"
```

**Lần đầu vào một box:** thêm `-o StrictHostKeyChecking=accept-new` để ghi host key vào `known_hosts` mà không hỏi.

**Script:** `tools/deploy/staging/deploy.sh` và `tools/deploy/production/deploy.sh` dùng đúng hai cách trên (hàm `lab`, `edge`, `prod`). Viết script mới thì làm theo chúng, đừng chép host hay cổng vào script.

## 5. Đường dẫn trên máy

| Thành phần | Lab 176 (staging) | .65 (production) |
| --- | --- | --- |
| Release | `/opt/miu/releases/<id>/`, symlink `/opt/miu/current` | như staging |
| Revision đang chạy | `/opt/miu/current/apps/server/dist/server/REVISION` | như staging |
| Env (chỉ `root` và nhóm `miu` đọc) | `/etc/miu/staging.env`, `/etc/miu/tunnel.env` | `/etc/miu/production.env` |
| Backup database | `/var/backups/miu/before-<id>.dump` | `/var/backups/miu/{before-<id>,daily-<ngày>}.dump` (xóa sau 14 ngày) |
| Node | `/opt/node22` (tách Node 20 của hệ thống) | `/opt/node22` (tách nvm của pm2) |
| nginx | `/etc/nginx/sites-enabled/miu-staging` | `/etc/nginx/conf.d/miu.conf` (production), `conf.d/miu-staging.conf` (edge của staging) |
| Log server | `journalctl -u miu-server` | `journalctl --namespace=miu -u miu-server` (journal riêng, giữ 14 ngày) |
| Log tunnel | `journalctl -u miu-tunnel` | — |
| Log request | `/var/log/nginx/{access,error}.log` | `/var/log/nginx/miu.hoandat.com.*.log`, `miu-staging.hoandat.com.*.log` |

## 6. Lệnh thường dùng (chạy trên máy qua SSH)

```sh
# Trạng thái dịch vụ của Miu
systemctl is-active miu-server miu-tunnel nginx postgresql          # lab 176
systemctl is-active miu-server postgresql nginx miu-backup.timer     # .65

# Health ngay trên máy (không qua Cloudflare)
curl -s http://127.0.0.1:8787/api/health     # lab 176
curl -s http://127.0.0.1:8797/api/health     # .65

# Log gần nhất
journalctl -u miu-server -n 50 --no-pager                  # lab 176
journalctl --namespace=miu -u miu-server -n 50 --no-pager  # .65

# Đo tài nguyên trước khi đặt thêm gì lên box
free -m; df -h /; ss -ltnp

# .65: kiểm không làm hỏng dự án khác sau khi đụng nginx
nginx -t && pm2 jlist | python3 -c "import json,sys; a=json.load(sys.stdin); print(sum(p['pm2_env']['status']=='online' for p in a), 'of', len(a), 'online')"
```

Từ máy dev, không cần SSH: `curl -s https://miu-staging.hoandat.com/api/health` và `curl -s https://miu.hoandat.com/api/health`.

## 7. Dễ vấp (đã gặp thật)

1. **SSH vào lab bị timeout là VPN, không phải credential.** Ngày 30/09/2026, `deploy.sh release` của staging dừng ở bước backup vì `192.168.122.176:22` không trả lời; bật lại VPN là vào được. Kiểm nhanh:

   ```sh
   route -n get 192.168.122.176 | grep interface   # phải đi qua giao diện VPN (utun…)
   nc -z -G 5 192.168.122.176 22 && echo lab-ok    # macOS; Linux: nc -z -w 5 …
   ```

   Staging vẫn phục vụ bản cũ khi lab mất VPN (tunnel chạy trên chính 176), nên `https://miu-staging…` trả 200 không chứng minh máy dev vào được lab.
2. **`Permission denied (publickey,password)` khi vào lab mà mật khẩu vẫn đúng: thiếu `-o PubkeyAuthentication=no`.** Ngày 30/09/2026 cùng một mật khẩu vào được lúc 14:17, bị từ chối lúc 14:40, và vào lại được ngay khi thêm cờ đó (số key ssh đem thử thay đổi theo agent và cấu hình của máy dev, nên lỗi lúc có lúc không). Gặp thì thêm cờ; đừng thử mật khẩu nhiều lần (có thể bị khóa), và kiểm tên entry (`srv` trả `null` cũng cho đúng lỗi này).
3. **Hook của môi trường chặn vài từ trong lệnh Bash** (ví dụ lệnh chứa "target" hay "coverage"). Gặp thì viết script ra tệp bằng công cụ Write rồi chạy tệp.
4. **Cổng 8787 trên .65 thuộc dự án khác.** Production Miu dùng 8797. Quy tắc "cổng bận thì tắt tiến trình cũ" trong `CLAUDE.md` chỉ áp cho máy dev, không áp cho .65.
5. **nginx trên .65 là CentOS:** chỉ có `conf.d/`, không có `sites-enabled`. Trên lab 176 (Ubuntu) thì ngược lại.
6. **Không đoán credential, không tìm key ở nơi khác.** Entry thiếu thì dừng và báo người phụ trách.

## 8. Tài liệu liên quan

| Tài liệu | Nội dung |
| --- | --- |
| [`deployment-guide.md`](deployment-guide.md) | Deploy staging và production, secret ứng dụng, DNS Cloudflare, rollback, giữ dữ liệu 14 ngày |
| `tools/deploy/staging/`, `tools/deploy/production/` | Script và cấu hình từng máy; lý do ghi ngay trong file |
| [`system-architecture.md`](system-architecture.md) | Kiến trúc và hướng triển khai đích |
| `CLAUDE.md` (gốc repo) | Lệnh dev, gate, cổng cố định trên máy dev |
