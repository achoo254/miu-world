---
name: miu-ops-staging
description: ĐÃ NGỪNG — staging của Miu World (miu-staging.hoandat.com, lab 176) đã gỡ hẳn ngày 12/10/2026, kể cả dữ liệu và bản sao lưu. Không dùng skill này; việc vận hành dùng skill miu-ops-prod.
---

# Miu World Ops — Staging (đã ngừng)

Staging đã gỡ hẳn ngày 12/10/2026 theo yêu cầu người sở hữu: dịch vụ `miu-server`, `miu-tunnel`, nginx
trên lab 176, database `miu`, `/opt/miu`, `/etc/miu`, mọi bản sao lưu staging, edge nginx trên .65 và bản
ghi DNS `miu-staging.hoandat.com` đều không còn. Script `tools/deploy/staging/` đã xóa khỏi repo.

- Không deploy, không SSH vào lab để làm việc của Miu.
- Vận hành production: skill `miu-ops-prod`, tài liệu `docs/deployment-guide.md`, `docs/STAG-DEV-README.md`.
