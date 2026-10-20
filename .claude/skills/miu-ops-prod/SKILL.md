---
name: miu-ops-prod
description: Tra cứu thông tin và vận hành Miu World trên PRODUCTION (miu.hoandat.com, chạy trên máy .65 dùng chung với nhiều dự án khác — systemd miu-server cổng loopback 8797, Postgres 16 có dữ liệu thật của trẻ em). Chỉ đường đọc docs/STAG-DEV-README.md và docs/deployment-guide.md §7 — credential ở $ALL_IN_ONE_STAGING_DEV (entry SSH_SERVER_STAGING, KHÔNG phải $ALL_IN_ONE_PROD), SSH bằng key, log journal namespace miu, backup 14 ngày, deploy bằng tools/deploy/production/deploy.sh. Kích hoạt khi user nhắc "prod", "production", "miu.hoandat.com", ".65", "deploy prod", "release prod", "log prod", "DB prod", "backup prod", "rollback prod". KHÔNG dùng cho staging/lab 176 (miu-staging.hoandat.com) — dùng skill miu-ops-staging.
---

# Miu World Ops — Production

Skill này là **bản chỉ đường**, không phải bản sao tài liệu. Nguồn chuẩn:

- `docs/STAG-DEV-README.md` — vào máy: quyền hạn, credential, lệnh SSH, đường dẫn, lệnh thường dùng, bẫy.
- `docs/deployment-guide.md` §5 (deploy, release, rollback), §7 (vận hành production) cùng §1, §2, §4, §6 — secret ứng dụng, DNS.
- `tools/deploy/production/` — script và cấu hình; lý do ghi ngay trong từng tệp.

Gặp chỗ skill và tài liệu nói khác nhau thì **tài liệu đúng** — sửa skill. Staging đã gỡ hẳn ngày
12/10/2026 (cả dữ liệu và bản sao lưu); production là môi trường deploy duy nhất.

## Cổng bắt buộc — chạy TRƯỚC mọi bước khác

Mỗi lần skill này được dùng, làm đủ ba bước dưới **trước** khi đọc tài liệu hay SSH:

1. **Để Jev ra quyết định qua `tools/decisions/jev-decide.py`** (cách dùng ở docstring đầu tệp; ngưỡng
   tự quyết theo `stakes` nằm trong hằng `AUTO_THRESHOLD`). Key: đặt
   `TYPESAFE_TOKEN_FILE="$(dirname "$ALL_IN_ONE_STAGING_DEV")/access-tokens.json"` — script tự lấy mục
   `api.typesafe.ai` và không in khoá. Quyết định đầu tiên giao cho Jev là **chọn skill AgentKit** ở
   bước 2 — lượt gọi này đồng thời là phép thử Jev còn dùng được. Sau đó mọi điểm quyết định kỹ thuật
   trong lượt việc (hướng điều tra, phương án, làm hay bỏ một bước) đều hỏi Jev, với `state` là các
   **sự thật đã kiểm**; báo lại user cả câu hỏi lẫn xác suất Jev trả về. Kết quả `escalate` ⟹ chuyển
   user, không tự quyết.
2. **Gọi skill AgentKit phù hợp** (Skill tool, tên `ak-*` trong danh mục skill đang cài):

   | Việc | Skill AgentKit |
   |---|---|
   | Điều tra sự cố, lỗi, log bất thường | `ak-debug` |
   | Sửa một lỗi đã xác định | `ak-fix` |
   | Deploy, rollback, đổi nginx/unit/hạ tầng | `ak-deploy` / `ak-devops` |
   | Truy vấn, dung lượng, backup/restore Postgres | `ak-databases` |
   | Tìm tệp, script, nơi đặt cấu hình | `ak-scout` |
   | Bí mật lộ, rà bảo mật | `ak-security` |
   | Không rõ chọn skill nào, việc nhiều bước | `ak-agentkit` (bộ định tuyến) |

3. **Không dùng được ⟹ báo ngay và DỪNG.** Skill AgentKit không có trong danh mục hoặc gọi lỗi, thiếu
   tệp token, Jev trả lỗi/timeout/đáp án không hợp lệ ⟹ báo user: thứ nào hỏng, thông điệp lỗi nguyên
   văn, đã tới bước nào. Rồi **ngưng toàn bộ công việc** cho yêu cầu đó — không tự quyết thay Jev,
   không làm tiếp bằng công cụ gốc, không tìm key ở nơi khác, không thay bằng skill/model khác.

