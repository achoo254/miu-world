---
name: project-family-only-defaults
description: Miu World security sweeps — features built when only the owner's family played (default timetable, HP001 font) became public when sign-in opened 2026-10-12
metadata:
  type: project
---

Sign-in opened to everyone on 2026-10-12. Things designed for "family only" were never re-gated: the default timetable (`TIMETABLE_DEFAULT_FILE`, the owner's real class with the teacher's name and phone) goes to every player who has not saved one, and the unlicensed HP001 handwriting font goes to any session. Found in the 2026-10-19 sweep (`plans/dattqh/reports/security-sweep-261019.md`).

**Why:** IDOR checks pass (everything is scoped to the account), yet shared defaults and private assets leak to strangers. The per-account tests can't catch this.
**How to apply:** in every security review, grep config/env for "owner"/"default"/private-file paths, and grep `docs/deployment-guide.md` for data that "every profile sees". Check what a brand-new stranger's account receives. Also check whether F1 (timetable) was fixed before you re-report it. See [[project-plan-review-heuristics]].
