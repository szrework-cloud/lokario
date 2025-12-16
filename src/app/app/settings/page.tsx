"use client";

import { useState, useEffect, useRef } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { ModuleToggle } from "@/components/settings/ModuleToggle";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/hooks/useToast";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/ui/Loader";
import { InboxIntegrationsTab } from "@/components/settings/InboxIntegrationsTab";
import { getCompanyUsers, updateUserPermissions, User, UserPermissions } from "@/services/usersService";
import { useSubscription, useCreatePortalSession } from "@/hooks/queries/useStripe";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { DataPrivacySection } from "@/components/settings/DataPrivacySection";
import { ImportExportSection } from "@/components/settings/ImportExportSection";
import { ChevronDown } from "lucide-react";
import { logger } from "@/lib/logger";
import { 
  getBillingLineTemplates, 
  createBillingLineTemplate, 
  updateBillingLineTemplate, 
  deleteBillingLineTemplate,
  BillingLineTemplate 
} from "@/services/billingLineTemplatesService";

export default function SettingsPage() {
  // Vérifier si un onglet est spécifié dans l'URL
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      return tab || "company";
    }
    return "company";
  });
  const { showToast } = useToast();
  const { user, token } = useAuth();
  const {
    company,
    settings,
    isLoading,
    error,
    updateSettingsLocal,
    saveSettings,
    reloadSettings,
  } = useSettings(false); // Ne pas recharger ici, déjà chargé dans AppLayout (pas de polling)
  const [isSaving, setIsSaving] = useState(false);
  
  // État pour les informations de l'entreprise
  const [companyName, setCompanyName] = useState("");
  const [companySector, setCompanySector] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companyPostalCode, setCompanyPostalCode] = useState("");
  const [companyCountry, setCompanyCountry] = useState("");
  const [companySiren, setCompanySiren] = useState("");
  const [companySiret, setCompanySiret] = useState("");
  const [companyLegalForm, setCompanyLegalForm] = useState("");
  const [companyVatNumber, setCompanyVatNumber] = useState("");
  const [companyTimezone, setCompanyTimezone] = useState("Europe/Paris");
  const [isAutoEntrepreneur, setIsAutoEntrepreneur] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0, scale: 1 });
  
  // État pour charger l'email depuis l'intégration inbox
  const [primaryEmail, setPrimaryEmail] = useState<string>("");
  
  // Charger l'email depuis l'intégration inbox principale
  useEffect(() => {
    const loadPrimaryEmail = async () => {
      if (!token || activeTab !== "company") return;
      
      try {
        const { apiGet } = await import("@/lib/api");
        const integrations = await apiGet<any[]>("/inbox/integrations", token);
        const primaryIntegration = integrations.find(
          (int: any) => int.is_primary === true && int.integration_type === "imap"
        );
        if (primaryIntegration?.email_address) {
          setPrimaryEmail(primaryIntegration.email_address);
        }
      } catch (err) {
        // Ne pas afficher d'erreur si l'endpoint n'existe pas ou s'il n'y a pas d'intégration
        // C'est normal si l'utilisateur n'a pas encore configuré d'intégration inbox
        logger.debug("Aucune intégration inbox trouvée ou endpoint non disponible");
      }
    };
    
    loadPrimaryEmail();
  }, [token, activeTab]);
  
  // Initialiser les valeurs depuis company et settings
  useEffect(() => {
    if (company) {
      setCompanyName(company.name || "");
      setCompanySector(company.sector || "");
      setIsAutoEntrepreneur((company as any).is_auto_entrepreneur === true);
    }
    if (settings?.settings) {
      // Log pour debug
      logger.debug("Chargement settings - company_info:", (settings.settings as any).company_info);
      const companyInfo = (settings.settings as any).company_info || {};
      // Récupérer l'email depuis company_info, integrations.email_from, l'intégration inbox principale, ou l'email de l'utilisateur
      const emailFromSettings = 
        companyInfo.email || 
        settings.settings.integrations?.email_from || 
        primaryEmail || 
        user?.email ||  // Utiliser l'email de l'utilisateur comme fallback
        "";
      setCompanyEmail(emailFromSettings);
      setCompanyPhone(companyInfo.phone || "");
      setCompanyAddress(companyInfo.address || "");
      setCompanyCity(companyInfo.city || "");
      setCompanyPostalCode(companyInfo.postal_code || "");
      setCompanyCountry(companyInfo.country || "");
      setCompanySiren(companyInfo.siren || "");
      setCompanySiret(companyInfo.siret || "");
      setCompanyLegalForm(companyInfo.legal_form || "");
      setCompanyVatNumber(companyInfo.vat_number || "");
      setCompanyTimezone(companyInfo.timezone || "Europe/Paris");
      
      // Charger les paramètres de recadrage du logo
      if (companyInfo.logo_crop_position) {
        setCropPosition({
          x: companyInfo.logo_crop_position.x || 0,
          y: companyInfo.logo_crop_position.y || 0,
          scale: companyInfo.logo_crop_position.scale || 1,
        });
      }
      
      // Charger le logo existant si disponible
      if (companyInfo.logo_path && token) {
        const loadLogo = async () => {
          try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${API_URL}/companies/me/logo`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (response.ok) {
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              // Libérer l'ancienne URL blob si elle existe
              if (logoPreview && logoPreview.startsWith("blob:")) {
                URL.revokeObjectURL(logoPreview);
              }
              setLogoPreview(blobUrl);
            } else {
              console.error(`Erreur lors du chargement du logo: ${response.status} ${response.statusText}, logo_path: ${companyInfo.logo_path}`);
              // Ne pas supprimer logoPreview si on a déjà une image chargée
            }
          } catch (err) {
            console.error("Erreur lors du chargement du logo:", err, "logo_path:", companyInfo.logo_path);
            // Ne pas supprimer logoPreview si on a déjà une image chargée
          }
        };
        loadLogo();
      } else if (!companyInfo.logo_path) {
        // Si pas de logo_path, réinitialiser l'aperçu seulement si on n'a pas déjà un logoPreview
        // (pour éviter de supprimer un logo qui vient d'être uploadé)
        if (!logoPreview) {
          setLogoPreview(null);
        }
      }
    } else if (user?.email && !companyEmail) {
      // Si pas encore de settings chargés mais qu'on a l'email de l'utilisateur, l'utiliser temporairement
      setCompanyEmail(user.email);
    }
  }, [company, settings, primaryEmail, user?.email]);

  // État pour les paramètres de rendez-vous
  const [appointmentSettings, setAppointmentSettings] = useState<{
    autoReminderEnabled: boolean;
    autoReminderOffsetHours: number;
    includeRescheduleLinkInReminder: boolean;
    autoNoShowMessageEnabled: boolean;
    rescheduleBaseUrl: string;
    maxReminderRelances?: number;
    reminderRelances?: Array<{ id: number; relance_number: number; hours_before: number; content: string }>;
  }>({
    autoReminderEnabled: true,
    autoReminderOffsetHours: 4,
    includeRescheduleLinkInReminder: true,
    autoNoShowMessageEnabled: true,
    rescheduleBaseUrl: typeof window !== "undefined" ? `${window.location.origin}/r/{slugEntreprise}` : "https://lokario.fr/r/{slugEntreprise}",
    maxReminderRelances: 1,
    reminderRelances: [],
  });
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  // Charger les paramètres de rendez-vous
  useEffect(() => {
    const loadAppointmentSettings = async () => {
      if (activeTab !== "appointments" || !token) return;
      
      setIsLoadingAppointments(true);
      try {
        const { getAppointmentSettings } = await import("@/services/appointmentsService");
        const settingsData = await getAppointmentSettings(token);
        if (!settingsData.rescheduleBaseUrl) {
          const defaultUrl = `${typeof window !== "undefined" ? window.location.origin : "https://lokario.fr"}/r/{slugEntreprise}`;
          settingsData.rescheduleBaseUrl = defaultUrl;
        }
        // Initialiser maxReminderRelances et reminderRelances si absents
        if (settingsData.maxReminderRelances === undefined) {
          settingsData.maxReminderRelances = 1;
        }
        if (!settingsData.reminderRelances || settingsData.reminderRelances.length === 0) {
          // Créer un template par défaut pour la première relance
          settingsData.reminderRelances = [{
            id: 1,
            relance_number: 1,
            hours_before: settingsData.autoReminderOffsetHours || 4,
            content: "Bonjour {client_name},\n\nNous vous rappelons votre rendez-vous prévu le {appointment_date} à {appointment_time}.\n\nÀ bientôt,\n{company_name}",
          }];
        }
        setAppointmentSettings({
          ...settingsData,
          rescheduleBaseUrl: settingsData.rescheduleBaseUrl || (typeof window !== "undefined" ? `${window.location.origin}/r/{slugEntreprise}` : "https://lokario.fr/r/{slugEntreprise}"),
        });
      } catch (err) {
        console.error("Erreur lors du chargement des paramètres de rendez-vous:", err);
      } finally {
        setIsLoadingAppointments(false);
      }
    };

    loadAppointmentSettings();
  }, [activeTab, token]);

  // Sauvegarder les paramètres de rendez-vous
  const handleSaveAppointmentSettings = async () => {
    if (!token) return;
    
    setIsSaving(true);
    try {
      const { updateAppointmentSettings } = await import("@/services/appointmentsService");
      // S'assurer que reminderRelances est bien formaté
      const settingsToSave = {
        ...appointmentSettings,
        reminderRelances: appointmentSettings.reminderRelances || [],
      };
      await updateAppointmentSettings(token, settingsToSave);
      showToast("Paramètres de rendez-vous sauvegardés avec succès", "success");
    } catch (error: any) {
      console.error("Error saving appointment settings:", error);
      showToast(error.message || "Erreur lors de la sauvegarde", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // État pour les taux de TVA
  const [taxRates, setTaxRates] = useState<number[]>([0, 2.1, 5.5, 10, 20]);
  const [newTaxRate, setNewTaxRate] = useState<string>("");

  // État pour les lignes de facturation sauvegardées
  const [billingLineTemplates, setBillingLineTemplates] = useState<BillingLineTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BillingLineTemplate | null>(null);
  
  // État pour la personnalisation du design des devis
  const [quotePrimaryColor, setQuotePrimaryColor] = useState("#F97316");
  const [quoteSecondaryColor, setQuoteSecondaryColor] = useState("#F0F0F0");
  const [quoteLogoFile, setQuoteLogoFile] = useState<File | null>(null);
  const [quoteLogoPreview, setQuoteLogoPreview] = useState<string | null>(null);
  const [quotePreviewUrl, setQuotePreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [quoteFooterText, setQuoteFooterText] = useState("");
  const [quoteTermsText, setQuoteTermsText] = useState("");
  const [quoteSignatureFile, setQuoteSignatureFile] = useState<File | null>(null);
  const [quoteSignaturePreview, setQuoteSignaturePreview] = useState<string | null>(null);
  const [quoteEmailTemplate, setQuoteEmailTemplate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [editForm, setEditForm] = useState<{ description: string; unit_price_ht: string; tax_rate: string }>({
    description: "",
    unit_price_ht: "",
    tax_rate: "",
  });

  // Charger les taux de TVA depuis les settings
  useEffect(() => {
    if (settings?.settings) {
      const billingSettings = (settings.settings as any).billing;
      if (billingSettings?.tax_rates) {
        setTaxRates(billingSettings.tax_rates);
      }
      // Charger la configuration du design des devis
      const quoteDesign = billingSettings?.quote_design || {};
      if (quoteDesign.primary_color) {
        setQuotePrimaryColor(quoteDesign.primary_color);
      }
      if (quoteDesign.secondary_color) {
        setQuoteSecondaryColor(quoteDesign.secondary_color);
      }
      if (quoteDesign.footer_text) {
        setQuoteFooterText(quoteDesign.footer_text);
      }
      if (quoteDesign.terms_text) {
        setQuoteTermsText(quoteDesign.terms_text);
      }
      if (quoteDesign.signature_path) {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        // Ajouter le token dans l'URL pour l'authentification
        setQuoteSignaturePreview(`${backendUrl}/companies/me/signature?token=${token}`);
      }
      if (quoteDesign.logo_path) {
        // Construire l'URL du logo depuis le chemin relatif
        // Le logo est stocké dans uploads/{company_id}/logo_xxx.jpg
        // Pour l'instant, on utilise le logo de l'entreprise (même endpoint)
        // TODO: Créer un endpoint spécifique pour servir les logos de devis
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        // On utilise l'endpoint de logo de l'entreprise (qui cherche dans company_info)
        // Pour les devis, on pourrait utiliser le même logo ou créer un endpoint dédié
        // Ajouter le token dans l'URL pour l'authentification
        setQuoteLogoPreview(`${backendUrl}/companies/me/logo?token=${token}`);
      }
      // Charger le template d'email pour les devis
      if (billingSettings?.quote_email_template) {
        setQuoteEmailTemplate(billingSettings.quote_email_template);
      } else {
        // Template par défaut
        setQuoteEmailTemplate("Bonjour,\n\nVeuillez trouver ci-joint le devis {quote_number}.\n\nPour signer ce devis électroniquement, veuillez cliquer sur le lien de la signature : {signature_link}\n\n{notes}\n\nCordialement");
      }
      // Charger les modalités de paiement
      if (billingSettings?.payment_terms) {
        setPaymentTerms(billingSettings.payment_terms);
      }
    }
  }, [settings]);

  // Charger les lignes de facturation sauvegardées
  useEffect(() => {
    const loadTemplates = async () => {
      if (activeTab !== "billing" || !token) return;
      
      setIsLoadingTemplates(true);
      try {
        const templates = await getBillingLineTemplates(token);
        setBillingLineTemplates(templates);
      } catch (err) {
        console.error("Erreur lors du chargement des templates:", err);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    
    loadTemplates();
  }, [activeTab, token]);

  const tabs = [
    { id: "company", label: "Infos entreprise" },
    { id: "modules", label: "Modules activés" },
    { id: "ia", label: "Intelligence artificielle" },
    { id: "appointments", label: "Rendez-vous" },
    { id: "billing", label: "Facturation" },
    { id: "privacy", label: "Données personnelles" },
    { id: "subscription", label: "Abonnement" },
    { id: "team", label: "Équipe" },
    { id: "integrations", label: "Intégrations" },
    { id: "notifications", label: "Notifications" },
  ];

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const currentTab = tabs.find(tab => tab.id === activeTab) || tabs[0];

  const handleSave = async () => {
    if (!settings) return;
    
    // Vérifier que les prompts IA sont remplis si on est sur l'onglet IA
    if (activeTab === "ia") {
      const replyPrompt = settings.settings.ia?.inbox?.reply_prompt;
      const summaryPrompt = settings.settings.ia?.inbox?.summary_prompt;
      
      if (!replyPrompt || !replyPrompt.trim()) {
        showToast("Le prompt pour générer une réponse est obligatoire", "error");
        return;
      }
      
      if (!summaryPrompt || !summaryPrompt.trim()) {
        showToast("Le prompt pour résumer le message est obligatoire", "error");
        return;
      }
    }
    
    // Si on est sur l'onglet entreprise, mettre à jour les informations
    if (activeTab === "company") {
      setIsSaving(true);
      try {
        // Uploader le logo si un nouveau fichier a été sélectionné
        if (logoFile && token) {
          const { apiUploadFile } = await import("@/lib/api");
          await apiUploadFile("/companies/me/logo", logoFile, token);
          
          // Libérer l'ancienne URL blob immédiatement pour forcer le rechargement
          if (logoPreview) {
            if (logoPreview.startsWith("blob:")) {
              URL.revokeObjectURL(logoPreview);
            }
            // Réinitialiser l'aperçu pour forcer le rechargement
            setLogoPreview(null);
          }
          
          // Réinitialiser logoFile après upload réussi
          setLogoFile(null);
          
          // Attendre un peu pour que le serveur ait fini de sauvegarder
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Recharger le logo depuis le serveur avec cache-busting pour forcer le rechargement
          try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const timestamp = Date.now(); // Cache-busting
            const response = await fetch(`${API_URL}/companies/me/logo?t=${timestamp}&token=${token}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache',
              },
            });
            if (response.ok) {
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              setLogoPreview(blobUrl);
            } else {
              console.error("Erreur lors du chargement du logo après upload:", response.status, response.statusText);
            }
          } catch (err) {
            console.error("Erreur lors du chargement du logo après upload:", err);
          }
        }
        
        // Recharger les settings AVANT de les mettre à jour pour avoir le logo_path à jour
        await reloadSettings();
        
        // Mettre à jour les settings avec les nouvelles informations
        // S'assurer que company_info existe dans les settings
        // Préserver le logo_path existant pour ne pas l'écraser
        // IMPORTANT: Recharger les settings après reloadSettings() pour avoir les dernières valeurs
        const refreshedSettings = settings?.settings || {};
        const existingCompanyInfo = ((refreshedSettings as any).company_info || {});
        
        // Log pour debug
        logger.debug("Sauvegarde settings - logo_path existant:", existingCompanyInfo.logo_path);
        
        const updatedSettings = {
          ...refreshedSettings,
          company_info: {
            ...existingCompanyInfo, // Préserver toutes les valeurs existantes (dont logo_path)
            email: companyEmail || null,
            phone: companyPhone || null,
            address: companyAddress || null,
            city: companyCity || null,
            postal_code: companyPostalCode || null,
            country: companyCountry || null,
            siren: companySiren || null,
            siret: companySiret || null,
            legal_form: companyLegalForm || null,
            vat_number: companyVatNumber || null,
            timezone: companyTimezone || "Europe/Paris",
            logo_crop_position: cropPosition, // Sauvegarder les paramètres de recadrage
            // logo_path est préservé depuis existingCompanyInfo
          },
        };
        
        // Vérifier que logo_path est bien préservé
        if (existingCompanyInfo.logo_path && !updatedSettings.company_info.logo_path) {
          console.error("ERREUR: logo_path perdu lors de la sauvegarde!");
          updatedSettings.company_info.logo_path = existingCompanyInfo.logo_path;
        }
        
        await saveSettings(updatedSettings);
        
        // Mettre à jour le nom, secteur et statut auto-entrepreneur de l'entreprise via l'API
        if (token && (
          companyName !== company?.name || 
          companySector !== company?.sector ||
          isAutoEntrepreneur !== (company as any)?.is_auto_entrepreneur
        )) {
          const { apiPatch } = await import("@/lib/api");
          await apiPatch(
            "/companies/me",
            {
              name: companyName,
              sector: companySector || null,
              is_auto_entrepreneur: isAutoEntrepreneur,
            },
            token
          );
        }
        
        // Recharger les settings pour avoir les nouvelles données de l'entreprise
        await reloadSettings();
        
        // Attendre un peu pour que les données soient bien rechargées
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Recharger le logo depuis le serveur après rechargement des settings
        // Seulement si on n'a pas déjà uploadé un nouveau logo (déjà rechargé plus haut)
        if (token && !logoFile) {
          // Attendre un peu pour que reloadSettings() soit terminé et que les settings soient à jour
          setTimeout(async () => {
            try {
              // Recharger les settings pour avoir le logo_path à jour
              await reloadSettings();
              
              // Vérifier que logo_path existe dans les settings
              const currentSettings = settings?.settings || {};
              const companyInfo = ((currentSettings as any).company_info || {});
              
              if (companyInfo.logo_path) {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                const response = await fetch(`${API_URL}/companies/me/logo`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                });
                if (response.ok) {
                  const blob = await response.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  // Libérer l'ancienne URL blob si elle existe
                  if (logoPreview && logoPreview.startsWith("blob:")) {
                    URL.revokeObjectURL(logoPreview);
                  }
                  setLogoPreview(blobUrl);
                } else if (response.status === 404) {
                  console.error(`Logo non trouvé après rechargement: ${response.status}, logo_path: ${companyInfo.logo_path}`);
                }
              } else {
                logger.debug("Pas de logo_path dans les settings après rechargement");
              }
            } catch (err) {
              console.error("Erreur lors du rechargement du logo:", err);
            }
          }, 500);
        }
        
        showToast("Informations de l'entreprise mises à jour avec succès", "success");
      } catch (err: any) {
        showToast(err.message || "Erreur lors de la mise à jour", "error");
      } finally {
        setIsSaving(false);
      }
      return;
    }
    
    setIsSaving(true);
    try {
      await saveSettings(settings.settings);
      showToast("Paramètres mis à jour avec succès", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la mise à jour", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // État pour l'équipe
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [updatingPermissions, setUpdatingPermissions] = useState<number | null>(null);

  // Charger l'équipe depuis le backend
  useEffect(() => {
    const loadTeam = async () => {
      if (activeTab !== "team" || !token) return;
      
      setIsLoadingTeam(true);
      setTeamError(null);
      try {
        const users = await getCompanyUsers(token);
        setTeamMembers(users);
      } catch (err: any) {
        console.error("Erreur lors du chargement de l'équipe:", err);
        setTeamError(err.message || "Erreur lors du chargement de l'équipe");
      } finally {
        setIsLoadingTeam(false);
      }
    };

    loadTeam();
  }, [activeTab, token]);

  // Fonction pour mettre à jour les permissions d'un utilisateur
  const handleUpdatePermissions = async (userId: number, permissions: UserPermissions) => {
    if (!token) return;
    
    setUpdatingPermissions(userId);
    try {
      const updatedUser = await updateUserPermissions(token, userId, permissions);
      // Mettre à jour l'utilisateur dans la liste
      setTeamMembers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      showToast("Permissions mises à jour avec succès", "success");
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour des permissions:", err);
      showToast(err.message || "Erreur lors de la mise à jour des permissions", "error");
    } finally {
      setUpdatingPermissions(null);
    }
  };

  return (
    <>
      <PageTitle title="Paramètres" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Paramètres</h1>
          {company && (
            <p className="text-sm text-[#64748B] mt-1">
              Entreprise : <span className="font-medium text-[#0F172A]">{company.name}</span>
            </p>
          )}
        </div>

        {/* Erreur */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Loading - Seulement au premier chargement initial, pas pendant les rechargements */}
        {isLoading && !settings && !error && (
          <div className="py-12">
          <Loader text="Chargement des paramètres de votre entreprise..." />
          </div>
        )}

      {/* Menu déroulant - Toujours afficher même pendant le chargement */}
      {(!isLoading || settings) && (
        <>
      <div className="mb-6 relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full max-w-xs flex items-center justify-between px-4 py-3 text-sm font-medium text-[#0F172A] bg-white border-2 border-[#E5E7EB] rounded-lg shadow-sm hover:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] transition-all duration-200"
        >
          <span>{currentTab.label}</span>
          <ChevronDown 
            className={`w-5 h-5 text-[#64748B] transition-transform duration-200 ${
              isDropdownOpen ? 'transform rotate-180' : ''
            }`}
          />
        </button>
        
        {isDropdownOpen && (
          <div className="absolute z-50 w-full max-w-xs mt-2 bg-white border-2 border-[#E5E7EB] rounded-lg shadow-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsDropdownOpen(false);
                    // Mettre à jour l'URL sans recharger la page
                    if (typeof window !== "undefined") {
                      const url = new URL(window.location.href);
                      url.searchParams.set("tab", tab.id);
                      window.history.pushState({}, "", url.toString());
                    }
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors duration-150 ${
                    activeTab === tab.id
                      ? "bg-[#F97316]/10 text-[#F97316] border-l-4 border-[#F97316]"
                      : "text-[#0F172A] hover:bg-[#F9FAFB] hover:text-[#F97316]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

          {/* Tab Content - Afficher si on a des settings */}
          {settings && (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        {activeTab === "company" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Nom de l'entreprise
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Mon Commerce"
                disabled={user?.role === "user"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Secteur d'activité
              </label>
              <select
                value={companySector}
                onChange={(e) => setCompanySector(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                disabled={user?.role === "user"}
              >
                <option value="">Sélectionner un secteur</option>
                <option value="Commerce">Commerce</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Beauté / Coiffure">Beauté / Coiffure</option>
                <option value="Services">Services</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Email
              </label>
              <input
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="contact@moncommerce.fr"
                disabled={user?.role === "user"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Logo
              </label>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const imageUrl = reader.result as string;
                          setImageToCrop(imageUrl);
                          // Restaurer les paramètres de recadrage sauvegardés
                          if (settings?.settings) {
                            const companyInfo = (settings.settings as any).company_info || {};
                            if (companyInfo.logo_crop_position) {
                              setCropPosition({
                                x: companyInfo.logo_crop_position.x || 0,
                                y: companyInfo.logo_crop_position.y || 0,
                                scale: companyInfo.logo_crop_position.scale || 1,
                              });
                            }
                          }
                          setShowCropModal(true);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    disabled={user?.role === "user"}
                  />
                  <p className="text-xs text-[#64748B] mt-1">
                    Formats acceptés : JPG, PNG (max 2MB)
                  </p>
                </div>
                {logoPreview && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-24 h-24 rounded-lg border-2 border-[#E5E7EB] bg-white p-2 flex items-center justify-center overflow-hidden" style={{ aspectRatio: '1/1' }}>
                      <img
                        src={logoPreview}
                        alt="Aperçu du logo"
                        className="w-full h-full rounded"
                        style={{ 
                          objectFit: 'cover',
                          width: '100%',
                          height: '100%',
                        }}
                        onError={(e) => {
                          // Si l'image ne charge pas, masquer l'erreur
                          console.error("Erreur lors du chargement de l'image:", e);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setImageToCrop(logoPreview);
                          // Restaurer les paramètres de recadrage sauvegardés
                          if (settings?.settings) {
                            const companyInfo = (settings.settings as any).company_info || {};
                            if (companyInfo.logo_crop_position) {
                              setCropPosition({
                                x: companyInfo.logo_crop_position.x || 0,
                                y: companyInfo.logo_crop_position.y || 0,
                                scale: companyInfo.logo_crop_position.scale || 1,
                              });
                            }
                          }
                          setShowCropModal(true);
                        }}
                        className="text-xs text-[#F97316] hover:text-[#EA580C] underline font-medium"
                      >
                        Recadrer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="+33 1 23 45 67 89"
                disabled={user?.role === "user"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Adresse
              </label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="123 Rue de la République"
                disabled={user?.role === "user"}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  value={companyCity}
                  onChange={(e) => setCompanyCity(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  placeholder="Paris"
                  disabled={user?.role === "user"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Code postal
                </label>
                <input
                  type="text"
                  value={companyPostalCode}
                  onChange={(e) => setCompanyPostalCode(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  placeholder="75001"
                  disabled={user?.role === "user"}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Pays
              </label>
              <input
                type="text"
                value={companyCountry}
                onChange={(e) => setCompanyCountry(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="France"
                disabled={user?.role === "user"}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  SIREN
                </label>
                <input
                  type="text"
                  value={companySiren}
                  onChange={(e) => setCompanySiren(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  placeholder="123456789"
                  disabled={user?.role === "user"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  SIRET
                </label>
                <input
                  type="text"
                  value={companySiret}
                  onChange={(e) => setCompanySiret(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  placeholder="12345678901234"
                  disabled={user?.role === "user"}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Forme juridique
              </label>
              <input
                type="text"
                value={companyLegalForm}
                onChange={(e) => setCompanyLegalForm(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Ex: SARL, SAS, EURL, Auto-entrepreneur..."
                disabled={user?.role === "user"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Numéro de TVA intracommunautaire
              </label>
              <input
                type="text"
                value={companyVatNumber}
                onChange={(e) => setCompanyVatNumber(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="FR12345678901"
                disabled={user?.role === "user"}
              />
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
              <input
                type="checkbox"
                id="is_auto_entrepreneur"
                checked={isAutoEntrepreneur}
                onChange={(e) => setIsAutoEntrepreneur(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#E5E7EB] text-[#F97316] focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                disabled={user?.role === "user"}
              />
              <div className="flex-1">
                <label htmlFor="is_auto_entrepreneur" className="block text-sm font-medium text-[#0F172A] cursor-pointer">
                  Entrepreneur individuel (auto-entrepreneur)
                </label>
                <p className="text-xs text-[#64748B] mt-1">
                  Cochez cette case si votre entreprise est en statut d'auto-entrepreneur. 
                  La TVA sera automatiquement désactivée sur toutes vos factures.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Fuseau horaire
              </label>
              <select 
                value={companyTimezone}
                onChange={(e) => setCompanyTimezone(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1" 
                disabled={user?.role === "user"}
              >
                <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                <option value="Europe/London">Europe/London (UTC+0)</option>
                <option value="America/New_York">America/New_York (UTC-5)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                <option value="Australia/Sydney">Australia/Sydney (UTC+10)</option>
              </select>
            </div>
            {user?.role !== "user" && (
              <div className="pt-4 border-t border-[#E5E7EB] flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-6 py-2 text-sm font-medium shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "modules" && settings && (
          <div className="space-y-4">
            {user?.role !== "super_admin" && (
              <div className="rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3 mb-4">
                <p className="text-sm text-[#9A3412]">
                  <strong>Gestion des modules :</strong> Les modules sont gérés par votre administrateur. 
                  Contactez-nous pour activer un module supplémentaire.
                </p>
              </div>
            )}
            <p className="text-sm text-[#64748B] mb-4">
              {user?.role === "super_admin"
                ? "Activez ou désactivez les modules selon vos besoins."
                : "Modules actuellement activés pour votre entreprise."}
            </p>
            <div className="space-y-0">
              <ModuleToggle
                label="Tâches"
                description="Gestion des tâches, checklists et planning interne."
                enabled={settings.settings.modules.tasks?.enabled ?? true}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        tasks: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Inbox"
                description="Centralisation des échanges clients."
                enabled={settings.settings.modules.inbox?.enabled ?? true}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        inbox: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Relances"
                description="Suivi et automatisation des relances clients."
                enabled={settings.settings.modules.relances?.enabled ?? true}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        relances: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Projets / Dossiers"
                description="Suivi des dossiers et projets clients."
                enabled={settings.settings.modules.projects?.enabled ?? true}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        projects: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Devis & Factures"
                description="Création, suivi et gestion des devis et factures."
                enabled={settings.settings.modules.billing?.enabled ?? true}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        billing: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Reporting"
                description="Tableaux de bord et statistiques."
                enabled={settings.settings.modules.reporting?.enabled ?? true}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        reporting: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Rendez-vous"
                description="Gestion des rendez-vous clients, rappels automatiques et reprogrammations."
                enabled={settings.settings.modules.appointments?.enabled ?? true}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        appointments: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Chatbot interne"
                description="Assistant interne pour vous guider dans l'outil."
                enabled={settings.settings.modules.chatbot_internal?.enabled ?? true}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        chatbot_internal: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Chatbot site web"
                description="Widget de chat pour votre site web."
                enabled={settings.settings.modules.chatbot_site?.enabled ?? false}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        chatbot_site: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
            </div>
          </div>
        )}

        {activeTab === "ia" && settings && (
          <div className="space-y-4">
            <p className="text-sm text-[#64748B] mb-4">
              Configurez les fonctionnalités d'intelligence artificielle.
            </p>
            <div className="space-y-0">
              <ModuleToggle
                label="IA pour les relances"
                description="Génération automatique de messages de relance."
                enabled={settings.settings.ia.ai_relances}
                onToggle={(enabled) => {
                  updateSettingsLocal({
                    ia: {
                      ...settings.settings.ia,
                      ai_relances: enabled,
                    },
                  });
                }}
                disabled={user?.role === "user"}
              />
              <ModuleToggle
                label="Résumé IA de la journée"
                description="Synthèse automatique de vos priorités."
                enabled={settings.settings.ia.ai_summary}
                onToggle={(enabled) => {
                  updateSettingsLocal({
                    ia: {
                      ...settings.settings.ia,
                      ai_summary: enabled,
                    },
                  });
                }}
                disabled={user?.role === "user"}
              />
              <ModuleToggle
                label="Chatbot interne (aide dans l'app)"
                description="Assistant interne pour vous guider dans l'outil."
                enabled={settings.settings.ia.ai_chatbot_internal}
                onToggle={(enabled) => {
                  updateSettingsLocal({
                    ia: {
                      ...settings.settings.ia,
                      ai_chatbot_internal: enabled,
                    },
                  });
                }}
                disabled={user?.role === "user"}
              />
              <ModuleToggle
                label="Chatbot site web"
                description="IA pour répondre aux questions de vos clients sur votre site."
                enabled={settings.settings.ia.ai_chatbot_site}
                onToggle={(enabled) => {
                  updateSettingsLocal({
                    ia: {
                      ...settings.settings.ia,
                      ai_chatbot_site: enabled,
                    },
                  });
                }}
                disabled={user?.role === "user"}
              />
            </div>
            
            {/* Configuration des prompts IA pour l'inbox */}
            <div className="pt-6 border-t border-[#E5E7EB] space-y-4">
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Prompts IA pour l'inbox
              </h3>
              <p className="text-sm text-[#64748B]">
                Personnalisez les prompts utilisés par l'IA pour générer des réponses et résumer les conversations.
                <span className="text-red-600 font-medium"> Les deux prompts sont obligatoires.</span>
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Prompt pour générer une réponse <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={settings.settings.ia?.inbox?.reply_prompt || ""}
                    onChange={(e) => {
                      updateSettingsLocal({
                        ia: {
                          ...settings.settings.ia,
                          inbox: {
                            ...(settings.settings.ia?.inbox || {}),
                            reply_prompt: e.target.value,
                          },
                        },
                      });
                    }}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 min-h-[120px]"
                    placeholder="Entrez le prompt pour générer une réponse..."
                  />
                  <p className="text-xs text-[#64748B] mt-1">
                    Ce prompt guide l'IA pour générer des réponses professionnelles aux messages clients.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Prompt pour résumer le message <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={settings.settings.ia?.inbox?.summary_prompt || ""}
                    onChange={(e) => {
                      updateSettingsLocal({
                        ia: {
                          ...settings.settings.ia,
                          inbox: {
                            ...(settings.settings.ia?.inbox || {}),
                            summary_prompt: e.target.value,
                          },
                        },
                      });
                    }}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 min-h-[120px]"
                    placeholder="Entrez le prompt pour résumer les conversations..."
                  />
                  <p className="text-xs text-[#64748B] mt-1">
                    Ce prompt guide l'IA pour résumer les conversations de manière concise.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Base de connaissances de l'entreprise
                  </label>
                  <textarea
                    value={(settings.settings.ia?.inbox as any)?.knowledge_base || ""}
                    onChange={(e) => {
                      updateSettingsLocal({
                        ia: {
                          ...settings.settings.ia,
                          inbox: {
                            ...(settings.settings.ia?.inbox || {}),
                            knowledge_base: e.target.value,
                          },
                        },
                      });
                    }}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 min-h-[200px]"
                    placeholder="Entrez les informations sur votre entreprise, vos produits, vos services, vos politiques, etc. Cette base de connaissances sera utilisée par l'IA pour générer des réponses plus précises si vous activez l'option 'Utiliser la base de connaissances' dans les dossiers."
                  />
                  <p className="text-xs text-[#64748B] mt-1">
                    Informations sur votre entreprise, produits, services, politiques, etc. Cette base sera utilisée dans les auto-réponses si l'option est activée dans les dossiers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "appointments" && (
          <div className="space-y-6">
            {isLoadingAppointments ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-[#64748B]">Chargement des paramètres...</p>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold text-[#0F172A]">Paramètres d'automatisation</h2>
                    <p className="text-sm text-[#64748B] mt-1">
                      Configurez les messages automatiques envoyés aux clients via l'Inbox.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Rappel automatique */}
                    <div className="space-y-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appointmentSettings.autoReminderEnabled}
                          onChange={(e) =>
                            setAppointmentSettings((prev) => ({ ...prev, autoReminderEnabled: e.target.checked }))
                          }
                          className="mt-1 rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#0F172A]">
                            Envoyer automatiquement un rappel avant chaque rendez-vous
                          </p>
                          <p className="text-xs text-[#64748B] mt-1">
                            Le rappel est envoyé sous forme de message dans la conversation client, personnalisé par l'IA.
                          </p>
                        </div>
                      </label>

                      {appointmentSettings.autoReminderEnabled && (
                        <div className="pl-8 space-y-4">
                          {/* Nombre de relances */}
                          <div>
                            <label className="block text-sm font-medium text-[#0F172A] mb-1">
                              Nombre de relances (maximum 3)
                            </label>
                            <input
                              type="number"
                              value={appointmentSettings.maxReminderRelances || 1}
                              onChange={(e) => {
                                const value = Math.max(1, Math.min(3, parseInt(e.target.value) || 1));
                                const currentRelances = appointmentSettings.reminderRelances || [];
                                // Ajuster le nombre de templates
                                const newRelances = [];
                                for (let i = 1; i <= value; i++) {
                                  const existing = currentRelances.find(r => r.relance_number === i);
                                  if (existing) {
                                    newRelances.push(existing);
                                  } else {
                                    newRelances.push({
                                      id: i,
                                      relance_number: i,
                                      hours_before: 4 * i, // Par défaut : 4h, 8h, 12h
                                      content: `Bonjour {client_name},\n\nNous vous rappelons votre rendez-vous prévu le {appointment_date} à {appointment_time}.\n\n${i > 1 ? `(Rappel ${i})` : ''}\n\nÀ bientôt,\n{company_name}`,
                                    });
                                  }
                                }
                                setAppointmentSettings((prev) => ({
                                  ...prev,
                                  maxReminderRelances: value,
                                  reminderRelances: newRelances,
                                }));
                              }}
                              min="1"
                              max="3"
                              className="w-full max-w-xs rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                            />
                            <p className="text-xs text-[#64748B] mt-1">
                              Vous pouvez configurer jusqu'à 3 relances avant chaque rendez-vous
                            </p>
                          </div>

                          {/* Configuration de chaque relance */}
                          {Array.from({ length: appointmentSettings.maxReminderRelances || 1 }, (_, i) => i + 1).map((relanceNum) => {
                            const relance = (appointmentSettings.reminderRelances || []).find(r => r.relance_number === relanceNum);
                            return (
                              <div key={relanceNum} className="border border-[#E5E7EB] rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-[#0F172A]">
                                    Relance {relanceNum}
                                  </label>
                                  {relance && (
                                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                      Configurée
                                    </span>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                    Nombre d'heures avant le rendez-vous
                                  </label>
                                  <input
                                    type="number"
                                    value={relance?.hours_before || 4}
                                    onChange={(e) => {
                                      const hours = parseInt(e.target.value) || 4;
                                      const currentRelances = appointmentSettings.reminderRelances || [];
                                      const existingIndex = currentRelances.findIndex(r => r.relance_number === relanceNum);
                                      const updatedRelances = [...currentRelances];
                                      
                                      if (existingIndex >= 0) {
                                        updatedRelances[existingIndex] = { ...updatedRelances[existingIndex], hours_before: hours };
                                      } else {
                                        updatedRelances.push({
                                          id: relanceNum,
                                          relance_number: relanceNum,
                                          hours_before: hours,
                                          content: `Bonjour {client_name},\n\nNous vous rappelons votre rendez-vous prévu le {appointment_date} à {appointment_time}.\n\n${relanceNum > 1 ? `(Rappel ${relanceNum})` : ''}\n\nÀ bientôt,\n{company_name}`,
                                        });
                                      }
                                      
                                      setAppointmentSettings((prev) => ({
                                        ...prev,
                                        reminderRelances: updatedRelances,
                                      }));
                                    }}
                                    min="1"
                                    className="w-full max-w-xs rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                    Message de la relance
                                  </label>
                                  <textarea
                                    value={relance?.content || ""}
                                    onChange={(e) => {
                                      const content = e.target.value;
                                      const currentRelances = appointmentSettings.reminderRelances || [];
                                      const existingIndex = currentRelances.findIndex(r => r.relance_number === relanceNum);
                                      const updatedRelances = [...currentRelances];
                                      
                                      if (existingIndex >= 0) {
                                        updatedRelances[existingIndex] = { ...updatedRelances[existingIndex], content };
                                      } else {
                                        updatedRelances.push({
                                          id: relanceNum,
                                          relance_number: relanceNum,
                                          hours_before: 4 * relanceNum,
                                          content,
                                        });
                                      }
                                      
                                      setAppointmentSettings((prev) => ({
                                        ...prev,
                                        reminderRelances: updatedRelances,
                                      }));
                                    }}
                                    rows={4}
                                    placeholder="Bonjour {client_name},\n\nNous vous rappelons votre rendez-vous prévu le {appointment_date} à {appointment_time}.\n\nÀ bientôt,\n{company_name}"
                                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                                  />
                                  <p className="mt-1 text-xs text-[#64748B]">
                                    Variables disponibles : <code className="bg-white px-1 rounded">{"{client_name}"}</code>, <code className="bg-white px-1 rounded">{"{appointment_date}"}</code>, <code className="bg-white px-1 rounded">{"{appointment_time}"}</code>, <code className="bg-white px-1 rounded">{"{company_name}"}</code>, <code className="bg-white px-1 rounded">{"{company_email}"}</code>, <code className="bg-white px-1 rounded">{"{company_phone}"}</code>, <code className="bg-white px-1 rounded">{"{reschedule_url}"}</code>
                                  </p>
                                </div>
                              </div>
                            );
                          })}

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={appointmentSettings.includeRescheduleLinkInReminder}
                              onChange={(e) =>
                                setAppointmentSettings((prev) => ({
                                  ...prev,
                                  includeRescheduleLinkInReminder: e.target.checked,
                                }))
                              }
                              className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                            />
                            <span className="text-sm text-[#0F172A]">
                              Inclure un lien de reprogrammation dans le rappel
                            </span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Message no show */}
                    <div className="pt-4 border-t border-[#E5E7EB]">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appointmentSettings.autoNoShowMessageEnabled}
                          onChange={(e) =>
                            setAppointmentSettings((prev) => ({ ...prev, autoNoShowMessageEnabled: e.target.checked }))
                          }
                          className="mt-1 rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#0F172A]">
                            Après un "no show", envoyer automatiquement un message avec lien de reprogrammation
                          </p>
                          <p className="text-xs text-[#64748B] mt-1">
                            Un message sera automatiquement envoyé dans la conversation client lorsqu'un rendez-vous est marqué comme "no show".
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* URL publique de réservation */}
                    <div className="pt-4 border-t border-[#E5E7EB]">
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">
                        URL publique de réservation
                      </label>
                      <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="flex-1 px-3 py-2 bg-white rounded border border-[#E5E7EB] text-sm text-[#0F172A]">
                            {typeof window !== "undefined" ? window.location.origin : "https://lokario.fr"}/r/{company?.slug || "mon-entreprise"}
                          </code>
                          <button
                            onClick={() => {
                              const url = `${typeof window !== "undefined" ? window.location.origin : "https://lokario.fr"}/r/${company?.slug || "mon-entreprise"}`;
                              navigator.clipboard.writeText(url);
                              showToast("URL copiée dans le presse-papiers !", "success");
                            }}
                            className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#0F172A] hover:bg-white"
                          >
                            Copier
                          </button>
                        </div>
                        <p className="text-xs text-[#64748B]">
                          Partagez cette URL avec vos clients ou intégrez-la sur votre site web pour qu'ils puissent prendre rendez-vous en ligne.
                        </p>
                      </div>
                    </div>

                    {/* URL de reprogrammation */}
                    <div className="pt-4 border-t border-[#E5E7EB]">
                      <label className="block text-sm font-medium text-[#0F172A] mb-2">
                        URL de base pour la reprogrammation
                      </label>
                      <div className="space-y-3">
                        <div>
                          <input
                            type="text"
                            value={appointmentSettings.rescheduleBaseUrl || ""}
                            onChange={(e) =>
                              setAppointmentSettings((prev) => ({ ...prev, rescheduleBaseUrl: e.target.value }))
                            }
                            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                            placeholder={`${typeof window !== "undefined" ? window.location.origin : "https://lokario.fr"}/r/{slugEntreprise}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bouton sauvegarder */}
                    <div className="pt-4 border-t border-[#E5E7EB]">
                      <button
                        onClick={handleSaveAppointmentSettings}
                        disabled={isSaving}
                        className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSaving ? "Sauvegarde..." : "Sauvegarder les paramètres"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {activeTab === "billing" && (
          <div className="space-y-6">
            {/* Section Relances automatiques */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#0F172A]">Relances automatiques</h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Activez les relances automatiques pour les devis non signés et les factures impayées.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(settings.settings as any)?.billing?.auto_followups?.quotes_enabled ?? false}
                      onChange={(e) => {
                        updateSettingsLocal({
                          billing: {
                            ...((settings.settings as any).billing || {}),
                            auto_followups: {
                              ...(((settings.settings as any).billing || {}).auto_followups || {}),
                              quotes_enabled: e.target.checked,
                            },
                          },
                        });
                      }}
                      className="mt-1 rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                      disabled={user?.role === "user"}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#0F172A]">
                        Relances automatiques pour les devis non signés
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">
                        Les relances seront envoyées automatiquement selon les paramètres configurés. Elles s'arrêteront automatiquement quand le devis sera signé.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(settings.settings as any)?.billing?.auto_followups?.invoices_enabled ?? false}
                      onChange={(e) => {
                        updateSettingsLocal({
                          billing: {
                            ...((settings.settings as any).billing || {}),
                            auto_followups: {
                              ...(((settings.settings as any).billing || {}).auto_followups || {}),
                              invoices_enabled: e.target.checked,
                            },
                          },
                        });
                      }}
                      className="mt-1 rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                      disabled={user?.role === "user"}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#0F172A]">
                        Relances automatiques pour les factures impayées
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">
                        Les relances seront envoyées automatiquement selon les paramètres configurés. Elles s'arrêteront automatiquement quand la facture sera payée ou quand le nombre maximum de relances sera atteint.
                      </p>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Section Taux de TVA */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#0F172A]">Taux de TVA</h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Configurez les taux de TVA autorisés pour vos factures et devis.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Taux de TVA configurés
                  </label>
                  <div className="space-y-2">
                    {taxRates.map((rate, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                        <span className="flex-1 text-sm text-[#0F172A] font-medium">
                          {rate}%
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newRates = taxRates.filter((_, i) => i !== index);
                            setTaxRates(newRates);
                          }}
                          className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-200"
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                    {taxRates.length === 0 && (
                      <p className="text-sm text-[#64748B] italic">Aucun taux configuré</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E5E7EB]">
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Ajouter un taux de TVA
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={newTaxRate}
                      onChange={(e) => setNewTaxRate(e.target.value)}
                      placeholder="Ex: 8.5"
                      className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const rate = parseFloat(newTaxRate);
                        if (!isNaN(rate) && rate >= 0 && rate <= 100 && !taxRates.includes(rate)) {
                          setTaxRates([...taxRates, rate].sort((a, b) => a - b));
                          setNewTaxRate("");
                        }
                      }}
                      disabled={!newTaxRate || isNaN(parseFloat(newTaxRate)) || parseFloat(newTaxRate) < 0 || parseFloat(newTaxRate) > 100 || taxRates.includes(parseFloat(newTaxRate))}
                      className="px-4 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Ajouter
                    </button>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Entrez un taux entre 0 et 100 (ex: 20 pour 20%, 5.5 pour 5.5%)
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!settings) return;
                      setIsSaving(true);
                      try {
                        const updatedSettings = {
                          ...settings.settings,
                          billing: {
                            ...((settings.settings as any).billing || {}),
                            tax_rates: taxRates,
                          },
                        };
                        await saveSettings(updatedSettings);
                        showToast("Taux de TVA sauvegardés avec succès", "success");
                      } catch (error: any) {
                        console.error("Error saving tax rates:", error);
                        showToast(error.message || "Erreur lors de la sauvegarde", "error");
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                    className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Sauvegarde..." : "Sauvegarder les taux de TVA"}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Section Lignes de facturation sauvegardées */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#0F172A]">Lignes de facturation</h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Gérez vos descriptions réutilisables avec leurs prix et taux de TVA.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-[#64748B]">Chargement...</p>
                  </div>
                ) : (
                  <>
                    {billingLineTemplates.length === 0 ? (
                      <p className="text-sm text-[#64748B] italic text-center py-8">
                        Aucune ligne sauvegardée. Créez-en une depuis un devis ou une facture.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {billingLineTemplates.map((template) => (
                          <div
                            key={template.id}
                            className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]"
                          >
                            {editingTemplate?.id === template.id ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-[#64748B] mb-1">
                                    Description
                                  </label>
                                  <input
                                    type="text"
                                    value={editForm.description}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, description: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-[#64748B] mb-1">
                                      Prix unitaire HT (€)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={editForm.unit_price_ht}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, unit_price_ht: e.target.value })
                                      }
                                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-[#64748B] mb-1">
                                      TVA (%)
                                    </label>
                                    <select
                                      value={editForm.tax_rate}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, tax_rate: e.target.value })
                                      }
                                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                                    >
                                      {taxRates.map((rate) => (
                                        <option key={rate} value={rate}>
                                          {rate}%
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTemplate(null);
                                      setEditForm({ description: "", unit_price_ht: "", tax_rate: "" });
                                    }}
                                    className="px-4 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!token) return;
                                      try {
                                        await updateBillingLineTemplate(token, template.id, {
                                          description: editForm.description,
                                          unit_price_ht: parseFloat(editForm.unit_price_ht) || 0,
                                          tax_rate: parseFloat(editForm.tax_rate) || 0,
                                        });
                                        const templates = await getBillingLineTemplates(token);
                                        setBillingLineTemplates(templates);
                                        setEditingTemplate(null);
                                        setEditForm({ description: "", unit_price_ht: "", tax_rate: "" });
                                        showToast("Ligne mise à jour avec succès", "success");
                                      } catch (err: any) {
                                        showToast(err.message || "Erreur lors de la mise à jour", "error");
                                      }
                                    }}
                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#F97316] to-[#EA580C] text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                                  >
                                    Enregistrer
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-[#0F172A]">
                                    {template.description}
                                  </p>
                                  <p className="text-xs text-[#64748B] mt-1">
                                    {template.unit_price_ht.toLocaleString("fr-FR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    € HT • TVA {template.tax_rate}%
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTemplate(template);
                                      setEditForm({
                                        description: template.description,
                                        unit_price_ht: template.unit_price_ht.toString(),
                                        tax_rate: template.tax_rate.toString(),
                                      });
                                    }}
                                    className="px-3 py-1 text-xs font-medium text-[#0F172A] hover:bg-white rounded border border-[#E5E7EB]"
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!token) return;
                                      // TODO: Remplacer par ConfirmModal
                                      if (confirm("Êtes-vous sûr de vouloir supprimer cette ligne ?")) {
                                        try {
                                          await deleteBillingLineTemplate(token, template.id);
                                          const templates = await getBillingLineTemplates(token);
                                          setBillingLineTemplates(templates);
                                          showToast("Ligne supprimée avec succès", "success");
                                        } catch (err: any) {
                                          showToast(err.message || "Erreur lors de la suppression", "error");
                                        }
                                      }
                                    }}
                                    className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-200"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Section Modalités de paiement */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#0F172A]">Modalités de paiement</h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Définissez les modalités de paiement qui apparaîtront dans la section "Informations de paiement" de vos devis et factures.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Modalités de paiement
                  </label>
                  <textarea
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    rows={6}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    placeholder="Ex: Virement bancaire - IBAN: FR76 1234 5678 9012 3456 7890 123&#10;Chèque à l'ordre de [Nom de l'entreprise]&#10;Espèces acceptées"
                  />
                  <p className="text-xs text-[#64748B] mt-2">
                    Ces informations apparaîtront dans la section "Informations de paiement" de vos devis et factures.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!settings) return;
                      setIsSaving(true);
                      try {
                        const updatedSettings = {
                          ...settings.settings,
                          billing: {
                            ...((settings.settings as any).billing || {}),
                            payment_terms: paymentTerms,
                          },
                        };
                        await saveSettings(updatedSettings);
                        showToast("Modalités de paiement sauvegardées avec succès", "success");
                      } catch (error: any) {
                        console.error("Error saving payment terms:", error);
                        showToast(error.message || "Erreur lors de la sauvegarde", "error");
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                    className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Sauvegarde..." : "Sauvegarder les modalités"}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Section Template d'email pour les devis */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#0F172A]">Template d'email pour les devis</h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Personnalisez le contenu par défaut des emails envoyés avec les devis. Utilisez les variables suivantes : {"{quote_number}"}, {"{signature_link}"}, {"{notes}"}.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Contenu de l'email
                  </label>
                  <textarea
                    value={quoteEmailTemplate}
                    onChange={(e) => setQuoteEmailTemplate(e.target.value)}
                    rows={12}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 font-mono"
                    placeholder="Bonjour,&#10;&#10;Veuillez trouver ci-joint le devis {quote_number}.&#10;&#10;Pour signer ce devis électroniquement, veuillez cliquer sur le lien de la signature : {signature_link}&#10;&#10;{notes}&#10;&#10;Cordialement"
                  />
                  <p className="text-xs text-[#64748B] mt-2">
                    Variables disponibles : <code className="bg-[#F9FAFB] px-1 py-0.5 rounded">{"{quote_number}"}</code> (numéro du devis), <code className="bg-[#F9FAFB] px-1 py-0.5 rounded">{"{signature_link}"}</code> (lien de signature), <code className="bg-[#F9FAFB] px-1 py-0.5 rounded">{"{notes}"}</code> (notes du devis si présentes)
                  </p>
                </div>
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!settings) return;
                      setIsSaving(true);
                      try {
                        const updatedSettings = {
                          ...settings.settings,
                          billing: {
                            ...((settings.settings as any).billing || {}),
                            quote_email_template: quoteEmailTemplate,
                          },
                        };
                        await saveSettings(updatedSettings);
                        showToast("Template d'email sauvegardé avec succès", "success");
                      } catch (error: any) {
                        console.error("Error saving email template:", error);
                        showToast(error.message || "Erreur lors de la sauvegarde", "error");
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                    className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Sauvegarde..." : "Sauvegarder le template"}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Section Personnalisation du design des devis */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#0F172A]">Personnalisation des devis</h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Personnalisez l'apparence de vos devis avec vos couleurs et votre logo.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Couleurs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">
                      Couleur principale
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={quotePrimaryColor}
                        onChange={(e) => setQuotePrimaryColor(e.target.value)}
                        className="w-16 h-10 rounded-lg border border-[#E5E7EB] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={quotePrimaryColor}
                        onChange={(e) => setQuotePrimaryColor(e.target.value)}
                        placeholder="#F97316"
                        className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                      />
                    </div>
                    <p className="text-xs text-[#64748B] mt-1">
                      Couleur utilisée pour le titre "DEVIS" et les éléments principaux
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">
                      Couleur secondaire
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={quoteSecondaryColor}
                        onChange={(e) => setQuoteSecondaryColor(e.target.value)}
                        className="w-16 h-10 rounded-lg border border-[#E5E7EB] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={quoteSecondaryColor}
                        onChange={(e) => setQuoteSecondaryColor(e.target.value)}
                        placeholder="#F0F0F0"
                        className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                      />
                    </div>
                    <p className="text-xs text-[#64748B] mt-1">
                      Couleur utilisée pour les éléments décoratifs
                    </p>
                  </div>
                </div>

                {/* Logo */}
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Logo de l'entreprise
                  </label>
                  <div className="space-y-3">
                    {quoteLogoPreview && (
                      <div className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                        <img
                          src={quoteLogoPreview}
                          alt="Logo"
                          className="h-16 w-auto object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setQuoteLogoFile(null);
                            setQuoteLogoPreview(null);
                          }}
                          className="ml-auto px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-200"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setQuoteLogoFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setQuoteLogoPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="block w-full text-sm text-[#64748B] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#F97316] file:text-white hover:file:bg-[#EA580C] cursor-pointer"
                      />
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-[#64748B]">
                          Formats acceptés: PNG, JPG, SVG. Taille recommandée: 200x200px minimum
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                          <p className="text-xs text-blue-800 font-medium mb-1">
                            💡 Conseil pour un meilleur rendu :
                          </p>
                          <p className="text-xs text-blue-700">
                            Utilisez un logo au format <strong>PNG avec fond transparent</strong> pour un rendu optimal sur vos devis. 
                            Les logos avec fond blanc ou coloré peuvent créer un effet de "carte" sur le document.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bas de page personnalisé */}
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Bas de page personnalisé
                  </label>
                  <textarea
                    value={quoteFooterText}
                    onChange={(e) => setQuoteFooterText(e.target.value)}
                    placeholder="Ex: Merci pour votre confiance. Pour toute question, contactez-nous à contact@exemple.fr"
                    rows={4}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 text-sm"
                  />
                  <p className="text-xs text-[#64748B] mt-1">
                    Ce texte apparaîtra en bas de chaque devis et facture. Vous pouvez utiliser plusieurs lignes.
                  </p>
                </div>

                {/* Conditions Générales de Vente */}
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Conditions Générales de Vente (CGV)
                  </label>
                  <textarea
                    value={quoteTermsText}
                    onChange={(e) => setQuoteTermsText(e.target.value)}
                    placeholder="Ex: 1. Conditions de paiement : 30 jours net...&#10;2. Livraison : sous 15 jours ouvrés...&#10;3. Garantie : 12 mois..."
                    rows={8}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 text-sm"
                  />
                  <p className="text-xs text-[#64748B] mt-1">
                    Les CGV apparaîtront à la fin de chaque devis et facture, après le contenu principal. Vous pouvez utiliser plusieurs lignes.
                  </p>
                </div>

                {/* Signature de l'entreprise */}
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Signature de l'entreprise
                  </label>
                  <div className="space-y-3">
                    {quoteSignaturePreview && (
                      <div className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                        <img
                          src={quoteSignaturePreview}
                          alt="Signature"
                          className="h-20 w-auto object-contain bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setQuoteSignatureFile(null);
                            setQuoteSignaturePreview(null);
                          }}
                          className="ml-auto px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-200"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setQuoteSignatureFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setQuoteSignaturePreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="block w-full text-sm text-[#64748B] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#F97316] file:text-white hover:file:bg-[#EA580C] cursor-pointer"
                      />
                      <p className="text-xs text-[#64748B] mt-2">
                        Formats acceptés: PNG, JPG. Taille recommandée: largeur 200-400px. La signature apparaîtra en bas du document.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bouton aperçu */}
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!token) {
                        showToast("Vous devez être connecté pour voir l'aperçu", "error");
                        return;
                      }
                      
                      setIsLoadingPreview(true);
                      try {
                        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                        const response = await fetch(`${backendUrl}/quotes/preview`, {
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                        });
                        
                        if (!response.ok) {
                          const errorText = await response.text();
                          console.error("Error response:", errorText);
                          throw new Error("Erreur lors de la génération de l'aperçu");
                        }
                        
                        // Créer un blob et l'afficher dans la page
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        setQuotePreviewUrl(url);
                        showToast("Aperçu généré avec succès", "success");
                      } catch (err: any) {
                        console.error("Error generating preview:", err);
                        showToast("Erreur lors de la génération de l'aperçu", "error");
                      } finally {
                        setIsLoadingPreview(false);
                      }
                    }}
                    disabled={isLoadingPreview}
                    className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoadingPreview ? "⏳ Génération..." : "👁️ Voir l'aperçu"}
                  </button>
                  
                  {/* Aperçu du PDF */}
                  {quotePreviewUrl && (
                    <div className="mt-6 border border-[#E5E7EB] rounded-lg overflow-hidden bg-white">
                      <div className="flex items-center justify-between p-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
                        <h3 className="text-sm font-semibold text-[#0F172A]">Aperçu du devis</h3>
                        <button
                          type="button"
                          onClick={() => {
                            setQuotePreviewUrl(null);
                            window.URL.revokeObjectURL(quotePreviewUrl);
                          }}
                          className="text-xs text-[#64748B] hover:text-[#0F172A]"
                        >
                          ✕ Fermer
                        </button>
                      </div>
                      <div className="w-full" style={{ height: "800px" }}>
                        <iframe
                          src={quotePreviewUrl}
                          className="w-full h-full border-0"
                          title="Aperçu du devis"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bouton sauvegarder */}
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!settings || !token) return;
                      setIsSaving(true);
                      try {
                        let logoPath = null;
                        let signaturePath = null;
                        
                        // Uploader le logo si un fichier a été sélectionné
                        if (quoteLogoFile) {
                          try {
                            const { apiUploadFile } = await import("@/lib/api");
                            // Utiliser l'endpoint de logo de l'entreprise
                            const response = await apiUploadFile<{ logo_path: string }>("/companies/me/logo", quoteLogoFile, token);
                            // Le logo_path retourné est relatif (ex: "6/logo_xxx.jpg")
                            // Pour les devis, on stocke le chemin relatif dans quote_design
                            logoPath = response.logo_path;
                          } catch (err: any) {
                            console.error("Error uploading logo:", err);
                            showToast("Erreur lors de l'upload du logo", "error");
                            setIsSaving(false);
                            return;
                          }
                        } else {
                          // Garder le logo existant si pas de nouveau fichier
                          const billingSettings = (settings.settings as any).billing;
                          const quoteDesign = billingSettings?.quote_design || {};
                          logoPath = quoteDesign.logo_path;
                        }

                        // Uploader la signature si un fichier a été sélectionné
                        if (quoteSignatureFile) {
                          try {
                            const { apiUploadFile } = await import("@/lib/api");
                            const response = await apiUploadFile<{ signature_path: string }>("/companies/me/signature", quoteSignatureFile, token);
                            signaturePath = response.signature_path;
                          } catch (err: any) {
                            console.error("Error uploading signature:", err);
                            showToast("Erreur lors de l'upload de la signature", "error");
                            setIsSaving(false);
                            return;
                          }
                        } else {
                          // Garder la signature existante si pas de nouveau fichier
                          const billingSettings = (settings.settings as any).billing;
                          const quoteDesign = billingSettings?.quote_design || {};
                          signaturePath = quoteDesign.signature_path;
                        }

                        const updatedSettings = {
                          ...settings.settings,
                          billing: {
                            ...((settings.settings as any).billing || {}),
                            quote_design: {
                              primary_color: quotePrimaryColor,
                              secondary_color: quoteSecondaryColor,
                              logo_path: logoPath,
                              signature_path: signaturePath,
                              footer_text: quoteFooterText,
                              terms_text: quoteTermsText,
                            },
                          },
                        };
                        await saveSettings(updatedSettings);
                        showToast("Personnalisation sauvegardée avec succès", "success");
                      } catch (error: any) {
                        console.error("Error saving quote design:", error);
                        showToast(error.message || "Erreur lors de la sauvegarde", "error");
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                    className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Sauvegarde..." : "Sauvegarder la personnalisation"}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "team" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-600">
                Gérez les membres de votre équipe et leurs permissions.
              </p>
              <button className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2">
                Inviter un membre
              </button>
            </div>

            {teamError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600">{teamError}</p>
              </div>
            )}

            {isLoadingTeam ? (
              <div className="py-8">
                <Loader text="Chargement de l'équipe..." />
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-[#64748B]">Aucun membre dans l'équipe</p>
                    </CardContent>
                  </Card>
                ) : (
                  teamMembers.map((member) => (
                    <Card key={member.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-[#0F172A]">
                                {member.full_name || member.email}
                              </p>
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                {member.role === "owner" ? "Propriétaire" : member.role === "super_admin" ? "Admin" : "Utilisateur"}
                              </span>
                            </div>
                            <p className="text-xs text-[#64748B]">{member.email}</p>
                            
                            {/* Permissions pour les utilisateurs (role "user") */}
                            {member.role === "user" && (user?.role === "owner" || user?.role === "super_admin") && (
                              <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                                <p className="text-xs font-medium text-[#0F172A] mb-2">Permissions pour les tâches :</p>
                                <div className="space-y-2">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={member.can_create_tasks || false}
                                      onChange={(e) => handleUpdatePermissions(member.id, { can_create_tasks: e.target.checked })}
                                      disabled={updatingPermissions === member.id}
                                      className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                                    />
                                    <span className="text-xs text-[#64748B]">Créer des tâches</span>
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={member.can_edit_tasks || false}
                                      onChange={(e) => handleUpdatePermissions(member.id, { can_edit_tasks: e.target.checked })}
                                      disabled={updatingPermissions === member.id}
                                      className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                                    />
                                    <span className="text-xs text-[#64748B]">Modifier des tâches</span>
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={member.can_delete_tasks || false}
                                      onChange={(e) => handleUpdatePermissions(member.id, { can_delete_tasks: e.target.checked })}
                                      disabled={updatingPermissions === member.id}
                                      className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                                    />
                                    <span className="text-xs text-[#64748B]">Supprimer des tâches</span>
                                  </label>
                                  {updatingPermissions === member.id && (
                                    <p className="text-xs text-[#64748B] italic">Mise à jour...</p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Message pour les owners/admins */}
                            {(member.role === "owner" || member.role === "super_admin") && (
                              <p className="text-xs text-[#64748B] italic mt-2">
                                Les propriétaires et administrateurs ont tous les droits par défaut.
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Section Intégrations - Toujours monté pour éviter la perte d'état */}
        {activeTab === "subscription" && (
          <SubscriptionTab />
        )}

        {activeTab === "privacy" && (
          <DataPrivacySection />
        )}

        <div className={activeTab === "integrations" ? "space-y-6" : "hidden"}>
          {/* Section Boîtes mail */}
          <InboxIntegrationsTab key="inbox-integrations-tab" />

          {/* Section Imports / Exports */}
          <ImportExportSection />
        </div>

        {activeTab === "notifications" && (
          <div className="space-y-6">
            {/* Section Inbox / IA */}
            {(user?.role === "owner" || user?.role === "super_admin") && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#0F172A]">
                  Inbox / Intelligence Artificielle
                </h3>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 rounded-lg border border-[#E5E7EB] bg-white">
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">
                        Activer la classification automatique des messages
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">
                        Les messages seront automatiquement classés dans les dossiers IA configurés
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      // TODO: Lier à settings.inbox?.aiClassificationEnabled
                      className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-lg border border-[#E5E7EB] bg-white">
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">
                        Activer les réponses automatiques
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">
                        Permet l'envoi automatique de réponses selon la configuration des dossiers
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      // TODO: Lier à settings.inbox?.autoReplyEnabled
                      className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-lg border border-[#E5E7EB] bg-white">
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">
                        Notification pour réponses en attente
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">
                        Recevoir une notification quand une réponse automatique nécessite votre validation
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      // TODO: Lier à settings.inbox?.notifyPendingReplies
                      className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                    />
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Délai par défaut avant envoi auto (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      // TODO: Lier à settings.inbox?.defaultAutoReplyDelay
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                      placeholder="0"
                    />
                    <p className="text-xs text-[#64748B] mt-1">
                      Délai appliqué si non spécifié dans la configuration du dossier
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E5E7EB]">
                  <p className="text-xs text-[#64748B]">
                    ⚠️ Ces paramètres s'appliquent globalement et peuvent être surchargés par la configuration de chaque dossier.
                  </p>
                </div>
              </div>
            )}

            {/* Section notifications générales (pour tous) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Notifications générales
              </h3>
              <p className="text-sm text-[#64748B]">
                Configuration des notifications à venir.
              </p>
            </div>
          </div>
        )}

        {/* Bouton Enregistrer pour modules et IA */}
        {(activeTab === "modules" || activeTab === "ia") && user?.role !== "user" && (
          <div className="pt-4 border-t border-[#E5E7EB] flex justify-end mt-6">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-6 py-2 text-sm font-medium shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
            >
              {isSaving ? "Enregistrement..." : user?.role === "super_admin" ? "Enregistrer les paramètres" : "Enregistrer les paramètres (IA uniquement)"}
            </button>
          </div>
        )}
      </div>
            )}
          </>
      )}


      {/* Modal de recadrage du logo */}
      {showCropModal && imageToCrop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => setShowCropModal(false)}
        >
          <div className="relative bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#0F172A]">Recadrer le logo</h3>
              <button
                onClick={() => setShowCropModal(false)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-[#64748B] mb-2">
                Ajustez la position et la taille de l'image pour un format carré (1:1)
              </p>
              <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-[#E5E7EB] mx-auto" style={{ maxWidth: '400px' }}>
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${imageToCrop})`,
                    backgroundSize: `${cropPosition.scale * 100}%`,
                    backgroundPosition: `${50 + cropPosition.x}% ${50 + cropPosition.y}%`,
                    backgroundRepeat: 'no-repeat',
                    backgroundOrigin: 'center center',
                  }}
                />
              </div>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Position horizontale: {cropPosition.x}%
                </label>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={cropPosition.x}
                  onChange={(e) => setCropPosition({ ...cropPosition, x: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Position verticale: {cropPosition.y}%
                </label>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={cropPosition.y}
                  onChange={(e) => setCropPosition({ ...cropPosition, y: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Zoom: {Math.round(cropPosition.scale * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={cropPosition.scale}
                  onChange={(e) => setCropPosition({ ...cropPosition, scale: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setCropPosition({ x: 0, y: 0, scale: 1 });
                }}
                className="px-4 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
              >
                Réinitialiser
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Créer une image carrée recadrée
                  const canvas = document.createElement('canvas');
                  const size = 400; // Taille carrée
                  canvas.width = size;
                  canvas.height = size;
                  const ctx = canvas.getContext('2d');
                  
                  if (!ctx) return;
                  
                  const img = new Image();
                  img.crossOrigin = 'anonymous';
                  
                  await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = imageToCrop;
                  });
                  
                  // Calculer la zone carrée à extraire de l'image originale
                  const imgRatio = img.width / img.height;
                  let sourceSize, sourceX, sourceY;
                  
                  if (imgRatio > 1) {
                    // Image plus large que haute - prendre un carré centré sur la hauteur
                    sourceSize = img.height;
                    sourceX = (img.width - sourceSize) / 2;
                    sourceY = 0;
                  } else {
                    // Image plus haute que large - prendre un carré centré sur la largeur
                    sourceSize = img.width;
                    sourceX = 0;
                    sourceY = (img.height - sourceSize) / 2;
                  }
                  
                  // Appliquer le zoom (scale)
                  const scaledSize = sourceSize / cropPosition.scale;
                  const scaledOffsetX = (cropPosition.x / 100) * scaledSize;
                  const scaledOffsetY = (cropPosition.y / 100) * scaledSize;
                  
                  // Ajuster les coordonnées source avec le décalage
                  sourceX = sourceX - scaledOffsetX;
                  sourceY = sourceY - scaledOffsetY;
                  
                  // S'assurer que les coordonnées restent dans les limites
                  sourceX = Math.max(0, Math.min(sourceX, img.width - scaledSize));
                  sourceY = Math.max(0, Math.min(sourceY, img.height - scaledSize));
                  sourceSize = Math.min(scaledSize, img.width - sourceX, img.height - sourceY);
                  
                  // Dessiner l'image recadrée sur le canvas
                  ctx.drawImage(
                    img,
                    sourceX, sourceY, sourceSize, sourceSize,
                    0, 0, size, size
                  );
                  
                      // Convertir le canvas en blob puis en File
                      canvas.toBlob(async (blob) => {
                        if (blob) {
                          const file = new File([blob], 'logo.jpg', { type: 'image/jpeg' });
                          
                          // Libérer l'ancienne URL blob si elle existe
                          if (logoPreview && logoPreview.startsWith("blob:")) {
                            URL.revokeObjectURL(logoPreview);
                          }
                          
                          // Créer une nouvelle blob URL pour l'aperçu immédiat
                          const newBlobUrl = URL.createObjectURL(blob);
                          setLogoFile(file);
                          setLogoPreview(newBlobUrl);
                          
                          // Sauvegarder immédiatement les paramètres de recadrage dans les settings
                          if (settings?.settings) {
                            const updatedSettings = {
                              ...settings.settings,
                              company_info: {
                                ...((settings.settings as any).company_info || {}),
                                logo_crop_position: cropPosition,
                              },
                            };
                            try {
                              await saveSettings(updatedSettings);
                            } catch (err) {
                              console.error("Erreur lors de la sauvegarde des paramètres de recadrage:", err);
                            }
                          }
                          
                          setShowCropModal(false);
                        }
                      }, 'image/jpeg', 0.9);
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white text-sm font-medium hover:brightness-110"
              >
                Appliquer le recadrage
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}



// Composant pour l'onglet Abonnement
function SubscriptionTab() {
  const { data: subscriptionData, isLoading } = useSubscription();
  const createPortalSession = useCreatePortalSession();
  const { token } = useAuth();

  const handleManageSubscription = () => {
    const returnUrl = `${window.location.origin}/app/settings?tab=subscription`;
    createPortalSession.mutate(returnUrl);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader />
      </div>
    );
  }

  const hasSubscription = subscriptionData?.has_subscription || false;
  const subscription = subscriptionData?.subscription;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-[#0F172A]">Gestion de l'abonnement</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasSubscription ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-[#64748B]">
                Vous n'avez pas encore d'abonnement actif.
              </p>
              <AnimatedButton
                variant="primary"
                onClick={() => {
                  window.location.href = "/app/pricing";
                }}
              >
                Voir les offres
              </AnimatedButton>
            </div>
          ) : subscription ? (
            <div className="space-y-4">
              {/* Informations de l'abonnement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-[#64748B] mb-1">Plan</p>
                  <p className="text-lg font-semibold text-[#0F172A] capitalize">
                    {subscription.plan === "starter" ? "Offre de démarrage" : subscription.plan}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#64748B] mb-1">Statut</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        subscription.status === "active"
                          ? "bg-green-100 text-green-800"
                          : subscription.status === "trialing"
                          ? "bg-blue-100 text-blue-800"
                          : subscription.status === "past_due"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {subscription.status === "active" && "Actif"}
                      {subscription.status === "trialing" && "Période d'essai"}
                      {subscription.status === "past_due" && "Paiement en retard"}
                      {subscription.status === "canceled" && "Annulé"}
                      {subscription.status === "incomplete" && "Incomplet"}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#64748B] mb-1">Montant</p>
                  <p className="text-lg font-semibold text-[#0F172A]">
                    {subscription.amount.toFixed(2)} {subscription.currency.toUpperCase()}
                    <span className="text-sm font-normal text-[#64748B]">/mois</span>
                  </p>
                </div>
                {subscription.current_period_end && (
                  <div>
                    <p className="text-sm font-medium text-[#64748B] mb-1">
                      {subscription.status === "trialing" ? "Fin de la période d'essai" : "Prochain renouvellement"}
                    </p>
                    <p className="text-lg font-semibold text-[#0F172A]">
                      {new Date(subscription.current_period_end).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Bouton pour gérer l'abonnement */}
              <div className="pt-4 border-t border-[#E5E7EB]">
                <AnimatedButton
                  variant="primary"
                  onClick={handleManageSubscription}
                  loading={createPortalSession.isPending}
                  className="w-full md:w-auto"
                >
                  Gérer mon abonnement
                </AnimatedButton>
                <p className="text-xs text-[#64748B] mt-2">
                  Accédez au portail client Stripe pour modifier votre méthode de paiement, 
                  voir vos factures ou annuler votre abonnement.
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
