import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment } from "react";
function parseBlocks(content) {
    const lines = content
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.trimEnd());
    const blocks = [];
    let index = 0;
    while (index < lines.length) {
        const line = lines[index].trim();
        if (!line) {
            index += 1;
            continue;
        }
        if (line === "---") {
            blocks.push({ type: "divider" });
            index += 1;
            continue;
        }
        if (line === "```") {
            const formulaLines = [];
            index += 1;
            while (index < lines.length && lines[index].trim() !== "```") {
                formulaLines.push(lines[index].trimEnd());
                index += 1;
            }
            if (index < lines.length && lines[index].trim() === "```") {
                index += 1;
            }
            blocks.push({ type: "formula", lines: formulaLines });
            continue;
        }
        if (line.startsWith("### ")) {
            blocks.push({ type: "heading", level: 3, text: line.slice(4).trim() });
            index += 1;
            continue;
        }
        if (line.startsWith("## ")) {
            blocks.push({ type: "heading", level: 2, text: line.slice(3).trim() });
            index += 1;
            continue;
        }
        if (line.startsWith("# ")) {
            blocks.push({ type: "heading", level: 1, text: line.slice(2).trim() });
            index += 1;
            continue;
        }
        if (line.startsWith("- ")) {
            const items = [];
            while (index < lines.length) {
                const listLine = lines[index].trim();
                if (!listLine.startsWith("- ")) {
                    break;
                }
                items.push(listLine.slice(2).trim());
                index += 1;
            }
            if (items.length > 0) {
                blocks.push({ type: "list", items });
            }
            continue;
        }
        const paragraphLines = [];
        while (index < lines.length) {
            const paragraphLine = lines[index].trim();
            if (!paragraphLine ||
                paragraphLine === "---" ||
                paragraphLine.startsWith("#") ||
                paragraphLine.startsWith("- ")) {
                break;
            }
            paragraphLines.push(paragraphLine);
            index += 1;
        }
        if (paragraphLines.length > 0) {
            blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
            continue;
        }
        index += 1;
    }
    return blocks;
}
function renderInlineMarkdown(text) {
    const segments = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return segments.map((segment, index) => {
        if (segment.startsWith("**") && segment.endsWith("**")) {
            return (_jsx("strong", { className: "font-semibold text-slate-900", children: segment.slice(2, -2) }, `${segment}-${index}`));
        }
        return _jsx(Fragment, { children: segment }, `${segment}-${index}`);
    });
}
export function MiniMarkdown({ content, className = "" }) {
    const blocks = parseBlocks(content);
    return (_jsx("div", { className: `flex flex-col gap-4 text-sm text-slate-700 ${className}`.trim(), children: blocks.map((block, index) => {
            if (block.type === "divider") {
                return _jsx("hr", { className: "border-slate-200" }, `divider-${index}`);
            }
            if (block.type === "heading") {
                if (block.level === 1) {
                    return (_jsx("h1", { className: "m-0 text-xl font-bold tracking-tight text-slate-900", children: renderInlineMarkdown(block.text) }, `heading-${index}`));
                }
                if (block.level === 2) {
                    return (_jsx("h2", { className: "m-0 text-base font-bold tracking-tight text-slate-900", children: renderInlineMarkdown(block.text) }, `heading-${index}`));
                }
                return (_jsx("h3", { className: "m-0 text-sm font-semibold uppercase tracking-[0.08em] text-slate-500", children: renderInlineMarkdown(block.text) }, `heading-${index}`));
            }
            if (block.type === "list") {
                return (_jsx("ul", { className: "m-0 flex list-none flex-col gap-2 p-0", children: block.items.map((item, itemIndex) => (_jsxs("li", { className: "flex gap-2 leading-6", children: [_jsx("span", { className: "mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" }), _jsx("span", { children: renderInlineMarkdown(item) })] }, `item-${itemIndex}`))) }, `list-${index}`));
            }
            if (block.type === "formula") {
                return (_jsx("div", { className: "overflow-x-auto rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3", children: _jsx("pre", { className: "m-0 whitespace-pre-wrap text-sm font-medium leading-6 text-sky-950", children: block.lines.join("\n") }) }, `formula-${index}`));
            }
            return (_jsx("p", { className: "m-0 leading-6 text-slate-700", children: renderInlineMarkdown(block.text) }, `paragraph-${index}`));
        }) }));
}
