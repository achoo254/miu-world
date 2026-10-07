#!/usr/bin/env bash
# Production deploy for Miu World on .65, run from a dev machine at the repo root.
#   tools/deploy/production/deploy.sh setup     one-time/idempotent: Postgres 16, Node 22, unit, backup timer,
#                                               journal namespace, nginx block, DB role, env file
#   tools/deploy/production/deploy.sh fonts     upload the worksheet handwriting font (kept out of git)
#   tools/deploy/production/deploy.sh timetable upload the default class timetable (kept out of git); restart to apply
#   tools/deploy/production/deploy.sh turn      write the voice relay (Cloudflare TURN) key into the env file; restart to apply
#   tools/deploy/production/deploy.sh gate      check the release gate only (tools/deploy/release-gate.sh), touching no server
#   tools/deploy/production/deploy.sh release   release gate, build, back up the DB, upload, switch, health-check
# Production holds real children's data and .65 is shared: ask the owner before EVERY run
# (docs/deployment-guide.md §1). Credentials come from $ALL_IN_ONE_STAGING_DEV (the .65 entry
# SSH_SERVER_STAGING lives there) and the access-tokens.json beside it. No value is printed; secrets
# travel over ssh stdin only.
set -euo pipefail

HOST=SSH_SERVER_STAGING
DOMAIN=miu.hoandat.com
PORT=8797
HERE="$(cd "$(dirname "$0")" && pwd)"
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

KEY=""
cleanup() { [ -n "$KEY" ] && rm -f "$KEY"; return 0; }
trap cleanup EXIT
prod() {
  if [ -z "$KEY" ]; then
    KEY="$(mktemp)"; chmod 600 "$KEY"; srv $HOST private_key > "$KEY"
  fi
  ssh -i "$KEY" -o IdentitiesOnly=yes -o ConnectTimeout=10 -p "$(srv $HOST port)" "$(srv $HOST user)@$(srv $HOST host)" "$@"
}

setup() {
  echo "== host"
  tar --no-xattrs -C "$HERE" -cf - . | prod 'rm -rf /tmp/miu-prod-setup && mkdir -p /tmp/miu-prod-setup && tar --no-same-owner -xf - -C /tmp/miu-prod-setup && bash /tmp/miu-prod-setup/setup-prod-host.sh'

  echo "== database role"
  local pg='.tokens[] | select(.service == "postgresql" and (.used_by | startswith("miu-world production"))) | .token'
  local pw; pw="$(secret "$pg.password")"
  # Hex password: safe inside a SQL literal. Sent as SQL on stdin, so it never shows in a process list.
  printf "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'miu') THEN CREATE ROLE miu LOGIN; END IF; END \$\$;\nALTER ROLE miu WITH LOGIN PASSWORD '%s';\nSELECT 'CREATE DATABASE miu OWNER miu' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'miu')\\\\gexec\n" "$pw" \
    | prod 'cd /tmp && sudo -u postgres psql -q -v ON_ERROR_STOP=1 -d postgres'

  echo "== env file"
  local google='.tokens[] | select(.service == "accounts.google.com" and .used_by == "miu-world") | .token'
  # Read before anything is written: a missing TURN entry stops here, with the env file as it was.
  local turn; turn="$(turn_env)"
  {
    echo "NODE_ENV=production"
    echo "PORT=$PORT"
    echo "DATABASE_URL=postgres://miu:$pw@127.0.0.1:5432/miu"
    echo "ALLOWED_ORIGINS=https://$DOMAIN"
    echo "GOOGLE_CLIENT_ID=$(secret "$google.client_id")"
    echo "GOOGLE_CLIENT_SECRET=$(secret "$google.client_secret")"
    echo "GOOGLE_REDIRECT_URI=https://$DOMAIN/api/auth/google/callback"
    echo "HANDWRITING_FONT_DIR=/opt/miu/fonts"
    echo "TIMETABLE_DEFAULT_FILE=/opt/miu/config/timetable-default.json"
    printf '%s\n' "$turn"
  } | prod 'install -m 640 -o root -g miu /dev/stdin /etc/miu/production.env'
  echo "setup done"
}

# The voice relay key: the server asks Cloudflare for short-lived TURN credentials with it (docs/deployment-guide.md).
TURN_ENTRY='.tokens[] | select(.service == "rtc.live.cloudflare.com (TURN)") | .token'
turn_env() {
  local id tok
  # Both or nothing: an empty value would stop the server at start.
  id="$(secret "$TURN_ENTRY.key_id")" && tok="$(secret "$TURN_ENTRY.api_token")" && [ -n "$id" ] && [ -n "$tok" ] \
    || { echo "no TURN entry in access-tokens.json (docs/deployment-guide.md)" >&2; return 1; }
  printf 'CF_TURN_KEY_ID=%s\nCF_TURN_API_TOKEN=%s\n' "$id" "$tok"
}

