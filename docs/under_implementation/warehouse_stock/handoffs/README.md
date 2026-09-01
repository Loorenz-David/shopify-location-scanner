# `handoffs/` — the report tables

One table per producing role. **A file here is an unconsumed session report awaiting
the coordinator.** Once its lessons are folded and the tracker flipped, it stays here
until the phase's approval gate, when the closeout ritual moves it to
`archive/plan_<n>/`. A report written to any other path is invisible to this system —
the positional rule is what makes "is there anything outstanding?" answerable by `ls`.

**Row schema** — every handoff carries frontmatter:

```yaml
---
plan: <n>
role: implement | fix | projection | review | re-review
round: <n>
state: IMPLEMENTED | OWNER_DECISIONS_PENDING | CONSUMED
verdict: APPROVED | CHANGES_REQUESTED | PROJECTED_CLEAN | AMENDMENTS_REQUIRED   # reviewer rows
date: YYYY-MM-DD
actor: <model / agent>
---
```

**Every handoff body declares the session's full write perimeter** — documents, code,
and any tool-recorded state — so the coordinator can diff the claim against the tree
rather than reconstruct it. Mutation/planted-defect probes are listed separately from
the session's own changes, so "nothing changed outside the perimeter" stays falsifiable.

Owner-facing questions live in ONE section headed `⚠ OWNER DECISIONS REQUIRED (n)`,
placed immediately after the opening summary — never buried inside a finding. A handoff
with no cards says so in one line.

Authority: `/Users/davidloorenz/agent-skills/pipeline-charter.md`.
