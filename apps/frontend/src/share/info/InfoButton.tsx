interface InfoButtonProps {
  onClick: () => void;
  label: string;
  className?: string;
}

export function InfoButton({
  onClick,
  label,
  className = "",
}: InfoButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current/15 bg-white/70 text-[11px] font-bold text-current transition-colors hover:bg-white ${className}`.trim()}
    >
      i
    </button>
  );
}
