# `archive/` — closed rows

Partitioned by phase: `archive/plan_<n>/`. At each phase's approval gate the coordinator
moves that phase's spent prompts and consumed handoffs here, together with the
approval-gate commit, so `prompts/` and `handoffs/` hold only live state.

Role stays in the filename and the frontmatter. Historical references to
`prompts/<file>` in tracker notes and Review logs are **never rewritten** — after
closeout they resolve here by convention.