# Puts (or replaces) just the two TURN lines in /etc/miu/production.env, leaving every other line as it is. Safe to
# run again; the next release (or a restart) picks them up.
turn() {
  local lines
  lines="$(turn_env)"
  printf '%s\n' "$lines" | prod 'set -e
    f=/etc/miu/production.env
    [ -s "$f" ] || { echo "no $f: run setup first" >&2; exit 1; }
    t=$(mktemp); trap "rm -f $t" EXIT
    # grep: 0 lines kept, 1 none kept (only TURN lines), anything else an error that must not empty the file.
    grep -Ev "^CF_TURN_(KEY_ID|API_TOKEN)=" "$f" > "$t" || [ $? -eq 1 ]
    cat >> "$t"
    install -m 640 -o root -g miu "$t" "$f"
    grep -c "^CF_TURN_" "$f" | xargs echo TURN lines in env file:'
}

# Worksheet handwriting font (no open license: kept out of git). Uploads the .woff2 files from
# $MIU_FONT_DIR (default .data/fonts of this checkout) to /opt/miu/fonts; served only to signed-in parents.
fonts() {
  local dir="${MIU_FONT_DIR:-.data/fonts}"
  ls "$dir"/*.woff2 >/dev/null 2>&1 || { echo "no .woff2 in $dir: set MIU_FONT_DIR" >&2; exit 1; }
  tar --no-xattrs -C "$dir" -cf - $(cd "$dir" && ls *.woff2) \
    | prod 'tar --no-same-owner -xf - -C /opt/miu/fonts && chown root:miu /opt/miu/fonts/*.woff2 && chmod 640 /opt/miu/fonts/*.woff2 && ls /opt/miu/fonts | wc -l | xargs echo fonts on host:'
}

# The owner's class timetable every child starts from (names a school and a teacher: kept out of git). Uploads
# $MIU_TIMETABLE_FILE (default .data/private/timetable-default.json, from `pnpm private:sync`) to /opt/miu/config
# and points the env file at it; the next release (or a restart) picks it up.
timetable() {
  local file="${MIU_TIMETABLE_FILE:-.data/private/timetable-default.json}"
  [ -f "$file" ] || { echo "no $file: run pnpm private:sync or set MIU_TIMETABLE_FILE" >&2; exit 1; }
  prod 'mkdir -p /opt/miu/config && install -m 640 -o root -g miu /dev/stdin /opt/miu/config/timetable-default.json \
    && (grep -q "^TIMETABLE_DEFAULT_FILE=" /etc/miu/production.env || echo "TIMETABLE_DEFAULT_FILE=/opt/miu/config/timetable-default.json" >> /etc/miu/production.env) \
    && echo timetable default on host' < "$file"
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
  # The game only: no review page, render tool page or review screenshots in production.
  pnpm --filter @miu/web build:release >/dev/null
  # Only the character portraits the UI shows may remain under generated/review.
  [ ! -e apps/web/dist/review.html ] && [ ! -e apps/web/dist/preview.html ] \
    && [ -z "$(ls apps/web/dist/game-assets/generated/review 2>/dev/null | grep -vx character)" ] \
    || { echo "release build still carries review material" >&2; exit 1; }
  pnpm --filter @miu/server bundle >/dev/null
  pnpm -s security:dist

  echo "== backup database"
  prod "cd /tmp && sudo -u postgres pg_dump -Fc miu > /var/backups/miu/before-$id.dump && ls -l /var/backups/miu/before-$id.dump | awk '{print \$5\" bytes\"}'"

  echo "== upload"
  echo "$rev" > apps/server/dist/server/REVISION
  # A release let through the gate by MIU_RELEASE_FORCE keeps the reason on the host, beside REVISION.
  rm -f apps/server/dist/server/RELEASE_FORCED
  [ -z "$RELEASE_FORCED" ] || printf '%s\n' "$RELEASE_FORCED" > apps/server/dist/server/RELEASE_FORCED
  tar --no-xattrs -cf - apps/web/dist apps/server/dist/server apps/server/drizzle content \
    | prod "mkdir -p /opt/miu/releases/$id && tar --no-same-owner -xf - -C /opt/miu/releases/$id"

  echo "== switch and restart"
  prod "set -e
    prev=\$(readlink /opt/miu/current || true)
    ln -sfn /opt/miu/releases/$id /opt/miu/current.new && mv -T /opt/miu/current.new /opt/miu/current
    systemctl restart miu-server
    for i in \$(seq 1 30); do curl -fsS http://127.0.0.1:$PORT/api/health >/dev/null 2>&1 && { echo healthy; break; }; sleep 1; done
    if ! curl -fsS http://127.0.0.1:$PORT/api/health >/dev/null 2>&1; then
      journalctl --namespace=miu -u miu-server -n 40 --no-pager
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
  timetable) timetable ;;
  turn) turn ;;
  release) release ;;
  *) echo "usage: $0 setup|fonts|timetable|turn|gate|release" >&2; exit 2 ;;
esac
