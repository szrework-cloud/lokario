export type SectorTemplate = {
  name: string;
  description: string;
  items: string[];
  recurrence: "daily" | "weekly" | "monthly";
  executionTime?: string;
};

export const sectorTemplates: Record<string, SectorTemplate[]> = {
  coiffure: [
    {
      name: "Ouverture salon",
      description: "Checklist d'ouverture quotidienne",
      items: [
        "Allumer les lumières",
        "Vérifier les réservations du jour",
        "Préparer les cabines",
        "Vérifier les produits",
        "Nettoyer les miroirs",
        "Vérifier la caisse",
      ],
      recurrence: "daily",
      executionTime: "08:00",
    },
    {
      name: "Fermeture salon",
      description: "Checklist de fermeture quotidienne",
      items: [
        "Nettoyer les cabines",
        "Ranger les outils",
        "Fermer la caisse",
        "Éteindre les lumières",
        "Vérifier les portes",
        "Vérifier les réservations du lendemain",
      ],
      recurrence: "daily",
      executionTime: "19:00",
    },
    {
      name: "Nettoyage hebdomadaire",
      description: "Nettoyage approfondi du salon",
      items: [
        "Nettoyer les sols",
        "Nettoyer les vitrines",
        "Désinfecter les équipements",
        "Vider les poubelles",
        "Nettoyer les salles de bain",
      ],
      recurrence: "weekly",
    },
  ],
  tabac: [
    {
      name: "Ouverture tabac",
      description: "Checklist d'ouverture",
      items: [
        "Ouvrir la caisse",
        "Vérifier les stocks cigarettes",
        "Vérifier les stocks presse",
        "Allumer les équipements",
        "Vérifier les prix affichés",
        "Nettoyer les vitrines",
      ],
      recurrence: "daily",
      executionTime: "07:00",
    },
    {
      name: "Fermeture tabac",
      description: "Checklist de fermeture",
      items: [
        "Fermer la caisse",
        "Ranger les produits",
        "Éteindre les équipements",
        "Vérifier les portes",
        "Vérifier les alarmes",
      ],
      recurrence: "daily",
      executionTime: "20:00",
    },
    {
      name: "Vérification stocks",
      description: "Vérification hebdomadaire des stocks",
      items: [
        "Vérifier stocks cigarettes",
        "Vérifier stocks presse",
        "Vérifier stocks confiseries",
        "Commander les manquants",
      ],
      recurrence: "weekly",
    },
  ],
  institut: [
    {
      name: "Ouverture institut",
      description: "Checklist d'ouverture",
      items: [
        "Allumer les lumières",
        "Préparer les cabines",
        "Vérifier les réservations",
        "Vérifier les produits",
        "Nettoyer les surfaces",
        "Vérifier la caisse",
      ],
      recurrence: "daily",
      executionTime: "09:00",
    },
    {
      name: "Fermeture institut",
      description: "Checklist de fermeture",
      items: [
        "Nettoyer les cabines",
        "Ranger les produits",
        "Fermer la caisse",
        "Éteindre les lumières",
        "Vérifier les portes",
      ],
      recurrence: "daily",
      executionTime: "19:00",
    },
    {
      name: "Préparation cabines",
      description: "Préparation quotidienne des cabines",
      items: [
        "Nettoyer les surfaces",
        "Vérifier les équipements",
        "Préparer les produits nécessaires",
        "Vérifier les serviettes",
      ],
      recurrence: "daily",
      executionTime: "08:30",
    },
  ],
  epicerie: [
    {
      name: "Ouverture épicerie",
      description: "Checklist d'ouverture",
      items: [
        "Ouvrir la caisse",
        "Vérifier les stocks",
        "Allumer les équipements",
        "Nettoyer les vitrines",
        "Vérifier les prix",
        "Préparer les balances",
      ],
      recurrence: "daily",
      executionTime: "07:00",
    },
    {
      name: "Fermeture épicerie",
      description: "Checklist de fermeture",
      items: [
        "Fermer la caisse",
        "Ranger les produits",
        "Éteindre les équipements",
        "Vérifier les portes",
        "Vérifier les alarmes",
      ],
      recurrence: "daily",
      executionTime: "20:00",
    },
    {
      name: "Vérification stocks",
      description: "Vérification quotidienne des stocks",
      items: [
        "Vérifier les dates de péremption",
        "Vérifier les stocks bas",
        "Ranger les nouveaux arrivages",
      ],
      recurrence: "daily",
      executionTime: "10:00",
    },
  ],
  commerce: [
    {
      name: "Ouverture magasin",
      description: "Checklist d'ouverture",
      items: [
        "Ouvrir la caisse",
        "Allumer les lumières",
        "Nettoyer les vitrines",
        "Vérifier les prix affichés",
        "Vérifier les stocks",
      ],
      recurrence: "daily",
      executionTime: "09:00",
    },
    {
      name: "Fermeture magasin",
      description: "Checklist de fermeture",
      items: [
        "Fermer la caisse",
        "Ranger les produits",
        "Éteindre les lumières",
        "Vérifier les portes",
      ],
      recurrence: "daily",
      executionTime: "19:00",
    },
  ],
};

