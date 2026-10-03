# Triển khai — credential, máy chủ, staging và production

Điểm vào để deploy Miu World; SSH vào máy và credential SSH ở [`STAG-DEV-README.md`](STAG-DEV-README.md). Hướng triển khai đích (static + CDN cho client, server tự host) nằm ở [`system-architecture.md`](system-architecture.md).

**Trạng thái:** staging đang chạy tại `https://miu-staging.hoandat.com` (§5). Production chạy tại `https://miu.hoandat.com` trên .65 từ 30/09/2026 (§7); đăng nhập Google chạy được với test user, chưa xác minh ứng dụng (§7, việc còn lại).

| Môi trường | Chạy ở đâu | Domain |
| --- | --- | --- |
| Dev | Máy dev, mở ra ngoài bằng `tunelo http <cổng>:miu` (cách chạy trong `CLAUDE.md`, mục duyệt qua tunnel) | `miu.tunnel.inetdev.io.vn` |
| Staging | Lab 176, qua edge .65 | `miu-staging.hoandat.com` |
| Production | .65 | `miu.hoandat.com` |

## 1. Quyền hạn

- **Staging:** agent được tự deploy, restart và đọc log, nhưng chỉ trong thư mục và tiến trình của Miu. Không sửa, dừng hay nâng cấp dịch vụ của dự án khác chạy trên cùng máy.
- **Production:** hỏi người trước **mỗi** lần deploy, migration hay restart. Lý do: đây là nơi có dữ liệu thật của trẻ em, và máy này dùng chung với nhiều dự án khác.
- **Không bao giờ** commit file credential, file env thật hay private key; không in giá trị secret ra hội thoại, log, report hay commit.

## 2. Credential

Mọi credential nằm **ngoài repo**, trong iCloud của người phụ trách. Tệp nào, biến nào, cách SSH vào lab 176 và .65 mà không in secret: **[`STAG-DEV-README.md`](STAG-DEV-README.md)** (§3, §4). Không `cat`, không `source`, không chép bất kỳ phần nào vào repo.

### 2.2 Secret ứng dụng (`access-tokens.json`)

`access-tokens.json` là **bản gốc** của secret. Trên máy chủ chỉ có bản sao do `deploy.sh setup` ghi ra (§5). Muốn đổi secret thì sửa trong tệp này, rồi chạy lại `setup`.

| Entry (chọn bằng) | Dùng cho | Trên máy chủ |
| --- | --- | --- |
| `service == "accounts.google.com"`, `used_by == "miu-world"` | Google OAuth client của Miu (cả dev lẫn staging) | `GOOGLE_*` trong `/etc/miu/staging.env` (176) |
| `service == "postgresql"`, `used_by` bắt đầu bằng `miu-world staging` | Role và database `miu` trên Postgres của 176 | `DATABASE_URL` trong `/etc/miu/staging.env` |
| `account == "miu-staging-176"` (tunelo) | Token cho tunnel `miu-staging` | `TUNELO_KEY` trong `/etc/miu/tunnel.env` |
| `service == "api.cloudflare.com"` | DNS zone `hoandat.com` (§4). Đây là token toàn quyền của cả account, nên chỉ dùng cho zone này | Không lưu trên máy chủ |

Thêm một entry mới thì làm theo `_meta.entry_schema`. Trước khi sửa, sao lưu tệp thành `access-tokens.backup-<yyyymmdd>.json` cùng thư mục. Token tunelo được cấp bằng `create-access-token.mjs` trong `/var/www/tunelo` trên .65; token chỉ hiện một lần, nên lưu thẳng vào tệp này.

## 3. Máy chủ

