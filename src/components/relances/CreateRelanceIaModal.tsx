"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { createFollowUp, generateFollowUpMessage, sendFollowUp, getFollowUpSettings, type FollowUpType } from "@/services/followupsService";
import { getClients } from "@/services/clientsService";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";

interface CreateRelanceIaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ContactMethod = "email" | "phone";

export function CreateRelanceIaModal({ isOpen, onClose, onSuccess }: CreateRelanceIaModalProps) {
  const { token, user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  
  const [contactMethod, setContactMethod] = useState<ContactMethod>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<FollowUpType>("Info manquante");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [createdFollowUpId, setCreatedFollowUpId] = useState<number | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState<Array<{ id: number; email: string; name: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [followupTemplates, setFollowupTemplates] = useState<Array<{ type: string; content: string }>>([]);

  // Charger les suggestions d'emails et les templates au montage
  useEffect(() => {
    if (isOpen && token) {
      if (contactMethod === "email") {
        loadEmailSuggestions();
      }
      loadFollowupTemplates();
    }
  }, [isOpen, contactMethod, token]);

  // Charger les templates de relance
  const loadFollowupTemplates = async () => {
    if (!token) return;
    
    try {
      const settings = await getFollowUpSettings(token);
      setFollowupTemplates(settings.messages || []);
    } catch (error) {
      console.error("Erreur lors du chargement des templates:", error);
    }
  };

  // Générer automatiquement le message quand le type change ou qu'un client est sélectionné
  useEffect(() => {
    if (type && selectedClientId && followupTemplates.length > 0) {
      generateMessageFromTemplate();
    } else if (type && followupTemplates.length > 0) {
      // Afficher un aperçu même sans client sélectionné
      generateMessagePreview();
    } else {
      setGeneratedMessage("");
    }
  }, [type, selectedClientId, followupTemplates]);

  // Générer un aperçu du message (sans client sélectionné)
  const generateMessagePreview = () => {
    if (!type) return;
    
    const template = followupTemplates.find(t => t.type === type);
    
    if (template && template.content) {
      // Remplacer les variables avec des valeurs d'exemple
      let previewMessage = template.content;
      previewMessage = previewMessage.replace(/{client_name}/g, "Client");
      previewMessage = previewMessage.replace(/{source_label}/g, "votre dossier");
      previewMessage = previewMessage.replace(/{company_name}/g, "Notre entreprise");
      previewMessage = previewMessage.replace(/{company_email}/g, "");
      previewMessage = previewMessage.replace(/{company_phone}/g, "");
      previewMessage = previewMessage.replace(/{amount}/g, "");
      
      setGeneratedMessage(previewMessage);
    } else {
      setGeneratedMessage("");
    }
  };

  // Générer le message depuis le template avec les vraies valeurs du client
  const generateMessageFromTemplate = async () => {
    if (!token || !selectedClientId || !type) {
      // Si pas de client, afficher juste l'aperçu
      generateMessagePreview();
      return;
    }

    try {
      // Récupérer les informations du client
      const clients = await getClients(token);
      const client = clients.find(c => c.id === selectedClientId);
      
      if (!client) {
        generateMessagePreview();
        return;
      }

      // Trouver le template correspondant au type
      const template = followupTemplates.find(t => t.type === type);
      
      if (template && template.content) {
        // Générer un label descriptif selon le type
        let sourceLabel = "votre dossier";
        const typeStr = String(type).toLowerCase();
        if (typeStr.includes("devis")) {
          sourceLabel = "votre devis";
        } else if (typeStr.includes("facture")) {
          sourceLabel = "votre facture";
        } else if (typeStr.includes("info")) {
          sourceLabel = "votre dossier";
        } else if (typeStr.includes("rdv") || typeStr.includes("rendez-vous")) {
          sourceLabel = "votre rendez-vous";
        } else if (typeStr.includes("projet")) {
          sourceLabel = "votre projet";
        }
        
        // Remplacer les variables avec les vraies valeurs
        let message: string = template.content;
        message = message.replace(/{client_name}/g, client.name || "Client");
        message = message.replace(/{source_label}/g, sourceLabel);
        message = message.replace(/{company_name}/g, "Notre entreprise"); // Sera remplacé côté serveur
        message = message.replace(/{company_email}/g, ""); // Sera remplacé côté serveur
        message = message.replace(/{company_phone}/g, ""); // Sera remplacé côté serveur
        message = message.replace(/{amount}/g, ""); // Sera remplacé côté serveur si montant disponible
        
        setGeneratedMessage(message);
      } else {
        // Si pas de template, utiliser l'aperçu
        generateMessagePreview();
      }
    } catch (error: any) {
      console.error("Erreur lors de la génération du message:", error);
      // En cas d'erreur, utiliser l'aperçu
      generateMessagePreview();
    }
  };

  // Charger les suggestions d'emails depuis les clients
  const loadEmailSuggestions = async () => {
    if (!token) return;
    
    try {
      const clients = await getClients(token);
      // Filtrer les clients qui ont un email (contactEmail dans l'interface Client)
      const clientsWithEmail = clients
        .filter((client) => client.contactEmail && client.contactEmail.trim())
        .map((client) => ({
          id: client.id,
          email: client.contactEmail!,
          name: client.name,
        }));
      setEmailSuggestions(clientsWithEmail);
    } catch (error) {
      console.error("Erreur lors du chargement des suggestions d'emails:", error);
    }
  };

  // Filtrer les suggestions selon la saisie
  const filteredSuggestions = emailSuggestions.filter((client) =>
    client.email.toLowerCase().includes(email.toLowerCase()) ||
    client.name.toLowerCase().includes(email.toLowerCase())
  );

  // Gérer la sélection d'une suggestion
  const selectSuggestion = (client: { id: number; email: string; name: string }) => {
    setEmail(client.email);
    setSelectedClientId(client.id);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    showToast(`Client sélectionné : ${client.name}`, "success");
  };

  // Rechercher un client par email ou téléphone
  const searchClient = async () => {
    const currentToken = token;
    if (!currentToken) {
      showToast("Erreur d'authentification. Veuillez vous reconnecter.", "error");
      return;
    }
    
    setIsSearchingClient(true);
    try {
      const searchTerm = contactMethod === "email" ? email : phone;
      if (!searchTerm.trim()) {
        setIsSearchingClient(false);
        return;
      }

      const clients = await getClients(currentToken, searchTerm);
      
      // Si un client est trouvé, utiliser son ID
      if (clients.length > 0) {
        setSelectedClientId(clients[0].id);
        showToast(`Client trouvé : ${clients[0].name}`, "success");
      } else {
        setSelectedClientId(null);
        showToast("Aucun client trouvé avec ces coordonnées", "info");
      }
    } catch (error: any) {
      console.error("Erreur lors de la recherche du client:", error);
      
      // Gérer les erreurs 401 (session expirée)
      if (error?.isAuthError || error?.status === 401) {
        showToast("Votre session a expiré. Veuillez vous reconnecter.", "error");
        return;
      }
      
      showToast(`Erreur lors de la recherche du client: ${error instanceof Error ? error.message : "Erreur inconnue"}`, "error");
    } finally {
      setIsSearchingClient(false);
    }
  };


  // Créer la relance finale (si le message a déjà été généré, la relance existe déjà)
  const handleCreate = async () => {
    // Récupérer le token à chaque fois (comme dans inbox) pour éviter les problèmes de session expirée
    const currentToken = token;
    
    logger.log("[CreateRelanceIaModal] handleCreate appelé", {
      token: !!currentToken,
      selectedClientId,
      createdFollowUpId,
    });

    if (!currentToken) {
      console.error("[CreateRelanceIaModal] Pas de token");
      showToast("Erreur d'authentification. Veuillez vous reconnecter.", "error");
      return;
    }
    
    if (!selectedClientId) {
      console.warn("[CreateRelanceIaModal] Pas de client sélectionné");
      showToast("Veuillez d'abord rechercher un client", "info");
      return;
    }

    // La raison est maintenant facultative

    logger.log("[CreateRelanceIaModal] Début de la création...");
    setIsCreating(true);
    try {
      // Si le message a déjà été généré, la relance existe déjà (createdFollowUpId est défini)
      // Sinon, créer la relance maintenant
      if (!createdFollowUpId) {
        logger.log("[CreateRelanceIaModal] Création de la relance...");
        await createFollowUp(
          {
            type,
            clientId: selectedClientId,
            sourceType: "manual",
            sourceLabel: `Relance manuelle - ${contactMethod === "email" ? email : phone}`,
            dueDate: new Date().toISOString(),
            status: "À faire",
            autoEnabled: autoEnabled,
          },
          currentToken
        );
        logger.log("[CreateRelanceIaModal] Relance créée avec succès");
      } else {
        logger.log("[CreateRelanceIaModal] Relance déjà créée (ID:", createdFollowUpId, ")");
      }

      showToast("Relance créée avec succès", "success");
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      console.error("[CreateRelanceIaModal] Erreur lors de la création de la relance:", error);
      
      // Gérer les erreurs 401 (session expirée)
      if (error?.isAuthError || error?.status === 401) {
        showToast("Votre session a expiré. Veuillez vous reconnecter.", "error");
        // Ne pas déconnecter automatiquement, laisser l'utilisateur le faire manuellement
        return;
      }
      
      showToast(`Erreur lors de la création de la relance: ${error instanceof Error ? error.message : "Erreur inconnue"}`, "error");
    } finally {
      setIsCreating(false);
    }
  };

  // Envoyer la relance immédiatement
  const handleSendNow = async () => {
    const currentToken = token;
    if (!currentToken) {
      showToast("Erreur d'authentification. Veuillez vous reconnecter.", "error");
      return;
    }

    if (!selectedClientId) {
      showToast("Veuillez d'abord rechercher un client", "info");
      return;
    }

    // La raison est maintenant facultative

    setIsSending(true);
    try {
      let followupId = createdFollowUpId;
      
      // Si la relance n'existe pas encore, la créer
      if (!followupId) {
        const followup = await createFollowUp(
          {
            type,
            clientId: selectedClientId,
            sourceType: "manual",
            sourceLabel: `Relance manuelle - ${contactMethod === "email" ? email : phone}`,
            dueDate: new Date().toISOString(),
            status: "À faire",
            autoEnabled: autoEnabled,
          },
          currentToken
        );
        followupId = followup.id;
        setCreatedFollowUpId(followupId);
      }

      // Le backend régénère toujours le message depuis les templates avec les vraies valeurs
      // On peut passer un message vide ou ne pas le passer, le backend le générera automatiquement
      await sendFollowUp(
        followupId,
        {
          message: "", // Le backend régénère toujours depuis les templates
          method: contactMethod === "email" ? "email" : "sms",
        },
        currentToken
      );

      // Message de succès avec info sur l'automatisation
      if (autoEnabled) {
        showToast("Relance envoyée avec succès ! Le cycle automatique continuera avec les relances restantes.", "success");
      } else {
        showToast("Relance envoyée avec succès !", "success");
      }
      
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      console.error("Erreur lors de l'envoi de la relance:", error);
      
      if (error?.isAuthError || error?.status === 401) {
        showToast("Votre session a expiré. Veuillez vous reconnecter.", "error");
        return;
      }
      
      showToast(`Erreur lors de l'envoi: ${error instanceof Error ? error.message : "Erreur inconnue"}`, "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setPhone("");
    setGeneratedMessage("");
    setSelectedClientId(null);
    setContactMethod("email");
    setType("Info manquante");
    setCreatedFollowUpId(null);
    setAutoEnabled(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Créer une relance"
      size="lg"
    >
      <div className="space-y-6">
        {/* Méthode de contact */}
        <div>
          <Label>Méthode de contact</Label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="email"
                checked={contactMethod === "email"}
                onChange={(e) => setContactMethod(e.target.value as ContactMethod)}
                className="text-[#F97316] focus:ring-[#F97316]"
              />
              <span className="text-sm text-[#0F172A]">Email</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="phone"
                checked={contactMethod === "phone"}
                onChange={(e) => setContactMethod(e.target.value as ContactMethod)}
                className="text-[#F97316] focus:ring-[#F97316]"
              />
              <span className="text-sm text-[#0F172A]">Téléphone</span>
            </label>
          </div>
        </div>

        {/* Email ou Téléphone */}
        <div className="relative">
          <Label>
            {contactMethod === "email" ? "Adresse email" : "Numéro de téléphone"}
          </Label>
          <div className="flex gap-2 mt-2">
            <div className="flex-1 relative">
              <Input
                ref={emailInputRef}
                type={contactMethod === "email" ? "email" : "tel"}
                value={contactMethod === "email" ? email : phone}
                onChange={(e) => {
                  if (contactMethod === "email") {
                    setEmail(e.target.value);
                    setShowSuggestions(e.target.value.length > 0 && filteredSuggestions.length > 0);
                    setHighlightedIndex(-1);
                    // Vérifier si l'email correspond exactement à un client
                    const exactMatch = emailSuggestions.find(
                      (client) => client.email.toLowerCase() === e.target.value.toLowerCase()
                    );
                    if (exactMatch) {
                      setSelectedClientId(exactMatch.id);
                    } else {
                      setSelectedClientId(null);
                    }
                  } else {
                    setPhone(e.target.value);
                    setSelectedClientId(null);
                  }
                }}
                onFocus={() => {
                  if (contactMethod === "email" && email.length > 0 && filteredSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Délai pour permettre le clic sur une suggestion
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                onKeyDown={(e) => {
                  if (contactMethod === "email" && showSuggestions && filteredSuggestions.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedIndex((prev) =>
                        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                    } else if (e.key === "Enter" && highlightedIndex >= 0) {
                      e.preventDefault();
                      selectSuggestion(filteredSuggestions[highlightedIndex]);
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                    }
                  }
                }}
                placeholder={
                  contactMethod === "email"
                    ? "exemple@email.com"
                    : "+33 6 12 34 56 78"
                }
                className="flex-1"
              />
              
              {/* Suggestions d'autocomplétion pour email */}
              {contactMethod === "email" && showSuggestions && filteredSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-60 overflow-auto"
                >
                  {filteredSuggestions.map((client, index) => (
                    <div
                      key={client.id}
                      onClick={() => selectSuggestion(client)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`px-4 py-2 cursor-pointer hover:bg-[#F9FAFB] ${
                        index === highlightedIndex ? "bg-[#F9FAFB]" : ""
                      } ${index === 0 ? "rounded-t-lg" : ""} ${
                        index === filteredSuggestions.length - 1 ? "rounded-b-lg" : ""
                      }`}
                    >
                      <div className="text-sm font-medium text-[#0F172A]">{client.email}</div>
                      <div className="text-xs text-[#64748B]">{client.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button
              onClick={searchClient}
              disabled={isSearchingClient || (!email.trim() && !phone.trim())}
              variant="secondary"
            >
              {isSearchingClient ? "Recherche..." : "Rechercher"}
            </Button>
          </div>
          {selectedClientId && (
            <p className="mt-2 text-sm text-green-600">
              ✓ Client trouvé dans la base de données
            </p>
          )}
        </div>

        {/* Type de relance */}
        <div>
          <Label>Type de relance</Label>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as FollowUpType)}
            className="mt-2"
          >
            <option value="Devis non répondu">Devis non répondu</option>
            <option value="Facture impayée">Facture impayée</option>
            <option value="Info manquante">Info manquante</option>
            <option value="Rappel RDV">Rappel RDV</option>
            <option value="Client inactif">Client inactif</option>
            <option value="Projet en attente">Projet en attente</option>
          </Select>
        </div>

        {/* Message généré automatiquement */}
        {generatedMessage && (
          <div>
            <Label>Aperçu du message</Label>
            <div className="mt-2 p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
              <p className="text-sm text-[#0F172A] whitespace-pre-wrap">
                {generatedMessage}
              </p>
            </div>
            <p className="mt-2 text-xs text-[#64748B]">
              Message généré depuis le template configuré pour "{type}". {selectedClientId ? "Les informations du client seront remplacées lors de l'envoi." : "Sélectionnez un client pour voir le message avec ses informations."}
            </p>
          </div>
        )}

        {/* Automatisation */}
        <div className="space-y-3 pt-4 border-t border-[#E5E7EB]">
          <h4 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide">
            Automatisation
          </h4>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-[#0F172A]">Activer les relances automatiques avec l'IA</p>
              <p className="text-xs text-[#64748B] mt-1">
                La relance sera envoyée automatiquement selon la configuration IA
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
              <input
                type="checkbox"
                checked={autoEnabled}
                onChange={(e) => setAutoEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#E5E7EB] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#F97316] peer-focus:ring-offset-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F97316]"></div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4 border-t border-[#E5E7EB]">
          {/* Indicateur de validation */}
          {!selectedClientId && (
            <div className="text-xs text-[#64748B] space-y-1">
              <p className="text-orange-600">⚠️ Veuillez rechercher un client</p>
            </div>
          )}
          
          <div className="flex items-center justify-end gap-3">
            <Button onClick={handleClose} variant="secondary" type="button">
              Annuler
            </Button>
            <Button
              onClick={handleSendNow}
              disabled={isSending || !selectedClientId}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              {isSending ? "Envoi..." : "📤 Envoyer la relance maintenant"}
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                logger.log("[CreateRelanceIaModal] Bouton cliqué", {
                  isCreating,
                  selectedClientId,
                  disabled: isCreating || !selectedClientId,
                });
                handleCreate();
              }}
              disabled={isCreating || !selectedClientId}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              {isCreating 
                ? "Création..." 
                : createdFollowUpId 
                  ? "Confirmer et fermer" 
                  : "Créer la relance"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