Jev quyết các điểm **kỹ thuật**; đáp án của Jev **không thay** lời yêu cầu tường minh của user cho thao
tác ghi production (§1 luật 1) và không thay phép đo — Jev chọn "đo trước" thì phải đo thật.

**Quyết định để lại cho user ⟹ kèm tư vấn của Jev, user vẫn chọn.** Khi kết thúc bằng các phương án
cho user chọn (deploy, migration, restart, đổi chính sách giữ dữ liệu…), gửi đúng các phương án đó cho
Jev với `stakes: "high"` (state = sự thật đã kiểm, kể cả rủi ro và đường lùi của từng phương án) rồi
trình cho user: phương án Jev nghiêng về + xác suất từng phương án. AI KHÔNG tự thực hiện theo lựa chọn
đó, chờ user quyết.

## 0. Xác định đúng môi trường trước

| Dấu hiệu | Môi trường | Skill |
|---|---|---|
| `miu.hoandat.com`, `/etc/miu/production.env`, cổng loopback `8797`, `journalctl --namespace=miu` | **Production** (.65) | skill này |
| `miu-staging.hoandat.com`, lab 176, `/etc/miu/staging.env` | Staging — **đã gỡ 12/10/2026**, không còn gì để vận hành | — |
| `localhost:5173/8787`, `.data/pglite`, `miu.tunnel.hoandat.com` | Dev (máy local) | — (`CLAUDE.md`) |

⚠️ **.65 là máy dùng chung:** Miu chỉ có `conf.d/miu.conf` trên nginx của .65; edge staging
(`conf.d/miu-staging.conf`) đã gỡ ngày 12/10/2026.

## 1. Luật cứng (vi phạm = sự cố thật)

1. **Mặc định CHỈ ĐỌC.** `deploy.sh setup|fonts|timetable|release`, migration, `systemctl restart`,
   sửa nginx, sửa `/etc/miu/production.env`, ghi Postgres ⟹ chỉ làm khi user yêu cầu **tường minh cho
   chính lần đó** (`deployment-guide.md` §1). Server tự chạy migration khi khởi động, nên **mọi restart
   đều có thể là migration**. Không tự đề xuất deploy prod vào "việc còn lại".
2. **.65 dùng chung với nhiều dự án.** Chỉ chạm `/opt/miu`, `/etc/miu`, `/var/backups/miu`,
   `miu-server`, `miu-backup.{service,timer}`, `conf.d/miu.conf`, database
   `miu`. Không sửa, dừng, nâng cấp pm2, nginx block, Postgres role/database hay tiến trình nào khác —
   kể cả khi nó giữ cổng mình cần (cổng 8787 trên .65 thuộc dự án khác). Quy tắc "cổng bận thì tắt
   tiến trình cũ" của `CLAUDE.md` chỉ áp máy dev. Đụng nginx xong phải `nginx -t` và đếm pm2 online
   (lệnh ở `STAG-DEV-README.md` §6).
3. **Dữ liệu thật của trẻ em.** Truy vấn Postgres chỉ lấy **số đếm, id, trạng thái** — không `SELECT`
   email, tên hiển thị, thời khóa biểu, hộp thư, token hay hash ra màn hình/báo cáo. Không kéo bản
   dump về máy dev, không tạo bản sao dữ liệu sống quá **14 ngày** (trang `/privacy` hứa điều này;
   bảng giữ dữ liệu ở `deployment-guide.md` §7). Đổi cách giữ ⟹ hỏi user và sửa cả trang `/privacy`.
4. **Repo công khai.** Không ghi IP, cổng SSH, user, đầu ra có dữ liệu cá nhân vào bất kỳ tệp nào
   trong repo — **kể cả `plans/` và `plans/dattqh/reports/`**, vì chúng cũng được commit. Đọc giá trị
   lúc chạy từ tệp credential; báo cáo nói "entry `SSH_SERVER_STAGING`", không nói địa chỉ.
