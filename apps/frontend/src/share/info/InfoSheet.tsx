import type { ReactNode } from "react";

import { BackArrowIcon } from "../../assets/icons";
import { SlidingOverlayContainer } from "../../features/home/ui/SlidingOverlayContainer";
import { MiniMarkdown } from "../markdown";

interface InfoSheetProps {
  isOpen: boolean;
  title: string;
  markdown: string;
  pinnedContent?: ReactNode;
  fallbackMessage?: string;
  onClose: () => void;
}

export function InfoSheet({
  isOpen,
  title,
  markdown,
  pinnedContent,
  fallbackMessage = "More guidance is not available yet.",
  onClose,
}: InfoSheetProps) {
  const hasMarkdownContent = markdown.trim().length > 0;

  return (
    <SlidingOverlayContainer isOpen={isOpen} title={title}>
      <div className="flex h-full flex-col">
        <button
          type="button"
          aria-label={`Close ${title}`}
          className="flex-1 cursor-default"
          onClick={onClose}
        />

        <section className="max-h-[82svh] overflow-y-auto rounded-t-[28px] border-t border-slate-900/10 bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.18)]">
          <header className="flex items-center gap-3 border-b border-slate-900/10 px-4 py-3">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-900/10 bg-white text-slate-600"
              onClick={onClose}
              aria-label={`Close ${title}`}
            >
              <BackArrowIcon className="h-4 w-4" aria-hidden="true" />
            </button>

            <div>
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Help
              </p>
              <h2 className="m-0 mt-1 text-base font-bold text-slate-900">
                {title}
              </h2>
            </div>
          </header>

          <div className="flex flex-col gap-4 px-4 py-4">
            {pinnedContent ? (
              <div className="flex flex-col gap-2">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Current insight
                </p>
                {pinnedContent}
              </div>
            ) : null}

            {hasMarkdownContent ? (
              <MiniMarkdown content={markdown} />
            ) : (
              <p className="m-0 text-sm leading-6 text-slate-600">
                {fallbackMessage}
              </p>
            )}
          </div>
        </section>
      </div>
    </SlidingOverlayContainer>
  );
}
