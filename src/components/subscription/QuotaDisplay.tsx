"use client";

import { useSubscriptionUsage } from "@/hooks/queries/useSubscriptionUsage";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Loader } from "@/components/ui/Loader";

export function QuotaDisplay() {
  const { data: usageData, isLoading } = useSubscriptionUsage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader />
      </div>
    );
  }

  if (!usageData) {
    return null;
  }

  const { limits, usage, plan } = usageData;

  const formatLimit = (limit: number) => {
    if (limit === -1) return "Illimité";
    return limit.toString();
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Illimité
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-[#16A34A]";
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-[#0F172A]">Quotas d'utilisation</h3>
        <p className="text-sm text-[#64748B]">
          Plan actuel : <span className="font-medium">{plan === "starter" ? "Essentiel" : plan === "professional" ? "Pro" : plan}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Devis */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#0F172A]">Devis ce mois</span>
            <span className="text-sm text-[#64748B]">
              {usage.quotes_this_month} / {formatLimit(limits.quotes_per_month)}
            </span>
          </div>
          {limits.quotes_per_month !== -1 && (
            <div className="w-full bg-[#E5E7EB] rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getUsageColor(
                  getUsagePercentage(usage.quotes_this_month, limits.quotes_per_month)
                )}`}
                style={{
                  width: `${getUsagePercentage(usage.quotes_this_month, limits.quotes_per_month)}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Factures */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#0F172A]">Factures ce mois</span>
            <span className="text-sm text-[#64748B]">
              {usage.invoices_this_month} / {formatLimit(limits.invoices_per_month)}
            </span>
          </div>
          {limits.invoices_per_month !== -1 && (
            <div className="w-full bg-[#E5E7EB] rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getUsageColor(
                  getUsagePercentage(usage.invoices_this_month, limits.invoices_per_month)
                )}`}
                style={{
                  width: `${getUsagePercentage(usage.invoices_this_month, limits.invoices_per_month)}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Clients */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#0F172A]">Clients</span>
            <span className="text-sm text-[#64748B]">
              {usage.clients_total} / {formatLimit(limits.clients)}
            </span>
          </div>
          {limits.clients !== -1 && (
            <div className="w-full bg-[#E5E7EB] rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getUsageColor(
                  getUsagePercentage(usage.clients_total, limits.clients)
                )}`}
                style={{
                  width: `${getUsagePercentage(usage.clients_total, limits.clients)}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Relances */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#0F172A]">Relances ce mois</span>
            <span className="text-sm text-[#64748B]">
              {usage.followups_this_month} / {formatLimit(limits.followups_per_month)}
            </span>
          </div>
          {limits.followups_per_month !== -1 && (
            <div className="w-full bg-[#E5E7EB] rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getUsageColor(
                  getUsagePercentage(usage.followups_this_month, limits.followups_per_month)
                )}`}
                style={{
                  width: `${getUsagePercentage(usage.followups_this_month, limits.followups_per_month)}%`,
                }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

