#!/usr/bin/env bash
# Runs ON lab 176 as root (deploy.sh setup ships this directory to /tmp/miu-setup). Idempotent.
# Holds no secrets: env files and the database password are written separately by deploy.sh.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
NODE_MAJOR=22

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq postgresql nginx >/dev/null

# Node 22 lives in /opt, beside the system Node 20 that other tools on this box still use.
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

id miu >/dev/null 2>&1 || useradd --system --home /opt/miu --shell /usr/sbin/nologin miu
install -d -m 755 /opt/miu /opt/miu/releases
install -d -m 750 -o root -g miu /etc/miu
install -d -m 700 -o postgres -g postgres /var/backups/miu

rm -f /etc/nginx/sites-enabled/default
install -m 644 "$HERE/nginx-lab.conf" /etc/nginx/sites-available/miu-staging
ln -sfn /etc/nginx/sites-available/miu-staging /etc/nginx/sites-enabled/miu-staging
nginx -t -q
systemctl reload nginx

install -m 644 "$HERE/miu-server.service" "$HERE/miu-tunnel.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable -q miu-server miu-tunnel

echo "lab host ready: node $(/opt/node22/bin/node -v), $(psql --version), nginx $(nginx -v 2>&1 | sed 's|.*/||')"
