"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BarChartProps {
  title: string;
  data: { label: string; value: number }[];
  valueLabel?: string; // Label pour la valeur (ex: "€", "devis")
}

export function BarChart({ title, data, valueLabel }: BarChartProps) {
  // Formater les données pour Recharts
  const chartData = data.map((item) => ({
    name: item.label,
    value: item.value,
  }));

  // Formater les valeurs dans le tooltip
  const formatValue = (value: number) => {
    if (valueLabel === "€" || title.toLowerCase().includes("montant")) {
      return `${value.toLocaleString("fr-FR")} €`;
    }
    return value.toLocaleString("fr-FR");
  };

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 md:p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-[#0F172A] mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#64748B", fontSize: 12 }}
            tickLine={{ stroke: "#E5E7EB" }}
            axisLine={{ stroke: "#E5E7EB" }}
          />
          <YAxis
            tick={{ fill: "#64748B", fontSize: 12 }}
            tickLine={{ stroke: "#E5E7EB" }}
            axisLine={{ stroke: "#E5E7EB" }}
            tickFormatter={(value) => formatValue(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
            labelStyle={{
              color: "#0F172A",
              fontWeight: 600,
              marginBottom: "4px",
            }}
            formatter={(value: number | undefined) => [formatValue(value || 0), valueLabel || "Valeur"]}
          />
          <Bar
            dataKey="value"
            fill="url(#colorGradient)"
            radius={[4, 4, 0, 0]}
          />
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F97316" stopOpacity={1} />
              <stop offset="100%" stopColor="#EA580C" stopOpacity={1} />
            </linearGradient>
          </defs>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

