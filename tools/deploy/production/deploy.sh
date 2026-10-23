#!/usr/bin/env bash
# Production deploy for Miu World on .65, run from a dev machine at the repo root.
#   tools/deploy/production/deploy.sh setup     one-time/idempotent: Postgres 16, Node 22, unit, backup timer,
#                                               journal namespace, nginx block, DB role, env file
#   tools/deploy/production/deploy.sh fonts     upload the worksheet handwriting font (kept out of git)
#   tools/deploy/production/deploy.sh timetable upload the default class timetable (kept out of git); restart to apply
#   tools/deploy/production/deploy.sh turn      write the voice relay (Cloudflare TURN) key into the env file; restart to apply
#   tools/deploy/production/deploy.sh signin    write the account-service (auth-next, miu-web) client into the env file;
#                                               before the first release that signs in through it (GOOGLE_* lines stay)
#   tools/deploy/production/deploy.sh google-cleanup  drop the former direct Google sign-in lines (GOOGLE_*), once that
#                                               release is live; restart to apply
#   tools/deploy/production/deploy.sh analytics write the Google Analytics (GA4) property and secret into the env file;
#                                               only after a release with the privacy page that tells it; restart to apply
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
  # Read before anything is written: a missing TURN or sign-in entry stops here, with the env file as it was.
  local signin; signin="$(signin_env)"
  local turn; turn="$(turn_env)"
  # The GA4 lines `analytics` wrote are kept as they are (both or none); setup never turns analytics on by itself.
  local ga; ga="$(analytics_env)"
  # Lines the owner set by hand (moderators, who sees the default timetable, the emergency switch) stay as they are.
  local kept; kept="$(owner_env)"
  {
    echo "NODE_ENV=production"
    echo "PORT=$PORT"
    echo "DATABASE_URL=postgres://miu:$pw@127.0.0.1:5432/miu"
    echo "ALLOWED_ORIGINS=https://$DOMAIN"
    printf '%s\n' "$signin"
    printf '%s\n' "$turn"
    [ -z "$ga" ] || printf '%s\n' "$ga"
    [ -z "$kept" ] || printf '%s\n' "$kept"
  } | prod 'install -m 640 -o root -g miu /dev/stdin /etc/miu/production.env'
  echo "setup done"
}

# Parent sign-in through the account service: the confidential web client `miu-web`, whose secret the IdP holds as
# MIU_WEB_CLIENT_SECRET (auth-next docs/deployment-guide.md). Issuer and client ids keep the server's defaults.
SIGNIN_ENTRY='.tokens[] | select(.service == "auth.hoandat.com" and .used_by == "miu-world") | .token'
signin_env() {
  local sec
  sec="$(secret "$SIGNIN_ENTRY.client_secret")" && [ "${#sec}" -ge 32 ] \
    || { echo "no auth.hoandat.com entry for miu-world (client_secret, 32+ characters) in access-tokens.json" >&2; return 1; }
  printf 'OIDC_WEB_CLIENT_SECRET=%s\nOIDC_REDIRECT_URI=https://%s/api/auth/callback\n' "$sec" "$DOMAIN"
}

# Puts (or replaces) the OIDC_* lines, every other line as it is (the running release still reads its GOOGLE_* ones).
signin() {
  local lines
  lines="$(signin_env)"
  printf '%s\n' "$lines" | prod 'set -e
    f=/etc/miu/production.env
    [ -s "$f" ] || { echo "no $f: run setup first" >&2; exit 1; }
    t=$(mktemp); trap "rm -f $t" EXIT
    grep -Ev "^OIDC_[A-Z_]+=" "$f" > "$t" || [ $? -eq 1 ]
    cat >> "$t"
    install -m 640 -o root -g miu "$t" "$f"
    grep -c "^OIDC_" "$f" | xargs echo OIDC lines in env file:'
}

