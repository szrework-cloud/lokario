"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { PageTitle } from "@/components/layout/PageTitle";

interface TemplateCardProps {
  title: string;
  features: string[];
}

function TemplateCard({ title, features }: TemplateCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">{title}</h3>
        <ul className="space-y-2 mb-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start text-sm text-slate-600">
              <span className="mr-2 text-slate-400">•</span>
              {feature}
            </li>
          ))}
        </ul>
        <button className="w-full rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2">
          Activer ce pack
        </button>
      </CardContent>
    </Card>
  );
}

export default function TemplatesPage() {
  const templates = [
    {
      title: "Pack Commerce – Organiser la journée",
      features: [
        "Checklists ouverture / fermeture",
        "Inventaire hebdo",
        "Suivi des tâches quotidiennes",
      ],
    },
    {
      title: "Pack Beauté / Coiffeur – Suivi RDV",
      features: [
        "Gestion des rendez-vous",
        "Relances clients",
        "Suivi des prestations",
      ],
    },
    {
      title: "Pack Resto – Commandes fournisseurs",
      features: [
        "Gestion des commandes",
        "Suivi des stocks",
        "Planning des livraisons",
      ],
    },
  ];

  return (
    <>
      <PageTitle title="Modèles prêts à l'emploi" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">
            Modèles prêts à l'emploi
          </h1>
        </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template, index) => (
          <TemplateCard
            key={index}
            title={template.title}
            features={template.features}
          />
        ))}
      </div>
      {/* QUESTION: Il manque peut-être une page de détail pour chaque template (aperçu, configuration avant activation). À discuter avec le fondateur. */}
      </div>
    </>
  );
}

