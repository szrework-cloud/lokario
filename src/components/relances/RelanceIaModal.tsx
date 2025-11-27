"use client";

import { useState } from "react";

interface RelanceIaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RelanceMethod = "email" | "whatsapp" | "telephone" | "appel";

export function RelanceIaModal({ isOpen, onClose }: RelanceIaModalProps) {
  const [initialDelay, setInitialDelay] = useState("7");
  const [maxRelances, setMaxRelances] = useState(3);
  const [relanceDelays, setRelanceDelays] = useState<number[]>([7, 14, 21]);
  const [relanceMethods, setRelanceMethods] = useState<RelanceMethod[]>(["email", "email", "whatsapp"]);
  const [stopConditions, setStopConditions] = useState({
    stopOnClientResponse: true,
    stopOnInvoicePaid: true,
    stopOnQuoteRefused: true,
  });
  const [messages, setMessages] = useState([
    { id: 1, type: "devis", content: "Bonjour, nous vous rappelons que votre devis est en attente de réponse. N'hésitez pas à nous contacter pour toute question." },
    { id: 2, type: "facture", content: "Bonjour, votre facture est impayée depuis plusieurs jours. Merci de régulariser votre situation dans les plus brefs délais." },
    { id: 3, type: "info", content: "Bonjour, nous avons besoin d'informations complémentaires pour finaliser votre dossier. Pourriez-vous nous les transmettre ?" },
  ]);
  const [adaptToContext, setAdaptToContext] = useState(true);
  const [selectedMessageType, setSelectedMessageType] = useState<string | null>(null);

  // Mettre à jour les délais et méthodes quand le nombre max de relances change
  const handleMaxRelancesChange = (value: number) => {
    setMaxRelances(value);
    // Ajuster le tableau des délais
    const newDelays = [...relanceDelays];
    const newMethods = [...relanceMethods];
    if (value > newDelays.length) {
      // Ajouter des délais par défaut
      for (let i = newDelays.length; i < value; i++) {
        newDelays.push(7 * (i + 1));
        newMethods.push("email"); // Méthode par défaut
      }
    } else {
      // Retirer les délais en trop
      newDelays.splice(value);
      newMethods.splice(value);
    }
    setRelanceDelays(newDelays);
    setRelanceMethods(newMethods);
  };

  if (!isOpen) return null;

  const handleSave = () => {
    console.log("Save relance IA config:", {
      initialDelay,
      maxRelances,
      relanceDelays,
      relanceMethods,
      stopConditions,
      messages,
      adaptToContext,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-[#E5E7EB] p-6 flex items-center justify-between z-10">
        <h2 className="text-2xl font-bold text-[#0F172A]">Configuration Relances IA</h2>
        <button
          onClick={onClose}
          className="text-[#64748B] hover:text-[#0F172A] text-2xl font-bold"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Délai des relances */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#0F172A]">Délai des relances</h3>
          
          {/* Nombre maximum de relances */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#0F172A]">
              Nombre maximum de relances
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={maxRelances}
                onChange={(e) => handleMaxRelancesChange(parseInt(e.target.value) || 1)}
                min="1"
                max="10"
                className="w-20 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              />
            </div>
          </div>

          {/* Délais entre chaque relance */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#0F172A]">
              Délai entre chaque relance
            </label>
            <div className="space-y-4">
              {relanceDelays.map((delay, index) => (
                <div key={index} className="p-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
                  <label className="text-sm font-medium text-[#0F172A] mb-3 block">
                    Relance {index + 1}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[#64748B]">Délai (jours)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={delay}
                          onChange={(e) => {
                            const newDelays = [...relanceDelays];
                            newDelays[index] = parseInt(e.target.value) || 0;
                            setRelanceDelays(newDelays);
                          }}
                          min="1"
                          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                        />
                        <span className="text-xs text-[#64748B]">j</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[#64748B]">Moyen de relance</label>
                      <select
                        value={relanceMethods[index] || "email"}
                        onChange={(e) => {
                          const newMethods = [...relanceMethods];
                          newMethods[index] = e.target.value as RelanceMethod;
                          setRelanceMethods(newMethods);
                        }}
                        className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                      >
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="telephone">Téléphone (SMS)</option>
                        <option value="appel">Appel téléphonique</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#64748B]">
              Les relances seront envoyées automatiquement après ce délai si aucune réponse n'a été reçue.
            </p>
          </div>

          {/* Conditions d'arrêt */}
          <div className="space-y-3 pt-4 border-t border-[#E5E7EB]">
            <label className="block text-sm font-medium text-[#0F172A]">
              Conditions d'arrêt
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stopConditions.stopOnClientResponse}
                  onChange={(e) =>
                    setStopConditions({
                      ...stopConditions,
                      stopOnClientResponse: e.target.checked,
                    })
                  }
                  className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                />
                <span className="text-sm text-[#0F172A]">Arrêter si le client répond</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stopConditions.stopOnInvoicePaid}
                  onChange={(e) =>
                    setStopConditions({
                      ...stopConditions,
                      stopOnInvoicePaid: e.target.checked,
                    })
                  }
                  className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                />
                <span className="text-sm text-[#0F172A]">Arrêter si la facture est payée</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stopConditions.stopOnQuoteRefused}
                  onChange={(e) =>
                    setStopConditions({
                      ...stopConditions,
                      stopOnQuoteRefused: e.target.checked,
                    })
                  }
                  className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                />
                <span className="text-sm text-[#0F172A]">Arrêter si le devis est refusé</span>
              </label>
            </div>
          </div>
        </div>

        {/* Messages de relances */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#0F172A]">Messages de relances</h3>
            <button
              onClick={() => {
                if (!adaptToContext) {
                  const newId = Math.max(...messages.map(m => m.id), 0) + 1;
                  setMessages([...messages, { id: newId, type: "devis", content: "" }]);
                  setSelectedMessageType(newId.toString());
                }
              }}
              disabled={adaptToContext}
              className={`rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium transition-colors ${
                adaptToContext
                  ? "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed"
                  : "text-[#0F172A] hover:bg-[#F9FAFB]"
              }`}
            >
              + Ajouter un message
            </button>
          </div>
          {adaptToContext && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs text-blue-800">
                Les messages sont générés automatiquement par l'IA selon le contexte. Les messages ci-dessous servent de base mais seront adaptés pour chaque client.
              </p>
            </div>
          )}
          <div className={`space-y-4 ${adaptToContext ? "opacity-50 pointer-events-none" : ""}`}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg border ${
                  selectedMessageType === message.id.toString()
                    ? "border-[#F97316] bg-orange-50"
                    : "border-[#E5E7EB] bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <select
                      value={message.type}
                      onChange={(e) => {
                        if (!adaptToContext) {
                          setMessages(
                            messages.map((m) =>
                              m.id === message.id ? { ...m, type: e.target.value } : m
                            )
                          );
                        }
                      }}
                      disabled={adaptToContext}
                      className={`rounded-lg border border-[#E5E7EB] px-3 py-1 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 ${
                        adaptToContext ? "bg-[#F3F4F6] cursor-not-allowed" : ""
                      }`}
                    >
                      <option value="devis">Devis</option>
                      <option value="facture">Facture</option>
                      <option value="info">Info manquante</option>
                      <option value="rdv">RDV</option>
                      <option value="general">Général</option>
                    </select>
                    <button
                      onClick={() => {
                        if (!adaptToContext) {
                          setSelectedMessageType(message.id.toString());
                        }
                      }}
                      disabled={adaptToContext}
                      className={`text-sm font-medium ${
                        adaptToContext
                          ? "text-[#9CA3AF] cursor-not-allowed"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      {selectedMessageType === message.id.toString() ? "Modifier" : "Éditer"}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (!adaptToContext) {
                        setMessages(messages.filter((m) => m.id !== message.id));
                        if (selectedMessageType === message.id.toString()) {
                          setSelectedMessageType(null);
                        }
                      }
                    }}
                    disabled={adaptToContext}
                    className={`text-sm ${
                      adaptToContext
                        ? "text-[#9CA3AF] cursor-not-allowed"
                        : "text-red-600 hover:text-red-800"
                    }`}
                  >
                    Supprimer
                  </button>
                </div>
                {selectedMessageType === message.id.toString() ? (
                  <textarea
                    value={message.content}
                    onChange={(e) => {
                      if (!adaptToContext) {
                        setMessages(
                          messages.map((m) =>
                            m.id === message.id ? { ...m, content: e.target.value } : m
                          )
                        );
                      }
                    }}
                    disabled={adaptToContext}
                    className={`w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 ${
                      adaptToContext ? "bg-[#F3F4F6] cursor-not-allowed" : ""
                    }`}
                    rows={4}
                    placeholder="Tapez votre message de relance..."
                  />
                ) : (
                  <p className="text-sm text-[#0F172A]">{message.content || "Aucun message"}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Adaptation au contexte */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#0F172A]">Personnalisation IA</h3>
          <div className="p-4 rounded-lg border border-[#E5E7EB] bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#0F172A]">
                  Adapter le message au contexte de la personne
                </p>
                <p className="text-xs text-[#64748B] mt-1">
                  L'IA personnalisera le message en fonction de l'historique du client, de son secteur d'activité et de ses préférences.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={adaptToContext}
                  onChange={(e) => setAdaptToContext(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#E5E7EB] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#F97316] peer-focus:ring-offset-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F97316]"></div>
              </label>
            </div>
            {adaptToContext && (
              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-800">
                  <strong>Exemples d'adaptation :</strong>
                </p>
                <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Ton formel pour les entreprises, plus décontracté pour les particuliers</li>
                  <li>Références à l'historique d'achats ou de projets précédents</li>
                  <li>Adaptation au secteur d'activité (commerce, restauration, services...)</li>
                  <li>Utilisation du prénom et personnalisation du message</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#E5E7EB]">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#E5E7EB] px-6 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            Enregistrer la configuration
          </button>
        </div>
      </div>
    </div>
  );
}

