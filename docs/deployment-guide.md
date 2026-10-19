# Triển khai — credential, máy chủ và production

Điểm vào để deploy Miu World; SSH vào máy và credential SSH ở [`STAG-DEV-README.md`](STAG-DEV-README.md). Hướng triển khai đích (static + CDN cho client, server tự host) nằm ở [`system-architecture.md`](system-architecture.md).

**Trạng thái:** production chạy tại `https://miu.hoandat.com` trên .65 từ 30/09/2026 và là môi trường deploy duy nhất; đăng nhập Google mở cho mọi tài khoản từ 12/10/2026 (consent screen ở "In production", §6).

**Staging đã gỡ ngày 12/10/2026** theo yêu cầu người sở hữu: dịch vụ, database, cấu hình trên lab, tunnel, edge nginx trên .65, bản ghi DNS `miu-staging` cùng mọi dữ liệu và bản sao lưu của staging đều đã xóa, không còn gì để khôi phục. Bản duyệt trước khi deploy nay là bản chạy local hoặc qua tunnel dev, kèm ảnh màn hình đã duyệt (§5).

| Môi trường | Chạy ở đâu | Domain |
| --- | --- | --- |
| Dev | Máy dev, mở ra ngoài bằng `tunelo http <cổng>:miu` (cách chạy trong `CLAUDE.md`, mục duyệt qua tunnel) | `miu.tunnel.hoandat.com` |
| Production | .65 | `miu.hoandat.com` |

## 1. Quyền hạn

- **Production:** hỏi người trước **mỗi** lần deploy, migration hay restart. Lý do: đây là nơi có dữ liệu thật của trẻ em, và máy này dùng chung với nhiều dự án khác. Đọc trạng thái thì được.
- Chỉ đụng thư mục và tiến trình của Miu; không sửa, dừng hay nâng cấp dịch vụ của dự án khác chạy trên cùng máy.
- **Không bao giờ** commit file credential, file env thật hay private key; không in giá trị secret ra hội thoại, log, report hay commit.

## 2. Credential

Mọi credential nằm **ngoài repo**, trong iCloud của người phụ trách. Tệp nào, biến nào, cách SSH vào .65 mà không in secret: **[`STAG-DEV-README.md`](STAG-DEV-README.md)** (§3, §4). Không `cat`, không `source`, không chép bất kỳ phần nào vào repo.

### 2.2 Secret ứng dụng (`access-tokens.json`)

`access-tokens.json` là **bản gốc** của secret. Trên máy chủ chỉ có bản sao do `deploy.sh setup` ghi ra (§5). Muốn đổi secret thì sửa trong tệp này, rồi chạy lại `setup`.

| Entry (chọn bằng) | Dùng cho | Trên máy chủ |
| --- | --- | --- |
| `service == "accounts.google.com"`, `used_by == "miu-world"` | Google OAuth client của Miu (cả dev lẫn production) | `GOOGLE_*` trong `/etc/miu/production.env` (.65) |
| `service == "postgresql"`, `used_by` bắt đầu bằng `miu-world production` | Mật khẩu role `miu` trên Postgres của .65 | `DATABASE_URL` trong `/etc/miu/production.env` |
| `service == "api.cloudflare.com"` | DNS zone `hoandat.com` (§4). Đây là token toàn quyền của cả account, nên chỉ dùng cho zone này | Không lưu trên máy chủ |
| `service == "rtc.live.cloudflare.com (TURN)"` (`token.key_id`, `token.api_token`) | Khóa TURN `miu-world-voice` (Cloudflare Realtime): server xin credential ngắn hạn cho voice chat (`POST https://rtc.live.cloudflare.com/v1/turn/keys/<key_id>/credentials/generate-ice-servers`, Bearer token, `{"ttl": 7200}`) và trao cho người chơi đã đăng nhập (`GET /api/voice/ice-servers`); token này chỉ xin được credential TURN, không quản lý được gì khác | `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN` trong `/etc/miu/production.env` (.65) |
| `service == "analytics.google.com"`, `used_by == "miu-world production"` (`token.measurement_id`, `token.api_secret`) | Property GA4 "Miu World" và secret Measurement Protocol: server gửi số liệu sử dụng ẩn danh (`POST https://www.google-analytics.com/mp/collect`, secret trong query, nên log lỗi chỉ ghi mã trạng thái); trình duyệt không gọi Google | `GA4_MEASUREMENT_ID`, `GA4_API_SECRET` trong `/etc/miu/production.env` (.65), ghi bằng `deploy.sh analytics`. Chỉ production đặt, để số liệu dev không lẫn vào |
| `service == "youtube.googleapis.com"`, `used_by == "miu-world marketing"` (`token.client_id`, `token.client_secret`, `token.refresh_token`) | Đăng clip hằng tuần lên kênh YouTube Miu World (OAuth refresh token cho `youtube.upload`); chỉ máy của người sở hữu đọc, lúc chạy, qua `MIU_MARKETING_TOKEN_FILE` (`docs/marketing-channels.md`) | Không lưu trên máy chủ |
| `service == "graph.facebook.com"`, `used_by == "miu-world marketing"` (`token.page_id`, `token.page_access_token`) | Đăng clip lên Fanpage Miu World bằng Graph API: chỉ Page id này và chỉ token của Trang (không bao giờ token người dùng hay trang cá nhân); đọc như entry YouTube | Không lưu trên máy chủ |

