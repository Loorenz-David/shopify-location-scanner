# `prompts/` — the work-queue tables

One table per role. **A file here is a live directive**: it is either awaiting a session
of that role, or is currently being served by one. State is positional — when a phase
reaches APPROVED, its spent prompts move to `archive/plan_<n>/` in the coordinator's
closeout ritual. Nothing here is ever edited to change state, and no prompt is ever
reused across sessions (its state summary goes stale the moment it is written).

| Folder | Who reads it |
|---|---|
| `coordinator/` | the orchestrator — standing role docs and pre-dispatch lint records |
| `implementer/` | the implementing agent (Codex) — implement and fix prompts |
| `reviewer/` | the reviewing agent — projection (`round: 0`), review, and re-review prompts |
| `maintenance/` | out-of-band sweeps (drift scripts, graph repair) not owned by a phase |

**Row schema** — every prompt file carries frontmatter:

```yaml
---
plan: <n>            # phase number, or "-" for project-wide
role: implement | fix | projection | review | re-review | coordinator
round: <n>           # 0 = projection, 1 = first session of that role for the phase
date: YYYY-MM-DD
---
```

Standing role documents (no round) live in their role's folder and never archive.
Authority: `/Users/davidloorenz/agent-skills/pipeline-charter.md`.
