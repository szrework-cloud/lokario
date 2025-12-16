import { apiGet } from "@/lib/api";

export interface DashboardStats {
  time_saved: {
    total: { hours: number; minutes: number };
    thisWeek: { hours: number; minutes: number };
    thisMonth: { hours: number; minutes: number };
    description: string;
    actual_days?: number; // Nombre réel de jours depuis la première activité
  };
  quotes_sent_this_month: number;
  quotes_sent_last_month: number;
  quotes_accepted: number;
  quotes_accepted_rate: number;
  monthly_revenue: number;
  monthly_revenue_last_month: number;
  overdue_invoices_count: number;
  overdue_invoices_amount: number;
  followups_sent_this_month: number;
  tasks_completed_this_week: number;
  monthly_billing: Array<{ label: string; value: number }>;
  weekly_quotes: Array<{ label: string; value: number }>;
}

export async function getDashboardStats(token: string): Promise<DashboardStats> {
  return apiGet<DashboardStats>("/dashboard/stats", token);
}