Thêm một entry mới thì làm theo `_meta.entry_schema`. Trước khi sửa, sao lưu tệp thành `access-tokens.backup-<yyyymmdd>.json` cùng thư mục. Token tunelo được cấp bằng `create-access-token.mjs` trong `/var/www/tunelo` trên .65; token chỉ hiện một lần, nên lưu thẳng vào tệp này.

## 3. Máy chủ

| | Production |
| --- | --- |
| Máy | **.65** (entry `SSH_SERVER_STAGING`, group `SERVER STAGING .65`) |
| Server | systemd `miu-server`, cổng loopback **8797** (8787 của dự án khác), Node 22 ở `/opt/node22` (tách nvm của pm2) |
| Database | Postgres 16 trên .65, chỉ loopback; backup hằng ngày 03:15 (`miu-backup.timer`, giữ 14 bản `daily-*.dump`) + trước mỗi release; mọi bản dump quá 14 ngày bị xóa; riêng dữ liệu học của bạn máy (`bot_world_memories`, `bot_skills`) có thêm bản `bots/bots-*.dump` giữ 90 ngày |
| Hệ điều hành | CentOS Stream 9 |
| Đường vào | Cloudflare → nginx trên .65 (`conf.d/miu.conf`, phục vụ web tĩnh, proxy `/api/`) → server ở loopback của .65 |
| Dùng chung với | Nhiều dự án khác; xem bằng `pm2 jlist` và `ls /etc/nginx/conf.d` |

Cấu hình từng phần nằm trong `tools/deploy/production/`, lý do ghi ngay trong file: `setup-prod-host.sh` (Postgres 16 từ AppStream, chỉ loopback, `pg_hba` cho role `miu` bằng scram; Node 22 ở `/opt`; user `miu`; unit và timer backup; journal namespace `miu`; server block nginx chỉ bật khi `nginx -t` sạch), `miu-server.service`, `miu-backup.{service,timer}`, `journald-miu.conf`, `nginx-prod.conf`.

## 4. DNS và đường vào từ internet

**DNS** nằm ở zone `hoandat.com` trên Cloudflare. Domain `miu` là bản ghi `A` **proxied**, trỏ về host của entry `SSH_SERVER_STAGING`; zone đặt SSL mode `full`. Máy dev không có CLI DNS riêng (`wrangler` không quản lý bản ghi DNS), nên gọi thẳng Cloudflare API. Token đi qua stdin, không nằm trong đối số của lệnh:

