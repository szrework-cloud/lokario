import { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface SectionCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ title, action, children }: SectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-[#0F172A]">{title}</h3>
          {action && <div>{action}</div>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