| | Staging | Production |
| --- | --- | --- |
| Máy | Lab **176** (entry `dattqh_ubuntu_192.168.122.176_MONGO`) | **.65** (entry `SSH_SERVER_STAGING`, group `SERVER STAGING .65`) |
| Server | systemd `miu-server`, cổng loopback 8787 | systemd `miu-server`, cổng loopback **8797** (8787 của dự án khác), Node 22 ở `/opt/node22` (tách nvm của pm2) |
| Database | Postgres 16 trên 176 | Postgres 16 trên .65, chỉ loopback; backup hằng ngày 03:15 (`miu-backup.timer`, giữ 14 bản `daily-*.dump`) + trước mỗi release; mọi bản dump quá 14 ngày bị xóa |
| Hệ điều hành | Ubuntu 24.04 | CentOS Stream 9 |
| Đường vào | Cloudflare → nginx trên .65 → tunelo → nginx trên 176 → server | Cloudflare → nginx trên .65 (`conf.d/miu.conf`, phục vụ web tĩnh, proxy `/api/`) → server ở loopback của .65 |
| Dùng chung với | MongoDB và các agent của OneDash staging | Nhiều dự án khác; xem bằng `pm2 jlist` và `ls /etc/nginx/conf.d` |

**Vì sao staging đặt ở 176** (đo ngày 30/09/2026):

- 182, 183, 184, 185 dành cho việc học, không được dùng.
- 171–173 chạy cụm Ceph; 172 và 173 còn ít đĩa.
- 174 và 175 chạy app OneDash staging trên Node 20.
- 177 và 178 chạy stack Victoria. 179 đã dùng gần hết đĩa. 186 là OpenStack all-in-one, rất nặng. 180 và 181 chạy Windows.
- 176 chỉ chạy MongoDB, còn nhiều RAM và đĩa trống nhất, và không có app Node nào.

Muốn đổi máy staging thì dựa trên số đo mới (`free -m`, `df -h /`, `ss -ltn`), sửa biến `LAB` trong `tools/deploy/staging/deploy.sh`, rồi chạy `setup` trên máy mới.

## 4. DNS và đường vào từ internet

Mô hình giống OneDash staging (`cloudpanel-dev.inet.vn` → .65 → tunnel → lab 174).

**DNS** nằm ở zone `hoandat.com` trên Cloudflare. Hai domain `miu` và `miu-staging` là bản ghi `A` **proxied**, trỏ về host của entry `SSH_SERVER_STAGING`; zone đặt SSL mode `full`. Máy dev không có CLI DNS riêng (`wrangler` không quản lý bản ghi DNS), nên gọi thẳng Cloudflare API. Token đi qua stdin, không nằm trong đối số của lệnh:

```sh
TOK="$(jq -r '.tokens[] | select(.service == "api.cloudflare.com") | .token.api_token' "$(dirname "$ALL_IN_ONE_STAGING_DEV")/access-tokens.json")"
cf() { printf 'Authorization: Bearer %s\nContent-Type: application/json\n' "$TOK" | curl -sS -H @- "$@"; }
API=https://api.cloudflare.com/client/v4
ZID="$(cf "$API/zones?name=hoandat.com" | jq -r '.result[0].id')"
cf "$API/zones/$ZID/dns_records?per_page=100" | jq -r '.result[] | [.type, .name, .content, .proxied] | @tsv'   # xem
# Tạo: gửi body JSON qua `--data` ở một đối số riêng (zsh không tách `${x:+--data "$x"}` thành hai từ).
cf -X POST --data "$(jq -nc --arg n miu-x.hoandat.com --arg ip "<host .65>" '{type:"A", name:$n, content:$ip, proxied:true, ttl:1}')" "$API/zones/$ZID/dns_records"
# Xoá cache một URL
cf -X POST --data '{"files":["https://miu-staging.hoandat.com/<đường-dẫn>"]}' "$API/zones/$ZID/purge_cache"
```

Kiểm tra: `dig +short A <domain> @1.1.1.1` phải trả IP của Cloudflare. Domain chưa có server block trên .65 thì nginx mặc định trả `403`.

**Cấu hình từng chặng** nằm trong `tools/deploy/staging/`; lý do của từng dòng ghi ngay trong file:

