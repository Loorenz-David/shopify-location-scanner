import { Fragment } from "react";

interface MiniMarkdownProps {
  content: string;
  className?: string;
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "formula"; lines: string[] }
  | { type: "divider" };

function parseBlocks(content: string): Block[] {
  const lines = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());

  const blocks: Block[] = [];
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
      const formulaLines: string[] = [];
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
      const items: string[] = [];

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

    const paragraphLines: string[] = [];

    while (index < lines.length) {
      const paragraphLine = lines[index].trim();
      if (
        !paragraphLine ||
        paragraphLine === "---" ||
        paragraphLine.startsWith("#") ||
        paragraphLine.startsWith("- ")
      ) {
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

function renderInlineMarkdown(text: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return segments.map((segment, index) => {
    if (segment.startsWith("**") && segment.endsWith("**")) {
      return (
        <strong key={`${segment}-${index}`} className="font-semibold text-slate-900">
          {segment.slice(2, -2)}
        </strong>
      );
    }

    return <Fragment key={`${segment}-${index}`}>{segment}</Fragment>;
  });
}

export function MiniMarkdown({ content, className = "" }: MiniMarkdownProps) {
  const blocks = parseBlocks(content);

  return (
    <div className={`flex flex-col gap-4 text-sm text-slate-700 ${className}`.trim()}>
      {blocks.map((block, index) => {
        if (block.type === "divider") {
          return <hr key={`divider-${index}`} className="border-slate-200" />;
        }

        if (block.type === "heading") {
          if (block.level === 1) {
            return (
              <h1
                key={`heading-${index}`}
                className="m-0 text-xl font-bold tracking-tight text-slate-900"
              >
                {renderInlineMarkdown(block.text)}
              </h1>
            );
          }

          if (block.level === 2) {
            return (
              <h2
                key={`heading-${index}`}
                className="m-0 text-base font-bold tracking-tight text-slate-900"
              >
                {renderInlineMarkdown(block.text)}
              </h2>
            );
          }

          return (
            <h3
              key={`heading-${index}`}
              className="m-0 text-sm font-semibold uppercase tracking-[0.08em] text-slate-500"
            >
              {renderInlineMarkdown(block.text)}
            </h3>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list-${index}`} className="m-0 flex list-none flex-col gap-2 p-0">
              {block.items.map((item, itemIndex) => (
                <li key={`item-${itemIndex}`} className="flex gap-2 leading-6">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>{renderInlineMarkdown(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "formula") {
          return (
            <div
              key={`formula-${index}`}
              className="overflow-x-auto rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3"
            >
              <pre className="m-0 whitespace-pre-wrap text-sm font-medium leading-6 text-sky-950">
                {block.lines.join("\n")}
              </pre>
            </div>
          );
        }

        return (
          <p key={`paragraph-${index}`} className="m-0 leading-6 text-slate-700">
            {renderInlineMarkdown(block.text)}
          </p>
        );
      })}
    </div>
  );
}
