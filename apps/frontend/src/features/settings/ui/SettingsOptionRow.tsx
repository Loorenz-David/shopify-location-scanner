import { BoldArrowIcon } from "../../../assets/icons";

interface SettingsOptionRowProps {
  label: string;
  onPress: () => void;
}

export function SettingsOptionRow({ label, onPress }: SettingsOptionRowProps) {
  return (
    <button
      type="button"
      className="flex h-14 w-full items-center justify-between rounded-xl border border-slate-900/10 bg-white px-4 text-left shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
      onClick={onPress}
    >
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <span
        className="text-xl font-black leading-none text-slate-900"
        aria-hidden="true"
      >
        <BoldArrowIcon className="h-4 w-4 text-green-700" aria-hidden="true" />
      </span>
    </button>
  );
}
