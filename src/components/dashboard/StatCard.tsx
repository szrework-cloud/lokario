interface StatCardProps {
  value: string | number;
  label: string;
  subtitle?: string;
}

export function StatCard({ value, label, subtitle }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 md:p-6 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-[#64748B] font-medium">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#0F172A]">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-[#64748B]">{subtitle}</p>
      )}
    </div>
  );
}

