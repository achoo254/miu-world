#!/usr/bin/env bash
# Staging deploy for Miu World, run from a dev machine at the repo root.
#   tools/deploy/staging/deploy.sh setup     one-time/idempotent: lab host, secrets, DB role, edge nginx
#   tools/deploy/staging/deploy.sh fonts     upload the worksheet handwriting font (kept out of git)
#   tools/deploy/staging/deploy.sh gate      check the release gate only (tools/deploy/release-gate.sh), touching no server
#   tools/deploy/staging/deploy.sh release   release gate, build, back up the DB, upload, switch, health-check
# Credentials come from $ALL_IN_ONE_STAGING_DEV and the access-tokens.json beside it (see
# docs/deployment-guide.md). No value is printed; secrets travel over ssh stdin only.
set -euo pipefail

LAB=dattqh_ubuntu_192.168.122.176_MONGO
EDGE=SSH_SERVER_STAGING
DOMAIN=miu-staging.hoandat.com
HERE="$(cd "$(dirname "$0")" && pwd)"
# macOS tar: no AppleDouble or xattr entries (GNU tar on the box warns about them).
export COPYFILE_DISABLE=1
# shellcheck source-path=SCRIPTDIR source=../release-gate.sh
. "$HERE/../release-gate.sh"

# The gate alone needs no credentials: checked before they are asked for.
if [ "${1:-}" = gate ]; then
  cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  release_gate
  exit $?
fi

: "${ALL_IN_ONE_STAGING_DEV:?set ALL_IN_ONE_STAGING_DEV (docs/deployment-guide.md)}"
TOKENS="$(dirname "$ALL_IN_ONE_STAGING_DEV")/access-tokens.json"

srv() { jq -er --arg n "$1" '.servers[] | select(.name == $n) | .'"$2" "$ALL_IN_ONE_STAGING_DEV"; }
secret() { jq -er "$1" "$TOKENS"; }

# PubkeyAuthentication=no: with several keys on the dev machine, ssh spends MaxAuthTries on them before
# the password and the box answers "Permission denied", which looks exactly like a wrong password.
lab() {
  SSHPASS="$(srv $LAB password)" sshpass -e ssh -o PubkeyAuthentication=no -o ConnectTimeout=10 -p "$(srv $LAB port)" "$(srv $LAB user)@$(srv $LAB host)" "$@"
}

EDGE_KEY=""
cleanup() { [ -n "$EDGE_KEY" ] && rm -f "$EDGE_KEY"; return 0; }
trap cleanup EXIT
edge() {
  if [ -z "$EDGE_KEY" ]; then
    EDGE_KEY="$(mktemp)"; chmod 600 "$EDGE_KEY"; srv $EDGE private_key > "$EDGE_KEY"
  fi
  ssh -i "$EDGE_KEY" -o IdentitiesOnly=yes -o ConnectTimeout=10 -p "$(srv $EDGE port)" "$(srv $EDGE user)@$(srv $EDGE host)" "$@"
}

setup() {
  echo "== lab host"
  tar --no-xattrs -C "$HERE" -cf - . | lab 'rm -rf /tmp/miu-setup && mkdir -p /tmp/miu-setup && tar --no-same-owner -xf - -C /tmp/miu-setup && bash /tmp/miu-setup/setup-lab-host.sh'

  echo "== database role"
  local pg='.tokens[] | select(.service == "postgresql" and (.used_by | startswith("miu-world staging"))) | .token'
  local pw; pw="$(secret "$pg.password")"
  # Hex password: safe inside a SQL literal. Sent as SQL on stdin, so it never shows in a process list.
  printf "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'miu') THEN CREATE ROLE miu LOGIN; END IF; END \$\$;\nALTER ROLE miu WITH LOGIN PASSWORD '%s';\nSELECT 'CREATE DATABASE miu OWNER miu' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'miu')\\\\gexec\n" "$pw" \
    | lab 'sudo -u postgres psql -q -v ON_ERROR_STOP=1 -d postgres'

  echo "== env files"
  local google='.tokens[] | select(.service == "accounts.google.com" and .used_by == "miu-world") | .token'
  {
    echo "NODE_ENV=production"
    echo "PORT=8787"
    echo "DATABASE_URL=postgres://miu:$pw@127.0.0.1:5432/miu"
    echo "ALLOWED_ORIGINS=https://$DOMAIN"
    echo "GOOGLE_CLIENT_ID=$(secret "$google.client_id")"
    echo "GOOGLE_CLIENT_SECRET=$(secret "$google.client_secret")"
    echo "GOOGLE_REDIRECT_URI=https://$DOMAIN/api/auth/google/callback"
    echo "HANDWRITING_FONT_DIR=/opt/miu/fonts"
  } | lab 'install -m 640 -o root -g miu /dev/stdin /etc/miu/staging.env'
  echo "TUNELO_KEY=$(secret '.tokens[] | select(.account == "miu-staging-176") | .token')" \
    | lab 'install -m 640 -o root -g miu /dev/stdin /etc/miu/tunnel.env'
  # Stop, then start after tunelo's 5 s reconnect grace: a fresh registration makes the tunelo server
  # drop this subdomain's response cache, while a quick restart reconnects and keeps stale files.
  lab 'systemctl stop miu-tunnel && sleep 7 && systemctl start miu-tunnel && sleep 3 && systemctl is-active miu-tunnel'

  echo "== edge nginx (.65)"
  edge 'cat > /etc/nginx/conf.d/miu-staging.conf.new' < "$HERE/nginx-edge.conf"
  edge 'cd /etc/nginx/conf.d && mv miu-staging.conf.new miu-staging.conf && if nginx -t -q; then systemctl reload nginx && echo "edge reloaded"; else rm -f miu-staging.conf; nginx -t; exit 1; fi'
}

