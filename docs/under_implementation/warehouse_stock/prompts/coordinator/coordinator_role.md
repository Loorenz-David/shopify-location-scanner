---
plan: "-"
role: coordinator
round: "-"
date: 2026-09-01
---

# Standing coordinator brief — Location Stock System

This is a **standing** document (no round, never archives). It records what the owner
assigned in conversation, so no compaction can drop it.

## Actor assignment (owner, David, 2026-09-01)

| Pipeline role | Actor | Notes |
|---|---|---|
| Orchestration / coordination | **Claude Opus** (this session lineage) | authors every prompt just-in-time, consumes handoffs, folds back, keeps the tracker |
| Review | **the same Opus setup** | ratified in intention §25 — single-reviewer flow; there is no test suite to referee, so the reviewer re-derives criteria against code |
| Implementation | **Codex** | driven by self-contained prompt documents; never shares conversation state with the coordinator |
| Projection (round 0) | **a fresh Claude Opus session** (owner, 2026-09-01) | a *new* session, never a resume of the coordinator's — see "Projection actor" below |

Interop is by **artifact, never conversation** (charter). Codex has filesystem access, so
its prompts point it at the doctrine files by absolute path rather than inlining them.

## Doctrine paths (absolute — quote these in every prompt)

```
/Users/davidloorenz/agent-skills/pipeline-charter.md          # shared authority, read first
/Users/davidloorenz/agent-skills/implementation-executor.md   # implementer sessions
/Users/davidloorenz/agent-skills/plan-projection.md           # projection sessions (round 0)
/Users/davidloorenz/agent-skills/plan-reviewer.md             # review sessions
/Users/davidloorenz/agent-skills/pipeline-coordinator.md      # this role
```

## Projection actor — a fresh Opus session, and the constraint that makes it clean

`plan-projection.md` requires a session carrying **no planning context**: "what you cannot
derive from the artifacts, the implementer cannot either." The coordinator has read the
whole planning set and therefore cannot produce an unanchored projection of its own work.

**Owner's call, 2026-09-01: the projector is a fresh Claude Opus session**, not Codex.
Reasoning recorded so a later session does not re-open it: the projection is a
reviewer-role judgment act — reading a plan adversarially and classifying what it fails
to determine — and this project's reviewer is Opus. Using the implementing model as
projector would also make its first exposure to the phase an anchored one.

**Binding constraints on that session:**

1. It is a **new session**, never a resume or continuation of a coordinator session. The
   emptiness of its context *is* the instrument; a resume silently removes it.
2. Its read scope is the plan's Read-first list and the codebase — **not** `prompts/` or
   `handoffs/`, which carry the coordinator's own working notes.
3. Recalled memory is background, not authority. A memory entry describing this project
   is fine; the artifacts on disk win over it in every disagreement.
4. **The skeleton is discarded.** It never reaches the implementer — otherwise the
   projector has become a second planner and the fresh-session rule buys nothing. Codex
   receives only the plan file, the amended artifacts, and any delegation list the
   projection produced.

## Project-specific deviations from charter defaults

Full list in master plan §9 (owner-ratified). The two that reshape every prompt:

1. **No automated tests** (§0.11 / intention §22.10). Charter rule 1 is exempted. The
   evidence budget language ("L4 stamp", "named mutations", "suite baseline") does not
   apply as written. Its replacements, which every prompt states instead:
   - `npm run typecheck` green — the automated gate, run from `apps/backend`;
   - the phase's **committed** `verify-*.ts` script, all-PASS, output pasted into the
     Review log;
   - the phase's **Manual Scenarios** checklist, executed by the implementer and
     re-executed by the reviewer, expected-vs-observed recorded per step;
   - charter rule 15 survives intact and is the reviewer's job: **plant the phase's
     named defect probe and observe the instrument go red**, then revert. An instrument
     never seen to fail is not evidence.
2. **`scan-history.repository.ts` is out of perimeter for every phase** (§0.10). A need
   to touch it is a fold-back to the coordinator, never an edit.

## Gate state at the time of writing

- Intention header: **RATIFIED** (verified at source, `intention/raw_intention.md:3`).
- P1 gate-in (owner's property-key selection): **SATISFIED** —
  `context/property-options-selection.md`, "OWNER SELECTION — FINAL".
- Projection mandatory for P1, P2, P4 (master plan §3); waivable by the owner for
  P3, P5, P6 with a recorded line.

## Recurring failure modes to watch in this project

- **Typing a count instead of deriving it.** Every number in a prompt or plan sentence
  gets a command pasted beside it.
- **Gating on something the dispatch itself moves.** Gate on content the session's own
  work changes (a `state:` header, a symbol at a path) — never on a SHA, a dirty tree,
  or a file count. The docs folder here is partly untracked, so a "clean tree" gate
  would halt every session on day one.
- **Anchoring the projection.** Suspicions the coordinator already holds stay out of the
  projection prompt; a projection that finds what it was told to find measures nothing.