```sh
TOK="$(jq -r '.tokens[] | select(.service == "api.cloudflare.com") | .token.api_token' "$(dirname "$ALL_IN_ONE_STAGING_DEV")/access-tokens.json")"
cf() { printf 'Authorization: Bearer %s\nContent-Type: application/json\n' "$TOK" | curl -sS -H @- "$@"; }
API=https://api.cloudflare.com/client/v4
ZID="$(cf "$API/zones?name=hoandat.com" | jq -r '.result[0].id')"
cf "$API/zones/$ZID/dns_records?per_page=100" | jq -r '.result[] | [.type, .name, .content, .proxied] | @tsv'   # xem
# Tạo: gửi body JSON qua `--data` ở một đối số riêng (zsh không tách `${x:+--data "$x"}` thành hai từ).
cf -X POST --data "$(jq -nc --arg n miu-x.hoandat.com --arg ip "<host .65>" '{type:"A", name:$n, content:$ip, proxied:true, ttl:1}')" "$API/zones/$ZID/dns_records"
# Xoá cache một URL
cf -X POST --data '{"files":["https://miu.hoandat.com/<đường-dẫn>"]}' "$API/zones/$ZID/purge_cache"
```

Kiểm tra: `dig +short A <domain> @1.1.1.1` phải trả IP của Cloudflare. Domain chưa có server block trên .65 thì nginx mặc định trả `403`.

**IP thật của khách:** .65 khôi phục IP từ Cloudflare cho mọi site (`set_real_ip_from` trong `hoc-cloud.conf`, ở http context), nên `nginx-prod.conf` gửi đúng địa chỉ đó cho server qua `X-Forwarded-For`; server chỉ tin header này từ loopback (§6).

**Giới hạn đi kèm:** Cloudflare cắt request tới origin sau 100 giây; `nginx-prod.conf` giới hạn body 1 MB.

## 5. Deploy

Lệnh chạy từ gốc repo trên máy dev. Script đọc credential theo §2 và không in giá trị nào. **Mỗi lần deploy, migration hay restart ở production: hỏi người trước (§1).**

```sh
tools/deploy/production/deploy.sh setup     # máy mới, đổi unit/nginx/secret. Chạy lại được an toàn.
tools/deploy/production/deploy.sh fonts     # tải font chữ mẫu của phiếu viết (ngoài git) lên /opt/miu/fonts
tools/deploy/production/deploy.sh timetable # tải thời khóa biểu mặc định (ngoài git) lên /opt/miu/config; release sau đó áp dụng
tools/deploy/production/deploy.sh turn      # ghi (hoặc thay) hai dòng CF_TURN_* của khóa TURN vào /etc/miu/production.env; release sau đó áp dụng
tools/deploy/production/deploy.sh analytics # ghi (hoặc thay) hai dòng GA4_* vào /etc/miu/production.env; CHỈ sau release có trang /privacy và lời đồng ý v4; restart để bắt đầu gửi
tools/deploy/production/deploy.sh gate      # chỉ kiểm cổng release, không chạm máy chủ
tools/deploy/production/deploy.sh release   # cổng release, build, security:dist, backup DB, upload, switch, health, tự rollback
```

**Thứ tự một lần deploy:**

1. Gate 5 lệnh trong `CLAUDE.md`, build web; commit; push; CI của commit đó xanh.
2. Chụp các màn chính từ cây sạch của commit đó và cho agent duyệt theo [`screen-review.md`](screen-review.md); phát hiện `block` thì sửa và quay lại bước 1.
3. Commit ảnh, `review.json`, manifest (`chore(review): screens before release`), push.
4. `deploy.sh gate` phải in "được", rồi hỏi người và chạy `deploy.sh release`.

**Cổng release** (`tools/deploy/release-gate.sh`, `release` tự chạy trước khi build; `gate` chạy riêng): chặn khi chưa có `assets/generated/review/screens/review.json`, khi lần duyệt còn phát hiện `block` chưa sửa, khi ảnh hai khổ không cùng chụp ở commit của lần duyệt hay lúc chụp còn code chưa commit, khi từ commit đã chụp tới `HEAD` có đổi gì ngoài ảnh, manifest, `plans/`, `docs/` (ảnh đã cũ), và khi CI (`gh run list --commit`) của commit đã chụp chưa xanh. Hỏi CI của commit đã chụp, không phải của `HEAD`, nên commit chỉ thêm ảnh không phải chờ CI. `gh` chưa đăng nhập hay mất mạng thì cổng chặn và in cách khắc phục. Cây export (không có `.git`): `MIU_RELEASE_REV` phải là sha (đầu) của commit đã chụp. Bản vá gấp khi CI hỏng vì nguyên nhân ngoài code: `MIU_RELEASE_FORCE="<lý do>"` cho qua, in lý do và ghi nó vào `RELEASE_FORCED` cạnh `REVISION` trong bản release trên máy chủ; vẫn phải hỏi người trước.

