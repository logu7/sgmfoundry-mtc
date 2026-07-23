import { cn } from "@/lib/utils";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
  className,
  as = "input",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  className?: string;
  as?: "input" | "textarea";
}) {
  const inputClass = cn(
    "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none transition-colors",
    "focus:border-slate-500 focus:ring-1 focus:ring-slate-500",
    mono && "font-mono text-[13px]",
    className
  );

  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {as === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={cn(inputClass, "resize-none")}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
    </label>
  );
}
