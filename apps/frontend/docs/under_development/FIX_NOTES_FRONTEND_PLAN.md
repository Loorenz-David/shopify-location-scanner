# FIX NOTES — FRONTEND IMPLEMENTATION PLAN

## Summary

Two vertical slices that build on the existing `fixItem` / `isItemFixed` logistic flow:

**Slice A — Mark Intention: fixNotes input**
When the seller toggles the "Fix item" switch in `MarkIntentionOverlay`, a `fixNotes` textarea
slides in with automatic focus. The note is submitted alongside the rest of the intention payload
(`POST /logistic/intentions`).

**Slice B — Fix Item Detail overlay**
When a worker/manager card has `cardAction === "markItemPlacement"` AND
`item.fixItem === true && item.isItemFixed === false`, tapping the "Place" button opens a new
sliding overlay (using the existing `SlidingOverlayContainer`) instead of going straight to the
scanner. The overlay shows the fix note (or "No note"), allows inline editing via a toggle-edit
pattern, and exposes a "Place" button at the bottom that closes the overlay and opens the
placement scanner.

---

## Feature Location Map

```
Slice A — intention + fix notes
  apps/frontend/src/features/logistic-tasks/
    types/
      logistic-tasks.dto.ts                  ← add fixNotes to MarkIntentionRequestDto
                                               and LogisticTaskItemDto
      logistic-tasks.types.ts                ← add fixNotes to LogisticTaskItem
    domain/
      logistic-tasks.domain.ts               ← update normalizeLogisticTaskItem mapper
    controllers/
      logistic-tasks-optimistic.controller.ts ← pass fixNotes through optimisticMarkIntention
    actions/
      logistic-tasks.actions.ts              ← add fixNotes param to markIntention
    ui/
      MarkIntentionOverlay.tsx               ← add conditional fixNotes textarea

Slice B — fix item detail overlay
  apps/frontend/src/features/logistic-tasks/
    api/
      update-fix-notes.api.ts                ← new: PATCH /logistic/fix-notes/:scanHistoryId
    context/
      logistic-tasks-page-context.ts         ← add openFixItemDetail to context shape
      logistic-tasks-page.context.tsx        ← implement openFixItemDetail
    actions/
      logistic-tasks.actions.ts              ← add updateFixNotes + openFixItemDetail actions
    ui/
      FixItemDetailOverlay.tsx               ← new overlay component
      LogisticTasksCard.tsx                  ← route to fix item detail when conditions met
    LogisticTasksOverlayHost.tsx             ← add case for fix-item-detail overlay page id
```

---

## Slice A: Mark Intention — fixNotes input

### A.1 — `types/logistic-tasks.dto.ts`

Add `fixNotes` to the request DTO and the item DTO:

```typescript
// MarkIntentionRequestDto — add optional field
export interface MarkIntentionRequestDto {
  scanHistoryId: string;
  intention: LogisticIntentionDto;
  fixItem: boolean;
  fixNotes?: string;          // ← add
  scheduledDate?: string;
}

// LogisticTaskItemDto — add field (nullable, server may return null)
export interface LogisticTaskItemDto {
  // ... existing fields ...
  fixNotes: string | null;    // ← add after isItemFixed
}
```

### A.2 — `types/logistic-tasks.types.ts`

Add `fixNotes` to the domain type:

```typescript
export interface LogisticTaskItem {
  // ... existing fields ...
  fixNotes: string | null;    // ← add after isItemFixed
}
```

### A.3 — `domain/logistic-tasks.domain.ts`

Update `normalizeLogisticTaskItem` to map the new field:

```typescript
// Inside the existing normalizer, alongside isItemFixed:
fixNotes: dto.fixNotes ?? null,
```

### A.4 — `controllers/logistic-tasks-optimistic.controller.ts`

Thread `fixNotes` through `optimisticMarkIntention` so the store reflects the note immediately:

```typescript
export function optimisticMarkIntention(
  scanHistoryId: string,
  intention: LogisticIntention,
  fixItem: boolean,
  scheduledDate?: string,
  fixNotes?: string,          // ← add param
): LogisticTaskItem | null {
  // ...
  const updatedItem: LogisticTaskItem = {
    ...item,
    intention,
    fixItem,
    fixNotes: fixItem ? (fixNotes ?? null) : null,   // ← clear note when fixItem toggled off
    scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
    lastEventType: "marked_intention",
    logisticLocation: null,
  };
  // ... rest unchanged
}
```

> When `fixItem` is false the note is cleared optimistically — mirrors the backend behaviour where
> `fixNotes` is only meaningful on fix items.