**Trước khi `release`:** chạy đủ gate trong `CLAUDE.md`. Script từ chối chạy khi working tree còn thay đổi chưa commit, vì mã release lấy từ commit. Khi cần deploy một cây đã export (`git archive`) thay vì checkout, đặt `MIU_RELEASE_REV=<nhãn>` và chạy từ gốc cây đó. Nếu chỉ còn file chưa track không thuộc bản build thì đặt `MIU_RELEASE_REV=$(git rev-parse --short HEAD)` sau khi kiểm `git diff --quiet HEAD`.

**`release` làm gì** (chi tiết ở `deploy.sh`):

1. Build web bằng `pnpm --filter @miu/web build:release` (`vite build --mode release`): chỉ có game, không có `review.html`, `preview.html` hay ảnh review (chỉ giữ ảnh chân dung nhân vật mà UI dùng), khoảng 8,6 MB thay vì 19 MB; dừng nếu `dist` vẫn còn trang review. E2E và bản review chạy local dùng `build` thường, vẫn có trang review cho người duyệt. Rồi bundle server (`pnpm --filter @miu/server bundle`, cấu hình ở `apps/server/bundle.ts`) và `pnpm security:dist`.
2. Backup database ra `/var/backups/miu/before-<id>.dump`.
3. Tải lên `/opt/miu/releases/<id>/` và chuyển symlink `/opt/miu/current`.
4. Restart `miu-server` và đợi `/api/health`. Không lên thì tự quay về release trước và in log.
5. Giữ 5 release mới nhất, rồi gọi `https://miu.hoandat.com/api/health` từ ngoài vào.

**Trang tìm kiếm và ảnh thẻ** (bản release): `release` dừng nếu `robots.txt` chặn toàn bộ hay `sitemap.xml` thiếu trang bài. Thêm hay đổi bài SGK có quest thì chạy `pnpm assets:cards` rồi `pnpm assets:manifest` (ảnh thẻ theo bài; build báo lỗi nếu thiếu), và `pnpm seo:lastmod` khi nội dung trang bài đổi (thiếu thì sitemap bỏ `lastmod`). Sau release lần đầu có sitemap: nộp `https://miu.hoandat.com/sitemap.xml` trong Search Console.

**Nghiệm thu:**

- `curl -s https://miu.hoandat.com/api/health` trả `{"status":"ok"}`.
- Revision đang chạy nằm ở `/opt/miu/current/apps/server/dist/server/REVISION` trên .65.
- File dưới `/game-assets/` giữ đường dẫn qua các release, và Cloudflare cùng trình duyệt có thể giữ chúng nhiều giờ (Browser Cache TTL của zone, xem §6). Vì vậy web gắn phiên bản nội dung vào URL (`?v=` + 12 ký tự đầu sha256 trong manifest; `apps/web/src/asset-versions.ts`): file đổi thì URL đổi, không cần xoá cache. Bản build gắn sẵn phiên bản của `manifest.json` và của các file UI hiển thị. Sau release vẫn so sha256 của bản trên production với file local. Xoá cache theo §4 chỉ còn dùng cho URL không phiên bản (ví dụ khách còn mở trang cũ).

**Log:** `journalctl --namespace=miu -u miu-server` (.65; không có `--namespace` thì không thấy); request ở `/var/log/nginx/miu.hoandat.com.{access,error}.log`.

**Rollback** (trên .65, hỏi người trước; backup ở `/var/backups/miu/`: `before-<id>.dump`, `daily-<ngày>.dump`):