- `nginx-edge.conf` → `/etc/nginx/conf.d/miu-staging.conf` trên .65. Tệp này chép theo server block `cloudpanel-dev.inet.vn` trong `server-tools.conf`: chứng chỉ gốc sẵn có, và `proxy_pass` tới tunelo server ở `:3001` với `Host: miu-staging.tunnel.inetdev.io.vn`. Vì vậy staging cũng mở được ở `https://miu-staging.tunnel.inetdev.io.vn`.
- `miu-tunnel.service` trên 176: tunelo client chạy `8090:miu-staging`.
- `nginx-lab.conf` trên 176: nghe `127.0.0.1:8090`, phục vụ `apps/web/dist` và proxy `/api/` tới server ở `127.0.0.1:8787`.
- `miu-server.service` trên 176: chạy bundle server bằng Node 22 ở `/opt/node22`, tách khỏi Node 20 của hệ thống.

**IP thật của khách** đi qua cả chuỗi. .65 khôi phục IP từ Cloudflare cho mọi site (`set_real_ip_from` trong `hoc-cloud.conf`, ở http context) và gửi đi bằng `X-Real-IP`. nginx trên 176 chỉ tin header đó khi nó đến từ loopback, rồi đưa đúng một địa chỉ đó cho server. Đã kiểm: log nginx trên 176 ghi IP public của máy gọi, không phải `127.0.0.1`.

**Giới hạn đi kèm:**

- Cloudflare cắt request tới origin sau 100 giây.
- Tunelo giới hạn body 50 MB và timeout request 30 giây (chỉ áp cho staging).

## 5. Deploy staging

Lệnh chạy từ gốc repo trên máy dev. Script đọc credential theo §2 và không in giá trị nào.

```sh
tools/deploy/staging/deploy.sh setup     # máy mới, đổi unit/nginx, đổi secret. Chạy lại được an toàn.
tools/deploy/staging/deploy.sh fonts     # font chữ mẫu của phiếu viết (ngoài git) lên /opt/miu/fonts của 176
tools/deploy/staging/deploy.sh release   # mỗi lần deploy
```

**Trước khi `release`:** chạy đủ gate trong `CLAUDE.md`. Script từ chối chạy khi working tree còn thay đổi chưa commit, vì mã release lấy từ commit. Khi cần deploy một cây đã export (`git archive`) thay vì checkout, đặt `MIU_RELEASE_REV=<nhãn>` và chạy từ gốc cây đó.

**`release` làm gì** (chi tiết ở `deploy.sh`):

1. Build web và bundle server (`pnpm --filter @miu/server bundle`, cấu hình ở `apps/server/bundle.ts`).
2. Backup database ra `/var/backups/miu/before-<id>.dump`.
3. Tải lên `/opt/miu/releases/<id>/` và chuyển symlink `/opt/miu/current`.
4. Restart `miu-server` và đợi `/api/health`. Không lên thì tự quay về release trước và in log.
5. Giữ 5 release mới nhất, rồi gọi `https://miu-staging.hoandat.com/api/health` từ ngoài vào.

**Nghiệm thu:**

- `curl -s https://miu-staging.hoandat.com/api/health` trả `{"status":"ok"}`.
- Revision đang chạy nằm ở `/opt/miu/current/apps/server/dist/server/REVISION` trên 176.
- File dưới `/game-assets/` giữ đường dẫn qua các release, và Cloudflare cùng trình duyệt giữ chúng tới 4 giờ (`s-maxage=14400` từ nginx lab, Browser Cache TTL của zone; tunelo không cache chúng, xem §6). Vì vậy web gắn phiên bản nội dung vào URL (`?v=` + 12 ký tự đầu sha256 trong manifest; `apps/web/src/asset-versions.ts`): file đổi thì URL đổi, không cần xoá cache. Bản build gắn sẵn phiên bản của `manifest.json` và của các file UI hiển thị. Sau release vẫn so sha256 của bản trên staging với file local. Xoá cache theo §4 chỉ còn dùng cho URL không phiên bản (ví dụ khách còn mở trang cũ).

