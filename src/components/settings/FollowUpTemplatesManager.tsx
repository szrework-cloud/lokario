"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getFollowUpSettings, updateFollowUpSettings, type FollowUpSettings } from "@/services/followupsService";
import { User } from "@/services/usersService";

interface FollowUpTemplatesManagerProps {
  settings: any;
  updateSettingsLocal: (settings: any) => void;
  user: User | null;
}

const FOLLOWUP_TYPES = [
  { value: "Devis non répondu", label: "Devis non répondu" },
  { value: "Facture impayée", label: "Facture impayée" },
  { value: "Info manquante", label: "Info manquante" },
  { value: "Rappel RDV", label: "Rappel RDV" },
  { value: "Client inactif", label: "Client inactif" },
  { value: "Projet en attente", label: "Projet en attente" },
];

export function FollowUpTemplatesManager({ settings, updateSettingsLocal, user }: FollowUpTemplatesManagerProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [followupSettings, setFollowupSettings] = useState<FollowUpSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  // Charger les paramètres de relance
  useEffect(() => {
    const loadSettings = async () => {
      if (!token) return;
      
      setIsLoading(true);
      try {
        const data = await getFollowUpSettings(token);
        setFollowupSettings(data);
        // Ouvrir tous les types par défaut
        setExpandedTypes(new Set(FOLLOWUP_TYPES.map(t => t.value)));
      } catch (error: any) {
        console.error("Erreur lors du chargement des paramètres de relance:", error);
        showToast("Erreur lors du chargement des templates", "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [token, showToast]);

  // Obtenir le template pour un type donné
  const getTemplateForType = (type: string): string => {
    if (!followupSettings) return "";
    const template = followupSettings.messages.find(m => m.type === type);
    return template?.content || "";
  };

  // Obtenir la méthode pour un type donné
  const getMethodForType = (type: string): string => {
    if (!followupSettings) return "email";
    const template = followupSettings.messages.find(m => m.type === type);
    return template?.method || "email";
  };

  // Mettre à jour le template pour un type
  const updateTemplate = (type: string, content: string) => {
    if (!followupSettings) return;
    
    const updatedMessages = [...followupSettings.messages];
    const existingIndex = updatedMessages.findIndex(m => m.type === type);
    
    if (existingIndex >= 0) {
      updatedMessages[existingIndex] = { ...updatedMessages[existingIndex], content };
    } else {
      // Créer un nouveau template
      const newId = Math.max(0, ...updatedMessages.map(m => m.id)) + 1;
      updatedMessages.push({ id: newId, type, content, method: "email" });
    }
    
    setFollowupSettings({ ...followupSettings, messages: updatedMessages });
  };

  // Mettre à jour la méthode pour un type
  const updateMethod = (type: string, method: string) => {
    if (!followupSettings) return;
    
    const updatedMessages = [...followupSettings.messages];
    const existingIndex = updatedMessages.findIndex(m => m.type === type);
    
    if (existingIndex >= 0) {
      updatedMessages[existingIndex] = { ...updatedMessages[existingIndex], method };
    } else {
      // Créer un nouveau template avec la méthode
      const newId = Math.max(0, ...updatedMessages.map(m => m.id)) + 1;
      updatedMessages.push({ id: newId, type, content: "", method });
    }
    
    setFollowupSettings({ ...followupSettings, messages: updatedMessages });
  };

  // Sauvegarder les templates
  const handleSave = async () => {
    if (!token || !followupSettings) return;
    
    setIsSaving(true);
    try {
      await updateFollowUpSettings(
        { messages: followupSettings.messages },
        token
      );
      showToast("Templates sauvegardés avec succès", "success");
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      showToast("Erreur lors de la sauvegarde des templates", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle l'expansion d'un type
  const toggleType = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  if (isLoading) {
    return <div className="text-sm text-[#64748B]">Chargement des templates...</div>;
  }

  if (!followupSettings) {
    return <div className="text-sm text-red-600">Erreur lors du chargement des templates</div>;
  }

  return (
    <div className="space-y-4">
      {FOLLOWUP_TYPES.map((followupType) => {
        const isExpanded = expandedTypes.has(followupType.value);
        const templateContent = getTemplateForType(followupType.value);
        const templateMethod = getMethodForType(followupType.value);
        
        return (
          <div key={followupType.value} className="border border-[#E5E7EB] rounded-lg">
            <button
              type="button"
              onClick={() => toggleType(followupType.value)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#0F172A]">
                  {followupType.label}
                </span>
                {templateContent && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    Template configuré
                  </span>
                )}
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {templateMethod === "sms" ? "SMS" : "Email"}
                </span>
              </div>
              <span className="text-[#64748B]">
                {isExpanded ? "▼" : "▶"}
              </span>
            </button>
            
            {isExpanded && (
              <div className="p-4 border-t border-[#E5E7EB] bg-[#F9FAFB] space-y-4">
                {/* Sélecteur de méthode (Email/SMS) */}
                <div>
                  <Label>Méthode d'envoi</Label>
                  <div className="mt-2 flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`method-${followupType.value}`}
                        value="email"
                        checked={templateMethod === "email"}
                        onChange={(e) => updateMethod(followupType.value, e.target.value)}
                        disabled={user?.role === "user"}
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
                        onChange={(e) => updateMethod(followupType.value, e.target.value)}
                        disabled={user?.role === "user"}
                        className="w-4 h-4 text-[#F97316] border-[#E5E7EB] focus:ring-[#F97316] focus:ring-2"
                      />
                      <span className="text-sm text-[#0F172A]">📱 SMS</span>
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-[#64748B]">
                    La relance sera envoyée via {templateMethod === "sms" ? "SMS (Vonage)" : "email"}
                  </p>
                </div>

                {/* Contenu du template */}
                <div>
                  <Label htmlFor={`template-${followupType.value}`}>
                    Message de base pour "{followupType.label}"
                  </Label>
                  <Textarea
                    id={`template-${followupType.value}`}
                    value={templateContent}
                    onChange={(e) => updateTemplate(followupType.value, e.target.value)}
                    placeholder={`Exemple : Bonjour {client_name},\n\nNous vous contactons concernant {source_label}.\n\nCordialement,\n{company_name}`}
                    rows={6}
                    className="mt-2 font-mono text-xs"
                    disabled={user?.role === "user"}
                  />
                  <p className="mt-2 text-xs text-[#64748B]">
                    Variables disponibles : <code className="bg-white px-1 rounded">{"{client_name}"}</code>, <code className="bg-white px-1 rounded">{"{source_label}"}</code>, <code className="bg-white px-1 rounded">{"{company_name}"}</code>, <code className="bg-white px-1 rounded">{"{company_email}"}</code>, <code className="bg-white px-1 rounded">{"{company_phone}"}</code>, <code className="bg-white px-1 rounded">{"{amount}"}</code>
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {user?.role !== "user" && (
        <div className="pt-4 border-t border-[#E5E7EB] flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            variant="primary"
          >
            {isSaving ? "Sauvegarde..." : "Enregistrer les templates"}
          </Button>
        </div>
      )}
    </div>
  );
}
