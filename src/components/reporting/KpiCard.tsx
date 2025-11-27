interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}

export function KpiCard({ title, value, subtitle, trend }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 md:p-6 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-[#64748B] font-medium">{title}</p>
      <p className="mt-2 text-2xl font-bold text-[#0F172A]">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-[#64748B]">{subtitle}</p>
      )}
      {trend && (
        <p className="mt-1 text-xs" style={{ color: trend === "up" ? "#16A34A" : trend === "down" ? "#DC2626" : "#64748B" }}>
          {trend === "up" && "↑"}
          {trend === "down" && "↓"}
        </p>
      )}
    </div>
  );
}

