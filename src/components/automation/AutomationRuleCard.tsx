"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { AiActionButton } from "@/components/ai/AiActionButton";

interface AutomationRuleCardProps {
  title: string;
  description: string;
  enabled: boolean;
  delayDays?: number;
  emailTemplate?: string;
  onToggle: (enabled: boolean) => void;
  onDelayChange?: (days: number) => void;
  onTemplateChange?: (template: string) => void;
}

export function AutomationRuleCard({
  title,
  description,
  enabled,
  delayDays,
  emailTemplate,
  onToggle,
  onDelayChange,
  onTemplateChange,
}: AutomationRuleCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1">{description}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
          </label>
        </div>
      </CardHeader>
      {enabled && (
        <CardContent className="space-y-4">
          {delayDays !== undefined && onDelayChange && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Délai en jours
              </label>
              <input
                type="number"
                min="1"
                value={delayDays}
                onChange={(e) => onDelayChange(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
          )}
          {emailTemplate !== undefined && onTemplateChange && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">
                  Modèle d'email
                </label>
                <AiActionButton
                  onClick={() => {
                    // TODO: call AI backend to generate email template
                    const exampleTemplate = `Bonjour {client},

Nous vous rappelons que le devis {numero} que nous vous avons envoyé le {date} est toujours en attente de votre retour.

N'hésitez pas à nous contacter si vous avez des questions.

Cordialement,
{entreprise}`;
                    onTemplateChange(exampleTemplate);
                  }}
                  label="Proposer un modèle"
                  size="sm"
                />
              </div>
              <textarea
                value={emailTemplate}
                onChange={(e) => onTemplateChange(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="Bonjour {client}, ..."
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

