"use client";

interface ModuleToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export function ModuleToggle({
  label,
  description,
  enabled,
  onToggle,
  disabled = false,
}: ModuleToggleProps) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-[#E5E7EB] last:border-b-0">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-[#0F172A]">{label}</h4>
        {description && (
          <p className="text-xs text-[#64748B] mt-1">{description}</p>
        )}
      </div>
      <label className={`relative inline-flex items-center ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FDBA74] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#F97316] peer-checked:to-[#EA580C] peer-disabled:opacity-50"></div>
      </label>
    </div>
  );
}