**Log:**

| Cần xem | Ở đâu |
| --- | --- |
| Server | `journalctl -u miu-server` (176) |
| Tunnel | `journalctl -u miu-tunnel` (176) |
| Request vào web/API | `/var/log/nginx/access.log` và `error.log` (176) |
| Request ở edge | `/var/log/nginx/miu-staging.hoandat.com.{access,error}.log` (.65) |

**Rollback** (trên 176):

- **Chỉ quay code:** `ln -sfn /opt/miu/releases/<id-trước> /opt/miu/current && systemctl restart miu-server`.
- **Migration làm hỏng dữ liệu:** dừng `miu-server`, rồi chạy `sudo -u postgres dropdb miu && sudo -u postgres createdb -O miu miu && sudo -u postgres pg_restore --no-owner --role=miu -d miu /var/backups/miu/before-<id>.dump`. Sau đó quay code như trên. Lệnh `pg_restore` này đã chạy thử vào một database tạm.

## 6. Điều đã đo được và dễ vấp

- **Không có `NODE_ENV=staging`.** Staging chạy `production`: có Postgres thật, Google OAuth thật và đăng nhập bằng mật khẩu bị tắt. Biến bắt buộc nằm ở `loadConfig` trong `apps/server/src/config.ts`; thiếu biến nào thì server dừng ngay lúc khởi động.
- **Migration tự chạy khi server mở Postgres** (`openPostgres` trong `apps/server/src/db/client.ts`). Vì vậy `release` luôn backup trước khi restart.
- **Bundle server phải nằm đúng độ sâu.** Đường dẫn tới migration và `content/` tính từ vị trí file. Lý do nằm trong comment của `apps/server/bundle.ts`; đừng đổi `outfile` mà không đổi hai điểm neo đó.
- **Google OAuth:** `GOOGLE_REDIRECT_URI` phải khớp đúng một URI đã đăng ký trên Google client, dạng `https://<domain>/api/auth/google/callback`. Consent screen đang ở chế độ Testing, nên chỉ test user mới đăng nhập được.
- **tunelo dưới systemd:** phải truyền `TUNELO_KEY` qua env, vì tunelo không đọc `~/.tunelo/config.json` khi chạy như dịch vụ. Nó cũng cần `$HOME` ghi được để lưu run record. Cả hai đã cấu hình trong `miu-tunnel.service`.
- **Cloudflare cache tệp tĩnh ở edge khoảng 4 giờ**, kể cả phản hồi sai. Tệp `.js` không tồn tại mà từng trả 200 sẽ bị giữ lại cho tới khi purge (§4). HTML không bị cache, nên sau deploy `index.html` mới trỏ tới chunk mới. Một 404 cũng bị giữ (đã gặp 01/10/2026: chunk của bản build mới bị hỏi trước khi release chuyển xong), nên nginx lab trả 404 của `/assets/` và `/game-assets/` kèm `Cache-Control: no-store`.
- **tunelo server trên .65 cũng có cache riêng** (Redis, khoá theo subdomain, đường dẫn và `Accept-Encoding`; header `x-tunelo-cache`). Nó cache file tĩnh 24 giờ khi tên file trông giống có hash, ví dụ `forest-ch1-tree.png`, kể cả khi origin không gửi `Cache-Control`. Purge Cloudflare không xoá được cache này: Cloudflare tải lại và lại nhận bản cũ. Đã đo ngày 01/10/2026: bản cũ chỉ xuất hiện khi request có `gzip, br`, đúng header Cloudflare luôn gửi.
  - Vì vậy `nginx-lab.conf` gửi `Cache-Control: max-age=0, s-maxage=14400` cho `/game-assets/`. tunelo bỏ qua file có `max-age=0`; Cloudflare vẫn giữ ở edge 4 giờ theo `s-maxage`, và trình duyệt vẫn nhận `max-age=14400` theo Browser Cache TTL của zone.
  - tunelo chỉ xoá cache của subdomain khi tunnel đăng ký lại từ đầu. Nối lại trong 5 giây grace thì cache được giữ, nên `setup` dừng tunnel, chờ 7 giây rồi mới chạy lại.
  - Nghi một tầng giữ bản cũ thì so sha256 lần lượt ở nginx lab (`127.0.0.1:8090`), tunnel (`https://miu-staging.tunnel.inetdev.io.vn`, gửi kèm `-H 'Accept-Encoding: gzip, br'`), rồi Cloudflare.
