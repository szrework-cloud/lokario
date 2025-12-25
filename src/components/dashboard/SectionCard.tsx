import { ReactNode, HTMLAttributes } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface SectionCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ title, action, children, ...props }: SectionCardProps) {
  return (
    <Card {...props}>
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

