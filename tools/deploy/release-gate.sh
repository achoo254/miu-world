# Release gate shared by tools/deploy/{production,staging}/deploy.sh (sourced, not run): a release goes out only
# when the screens pictured before it were reviewed with no blocking finding, the code has not changed since they were
# pictured, and CI passed on the commit pictured (docs/deployment-guide.md, docs/screen-review.md).
#   MIU_RELEASE_FORCE="<reason>"  lets an urgent fix through (CI broken for a reason outside the code): the reason is
#                                 printed and written beside REVISION in the release as RELEASE_FORCED.
#   MIU_GH_REPO                   the GitHub repository whose CI is asked (default achoo254/miu-world).
# Sets RELEASE_FORCED (the reason, or empty) for the caller.

# Read by the deploy script that sources this file.
# shellcheck disable=SC2034
RELEASE_FORCED=""

# Prints why the release is held and returns 1, or prints "được" and returns 0. Run from the root of a checkout, or
# of a tree exported from a commit (`git archive`, no .git) with MIU_RELEASE_REV naming that commit.
release_gate() {
  if [ -n "${MIU_RELEASE_FORCE:-}" ]; then
    # shellcheck disable=SC2034  # read by the deploy script that sources this file
    RELEASE_FORCED="$MIU_RELEASE_FORCE"
    echo "được (ép): bỏ qua cổng release vì: $MIU_RELEASE_FORCE"
    return 0
  fi
  local screens=assets/generated/review/screens
  local review="$screens/review.json"
  [ -f "$review" ] || { echo "chặn: chưa có $review; chụp và duyệt màn hình theo docs/screen-review.md" >&2; return 1; }

  # What the review says, read with node (no jq needed): the commit pictured, the verdict, the open blocking findings,
  # and whether both screen sizes were pictured from that commit with nothing outside docs/ and plans/ uncommitted.
  local facts
  # shellcheck disable=SC2016  # JavaScript for node, not shell
  facts="$(node -e '
    const fs = require("node:fs");
    const dir = process.argv[1];
    const review = JSON.parse(fs.readFileSync(`${dir}/review.json`, "utf8"));
    const open = (review.findings ?? []).filter((f) => f.severity === "block" && !f.fixedIn).length;
    const sizes = ["360x740", "820x1180"].map((s) => {
      try { return JSON.parse(fs.readFileSync(`${dir}/${s}/shots.json`, "utf8")); } catch { return null; }
    });
    const mismatch = sizes.some((s) => s === null || s.capturedFrom !== review.capturedFrom);
    const dirty = sizes.flatMap((s) => (s?.uncommitted ?? []).filter((f) => !f.startsWith("docs/") && !f.startsWith("plans/")));
    console.log([review.capturedFrom ?? "", review.verdict ?? "", open, mismatch ? 1 : 0, dirty.length].join(" "));
  ' "$screens")" || { echo "chặn: không đọc được $review" >&2; return 1; }
  local pictured verdict open mismatch dirty
  read -r pictured verdict open mismatch dirty <<<"$facts"

  [ -n "$pictured" ] || { echo "chặn: $review không ghi capturedFrom" >&2; return 1; }
  [ "$mismatch" = 0 ] || { echo "chặn: ảnh hai khổ không cùng chụp ở commit ${pictured:0:8} của lần duyệt; chụp lại" >&2; return 1; }
  [ "$dirty" = 0 ] || { echo "chặn: lúc chụp có $dirty file code chưa commit; commit rồi chụp lại từ cây sạch" >&2; return 1; }
  if [ "$verdict" != pass ] || [ "$open" != 0 ]; then
    echo "chặn: lần duyệt ảnh ở ${pictured:0:8} kết luận '$verdict', còn $open phát hiện block chưa sửa" >&2
    return 1
  fi

  # The code released is the code pictured: since then only the pictures, the manifest, plans and docs may change.
  if git rev-parse --git-dir >/dev/null 2>&1; then
    git cat-file -e "$pictured^{commit}" 2>/dev/null || { echo "chặn: không có commit ${pictured:0:8} ở máy này; git fetch" >&2; return 1; }
    local changed
    changed="$(git diff --name-only "$pictured" HEAD -- . ':(exclude)assets/generated/review/screens' ':(exclude)assets/manifest.json' ':(exclude)assets/LICENSES.md' ':(exclude)plans' ':(exclude)docs' | wc -l | tr -d ' ')"
    if [ "$changed" != 0 ]; then
      echo "chặn: ảnh đã cũ: chụp ở ${pictured:0:8}, sau đó đã đổi $changed file ngoài ảnh, manifest, plans, docs; chụp và duyệt lại" >&2
      return 1
    fi
  else
    local rev="${MIU_RELEASE_REV:-}"
    case "$pictured" in
      "$rev"*) [ -n "$rev" ] || { echo "chặn: cây không có .git: đặt MIU_RELEASE_REV là sha của commit đã export" >&2; return 1; } ;;
      *) echo "chặn: ảnh chụp ở ${pictured:0:8}, cây export là '${rev:-?}'; chụp từ chính commit đó" >&2; return 1 ;;
    esac
  fi

  # CI of the commit pictured (not of HEAD: a commit that only adds the pictures needs no CI run of its own).
  local repo="${MIU_GH_REPO:-achoo254/miu-world}" runs
  runs="$(gh run list -R "$repo" --workflow ci --commit "$pictured" --json status,conclusion,url --limit 5 2>/dev/null)" \
    || { echo "chặn: không hỏi được CI qua gh (gh auth status; mạng)" >&2; return 1; }
  local ci
  # shellcheck disable=SC2016  # JavaScript for node, not shell
  ci="$(node -e '
    const runs = JSON.parse(process.argv[1]);
    if (runs.length === 0) { console.log("none -"); process.exit(0); }
    const done = runs.find((r) => r.status === "completed" && r.conclusion === "success");
    const latest = runs[0];
    console.log(done ? `success ${done.url}` : `${latest.status === "completed" ? latest.conclusion : latest.status} ${latest.url}`);
  ' "$runs")"
  local state url
  read -r state url <<<"$ci"
  case "$state" in
    success) ;;
    none) echo "chặn: CI chưa chạy cho ${pictured:0:8}; push commit đó và đợi CI" >&2; return 1 ;;
    queued | in_progress | waiting | pending | requested) echo "chặn: CI của ${pictured:0:8} đang chạy ($state): $url" >&2; return 1 ;;
    *) echo "chặn: CI đỏ ở ${pictured:0:8} ($state): $url" >&2; return 1 ;;
  esac

  echo "được: ảnh chụp ở ${pictured:0:8} đã duyệt (không còn block), code không đổi từ đó, CI xanh: $url"
}
