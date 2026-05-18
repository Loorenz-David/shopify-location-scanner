import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
import { QRcodeIcon } from "../../../assets/icons";
export function BottomNav({ items, onSelectPage }) {
    const leftItems = items.filter((i) => i.slot === "left");
    const rightItems = items.filter((i) => i.slot === "right");
    const centerItem = items.find((i) => i.slot === "center");
    // Always render 2 slots on each side so the center stays fixed
    const leftSlots = [leftItems[0] ?? null, leftItems[1] ?? null];
    const rightSlots = [rightItems[0] ?? null, rightItems[1] ?? null];
    const renderNavButton = (item) => {
        if (item.isHidden) {
            return _jsx("div", { className: "h-12", "aria-hidden": "true" }, item.id);
        }
        return (_jsxs("button", { type: "button", className: `relative flex flex-col items-center justify-center rounded-full bg-transparent px-3 py-2 text-[8px] font-semibold leading-none gap-1 ${item.isActive ? "text-blue-400" : "text-slate-700"}`, onClick: () => onSelectPage(item.id), children: [item.icon
                    ? (() => {
                        const IconComponent = item.icon;
                        return (_jsxs("span", { className: "relative inline-flex", children: [_jsx(IconComponent, { className: `h-4 w-4 ${item.isActive ? "text-blue-400" : "text-slate-700"}`, "aria-hidden": "true" }), item.count && item.count > 0 ? (_jsx("span", { className: "absolute -top-1.5 -right-2 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-[3px] text-[8px] font-bold leading-none text-white", children: item.count > 99 ? "99+" : item.count })) : null] }));
                    })()
                    : null, _jsx("span", { children: item.label })] }, item.id));
    };
    return (_jsxs(motion.nav, { className: "fixed left-1/2 z-30 grid w-[min(520px,calc(100vw-1.5rem))] -translate-x-1/2 grid-cols-5 items-center rounded-full border border-slate-900/20 bg-white/85 p-1 shadow-[0_16px_35px_rgba(18,44,77,0.22)] backdrop-blur-md", style: { bottom: "max(1rem, env(safe-area-inset-bottom))" }, initial: { y: 28, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.28, ease: "easeOut" }, "aria-label": "Primary navigation", children: [leftSlots.map((item, i) => item ? (renderNavButton(item)) : (_jsx("div", { className: "h-12", "aria-hidden": "true" }, `left-empty-${i}`))), centerItem ? (_jsx("button", { type: "button", className: "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-emerald-600 to-emerald-700 text-emerald-50 shadow-[0_12px_24px_rgba(16,122,102,0.25)]", onClick: () => onSelectPage(centerItem.id), "aria-label": centerItem.label, children: _jsx(QRcodeIcon, { className: "h-6 w-6", "aria-hidden": "true" }) }, centerItem.id)) : (_jsx("div", { className: "h-12", "aria-hidden": "true" })), rightSlots.map((item, i) => item ? (renderNavButton(item)) : (_jsx("div", { className: "h-12", "aria-hidden": "true" }, `right-empty-${i}`)))] }));
}
