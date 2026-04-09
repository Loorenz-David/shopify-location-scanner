import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { SearchIcon } from "../../assets/icons";

interface SearchBarProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className"
> {
  wrapperClassName?: string;
  inputClassName?: string;
  endAdornment?: ReactNode;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar(
    {
      wrapperClassName,
      inputClassName,
      endAdornment,
      type = "input",
      ...inputProps
    },
    ref,
  ) {
    return (
      <div
        className={`app-searchbar-surface flex items-center gap-2 focus-within:border-emerald-400 focus-within:bg-white/85 focus-within:ring-4 focus-within:ring-emerald-200/70 ${wrapperClassName ?? ""}`.trim()}
      >
        <SearchIcon
          className="h-4 w-4 shrink-0 text-green-700/50"
          aria-hidden="true"
        />
        <input
          ref={ref}
          type={type}
          className={`app-searchbar-input h-full w-full border-0 bg-transparent p-0 text-slate-900 outline-none ${inputClassName ?? ""}`.trim()}
          {...inputProps}
        />
        {endAdornment ? (
          <span className="ml-1 inline-flex shrink-0 items-center">
            {endAdornment}
          </span>
        ) : null}
      </div>
    );
  },
);
