"use client";

interface WeeklyRelancesChartProps {
  data: { day: string; count: number }[];
}

export function WeeklyRelancesChart({ data }: WeeklyRelancesChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  // Arrondir le max à l'entier supérieur pour avoir des graduations propres
  const roundedMax = Math.ceil(maxCount) || 1;
  const steps = Math.min(roundedMax, 5); // Maximum 5 graduations
  const stepValue = roundedMax / steps;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
        Relances cette semaine
      </h3>
      <div className="flex gap-4">
        {/* Axe Y avec graduations */}
        <div className="flex flex-col justify-between h-32 text-xs text-[#64748B]">
          {Array.from({ length: steps + 1 }, (_, i) => {
            const value = roundedMax - (stepValue * i);
            return (
              <span key={i} className="text-right w-8">
                {Math.round(value)}
              </span>
            );
          })}
        </div>
        
        {/* Graphique avec barres */}
        <div className="flex-1 flex items-end justify-between gap-2 h-32 relative">
          {/* Ligne de base */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-[#E5E7EB]"></div>
          {data.map((item, index) => {
            const barHeight = item.count > 0 ? (item.count / roundedMax) * 100 : 0;
            return (
              <div key={index} className="flex-1 flex flex-col items-center justify-end space-y-2 relative h-full">
                <div className="flex-1 flex items-end w-full">
                  <div
                    className="w-full bg-gradient-to-t from-[#F97316] to-[#EA580C] rounded-t transition-all"
                    style={{ 
                      height: `${barHeight}%`,
                      minHeight: item.count > 0 ? '4px' : '0px'
                    }}
                  />
                </div>
                <div className="text-center mt-2">
                  <div className="text-xs font-semibold text-[#0F172A]">{item.count}</div>
                  <div className="text-xs text-[#64748B]">{item.day}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