# Drops the GOOGLE_* lines once a release that signs in through the account service is live (it ignores them).
google_cleanup() {
  prod 'set -e
    f=/etc/miu/production.env
    grep -q "^OIDC_WEB_CLIENT_SECRET=" "$f" || { echo "no OIDC_WEB_CLIENT_SECRET in $f: run signin and release first" >&2; exit 1; }
    t=$(mktemp); trap "rm -f $t" EXIT
    grep -Ev "^GOOGLE_[A-Z_]+=" "$f" > "$t" || [ $? -eq 1 ]
    install -m 640 -o root -g miu "$t" "$f"
    echo "GOOGLE_ lines left: $(grep -c "^GOOGLE_" "$f" || true)"'
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

# Google Analytics 4: the server sends anonymous usage events with this property and Measurement Protocol secret
# (docs/deployment-guide.md). Only production sets them, so dev numbers never mix in.
GA4_ENTRY='.tokens[] | select(.service == "analytics.google.com" and .used_by == "miu-world production") | .token'
ga4_from_tokens() {
  local id sec
  id="$(secret "$GA4_ENTRY.measurement_id")" && sec="$(secret "$GA4_ENTRY.api_secret")" \
    || { echo "no GA4 entry (token.measurement_id, token.api_secret) in access-tokens.json (docs/deployment-guide.md)" >&2; return 1; }
  # The same checks as the server's: a malformed value would stop it at start.
  [[ "$id" =~ ^G-[A-Z0-9]{6,12}$ ]] || { echo "GA4 measurement id in access-tokens.json is not G-XXXXXXXX" >&2; return 1; }
  [[ "$sec" =~ ^[^[:space:]]{8,128}$ ]] || { echo "GA4 API secret in access-tokens.json is empty or malformed" >&2; return 1; }
  printf 'GA4_MEASUREMENT_ID=%s\nGA4_API_SECRET=%s\n' "$id" "$sec"
}

# The GA4 lines already in /etc/miu/production.env, for `setup` to keep: both, or none. One alone would stop the server.
analytics_env() {
  local lines ids secrets
  lines="$(prod 'f=/etc/miu/production.env; [ ! -f "$f" ] || grep -E "^GA4_(MEASUREMENT_ID|API_SECRET)=.+" "$f" || [ $? -eq 1 ]')"
  ids="$(printf '%s\n' "$lines" | grep -c '^GA4_MEASUREMENT_ID=' || true)"
  secrets="$(printf '%s\n' "$lines" | grep -c '^GA4_API_SECRET=' || true)"
  if [ "$ids" = 0 ] && [ "$secrets" = 0 ]; then return 0; fi
  if [ "$ids" = 1 ] && [ "$secrets" = 1 ]; then printf '%s\n' "$lines"; return 0; fi
  echo "env file has $ids GA4_MEASUREMENT_ID and $secrets GA4_API_SECRET lines (needs one of each or none): run analytics" >&2
  return 1
}

# The lines the owner set by hand in /etc/miu/production.env, for `setup` to keep (never printed): moderators, the
# accounts that see the default timetable and its file (only while the owner keeps it on), the emergency online switch.
OWNER_ENV_KEYS='MODERATOR_ACCOUNTS|TIMETABLE_DEFAULT_ACCOUNTS|TIMETABLE_DEFAULT_FILE|ONLINE_MODE'
owner_env() {
  prod "f=/etc/miu/production.env; [ ! -f \"\$f\" ] || grep -E '^($OWNER_ENV_KEYS)=' \"\$f\" || [ \$? -eq 1 ]"
}

# Sending usage data to Google is allowed only once production already serves the policy that tells it: the version the
# public endpoint answers must be the one this checkout holds (content/legal/consent-vi.json). Reads nothing secret.
policy_is_live() {
  local want got
  want="$(jq -er '.version | select(type == "string" and test("^[A-Za-z0-9._-]{1,32}$"))' "$HERE/../../../content/legal/consent-vi.json")" \
    || { echo "cannot read the policy version in content/legal/consent-vi.json" >&2; return 1; }
  got="$(curl -fsS --max-time 10 "https://$DOMAIN/api/consents/policy" | jq -er '.version | select(type == "string" and test("^[A-Za-z0-9._-]{1,32}$"))')" \
    || { echo "cannot read the policy version production serves (https://$DOMAIN/api/consents/policy)" >&2; return 1; }
  [ "$got" = "$want" ] || {
    echo "production serves policy $got but this checkout holds $want: release the privacy page first, then run analytics" >&2
    return 1
  }
}

# Puts (or replaces) just the two GA4 lines in /etc/miu/production.env, leaving every other line as it is. Safe to run
# again; the next release (or a restart) starts sending. Refuses until the privacy page that tells it is live.
analytics() {
  policy_is_live || exit 1
  local lines
  lines="$(ga4_from_tokens)"
  printf '%s\n' "$lines" | prod 'set -e
    f=/etc/miu/production.env
    [ -s "$f" ] || { echo "no $f: run setup first" >&2; exit 1; }
    t=$(mktemp); trap "rm -f $t" EXIT
    # grep: 0 lines kept, 1 none kept (only GA4 lines), anything else an error that must not empty the file.
    grep -Ev "^GA4_(MEASUREMENT_ID|API_SECRET)=" "$f" > "$t" || [ $? -eq 1 ]
    cat >> "$t"
    install -m 640 -o root -g miu "$t" "$f"
    grep -c "^GA4_" "$f" | xargs echo GA4 lines in env file:'
}

# Worksheet handwriting font (no open license: kept out of git). Uploads the .woff2 files from
# $MIU_FONT_DIR (default .data/fonts of this checkout) to /opt/miu/fonts. Unused: the server no longer serves the
# font to anyone (the worksheet prints without the model letters); kept so the upload path is not lost.
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
  # Only the accounts in TIMETABLE_DEFAULT_ACCOUNTS see it (the server shows it to nobody in production without them).
  prod 'mkdir -p /opt/miu/config && install -m 640 -o root -g miu /dev/stdin /opt/miu/config/timetable-default.json \
    && (grep -q "^TIMETABLE_DEFAULT_FILE=" /etc/miu/production.env || echo "TIMETABLE_DEFAULT_FILE=/opt/miu/config/timetable-default.json" >> /etc/miu/production.env) \
    && grep -c "^TIMETABLE_DEFAULT_ACCOUNTS=" /etc/miu/production.env | xargs echo "timetable default on host; TIMETABLE_DEFAULT_ACCOUNTS lines:"' < "$file"
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
  # Crawlers are let in, and the sitemap lists the home page and every page under /bai/ (the subject and lesson pages).
  local pages; pages="$(find apps/web/dist/bai -name index.html 2>/dev/null | wc -l | tr -d ' ')"
  [ "$pages" -gt 0 ] || { echo "release build has no lesson pages under /bai" >&2; exit 1; }
  if grep -Eq '^Disallow:[[:space:]]*/[[:space:]]*$' apps/web/dist/robots.txt 2>/dev/null || ! grep -q '^Sitemap: ' apps/web/dist/robots.txt 2>/dev/null; then
    echo "release build: robots.txt shuts crawlers out or names no sitemap" >&2; exit 1
  fi
  [ "$(grep -c '<loc>' apps/web/dist/sitemap.xml 2>/dev/null)" -eq "$((pages + 1))" ] \
    || { echo "release build: sitemap.xml does not list the home page and the $pages pages under /bai" >&2; exit 1; }
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
  signin) signin ;;
  google-cleanup) google_cleanup ;;
  analytics) analytics ;;
  release) release ;;
  *) echo "usage: $0 setup|fonts|timetable|turn|signin|google-cleanup|analytics|gate|release" >&2; exit 2 ;;
esac
