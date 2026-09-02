# `handoffs/frontend/` — the cross-track exchange table

**Not a charter table.** The charter's `handoffs/<role>/` tables hold reports produced *by
pipeline sessions* and awaiting the coordinator. This one holds a conversation with an
**external track** — the frontend, built in parallel on `main` by its own owner-driven
pipeline — and it carries traffic in **both** directions. That deviation is recorded here
rather than left implicit, per the charter's rule that state is positional and a row at an
unexpected path is invisible.

**Why it exists.** The frontend's first request arrived as a loose file in a folder that was
not a table at all (`frontend_handoffs/`), and nothing short of a manual sweep would have
found it. A declared report at a wrong path is state the positional system cannot see. This
table is the declared path.

**Direction is a column.** Every row carries `direction: frontend → backend` or
`backend → frontend` in its frontmatter, because the usual "a file here awaits the
coordinator" reading is only true of inbound rows.

| Row | Direction | State |
|---|---|---|
| `handoff_report_endpoint_request.md` | frontend → backend | CONSUMED — accepted in full, ratified as intention §26 |
| `handoff_report_contract_v1_2_notice.md` | backend → frontend | DELIVERED — answers the above; contract reissued v1.2 |

**Inbound rows** are consumed like any handoff: read adversarially, routed to their home
artifact, stamped `CONSUMED` with a note saying where each item landed. **Outbound rows** are
deliverables — they are never archived while the track they address is still building
against them.

**One document, not two (owner, 2026-09-01).** v1.2 and v1.3 each crossed as a contract *plus* a
companion notice. From v1.4 the contract carries its own explanation — the amendment is written
into the section it changes, with the reasoning and a worked example where the reader needs them
— so **exactly one file crosses** and there is one place to look afterwards. The notices already
in this table stay as the historical record of those rounds; no new ones are written.

**What crosses, and what does not.** This pipeline owns exactly one frontend-facing
deliverable (intention §23.4): `contracts/frontend-api-contract.md`. Notices in this table
explain and announce it; they never replace it. The two tracks sit on different branches, so
**a contract version is not delivered until the file itself reaches `main`** — the coordinator
does not write into `apps/frontend/`, which is the other track's territory. Routing that
crossing is the owner's.

Authority: `/Users/davidloorenz/agent-skills/pipeline-charter.md` (folder layout, row schema).