### A.5 — `actions/logistic-tasks.actions.ts`

Add `fixNotes` to `markIntention`:

```typescript
async markIntention(
  scanHistoryId: string,
  intention: LogisticIntention,
  fixItem: boolean,
  scheduledDate?: string,
  fixNotes?: string,          // ← add param (last, optional)
): Promise<void> {
  const prev = optimisticMarkIntention(
    scanHistoryId,
    intention,
    fixItem,
    scheduledDate,
    fixNotes,                 // ← pass through
  );
  homeShellActions.closeOverlayPage();

  try {
    await markIntentionApi({
      scanHistoryId,
      intention,
      fixItem,
      fixNotes,               // ← pass through (undefined if not provided)
      scheduledDate,
    });
  } catch {
    if (prev) useLogisticTasksStore.getState().upsertItem(prev);
    useLogisticTasksStore
      .getState()
      .finishWithError("Unable to mark intention. Please try again.");
  }
},
```

### A.6 — `ui/MarkIntentionOverlay.tsx`

Add a `fixNotes` textarea that appears when `fixItem === true`.

**State additions:**
```typescript
const [fixNotes, setFixNotes] = useState("");
const fixNotesRef = useRef<HTMLTextAreaElement>(null);
```

**Auto-focus effect** — fires when `fixItem` flips to `true`:
```typescript
useEffect(() => {
  if (fixItem) {
    // Small delay lets the expand animation finish before focusing
    const t = setTimeout(() => fixNotesRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }
}, [fixItem]);
```

**Textarea — placed immediately below the fix-item switch row:**
```tsx
{fixItem && (
  <div className="flex flex-col gap-1.5">
    <label
      htmlFor="fix-notes"
      className="text-sm font-medium text-slate-900"
    >
      Fix note{" "}
      <span className="text-xs font-normal text-slate-500">(optional)</span>
    </label>
    <textarea
      id="fix-notes"
      ref={fixNotesRef}
      rows={3}
      maxLength={500}
      className="resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-green-500 focus:outline-none"
      placeholder="Describe what needs fixing…"
      value={fixNotes}
      onChange={(e) => setFixNotes(e.target.value)}
    />
    <p className="text-right text-[10px] text-slate-400">
      {fixNotes.length}/500
    </p>
  </div>
)}
```

**Resetting notes when fixItem is turned off:**
```typescript
// In the switch onClick handler, clear notes when toggling off
onClick={() => {
  const next = !fixItem;
  setFixItem(next);
  if (!next) setFixNotes("");
}}
```

**Passing notes on submit:**
```typescript
await logisticTasksActions.markIntention(
  scanHistoryId,
  selected,
  fixItem,
  scheduledDate || undefined,
  fixItem && fixNotes.trim() ? fixNotes.trim() : undefined,  // ← add
);
```

---

## Slice B: Fix Item Detail Overlay

### B.1 — `api/update-fix-notes.api.ts` (new file)

```
apps/frontend/src/features/logistic-tasks/api/update-fix-notes.api.ts
```

```typescript
import { apiClient } from "../../../core/api-client";

export async function updateFixNotesApi(input: {
  scanHistoryId: string;
  fixNotes: string | null;
}): Promise<void> {
  await apiClient.patch(
    `/logistic/fix-notes/${input.scanHistoryId}`,
    { fixNotes: input.fixNotes },
    { requiresAuth: true },
  );
}
```

### B.2 — `context/logistic-tasks-page-context.ts`

Add `openFixItemDetail` to the context shape:

```typescript
export interface LogisticTasksPageContextValue {
  activeScanHistoryId: string | null;
  openMarkIntention: (scanHistoryId: string) => void;
  openFixItemDetail: (scanHistoryId: string) => void;  // ← add
}
```

### B.3 — `context/logistic-tasks-page.context.tsx`

Implement `openFixItemDetail`:

```typescript
const openFixItemDetail = (scanHistoryId: string) => {
  setActiveScanHistoryId(scanHistoryId);
  logisticTasksActions.openFixItemDetail(scanHistoryId);
};

// Pass into provider value:
<LogisticTasksPageContext.Provider
  value={{ activeScanHistoryId, openMarkIntention, openFixItemDetail }}
>
```

### B.4 — `actions/logistic-tasks.actions.ts`

Add two new actions:

