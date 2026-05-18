import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from "react";
import { CloseIcon, WriteIcon } from "../../../assets/icons";
import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import { useLogisticTasksStore } from "../stores/logistic-tasks.store";
export function FixItemDetailOverlay({ scanHistoryId, onClose, }) {
    const item = useLogisticTasksStore((s) => s.items.find((i) => i.id === scanHistoryId) ?? null);
    const [isEditing, setIsEditing] = useState(false);
    const [draftNote, setDraftNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const textareaRef = useRef(null);
    if (!item)
        return null;
    const handleStartEdit = () => {
        setDraftNote(item.fixNotes ?? "");
        setIsEditing(true);
        setTimeout(() => textareaRef.current?.focus(), 60);
    };
    const handleSave = async () => {
        setIsSaving(true);
        await logisticTasksActions.updateFixNotes(scanHistoryId, draftNote.trim() || null);
        setIsSaving(false);
        setIsEditing(false);
    };
    const handlePlace = () => {
        onClose();
        logisticTasksActions.openPlacementScanner(item);
    };
    return (_jsxs("div", { className: "flex h-svh flex-col", children: [_jsx("button", { type: "button", className: "flex-1 cursor-default", onClick: onClose, "aria-label": "Close" }), _jsxs("section", { className: "flex max-h-[40svh] shrink-0 flex-col overflow-hidden rounded-t-[28px] border-t border-slate-900/10 bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.18)]", children: [_jsxs("header", { className: "flex shrink-0 items-center justify-between border-b border-slate-900/10 px-4 py-3", children: [_jsx("p", { className: "text-sm font-semibold text-slate-900", children: "Fix Details" }), _jsx("button", { type: "button", className: "grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100", onClick: onClose, "aria-label": "Close", children: _jsx(CloseIcon, { className: "h-5 w-5", "aria-hidden": "true" }) })] }), _jsx("div", { className: "flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4", children: _jsxs("div", { className: "rounded-xl border border-slate-200 bg-white px-4 py-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: "Fix note" }), !isEditing ? (_jsx("button", { type: "button", className: "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100", onClick: handleStartEdit, "aria-label": "Edit fix note", children: _jsx(WriteIcon, { className: "h-4 w-4", "aria-hidden": "true" }) })) : (_jsx("button", { type: "button", className: "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-60", disabled: isSaving, onClick: () => void handleSave(), "aria-label": "Save fix note", children: _jsx("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2.5, "aria-hidden": "true", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 13l4 4L19 7" }) }) }))] }), !isEditing && (_jsx("p", { className: `mt-2 text-sm ${item.fixNotes ? "text-slate-900" : "italic text-slate-400"}`, children: item.fixNotes ?? "No note" })), isEditing && (_jsx("textarea", { ref: textareaRef, rows: 3, maxLength: 500, className: "mt-2 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-green-500 focus:outline-none", value: draftNote, onChange: (e) => setDraftNote(e.target.value) }))] }) }), _jsx("div", { className: "shrink-0 border-t border-slate-900/10 bg-white px-5 py-4", style: { paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }, children: _jsx("button", { type: "button", className: "w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white active:bg-green-700", onClick: handlePlace, children: "Place Item" }) })] })] }));
}
