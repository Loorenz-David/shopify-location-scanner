import type { InputHTMLAttributes } from "react";

import { SearchIcon } from "../../assets/icons";

interface SearchBarProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className"
> {
  wrapperClassName?: string;
  inputClassName?: string;
}

export function SearchBar({
  wrapperClassName,
  inputClassName,
  type = "input",
  ...inputProps
}: SearchBarProps) {
  return (
    <label
      className={`app-searchbar-surface flex items-center gap-2 ${wrapperClassName ?? ""}`.trim()}
    >
      <SearchIcon
        className="h-4 w-4 shrink-0 text-green-700/50"
        aria-hidden="true"
      />
      <input
        type={type}
        className={`h-full w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none ${inputClassName ?? ""}`.trim()}
        {...inputProps}
      />
    </label>
  );
}