5. **Chọn đúng tệp credential:** production của Miu ⟹ `$ALL_IN_ONE_STAGING_DEV` (entry
   `SSH_SERVER_STAGING`, group `SERVER STAGING .65`) và `access-tokens.json` cùng thư mục.
   **KHÔNG** `$ALL_IN_ONE_PROD` — tệp đó của hệ khác (`STAG-DEV-README.md` §3).
6. **Không in bí mật:** không `cat`/`source` tệp credential hay `/etc/miu/production.env`; gán vào biến,
   truyền qua stdin. Entry thiếu hoặc trả `null` ⟹ dừng và báo, không đoán, không tìm key nơi khác.

## 2. Câu hỏi → đọc mục nào

| Cần biết | Đọc | Ghi chú |
|---|---|---|
| Agent được làm gì trên .65 | `STAG-DEV-README.md` §1, `deployment-guide.md` §1 | đọc trạng thái: được; ghi: hỏi mỗi lần |
| Máy, vai trò, entry credential | `STAG-DEV-README.md` §2, §3 | key là chính, mật khẩu dự phòng |
| Lệnh SSH vào .65 | `STAG-DEV-README.md` §4 | hàm `prod()` trong `tools/deploy/production/deploy.sh` là mẫu chuẩn |
| Đường dẫn release, env, backup, log | `STAG-DEV-README.md` §5 | revision ở `/opt/miu/current/apps/server/dist/server/REVISION` |
| Lệnh kiểm trạng thái, health, log | `STAG-DEV-README.md` §6 | health trên máy: `127.0.0.1:8797/api/health` |
| Secret ứng dụng (Postgres, Google OAuth) | `deployment-guide.md` §2.2, §7 | `setup` ghi `/etc/miu/production.env`; bản gốc ở `access-tokens.json` |
| Đường vào, Cloudflare, DNS, xoá cache | `deployment-guide.md` §3, §4 | Cloudflare cắt request sau 100 s |
| Deploy, font, thời khóa biểu mặc định | `deployment-guide.md` §5, §7 | build `build:release`, không có trang review |
| Rollback code / khôi phục database | `deployment-guide.md` §5 (Rollback) | backup `before-<id>.dump`, `daily-<ngày>.dump` |
| Giữ dữ liệu 14 ngày | `deployment-guide.md` §7 bảng giữ dữ liệu | backup, journal, logrotate nginx |
| Bẫy đã đo (migration tự chạy, bundle sâu, OAuth) | `deployment-guide.md` §6 | |
| Việc còn lại của người (OAuth consent, pháp lý) | `deployment-guide.md` §7 cuối | không tự làm |

## 3. Đường đọc ưu tiên — rẻ nhất trước

1. **Từ máy dev, không SSH:** `curl -s https://miu.hoandat.com/api/health` (đi qua Cloudflare; 200
   không chứng minh bản đang chạy là bản mới — xem revision ở bước 2).
2. **SSH đọc trạng thái** — cùng cách hàm `prod()` của `deploy.sh`. Ghi key ra tệp tạm quyền 600, xong
   thì xoá; lệnh từ xa chỉ đọc:

   ```bash
   F="$ALL_IN_ONE_STAGING_DEV"
   K="$(mktemp)"; chmod 600 "$K"
   jq -er '.servers[]|select(.name=="SSH_SERVER_STAGING")|.private_key' "$F" > "$K"
   ssh -i "$K" -o IdentitiesOnly=yes -o ConnectTimeout=10 \
     -p "$(jq -er '.servers[]|select(.name=="SSH_SERVER_STAGING")|.port' "$F")" \
     "$(jq -er '.servers[]|select(.name=="SSH_SERVER_STAGING")|.user+"@"+.host' "$F")" \
     'systemctl is-active miu-server postgresql nginx miu-backup.timer; cat /opt/miu/current/apps/server/dist/server/REVISION' \
     </dev/null
   rm -f "$K"
   ```

   ⚠️ Đừng viết mẫu trong tệp này bằng tham số vị trí (dấu đô-la kèm số): trình nạp skill thay chúng
   bằng chữ của câu yêu cầu, nên agent nhận một lệnh khác với tệp này. Vì vậy mẫu trên ghi thẳng tên
   entry thay cho hàm `srv` của tài liệu.