```typescript
openFixItemDetail(scanHistoryId: string): void {
  homeShellActions.openOverlayPage(
    `logistic-tasks-fix-item-detail:${scanHistoryId}`,
    "Fix Details",
  );
},

async updateFixNotes(
  scanHistoryId: string,
  fixNotes: string | null,
): Promise<void> {
  // Optimistic update
  const existing = useLogisticTasksStore
    .getState()
    .items.find((i) => i.id === scanHistoryId);
  if (existing) {
    useLogisticTasksStore
      .getState()
      .upsertItem({ ...existing, fixNotes });
  }

  try {
    await updateFixNotesApi({ scanHistoryId, fixNotes });
  } catch {
    if (existing) {
      useLogisticTasksStore.getState().upsertItem(existing);
    }
    useLogisticTasksStore
      .getState()
      .finishWithError("Unable to update fix note. Please try again.");
  }
},
```

Import `updateFixNotesApi` from `../api/update-fix-notes.api`.

### B.5 — `LogisticTasksOverlayHost.tsx`

Add the case for the new overlay page ID:

```typescript
import { FixItemDetailOverlay } from "./ui/FixItemDetailOverlay";

// In LogisticTasksOverlayHost, after the mark-intention case:
if (overlayPageId?.startsWith("logistic-tasks-fix-item-detail:")) {
  const scanHistoryId = overlayPageId.slice(
    "logistic-tasks-fix-item-detail:".length,
  );
  return (
    <FixItemDetailOverlay
      scanHistoryId={scanHistoryId}
      onClose={homeShellActions.closeOverlayPage}
    />
  );
}
```

### B.6 — `ui/LogisticTasksCard.tsx`

Update `handleAction` to intercept the placement action when the fix-detail conditions are met:

```typescript
const handleAction = () => {
  if (cardAction === "markItemIntention") {
    ctx?.openMarkIntention(item.id);
  } else if (item.fixItem === true && item.isItemFixed === false) {
    // Route through the fix item detail overlay first
    ctx?.openFixItemDetail(item.id);
  } else {
    logisticTasksActions.openPlacementScanner(item.id);
  }
};
```

No other changes to `LogisticTasksCard.tsx`.

### B.7 — `ui/FixItemDetailOverlay.tsx` (new file)

```
apps/frontend/src/features/logistic-tasks/ui/FixItemDetailOverlay.tsx
```

**Props:**
```typescript
interface FixItemDetailOverlayProps {
  scanHistoryId: string;
  onClose: () => void;
}
```

**Local state:**
```typescript
const [isEditing, setIsEditing] = useState(false);
const [draftNote, setDraftNote] = useState("");
const [isSaving, setIsSaving] = useState(false);
const textareaRef = useRef<HTMLTextAreaElement>(null);

const item = useLogisticTasksStore((s) =>
  s.items.find((i) => i.id === scanHistoryId) ?? null,
);
```

**Edit toggle — auto-populates draft from current note:**
```typescript
const handleStartEdit = () => {
  setDraftNote(item?.fixNotes ?? "");
  setIsEditing(true);
  setTimeout(() => textareaRef.current?.focus(), 60);
};
```

**Save handler:**
```typescript
const handleSave = async () => {
  setIsSaving(true);
  await logisticTasksActions.updateFixNotes(
    scanHistoryId,
    draftNote.trim() || null,   // empty string saved as null
  );
  setIsSaving(false);
  setIsEditing(false);
};
```

**Place handler — close overlay then open scanner:**
```typescript
const handlePlace = () => {
  onClose();
  logisticTasksActions.openPlacementScanner(scanHistoryId);
};
```

**Render:**
```tsx
<div className="flex h-svh flex-col">
  {/* Header */}
  <header
    className="flex shrink-0 items-center justify-between border-b border-slate-900/10 px-4 py-4"
    style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
  >
    <button
      type="button"
      className="grid h-8 w-8 place-items-center rounded-full text-slate-500"
      onClick={onClose}
      aria-label="Close"
    >
      <CloseIcon className="h-5 w-5" aria-hidden="true" />
    </button>
    <p className="text-sm font-semibold text-slate-900">Fix Details</p>
    <div className="w-8" /> {/* spacer to centre the title */}
  </header>

  {/* Body */}
  <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
    {/* Fix note section */}
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Fix note
        </p>

        {/* Edit / Save icon button */}
        {!isEditing ? (
          <button
            type="button"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={handleStartEdit}
            aria-label="Edit fix note"
          >
            <WriteIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-60"
            disabled={isSaving}
            onClick={() => void handleSave()}
            aria-label="Save fix note"
          >
            <CheckIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Display mode */}
      {!isEditing && (
        <p
          className={`mt-2 text-sm ${
            item?.fixNotes ? "text-slate-900" : "italic text-slate-400"
          }`}
        >
          {item?.fixNotes ?? "No note"}
        </p>
      )}

      {/* Edit mode */}
      {isEditing && (
        <textarea
          ref={textareaRef}
          rows={4}
          maxLength={500}
          className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-green-500 focus:outline-none"
          value={draftNote}
          onChange={(e) => setDraftNote(e.target.value)}
        />
      )}
    </div>
  </div>

  {/* Footer — Place button */}
  <div
    className="shrink-0 border-t border-slate-900/10 bg-white px-5 py-4"
    style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
  >
    <button
      type="button"
      className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white active:bg-green-700"
      onClick={handlePlace}
    >
      Place Item
    </button>
  </div>
</div>
```