# Worksheet handwriting font (no open license: kept out of git). Uploads the .woff2 files from
# $MIU_FONT_DIR (default .data/fonts of this checkout, filled by `pnpm private:sync`) to /opt/miu/fonts.
fonts() {
  local dir="${MIU_FONT_DIR:-.data/fonts}"
  ls "$dir"/*.woff2 >/dev/null 2>&1 || { echo "no .woff2 in $dir: set MIU_FONT_DIR" >&2; exit 1; }
  tar --no-xattrs -C "$dir" -cf - $(cd "$dir" && ls *.woff2) \
    | lab 'tar --no-same-owner -xf - -C /opt/miu/fonts && chown root:miu /opt/miu/fonts/*.woff2 && chmod 640 /opt/miu/fonts/*.woff2 && ls /opt/miu/fonts | wc -l | xargs echo fonts on host:'
}

release() {
  local root; root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  cd "$root"
  local rev="${MIU_RELEASE_REV:-}"
  if [ -z "$rev" ]; then
    [ -z "$(git status --porcelain)" ] || { echo "working tree not clean: commit first, or set MIU_RELEASE_REV for an exported tree" >&2; exit 1; }
    rev="$(git rev-parse --short HEAD)"
  fi
  release_gate || exit 1
  local id; id="$(date +%y%m%d-%H%M%S)-$rev"

  echo "== build $id"
  pnpm --filter @miu/web build >/dev/null
  pnpm --filter @miu/server bundle >/dev/null

  echo "== backup database"
  lab "sudo -u postgres pg_dump -Fc miu > /var/backups/miu/before-$id.dump && ls -l /var/backups/miu/before-$id.dump | awk '{print \$5\" bytes\"}'"

  echo "== upload"
  echo "$rev" > apps/server/dist/server/REVISION
  # A release let through the gate by MIU_RELEASE_FORCE keeps the reason on the host, beside REVISION.
  rm -f apps/server/dist/server/RELEASE_FORCED
  [ -z "$RELEASE_FORCED" ] || printf '%s\n' "$RELEASE_FORCED" > apps/server/dist/server/RELEASE_FORCED
  tar --no-xattrs -cf - apps/web/dist apps/server/dist/server apps/server/drizzle content \
    | lab "mkdir -p /opt/miu/releases/$id && tar --no-same-owner -xf - -C /opt/miu/releases/$id"

  echo "== switch and restart"
  lab "set -e
    prev=\$(readlink /opt/miu/current || true)
    ln -sfn /opt/miu/releases/$id /opt/miu/current.new && mv -T /opt/miu/current.new /opt/miu/current
    systemctl restart miu-server
    for i in \$(seq 1 30); do curl -fsS http://127.0.0.1:8787/api/health >/dev/null 2>&1 && { echo healthy; break; }; sleep 1; done
    if ! curl -fsS http://127.0.0.1:8787/api/health >/dev/null 2>&1; then
      journalctl -u miu-server -n 40 --no-pager
      if [ -n \"\$prev\" ]; then ln -sfn \"\$prev\" /opt/miu/current && systemctl restart miu-server; echo \"rolled back to \$prev\"; fi
      exit 1
    fi
    cd /opt/miu/releases && ls -1t | tail -n +6 | xargs -r rm -rf"

  echo "== public check"
  curl -fsS "https://$DOMAIN/api/health" && echo
}

case "${1:-}" in
  setup) setup ;;
  fonts) fonts ;;
  release) release ;;
  *) echo "usage: $0 setup|fonts|gate|release" >&2; exit 2 ;;
esac