3. **Log:** `journalctl --namespace=miu -u miu-server -n 50 --no-pager` (thiếu `--namespace=miu` thì
   journal trông rỗng); request ở `/var/log/nginx/miu.hoandat.com.{access,error}.log`. Lọc tại chỗ bằng
   `grep`/`awk`/`tail`, chỉ kéo về dòng cần.
4. **Postgres (chỉ đọc, chỉ số đếm):** trên .65 chạy
   `cd /tmp && sudo -u postgres psql -d miu -At -c '<truy vấn>'` (đứng ở `/tmp` để `sudo -u postgres`
   không vấp quyền thư mục — giống `deploy.sh`). Schema ở `apps/server/src/db/schema.ts`; migration ở
   `apps/server/drizzle/`. Không mở DB từ máy dev — Postgres chỉ nghe loopback.
5. **Backup:** `ls -lt /var/backups/miu | head` — bản `daily-*` mới nhất phải trong 24 giờ
   (`systemctl list-timers miu-backup.timer`).

## 4. Bẫy hay gặp khi ĐỌC thông tin production

- **Health 200 ở domain không nói gì về phiên bản**: Cloudflare và release cũ đều trả 200. So
  `REVISION` trên máy với `git rev-parse --short HEAD`.
- **`journalctl -u miu-server` không có `--namespace=miu` trả rỗng** — không phải "server không log".
- **Cổng 8787 trên .65 không phải của Miu** — production Miu nghe 8797. Hỏi 8787 là đọc dự án khác.
- **nginx trên .65 là CentOS**: chỉ có `conf.d/`, không có `sites-enabled` (ngược với lab 176).
- **Cloudflare giữ tệp tĩnh ~4 giờ, kể cả 404 và phản hồi sai** — trình duyệt thấy bản cũ chưa chắc
  máy chủ còn bản cũ. So sha256 ở từng tầng (`deployment-guide.md` §6).
- **Hook môi trường chặn vài từ trong lệnh Bash** (vd "target", "coverage") — viết script ra tệp rồi
  chạy (`STAG-DEV-README.md` §7).
- **Mã thoát của lệnh nền không đáng tin** — đọc đầu ra thật (`healthy`, `rolled back to …`), đừng
  chỉ tin `exit code 0`.

## 5. Kết luận từ dữ liệu production

Kết quả âm tính (*rỗng / 0 / không thấy lỗi*) mặc định là **chưa kết luận được** tới khi trả lời đủ:
**nguồn** (đúng journal namespace, đúng database, đúng máy?), **phạm vi** (đã đo cả domain lẫn
loopback?), **hiệu lực** (cửa sổ thời gian chứa sự kiện? cache Cloudflare?), **năng lực phát hiện**
(mẫu `grep` đã khớp được trên chỗ chắc chắn có?). Báo phép đo đã làm trước, rồi mới tới kết quả. Còn
mắt xích chưa đo thì gọi là giả thuyết.

## 6. Khi chuẩn bị thao tác GHI (chỉ khi user đã yêu cầu tường minh)

- Trước `release`: đủ gate của `CLAUDE.md` (`assets:check` → `content:check` → `test` → `typecheck` →
  `lint`, cộng `--filter @miu/web build` và E2E smoke khi chạm `apps/`), working tree sạch (hoặc
  `MIU_RELEASE_REV` theo `deployment-guide.md` §5), và quét secret phần sắp push nếu có push.
- `release` tự backup DB, chuyển symlink, đợi health và tự quay về bản trước khi không lên — đọc đầu ra
  để biết nó đã `healthy` hay `rolled back to …`.
- Migration làm hỏng dữ liệu ⟹ quy trình `pg_restore` ở `deployment-guide.md` §5 (Rollback), chạy
  trên .65 — đây là thao tác ghi riêng, hỏi user trước.
- Sau mọi thao tác ghi: health trên loopback **và** qua domain, `REVISION`, 40 dòng journal cuối,
  và nếu đã đụng nginx: `nginx -t` + số tiến trình pm2 online không đổi.
- Thay đổi cấu hình máy (unit, nginx, retention) ⟹ sửa tệp trong `tools/deploy/production/` rồi chạy
  `setup`, không sửa tay trên máy; cập nhật tài liệu tương ứng.
