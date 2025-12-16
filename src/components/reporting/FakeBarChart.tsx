interface FakeBarChartProps {
  title: string;
  data: { label: string; value: number }[];
  maxValue?: number;
}

export function FakeBarChart({ title, data, maxValue }: FakeBarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value));

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 md:p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-[#0F172A] mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#64748B]">{item.label}</span>
              <span className="text-sm font-medium text-[#0F172A]">
                {item.value}
              </span>
            </div>
            <div className="h-4 w-full rounded bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F97316] to-[#EA580C] rounded transition-all"
                style={{ width: `${(item.value / max) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