- **Cổng 8787 trên .65 đã có dịch vụ khác giữ** (loopback). Production phải đặt `PORT` khác; kiểm bằng `ss -ltnp`. Quy tắc "cổng cố định 8787" trong `CLAUDE.md` chỉ áp cho máy dev.
- **Nginx trên .65 (CentOS) đọc cấu hình từ `/etc/nginx/conf.d/`**, không có `sites-enabled`. `setup` chỉ ghi tệp `miu-staging.conf` và gỡ nó ra nếu `nginx -t` báo lỗi.
- **Server chỉ nghe trên `127.0.0.1`** và chỉ tin `X-Forwarded-For` từ loopback (`app.set('trust proxy', …)` trong `apps/server/src/app.ts`). Reverse proxy ngay trước server vì vậy phải chạy trên cùng máy với server.

## 7. Production

Chạy tại `https://miu.hoandat.com` trên .65 (dựng ngày 30/09/2026). Cấu hình từng phần nằm trong `tools/deploy/production/`, lý do ghi ngay trong file: `setup-prod-host.sh` (Postgres 16 từ AppStream, chỉ loopback, `pg_hba` cho role `miu` bằng scram; Node 22 ở `/opt`; user `miu`; unit và timer backup; journal namespace `miu`; server block nginx chỉ bật khi `nginx -t` sạch), `miu-server.service`, `miu-backup.{service,timer}`, `journald-miu.conf`, `nginx-prod.conf`.

**Giữ dữ liệu tối đa 14 ngày** (trang `/privacy` hứa điều này; đổi cấu hình thì sửa cả trang):

| Nơi | Cách giữ 14 ngày |
|---|---|
| Bản sao lưu `/var/backups/miu/` | `miu-backup.service` giữ 14 bản `daily-*.dump` và xóa mọi `*.dump` (cả `before-<id>`) quá 14 ngày |
| Log server | journal riêng `LogNamespace=miu`, `/etc/systemd/journald@miu.conf`: `MaxRetentionSec=14day`, mỗi file một ngày |
| Log nginx của `miu.hoandat.com` | quy tắc có sẵn của host `/etc/logrotate.d/nginx` (hằng ngày, giữ 10). `setup` cảnh báo nếu quy tắc đó đổi |

**Mỗi lần deploy, migration hay restart ở production: hỏi người trước (§1).**

```sh
tools/deploy/production/deploy.sh setup     # máy mới, đổi unit/nginx/secret. Chạy lại được an toàn.
tools/deploy/production/deploy.sh fonts     # tải font chữ mẫu của phiếu viết (ngoài git) lên /opt/miu/fonts
tools/deploy/production/deploy.sh timetable # tải thời khóa biểu mặc định (ngoài git) lên /opt/miu/config; release sau đó áp dụng
tools/deploy/production/deploy.sh release   # build, security:dist, backup DB, upload, switch, health, tự rollback
```

- Bản build: production dùng `pnpm --filter @miu/web build:release` (`vite build --mode release`): chỉ có game, không có `review.html`, `preview.html` hay ảnh review (chỉ giữ ảnh chân dung nhân vật mà UI dùng), khoảng 8,6 MB thay vì 19 MB. `release` dừng nếu `dist` vẫn còn trang review. Staging, E2E và bản review chạy local dùng `build` thường, vẫn có trang review cho người duyệt.

