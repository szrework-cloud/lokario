"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getFollowUpSettings, updateFollowUpSettings, type FollowUpSettings } from "@/services/followupsService";
import { logger } from "@/lib/logger";

interface RelanceIaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RelanceMethod = "email" | "whatsapp" | "telephone" | "appel";

export function RelanceIaModal({ isOpen, onClose }: RelanceIaModalProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [initialDelay, setInitialDelay] = useState("7");
  const [maxRelances, setMaxRelances] = useState(3);
  const [relanceDelays, setRelanceDelays] = useState<number[]>([7, 14, 21]);
  const [relanceMethods, setRelanceMethods] = useState<RelanceMethod[]>(["email", "email", "whatsapp"]);
  const [stopConditions, setStopConditions] = useState({
    stopOnClientResponse: true,
    stopOnInvoicePaid: true,
    stopOnQuoteRefused: true,
  });
  const [messages, setMessages] = useState<Array<{ id: number; type: string; content: string; method?: string }>>([]);
  // Relances avant la date d'échéance
  const [enableRelancesBefore, setEnableRelancesBefore] = useState(false);
  const [daysBeforeDue, setDaysBeforeDue] = useState<number | null>(null);
  const [hoursBeforeDue, setHoursBeforeDue] = useState<number | null>(null);

  // Charger les paramètres depuis l'API
  useEffect(() => {
    const loadSettings = async () => {
      if (!isOpen || !token) return;
      
      setIsLoading(true);
      try {
        const settings = await getFollowUpSettings(token);
        setInitialDelay(String(settings.initial_delay_days));
        setMaxRelances(settings.max_relances);
        setRelanceDelays(settings.relance_delays);
        setRelanceMethods(settings.relance_methods as RelanceMethod[]);
        setStopConditions({
          stopOnClientResponse: settings.stop_conditions.stop_on_client_response,
          stopOnInvoicePaid: settings.stop_conditions.stop_on_invoice_paid,
          stopOnQuoteRefused: settings.stop_conditions.stop_on_quote_refused,
        });
        setMessages(settings.messages || []);
        setEnableRelancesBefore(settings.enable_relances_before || false);
        setDaysBeforeDue(settings.days_before_due ?? null);
        setHoursBeforeDue(settings.hours_before_due ?? null);
      } catch (error: any) {
        logger.error("Erreur lors du chargement des paramètres:", error);
        showToast("Erreur lors du chargement des paramètres", "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [isOpen, token, showToast]);

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

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-[#0F172A] mb-2">Chargement...</div>
          <div className="text-sm text-[#64748B]">Récupération de la configuration</div>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!token) {
      showToast("Vous devez être connecté pour sauvegarder", "error");
      return;
    }

    setIsSaving(true);
    try {
      // Les messages sont déjà dans le bon format (type: "Devis non répondu", etc.)
      // On garde seulement ceux qui ont un contenu
      const mappedMessages = messages
        .filter(msg => msg.content && msg.content.trim())
        .map(msg => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          method: msg.method || "email"
        }));

      const settingsToSave = {
        initial_delay_days: parseInt(initialDelay) || 7,
        max_relances: maxRelances,
        relance_delays: relanceDelays,
        relance_methods: relanceMethods,
        stop_conditions: {
          stop_on_client_response: stopConditions.stopOnClientResponse,
          stop_on_invoice_paid: stopConditions.stopOnInvoicePaid,
          stop_on_quote_refused: stopConditions.stopOnQuoteRefused,
        },
        messages: mappedMessages,
        enable_relances_before: enableRelancesBefore,
        days_before_due: daysBeforeDue,
        hours_before_due: hoursBeforeDue,
      };

      logger.log("[RelanceIaModal] Sauvegarde des paramètres:", settingsToSave);

      const savedSettings = await updateFollowUpSettings(settingsToSave, token);

      logger.log("[RelanceIaModal] Paramètres sauvegardés avec succès:", savedSettings);

      // Recharger les paramètres pour vérifier qu'ils sont bien sauvegardés
      const reloadedSettings = await getFollowUpSettings(token);
      logger.log("[RelanceIaModal] Paramètres rechargés:", reloadedSettings);

      showToast("Configuration sauvegardée avec succès", "success");
      onClose();
    } catch (error: any) {
      logger.error("Erreur lors de la sauvegarde:", error);
      showToast("Erreur lors de la sauvegarde de la configuration", "error");
    } finally {
      setIsSaving(false);
    }
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
              {relanceDelays.map((delay, index) => {
                return (
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
                );
              })}
            </div>
            <p className="text-xs text-[#64748B]">
              Les relances seront envoyées automatiquement après ce délai si aucune réponse n'a été reçue.
            </p>
          </div>

          {/* Relances avant la date d'échéance */}
          <div className="space-y-3 pt-4 border-t border-[#E5E7EB]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableRelancesBefore}
                onChange={(e) => setEnableRelancesBefore(e.target.checked)}
                className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
              />
              <span className="text-sm font-medium text-[#0F172A]">
                Envoyer des relances avant la date d'échéance
              </span>
            </label>
            {enableRelancesBefore && (
              <div className="pl-6 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Nombre de jours avant la date d'échéance
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={daysBeforeDue ?? ""}
                      onChange={(e) => setDaysBeforeDue(e.target.value ? parseInt(e.target.value) : null)}
                      min="0"
                      placeholder="Ex: 1"
                      className="w-full max-w-xs rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    />
                    <span className="text-xs text-[#64748B]">jour(s)</span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    La relance sera envoyée X jour(s) avant la date d'échéance
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Nombre d'heures avant la date d'échéance
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={hoursBeforeDue ?? ""}
                      onChange={(e) => setHoursBeforeDue(e.target.value ? parseInt(e.target.value) : null)}
                      min="0"
                      placeholder="Ex: 4"
                      className="w-full max-w-xs rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    />
                    <span className="text-xs text-[#64748B]">heure(s)</span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    La relance sera envoyée X heure(s) avant la date d'échéance
                  </p>
                </div>
                <p className="text-xs text-[#64748B] bg-blue-50 p-2 rounded">
                  💡 Vous pouvez configurer les deux (jours ET heures). La relance sera envoyée dès que l'une des conditions est remplie.
                </p>
              </div>
            )}
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

        {/* Templates de messages pour les relances */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#0F172A]">Templates de messages pour les relances</h3>
          <p className="text-sm text-[#64748B]">
            Configurez les messages de base à envoyer pour chaque type de relance. Ces messages seront utilisés lors de la création de relances.
          </p>
          
          <div className="space-y-3">
            {[
              { value: "Devis non répondu", label: "Devis non répondu" },
              { value: "Facture impayée", label: "Facture impayée" },
              { value: "Info manquante", label: "Info manquante" },
              { value: "Rappel RDV", label: "Rappel RDV" },
              { value: "Client inactif", label: "Client inactif" },
              { value: "Projet en attente", label: "Projet en attente" },
            ].map((followupType) => {
              const template = messages.find(m => m.type === followupType.value);
              const templateContent = template?.content || "";
              const templateMethod = template?.method || "email";
              
              return (
                <div key={followupType.value} className="border border-[#E5E7EB] rounded-lg">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-[#0F172A]">
                        {followupType.label}
                      </label>
                      <div className="flex items-center gap-2">
                        {templateContent && (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                            Template configuré
                          </span>
                        )}
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {templateMethod === "sms" ? "SMS" : "Email"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Sélecteur de méthode (Email/SMS) */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-[#64748B] mb-2">
                        Méthode d'envoi
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`method-${followupType.value}`}
                            value="email"
                            checked={templateMethod === "email"}
                            onChange={(e) => {
                              const updatedMessages = [...messages];
                              const existingIndex = updatedMessages.findIndex(m => m.type === followupType.value);
                              
                              if (existingIndex >= 0) {
                                updatedMessages[existingIndex] = { ...updatedMessages[existingIndex], method: e.target.value };
                              } else {
                                const newId = Math.max(0, ...updatedMessages.map(m => m.id), 0) + 1;
                                updatedMessages.push({
                                  id: newId,
                                  type: followupType.value,
                                  content: "",
                                  method: e.target.value
                                });
                              }
                              setMessages(updatedMessages);
                            }}
                            className="w-4 h-4 text-[#F97316] border-[#E5E7EB] focus:ring-[#F97316] focus:ring-2"
                          />
                          <span className="text-sm text-[#0F172A]">📧 Email</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`method-${followupType.value}`}
                            value="sms"
                            checked={templateMethod === "sms"}
                            onChange={(e) => {
                              const updatedMessages = [...messages];
                              const existingIndex = updatedMessages.findIndex(m => m.type === followupType.value);
                              
                              if (existingIndex >= 0) {
                                updatedMessages[existingIndex] = { ...updatedMessages[existingIndex], method: e.target.value };
                              } else {
                                const newId = Math.max(0, ...updatedMessages.map(m => m.id), 0) + 1;
                                updatedMessages.push({
                                  id: newId,
                                  type: followupType.value,
                                  content: "",
                                  method: e.target.value
                                });
                              }
                              setMessages(updatedMessages);
                            }}
                            className="w-4 h-4 text-[#F97316] border-[#E5E7EB] focus:ring-[#F97316] focus:ring-2"
                          />
                          <span className="text-sm text-[#0F172A]">📱 SMS</span>
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-[#64748B]">
                        La relance sera envoyée via {templateMethod === "sms" ? "SMS (Vonage)" : "email"}
                      </p>
                    </div>
                    
                    <textarea
                      value={templateContent}
                      onChange={(e) => {
                        const updatedMessages = [...messages];
                        const existingIndex = updatedMessages.findIndex(m => m.type === followupType.value);
                        
                        if (existingIndex >= 0) {
                          updatedMessages[existingIndex] = { ...updatedMessages[existingIndex], content: e.target.value };
                        } else {
                          const newId = Math.max(0, ...updatedMessages.map(m => m.id), 0) + 1;
                          updatedMessages.push({
                            id: newId,
                            type: followupType.value,
                            content: e.target.value,
                            method: templateMethod
                          });
                        }
                        setMessages(updatedMessages);
                      }}
                      placeholder={`Exemple : Bonjour {client_name},\n\nNous vous contactons concernant {source_label}.\n\nCordialement,\n{company_name}`}
                      rows={4}
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    />
                    <p className="mt-2 text-xs text-[#64748B]">
                      Variables disponibles : <code className="bg-white px-1 rounded">{"{client_name}"}</code>, <code className="bg-white px-1 rounded">{"{source_label}"}</code>, <code className="bg-white px-1 rounded">{"{company_name}"}</code>, <code className="bg-white px-1 rounded">{"{company_email}"}</code>, <code className="bg-white px-1 rounded">{"{company_phone}"}</code>, <code className="bg-white px-1 rounded">{"{company_address}"}</code>, <code className="bg-white px-1 rounded">{"{company_city}"}</code>, <code className="bg-white px-1 rounded">{"{company_postal_code}"}</code>, <code className="bg-white px-1 rounded">{"{company_country}"}</code>, <code className="bg-white px-1 rounded">{"{company_siren}"}</code>, <code className="bg-white px-1 rounded">{"{company_siret}"}</code>, <code className="bg-white px-1 rounded">{"{company_vat_number}"}</code>, <code className="bg-white px-1 rounded">{"{amount}"}</code>
                    </p>
                  </div>
                </div>
              );
            })}
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
            disabled={isSaving}
            className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Sauvegarde..." : "Enregistrer la configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}