- **Chỉ quay code:** `ln -sfn /opt/miu/releases/<id-trước> /opt/miu/current && systemctl restart miu-server`.
- **Migration làm hỏng dữ liệu:** dừng `miu-server`, rồi chạy `cd /tmp && sudo -u postgres dropdb miu && sudo -u postgres createdb -O miu miu && sudo -u postgres pg_restore --no-owner --role=miu -d miu /var/backups/miu/before-<id>.dump`. Sau đó quay code như trên. Lệnh `pg_restore` này đã chạy thử vào một database tạm.

## 6. Điều đã đo được và dễ vấp

- **Production chạy `NODE_ENV=production`:** có Postgres thật, Google OAuth thật và đăng nhập bằng mật khẩu bị tắt. Biến bắt buộc nằm ở `loadConfig` trong `apps/server/src/config.ts`; thiếu biến nào thì server dừng ngay lúc khởi động.
- **Migration tự chạy khi server mở Postgres** (`openPostgres` trong `apps/server/src/db/client.ts`). Vì vậy `release` luôn backup trước khi restart, và mọi restart đều có thể là migration.
- **Bundle server phải nằm đúng độ sâu.** Đường dẫn tới migration và `content/` tính từ vị trí file. Lý do nằm trong comment của `apps/server/bundle.ts`; đừng đổi `outfile` mà không đổi hai điểm neo đó.
- **Google OAuth:** `GOOGLE_REDIRECT_URI` phải khớp đúng một URI đã đăng ký trên Google client, dạng `https://<domain>/api/auth/google/callback`. Consent screen ở "In production" từ 12/10/2026: mọi tài khoản Google đăng nhập được, không còn giới hạn test user.
- **Cloudflare cache tệp tĩnh ở edge khoảng 4 giờ**, kể cả phản hồi sai. Tệp `.js` không tồn tại mà từng trả 200 sẽ bị giữ lại cho tới khi purge (§4). HTML không bị cache, nên sau deploy `index.html` mới trỏ tới chunk mới. Một 404 cũng có thể bị giữ (đã gặp 01/10/2026: chunk của bản build mới bị hỏi trước khi release chuyển xong). `nginx-prod.conf` trả 404 thật cho `/assets/` và `/game-assets/` (không trả `index.html` thay cho chunk thiếu). Nghi một tầng giữ bản cũ thì so sha256 trên loopback của .65 rồi qua Cloudflare.
- **Cổng 8787 trên .65 đã có dịch vụ khác giữ** (loopback). Production đặt `PORT=8797`; kiểm bằng `ss -ltnp`. Quy tắc "cổng cố định 8787" trong `CLAUDE.md` chỉ áp cho máy dev.
- **Nginx trên .65 (CentOS) đọc cấu hình từ `/etc/nginx/conf.d/`**, không có `sites-enabled`. `setup` chỉ ghi tệp `miu.conf` và chỉ bật nó khi `nginx -t` sạch.
- **Server chỉ nghe trên `127.0.0.1`** và chỉ tin `X-Forwarded-For` từ loopback (`app.set('trust proxy', …)` trong `apps/server/src/app.ts`). Reverse proxy ngay trước server vì vậy phải chạy trên cùng máy với server.

## 7. Vận hành production

**Giữ dữ liệu tối đa 14 ngày** (trang `/privacy` hứa điều này; đổi cấu hình thì sửa cả trang):

| Nơi | Cách giữ 14 ngày |
|---|---|
| Bản sao lưu `/var/backups/miu/` | `miu-backup.service` giữ 14 bản `daily-*.dump` và xóa mọi `*.dump` (cả `before-<id>`) quá 14 ngày. Ngoại lệ duy nhất: `/var/backups/miu/bots/bots-*.dump` chỉ gồm `bot_world_memories` và `bot_skills` (điều bạn máy tự học, không có id hay dữ liệu người chơi) và giữ 90 ngày, để mất dữ liệu học phát hiện muộn vẫn khôi phục được. Không thêm bảng có dữ liệu người chơi vào bản này (kể cả `bot_memories`) |
| Log server | journal riêng `LogNamespace=miu`, `/etc/systemd/journald@miu.conf`: `MaxRetentionSec=14day`, mỗi file một ngày |
| Log nginx của `miu.hoandat.com` | quy tắc có sẵn của host `/etc/logrotate.d/nginx` (hằng ngày, giữ 10). `setup` cảnh báo nếu quy tắc đó đổi |