- Secret: entry `service == "postgresql"`, `used_by` bắt đầu bằng `miu-world production` trong `access-tokens.json` (mật khẩu role `miu`); Google client dùng chung entry của staging. `setup` ghi `/etc/miu/production.env` (640 `root:miu`).
- Working tree phải sạch; nếu chỉ còn file chưa track không thuộc bản build thì đặt `MIU_RELEASE_REV=$(git rev-parse --short HEAD)` sau khi kiểm `git diff --quiet HEAD`.
- Nghiệm thu: `curl -s https://miu.hoandat.com/api/health` trả `{"status":"ok"}`; revision đang chạy ở `/opt/miu/current/apps/server/dist/server/REVISION` trên .65.
- Log: `journalctl --namespace=miu -u miu-server` (.65; không có `--namespace` thì không thấy); request ở `/var/log/nginx/miu.hoandat.com.{access,error}.log`.
- Rollback: như staging (§5) nhưng trên .65; backup ở `/var/backups/miu/` (`before-<id>.dump`, `daily-<ngày>.dump`).
- Thời khóa biểu mặc định (lớp của bé nhà người sở hữu: có tên trường, tên và điện thoại cô giáo) không nằm trong git. Mọi hồ sơ chưa tự lưu thời khóa biểu thấy bản này (`TIMETABLE_DEFAULT_FILE`); không đặt biến thì là mẫu trống. Nguồn ở iCloud (`timetable/timetable-default.json`, kê trong `tools/private/private-files.json`), `pnpm private:sync` chép vào `.data/private/`; `pnpm dev` tự dùng nếu có. Trên .65 tệp nằm ở `/opt/miu/config/timetable-default.json` (`root:miu`, 640); `deploy.sh timetable` tải lên qua ssh và thêm dòng biến vào `/etc/miu/production.env` nếu chưa có. Đổi lịch mặc định: sửa tệp trong iCloud, cập nhật sha256 trong `private-files.json`, chạy `timetable` rồi `release`.
- Font chữ mẫu tiểu học HP001 của phiếu viết (`chu-mau-tieu-hoc.woff2`, `chu-mau-tieu-hoc-dam.woff2`) không có giấy phép mở nên không nằm trong git. Trên .65 font nằm ở `/opt/miu/fonts` (ngoài `/opt/miu/current`, thư mục đó thay mỗi lần release; `root:miu`, 750). `setup` tạo thư mục và ghi `HANDWRITING_FONT_DIR=/opt/miu/fonts` vào `/etc/miu/production.env`. `tools/deploy/production/deploy.sh fonts` tải hai tệp lên qua ssh, không qua git; nguồn là `$MIU_FONT_DIR`, mặc định `.data/fonts/` của checkout đang chạy lệnh. Thiếu font thì phiếu vẫn in nhưng không có chữ mẫu. Máy dev lấy hai tệp (cùng PDF SGK gốc) từ iCloud bằng `pnpm private:sync`, vào `.data/fonts/`.

**Việc còn lại (của người):**

1. Redirect URI `https://miu.hoandat.com/api/auth/google/callback` đã thêm (30/09/2026). Consent screen còn ở chế độ Testing nên chỉ test user đăng nhập được. Để mở cho mọi người: điền homepage `https://miu.hoandat.com` và privacy policy `https://miu.hoandat.com/privacy`, xác minh `hoandat.com` trong Google Search Console, rồi chuyển Publishing status sang "In production" (scope chỉ `openid email` nên không cần duyệt scope nhạy cảm).
2. Lời đồng ý `v1` và `/privacy` do dự án tự soạn, chưa qua luật sư (trang ghi rõ). Nghị định 13/2023 Điều 20 yêu cầu có cả đồng ý của trẻ từ 7 tuổi: hiện lời đồng ý nhắc phụ huynh hỏi bé, chưa có bước bé tự xác nhận.
3. Quyết định giữ hay bỏ công tắc dev (`?spawnAt`, `?outfit`, `?stats`).
