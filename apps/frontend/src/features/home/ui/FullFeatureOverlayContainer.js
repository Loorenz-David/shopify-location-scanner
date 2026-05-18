import { jsx as _jsx } from "react/jsx-runtime";
import { AnimatePresence, motion } from "framer-motion";
export function FullFeatureOverlayContainer({ isOpen, title, ActiveFeatureComponent, }) {
    return (_jsx(AnimatePresence, { children: isOpen && ActiveFeatureComponent ? (_jsx(motion.section, { className: "fixed inset-0 z-50 bg-slate-950", role: "dialog", "aria-modal": "true", "aria-label": title, initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" }, transition: { duration: 0.28, ease: "easeOut" }, children: _jsx("div", { className: "h-svh overflow-y-auto", children: _jsx(ActiveFeatureComponent, {}) }) })) : null }));
}