- Secret: entry `service == "postgresql"`, `used_by` bắt đầu bằng `miu-world production` trong `access-tokens.json` (mật khẩu role `miu`); Google client dùng chung entry với dev; khóa TURN của voice chat từ entry `rtc.live.cloudflare.com (TURN)` (§2.2). `setup` ghi `/etc/miu/production.env` (640 `root:miu`), gồm cả hai dòng `CF_TURN_*`; `turn` chỉ thay hai dòng đó, giữ nguyên các dòng khác (chạy lại được), qua ssh stdin, không in giá trị. Thiếu entry thì `turn` dừng, không ghi dòng rỗng (dòng rỗng coi như chưa đặt). Không có khóa thì voice vẫn chạy với STUN (đa số mạng nhà nối thẳng được), chỉ mạng chặt mới cần TURN. Đổi khóa: tạo khóa mới trên Cloudflare (Realtime → TURN), sửa entry trong `access-tokens.json`, chạy `turn` rồi `release` (hoặc restart). Kiểm sau release: đăng nhập, mở `/api/voice/ice-servers` phải có một mục `turn:`; log lỗi chỉ ghi `voice relay credentials failed` kèm mã trạng thái.
- Số liệu sử dụng (Google Analytics 4): entry `analytics.google.com` / `miu-world production` (§2.2). `analytics` chỉ thay hai dòng `GA4_MEASUREMENT_ID`, `GA4_API_SECRET`, giữ nguyên các dòng khác, qua ssh stdin, không in giá trị, in số dòng `GA4_` sau khi chạy; thiếu entry hay giá trị sai dạng (`G-` + 6–12 ký tự; secret không khoảng trắng) thì dừng, không ghi gì. `setup` giữ lại hai dòng `GA4_*` đang có (đủ cả hai hoặc không dòng nào; chỉ một dòng thì `setup` dừng, chạy lại `analytics`), không tự bật analytics. Thứ tự: release có privacy v4 trước, rồi `analytics`, rồi restart (hỏi người). `analytics` tự từ chối (không đọc token, không ghi gì) khi `GET https://miu.hoandat.com/api/consents/policy` chưa trả đúng phiên bản trong `content/legal/consent-vi.json` của bản checkout. Danh sách kiểm bắt buộc trước khi chạy `deploy.sh analytics`, người sở hữu xác nhận từng mục trong GA Admin của property Miu World (chính sách nói đúng các cài đặt này): Google Signals tắt; cá nhân hóa quảng cáo tắt; mọi mục Chia sẻ dữ liệu (Data sharing settings) tắt; Event data retention đặt 2 tháng. Một mục chưa đạt thì không chạy lệnh. Server in `usage analytics: sent to Google Analytics` hay `off` lúc khởi động. Kiểm dạng sự kiện trên máy dev (endpoint `/debug/mp/collect` của Google, không ghi số liệu): `pnpm --filter @miu/server exec tsx --env-file=<tệp env ngoài repo có hai dòng GA4_*> src/analytics/ga4-debug.ts`. Lùi: xóa hai dòng `GA4_*` trong env rồi restart (hỏi người). Nguồn đến từ clip YouTube/Facebook hằng tuần mang `utm_source=youtube|facebook`, `utm_medium=social`, `utm_campaign=weekly-clip` (kênh và timer đăng clip: [`marketing-channels.md`](marketing-channels.md)).
- Khôi phục riêng dữ liệu học của bạn máy (thao tác ghi, hỏi người trước): dừng `miu-server` (nếu không, lần ghi kế tiếp của bạn máy sẽ đè lên), rồi `cd /tmp && sudo -u postgres psql -d miu -c 'truncate bot_world_memories, bot_skills' && sudo -u postgres pg_restore --data-only -d miu /var/backups/miu/bots/bots-<ngày>.dump`, rồi chạy lại server. Lệnh này chưa chạy thử.
- Thời khóa biểu mặc định (lớp của bé nhà người sở hữu: có tên trường, tên và điện thoại cô giáo) không nằm trong git. Chỉ các tài khoản có email đăng nhập trong `TIMETABLE_DEFAULT_ACCOUNTS` (phân tách bằng dấu phẩy) thấy bản này khi chưa tự lưu thời khóa biểu (`TIMETABLE_DEFAULT_FILE`); tài khoản khác thấy mẫu trống. Ở production, không đặt `TIMETABLE_DEFAULT_ACCOUNTS` thì không ai thấy; ở dev và test thì mọi tài khoản thấy. Trước bản sửa này, mọi tài khoản đều thấy bản mặc định, nên từ 12/10/2026 (mở đăng nhập cho mọi người) người lạ đọc được; ngày 19/10/2026 dòng `TIMETABLE_DEFAULT_FILE` đã được gỡ khỏi env production. Đặt lại sau khi release bản có danh sách cho phép: thêm dòng `TIMETABLE_DEFAULT_ACCOUNTS` vào `/etc/miu/production.env` (không in, không commit email) rồi chạy `timetable` và restart (hỏi người). Nguồn ở iCloud (`timetable/timetable-default.json`, kê trong `tools/private/private-files.json`), `pnpm private:sync` chép vào `.data/private/`; `pnpm dev` tự dùng nếu có. Trên .65 tệp nằm ở `/opt/miu/config/timetable-default.json` (`root:miu`, 640); `deploy.sh timetable` tải lên qua ssh và thêm dòng biến vào `/etc/miu/production.env` nếu chưa có. Đổi lịch mặc định: sửa tệp trong iCloud, cập nhật sha256 trong `private-files.json`, chạy `timetable` rồi `release`.
- Font chữ mẫu tiểu học HP001 của phiếu viết (`chu-mau-tieu-hoc.woff2`, `chu-mau-tieu-hoc-dam.woff2`) không có giấy phép mở nên không nằm trong git. Trên .65 font nằm ở `/opt/miu/fonts` (ngoài `/opt/miu/current`, thư mục đó thay mỗi lần release; `root:miu`, 750). `setup` tạo thư mục và ghi `HANDWRITING_FONT_DIR=/opt/miu/fonts` vào `/etc/miu/production.env`. `tools/deploy/production/deploy.sh fonts` tải hai tệp lên qua ssh, không qua git; nguồn là `$MIU_FONT_DIR`, mặc định `.data/fonts/` của checkout đang chạy lệnh. Thiếu font thì phiếu vẫn in nhưng không có chữ mẫu. Máy dev lấy hai tệp (cùng PDF SGK gốc) từ iCloud bằng `pnpm private:sync`, vào `.data/fonts/`.

**Việc còn lại (của người):**

1. Đã xong: redirect URI `https://miu.hoandat.com/api/auth/google/callback` thêm ngày 30/09/2026; Publishing status chuyển sang "In production" ngày 12/10/2026 (scope chỉ `openid email` nên không cần duyệt scope nhạy cảm). Logo `assets/generated/brand/miu-logo-120.png` đã tải lên Branding và được Google xác minh thương hiệu ngày 12/10/2026 (tên Miu World và logo hiện trên màn đồng ý). Cùng thư mục là favicon và icon cài lên màn hình điện thoại (PWA), do `apps/web/vite-app-icons.ts` gắn vào trang; đổi logo thì chạy `pnpm assets:logo` rồi tải lại bản 120 lên Branding.
2. Lời đồng ý (nay `v4`) và `/privacy` do dự án tự soạn, chưa qua luật sư (trang ghi rõ). Nghị định 13/2023 Điều 20 yêu cầu có cả đồng ý của trẻ từ 7 tuổi: hiện lời đồng ý nhắc phụ huynh hỏi bé, chưa có bước bé tự xác nhận.
3. Quyết định giữ hay bỏ công tắc dev (`?spawnAt`, `?outfit`, `?stats`).