**Icon imports** required in this component:
- `CloseIcon` — already used in `ScannerLogisticPlacementPage.tsx`
- `WriteIcon` — already used in `ScannerLogisticPlacementPage.tsx`
- `CheckIcon` — check the `assets/icons` barrel for the correct export name; if absent, use an
  inline SVG checkmark (same pattern as `ScannerLogisticPlacementPage.tsx` confirmation state)

---

## Data / State Lifecycle

```
Slice A — marking intention with fix note

  Seller opens MarkIntentionOverlay
  → selects intention, toggles fixItem ON
  → fixNotes textarea slides in, auto-focuses
  → seller types note
  → taps "Save Intention"
  → markIntention(id, intention, true, date, noteText)
      → optimisticMarkIntention(…, noteText)
          → store.upsertItem({ ...item, intention, fixItem: true, fixNotes: noteText, … })
      → homeShellActions.closeOverlayPage()
      → POST /logistic/intentions { …, fixItem: true, fixNotes: noteText }
      → WS logistic_intention_set → refreshByIds([id]) → confirms/corrects store

  If fixItem toggled OFF before submit:
  → fixNotes cleared from state
  → note sent as undefined (omitted from body)
  → optimistic: fixNotes set to null in store


Slice B — fix item detail flow

  Worker sees card with fixItem=true && isItemFixed=false
  → taps "Place"
  → LogisticTasksCard.handleAction
  → ctx.openFixItemDetail(scanHistoryId)
      → setActiveScanHistoryId(scanHistoryId)
      → homeShellActions.openOverlayPage("logistic-tasks-fix-item-detail:{id}", "Fix Details")
      → SlidingOverlayContainer opens
      → LogisticTasksOverlayHost routes to FixItemDetailOverlay

  Worker reads fix note, optionally edits:
  → taps edit icon (WriteIcon) → isEditing=true, draft populated, textarea focused
  → edits text
  → taps save icon (CheckIcon)
      → logisticTasksActions.updateFixNotes(id, trimmedNote | null)
          → optimistic: store.upsertItem({ ...item, fixNotes: newNote })
          → PATCH /logistic/fix-notes/:id { fixNotes: newNote }
          → on error: rollback + finishWithError
      → isEditing=false

  Worker taps "Place Item":
  → handlePlace()
  → onClose() → homeShellActions.closeOverlayPage() → SlidingOverlayContainer closes
  → logisticTasksActions.openPlacementScanner(scanHistoryId)
      → scanner-logistic-placement store set
      → homeShellActions.openFullFeaturePage("scanner-logistic-placement")
      → FullFeatureOverlayContainer opens scanner
  → [existing placement flow continues unchanged]
```

---

## Risk Register

| Risk | Mitigation |
|---|---|
| `fixNotes` not yet present in `LogisticTaskItemDto` — server returns 200 but dto shape mismatch | Add field with `?? null` fallback in normalizer — safe even if older server sends field missing |
| User taps "Place" while unsaved edit is open | `handlePlace` does not save draft — draft is discarded. This is intentional: the edit must be explicitly saved. |
| `item` is null inside `FixItemDetailOverlay` (removed from store by WS before overlay closes) | Guard with `if (!item) return null` — renders nothing, overlay stays mounted but blank. |
| `openFixItemDetail` called but context is null (card rendered outside provider) | `ctx?.openFixItemDetail` — optional chain; no action if context is absent. Placement falls through to direct scanner on next render. |
| `fixNotes` submitted as empty string instead of null | `fixItem && fixNotes.trim() ? fixNotes.trim() : undefined` in overlay submit; `draftNote.trim() \|\| null` in save handler — normalised at both call sites. |
| `FixItemDetailOverlay` mounts before `SlidingOverlayReadyContext` is ready (auto-focus fires too early) | Existing `SlidingOverlayReadyContext` exposes `isReady` boolean. If needed, gate the focus timeout behind `isReady`. The 60–80ms delay already covers the slide animation in practice. |
