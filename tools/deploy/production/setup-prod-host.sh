#!/usr/bin/env bash
# Runs ON .65 as root (deploy.sh setup ships this directory to /tmp/miu-prod-setup). Idempotent.
# .65 is shared with many other projects: this only adds Miu's own pieces (PostgreSQL 16 on
# loopback, Node 22 in /opt, user `miu`, /opt/miu, /etc/miu, one systemd unit + backup timer, a
# journal namespace, one nginx server block) and never touches another project's service, port or
# config. The nginx access/error logs of the block are rotated by the host's own
# /etc/logrotate.d/nginx (daily, 10 kept), inside the 14 days /privacy promises; the end of this
# script checks that rule is still there.
# Holds no secrets: the env file and the database password are written separately by deploy.sh.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
NODE_MAJOR=22
PG_STREAM=16

# PostgreSQL 16 from the AppStream module (same major as staging); nothing else on .65 uses Postgres.
if ! rpm -q postgresql-server >/dev/null 2>&1; then
  dnf -y -q module reset postgresql
  dnf -y -q module enable "postgresql:$PG_STREAM"
  dnf -y -q install postgresql-server postgresql
fi
if [ ! -f /var/lib/pgsql/data/PG_VERSION ]; then
  postgresql-setup --initdb
fi
PGDATA=/var/lib/pgsql/data
# Loopback only (the default), and password (scram) login for role miu from loopback, ahead of the
# default ident rules. Other local access stays as installed (peer for postgres).
grep -q "^listen_addresses = 'localhost'" "$PGDATA/postgresql.conf" || echo "listen_addresses = 'localhost'" >> "$PGDATA/postgresql.conf"
if ! grep -q '^host miu miu 127.0.0.1/32 scram-sha-256' "$PGDATA/pg_hba.conf"; then
  sed -i '0,/^host /s//host miu miu 127.0.0.1\/32 scram-sha-256\nhost miu miu ::1\/128 scram-sha-256\nhost /' "$PGDATA/pg_hba.conf"
fi
systemctl enable -q --now postgresql
systemctl reload postgresql

# Node 22 lives in /opt, apart from the nvm Node that the pm2 apps of other projects use.
if [ ! -x /opt/node22/bin/node ]; then
  base=https://nodejs.org/dist
  version=$(curl -fsS "$base/index.json" | python3 -c "import json,sys; print(next(r['version'] for r in json.load(sys.stdin) if r['version'].startswith('v$NODE_MAJOR.')))")
  tarball="node-$version-linux-x64.tar.xz"
  cd /opt
  curl -fsSO "$base/$version/$tarball"
  curl -fsS "$base/$version/SHASUMS256.txt" | grep " $tarball\$" | sha256sum -c -
  tar -xJf "$tarball" && rm "$tarball"
  ln -sfn "/opt/node-$version-linux-x64" /opt/node22
fi

id miu >/dev/null 2>&1 || useradd --system --home-dir /opt/miu --shell /sbin/nologin miu
install -d -m 755 /opt/miu /opt/miu/releases
install -d -m 750 -o root -g miu /etc/miu
install -d -m 700 -o postgres -g postgres /var/backups/miu
# Worksheet handwriting font: no open license, so it never goes through git or a release; `deploy.sh
# fonts` uploads it here, outside /opt/miu/current so a release does not replace it.
install -d -m 750 -o root -g miu /opt/miu/fonts

install -m 644 "$HERE/miu-server.service" "$HERE/miu-backup.service" "$HERE/miu-backup.timer" /etc/systemd/system/
# The API's own journal namespace (14 days); the host journal config is left alone.
install -m 644 "$HERE/journald-miu.conf" /etc/systemd/journald@miu.conf
systemctl daemon-reload
systemctl enable -q miu-server
systemctl enable -q --now miu-backup.timer

# The server block goes live only if the whole nginx config still tests clean; otherwise it is removed
# so a mistake here can never take the other sites on .65 down.
install -m 644 "$HERE/nginx-prod.conf" /etc/nginx/conf.d/miu.conf.new
mv /etc/nginx/conf.d/miu.conf.new /etc/nginx/conf.d/miu.conf
if nginx -t -q; then
  systemctl reload nginx
else
  rm -f /etc/nginx/conf.d/miu.conf
  nginx -t
  exit 1
fi

# /privacy promises nginx logs are gone within 14 days; that relies on the host rule above.
if ! grep -q '^/var/log/nginx/\*.log' /etc/logrotate.d/nginx || ! grep -Eq '^\s*rotate ([1-9]|1[0-3])$' /etc/logrotate.d/nginx; then
  echo "WARNING: /etc/logrotate.d/nginx no longer rotates /var/log/nginx/*.log daily with fewer than 14 kept; /privacy says 14 days" >&2
fi

echo "prod host ready: node $(/opt/node22/bin/node -v), $(psql --version | sed 's/ (.*//'), nginx block miu.conf"
