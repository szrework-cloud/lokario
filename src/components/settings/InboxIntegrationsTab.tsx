"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import {
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  syncIntegration,
  InboxIntegration,
  InboxIntegrationCreate,
} from "@/services/inboxIntegrationService";
import { Loader } from "@/components/ui/Loader";

// Serveurs IMAP prédéfinis
const IMAP_PRESETS: Record<string, { server: string; port: number; ssl: boolean }> = {
  gmail: { server: "imap.gmail.com", port: 993, ssl: true },
  orange: { server: "imap.orange.fr", port: 993, ssl: true },
  outlook: { server: "outlook.office365.com", port: 993, ssl: true },
  yahoo: { server: "imap.mail.yahoo.com", port: 993, ssl: true },
  ovh: { server: "ssl0.ovh.net", port: 993, ssl: true },
  ionos: { server: "imap.ionos.fr", port: 993, ssl: true },
};

function InboxIntegrationsTabComponent() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [integrations, setIntegrations] = useState<InboxIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<InboxIntegration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const hasLoadedRef = useRef(false);
  const modalShouldBeOpenRef = useRef(false);
  
  // Synchroniser la ref avec l'état pour préserver l'ouverture du modal lors des re-renders
  useEffect(() => {
    if (isModalOpen) {
      modalShouldBeOpenRef.current = true;
    }
  }, [isModalOpen]);
  
  // Restaurer l'état du modal après un re-render si nécessaire
  // Cela protège contre les re-renders causés par le polling de useSettings (toutes les 15s)
  useEffect(() => {
    if (modalShouldBeOpenRef.current && !isModalOpen) {
      // Utiliser requestAnimationFrame pour éviter les conflits avec React
      requestAnimationFrame(() => {
        if (modalShouldBeOpenRef.current) {
          setIsModalOpen(true);
        }
      });
    }
  }, [isModalOpen]);

  // Form state
  const [formData, setFormData] = useState<InboxIntegrationCreate>({
    integration_type: "imap",
    name: "",
    is_active: true,
    is_primary: false,  // Par défaut, pas principale
    sync_interval_minutes: 5,
    imap_server: "",
    imap_port: 993,
    email_address: "",
    email_password: "",
    use_ssl: true,
    phone_number: "",
    api_key: "",
    webhook_secret: "",
    account_id: "",
  });

  const loadIntegrations = async () => {
    setIsLoading(true);
    try {
      const data = await getIntegrations(token);
      setIntegrations(data);
    } catch (err: any) {
      showToast(err.message || "Erreur lors du chargement des intégrations", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les intégrations uniquement au montage initial
  useEffect(() => {
    if (token && user?.role === "owner" && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadIntegrations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role]);

  // Restaurer l'état du modal après un re-render si nécessaire
  // Cela protège contre les re-renders causés par le polling de useSettings (toutes les 15s)
  useEffect(() => {
    if (modalShouldBeOpenRef.current && !isModalOpen) {
      setIsModalOpen(true);
    }
  }, [isModalOpen]);

  // Pas besoin de recharger automatiquement quand le modal se ferme
  // Le rechargement se fait déjà après création/modification dans handleSubmit

  const handleOpenCreateModal = () => {
      setEditingIntegration(null);
      setFormData({
        integration_type: "imap",
        name: "",
        is_active: true,
        is_primary: false,  // Par défaut, pas principale
        sync_interval_minutes: 5,
        imap_server: "",
        imap_port: 993,
        email_address: "",
        email_password: "",
        use_ssl: true,
        phone_number: "",
        api_key: "",
        webhook_secret: "",
        account_id: "",
      });
    modalShouldBeOpenRef.current = true;
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (integration: InboxIntegration) => {
    setEditingIntegration(integration);
    setFormData({
      integration_type: integration.integration_type,
      name: integration.name,
      is_active: integration.is_active,
      is_primary: integration.is_primary || false,  // Ajouter is_primary
      sync_interval_minutes: integration.sync_interval_minutes,
      imap_server: integration.imap_server || "",
      imap_port: integration.imap_port || 993,
      email_address: integration.email_address || "",
      email_password: "", // Ne pas pré-remplir le mot de passe
      use_ssl: integration.use_ssl ?? true,
      phone_number: integration.phone_number || "",
      api_key: "", // Ne pas pré-remplir l'API key
      webhook_secret: "", // Ne pas pré-remplir l'API Secret
      account_id: integration.account_id || "",
    });
    modalShouldBeOpenRef.current = true;
    setIsModalOpen(true);
  };

  const handleCloseModal = useCallback(() => {
    modalShouldBeOpenRef.current = false;
      setIsModalOpen(false);
      setEditingIntegration(null);
  }, []);

  const handlePresetChange = (preset: string) => {
    if (preset && IMAP_PRESETS[preset]) {
      const presetConfig = IMAP_PRESETS[preset];
      setFormData({
        ...formData,
        imap_server: presetConfig.server,
        imap_port: presetConfig.port,
        use_ssl: presetConfig.ssl,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Préparer les données en filtrant les champs vides et en adaptant selon le type
      const dataToSend: any = {
        integration_type: formData.integration_type,
        name: formData.name,
        is_active: formData.is_active,
        is_primary: formData.is_primary,
        sync_interval_minutes: formData.sync_interval_minutes,
      };

      // Si c'est une intégration IMAP
      if (formData.integration_type === "imap") {
        dataToSend.imap_server = formData.imap_server?.trim() || undefined;
        dataToSend.imap_port = formData.imap_port || undefined;
        dataToSend.email_address = formData.email_address?.trim() || undefined;
        dataToSend.email_password = formData.email_password || undefined;
        dataToSend.use_ssl = formData.use_ssl;
      } else if (formData.integration_type === "sms") {
        // Si c'est une intégration SMS (compte centralisé - pas de credentials nécessaires)
        // phone_number optionnel pour compatibilité rétroactive uniquement
        dataToSend.phone_number = formData.phone_number?.trim() || undefined;
        // api_key et webhook_secret ne sont plus nécessaires (compte centralisé)
      }

      if (editingIntegration) {
        await updateIntegration(editingIntegration.id, dataToSend, token);
        showToast("Intégration mise à jour avec succès", "success");
      } else {
        await createIntegration(dataToSend, token);
        showToast("Intégration créée avec succès", "success");
      }
      await loadIntegrations();
      // Fermer le modal après succès
          handleCloseModal();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de l'enregistrement", "error");
      console.error("Erreur lors de l'enregistrement:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmModal.id) return;
    try {
      await deleteIntegration(deleteConfirmModal.id, token);
      showToast("Intégration supprimée avec succès", "success");
      await loadIntegrations();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la suppression", "error");
    } finally {
      setDeleteConfirmModal({ isOpen: false, id: null });
    }
  };

  const handleSync = async (id: number) => {
    setSyncingId(id);
    try {
      const result = await syncIntegration(id, token);
      showToast(
        `Synchronisation réussie : ${result.processed} email(s) traité(s)`,
        "success"
      );
      await loadIntegrations();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la synchronisation", "error");
    } finally {
      setSyncingId(null);
    }
  };

  const getStatusBadge = (integration: InboxIntegration) => {
    if (!integration.last_sync_status) {
      return <span className="text-xs text-[#64748B]">Jamais synchronisé</span>;
    }

    if (integration.last_sync_status === "success") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✅ Synchronisé
        </span>
      );
    }

    if (integration.last_sync_status === "error") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          ❌ Erreur
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        ⚠️ Partiel
      </span>
    );
  };

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return "Jamais";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays} jour(s)`;
  };

  // Seuls les owners peuvent configurer
  if (user?.role !== "owner") {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-[#64748B] text-center">
            Seuls les propriétaires peuvent configurer les intégrations email.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <Loader text="Chargement des intégrations..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Intégrations Inbox</h3>
              <p className="text-sm text-[#64748B] mt-1">
                Configurez vos boîtes mail et intégrations SMS pour recevoir automatiquement les messages dans l'Inbox
              </p>
            </div>
            <Button type="button" onClick={handleOpenCreateModal} variant="primary">
              + Ajouter une intégration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#64748B] mb-4">
                Aucune boîte mail configurée. Ajoutez votre première boîte mail pour commencer.
              </p>
              <Button type="button" onClick={handleOpenCreateModal} variant="primary">
                Ajouter une boîte mail
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="border border-[#E5E7EB] rounded-lg p-4 hover:bg-[#F9FAFB] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-[#0F172A]">{integration.name}</h4>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {integration.integration_type === "sms" ? "📱 SMS" : "📧 Email"}
                        </span>
                        {integration.is_active ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inactif
                          </span>
                        )}
                        {integration.is_primary && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#F97316] text-white">
                            {integration.integration_type === "sms" ? "📱 Principale" : "📧 Principale"}
                          </span>
                        )}
                        {getStatusBadge(integration)}
                      </div>
                      <div className="text-sm text-[#64748B] space-y-1">
                        {integration.integration_type === "sms" ? (
                          <>
                            {integration.phone_number && (
                              <p>
                                <span className="font-medium">Numéro:</span> {integration.phone_number}
                              </p>
                            )}
                            <p>
                              <span className="font-medium">Type:</span> Vonage SMS
                            </p>
                          </>
                        ) : (
                          <>
                            {integration.email_address && (
                              <p>
                                <span className="font-medium">Email:</span> {integration.email_address}
                              </p>
                            )}
                            {integration.imap_server && (
                              <p>
                                <span className="font-medium">Serveur:</span> {integration.imap_server}:{integration.imap_port}
                              </p>
                            )}
                          </>
                        )}
                        {integration.integration_type === "imap" && (
                          <p>
                            <span className="font-medium">Dernière sync:</span> {formatLastSync(integration.last_sync_at)}
                          </p>
                        )}
                        {integration.last_sync_error && (
                          <p className="text-red-600">
                            <span className="font-medium">Erreur:</span> {integration.last_sync_error}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!integration.is_primary && (
                        <Button
                          type="button"
                          onClick={async () => {
                            try {
                              await updateIntegration(integration.id, { is_primary: true }, token);
                              showToast(
                                integration.integration_type === "sms" 
                                  ? "Intégration SMS définie comme principale" 
                                  : "Boîte mail définie comme principale", 
                                "success"
                              );
                              await loadIntegrations();
                            } catch (err: any) {
                              showToast(err.message || "Erreur lors de la mise à jour", "error");
                            }
                          }}
                          variant="secondary"
                          size="sm"
                        >
                          Définir comme principale
                        </Button>
                      )}
                      {/* Le bouton Synchroniser n'est utile que pour IMAP */}
                      {(integration.integration_type === "imap") && (
                        <Button
                          type="button"
                          onClick={() => handleSync(integration.id)}
                          disabled={syncingId === integration.id || !integration.is_active}
                          variant="secondary"
                          size="sm"
                        >
                          {syncingId === integration.id ? "Sync..." : "Synchroniser"}
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={() => handleOpenEditModal(integration)}
                        variant="secondary"
                        size="sm"
                      >
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleDelete(integration.id)}
                        variant="danger"
                        size="sm"
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de création/édition */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingIntegration ? "Modifier l'intégration" : "Ajouter une intégration"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom de l'intégration *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={
                  formData.integration_type === "sms" 
                    ? "Ex: SMS Vonage Principal" 
                    : "Ex: Boîte principale Gmail"
                }
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="integration_type">Type d'intégration *</Label>
              <Select
                id="integration_type"
                value={formData.integration_type}
                onValueChange={(value: string) => {
                  const typedValue = value as "imap" | "sms";
                  setFormData({
                    ...formData,
                    integration_type: typedValue,
                    // Réinitialiser les champs spécifiques au type
                    email_address: typedValue === "sms" ? "" : formData.email_address,
                    phone_number: typedValue === "imap" ? "" : formData.phone_number,
                  });
                }}
                disabled={isSubmitting || !!editingIntegration}
              >
                <option value="imap">📧 Email (IMAP)</option>
                <option value="sms">📱 SMS (Vonage)</option>
              </Select>
              <p className="text-xs text-[#64748B] mt-1">
                {formData.integration_type === "sms"
                  ? "Configuration pour recevoir et envoyer des SMS via Vonage (compte centralisé - les SMS seront envoyés avec le nom de votre entreprise)"
                  : "Configuration pour recevoir des emails via IMAP"}
              </p>
            </div>

            {formData.integration_type === "imap" && (
              <>
            <div>
              <Label htmlFor="preset">Préconfiguration (optionnel)</Label>
              <Select
                id="preset"
                value=""
                onValueChange={handlePresetChange}
                disabled={isSubmitting}
              >
                <option value="">Sélectionner un fournisseur...</option>
                <option value="gmail">Gmail</option>
                <option value="orange">Orange</option>
                <option value="outlook">Outlook / Microsoft 365</option>
                <option value="yahoo">Yahoo</option>
                <option value="ovh">OVH / Mail Pro</option>
                <option value="ionos">Ionos</option>
              </Select>
              <p className="text-xs text-[#64748B] mt-1">
                Sélectionnez un fournisseur pour remplir automatiquement les paramètres
              </p>
            </div>
              </>
            )}

            {/* Champs pour IMAP */}
            {formData.integration_type === "imap" && (
              <>
            <div>
              <Label htmlFor="email_address">Adresse email *</Label>
              <Input
                id="email_address"
                type="email"
                value={formData.email_address || ""}
                onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                placeholder="contact@example.com"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="email_password">
                Mot de passe / App Password *{" "}
                <span className="text-xs text-[#64748B]">
                  (Pour Gmail, utilisez un mot de passe d'application)
                </span>
              </Label>
              <Input
                id="email_password"
                type="password"
                value={formData.email_password || ""}
                onChange={(e) => setFormData({ ...formData, email_password: e.target.value })}
                placeholder="••••••••"
                required={!editingIntegration}
                disabled={isSubmitting}
              />
              {editingIntegration && (
                <p className="text-xs text-[#64748B] mt-1">
                  Laissez vide pour ne pas modifier le mot de passe
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="imap_server">Serveur IMAP *</Label>
                <Input
                  id="imap_server"
                  value={formData.imap_server || ""}
                  onChange={(e) => setFormData({ ...formData, imap_server: e.target.value })}
                  placeholder="imap.gmail.com"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="imap_port">Port *</Label>
                <Input
                  id="imap_port"
                  type="number"
                  value={formData.imap_port || 993}
                  onChange={(e) => setFormData({ ...formData, imap_port: parseInt(e.target.value) || 993 })}
                  placeholder="993"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="use_ssl"
                checked={formData.use_ssl ?? true}
                onChange={(e) => setFormData({ ...formData, use_ssl: e.target.checked })}
                disabled={isSubmitting}
                className="rounded border-[#E5E7EB]"
              />
              <Label htmlFor="use_ssl" className="cursor-pointer">
                Utiliser SSL/TLS
              </Label>
            </div>
              </>
            )}

            {/* Champs pour Vonage SMS */}
            {formData.integration_type === "sms" && (
              <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">📋 Configuration du Webhook (pour recevoir les SMS)</h4>
              <p className="text-xs text-blue-800 mb-2">
                Pour recevoir les SMS dans l'application, le webhook doit être configuré par l'administrateur de la plateforme sur le compte Vonage centralisé.
              </p>
              <p className="text-xs text-blue-700 mt-2 italic">
                Le webhook est configuré une seule fois pour toutes les entreprises utilisant la plateforme.
              </p>
              <p className="text-xs text-blue-800 mt-2">
                <strong>Note :</strong> Les SMS seront envoyés avec le nom de votre entreprise (depuis Paramètres → Informations de l'entreprise) comme expéditeur (ex: "MASUPERENT").
              </p>
            </div>
              </>
            )}

            <div>
              <Label htmlFor="sync_interval_minutes">Intervalle de synchronisation (minutes)</Label>
              <Input
                id="sync_interval_minutes"
                type="number"
                value={formData.sync_interval_minutes}
                onChange={(e) =>
                  setFormData({ ...formData, sync_interval_minutes: parseInt(e.target.value) || 5 })
                }
                min={1}
                max={60}
                disabled={isSubmitting}
              />
              <p className="text-xs text-[#64748B] mt-1">
                Le script de synchronisation vérifiera cette boîte mail toutes les X minutes
              </p>
            </div>


            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" onClick={handleCloseModal} variant="secondary" disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement..." : editingIntegration ? "Modifier" : "Créer"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal de confirmation de suppression */}
        <ConfirmModal
          isOpen={deleteConfirmModal.isOpen}
          onClose={() => setDeleteConfirmModal({ isOpen: false, id: null })}
          onConfirm={confirmDelete}
          title="Supprimer l'intégration"
          message="Êtes-vous sûr de vouloir supprimer cette intégration ? Cette action est irréversible."
          confirmText="Supprimer"
          cancelText="Annuler"
          variant="danger"
        />
    </>
  );
}

export const InboxIntegrationsTab = InboxIntegrationsTabComponent;

